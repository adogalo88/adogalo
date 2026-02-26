import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateToken, setAuthCookie, isAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, projectId } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email dan OTP diperlukan" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Find OTP record
    const otpRecord = await db.otp.findFirst({
      where: {
        email: emailLower,
        code: otp,
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: "Kode OTP tidak valid" },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await db.otp.delete({ where: { id: otpRecord.id } });
      return NextResponse.json(
        { success: false, message: "Kode OTP sudah kadaluarsa" },
        { status: 400 }
      );
    }

    // Determine user role
    let userRole: string | null = null;
    let userId: string | null = otpRecord.userId;
    let userName: string = "";

    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return NextResponse.json(
          { success: false, message: "Proyek tidak ditemukan" },
          { status: 404 }
        );
      }

      if (project.clientEmail === emailLower) {
        userRole = "client";
        userName = project.clientName;
      } else if (project.vendorEmail === emailLower) {
        userRole = "vendor";
        userName = project.vendorName;
      } else {
        // Check if user is a manager
        const user = await db.user.findUnique({
          where: { email: emailLower },
        });

        if (user && user.role === "manager") {
          const projectIds = JSON.parse(user.projectIds || "[]");
          if (projectIds.includes(projectId)) {
            userRole = "manager";
            userId = user.id;
            userName = user.nama;
          }
        }
      }
    } else {
      // Admin atau Manager login (portal admin)
      if (isAdmin(emailLower)) {
        userRole = "admin";
        const user = await db.user.findUnique({
          where: { email: emailLower },
        });
        if (user) {
          userName = user.nama;
        } else {
          userName = "Admin";
        }
      } else {
        const managerUser = await db.user.findUnique({
          where: { email: emailLower },
        });
        if (managerUser && managerUser.role === "manager") {
          userRole = "manager";
          userId = managerUser.id;
          userName = managerUser.nama || "Manager";
        }
      }
    }

    if (!userRole) {
      return NextResponse.json(
        { success: false, message: "Gagal menentukan role pengguna" },
        { status: 400 }
      );
    }

    // Delete used OTP
    await db.otp.delete({ where: { id: otpRecord.id } });

    // Generate JWT token
    const token = generateToken({
      email: emailLower,
      role: userRole as "admin" | "manager" | "client" | "vendor",
      projectId: projectId,
      userId: userId || undefined,
    });

    // Set auth cookie
    await setAuthCookie(token);

    // Determine redirect path
    let redirect = "/";
    switch (userRole) {
      case "admin":
        redirect = "/admin/dashboard";
        break;
      case "manager":
        redirect = projectId ? `/project/${projectId}` : "/admin/dashboard";
        break;
      case "client":
      case "vendor":
        redirect = projectId ? `/project/${projectId}` : "/";
        break;
    }

    return NextResponse.json({
      success: true,
      token,
      redirect,
      user: {
        email: emailLower,
        name: userName,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
