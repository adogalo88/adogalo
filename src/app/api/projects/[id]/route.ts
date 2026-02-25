import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";
import {
  calculateProjectStatistics,
  getDisplayAmount,
  checkClientFundsSufficient,
} from "@/lib/financial";

// GET - Get project by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const project = await db.project.findUnique({
      where: { id },
      include: {
        milestones: {
          orderBy: { urutan: "asc" },
          include: {
            logs: {
              orderBy: { tanggal: "asc" },
              include: {
                comments: {
                  orderBy: { tanggal: "asc" },
                },
              },
            },
            changeRequests: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
        additionalWorks: {
          orderBy: { createdAt: "desc" },
        },
        retensi: {
          include: {
            logs: {
              orderBy: { tanggal: "desc" },
            },
          },
        },
        termins: {
          orderBy: { createdAt: "asc" },
        },
        adminData: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Proyek tidak ditemukan" },
        { status: 404 }
      );
    }

    // Auto-selesai retensi: jika countdown sudah 0, ubah status ke pending_release (tanpa transfer dana)
    const retensi = project.retensi;
    if (retensi?.status === "countdown" && retensi.startDate && retensi.remainingDays != null) {
      const MS_PER_DAY = 24 * 60 * 60 * 1000;
      const endMs = new Date(retensi.startDate).getTime() + retensi.remainingDays * MS_PER_DAY;
      if (Date.now() >= endMs) {
        await db.retensi.update({
          where: { projectId: id },
          data: { status: "pending_release", remainingDays: 0 },
        });
        await db.retensiLog.create({
          data: {
            retensiId: retensi.id,
            tipe: "countdown_finished",
            catatan: "Masa retensi selesai. Menunggu admin mencairkan dana ke vendor.",
            files: "[]",
          },
        });
        (project as { retensi: typeof retensi }).retensi = {
          ...retensi,
          status: "pending_release",
          remainingDays: 0,
        };
      }
    }

    // Check access
    const isUserAdmin = isAdmin(session.email);
    const isClient = project.clientEmail === session.email;
    const isVendor = project.vendorEmail === session.email;

    // Check if user is manager with access
    let isManager = false;
    if (session.role === "manager" && session.userId) {
      const user = await db.user.findUnique({
        where: { id: session.userId },
      });
      if (user) {
        const projectIds = JSON.parse(user.projectIds || "[]");
        isManager = projectIds.includes(id);
      }
    }

    if (!isUserAdmin && !isClient && !isVendor && !isManager) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke proyek ini" },
        { status: 403 }
      );
    }

    // Determine user role
    const userRole = isUserAdmin ? "admin" : isManager ? "manager" : isVendor ? "vendor" : "client";

    // Get retensi percentage for calculations
    const retensiPercent = project.retensi?.status === "agreed" ? project.retensi.percent : 0;

    // Calculate statistics using financial helper
    const statistics = calculateProjectStatistics(
      project.milestones,
      project.termins,
      project.adminData
    );

    // Check if next pending milestone has sufficient funds
    const nextPendingMilestone = project.milestones.find(m => m.status === "pending");
    const fundsWarning = nextPendingMilestone && project.adminData
      ? checkClientFundsSufficient(project.adminData.clientFunds, nextPendingMilestone.price)
      : null;

    // Prepare role-based milestone display data
    const milestonesWithDisplay = project.milestones.map(milestone => {
      const displayData = getDisplayAmount(milestone.price, retensiPercent, userRole as 'vendor' | 'client' | 'admin' | 'manager');
      return {
        ...milestone,
        displayAmount: displayData.displayAmount,
        displayLabel: displayData.label,
        displayBreakdown: displayData.breakdown,
      };
    });

    return NextResponse.json(
      {
        success: true,
        project: {
          ...project,
          milestones: milestonesWithDisplay,
          statistics: {
            ...statistics,
            fundsWarning: fundsWarning?.isSufficient ? null : fundsWarning,
          },
          // Role-based header values
          headerValues: {
            vendor: project.adminData?.vendorPaid || 0,
            client: project.adminData?.clientFunds || 0,
            admin: project.adminData?.adminBalance || 0,
          },
        },
        userRole,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat mengambil data proyek" },
      { status: 500 }
    );
  }
}

// PATCH - Update project (admin only), e.g. edit email client/vendor
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    const { id } = await params;

    if (!session || !isAdmin(session.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json(
        { success: false, message: "Proyek tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { clientEmail, vendorEmail } = body;
    const updates: { clientEmail?: string; vendorEmail?: string } = {};

    if (typeof clientEmail === "string" && clientEmail.trim()) {
      updates.clientEmail = clientEmail.trim().toLowerCase();
    }
    if (typeof vendorEmail === "string" && vendorEmail.trim()) {
      updates.vendorEmail = vendorEmail.trim().toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada data yang diubah" },
        { status: 400 }
      );
    }

    await db.project.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      success: true,
      message: "Proyek berhasil diperbarui",
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat memperbarui proyek" },
      { status: 500 }
    );
  }
}

// DELETE - Delete project (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    const { id } = await params;

    if (!session || !isAdmin(session.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await db.project.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Proyek berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat menghapus proyek" },
      { status: 500 }
    );
  }
}
