"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";

interface ImageUploaderProps {
  onUpload: (urls: string[]) => void;
  maxFiles?: number;
}

export default function ImageUploader({
  onUpload,
  maxFiles = 5,
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check max files
    if (previews.length + files.length > maxFiles) {
      alert(`Maksimal ${maxFiles} gambar`);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      const validFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Validate file type
        if (file.type.startsWith("image/")) {
          validFiles.push(file);
          formData.append("files", file);
        }
      }

      if (validFiles.length === 0) {
        alert("Tidak ada file gambar valid");
        return;
      }

      // Upload files
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.urls) {
        setPreviews((prev) => [...prev, ...data.urls]);
        onUpload([...previews, ...data.urls]);
      } else {
        alert(data.message || "Gagal upload gambar");
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

  const removeImage = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onUpload(newPreviews);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {previews.map((preview, index) => (
          <div key={index} className="relative group">
            <img
              src={preview}
              alt={`Preview ${index + 1}`}
              className="w-20 h-20 object-cover rounded-lg border border-white/10"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
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
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Maksimal {maxFiles} gambar. Format: JPG, PNG, GIF. Maks 5MB per gambar.
      </p>
    </div>
  );
}
