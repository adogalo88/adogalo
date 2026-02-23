import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";
import { isAdmin } from "@/lib/auth";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, projectId } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email diperlukan" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Determine user type
    let userRole: string | null = null;
    let userId: string | null = null;

    if (projectId) {
      // Check if user is client or vendor in this project
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
      } else if (project.vendorEmail === emailLower) {
        userRole = "vendor";
      } else {
        // Check if user is a manager with access to this project
        const user = await db.user.findUnique({
          where: { email: emailLower },
        });

        if (user && user.role === "manager") {
          const projectIds = JSON.parse(user.projectIds || "[]");
          if (projectIds.includes(projectId)) {
            userRole = "manager";
            userId = user.id;
          }
        }
      }

      if (!userRole) {
        return NextResponse.json(
          { success: false, message: "Email tidak terdaftar dalam proyek ini" },
          { status: 404 }
        );
      }
    } else {
      // Admin login (no projectId)
      if (isAdmin(emailLower)) {
        userRole = "admin";

        // Find or create admin user
        let user = await db.user.findUnique({
          where: { email: emailLower },
        });

        if (!user) {
          user = await db.user.create({
            data: {
              email: emailLower,
              nama: "Admin",
              role: "admin",
            },
          });
        }
        userId = user.id;
      } else {
        return NextResponse.json(
          { success: false, message: "Email tidak terdaftar sebagai admin" },
          { status: 404 }
        );
      }
    }

    // Generate OTP
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete existing OTP for this email
    await db.otp.deleteMany({
      where: { email: emailLower },
    });

    // Create new OTP
    await db.otp.create({
      data: {
        code: otpCode,
        email: emailLower,
        userId: userId,
        expiresAt,
      },
    });

    // Send OTP email
    const emailResult = await sendOtpEmail(emailLower, otpCode);

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, message: emailResult.message },
        { status: 500 }
      );
    }

    // In development mode, return the OTP for display
    const response: { success: boolean; message: string; devOtp?: string } = {
      success: true,
      message: emailResult.message,
    };
    
    // If OTP was returned (development mode), include it in response
    if (emailResult.otp) {
      response.devOtp = emailResult.otp;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
