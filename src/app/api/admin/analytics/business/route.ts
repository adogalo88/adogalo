import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";

// GET - Analitik bisnis: proyek per bulan, distribusi status client
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

    // Proyek per bulan (dibuat)
    const projects = await db.project.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        id: true,
        createdAt: true,
        status: true,
        clientStatus: true,
        baseTotal: true,
      },
    });

    const monthMap = new Map<string, { created: number }>();
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + i + 1, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, { created: 0 });
    }

    for (const p of projects) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key);
      if (entry) entry.created++;
    }

    const projectsByMonth = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        label: new Date(month + "-01").toLocaleDateString("id-ID", { month: "short", year: "numeric" }),
        created: data.created,
      }));

    // Completed projects: dari RetensiLog tipe "released" (project selesai saat retensi dirilis)
    const retensiReleased = await db.retensiLog.findMany({
      where: { tipe: "released", tanggal: { gte: startDate } },
      select: { tanggal: true },
    });

    const completedByMonth = new Map<string, number>();
    for (const r of retensiReleased) {
      const key = `${r.tanggal.getFullYear()}-${String(r.tanggal.getMonth() + 1).padStart(2, "0")}`;
      completedByMonth.set(key, (completedByMonth.get(key) ?? 0) + 1);
    }

    const projectsByMonthWithCompleted = projectsByMonth.map((p) => ({
      ...p,
      completed: completedByMonth.get(p.month) ?? 0,
    }));

    // Distribusi status client - dari semua proyek (bukan hanya periode)
    const allProjects = await db.project.findMany({
      select: { clientStatus: true },
    });
    const clientStatusCounts = allProjects.reduce(
      (acc: Record<string, number>, p) => {
        const status = p.clientStatus || "pribadi";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const clientStatusLabels: Record<string, string> = {
      pribadi: "Pribadi",
      bisnis: "Bisnis",
      kontraktor: "Kontraktor",
      pemerintah: "Pemerintah",
    };

    const clientStatusDistribution = ["pribadi", "bisnis", "kontraktor", "pemerintah"].map((k) => ({
      name: clientStatusLabels[k] || k,
      value: clientStatusCounts[k] ?? 0,
      status: k,
    }));

    return NextResponse.json({
      success: true,
      projectsByMonth: projectsByMonthWithCompleted,
      clientStatusDistribution,
    });
  } catch (error) {
    console.error("Error fetching business analytics:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
