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
  MinusCircle,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ImageUploader from "./ImageUploader";
import { toast } from "@/hooks/use-toast";

interface ChangeRequest {
  id: string;
  milestoneId: string | null;
  amount: number;
  alasan: string | null;
  status: string;
  createdAt: string;
  milestone?: { id: string; judul: string } | null;
}

interface Milestone {
  id: string;
  judul: string;
  price: number;
  status: string;
}

interface ReductionSectionProps {
  projectId: string;
  milestones: Milestone[];
  changeRequests: ChangeRequest[];
  userRole: "client" | "vendor" | "admin" | "manager";
  onUpdate: () => void;
}

export default function ReductionSection({
  projectId,
  milestones,
  changeRequests,
  userRole,
  onUpdate,
}: ReductionSectionProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState("");
  const [amount, setAmount] = useState("");
  const [alasan, setAlasan] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  const handleCreate = async () => {
    if (!selectedMilestone || !amount) {
      toast({
        title: "Error",
        description: "Milestone dan nilai harus diisi",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/reduction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action: "create",
          milestoneId: selectedMilestone,
          amount: parseFloat(amount),
          alasan,
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
        setSelectedMilestone("");
        setAmount("");
        setAlasan("");
        setFiles([]);
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

  const handleAction = async (action: string, changeRequestId: string) => {
    setLoading(true);

    try {
      const response = await fetch("/api/reduction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action,
          changeRequestId,
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
    pending_admin: "bg-purple-500/20 text-purple-500 border-purple-500/30",
    approved: "bg-green-500/20 text-green-500 border-green-500/30",
    rejected: "bg-red-500/20 text-red-500 border-red-500/30",
  };

  const statusLabels: Record<string, string> = {
    pending: "Menunggu Client",
    pending_admin: "Menunggu Admin",
    approved: "Disetujui",
    rejected: "Ditolak",
  };

  // Only show milestones that can have reduction (not completed)
  const eligibleMilestones = milestones.filter(
    (m) => m.status !== "completed"
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MinusCircle className="w-5 h-5 text-orange-500" />
          <h3 className="text-white font-semibold">Pengurangan Nilai</h3>
          {changeRequests.length > 0 && (
            <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">
              {changeRequests.length}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {userRole === "vendor" && eligibleMilestones.length > 0 && (
            <Button onClick={() => setShowModal(true)} size="sm" variant="outline" className="border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500">
              <MinusCircle className="w-4 h-4" />
              Ajukan
            </Button>
          )}
          {changeRequests.length > 0 && (
            <Button
              onClick={() => setExpanded(!expanded)}
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      {expanded && (
        <div className="space-y-2 animate-fade-in">
          {changeRequests.length === 0 ? (
            <p className="text-slate-500 text-sm">Belum ada pengajuan pengurangan</p>
          ) : (
            changeRequests.map((request) => (
              <div
                key={request.id}
                className="p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-medium">
                      {request.milestone?.judul || "Milestone"}
                    </p>
                    <p className="text-red-400 font-medium">
                      -{formatCurrency(request.amount)}
                    </p>
                    {request.alasan && (
                      <p className="text-sm text-slate-400 mt-1">{request.alasan}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[request.status]}>
                      {statusLabels[request.status]}
                    </Badge>

                    {request.status === "pending" && userRole === "client" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAction("approve_client", request.id)}
                          disabled={loading}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleAction("reject_client", request.id)}
                          disabled={loading}
                          size="sm"
                          variant="outline"
                          className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {request.status === "pending_admin" && userRole === "admin" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAction("approve_admin", request.id)}
                          disabled={loading}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleAction("reject_admin", request.id)}
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
            ))
          )}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="glass-modal max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Ajukan Pengurangan Nilai</DialogTitle>
            <DialogDescription className="text-slate-400">
              Ajukan pengurangan nilai untuk milestone tertentu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Pilih Milestone</Label>
              <select
                value={selectedMilestone}
                onChange={(e) => setSelectedMilestone(e.target.value)}
                className="w-full h-11 px-3 rounded-lg glass-input text-white bg-transparent"
              >
                <option value="" className="bg-slate-800">
                  Pilih milestone...
                </option>
                {eligibleMilestones.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-800">
                    {m.judul} ({formatCurrency(m.price)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Nilai Pengurangan (Rp)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 500000"
                className="glass-input text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Alasan</Label>
              <Textarea
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Jelaskan alasan pengurangan..."
                className="glass-input text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Upload Bukti (opsional)</Label>
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
    </div>
  );
}
