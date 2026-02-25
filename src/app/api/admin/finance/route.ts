import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";

// GET - Ringkasan keuangan admin & riwayat transaksi (filter bulanan/tahunan)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    // Admin dan manager boleh melihat; withdraw hanya admin
    if (!session || (!isAdmin(session.email) && session.role !== "manager")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const year = yearParam ? parseInt(yearParam, 10) : null;
    const month = monthParam ? parseInt(monthParam, 10) : null;

    // Aggregate admin data across all projects
    const adminDataList = await db.adminData.findMany({
      include: {
        project: { select: { id: true, judul: true } },
      },
    });

    const summaryAgg = adminDataList.reduce(
      (acc, d) => ({
        totalClientFunds: acc.totalClientFunds + d.clientFunds,
        totalVendorPaid: acc.totalVendorPaid + d.vendorPaid,
        totalAdminBalance: acc.totalAdminBalance + d.adminBalance,
        totalRetentionHeld: acc.totalRetentionHeld + d.retentionHeld,
        totalFeeEarned: acc.totalFeeEarned + d.feeEarned,
      }),
      {
        totalClientFunds: 0,
        totalVendorPaid: 0,
        totalAdminBalance: 0,
        totalRetentionHeld: 0,
        totalFeeEarned: 0,
      }
    );

    // Total biaya admin dari client (fee client pada termin yang sudah dibayar)
    const paidTermins = await db.terminClient.findMany({
      where: { status: "paid", type: { in: ["main", "additional"] } },
      select: { feeClientAmount: true },
    });
    const totalClientFee = paidTermins.reduce((s, t) => s + t.feeClientAmount, 0);

    // Total withdrawal oleh admin
    const withdrawals = await db.adminWithdrawal.findMany({
      select: { amount: true },
    });
    const totalWithdrawn = withdrawals.reduce((s, w) => s + w.amount, 0);

    // Balance = total fee komisi vendor + total biaya admin (client) - total withdrawal
    const balance =
      summaryAgg.totalFeeEarned + totalClientFee - totalWithdrawn;

    const summary = {
      ...summaryAgg,
      balance: Math.max(0, balance),
    };

    // Build date filter for transactions
    const dateFilter =
      year != null && !isNaN(year)
        ? month != null && !isNaN(month)
          ? { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) }
          : { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) }
        : null;

    // Hanya transaksi: admin terima dari client (termin dibayar) & admin keluar ke vendor (konfirmasi milestone, pencairan retensi)
    const logWhere: { tipe: { in: string[] }; tanggal?: object } = {
      tipe: { in: ["system", "admin"] },
    };
    if (dateFilter) logWhere.tanggal = dateFilter;

    const logs = await db.log.findMany({
      where: logWhere,
      orderBy: { tanggal: "desc" },
      take: 500,
      include: {
        project: { select: { id: true, judul: true } },
        milestone: { select: { projectId: true, project: { select: { id: true, judul: true } } } },
      },
    });

    const retensiLogWhere: { tipe: string; tanggal?: object } = { tipe: "released" };
    if (dateFilter) retensiLogWhere.tanggal = dateFilter;

    const retensiLogs = await db.retensiLog.findMany({
      where: retensiLogWhere,
      orderBy: { tanggal: "desc" },
      take: 200,
      include: {
        retensi: { include: { project: { select: { id: true, judul: true } } } },
      },
    });

    type Tx = {
      id: string;
      tanggal: string;
      projectId: string | null;
      projectJudul: string;
      tipe: string;
      catatan: string;
    };

    const transactions: Tx[] = [];

    for (const log of logs) {
      // system = termin dibayar (admin terima dari client); admin = konfirmasi pembayaran (admin keluar ke vendor)
      const projectJudul =
        log.project?.judul ?? log.milestone?.project?.judul ?? "Proyek";
      const projectId = log.projectId ?? log.milestone?.projectId ?? null;
      transactions.push({
        id: log.id,
        tanggal: log.tanggal.toISOString(),
        projectId,
        projectJudul,
        tipe: log.tipe,
        catatan: log.catatan ?? "",
      });
    }

    for (const rl of retensiLogs) {
      transactions.push({
        id: `retensi-${rl.id}`,
        tanggal: rl.tanggal.toISOString(),
        projectId: rl.retensi.project.id,
        projectJudul: rl.retensi.project.judul,
        tipe: "retensi_released",
        catatan: rl.catatan ?? "",
      });
    }

    const withdrawalWhere: { createdAt?: object } = {};
    if (dateFilter) withdrawalWhere.createdAt = dateFilter;
    const withdrawalList = await db.adminWithdrawal.findMany({
      where: withdrawalWhere,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    for (const w of withdrawalList) {
      transactions.push({
        id: `withdrawal-${w.id}`,
        tanggal: w.createdAt.toISOString(),
        projectId: null,
        projectJudul: "-",
        tipe: "withdrawal",
        catatan: `Withdraw ${w.amount.toLocaleString("id-ID")} oleh ${w.createdByEmail}`,
      });
    }

    transactions.sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

    const maxTransactions = dateFilter ? 500 : 100;
    const limitedTransactions = transactions.slice(0, maxTransactions);

    return NextResponse.json({
      success: true,
      summary: {
        totalClientFunds: summary.totalClientFunds,
        totalVendorPaid: summary.totalVendorPaid,
        totalAdminBalance: summary.totalAdminBalance,
        totalRetentionHeld: summary.totalRetentionHeld,
        balance: summary.balance,
      },
      isAdmin: isAdmin(session.email),
      transactions: limitedTransactions,
      filter: { year, month },
    });
  } catch (error) {
    console.error("Error fetching admin finance:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// POST - Withdraw (hanya admin, bukan manager)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session || !isAdmin(session.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Nominal withdraw harus lebih dari 0" },
        { status: 400 }
      );
    }

    const adminDataList = await db.adminData.findMany({ select: { feeEarned: true } });
    const totalFeeEarned = adminDataList.reduce((s, d) => s + d.feeEarned, 0);
    const paidTermins = await db.terminClient.findMany({
      where: { status: "paid", type: { in: ["main", "additional"] } },
      select: { feeClientAmount: true },
    });
    const totalClientFee = paidTermins.reduce((s, t) => s + t.feeClientAmount, 0);
    const withdrawals = await db.adminWithdrawal.findMany({ select: { amount: true } });
    const totalWithdrawn = withdrawals.reduce((s, w) => s + w.amount, 0);
    const balance = totalFeeEarned + totalClientFee - totalWithdrawn;

    if (amount > balance) {
      return NextResponse.json(
        { success: false, message: `Nominal melebihi balance (tersedia: ${balance.toLocaleString("id-ID")})` },
        { status: 400 }
      );
    }

    await db.adminWithdrawal.create({
      data: {
        amount,
        createdByEmail: session.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Withdraw berhasil dicatat",
      withdrawn: amount,
    });
  } catch (error) {
    console.error("Error processing withdraw:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
