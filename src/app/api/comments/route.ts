import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST - Create comment
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
    const { logId, teks, files, replyTo } = body;

    if (!logId || (!teks && (!files || files.length === 0))) {
      return NextResponse.json(
        { success: false, message: "Log ID dan teks/file diperlukan" },
        { status: 400 }
      );
    }

    // Get log with milestone and project to check access
    const log = await db.log.findUnique({
      where: { id: logId },
      include: {
        milestone: {
          include: { project: true },
        },
      },
    });

    if (!log) {
      return NextResponse.json(
        { success: false, message: "Log tidak ditemukan" },
        { status: 404 }
      );
    }

    // Determine user name based on role
    let userName = session.email;
    if (log.milestone?.project) {
      if (log.milestone.project.clientEmail === session.email) {
        userName = log.milestone.project.clientName;
      } else if (log.milestone.project.vendorEmail === session.email) {
        userName = log.milestone.project.vendorName;
      }
    }

    // Get user from database if exists
    const user = await db.user.findUnique({
      where: { email: session.email },
    });
    if (user) {
      userName = user.nama;
    }

    // Create comment with files
    const comment = await db.comment.create({
      data: {
        logId,
        userId: session.userId || session.email,
        nama: userName,
        teks: teks || "",
        files: JSON.stringify(files || []),
        reply: replyTo || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Komentar berhasil ditambahkan",
      comment,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
