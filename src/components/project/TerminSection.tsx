"use client";

import { useState } from "react";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronUp,
  Wallet,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Settings,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, CLIENT_FEE_PERCENT } from "@/lib/financial";

interface Termin {
  id: string;
  judul: string;
  baseAmount: number;
  type: string;
  feeClientAmount: number;
  totalWithFee: number;
  status: string;
}

interface TerminSectionProps {
  projectId: string;
  termins: Termin[];
  userRole: "client" | "vendor" | "admin" | "manager";
  clientFunds?: number;
  projectBudget?: number;
  onUpdate: () => void;
}

const terminStatusColors: Record<string, string> = {
  unpaid: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  pending_confirmation: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  paid: "bg-green-500/20 text-green-500 border-green-500/30",
  refunded: "bg-blue-500/20 text-blue-500 border-blue-500/30",
};

const terminStatusLabels: Record<string, string> = {
  unpaid: "Belum Dibayar",
  pending_confirmation: "Menunggu Konfirmasi",
  paid: "Sudah Dibayar",
  refunded: "Dikembalikan",
};

const terminStatusIcons: Record<string, React.ReactNode> = {
  unpaid: <AlertCircle className="w-3 h-3" />,
  pending_confirmation: <Clock className="w-3 h-3" />,
  paid: <CheckCircle className="w-3 h-3" />,
  refunded: <Clock className="w-3 h-3" />,
};

