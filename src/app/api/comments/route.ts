import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notifyCommentAdded } from "@/lib/email";

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

    // Nama yang tampil = nama orang yang mengirim (client/vendor dari proyek, admin/manager dari User)
    let userName = session.email;
    const project = log.milestone?.project;
    if (project) {
      if (project.clientEmail === session.email) {
        userName = project.clientName;
      } else if (project.vendorEmail === session.email) {
        userName = project.vendorName;
      } else {
        const user = await db.user.findUnique({
          where: { email: session.email },
        });
        if (user) userName = user.nama;
      }
    } else {
      const user = await db.user.findUnique({
        where: { email: session.email },
      });
      if (user) userName = user.nama;
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

    // Send email notification to other party
    if (project) {
      const previewText = typeof teks === "string" ? teks.trim() : "";
      if (project.clientEmail === session.email) {
        notifyCommentAdded(project.vendorEmail, project.judul, userName, previewText).catch((e) =>
          console.error("Notifikasi komentar:", e)
        );
      } else if (project.vendorEmail === session.email) {
        notifyCommentAdded(project.clientEmail, project.judul, userName, previewText).catch((e) =>
          console.error("Notifikasi komentar:", e)
        );
      } else {
        notifyCommentAdded(project.clientEmail, project.judul, userName, previewText).catch((e) =>
          console.error("Notifikasi komentar:", e)
        );
        notifyCommentAdded(project.vendorEmail, project.judul, userName, previewText).catch((e) =>
          console.error("Notifikasi komentar:", e)
        );
      }
    }

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
