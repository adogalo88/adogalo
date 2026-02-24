"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Wallet,
  Loader2,
  Copy,
  Check,
  Milestone,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, CLIENT_FEE_PERCENT } from "@/lib/financial";

interface Project {
  id: string;
  judul: string;
  clientName: string;
  clientEmail: string;
  vendorName: string;
  vendorEmail: string;
  baseTotal: number;
  clientFeePercent: number;
  vendorFeePercent: number;
  retensiPercent: number;
  retensiDays: number;
  status: string;
  createdAt: string;
  milestones: Milestone[];
  additionalWorks: AdditionalWork[];
  retensi: Retensi;
  termins: Termin[];
  adminData: AdminData;
  statistics: {
    totalMilestones: number;
    completedMilestones: number;
    activeMilestones: number;
    pendingMilestones: number;
    totalValue: number;
    completedValue: number;
    progress: number;
    valueProgress: number;
    totalPaid: number;
    terminProgress: number;
  };
}

interface Milestone {
  id: string;
  judul: string;
  deskripsi: string | null;
  persentase: number;
  price: number;
  originalPrice: number;
  status: string;
  isAdditionalWork: boolean;
  urutan: number;
  logs: Log[];
}

interface Log {
  id: string;
  tipe: string;
  tanggal: string;
  catatan: string | null;
  files: string;
  comments: Comment[];
}

interface Comment {
  id: string;
  nama: string;
  teks: string;
  tanggal: string;
}

interface AdditionalWork {
  id: string;
  judul: string;
  amount: number;
  deskripsi: string | null;
  status: string;
}

interface Retensi {
  id: string;
  status: string;
  percent: number;
  days: number;
  value: number;
}

interface Termin {
  id: string;
  judul: string;
  baseAmount: number;
  type: string;
  totalWithFee: number;
  status: string;
}

interface AdminData {
  clientFunds: number;
  vendorPaid: number;
  adminBalance: number;
  retentionHeld: number;
  feeEarned: number;
}

const statusColors: Record<string, string> = {
  pending: "status-pending",
  active: "status-active",
  waiting: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  waiting_admin: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  completed: "status-completed",
  complaint: "status-rejected",
  pending_additional: "bg-green-500/20 text-green-500 border-green-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  active: "Sedang Dikerjakan",
  waiting: "Menunggu Client",
  waiting_admin: "Menunggu Admin",
  completed: "Selesai",
  complaint: "Komplain",
  pending_additional: "Pekerjaan Tambahan",
};

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

