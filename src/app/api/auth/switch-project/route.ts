import { NextRequest, NextResponse } from "next/server";
import { getSession, setAuthCookie, generateToken } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST - Ganti proyek aktif (hanya client/vendor).
 * Body: { projectId: string }
 * Memvalidasi bahwa email user terdaftar di proyek tersebut, lalu mengeluarkan token baru
 * dengan projectId dan role di proyek itu.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.role === "admin" || session.role === "manager") {
      return NextResponse.json(
        { success: false, message: "Hanya client dan vendor yang dapat ganti proyek" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { projectId } = body;
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { success: false, message: "projectId diperlukan" },
        { status: 400 }
      );
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, clientEmail: true, vendorEmail: true },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Proyek tidak ditemukan" },
        { status: 404 }
      );
    }

    const email = session.email.toLowerCase().trim();
    const isClient = project.clientEmail.toLowerCase().trim() === email;
    const isVendor = project.vendorEmail.toLowerCase().trim() === email;

    if (!isClient && !isVendor) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke proyek ini" },
        { status: 403 }
      );
    }

    const role = isClient ? "client" : "vendor";
    const token = generateToken({
      email: session.email,
      role,
      projectId: project.id,
      userId: session.userId,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      projectId: project.id,
      role,
    });
  } catch (error) {
    console.error("Error switching project:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
