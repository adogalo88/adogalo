import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";
import { getLastActivityAt } from "@/lib/activity";

// GET - Get all projects (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session || !isAdmin(session.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const projects = await db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        milestones: {
          orderBy: { urutan: "asc" },
        },
        adminData: true,
        _count: {
          select: { milestones: true },
        },
      },
    });

    // Read status for current user (untuk indikator belum dibaca)
    const readStatuses = await db.projectReadStatus.findMany({
      where: { userEmail: session.email },
    });
    const readMap = new Map(readStatuses.map((r) => [r.projectId, r.lastReadAt]));

    // Calculate progress + lastActivityAt + hasUnread
    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const totalMilestones = project._count.milestones;
        const completedMilestones = project.milestones.filter(
          (m) => m.status === "completed"
        ).length;
        const activeMilestones = project.milestones.filter(
          (m) => m.status === "active"
        ).length;

        const totalValue = project.milestones.reduce((sum, m) => sum + m.price, 0);
        const completedValue = project.milestones
          .filter((m) => m.status === "completed")
          .reduce((sum, m) => sum + m.price, 0);

        const lastActivityAt = await getLastActivityAt(project.id);
        const lastReadAt = readMap.get(project.id);
        const hasUnread =
          lastActivityAt != null &&
          (lastReadAt == null || lastActivityAt.getTime() > lastReadAt.getTime());

        return {
          ...project,
          progress: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0,
          valueProgress: totalValue > 0 ? Math.round((completedValue / totalValue) * 100) : 0,
          completedMilestones,
          activeMilestones,
          totalMilestones,
          lastActivityAt: lastActivityAt?.toISOString() ?? null,
          hasUnread,
        };
      })
    );

    return NextResponse.json({
      success: true,
      projects: projectsWithProgress,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat mengambil data proyek" },
      { status: 500 }
    );
  }
}

// POST - Create new project (admin only)
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
    const {
      judul,
      clientName,
      clientEmail,
      vendorName,
      vendorEmail,
      budget,
      clientFeePercent = 1,
      vendorFeePercent = 2,
      retensiPercent = 0,
      retensiDays = 0,
      milestones = [],
    } = body;

    // Validation
    if (!judul || !clientName || !clientEmail || !vendorName || !vendorEmail || !budget) {
      return NextResponse.json(
        { success: false, message: "Semua field dasar harus diisi" },
        { status: 400 }
      );
    }

    const budgetValue = parseFloat(budget);
    if (isNaN(budgetValue) || budgetValue <= 0) {
      return NextResponse.json(
        { success: false, message: "Anggaran harus berupa angka positif" },
        { status: 400 }
      );
    }

    // Validate milestones total = 100%
    const totalPercentage = milestones.reduce((sum: number, m: { persentase: number }) => sum + (m.persentase || 0), 0);
    if (Math.abs(totalPercentage - 100) >= 0.01) {
      return NextResponse.json(
        { success: false, message: `Total persentase progress harus 100%. Saat ini: ${totalPercentage.toFixed(1)}%` },
        { status: 400 }
      );
    }

    // Validate all milestones have judul
    const invalidMilestone = milestones.find((m: { judul: string }) => !m.judul?.trim());
    if (invalidMilestone) {
      return NextResponse.json(
        { success: false, message: "Semua progress/pekerjaan harus memiliki judul" },
        { status: 400 }
      );
    }

    const clientFeeValue = parseFloat(clientFeePercent) || 1;
    const vendorFeeValue = parseFloat(vendorFeePercent) || 2;
    const retensiPercentValue = parseFloat(retensiPercent) || 0;
    const retensiDaysValue = parseInt(retensiDays) || 0;

    // Create project with fee and retensi settings
    const project = await db.project.create({
      data: {
        judul,
        clientName,
        clientEmail: clientEmail.toLowerCase().trim(),
        vendorName,
        vendorEmail: vendorEmail.toLowerCase().trim(),
        baseTotal: budgetValue,
        clientFeePercent: clientFeeValue,
        vendorFeePercent: vendorFeeValue,
        retensiPercent: retensiPercentValue,
        retensiDays: retensiDaysValue,
        status: "active",
      },
    });

    // Create initial admin data
    await db.adminData.create({
      data: {
        projectId: project.id,
      },
    });

    // Create retensi record if configured
    if (retensiPercentValue > 0) {
      await db.retensi.create({
        data: {
          projectId: project.id,
          status: "agreed",
          percent: retensiPercentValue,
          days: retensiDaysValue,
          value: budgetValue * (retensiPercentValue / 100),
        },
      });
    } else {
      // Create empty retensi record
      await db.retensi.create({
        data: {
          projectId: project.id,
          status: "none",
        },
      });
    }

    // Create milestones
    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i];
      const milestonePrice = budgetValue * (milestone.persentase / 100);
      
      await db.milestone.create({
        data: {
          projectId: project.id,
          judul: milestone.judul,
          deskripsi: milestone.deskripsi || null,
          persentase: milestone.persentase,
          price: milestonePrice,
          originalPrice: milestonePrice,
          status: "pending",
          urutan: i + 1,
        },
      });
    }

    // Generate termins based on budget thresholds
    // - Budget ≤ 15 juta: 1 termin (100%)
    // - Budget 15-50 juta: 2 termins (50% + 50%)
    // - Budget > 50 juta: 3 termins (40% + 30% + 30%)
    const BUDGET_THRESHOLD_1_TERMIN = 15000000; // 15 juta
    const BUDGET_THRESHOLD_2_TERMIN = 50000000; // 50 juta

    let terminConfigs: { percentage: number }[] = [];

    if (budgetValue <= BUDGET_THRESHOLD_1_TERMIN) {
      // 1 termin: 100%
      terminConfigs = [{ percentage: 100 }];
    } else if (budgetValue <= BUDGET_THRESHOLD_2_TERMIN) {
      // 2 termins: 50% + 50%
      terminConfigs = [{ percentage: 50 }, { percentage: 50 }];
    } else {
      // 3 termins: 40% + 30% + 30%
      terminConfigs = [{ percentage: 40 }, { percentage: 30 }, { percentage: 30 }];
    }

    // Create termins
    for (let i = 0; i < terminConfigs.length; i++) {
      const config = terminConfigs[i];
      const baseAmount = budgetValue * (config.percentage / 100);
      const feeClientAmount = baseAmount * (clientFeeValue / 100);
      const totalWithFee = baseAmount + feeClientAmount;

      await db.terminClient.create({
        data: {
          projectId: project.id,
          judul: `Termin ${i + 1}`,
          baseAmount,
          type: "main",
          feeClientAmount,
          totalWithFee,
          status: "unpaid",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Proyek berhasil dibuat",
      project,
      milestonesCreated: milestones.length,
      terminsCreated: terminConfigs.length,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat membuat proyek" },
      { status: 500 }
    );
  }
}
