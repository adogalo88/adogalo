"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/glass-card";
import {
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import ImageUploader from "./ImageUploader";
import { toast } from "@/hooks/use-toast";

interface AdditionalWork {
  id: string;
  judul: string;
  amount: number;
  deskripsi: string | null;
  status: string;
  createdAt: string;
}

interface AdditionalWorkSectionProps {
  projectId: string;
  additionalWorks: AdditionalWork[];
  userRole: "client" | "vendor" | "admin" | "manager";
  onUpdate: () => void;
}

export default function AdditionalWorkSection({
  projectId,
  additionalWorks,
  userRole,
  onUpdate,
}: AdditionalWorkSectionProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [judul, setJudul] = useState("");
  const [amount, setAmount] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  const handleCreate = async () => {
    if (!judul || !amount) {
      toast({
        title: "Error",
        description: "Judul dan nilai harus diisi",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/additional-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action: "create",
          judul,
          amount: parseFloat(amount),
          deskripsi,
          files,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Berhasil",
          description: data.message,
          variant: "success",
        });
        setShowModal(false);
        setJudul("");
        setAmount("");
        setDeskripsi("");
        setFiles([]);
        onUpdate();
      } else {
        toast({
          title: "Error",
          description: data.message || "Terjadi kesalahan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (additionalWorkId: string) => {
    setLoading(true);

    try {
      const response = await fetch("/api/additional-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action: "approve",
          additionalWorkId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Berhasil",
          description: data.message,
          variant: "success",
        });
        onUpdate();
      } else {
        toast({
          title: "Error",
          description: data.message || "Terjadi kesalahan",
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

  const handleReject = async (additionalWorkId: string) => {
    if (!confirm("Tolak pekerjaan tambahan ini?")) return;

    setLoading(true);

    try {
      const response = await fetch("/api/additional-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action: "reject",
          additionalWorkId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Berhasil",
          description: data.message,
          variant: "success",
        });
        onUpdate();
      } else {
        toast({
          title: "Error",
          description: data.message || "Terjadi kesalahan",
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    approved: "bg-green-500/20 text-green-500 border-green-500/30",
    rejected: "bg-red-500/20 text-red-500 border-red-500/30",
  };

  const statusLabels: Record<string, string> = {
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Ditolak",
  };

  return (
    <>
      <GlassCard>
        <GlassCardHeader className="flex flex-row items-center justify-between">
          <GlassCardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-500" />
            Pekerjaan Tambahan
            {additionalWorks.length > 0 && (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                {additionalWorks.length}
              </Badge>
            )}
          </GlassCardTitle>
          <div className="flex gap-2">
            {userRole === "vendor" && (
              <Button onClick={() => setShowModal(true)} size="sm" className="glass-button">
                <Plus className="w-4 h-4" />
                Ajukan
              </Button>
            )}
            {additionalWorks.length > 0 && (
              <Button
                onClick={() => setExpanded(!expanded)}
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5"
              >
                {expanded ? "Sembunyikan" : "Lihat Semua"}
              </Button>
            )}
          </div>
        </GlassCardHeader>

        {expanded && (
          <GlassCardContent className="animate-fade-in">
            {additionalWorks.length === 0 ? (
              <p className="text-slate-500 text-center py-4">
                Belum ada pekerjaan tambahan
              </p>
            ) : (
              <div className="space-y-3">
                {additionalWorks.map((work) => (
                  <div
                    key={work.id}
                    className="p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-white font-medium">{work.judul}</h4>
                        {work.deskripsi && (
                          <p className="text-sm text-slate-400 mt-1">{work.deskripsi}</p>
                        )}
                        <p className="text-[#FF9013] font-medium mt-2">
                          {formatCurrency(work.amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[work.status]}>
                          {statusLabels[work.status]}
                        </Badge>
                        {work.status === "pending" && (userRole === "client" || userRole === "admin") && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApprove(work.id)}
                              disabled={loading}
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleReject(work.id)}
                              disabled={loading}
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCardContent>
        )}
      </GlassCard>

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="glass-modal max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Ajukan Pekerjaan Tambahan</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tambahkan detail pekerjaan tambahan yang akan dikerjakan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Judul Pekerjaan</Label>
              <Input
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Penambahan kanopi"
                className="glass-input text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Nilai (Rp)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 5000000"
                className="glass-input text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Deskripsi</Label>
              <Textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Jelaskan detail pekerjaan..."
                className="glass-input text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Upload Gambar (opsional)</Label>
              <ImageUploader onUpload={setFiles} maxFiles={5} />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 glass-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  "Kirim Pengajuan"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
