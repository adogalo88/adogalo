import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Di Railway: set volume mount path ke /app/data → simpan ke /app/data/uploads (persisten)
// Lokal: simpan ke public/uploads, disajikan sebagai /uploads/...
const UPLOAD_BASE =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  process.env.UPLOAD_DIR ||
  "";
const USE_VOLUME = UPLOAD_BASE.length > 0;
const UPLOAD_DIR_PATH = USE_VOLUME
  ? path.join(UPLOAD_BASE, "uploads")
  : path.join(process.cwd(), "public", "uploads");

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

    const uploadDir = UPLOAD_DIR_PATH;
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];
    const urlPrefix = USE_VOLUME ? "/api/uploads" : "/uploads";

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

      uploadedUrls.push(`${urlPrefix}/${filename}`);
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

    // #region agent log
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.RAILWAY_STATIC_URL || 'http://localhost:3000';
    fetch('http://127.0.0.1:7340/ingest/04a68b75-b7f8-4446-87ad-e5e7b7018684',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'32405d'},body:JSON.stringify({sessionId:'32405d',location:'upload/route.ts:POST',message:'upload success',data:{uploadedUrls,uploadDir,cwd:process.cwd(),baseUrl},timestamp:Date.now(),hypothesisId:'H6'})}).catch(()=>{});
    // #endregion
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
