import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";

// GET - Get all managers (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session || !isAdmin(session.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const managers = await db.user.findMany({
      where: { role: "manager" },
      orderBy: { createdAt: "desc" },
    });

    // Parse projectIds and get project details
    const managersWithProjects = await Promise.all(
      managers.map(async (manager) => {
        const projectIds = JSON.parse(manager.projectIds || "[]");
        const projects = await db.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, judul: true },
        });
        return {
          ...manager,
          projectIds,
          projects,
        };
      })
    );

    return NextResponse.json({
      success: true,
      managers: managersWithProjects,
    });
  } catch (error) {
    console.error("Error fetching managers:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat mengambil data manager" },
      { status: 500 }
    );
  }
}

// POST - Create new manager (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session || !isAdmin(session.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nama, email, projectIds } = body;

    if (!nama || !email) {
      return NextResponse.json(
        { success: false, message: "Nama dan email harus diisi" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: emailLower },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email sudah terdaftar" },
        { status: 400 }
      );
    }

    // Create manager
    const manager = await db.user.create({
      data: {
        nama,
        email: emailLower,
        role: "manager",
        projectIds: JSON.stringify(projectIds || []),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Manager berhasil ditambahkan",
      manager,
    });
  } catch (error) {
    console.error("Error creating manager:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat menambahkan manager" },
      { status: 500 }
    );
  }
}
