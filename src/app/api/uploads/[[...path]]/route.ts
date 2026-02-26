import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// Sama dengan upload/route: pakai volume path di Railway agar file persisten bisa disajikan
const UPLOAD_BASE =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  process.env.UPLOAD_DIR ||
  "";
const USE_VOLUME = UPLOAD_BASE.length > 0;
const UPLOAD_DIR_PATH = USE_VOLUME
  ? path.join(UPLOAD_BASE, "uploads")
  : path.join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filename = pathSegments?.join("/") || "";
    if (!filename || filename.includes("..")) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const safeName = path.basename(filename);
    if (safeName !== filename && pathSegments?.length !== 1) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const filepath = path.join(UPLOAD_DIR_PATH, filename);
    const resolved = path.resolve(filepath);
    const dirResolved = path.resolve(UPLOAD_DIR_PATH);
    if (!resolved.startsWith(dirResolved)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const buffer = await readFile(filepath);
    const ext = path.extname(safeName).slice(1).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return new NextResponse(null, { status: 404 });
    console.error("Error serving upload:", err);
    return NextResponse.json(
      { error: "Error serving file" },
      { status: 500 }
    );
  }
}
