import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";
import { calculateTerminAmount } from "@/lib/financial";

// GET - Get all milestones for a project
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

    const milestones = await db.milestone.findMany({
      where: { projectId },
      orderBy: { urutan: "asc" },
      include: {
        logs: {
          orderBy: { tanggal: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      milestones,
    });
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// POST - Create new milestone (only admin)
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
    const { projectId, judul, deskripsi, persentase, harga } = body;

    if (!projectId || !judul || !persentase || persentase <= 0) {
      return NextResponse.json(
        { success: false, message: "Project ID, judul, dan persentase harus diisi" },
        { status: 400 }
      );
    }

    // Only admin can create milestones
    const isUserAdmin = isAdmin(session.email);
    if (!isUserAdmin) {
      return NextResponse.json(
        { success: false, message: "Hanya admin yang bisa membuat pekerjaan" },
        { status: 403 }
      );
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: {
          select: { persentase: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Proyek tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check total percentage
    const totalExistingPersentase = project.milestones.reduce(
      (sum, m) => sum + (m.persentase || 0),
      0
    );
    const newTotal = totalExistingPersentase + persentase;

    if (newTotal > 100) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Total persentase akan melebihi 100%. Sisa: ${(100 - totalExistingPersentase).toFixed(1)}%` 
        },
        { status: 400 }
      );
    }

    // Get max urutan
    const maxUrutan = await db.milestone.aggregate({
      where: { projectId },
      _max: { urutan: true },
    });

    const newUrutan = (maxUrutan._max.urutan || 0) + 1;

    // Calculate price from persentase if not provided
    const calculatedPrice = harga || Math.round((persentase / 100) * project.baseTotal);

    // Create milestone
    const milestone = await db.milestone.create({
      data: {
        projectId,
        judul,
        deskripsi: deskripsi || null,
        persentase,
        price: calculatedPrice,
        originalPrice: calculatedPrice,
        status: "pending",
        urutan: newUrutan,
      },
    });

    // Create termin for client with fee using financial helper
    const terminAmounts = calculateTerminAmount(calculatedPrice);

    await db.terminClient.create({
      data: {
        projectId,
        judul: `Termin ${newUrutan}: ${judul}`,
        baseAmount: terminAmounts.baseAmount,
        type: "main",
        feeClientAmount: terminAmounts.clientFeeAmount,
        totalWithFee: terminAmounts.totalWithFee,
        status: "unpaid",
      },
    });

    // Create log
    await db.log.create({
      data: {
        milestoneId: milestone.id,
        tipe: "system",
        catatan: `Pekerjaan "${judul}" dibuat dengan persentase ${persentase}% dan nilai ${calculatedPrice.toLocaleString("id-ID")}`,
        files: "[]",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pekerjaan berhasil dibuat",
      milestone,
    });
  } catch (error) {
    console.error("Error creating milestone:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// PUT - Update milestone
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { milestoneId, judul, deskripsi, harga } = body;

    if (!milestoneId) {
      return NextResponse.json(
        { success: false, message: "Milestone ID diperlukan" },
        { status: 400 }
      );
    }

    const milestone = await db.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    });

    if (!milestone) {
      return NextResponse.json(
        { success: false, message: "Milestone tidak ditemukan" },
        { status: 404 }
      );
    }

    // Only vendor or admin can update milestones
    const isUserAdmin = isAdmin(session.email);
    const isVendor = milestone.project.vendorEmail === session.email;

    if (!isUserAdmin && !isVendor) {
      return NextResponse.json(
        { success: false, message: "Hanya vendor atau admin yang bisa mengubah milestone" },
        { status: 403 }
      );
    }

    // Can only update if status is pending
    if (milestone.status !== "pending" && !isUserAdmin) {
      return NextResponse.json(
        { success: false, message: "Milestone tidak bisa diubah karena sudah diproses" },
        { status: 400 }
      );
    }

    // Update milestone
    const updatedMilestone = await db.milestone.update({
      where: { id: milestoneId },
      data: {
        judul: judul || milestone.judul,
        deskripsi: deskripsi !== undefined ? deskripsi : milestone.deskripsi,
        price: harga || milestone.price,
        originalPrice: harga || milestone.originalPrice,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Milestone berhasil diperbarui",
      milestone: updatedMilestone,
    });
  } catch (error) {
    console.error("Error updating milestone:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// DELETE - Delete milestone
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get("milestoneId");

    if (!milestoneId) {
      return NextResponse.json(
        { success: false, message: "Milestone ID diperlukan" },
        { status: 400 }
      );
    }

    const milestone = await db.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    });

    if (!milestone) {
      return NextResponse.json(
        { success: false, message: "Milestone tidak ditemukan" },
        { status: 404 }
      );
    }

    // Only admin can delete milestones
    const isUserAdmin = isAdmin(session.email);

    if (!isUserAdmin) {
      return NextResponse.json(
        { success: false, message: "Hanya admin yang bisa menghapus milestone" },
        { status: 403 }
      );
    }

    // Can only delete if status is pending
    if (milestone.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "Milestone tidak bisa dihapus karena sudah diproses" },
        { status: 400 }
      );
    }

    // Delete milestone
    await db.milestone.delete({
      where: { id: milestoneId },
    });

    return NextResponse.json({
      success: true,
      message: "Milestone berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
