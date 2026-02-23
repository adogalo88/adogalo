"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, FileText, Loader2, FileIcon } from "lucide-react";

interface FileUploaderProps {
  onUpload: (urls: string[]) => void;
  maxFiles?: number;
  acceptTypes?: "images" | "documents" | "all";
}

export default function FileUploader({
  onUpload,
  maxFiles = 5,
  acceptTypes = "all",
}: FileUploaderProps) {
  const [previews, setPreviews] = useState<{ url: string; type: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptString = () => {
    switch (acceptTypes) {
      case "images":
        return "image/*";
      case "documents":
        return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";
      case "all":
        return "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";
      default:
        return "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";
    }
  };

  const getFileIcon = (type: string, url: string) => {
    if (type.startsWith("image/")) {
      return (
        <img
          src={url}
          alt="Preview"
          className="w-full h-full object-cover rounded-lg"
        />
      );
    }
    // Document icon based on type
    const iconClass = "w-8 h-8";
    if (type === "application/pdf") {
      return <FileText className={`${iconClass} text-red-400`} />;
    }
    if (type.includes("spreadsheet") || type.includes("excel")) {
      return <FileIcon className={`${iconClass} text-green-400`} />;
    }
    if (type.includes("document") || type.includes("word")) {
      return <FileText className={`${iconClass} text-blue-400`} />;
    }
    return <FileIcon className={`${iconClass} text-slate-400`} />;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check max files
    if (previews.length + files.length > maxFiles) {
      alert(`Maksimal ${maxFiles} file`);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      const validFiles: File[] = [];

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

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Validate file type
        if (allowedTypes.includes(file.type)) {
          validFiles.push(file);
          formData.append("files", file);
        }
      }

      if (validFiles.length === 0) {
        alert("Tidak ada file valid. Format yang didukung: JPG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV");
        return;
      }

      // Upload files
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.urls) {
        const newPreviews = validFiles.map((file, index) => ({
          url: data.urls[index],
          type: file.type,
          name: file.name,
        }));
        const allPreviews = [...previews, ...newPreviews];
        setPreviews(allPreviews);
        onUpload(allPreviews.map((p) => p.url));
      } else {
        alert(data.message || "Gagal upload file");
      }
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Terjadi kesalahan saat upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeFile = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onUpload(newPreviews.map((p) => p.url));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {previews.map((preview, index) => (
          <div
            key={index}
            className="relative group w-20 h-20 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden"
          >
            {getFileIcon(preview.type, preview.url)}
            <button
              type="button"
              onClick={() => removeFile(index)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
            {/* File name tooltip */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-white p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
              {preview.name}
            </div>
          </div>
        ))}

        {/* Add button */}
        {previews.length < maxFiles && (
          <label className="w-20 h-20 rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF9013]/50 transition-colors">
            {uploading ? (
              <Loader2 className="w-5 h-5 text-[#FF9013] animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-400 mt-1">Upload</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={getAcceptString()}
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Maksimal {maxFiles} file. Format: JPG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV. Maks 10MB per file.
      </p>
    </div>
  );
}
