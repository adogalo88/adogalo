import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";
import { calculateMilestonePayment } from "@/lib/financial";

// GET - Analitik keuangan: pendapatan per bulan, cash flow
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
    const monthsParam = searchParams.get("months");
    const months = Math.min(Math.max(parseInt(monthsParam || "12", 10) || 12, 6), 24);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fee client: dari TerminClient (paidAt atau createdAt)
    const paidTermins = await db.terminClient.findMany({
      where: { status: "paid", type: { in: ["main", "additional"] } },
      select: { feeClientAmount: true, paidAt: true, createdAt: true },
    });

    // Fee vendor: dari Log tipe "admin" (milestone payment). Include milestone untuk log lama yang amount-nya null
    const adminLogs = await db.log.findMany({
      where: {
        tipe: "admin",
        tanggal: { gte: startDate, lte: endDate },
      },
      select: {
        tanggal: true,
        amount: true,
        milestoneId: true,
        milestone: {
          select: {
            price: true,
            project: {
              select: {
                vendorFeePercent: true,
                retensi: { select: { percent: true } },
              },
            },
          },
        },
      },
    });

    // Build revenue by month
    const monthMap = new Map<string, { feeClient: number; feeVendor: number }>();
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + i + 1, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, { feeClient: 0, feeVendor: 0 });
    }

    for (const t of paidTermins) {
      const d = t.paidAt ?? t.createdAt;
      if (d && new Date(d) >= startDate && new Date(d) <= endDate) {
        const key = `${new Date(d).getFullYear()}-${String(new Date(d).getMonth() + 1).padStart(2, "0")}`;
        const entry = monthMap.get(key);
        if (entry) entry.feeClient += t.feeClientAmount ?? 0;
      }
    }

    for (const log of adminLogs) {
      let amt = log.amount ?? 0;
      if (amt === 0 && log.milestone?.price != null) {
        const project = log.milestone.project;
        const retentionPercent = project?.retensi?.percent ?? 0;
        const vendorFeePercent = project?.vendorFeePercent ?? 2;
        const payment = calculateMilestonePayment(
          log.milestone.price,
          retentionPercent,
          undefined,
          vendorFeePercent
        );
        amt = payment.vendorFeeAmount;
      }
      const key = `${log.tanggal.getFullYear()}-${String(log.tanggal.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key);
      if (entry) entry.feeVendor += amt;
    }

    const revenueByMonth = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        label: new Date(month + "-01").toLocaleDateString("id-ID", { month: "short", year: "numeric" }),
        feeClient: data.feeClient,
        feeVendor: data.feeVendor,
        total: data.feeClient + data.feeVendor,
      }));

    // Summary
    const totalRevenue = revenueByMonth.reduce((s, r) => s + r.total, 0);
    const totalFeeClient = revenueByMonth.reduce((s, r) => s + r.feeClient, 0);
    const totalFeeVendor = revenueByMonth.reduce((s, r) => s + r.feeVendor, 0);
    const avgMonthly = revenueByMonth.length > 0 ? totalRevenue / revenueByMonth.length : 0;

    return NextResponse.json({
      success: true,
      revenueByMonth,
      summary: {
        totalRevenue,
        totalFeeClient,
        totalFeeVendor,
        avgMonthlyRevenue: avgMonthly,
      },
    });
  } catch (error) {
    console.error("Error fetching financial analytics:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
