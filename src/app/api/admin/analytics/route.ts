import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";

// GET - Dashboard analytics untuk admin
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session || !isAdmin(session.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 1. Tindakan prioritas
    const [terminList, retensiList, milestonesComplaint, changeRequestList, adminDataList, activeProjects] =
      await Promise.all([
        db.terminClient.findMany({
          where: { status: "pending_confirmation" },
          select: { projectId: true, project: { select: { judul: true } } },
        }),
        db.retensi.findMany({
          where: { status: { in: ["pending_release", "waiting_confirmation", "complaint_paused"] } },
          include: { project: { select: { id: true, judul: true } } },
        }),
        db.milestone.count({
          where: { status: "complaint" },
        }),
        db.changeRequest.findMany({
          where: { status: "pending_admin" },
          select: { projectId: true, project: { select: { judul: true } } },
        }),
        db.adminData.findMany({
          include: { project: { select: { id: true, judul: true, baseTotal: true, clientFeePercent: true, status: true } } },
        }),
        db.project.findMany({
          where: { status: "active" },
          include: {
            milestones: { select: { status: true, price: true } },
          },
        }),
      ]);

    const terminPending = terminList.length;
    const changeRequestPending = changeRequestList.length;
    const retensiReleaseCount = retensiList.filter((r) => r.status === "pending_release").length;
    const retensiNeedsAttentionCount = retensiList.filter(
      (r) => r.status === "waiting_confirmation" || r.status === "complaint_paused"
    ).length;

    const totalPipelineValue = activeProjects.reduce((sum, p) => {
      const totalMilestone = p.milestones.reduce((s, m) => s + m.price, 0);
      return sum + totalMilestone;
    }, 0);

    const totalAdminBalance = adminDataList.reduce((s, d) => s + d.adminBalance, 0);
    const totalRetentionHeld = adminDataList.reduce((s, d) => s + d.retentionHeld, 0);
    const totalClientFunds = adminDataList.reduce((s, d) => s + d.clientFunds, 0);

    // Proyek dengan milestone complaint atau retensi perlu ditindaklanjuti
    const projectIdsWithComplaints = new Set<string>();
    for (const r of retensiList) {
      if (r.status === "pending_release" || r.status === "waiting_confirmation" || r.status === "complaint_paused") {
        projectIdsWithComplaints.add(r.project.id);
      }
    }

    const complaintMs = await db.milestone.findMany({
      where: { status: "complaint" },
      select: { projectId: true },
    });
    complaintMs.forEach((m) => projectIdsWithComplaints.add(m.projectId));

    const pendingActions = {
      terminPending,
      retensiReleaseCount,
      retensiNeedsAttentionCount,
      milestonesComplaintCount: milestonesComplaint,
      changeRequestPending,
      retensiDetails: retensiList.map((r) => ({
        projectId: r.project.id,
        projectJudul: r.project.judul,
        status: r.status,
      })),
      terminDetails: terminList.map((t) => ({ projectId: t.projectId, projectJudul: t.project.judul })),
      changeRequestDetails: changeRequestList.map((c) => ({ projectId: c.projectId, projectJudul: c.project.judul })),
    };

    const financialSummary = {
      totalPipelineValue,
      totalAdminBalance,
      totalRetentionHeld,
      totalClientFunds,
    };

    const projectHealth = {
      projectsNeedingAttentionCount: projectIdsWithComplaints.size,
    };

    return NextResponse.json({
      success: true,
      pendingActions,
      financialSummary,
      projectHealth,
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
