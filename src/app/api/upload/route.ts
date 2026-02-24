import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// POST - Upload file (images and documents)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada file yang diupload" },
        { status: 400 }
      );
    }

    // Create uploads directory if not exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];

    // Allowed types
    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const allowedDocTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
    ];
    const allowedTypes = [...allowedImageTypes, ...allowedDocTypes];

    for (const file of files) {
      if (!file || file.size === 0) continue;

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        continue; // Skip invalid files
      }

      // Validate file size (max 10MB for documents, 5MB for images)
      const maxSize = allowedImageTypes.includes(file.type) ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        continue; // Skip large files
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split(".").pop() || "bin";
      const filename = `${timestamp}-${randomStr}.${ext}`;
      const filepath = path.join(uploadDir, filename);

      // Write file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      // Add URL to list
      uploadedUrls.push(`/uploads/${filename}`);
    }

    // Pastikan ada minimal satu file yang berhasil disimpan
    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada file yang valid atau ukuran file terlalu besar",
          urls: [],
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File berhasil diupload",
      urls: uploadedUrls,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat upload" },
      { status: 500 }
    );
  }
}
