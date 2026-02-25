import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";

// Constants
const CLIENT_FEE_PERCENT = 1;

// GET - Get change requests for a project
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

    const changeRequests = await db.changeRequest.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        milestone: {
          select: { id: true, judul: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      changeRequests,
    });
  } catch (error) {
    console.error("Error fetching change requests:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// POST - Create or process reduction request
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
    const { projectId, action, milestoneId, amount, alasan, files, changeRequestId } = body;

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

    switch (action) {
      case "create": {
        // Vendor creates reduction request
        if (!isVendor) {
          return NextResponse.json(
            { success: false, message: "Hanya vendor yang bisa mengajukan pengurangan" },
            { status: 403 }
          );
        }

        if (!milestoneId || !amount || amount <= 0) {
          return NextResponse.json(
            { success: false, message: "Milestone dan nilai pengurangan harus diisi" },
            { status: 400 }
          );
        }

        const milestone = await db.milestone.findUnique({
          where: { id: milestoneId },
        });

        if (!milestone || milestone.projectId !== projectId) {
          return NextResponse.json(
            { success: false, message: "Milestone tidak ditemukan" },
            { status: 404 }
          );
        }

        if (amount > milestone.price) {
          return NextResponse.json(
            { success: false, message: "Nilai pengurangan tidak boleh melebihi harga milestone" },
            { status: 400 }
          );
        }

        // Create change request
        const changeRequest = await db.changeRequest.create({
          data: {
            projectId,
            milestoneId,
            tipe: "reduction",
            amount,
            alasan: alasan || null,
            files: JSON.stringify(files || []),
            status: "pending",
            createdBy: "vendor",
          },
        });

        return NextResponse.json({
          success: true,
          message: "Pengajuan pengurangan pekerjaan berhasil dikirim",
          changeRequest,
        });
      }

      case "approve_client": {
        // Client approves → langsung berlaku: kurangi nilai milestone, buat termin pengembalian, status approved
        if (!isClient) {
          return NextResponse.json(
            { success: false, message: "Hanya client yang bisa menyetujui" },
            { status: 403 }
          );
        }

        if (!changeRequestId) {
          return NextResponse.json(
            { success: false, message: "Change Request ID diperlukan" },
            { status: 400 }
          );
        }

        const changeRequest = await db.changeRequest.findUnique({
          where: { id: changeRequestId },
          include: { milestone: true },
        });

        if (!changeRequest || changeRequest.status !== "pending") {
          return NextResponse.json(
            { success: false, message: "Request tidak ditemukan atau sudah diproses" },
            { status: 400 }
          );
        }

        // Kurangi nilai milestone
        await db.milestone.update({
          where: { id: changeRequest.milestoneId! },
          data: {
            price: { decrement: changeRequest.amount },
          },
        });

        // Buat termin pengembalian (refund) — akan dicairkan ke client di bagian Refund/Pengembalian Dana
        await db.terminClient.create({
          data: {
            projectId,
            judul: `Pengurangan pekerjaan: ${changeRequest.milestone?.judul || "Milestone"}`,
            baseAmount: -changeRequest.amount,
            type: "reduction",
            feeClientAmount: 0,
            totalWithFee: -changeRequest.amount,
            terkaitId: changeRequestId,
            status: "unpaid",
          },
        });

        // Status pengajuan = disetujui
        await db.changeRequest.update({
          where: { id: changeRequestId },
          data: { status: "approved" },
        });

        // Log di milestone
        await db.log.create({
          data: {
            milestoneId: changeRequest.milestoneId,
            tipe: "change",
            catatan: `Pengurangan pekerjaan sebesar ${changeRequest.amount.toLocaleString("id-ID")} disetujui. Alasan: ${changeRequest.alasan || "Tidak ada alasan"}`,
            files: changeRequest.files,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Pengurangan pekerjaan disetujui. Nilai progress diperbarui; pengembalian dana dapat diproses di bagian Refund/Pengembalian Dana.",
        });
      }

      case "reject_client": {
        // Client rejects
        if (!isClient) {
          return NextResponse.json(
            { success: false, message: "Hanya client yang bisa menolak" },
            { status: 403 }
          );
        }

        if (!changeRequestId) {
          return NextResponse.json(
            { success: false, message: "Change Request ID diperlukan" },
            { status: 400 }
          );
        }

        // Update status
        await db.changeRequest.update({
          where: { id: changeRequestId },
          data: { status: "rejected" },
        });

        return NextResponse.json({
          success: true,
          message: "Pengajuan pengurangan ditolak",
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: "Aksi tidak valid" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing reduction:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
