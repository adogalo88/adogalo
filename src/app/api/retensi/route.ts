import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";
import { notifyRetensiComplaint, notifyRetensiFixSubmitted, notifyRetensiProposed, notifyRetensiApproved, notifyRetensiRejected, notifyRetensiRejectFix } from "@/lib/email";

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

        notifyRetensiProposed(project.clientEmail, project.judul, percent, days).catch((e) =>
          console.error("Notifikasi retensi:", e)
        );

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

        notifyRetensiApproved(project.vendorEmail, project.judul).catch((e) =>
          console.error("Notifikasi retensi:", e)
        );

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

        notifyRetensiRejected(project.vendorEmail, project.judul).catch((e) =>
          console.error("Notifikasi retensi:", e)
        );

        return NextResponse.json({
          success: true,
          message: "Retensi ditolak",
          retensi,
        });
      }

      case "complain": {
        // Client complains about retensi (during countdown) → pause countdown. Wajib catatan + bukti upload.
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

        const hasCatatan = typeof catatan === "string" && catatan.trim().length > 0;
        const hasFiles = Array.isArray(files) && files.length > 0;
        if (!hasCatatan || !hasFiles) {
          return NextResponse.json(
            { success: false, message: "Catatan dan upload bukti komplain wajib diisi" },
            { status: 400 }
          );
        }

        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        const now = new Date();
        const endMs = retensi.endDate?.getTime() ?? (retensi.startDate?.getTime() ?? now.getTime()) + (retensi.remainingDays ?? retensi.days) * MS_PER_DAY;
        const remainingMs = Math.max(0, endMs - now.getTime());
        const endDateWhenResumed = new Date(now.getTime() + remainingMs);
        const remainingDaysAtPause = Math.max(0, Math.ceil(remainingMs / MS_PER_DAY));
        // #region agent log
        fetch('http://127.0.0.1:7340/ingest/04a68b75-b7f8-4446-87ad-e5e7b7018684',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'32405d'},body:JSON.stringify({sessionId:'32405d',location:'retensi/route.ts:complain',message:'complain remainingDays computed',data:{endMs,remainingMs,remainingDaysAtPause,endDateWhenResumed:endDateWhenResumed.toISOString()},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        // #endregion

        retensi = await db.retensi.update({
          where: { projectId },
          data: {
            status: "complaint_paused",
            pausedTime: now,
            endDate: endDateWhenResumed,
            remainingDays: remainingDaysAtPause,
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

        notifyRetensiComplaint(project.vendorEmail, project.judul).catch((e) =>
          console.error("Notifikasi email:", e)
        );

        return NextResponse.json({
          success: true,
          message: "Komplain berhasil diajukan, timer di-pause",
          retensi,
        });
      }

      case "fix": {
        // Vendor submits fix for retensi complaint. Wajib catatan + bukti upload.
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

        const hasCatatan = typeof catatan === "string" && catatan.trim().length > 0;
        const hasFiles = Array.isArray(files) && files.length > 0;
        if (!hasCatatan || !hasFiles) {
          return NextResponse.json(
            { success: false, message: "Catatan dan upload bukti perbaikan wajib diisi" },
            { status: 400 }
          );
        }

        // #region agent log
        fetch('http://127.0.0.1:7340/ingest/04a68b75-b7f8-4446-87ad-e5e7b7018684',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'32405d'},body:JSON.stringify({sessionId:'32405d',location:'retensi/route.ts:fix',message:'fix before update',data:{retensiRemainingDays:retensi.remainingDays,retensiDays:retensi.days,willSave:retensi.remainingDays ?? retensi.days},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        // Update retensi status; tetap simpan remainingDays agar countdown tidak reset saat dilanjutkan
        retensi = await db.retensi.update({
          where: { projectId },
          data: {
            status: "waiting_confirmation",
            fixSubmittedTime: new Date(),
            remainingDays: retensi.remainingDays ?? retensi.days,
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

        notifyRetensiFixSubmitted(project.clientEmail, project.judul).catch((e) =>
          console.error("Notifikasi email:", e)
        );

        return NextResponse.json({
          success: true,
          message: "Perbaikan berhasil diupload, menunggu konfirmasi client",
          retensi,
        });
      }

      case "confirm_fix": {
        // Client confirms fix → countdown dilanjutkan dari waktu yang sama (endDate tidak diubah), presisi sampai detik
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

        // Jangan ubah startDate/remainingDays/endDate — endDate sudah berisi waktu selesai yang persis (hingga detik)
        // #region agent log
        fetch('http://127.0.0.1:7340/ingest/04a68b75-b7f8-4446-87ad-e5e7b7018684',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'32405d'},body:JSON.stringify({sessionId:'32405d',location:'retensi/route.ts:confirm_fix',message:'confirm_fix resume (keep endDate)',data:{endDate:retensi.endDate?.toISOString?.()},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        retensi = await db.retensi.update({
          where: { projectId },
          data: {
            status: "countdown",
            pausedTime: null,
            fixSubmittedTime: null,
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

      case "reject_fix": {
        // Client menolak perbaikan → kembali ke complaint_paused, vendor harus perbaiki lagi
        if (!isClient) {
          return NextResponse.json(
            { success: false, message: "Hanya client yang bisa menolak perbaikan" },
            { status: 403 }
          );
        }

        if (!retensi || retensi.status !== "waiting_confirmation") {
          return NextResponse.json(
            { success: false, message: "Tidak menunggu konfirmasi" },
            { status: 400 }
          );
        }

        const hasCatatan = typeof catatan === "string" && catatan.trim().length > 0;
        const hasFiles = Array.isArray(files) && files.length > 0;
        if (!hasCatatan || !hasFiles) {
          return NextResponse.json(
            { success: false, message: "Catatan dan upload bukti komplain wajib diisi untuk menolak perbaikan" },
            { status: 400 }
          );
        }

        retensi = await db.retensi.update({
          where: { projectId },
          data: {
            status: "complaint_paused",
            fixSubmittedTime: null,
          },
        });

        await db.retensiLog.create({
          data: {
            retensiId: retensi.id,
            tipe: "complaint",
            catatan: catatan?.trim() || "Client menolak perbaikan dan mengajukan komplain lagi",
            files: JSON.stringify(files || []),
          },
        });

        notifyRetensiComplaint(project.vendorEmail, project.judul).catch((e) =>
          console.error("Notifikasi email:", e)
        );
        notifyRetensiRejectFix(project.vendorEmail, project.judul).catch((e) =>
          console.error("Notifikasi retensi:", e)
        );

        return NextResponse.json({
          success: true,
          message: "Perbaikan ditolak. Vendor dapat mengupload perbaikan lagi.",
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

        const allowedStatuses = ["countdown", "waiting_confirmation", "pending_release"];
        if (!retensi || !allowedStatuses.includes(retensi.status)) {
          return NextResponse.json(
            { success: false, message: "Retensi tidak bisa di-release" },
            { status: 400 }
          );
        }

        const adminData = await db.adminData.findUnique({
          where: { projectId },
        });

        if (adminData && retensi.value > 0) {
          await db.adminData.update({
            where: { projectId },
            data: {
              retentionHeld: { decrement: retensi.value },
              vendorPaid: { increment: retensi.value },
              adminBalance: { decrement: retensi.value },
            },
          });
        }

        retensi = await db.retensi.update({
          where: { projectId },
          data: { status: "paid" },
        });

        await db.retensiLog.create({
          data: {
            retensiId: retensi.id,
            tipe: "released",
            catatan: `Retensi sebesar ${retensi.value.toLocaleString("id-ID")} berhasil dicairkan ke vendor`,
            files: "[]",
          },
        });

        await db.project.update({
          where: { id: projectId },
          data: { status: "completed" },
        });

        return NextResponse.json({
          success: true,
          message: "Pembayaran retensi dikonfirmasi. Dana dicairkan ke vendor dan proyek ditandai selesai.",
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

// GET - Get retensi status (termasuk auto-selesai countdown → pending_release)
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

    let retensi = await db.retensi.findUnique({
      where: { projectId },
      include: {
        logs: {
          orderBy: { tanggal: "asc" },
        },
      },
    });

    const endMs = retensi?.endDate
      ? new Date(retensi.endDate).getTime()
      : retensi?.status === "countdown" && retensi.startDate != null && retensi.remainingDays != null
        ? new Date(retensi.startDate).getTime() + retensi.remainingDays * 24 * 60 * 60 * 1000
        : null;
    if (retensi?.status === "countdown" && endMs != null && Date.now() >= endMs) {
        retensi = await db.retensi.update({
          where: { projectId },
          data: { status: "pending_release", remainingDays: 0, endDate: null },
          include: {
            logs: { orderBy: { tanggal: "asc" } },
          },
        });
        await db.retensiLog.create({
          data: {
            retensiId: retensi.id,
            tipe: "countdown_finished",
            catatan: "Masa retensi selesai. Menunggu admin mencairkan dana ke vendor.",
            files: "[]",
          },
        });
    }

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
