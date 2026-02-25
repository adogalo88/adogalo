import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";

// GET - Ringkasan keuangan admin & log transaksi (filter bulanan/tahunan)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session || !isAdmin(session.email)) {
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

    const summary = adminDataList.reduce(
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

    // Build date filter for transactions
    const dateFilter =
      year != null && !isNaN(year)
        ? month != null && !isNaN(month)
          ? { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) }
          : { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) }
        : null;

    const logWhere: { tipe: { in: string[] }; tanggal?: object } = {
      tipe: { in: ["system", "admin", "refund"] },
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
        totalFeeEarned: summary.totalFeeEarned,
      },
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
