"use client";

import { useState } from "react";
import { FileText, Download, ExternalLink } from "lucide-react";
import Lightbox from "./Lightbox";

interface FileAttachmentsProps {
  files: string[];
  maxThumbnails?: number;
}

// Get file type from URL
const getFileType = (url: string): "image" | "pdf" | "document" | "other" => {
  const extension = url.split(".").pop()?.toLowerCase() || "";

  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
  const pdfExtensions = ["pdf"];
  const docExtensions = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"];

  if (imageExtensions.includes(extension)) return "image";
  if (pdfExtensions.includes(extension)) return "pdf";
  if (docExtensions.includes(extension)) return "document";
  return "other";
};

// Get file name from URL
const getFileName = (url: string): string => {
  const parts = url.split("/");
  const filename = parts[parts.length - 1] || "File";
  // Remove timestamp prefix for cleaner display
  const cleanName = filename.replace(/^\d+-[a-z0-9]+-/i, "");
  return cleanName;
};

export default function FileAttachments({
  files,
  maxThumbnails = 4,
}: FileAttachmentsProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!files || files.length === 0) return null;

  // Separate images and documents
  const images = files.filter((f) => getFileType(f) === "image");
  const documents = files.filter((f) => getFileType(f) !== "image");

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const displayImages = images.slice(0, maxThumbnails);
  const remainingCount = images.length - maxThumbnails;

  return (
    <div className="space-y-2">
      {/* Images */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {displayImages.map((image, index) => (
            <div
              key={index}
              className="relative cursor-pointer group"
              onClick={() => openLightbox(index)}
            >
              <img
                src={image}
                alt={`Image ${index + 1}`}
                className="w-16 h-16 object-cover rounded-lg border border-white/10 transition-transform group-hover:scale-105"
              />
              {index === maxThumbnails - 1 && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-medium">+{remainingCount}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {documents.map((doc, index) => {
            const fileType = getFileType(doc);
            const fileName = getFileName(doc);
            const iconColor =
              fileType === "pdf"
                ? "text-red-400"
                : fileType === "document"
                ? "text-blue-400"
                : "text-slate-400";

            return (
              <a
                key={index}
                href={doc}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
              >
                <FileText className={`w-4 h-4 ${iconColor}`} />
                <span className="text-xs text-slate-300 group-hover:text-white truncate max-w-[120px]">
                  {fileName}
                </span>
                <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
              </a>
            );
          })}
        </div>
      )}

      {/* Lightbox for images */}
      {lightboxOpen && images.length > 0 && (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