export default function TerminSection({
  projectId,
  termins,
  userRole,
  clientFunds = 0,
  projectBudget = 0,
  onUpdate,
}: TerminSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTermins, setEditTermins] = useState<Array<{ judul: string; baseAmount: number }>>([]);
  const [saveLoading, setSaveLoading] = useState(false);

  const handleTerminAction = async (terminId: string, action: string) => {
    setLoading(terminId + action);
    try {
      const response = await fetch("/api/termins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terminId, action }),
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
          title: "Gagal",
          description: data.message,
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
      setLoading(null);
    }
  };

  // Calculate totals - role based
  // For vendor: use baseAmount sum, for others: use totalWithFee sum
  const totalTerminBase = termins
    .filter((t) => t.type !== "reduction")
    .reduce((sum, t) => sum + t.baseAmount, 0);
  const totalTerminValue = termins
    .filter((t) => t.type !== "reduction")
    .reduce((sum, t) => sum + t.totalWithFee, 0);
  const paidTerminValue = termins
    .filter((t) => t.status === "paid" && t.type !== "reduction")
    .reduce((sum, t) => sum + t.totalWithFee, 0);
  const unpaidCount = termins.filter((t) => t.status === "unpaid").length;

  // Show different stats based on role
  const displayTotalTermin = userRole === "vendor" ? totalTerminBase : totalTerminValue;
  const headerValue =
    userRole === "client"
      ? formatCurrency(displayTotalTermin)
      : userRole === "vendor"
      ? formatCurrency(clientFunds)
      : formatCurrency(clientFunds);

  const headerLabel =
    userRole === "client"
      ? "Total Termin"
      : userRole === "vendor"
      ? "Dana Terkumpul"
      : "Saldo Client";

  // Admin edit functions
  const openEditModal = () => {
    // Get unpaid termins only for editing
    const unpaidTermins = termins.filter(t => t.status === "unpaid" && t.type === "main");
    setEditTermins(
      unpaidTermins.length > 0
        ? unpaidTermins.map(t => ({ judul: t.judul, baseAmount: t.baseAmount }))
        : [{ judul: "Termin 1", baseAmount: projectBudget }]
    );
    setShowEditModal(true);
  };

  const addEditTermin = () => {
    setEditTermins([
      ...editTermins,
      { judul: `Termin ${editTermins.length + 1}`, baseAmount: 0 },
    ]);
  };

  const removeEditTermin = (index: number) => {
    if (editTermins.length > 1) {
      setEditTermins(editTermins.filter((_, i) => i !== index));
    }
  };

  const updateEditTermin = (index: number, field: "judul" | "baseAmount", value: string | number) => {
    setEditTermins(
      editTermins.map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      )
    );
  };

  const saveEditTermins = async () => {
    setSaveLoading(true);
    try {
      const response = await fetch("/api/termins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, termins: editTermins }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Berhasil",
          description: data.message,
          variant: "success",
        });
        setShowEditModal(false);
        onUpdate();
      } else {
        toast({
          title: "Gagal",
          description: data.message,
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
      setSaveLoading(false);
    }
  };

  const totalEditAmount = editTermins.reduce((sum, t) => sum + t.baseAmount, 0);

  return (
    <GlassCard>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2"
      >
        <GlassCardTitle className="text-lg flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#FF9013]" />
          Termin Pembayaran
          <Badge className="bg-[#FF9013]/20 text-[#FF9013] border-[#FF9013]/30">
            {termins.length}
          </Badge>
        </GlassCardTitle>
        <div className="flex items-center gap-3">
          {/* Admin edit button */}
          {userRole === "admin" && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal();
              }}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{headerValue}</p>
            <p className="text-xs text-slate-400">{headerLabel}</p>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <GlassCardContent className="pt-4 animate-fade-in">
          {/* Summary for mobile */}
          <div className="sm:hidden mb-4 p-3 rounded-lg bg-white/5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{headerLabel}</span>
              <span className="text-white font-medium">{headerValue}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4 p-3 rounded-lg bg-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Progress Pembayaran</span>
              <span className="text-sm text-white font-medium">
                {displayTotalTermin > 0
                  ? Math.round((paidTerminValue / displayTotalTermin) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF9013] to-[#FFB366] rounded-full transition-all duration-500"
                style={{
                  width: `${
                    displayTotalTermin > 0
                      ? Math.round((paidTerminValue / displayTotalTermin) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {formatCurrency(paidTerminValue)} dari {formatCurrency(displayTotalTermin)}
            </p>
          </div>

          {termins.length === 0 ? (
            <p className="text-slate-500 text-center py-4">
              Belum ada termin pembayaran
            </p>
          ) : (
            <div className="space-y-2">
              {termins.map((termin, index) => {
                // Role-based display: Vendor sees baseAmount, others see totalWithFee
                const displayAmount = userRole === "vendor" 
                  ? termin.baseAmount 
                  : termin.totalWithFee;
                const showFee = userRole !== "vendor" && termin.feeClientAmount > 0;
                
                return (
                  <div
                    key={termin.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white/5 gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm text-white">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-white font-medium">{termin.judul}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-slate-400">
                            {termin.type === "main"
                              ? "Termin Utama"
                              : termin.type === "additional"
                              ? "Pekerjaan Tambahan"
                              : "Pengurangan"}
                          </p>
                          {/* Fee info - only for non-vendor */}
                          {showFee && (
                            <>
                              <span className="text-xs text-slate-500">•</span>
                              <p className="text-xs text-[#FF9013]">
                                +{formatCurrency(termin.feeClientAmount)} (Biaya Admin {CLIENT_FEE_PERCENT}%)
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <p
                          className={`font-medium ${
                            termin.type === "reduction"
                              ? "text-red-400"
                              : "text-white"
                          }`}
                        >
                          {termin.type === "reduction" ? "-" : ""}
                          {formatCurrency(displayAmount)}
                        </p>
                        <Badge className={terminStatusColors[termin.status]}>
                          <span className="flex items-center gap-1">
                            {terminStatusIcons[termin.status]}
                            {terminStatusLabels[termin.status]}
                          </span>
                        </Badge>
                      </div>

                      {/* Action buttons */}
                      {termin.status === "unpaid" && userRole === "client" && (
                        <Button
                          size="sm"
                          onClick={() => handleTerminAction(termin.id, "request_payment")}
                          disabled={loading === termin.id + "request_payment"}
                          className="bg-[#FF9013] hover:bg-[#E08000]"
                        >
                          {loading === termin.id + "request_payment" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Bayar"
                          )}
                        </Button>
                      )}

                      {termin.status === "pending_confirmation" && userRole === "client" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTerminAction(termin.id, "cancel_request")}
                          disabled={loading === termin.id + "cancel_request"}
                          className="border-slate-500 text-slate-400"
                        >
                          {loading === termin.id + "cancel_request" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Batal"
                          )}
                        </Button>
                      )}

                      {termin.status === "pending_confirmation" && (userRole === "admin" || userRole === "manager") && (
                        <Button
                          size="sm"
                          onClick={() => handleTerminAction(termin.id, "confirm_payment")}
                          disabled={loading === termin.id + "confirm_payment"}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {loading === termin.id + "confirm_payment" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Konfirmasi"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info message for client */}
          {userRole === "client" && unpaidCount > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-yellow-400">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Anda memiliki {unpaidCount} termin yang belum dibayar. Silakan lakukan
                pembayaran untuk memudahkan proses proyek.
              </p>
            </div>
          )}
        </GlassCardContent>
      )}

      {/* Admin Edit Termin Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="glass-modal max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Kustomisasi Termin Pembayaran</DialogTitle>
            <DialogDescription className="text-slate-400">
              Ubah jumlah dan jumlah termin pembayaran client. Hanya termin yang belum dibayar yang dapat diubah.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Project budget info */}
            {projectBudget > 0 && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Anggaran Proyek:</span>
                  <span className="text-white font-medium">{formatCurrency(projectBudget)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-slate-400">+{CLIENT_FEE_PERCENT}% Biaya Admin:</span>
                  <span className="text-[#FF9013]">{formatCurrency(projectBudget * 0.01)}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                  <span className="text-sm text-slate-400">Total:</span>
                  <span className="text-white font-semibold">{formatCurrency(projectBudget * 1.01)}</span>
                </div>
              </div>
            )}

            {/* Termin list */}
            <div className="space-y-3">
              {editTermins.map((termin, index) => (
                <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">Termin {index + 1}</span>
                    {editTermins.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeEditTermin(index)}
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Judul</label>
                      <Input
                        value={termin.judul}
                        onChange={(e) => updateEditTermin(index, "judul", e.target.value)}
                        className="glass-input h-9 text-white"
                        placeholder="Judul termin"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Jumlah (Rp)</label>
                      <Input
                        type="number"
                        value={termin.baseAmount}
                        onChange={(e) => updateEditTermin(index, "baseAmount", parseFloat(e.target.value) || 0)}
                        className="glass-input h-9 text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {termin.baseAmount > 0 && (
                    <div className="mt-2 text-xs text-slate-400">
                      + Fee {CLIENT_FEE_PERCENT}%: <span className="text-[#FF9013]">{formatCurrency(termin.baseAmount * 0.01)}</span>
                      {" "}= <span className="text-white font-medium">{formatCurrency(termin.baseAmount * 1.01)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add termin button */}
            <Button
              type="button"
              variant="outline"
              onClick={addEditTermin}
              className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              <Plus className="w-4 h-4" />
              Tambah Termin
            </Button>

            {/* Total summary */}
            <div className="p-3 rounded-lg bg-[#FF9013]/10 border border-[#FF9013]/30">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Total Termin:</span>
                <span className="text-white font-medium">{formatCurrency(totalEditAmount)}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-slate-400">+ Total Fee ({CLIENT_FEE_PERCENT}%):</span>
                <span className="text-[#FF9013]">{formatCurrency(totalEditAmount * 0.01)}</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#FF9013]/30">
                <span className="text-sm text-white font-medium">Total Tagihan Client:</span>
                <span className="text-lg font-bold text-[#FF9013]">{formatCurrency(totalEditAmount * 1.01)}</span>
              </div>
              {projectBudget > 0 && totalEditAmount !== projectBudget && (
                <div className="mt-2 text-xs text-yellow-400">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Total termin ({formatCurrency(totalEditAmount)}) berbeda dengan anggaran proyek ({formatCurrency(projectBudget)})
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={saveEditTermins}
                disabled={saveLoading || totalEditAmount <= 0}
                className="flex-1 glass-button"
              >
                {saveLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}
