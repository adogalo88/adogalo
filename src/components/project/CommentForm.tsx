"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Paperclip } from "lucide-react";
import FileUploader from "./FileUploader";
import { toast } from "@/hooks/use-toast";

interface CommentFormProps {
  logId: string;
  onCommentAdded: () => void;
}

export default function CommentForm({
  logId,
  onCommentAdded,
}: CommentFormProps) {
  const [teks, setTeks] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teks.trim() && files.length === 0) return;

    setLoading(true);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, teks, files }),
      });

      const data = await response.json();

      if (data.success) {
        setTeks("");
        setFiles([]);
        setShowUploader(false);
        onCommentAdded();
      } else {
        toast({
          title: "Error",
          description: data.message || "Gagal menambahkan komentar",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Textarea
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder="Tulis komentar atau pertanyaan..."
            className="min-h-[60px] glass-input text-white placeholder:text-slate-500 resize-none"
            rows={2}
          />
        </div>

        {/* File attachment button */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowUploader(!showUploader)}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
          >
            <Paperclip className="w-4 h-4" />
            {files.length > 0 ? `(${files.length} file)` : "Lampiran"}
          </Button>

          <div className="flex-1"></div>

          <Button
            type="submit"
            disabled={loading || (!teks.trim() && files.length === 0)}
            size="sm"
            className="glass-button px-4"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" />
                Kirim
              </>
            )}
          </Button>
        </div>

        {/* File uploader */}
        {showUploader && (
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 animate-fade-in">
            <FileUploader
              onUpload={(urls) => setFiles(urls)}
              maxFiles={3}
              acceptTypes="all"
            />
          </div>
        )}
      </div>
    </form>
  );
}
