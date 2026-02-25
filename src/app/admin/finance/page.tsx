"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { formatCurrency } from "@/lib/financial";
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  Calendar,
  FileText,
  Loader2,
  Banknote,
  PiggyBank,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Summary {
  totalClientFunds: number;
  totalVendorPaid: number;
  totalAdminBalance: number;
  totalRetentionHeld: number;
  balance: number;
}

interface Transaction {
  id: string;
  tanggal: string;
  projectId: string | null;
  projectJudul: string;
  tipe: string;
  catatan: string;
}

const tipeLabels: Record<string, string> = {
  system: "Penerimaan dari Client",
  admin: "Pengeluaran ke Vendor",
  retensi_released: "Pencairan Retensi ke Vendor",
  withdrawal: "Withdraw",
};

export default function AdminFinancePage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterYear) params.set("year", String(filterYear));
      if (filterMonth) params.set("month", String(filterMonth));
      const res = await fetch(`/api/admin/finance?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setTransactions(data.transactions || []);
        setIsAdmin(!!data.isAdmin);
      } else {
        toast({
          title: "Error",
          description: data.message || "Gagal memuat data keuangan",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memuat data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterYear, filterMonth]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount.replace(/,/g, "").trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Invalid",
        description: "Masukkan nominal yang valid",
        variant: "destructive",
      });
      return;
    }
    if (summary && amount > summary.balance) {
      toast({
        title: "Melebihi balance",
        description: `Maksimal ${formatCurrency(summary.balance)}`,
        variant: "destructive",
      });
      return;
    }
    setWithdrawLoading(true);
    try {
      const res = await fetch("/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Berhasil", description: data.message, variant: "success" });
        setShowWithdrawModal(false);
        setWithdrawAmount("");
        fetchData();
      } else {
        toast({
          title: "Gagal",
          description: data.message || "Withdraw gagal",
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
      setWithdrawLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Informasi Keuangan Admin</h1>
          <p className="text-slate-400 text-sm mt-1">
            Saldo yang dikelola, ringkasan pendapatan, dan log transaksi
          </p>
        </div>

        {/* Filter */}
        <GlassCard className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Filter</span>
            </div>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value, 10) : "")}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Semua tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value, 10) : "")}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              disabled={!filterYear}
            >
              <option value="">Semua bulan</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("id-ID", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
        </GlassCard>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <GlassCard variant="light" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-[#8B5CF6]" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(summary.totalAdminBalance)}
                      </p>
                      <p className="text-xs text-slate-400">Saldo Dikelola</p>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard variant="light" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(summary.balance)}
                      </p>
                      <p className="text-xs text-slate-400">Balance</p>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard variant="light" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <PiggyBank className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(summary.totalRetentionHeld)}
                      </p>
                      <p className="text-xs text-slate-400">Retensi Ditahan</p>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard variant="light" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(summary.totalClientFunds)}
                      </p>
                      <p className="text-xs text-slate-400">Dana Client</p>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard variant="light" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(summary.totalVendorPaid)}
                      </p>
                      <p className="text-xs text-slate-400">Dibayar ke Vendor</p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* Balance & Withdraw (admin only) */}
            {summary && isAdmin && (
              <GlassCard className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-slate-400">
                    Balance = total fee komisi vendor + total biaya admin (client) − total withdrawal
                  </p>
                  <Button
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={summary.balance <= 0}
                    className="glass-button"
                  >
                    Withdraw
                  </Button>
                </div>
              </GlassCard>
            )}

            {/* Riwayat transaksi */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Riwayat transaksi
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                {transactions.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    Tidak ada transaksi
                    {filterYear || filterMonth ? " untuk periode yang dipilih" : ""}.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-slate-400">
                          <th className="pb-3 pr-4">Tanggal</th>
                          <th className="pb-3 pr-4">Proyek</th>
                          <th className="pb-3 pr-4">Jenis</th>
                          <th className="pb-3">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr
                            key={tx.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 pr-4 text-slate-300 whitespace-nowrap">
                              {new Date(tx.tanggal).toLocaleString("id-ID", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </td>
                            <td className="py-3 pr-4 text-white font-medium">
                              {tx.projectJudul}
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-slate-300">
                                {tipeLabels[tx.tipe] ?? tx.tipe}
                              </span>
                            </td>
                            <td className="py-3 text-slate-400 max-w-md truncate">
                              {tx.catatan}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          </>
        )}
      </div>

      {/* Withdraw modal - hanya admin */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="glass-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Withdraw</DialogTitle>
            <DialogDescription>
              Kurangi balance dengan nominal yang diinput. Hanya admin yang dapat melakukan withdraw.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="withdraw-amount" className="text-slate-300">
                Nominal (Rp)
              </Label>
              <Input
                id="withdraw-amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="mt-1 bg-white/5 border-white/10 text-white"
              />
            </div>
            {summary && (
              <p className="text-xs text-slate-400">
                Balance saat ini: {formatCurrency(summary.balance)}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowWithdrawModal(false)}
                className="border-white/10 text-white"
              >
                Batal
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={withdrawLoading || !withdrawAmount.trim()}
                className="glass-button"
              >
                {withdrawLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Withdraw"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
