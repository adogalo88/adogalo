import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET - Daftar proyek yang bisa diakses user (client/vendor) untuk fitur ganti proyek.
 * Hanya proyek di mana email user terdaftar sebagai client atau vendor.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.role === "admin" || session.role === "manager") {
      return NextResponse.json({
        success: true,
        projects: [],
      });
    }

    const email = session.email.toLowerCase().trim();
    const projects = await db.project.findMany({
      where: {
        OR: [
          { clientEmail: email },
          { vendorEmail: email },
        ],
      },
      select: {
        id: true,
        judul: true,
        clientEmail: true,
        vendorEmail: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const list = projects.map((p) => ({
      id: p.id,
      judul: p.judul,
      role: p.clientEmail === email ? ("client" as const) : ("vendor" as const),
    }));

    return NextResponse.json({
      success: true,
      projects: list,
    });
  } catch (error) {
    console.error("Error fetching my projects:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
