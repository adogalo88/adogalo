import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";

// PUT - Update manager (admin only)
export async function PUT(
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

    const body = await request.json();
    const { nama, projectIds } = body;

    const manager = await db.user.update({
      where: { id },
      data: {
        nama,
        projectIds: JSON.stringify(projectIds || []),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Manager berhasil diperbarui",
      manager,
    });
  } catch (error) {
    console.error("Error updating manager:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat memperbarui manager" },
      { status: 500 }
    );
  }
}

// DELETE - Delete manager (admin only)
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

    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Manager berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting manager:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat menghapus manager" },
      { status: 500 }
    );
  }
}
