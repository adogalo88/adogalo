import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";
import {
  calculateMilestonePayment,
  checkClientFundsSufficient,
  formatCurrency,
} from "@/lib/financial";
import { notifyMilestoneSubmittedForCompletion } from "@/lib/email";

// GET - Get milestone detail
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

    const milestone = await db.milestone.findUnique({
      where: { id },
      include: {
        project: true,
        logs: {
          orderBy: { tanggal: "desc" },
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
    });

    if (!milestone) {
      return NextResponse.json(
        { success: false, message: "Milestone tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check access
    const isUserAdmin = isAdmin(session.email);
    const isClient = milestone.project.clientEmail === session.email;
    const isVendor = milestone.project.vendorEmail === session.email;

    if (!isUserAdmin && !isClient && !isVendor) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      milestone,
      userRole: isUserAdmin ? "admin" : isVendor ? "vendor" : "client",
    });
  } catch (error) {
    console.error("Error fetching milestone:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// POST - Milestone actions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    const { id } = await params;
    const body = await request.json();
    const { action, catatan, files } = body;

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const milestone = await db.milestone.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!milestone) {
      return NextResponse.json(
        { success: false, message: "Milestone tidak ditemukan" },
        { status: 404 }
      );
    }

    const isUserAdmin = isAdmin(session.email);
    const isClient = milestone.project.clientEmail === session.email;
    const isVendor = milestone.project.vendorEmail === session.email;

    // Process based on action
    switch (action) {
      case "start": {
        // Vendor starts working
        if (!isVendor) {
          return NextResponse.json(
            { success: false, message: "Hanya vendor yang bisa memulai pekerjaan" },
            { status: 403 }
          );
        }

        if (milestone.status !== "pending" && milestone.status !== "pending_additional") {
          return NextResponse.json(
            {
              success: false,
              message: "Milestone tidak dalam status yang bisa dimulai",
            },
            { status: 400 }
          );
        }

        // Check client budget with 10% buffer rule
        const adminData = await db.adminData.findUnique({
          where: { projectId: milestone.projectId },
        });

        const fundsCheck = checkClientFundsSufficient(
          adminData?.clientFunds || 0,
          milestone.price
        );

        if (!fundsCheck.isSufficient) {
          return NextResponse.json(
            {
              success: false,
              message: fundsCheck.warningMessage || "Dana client tidak mencukupi",
              needsDeposit: true,
              requiredFunds: fundsCheck.requiredFunds,
              shortage: fundsCheck.shortage,
            },
            { status: 400 }
          );
        }

        // Update milestone status
        await db.milestone.update({
          where: { id },
          data: { status: "active" },
        });

        // Create log
        await db.log.create({
          data: {
            milestoneId: id,
            tipe: "system",
            catatan: "Pekerjaan dimulai",
            files: "[]",
          },
        });

        return NextResponse.json({
          success: true,
          message: "Pekerjaan berhasil dimulai",
        });
      }

      case "daily": {
        // Vendor uploads daily progress
        if (!isVendor) {
          return NextResponse.json(
            { success: false, message: "Hanya vendor yang bisa upload laporan harian" },
            { status: 403 }
          );
        }

        if (milestone.status !== "active") {
          return NextResponse.json(
            { success: false, message: "Milestone tidak dalam status aktif" },
            { status: 400 }
          );
        }

        // Create log
        await db.log.create({
          data: {
            milestoneId: id,
            tipe: "daily",
            catatan: catatan || "",
            files: JSON.stringify(files || []),
            userId: session.userId,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Laporan harian berhasil diupload",
        });
      }

      case "finish": {
        // Vendor submits finished work
        if (!isVendor) {
          return NextResponse.json(
            { success: false, message: "Hanya vendor yang bisa mengajukan selesai" },
            { status: 403 }
          );
        }

        if (milestone.status !== "active") {
          return NextResponse.json(
            { success: false, message: "Milestone tidak dalam status aktif" },
            { status: 400 }
          );
        }

        // Update milestone status
        await db.milestone.update({
          where: { id },
          data: { status: "waiting" },
        });

        // Create log
        await db.log.create({
          data: {
            milestoneId: id,
            tipe: "finish",
            catatan: catatan || "Pekerjaan selesai, menunggu persetujuan client",
            files: JSON.stringify(files || []),
            userId: session.userId,
          },
        });

        notifyMilestoneSubmittedForCompletion(
          milestone.project.clientEmail,
          milestone.project.judul,
          milestone.judul
        ).catch((e) => console.error("Notifikasi email:", e));

        return NextResponse.json({
          success: true,
          message: "Pekerjaan berhasil diajukan, menunggu persetujuan client",
        });
      }

      case "fix": {
        // Vendor fixes after complaint
        if (!isVendor) {
          return NextResponse.json(
            { success: false, message: "Hanya vendor yang bisa mengupload perbaikan" },
            { status: 403 }
          );
        }

        if (milestone.status !== "complaint") {
          return NextResponse.json(
            { success: false, message: "Milestone tidak dalam status komplain" },
            { status: 400 }
          );
        }

        // Update milestone status
        await db.milestone.update({
          where: { id },
          data: { status: "waiting" },
        });

        // Create log
        await db.log.create({
          data: {
            milestoneId: id,
            tipe: "fix",
            catatan: catatan || "Perbaikan telah dilakukan",
            files: JSON.stringify(files || []),
            userId: session.userId,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Perbaikan berhasil diupload, menunggu persetujuan client",
        });
      }

      case "approve": {
        // Client approves work
        if (!isClient) {
          return NextResponse.json(
            { success: false, message: "Hanya client yang bisa menyetujui" },
            { status: 403 }
          );
        }

        if (milestone.status !== "waiting") {
          return NextResponse.json(
            { success: false, message: "Milestone tidak dalam status menunggu" },
            { status: 400 }
          );
        }

        // Update milestone status to waiting_admin
        await db.milestone.update({
          where: { id },
          data: { status: "waiting_admin" },
        });

        // Create log
        await db.log.create({
          data: {
            milestoneId: id,
            tipe: "system",
            catatan: "Client menyetujui pekerjaan, menunggu konfirmasi admin",
            files: "[]",
            userId: session.userId,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Pekerjaan disetujui, menunggu konfirmasi admin",
        });
      }

      case "complain": {
        // Client complains
        if (!isClient) {
          return NextResponse.json(
            { success: false, message: "Hanya client yang bisa komplain" },
            { status: 403 }
          );
        }

        if (milestone.status !== "waiting") {
          return NextResponse.json(
            { success: false, message: "Milestone tidak dalam status menunggu" },
            { status: 400 }
          );
        }

        // Update milestone status
        await db.milestone.update({
          where: { id },
          data: { status: "complaint" },
        });

        // Create log
        await db.log.create({
          data: {
            milestoneId: id,
            tipe: "complain",
            catatan: catatan || "",
            files: JSON.stringify(files || []),
            userId: session.userId,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Komplain berhasil diajukan",
        });
      }

      case "confirm-payment": {
        // Admin confirms payment
        if (!isUserAdmin) {
          return NextResponse.json(
            { success: false, message: "Hanya admin yang bisa konfirmasi pembayaran" },
            { status: 403 }
          );
        }

        if (milestone.status !== "waiting_admin") {
          return NextResponse.json(
            { success: false, message: "Milestone tidak dalam status menunggu admin" },
            { status: 400 }
          );
        }

        // Get admin data
        const adminData = await db.adminData.findUnique({
          where: { projectId: milestone.projectId },
        });

        if (!adminData) {
          return NextResponse.json(
            { success: false, message: "Data admin tidak ditemukan" },
            { status: 404 }
          );
        }

        // Get retensi
        const retensi = await db.retensi.findUnique({
          where: { projectId: milestone.projectId },
        });

        // Apply retention % when retensi is agreed or already in countdown/paused (termasuk pekerjaan tambahan saat masa retensi)
        const retentionActiveStatuses = ["agreed", "countdown", "complaint_paused", "waiting_confirmation", "pending_release"];
        const retentionPercent = retensi && retentionActiveStatuses.includes(retensi.status) ? retensi.percent : 0;
        const payment = calculateMilestonePayment(milestone.price, retentionPercent);

        // Update admin data
        // adminBalance decreases because we pay vendor from held funds
        await db.adminData.update({
          where: { projectId: milestone.projectId },
          data: {
            vendorPaid: { increment: payment.vendorNetAmount },
            adminBalance: { decrement: payment.vendorNetAmount },
            // Note: retentionAmount stays in adminBalance (held), tracked in retentionHeld
            retentionHeld: { increment: payment.retentionAmount },
            feeEarned: { increment: payment.vendorFeeAmount },
          },
        });

        // Update milestone status
        await db.milestone.update({
          where: { id },
          data: { status: "completed" },
        });

        // Create log with detailed breakdown
        const logDetail = `Pembayaran dikonfirmasi:
- Nilai Kotor: ${formatCurrency(payment.grossAmount)}
- Fee Vendor (2%): ${formatCurrency(payment.vendorFeeAmount)}
- Retensi (${payment.retentionPercent}%): ${formatCurrency(payment.retentionAmount)}
- Diterima Vendor: ${formatCurrency(payment.vendorNetAmount)}`;

        await db.log.create({
          data: {
            milestoneId: id,
            tipe: "admin",
            catatan: logDetail,
            files: "[]",
            amount: payment.vendorFeeAmount,
          },
        });

        // Jika semua pekerjaan (termasuk pekerjaan tambahan) selesai dan retensi sudah disetujui, mulai countdown retensi
        const allMilestones = await db.milestone.findMany({
          where: { projectId: milestone.projectId },
        });
        const allCompleted = allMilestones.length > 0 && allMilestones.every((m) => m.status === "completed");
        const retensiRecord = await db.retensi.findUnique({
          where: { projectId: milestone.projectId },
        });
        if (allCompleted && retensiRecord?.status === "agreed") {
          const now = new Date();
          const MS_PER_DAY = 24 * 60 * 60 * 1000;
          const endDate = new Date(now.getTime() + retensiRecord.days * MS_PER_DAY);
          await db.retensi.update({
            where: { projectId: milestone.projectId },
            data: {
              status: "countdown",
              startDate: now,
              endDate,
              remainingDays: retensiRecord.days,
            },
          });
          await db.retensiLog.create({
            data: {
              retensiId: retensiRecord.id,
              tipe: "countdown_start",
              catatan: `Semua pekerjaan selesai. Masa retensi ${retensiRecord.days} hari dimulai.`,
              files: "[]",
            },
          });
        }

        return NextResponse.json({
          success: true,
          message: "Pembayaran berhasil dikonfirmasi",
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: "Aksi tidak valid" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing milestone action:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
