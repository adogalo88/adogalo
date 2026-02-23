"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MilestoneManagerProps {
  projectId: string;
  projectBudget: number;
  existingMilestones: { id: string; persentase: number }[];
  userRole: "client" | "vendor" | "admin" | "manager";
  onUpdate: () => void;
}

export default function MilestoneManager({
  projectId,
  projectBudget,
  existingMilestones,
  userRole,
  onUpdate,
}: MilestoneManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [persentase, setPersentase] = useState("");
  const [nominal, setNominal] = useState(0);

  // Calculate total existing percentage
  const totalExistingPersentase = existingMilestones.reduce(
    (sum, m) => sum + (m.persentase || 0),
    0
  );
  const remainingPersentase = 100 - totalExistingPersentase;

  // Auto-calculate nominal when percentage changes
  useEffect(() => {
    const persenValue = parseFloat(persentase) || 0;
    const calculatedNominal = (persenValue / 100) * projectBudget;
    setNominal(Math.round(calculatedNominal));
  }, [persentase, projectBudget]);

  // Only admin can manage milestones
  if (userRole !== "admin") {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreate = async () => {
    if (!judul) {
      toast({
        title: "Error",
        description: "Nama pekerjaan harus diisi",
        variant: "destructive",
      });
      return;
    }

    const persenValue = parseFloat(persentase) || 0;
    if (persenValue <= 0) {
      toast({
        title: "Error",
        description: "Persentase harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    if (persenValue > remainingPersentase) {
      toast({
        title: "Error",
        description: `Persentase melebihi sisa yang tersedia (${remainingPersentase}%)`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          judul,
          deskripsi,
          persentase: persenValue,
          harga: nominal,
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
        setDeskripsi("");
        setPersentase("");
        setNominal(0);
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

  return (
    <>
      <Button onClick={() => setShowModal(true)} className="glass-button">
        <Plus className="w-4 h-4" />
        Buat Progress/Pekerjaan
      </Button>

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="glass-modal max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Buat Progress/Pekerjaan Baru</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tambahkan item pekerjaan untuk proyek ini. Total persentase harus 100%.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Project Budget Info */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Anggaran Proyek:</span>
                <span className="text-white font-medium">
                  {formatCurrency(projectBudget)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-400">Total Persentase Terpakai:</span>
                <span className={totalExistingPersentase >= 100 ? "text-red-400" : "text-white"}>
                  {totalExistingPersentase.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-400">Sisa Persentase:</span>
                <span className={remainingPersentase <= 0 ? "text-red-400" : "text-green-400"}>
                  {remainingPersentase.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Judul / Nama Pekerjaan / Progress</Label>
              <Input
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Pengerjaan Pondasi"
                className="glass-input text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Detail / Deskripsi</Label>
              <Textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Informasikan sampai tahap mana progress akan dianggap selesai..."
                className="glass-input text-white"
                rows={3}
              />
              <p className="text-xs text-slate-500">Jelaskan kriteria penyelesaian pekerjaan ini</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Persentase / Bobot (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max={remainingPersentase}
                  value={persentase}
                  onChange={(e) => setPersentase(e.target.value)}
                  placeholder="Contoh: 25"
                  className="glass-input text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Nilai / Nominal (Rp)</Label>
                <div className="h-11 px-3 rounded-lg bg-white/5 border border-white/10 flex items-center">
                  <span className="text-white font-medium">
                    {formatCurrency(nominal)}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Auto: {persentase || "0"}% × {formatCurrency(projectBudget)}
                </p>
              </div>
            </div>

            {/* Validation messages */}
            <div className="space-y-2">
              {parseFloat(persentase) > remainingPersentase && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400">
                    Persentase melebihi sisa yang tersedia ({remainingPersentase.toFixed(1)}%)
                  </p>
                </div>
              )}
              
              {/* Warning if total is less than 100% */}
              {totalExistingPersentase > 0 && totalExistingPersentase < 100 && remainingPersentase > 0 && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-sm text-yellow-400">
                    <strong>Perhatian:</strong> Total persentase saat ini {totalExistingPersentase.toFixed(1)}%. 
                    Masih kurang {(100 - totalExistingPersentase).toFixed(1)}% untuk mencapai 100%.
                  </p>
                </div>
              )}
              
              {/* Success message if total will be exactly 100% */}
              {remainingPersentase > 0 && parseFloat(persentase) === remainingPersentase && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-sm text-green-400">
                    <strong>Sempurna!</strong> Total persentase akan mencapai 100% setelah pekerjaan ini dibuat.
                  </p>
                </div>
              )}
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
                disabled={loading || parseFloat(persentase) > remainingPersentase}
                className="flex-1 glass-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  "Buat Pekerjaan"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
