import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";

// Constants
const CLIENT_FEE_PERCENT = 1;

// GET - Get additional works for a project
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

    const additionalWorks = await db.additionalWork.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      additionalWorks,
    });
  } catch (error) {
    console.error("Error fetching additional works:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// POST - Create or process additional work
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
    const { projectId, action, judul, amount, deskripsi, files, additionalWorkId } = body;

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
        // Vendor creates additional work request
        if (!isVendor) {
          return NextResponse.json(
            { success: false, message: "Hanya vendor yang bisa mengajukan pekerjaan tambahan" },
            { status: 403 }
          );
        }

        if (!judul || !amount || amount <= 0) {
          return NextResponse.json(
            { success: false, message: "Judul dan nilai pekerjaan harus diisi" },
            { status: 400 }
          );
        }

        // Create additional work
        const additionalWork = await db.additionalWork.create({
          data: {
            projectId,
            judul,
            amount,
            deskripsi: deskripsi || null,
            files: JSON.stringify(files || []),
            status: "pending",
          },
        });

        return NextResponse.json({
          success: true,
          message: "Pengajuan pekerjaan tambahan berhasil dikirim",
          additionalWork,
        });
      }

      case "approve": {
        // Client or Admin approves
        if (!isClient && !isUserAdmin) {
          return NextResponse.json(
            { success: false, message: "Hanya client atau admin yang bisa menyetujui" },
            { status: 403 }
          );
        }

        if (!additionalWorkId) {
          return NextResponse.json(
            { success: false, message: "Additional Work ID diperlukan" },
            { status: 400 }
          );
        }

        const additionalWork = await db.additionalWork.findUnique({
          where: { id: additionalWorkId },
        });

        if (!additionalWork || additionalWork.status !== "pending") {
          return NextResponse.json(
            { success: false, message: "Pekerjaan tambahan tidak ditemukan atau sudah diproses" },
            { status: 400 }
          );
        }

        // Get current max urutan for milestones
        const maxUrutan = await db.milestone.aggregate({
          where: { projectId },
          _max: { urutan: true },
        });

        const newUrutan = (maxUrutan._max.urutan || 0) + 1;

        // Create new milestone
        const milestone = await db.milestone.create({
          data: {
            projectId,
            judul: `[Tambahan] ${additionalWork.judul}`,
            deskripsi: additionalWork.deskripsi,
            price: additionalWork.amount,
            originalPrice: additionalWork.amount,
            status: "pending_additional",
            isAdditionalWork: true,
            urutan: newUrutan,
          },
        });

        // Create termin for client with fee
        const feeAmount = additionalWork.amount * (CLIENT_FEE_PERCENT / 100);
        const totalWithFee = additionalWork.amount + feeAmount;

        await db.terminClient.create({
          data: {
            projectId,
            judul: `Pekerjaan Tambahan: ${additionalWork.judul}`,
            baseAmount: additionalWork.amount,
            type: "additional",
            feeClientAmount: feeAmount,
            totalWithFee,
            terkaitId: additionalWork.id,
            status: "unpaid",
          },
        });

        // Update additional work
        await db.additionalWork.update({
          where: { id: additionalWorkId },
          data: {
            status: "approved",
            milestoneId: milestone.id,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Pekerjaan tambahan disetujui, milestone dan termin baru dibuat",
          milestone,
        });
      }

      case "reject": {
        // Client or Admin rejects
        if (!isClient && !isUserAdmin) {
          return NextResponse.json(
            { success: false, message: "Hanya client atau admin yang bisa menolak" },
            { status: 403 }
          );
        }

        if (!additionalWorkId) {
          return NextResponse.json(
            { success: false, message: "Additional Work ID diperlukan" },
            { status: 400 }
          );
        }

        // Update additional work status
        await db.additionalWork.update({
          where: { id: additionalWorkId },
          data: { status: "rejected" },
        });

        return NextResponse.json({
          success: true,
          message: "Pekerjaan tambahan ditolak",
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: "Aksi tidak valid" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing additional work:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