export default function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [terminLoading, setTerminLoading] = useState<string | null>(null);
  const [milestoneLoading, setMilestoneLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      const data = await response.json();

      if (data.success) {
        setProject(data.project);
      } else {
        toast({
          title: "Error",
          description: data.message || "Gagal mengambil data proyek",
          variant: "destructive",
        });
        router.push("/admin/dashboard");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan",
        variant: "destructive",
      });
      router.push("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const copyProjectId = async () => {
    if (!project) return;
    try {
      await navigator.clipboard.writeText(project.id);
      setCopiedId(true);
      toast({
        title: "Berhasil",
        description: "ID Proyek berhasil disalin",
      });
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Gagal menyalin ID",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleTerminAction = async (terminId: string, action: string) => {
    setTerminLoading(terminId + action);
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
        fetchProject();
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
      setTerminLoading(null);
    }
  };

  const handleMilestoneAction = async (milestoneId: string, action: string) => {
    setMilestoneLoading(milestoneId + action);
    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Berhasil",
          description: data.message,
          variant: "success",
        });
        fetchProject();
      } else {
        toast({
          title: "Gagal",
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
      setMilestoneLoading(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
        </div>
      </AdminLayout>
    );
  }

  if (!project) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl text-white">Proyek tidak ditemukan</h2>
          <Button onClick={() => router.push("/admin/dashboard")} className="mt-4">
            Kembali ke Dashboard
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="flex items-start gap-3">
            <Button
              onClick={() => router.push("/admin/dashboard")}
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                {project.judul}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-400">ID: {project.id}</span>
                <button
                  onClick={copyProjectId}
                  className="p-1 hover:bg-white/10 rounded"
                  title="Salin ID"
                >
                  {copiedId ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <Badge
            className={
              project.status === "active"
                ? "status-active"
                : "status-completed"
            }
          >
            {project.status === "active" ? "Aktif" : "Selesai"}
          </Badge>
        </div>

        {/* Budget Display with Fee */}
        {project.baseTotal > 0 && (
          <GlassCard className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF9013]/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-[#FF9013]" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Anggaran Proyek</p>
                  <p className="text-xl font-bold text-white">
                    {formatCurrency(project.baseTotal)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Biaya Admin ({project.clientFeePercent || 1}%)</span>
                  <span className="text-sm text-[#FF9013]">+{formatCurrency(project.baseTotal * ((project.clientFeePercent || 1) / 100))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Total Tagihan Client</span>
                  <span className="text-lg font-bold text-[#FF9013]">
                    {formatCurrency(project.baseTotal * (1 + (project.clientFeePercent || 1) / 100))}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard variant="light" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF9013]/20 flex items-center justify-center">
                <Milestone className="w-5 h-5 text-[#FF9013]" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {project.statistics.completedMilestones}/{project.statistics.totalMilestones}
                </p>
                <p className="text-xs text-slate-400">Pekerjaan Selesai</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="light" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(project.statistics.totalPaid)}
                </p>
                <p className="text-xs text-slate-400">Total Dibayar</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="light" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {project.statistics.activeMilestones}
                </p>
                <p className="text-xs text-slate-400">Sedang Dikerjakan</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="light" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {project.statistics.pendingMilestones}
                </p>
                <p className="text-xs text-slate-400">Menunggu</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Progress Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Progress Pekerjaan</h3>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Persentase Selesai</span>
              <span className="text-white font-medium">{project.statistics.progress}%</span>
            </div>
            <Progress value={project.statistics.progress} className="h-3" />
            <p className="text-xs text-slate-500 mt-2">
              {formatCurrency(project.statistics.completedValue)} dari{" "}
              {formatCurrency(project.statistics.totalValue)}
            </p>
          </GlassCard>

          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Progress Pembayaran</h3>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Termin Dibayar</span>
              <span className="text-white font-medium">{project.statistics.terminProgress}%</span>
            </div>
            <Progress value={project.statistics.terminProgress} className="h-3" />
          </GlassCard>
        </div>

        {/* Client & Vendor Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-[#FF9013]" />
                Informasi Client
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama</span>
                <span className="text-white">{project.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email</span>
                <span className="text-white text-sm">{project.clientEmail}</span>
              </div>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Informasi Vendor
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama</span>
                <span className="text-white">{project.vendorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email</span>
                <span className="text-white text-sm">{project.vendorEmail}</span>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Admin Data */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-green-500" />
              Data Keuangan Admin
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-white/5">
                <p className="text-sm text-slate-400">Dana Client</p>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(project.adminData?.clientFunds || 0)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <p className="text-sm text-slate-400">Dibayar ke Vendor</p>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(project.adminData?.vendorPaid || 0)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <p className="text-sm text-slate-400">Saldo Admin</p>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(project.adminData?.adminBalance || 0)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <p className="text-sm text-slate-400">Retensi Ditahan</p>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(project.adminData?.retentionHeld || 0)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <p className="text-sm text-slate-400">Fee Terkumpul</p>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(project.adminData?.feeEarned || 0)}
                </p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Termin Pembayaran */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#FF9013]" />
              Termin Pembayaran Client
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            {project.termins.length === 0 ? (
              <p className="text-slate-500 text-center py-4">
                Belum ada termin pembayaran
              </p>
            ) : (
              <div className="space-y-2">
                {project.termins.map((termin, index) => (
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
                        <p className="text-xs text-slate-400">
                          {termin.type === "main"
                            ? "Termin Utama"
                            : termin.type === "additional"
                            ? "Pekerjaan Tambahan"
                            : "Pengurangan"}
                        </p>
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
                          {formatCurrency(termin.totalWithFee)}
                        </p>
                        <Badge className={terminStatusColors[termin.status]}>
                          <span className="flex items-center gap-1">
                            {termin.status === "paid" && <CheckCircle className="w-3 h-3" />}
                            {termin.status === "pending_confirmation" && <Clock className="w-3 h-3" />}
                            {terminStatusLabels[termin.status]}
                          </span>
                        </Badge>
                      </div>

                      {/* Confirmation button for pending_confirmation status */}
                      {termin.status === "pending_confirmation" && (
                        <Button
                          size="sm"
                          onClick={() => handleTerminAction(termin.id, "confirm_payment")}
                          disabled={terminLoading === termin.id + "confirm_payment"}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {terminLoading === termin.id + "confirm_payment" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Konfirmasi"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>

        {/* Daftar Progres/Pekerjaan */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-lg flex items-center gap-2">
              <Milestone className="w-5 h-5 text-[#FF9013]" />
              Daftar Progres/Pekerjaan
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            {project.milestones.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">
                  Belum ada progres/pekerjaan. Buat progress dari dashboard admin.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {project.milestones.map((milestone, index) => (
                  <div
                    key={milestone.id}
                    className="p-4 rounded-lg bg-white/5 border-l-4"
                    style={{
                      borderLeftColor:
                        milestone.status === "completed"
                          ? "#10B981"
                          : milestone.status === "active"
                          ? "#3B82F6"
                          : milestone.status === "complaint"
                          ? "#EF4444"
                          : "#F59E0B",
                    }}
                  >
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="text-white font-medium">{milestone.judul}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-[#FF9013] font-medium">
                              {milestone.persentase}%
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            {milestone.deskripsi && (
                              <p className="text-xs text-slate-400 line-clamp-1">
                                {milestone.deskripsi}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">
                          {formatCurrency(milestone.price)}
                        </span>
                        <Badge className={statusColors[milestone.status]}>
                          {statusLabels[milestone.status]}
                        </Badge>
                        {milestone.status === "waiting_admin" && (
                          <Button
                            size="sm"
                            onClick={() => handleMilestoneAction(milestone.id, "confirm-payment")}
                            disabled={milestoneLoading === milestone.id + "confirm-payment"}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {milestoneLoading === milestone.id + "confirm-payment" ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Konfirmasi Pembayaran"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Log count */}
                    <div className="mt-3 flex items-center gap-4 text-sm text-slate-400">
                      <span>{milestone.logs.length} log aktivitas</span>
                      {milestone.logs.reduce((sum, log) => sum + log.comments.length, 0) > 0 && (
                        <span>
                          {milestone.logs.reduce((sum, log) => sum + log.comments.length, 0)}{" "}
                          komentar
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total percentage summary */}
            {project.milestones.length > 0 && (
              <div className={`mt-4 p-3 rounded-lg ${
                project.milestones.reduce((sum, m) => sum + m.persentase, 0) === 100
                  ? "bg-green-500/10 border border-green-500/30"
                  : project.milestones.reduce((sum, m) => sum + m.persentase, 0) > 100
                  ? "bg-red-500/10 border border-red-500/30"
                  : "bg-yellow-500/10 border border-yellow-500/30"
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${
                    project.milestones.reduce((sum, m) => sum + m.persentase, 0) === 100
                      ? "text-green-400"
                      : project.milestones.reduce((sum, m) => sum + m.persentase, 0) > 100
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}>
                    Total Persentase:
                  </span>
                  <span className={`text-lg font-bold ${
                    project.milestones.reduce((sum, m) => sum + m.persentase, 0) === 100
                      ? "text-green-400"
                      : project.milestones.reduce((sum, m) => sum + m.persentase, 0) > 100
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}>
                    {project.milestones.reduce((sum, m) => sum + m.persentase, 0).toFixed(1)}%
                  </span>
                </div>
                {project.milestones.reduce((sum, m) => sum + m.persentase, 0) !== 100 && (
                  <p className={`text-xs mt-1 ${
                    project.milestones.reduce((sum, m) => sum + m.persentase, 0) > 100
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}>
                    {project.milestones.reduce((sum, m) => sum + m.persentase, 0) > 100
                      ? "Total persentase melebihi 100%. Harap perbaiki."
                      : `Masih kurang ${(100 - project.milestones.reduce((sum, m) => sum + m.persentase, 0)).toFixed(1)}% untuk mencapai 100%.`}
                  </p>
                )}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>

        {/* Pekerjaan Tambahan */}
        {project.additionalWorks.length > 0 && (
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                Pekerjaan Tambahan
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {project.additionalWorks.map((work) => (
                  <div key={work.id} className="p-3 rounded-lg bg-white/5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-medium">{work.judul}</h4>
                        {work.deskripsi && (
                          <p className="text-sm text-slate-400 mt-1">{work.deskripsi}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">
                          {formatCurrency(work.amount)}
                        </p>
                        <Badge
                          className={
                            work.status === "approved"
                              ? "status-approved"
                              : work.status === "rejected"
                              ? "status-rejected"
                              : "status-pending"
                          }
                        >
                          {work.status === "approved"
                            ? "Disetujui"
                            : work.status === "rejected"
                            ? "Ditolak"
                            : "Menunggu"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Retensi Info */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Status Retensi
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-white/5">
                <p className="text-sm text-slate-400">Status</p>
                <p className="text-lg font-bold text-white capitalize">
                  {project.retensi?.status || "Tidak Ada"}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <p className="text-sm text-slate-400">Persentase</p>
                <p className="text-lg font-bold text-white">
                  {project.retensi?.percent || 0}%
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <p className="text-sm text-slate-400">Durasi</p>
                <p className="text-lg font-bold text-white">
                  {project.retensi?.days || 0} Hari
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <p className="text-sm text-slate-400">Nilai Ditahan</p>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(project.retensi?.value || 0)}
                </p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Project Info */}
        <GlassCard variant="light" className="p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>Dibuat pada {formatDate(project.createdAt)}</span>
          </div>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}
