import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";

// POST - Retensi actions
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, action, percent, days, catatan, files } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: "Project ID diperlukan" },
        { status: 400 }
      );
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Proyek tidak ditemukan" },
        { status: 404 }
      );
    }

    const isUserAdmin = isAdmin(session.email);
    const isClient = project.clientEmail === session.email;
    const isVendor = project.vendorEmail === session.email;

    let retensi = await db.retensi.findUnique({
      where: { projectId },
    });

    switch (action) {
      case "propose": {
        // Vendor proposes retensi
        if (!isVendor) {
          return NextResponse.json(
            { success: false, message: "Hanya vendor yang bisa mengajukan retensi" },
            { status: 403 }
          );
        }

        if (!percent || percent <= 0 || percent > 100) {
          return NextResponse.json(
            { success: false, message: "Persentase retensi tidak valid" },
            { status: 400 }
          );
        }

        if (!days || days <= 0) {
          return NextResponse.json(
            { success: false, message: "Durasi retensi tidak valid" },
            { status: 400 }
          );
        }

        // Calculate retensi value from total project value
        const milestones = await db.milestone.findMany({
          where: { projectId },
        });
        const totalValue = milestones.reduce((sum, m) => sum + m.price, 0);
        const retensiValue = totalValue * (percent / 100);

        // Update or create retensi
        retensi = await db.retensi.update({
          where: { projectId },
          data: {
            status: "proposed",
            percent,
            days,
            value: retensiValue,
          },
        });

        // Create log
        await db.retensiLog.create({
          data: {
            retensiId: retensi.id,
            tipe: "proposed",
            catatan: `Vendor mengajukan retensi ${percent}% selama ${days} hari`,
            files: "[]",
          },
        });

        return NextResponse.json({
          success: true,
          message: "Pengajuan retensi berhasil dikirim",
          retensi,
        });
      }

      case "approve": {
        // Client approves retensi
        if (!isClient) {
          return NextResponse.json(
            { success: false, message: "Hanya client yang bisa menyetujui retensi" },
            { status: 403 }
          );
        }

        if (!retensi || retensi.status !== "proposed") {
          return NextResponse.json(
            { success: false, message: "Tidak ada pengajuan retensi yang bisa disetujui" },
            { status: 400 }
          );
        }

        // Update retensi status
        retensi = await db.retensi.update({
          where: { projectId },
          data: {
            status: "agreed",
          },
        });

        // Create log
        await db.retensiLog.create({
          data: {
            retensiId: retensi.id,
            tipe: "approved",
            catatan: "Client menyetujui pengajuan retensi",
            files: "[]",
          },
        });

        return NextResponse.json({
          success: true,
          message: "Retensi berhasil disetujui",
          retensi,
        });
      }

      case "reject": {
        // Client rejects retensi
        if (!isClient) {
          return NextResponse.json(
            { success: false, message: "Hanya client yang bisa menolak retensi" },
            { status: 403 }
          );
        }

        if (!retensi || retensi.status !== "proposed") {
          return NextResponse.json(
            { success: false, message: "Tidak ada pengajuan retensi yang bisa ditolak" },
            { status: 400 }
          );
        }

        // Update retensi status
        retensi = await db.retensi.update({
          where: { projectId },
          data: {
            status: "none",
            percent: 0,
            days: 0,
            value: 0,
          },
        });

        // Create log
        await db.retensiLog.create({
          data: {
            retensiId: retensi.id,
            tipe: "rejected",
            catatan: "Client menolak pengajuan retensi",
            files: "[]",
          },
        });

        return NextResponse.json({
          success: true,
          message: "Retensi ditolak",
          retensi,
        });
      }

      case "complain": {
        // Client complains about retensi (during countdown)
        if (!isClient) {
          return NextResponse.json(
            { success: false, message: "Hanya client yang bisa komplain" },
            { status: 403 }
          );
        }

        if (!retensi || retensi.status !== "countdown") {
          return NextResponse.json(
            { success: false, message: "Tidak dalam masa retensi" },
            { status: 400 }
          );
        }

        // Update retensi status
        retensi = await db.retensi.update({
          where: { projectId },
          data: {
            status: "complaint_paused",
            pausedTime: new Date(),
          },
        });

        // Create log
        await db.retensiLog.create({
          data: {
            retensiId: retensi.id,
            tipe: "complaint",
            catatan: catatan || "Client mengajukan komplain",
            files: JSON.stringify(files || []),
          },
        });

        return NextResponse.json({
          success: true,
          message: "Komplain berhasil diajukan, timer di-pause",
          retensi,
        });
      }

      case "fix": {
        // Vendor submits fix for retensi complaint
        if (!isVendor) {
          return NextResponse.json(
            { success: false, message: "Hanya vendor yang bisa upload perbaikan" },
            { status: 403 }
          );
        }

        if (!retensi || retensi.status !== "complaint_paused") {
          return NextResponse.json(
            { success: false, message: "Tidak ada komplain yang perlu diperbaiki" },
            { status: 400 }
          );
        }

        // Update retensi status
        retensi = await db.retensi.update({
          where: { projectId },
          data: {
            status: "waiting_confirmation",
            fixSubmittedTime: new Date(),
          },
        });

        // Create log
        await db.retensiLog.create({
          data: {
            retensiId: retensi.id,
            tipe: "fix_submitted",
            catatan: catatan || "Vendor mengupload perbaikan",
            files: JSON.stringify(files || []),
          },
        });

        return NextResponse.json({
          success: true,
          message: "Perbaikan berhasil diupload, menunggu konfirmasi client",
          retensi,
        });
      }

      case "confirm_fix": {
        // Client confirms fix is acceptable
        if (!isClient) {
          return NextResponse.json(
            { success: false, message: "Hanya client yang bisa konfirmasi" },
            { status: 403 }
          );
        }

        if (!retensi || retensi.status !== "waiting_confirmation") {
          return NextResponse.json(
            { success: false, message: "Tidak menunggu konfirmasi" },
            { status: 400 }
          );
        }

        // Resume countdown
        retensi = await db.retensi.update({
          where: { projectId },
          data: {
            status: "countdown",
          },
        });

        // Create log
        await db.retensiLog.create({
          data: {
            retensiId: retensi.id,
            tipe: "fix_confirmed",
            catatan: "Client mengkonfirmasi perbaikan, countdown dilanjutkan",
            files: "[]",
          },
        });

        return NextResponse.json({
          success: true,
          message: "Perbaikan dikonfirmasi, countdown dilanjutkan",
          retensi,
        });
      }

      case "release": {
        // Admin releases retensi to vendor
        if (!isUserAdmin) {
          return NextResponse.json(
            { success: false, message: "Hanya admin yang bisa me-release retensi" },
            { status: 403 }
          );
        }

        if (!retensi || (retensi.status !== "countdown" && retensi.status !== "waiting_confirmation")) {
          return NextResponse.json(
            { success: false, message: "Retensi tidak bisa di-release" },
            { status: 400 }
          );
        }

        // Check if countdown finished or admin override
        const adminData = await db.adminData.findUnique({
          where: { projectId },
        });

        if (adminData && retensi.value > 0) {
          // Transfer retensi to vendor
          await db.adminData.update({
            where: { projectId },
            data: {
              retentionHeld: { decrement: retensi.value },
              vendorPaid: { increment: retensi.value },
              adminBalance: { decrement: retensi.value },
            },
          });
        }

        // Update retensi status
        retensi = await db.retensi.update({
          where: { projectId },
          data: {
            status: "paid",
          },
        });

        // Create log
        await db.retensiLog.create({
          data: {
            retensiId: retensi.id,
            tipe: "released",
            catatan: `Retensi sebesar ${retensi.value.toLocaleString("id-ID")} berhasil dicairkan ke vendor`,
            files: "[]",
          },
        });

        return NextResponse.json({
          success: true,
          message: "Retensi berhasil dicairkan ke vendor",
          retensi,
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: "Aksi tidak valid" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing retensi action:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// GET - Get retensi status
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: "Project ID diperlukan" },
        { status: 400 }
      );
    }

    const retensi = await db.retensi.findUnique({
      where: { projectId },
      include: {
        logs: {
          orderBy: { tanggal: "desc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      retensi,
    });
  } catch (error) {
    console.error("Error fetching retensi:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
