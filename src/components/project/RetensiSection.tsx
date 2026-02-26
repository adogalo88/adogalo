"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
import { GlassCard } from "@/components/ui/glass-card";
import {
  Clock,
  Percent,
  Calendar,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wallet,
  Timer,
} from "lucide-react";
import ImageUploader from "./ImageUploader";
import { toast } from "@/hooks/use-toast";

interface RetensiSectionProps {
  projectId: string;
  retensi: {
    id: string;
    status: string;
    percent: number;
    days: number;
    value: number;
    startDate: string | null;
    endDate: string | null;
    remainingDays: number;
    logs: { tipe: string; catatan: string; tanggal: string }[];
  } | null;
  userRole: "client" | "vendor" | "admin" | "manager";
  onUpdate: () => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatCountdown(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600) % 24;
  const days = Math.floor(total / 86400);
  return { days, hours, minutes, seconds };
}

export default function RetensiSection({
  projectId,
  retensi,
  userRole,
  onUpdate,
}: RetensiSectionProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<string>("");
  const [percent, setPercent] = useState("");
  const [days, setDays] = useState("");
  const [catatan, setCatatan] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const filesRef = useRef<string[]>([]);
  const [displayRemainingMs, setDisplayRemainingMs] = useState<number | null>(null);
  const [pausedRemainingMs, setPausedRemainingMs] = useState<number | null>(null);

  const endTimeMs = useMemo(() => {
    if (!retensi || retensi.status !== "countdown") return null;
    if (retensi.endDate) return new Date(retensi.endDate).getTime();
    if (retensi.startDate != null && retensi.remainingDays != null) {
      const start = new Date(retensi.startDate).getTime();
      return start + retensi.remainingDays * MS_PER_DAY;
    }
    return null;
  }, [retensi?.status, retensi?.startDate, retensi?.remainingDays, retensi?.endDate]);

  useEffect(() => {
    if (retensi?.status !== "countdown" || endTimeMs == null) {
      setDisplayRemainingMs(null);
      return;
    }
    const tick = () => setDisplayRemainingMs(Math.max(0, endTimeMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [retensi?.status, endTimeMs]);

  const pausedEndTimeMs = useMemo(() => {
    if (!retensi || !retensi.endDate) return null;
    if (retensi.status !== "complaint_paused" && retensi.status !== "waiting_confirmation") return null;
    return new Date(retensi.endDate).getTime();
  }, [retensi?.status, retensi?.endDate]);

  useEffect(() => {
    if (pausedEndTimeMs == null) {
      setPausedRemainingMs(null);
      return;
    }
    const tick = () => setPausedRemainingMs(Math.max(0, pausedEndTimeMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pausedEndTimeMs]);

  const handleAction = async (action: string) => {
    setLoading(true);
    const filesToSend = filesRef.current?.length ? filesRef.current : files;

    try {
      const body: Record<string, unknown> = { projectId, action };

      if (action === "propose") {
        body.percent = parseFloat(percent);
        body.days = parseInt(days);
      }
      if (action === "complain" || action === "fix") {
        body.catatan = catatan;
        body.files = filesToSend;
      }

      const response = await fetch("/api/retensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Berhasil",
          description: data.message,
          variant: "success",
        });
        setShowModal(false);
        setPercent("");
        setDays("");
        setCatatan("");
        setFiles([]);
        filesRef.current = [];
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

  const openModal = (type: string) => {
    setModalType(type);
    setShowModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statusColors: Record<string, string> = {
    none: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    proposed: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    agreed: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    countdown: "bg-green-500/20 text-green-500 border-green-500/30",
    pending_release: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    complaint_paused: "bg-red-500/20 text-red-500 border-red-500/30",
    waiting_confirmation: "bg-purple-500/20 text-purple-500 border-purple-500/30",
    paid: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
  };

  const statusLabels: Record<string, string> = {
    none: "Tidak Ada",
    proposed: "Diajukan",
    agreed: "Disetujui",
    countdown: "Dalam Masa Retensi",
    pending_release: "Masa Retensi Selesai",
    complaint_paused: "Komplain",
    waiting_confirmation: "Menunggu Konfirmasi",
    paid: "Sudah Dibayar",
  };

  const renderActions = () => {
    if (!retensi) return null;

    switch (retensi.status) {
      case "none":
        if (userRole === "vendor") {
          return (
            <Button onClick={() => openModal("propose")} className="glass-button">
              <Percent className="w-4 h-4" />
              Ajukan Retensi
            </Button>
          );
        }
        return null;

      case "proposed":
        if (userRole === "client") {
          return (
            <div className="flex gap-2">
              <Button
                onClick={() => handleAction("approve")}
                disabled={loading}
                className="glass-button"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Setujui
              </Button>
              <Button
                onClick={() => handleAction("reject")}
                disabled={loading}
                variant="outline"
                className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500"
              >
                <XCircle className="w-4 h-4" />
                Tolak
              </Button>
            </div>
          );
        }
        return (
          <p className="text-sm text-slate-400">Menunggu persetujuan client</p>
        );

      case "countdown":
        if (userRole === "client") {
          return (
            <Button
              onClick={() => openModal("complain")}
              variant="outline"
              className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500"
            >
              <AlertTriangle className="w-4 h-4" />
              Ajukan Komplain
            </Button>
          );
        }
        if (userRole === "admin") {
          return (
            <Button
              onClick={() => handleAction("release")}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              Cairkan Retensi
            </Button>
          );
        }
        return null;

      case "pending_release":
        if (userRole === "admin") {
          return (
            <Button
              onClick={() => handleAction("release")}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              Konfirmasi Pembayaran Retensi
            </Button>
          );
        }
        return (
          <p className="text-sm text-slate-400">Menunggu admin mencairkan dana retensi ke vendor</p>
        );

      case "complaint_paused":
        if (userRole === "vendor") {
          return (
            <Button onClick={() => openModal("fix")} className="glass-button">
              Upload Perbaikan
            </Button>
          );
        }
        return (
          <p className="text-sm text-slate-400">Menunggu perbaikan dari vendor</p>
        );

      case "waiting_confirmation":
        if (userRole === "client") {
          return (
            <Button
              onClick={() => handleAction("confirm_fix")}
              disabled={loading}
              className="glass-button"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Konfirmasi Perbaikan
            </Button>
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <>
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Retensi</h3>
              <Badge className={statusColors[retensi?.status || "none"]}>
                {statusLabels[retensi?.status || "none"]}
              </Badge>
            </div>
          </div>

          {retensi && retensi.status !== "none" && (
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="text-center">
                <p className="text-slate-400">Persentase</p>
                <p className="text-white font-medium">{retensi.percent}%</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400">Durasi</p>
                <p className="text-white font-medium">{retensi.days} hari</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400">Nilai</p>
                <p className="text-white font-medium">{formatCurrency(retensi.value)}</p>
              </div>
            </div>
          )}

          <div>{renderActions()}</div>
        </div>

        {/* Countdown: berjalan dari startDate + remainingDays sehingga tetap benar setelah refresh */}
        {retensi && retensi.status === "countdown" && displayRemainingMs !== null && (
          <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" />
              Sisa masa retensi
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              {(() => {
                const { days: d, hours: h, minutes: m, seconds: s } = formatCountdown(displayRemainingMs);
                return (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tabular-nums text-white">{d}</span>
                      <span className="text-sm text-slate-400">hari</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tabular-nums text-white">{h}</span>
                      <span className="text-sm text-slate-400">jam</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tabular-nums text-white">{m}</span>
                      <span className="text-sm text-slate-400">menit</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tabular-nums text-white">{s}</span>
                      <span className="text-sm text-slate-400">detik</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {retensi && (retensi.status === "complaint_paused" || retensi.status === "waiting_confirmation") && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-slate-400 mb-2">Countdown di-pause</p>
            {pausedRemainingMs != null && retensi.endDate ? (
              <div className="flex flex-wrap gap-4 items-center">
                {(() => {
                  const { days: d, hours: h, minutes: m, seconds: s } = formatCountdown(pausedRemainingMs);
                  return (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold tabular-nums text-white">{d}</span>
                        <span className="text-sm text-slate-400">hari</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold tabular-nums text-white">{h}</span>
                        <span className="text-sm text-slate-400">jam</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold tabular-nums text-white">{m}</span>
                        <span className="text-sm text-slate-400">menit</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold tabular-nums text-white">{s}</span>
                        <span className="text-sm text-slate-400">detik</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              retensi.remainingDays != null && (
                <p className="text-lg font-semibold text-white">
                  Sisa <span className="text-amber-400">{retensi.remainingDays}</span> hari setelah dilanjutkan
                </p>
              )
            )}
          </div>
        )}

        {retensi && retensi.status === "pending_release" && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-400/90">
              Masa retensi selesai. Dana akan dicairkan ke vendor setelah admin mengkonfirmasi pembayaran; setelah itu proyek ditandai selesai.
            </p>
          </div>
        )}
      </GlassCard>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="glass-modal max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {modalType === "propose" && "Ajukan Retensi"}
              {modalType === "complain" && "Ajukan Komplain Retensi"}
              {modalType === "fix" && "Upload Perbaikan"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {modalType === "propose" && "Tentukan persentase dan durasi retensi"}
              {modalType === "complain" && "Jelaskan masalah dan upload bukti"}
              {modalType === "fix" && "Upload bukti perbaikan yang telah dilakukan"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {modalType === "propose" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Persentase (%)</Label>
                    <Input
                      type="number"
                      value={percent}
                      onChange={(e) => setPercent(e.target.value)}
                      placeholder="Contoh: 5"
                      className="glass-input text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Durasi (hari)</Label>
                    <Input
                      type="number"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      placeholder="Contoh: 30"
                      className="glass-input text-white"
                    />
                  </div>
                </div>
              </>
            )}

            {(modalType === "complain" || modalType === "fix") && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-300">Catatan</Label>
                  <Textarea
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Jelaskan masalah atau perbaikan..."
                    className="glass-input text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Upload Gambar</Label>
                  <ImageUploader onUpload={(urls) => { filesRef.current = urls; setFiles(urls); }} maxFiles={5} />
                </div>
              </>
            )}

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
                onClick={() => handleAction(modalType)}
                disabled={loading}
                className="flex-1 glass-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Kirim"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
