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
  ChevronDown,
  ChevronUp,
  MessageSquare,
  RotateCcw,
  Pencil,
  FileDown,
  Banknote,
} from "lucide-react";
import { downloadTerminReceipt, downloadRetensiReceipt, downloadMilestoneCompletionReceipt } from "@/lib/pdf-receipt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FileAttachments from "@/components/project/FileAttachments";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, CLIENT_FEE_PERCENT, VENDOR_FEE_PERCENT } from "@/lib/financial";

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
  displayBreakdown?: {
    grossAmount: number;
    vendorFeeAmount: number;
    retentionPercent: number;
    retentionAmount: number;
    vendorNetAmount: number;
  };
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
  files: string;
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
  startDate?: string | null;
  endDate?: string | null;
  logs?: { tipe: string; tanggal: string }[];
}

interface Termin {
  id: string;
  judul: string;
  baseAmount: number;
  type: string;
  feeClientAmount?: number;
  totalWithFee: number;
  status: string;
  createdAt?: string;
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

const refundStatusLabels: Record<string, string> = {
  unpaid: "Belum Dikembalikan",
  refunded: "Dikembalikan",
};

const logTypeLabels: Record<string, string> = {
  daily: "Laporan Harian",
  finish: "Selesai",
  fix: "Perbaikan",
  complain: "Komplain",
  admin: "Admin",
  change: "Perubahan",
  "additional-work": "Pekerjaan Tambahan",
  refund: "Pengembalian",
  system: "Sistem",
  retention: "Retensi",
};

const logTypeColors: Record<string, string> = {
  daily: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  finish: "bg-green-500/20 text-green-500 border-green-500/30",
  fix: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  complain: "bg-red-500/20 text-red-500 border-red-500/30",
  admin: "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/30",
  change: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  "additional-work": "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
  refund: "bg-cyan-500/20 text-cyan-500 border-cyan-500/30",
  system: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  retention: "bg-pink-500/20 text-pink-500 border-pink-500/30",
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
  const [retensiLoading, setRetensiLoading] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [showEditEmailModal, setShowEditEmailModal] = useState(false);
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editVendorEmail, setEditVendorEmail] = useState("");
  const [editEmailLoading, setEditEmailLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<"admin" | "manager" | null>(null);

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    fetch("/api/auth/check")
      .then((res) => res.json())
      .then((data) => {
        if (data.loggedIn && data.user?.role) setCurrentUserRole(data.user.role as "admin" | "manager");
      })
      .catch(() => {});
  }, []);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      const data = await response.json();

      if (data.success) {
        setProject(data.project);
        fetch(`/api/projects/${id}/read`, { method: "POST" }).catch(() => {});
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

  const openEditEmailModal = () => {
    if (project) {
      setEditClientEmail(project.clientEmail);
      setEditVendorEmail(project.vendorEmail);
      setShowEditEmailModal(true);
    }
  };

  const saveEditEmail = async () => {
    if (!project) return;
    setEditEmailLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: editClientEmail.trim() || undefined,
          vendorEmail: editVendorEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Berhasil", description: data.message, variant: "success" });
        setShowEditEmailModal(false);
        fetchProject();
      } else {
        toast({ title: "Gagal", description: data.message || "Gagal memperbarui email", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setEditEmailLoading(false);
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseFiles = (filesStr: string): string[] => {
    try {
      return JSON.parse(filesStr || "[]");
    } catch {
      return [];
    }
  };

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(milestoneId)) next.delete(milestoneId);
      else next.add(milestoneId);
      return next;
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

  const handleReleaseRetensi = async () => {
    if (!project) return;
    setRetensiLoading(true);
    try {
      const response = await fetch("/api/retensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, action: "release" }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Berhasil",
          description: "Retensi berhasil dicairkan. Proyek ditandai selesai.",
          variant: "success",
        });
        fetchProject();
      } else {
        toast({
          title: "Gagal",
          description: data.message || "Gagal mencairkan retensi",
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
      setRetensiLoading(false);
    }
  };

  const canReleaseRetensi =
    currentUserRole === "admin" &&
    project?.retensi &&
    ["pending_release", "waiting_confirmation", "countdown"].includes(project.retensi.status);

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
            <GlassCardHeader className="flex flex-row items-center justify-between">
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

          <div className="lg:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={openEditEmailModal}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Email Client / Vendor
            </Button>
          </div>
        </div>

        {/* Modal Edit Email */}
        <Dialog open={showEditEmailModal} onOpenChange={setShowEditEmailModal}>
          <DialogContent className="glass-card border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Edit Email Client &amp; Vendor</DialogTitle>
              <DialogDescription>
                Ubah email jika ada email hilang atau perlu diperbarui. Login tetap menggunakan email yang baru.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="edit-client-email" className="text-slate-300">Email Client</Label>
                <Input
                  id="edit-client-email"
                  type="email"
                  value={editClientEmail}
                  onChange={(e) => setEditClientEmail(e.target.value)}
                  className="mt-1 bg-white/5 border-white/10 text-white"
                  placeholder="client@email.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-vendor-email" className="text-slate-300">Email Vendor</Label>
                <Input
                  id="edit-vendor-email"
                  type="email"
                  value={editVendorEmail}
                  onChange={(e) => setEditVendorEmail(e.target.value)}
                  className="mt-1 bg-white/5 border-white/10 text-white"
                  placeholder="vendor@email.com"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowEditEmailModal(false)} className="border-white/10 text-white">
                  Batal
                </Button>
                <Button onClick={saveEditEmail} disabled={editEmailLoading} className="glass-button">
                  {editEmailLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : "Simpan"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Admin Data */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-green-500" />
              Data Keuangan Admin
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 rounded-lg bg-white/5 min-w-0">
                <p className="text-sm text-slate-400">Total Biaya Admin</p>
                <p className="text-sm sm:text-lg font-bold text-[#FF9013] currency-responsive">
                  {formatCurrency(project.adminData?.feeEarned || 0)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5 min-w-0">
                <p className="text-sm text-slate-400">Dana Client</p>
                <p className="text-sm sm:text-lg font-bold text-white currency-responsive">
                  {formatCurrency(project.adminData?.clientFunds || 0)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5 min-w-0">
                <p className="text-sm text-slate-400">Dibayar ke Vendor</p>
                <p className="text-sm sm:text-lg font-bold text-white currency-responsive">
                  {formatCurrency(project.adminData?.vendorPaid || 0)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5 min-w-0">
                <p className="text-sm text-slate-400">Saldo Admin</p>
                <p className="text-sm sm:text-lg font-bold text-white currency-responsive">
                  {formatCurrency(project.adminData?.adminBalance || 0)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5 min-w-0">
                <p className="text-sm text-slate-400">Retensi Ditahan</p>
                <p className="text-sm sm:text-lg font-bold text-white currency-responsive">
                  {formatCurrency(project.adminData?.retentionHeld || 0)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5 min-w-0">
                <p className="text-sm text-slate-400">Fee Terkumpul</p>
                <p className="text-sm sm:text-lg font-bold text-white currency-responsive">
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
            {(() => {
              const paymentTermins = project.termins.filter((t) => t.type !== "reduction");
              const refundTermins = project.termins.filter((t) => t.type === "reduction");
              return (
                <>
                  {paymentTermins.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">
                      Belum ada termin pembayaran
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {paymentTermins.map((termin, index) => (
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
                                  : "Pekerjaan Tambahan"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-right">
                              <p className="font-medium text-white">
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
                            {(termin.status === "paid" || termin.status === "refunded") && currentUserRole === "admin" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-slate-400 hover:text-[#FF9013] shrink-0"
                                onClick={() =>
                                  downloadTerminReceipt(
                                    {
                                      id: termin.id,
                                      judul: termin.judul,
                                      baseAmount: termin.baseAmount,
                                      type: termin.type,
                                      feeClientAmount: termin.feeClientAmount ?? 0,
                                      totalWithFee: termin.totalWithFee,
                                      status: termin.status,
                                      createdAt: termin.createdAt,
                                    },
                                    { judul: project.judul, clientName: project.clientName }
                                  )
                                }
                              >
                                <FileDown className="w-4 h-4" />
                                Bukti PDF
                              </Button>
                            )}
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

                  {refundTermins.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                        <RotateCcw className="w-4 h-4 text-blue-400" />
                        Refund / Pengembalian Dana
                      </h4>
                      <p className="text-xs text-slate-400 mb-3">
                        Dana yang dikembalikan ke client akibat pengurangan pekerjaan. Dapat diproses pada akhir proyek.
                      </p>
                      <div className="space-y-2">
                        {refundTermins.map((termin) => {
                          const refundAmount = Math.abs(termin.totalWithFee);
                          return (
                            <div
                              key={termin.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 gap-3"
                            >
                              <div>
                                <p className="text-white font-medium">{termin.judul}</p>
                                <p className="text-xs text-slate-400 mt-0.5">Pengurangan pekerjaan</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="font-medium text-blue-400">+{formatCurrency(refundAmount)}</p>
                                  <Badge className={termin.status === "refunded" ? terminStatusColors.refunded : terminStatusColors.unpaid}>
                                    {termin.status === "refunded" ? refundStatusLabels.refunded : refundStatusLabels.unpaid}
                                  </Badge>
                                </div>
                                {termin.status === "refunded" && currentUserRole === "admin" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-slate-400 hover:text-[#FF9013] shrink-0"
                                    onClick={() =>
                                      downloadTerminReceipt(
                                        {
                                          id: termin.id,
                                          judul: termin.judul,
                                          baseAmount: termin.baseAmount,
                                          type: termin.type,
                                          feeClientAmount: termin.feeClientAmount,
                                          totalWithFee: termin.totalWithFee,
                                          status: termin.status,
                                          createdAt: (termin as { createdAt?: string }).createdAt,
                                        },
                                        { judul: project.judul, clientName: project.clientName }
                                      )
                                    }
                                  >
                                    <FileDown className="w-4 h-4" />
                                    Bukti PDF
                                  </Button>
                                )}
                                {termin.status === "unpaid" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleTerminAction(termin.id, "process_refund")}
                                    disabled={terminLoading === termin.id + "process_refund"}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    {terminLoading === termin.id + "process_refund" ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      "Proses Pengembalian"
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
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
                    className="rounded-lg bg-white/5 overflow-hidden border-l-4"
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
                    <button
                      type="button"
                      onClick={() => toggleMilestone(milestone.id)}
                      className="w-full p-4 flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-white font-medium">{milestone.judul}</h4>
                          {milestone.displayBreakdown ? (
                            <div className="mt-1.5 text-xs text-slate-400 space-y-0.5">
                              <p className="flex flex-wrap items-baseline gap-1">
                                <span>(Nilai base anggaran proyek: {formatCurrency(project.baseTotal)} × persentase progres ({milestone.persentase}%):</span>
                                <span className="text-slate-300 font-medium">{formatCurrency(milestone.displayBreakdown.grossAmount)})</span>
                              </p>
                              <p className="flex flex-wrap items-baseline gap-1">
                                <span>− Fee Vendor ({VENDOR_FEE_PERCENT}%): {formatCurrency(milestone.displayBreakdown.vendorFeeAmount)}</span>
                                <span>− Retensi ({milestone.displayBreakdown.retentionPercent}%): {formatCurrency(milestone.displayBreakdown.retentionAmount)}</span>
                                <span>= Diterima Vendor:</span>
                                <span className="text-[#10B981] font-semibold">{formatCurrency(milestone.displayBreakdown.vendorNetAmount)}</span>
                              </p>
                            </div>
                          ) : (
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
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">
                          {milestone.displayBreakdown ? formatCurrency(milestone.displayBreakdown.vendorNetAmount) : formatCurrency(milestone.price)}
                        </span>
                        <Badge className={statusColors[milestone.status]}>
                          {statusLabels[milestone.status]}
                        </Badge>
                        {milestone.status === "completed" && currentUserRole === "admin" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-slate-400 hover:text-[#FF9013] shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              const finishLog = milestone.logs?.find((l: { tipe: string; tanggal: string }) => l.tipe === "finish");
                              const b = milestone.displayBreakdown;
                              downloadMilestoneCompletionReceipt(
                                {
                                  id: milestone.id,
                                  judul: milestone.judul,
                                  persentase: milestone.persentase,
                                  price: milestone.price,
                                  status: milestone.status,
                                  completedAt: finishLog?.tanggal ?? undefined,
                                  vendorFeeAmount: b?.vendorFeeAmount,
                                  retentionPercent: b?.retentionPercent,
                                  retentionAmount: b?.retentionAmount,
                                  vendorNetAmount: b?.vendorNetAmount,
                                },
                                { judul: project.judul, clientName: project.clientName, vendorName: project.vendorName }
                              );
                            }}
                          >
                            <FileDown className="w-4 h-4" />
                            Bukti Pelunasan
                          </Button>
                        )}
                        {milestone.status === "waiting_admin" && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMilestoneAction(milestone.id, "confirm-payment");
                            }}
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
                        {expandedMilestones.has(milestone.id) ? (
                          <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {expandedMilestones.has(milestone.id) && (
                      <div className="px-4 pb-4 pt-0 border-t border-white/10">
                        {milestone.logs.length > 0 ? (
                          <div className="space-y-3 mt-3">
                            <h5 className="text-sm font-semibold text-white flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Log Aktivitas ({milestone.logs.length}) — dari yang lama ke terbaru
                            </h5>
                            {milestone.logs.map((log) => {
                              const files = parseFiles(log.files);
                              return (
                                <div
                                  key={log.id}
                                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <Badge className={logTypeColors[log.tipe] || "bg-slate-500/20 text-slate-400"}>
                                      {logTypeLabels[log.tipe] || log.tipe}
                                    </Badge>
                                    <span className="text-xs text-slate-500">
                                      {formatDateTime(log.tanggal)}
                                    </span>
                                  </div>
                                  {log.catatan && (
                                    <p className="text-sm text-slate-300 mb-3">{log.catatan}</p>
                                  )}
                                  {files.length > 0 && (
                                    <div className="mb-3">
                                      <FileAttachments files={files} maxThumbnails={4} />
                                    </div>
                                  )}
                                  {log.comments.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                      <h6 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        Komentar ({log.comments.length})
                                      </h6>
                                      <div className="space-y-2">
                                        {log.comments.map((comment) => {
                                          const commentFiles = parseFiles(comment.files);
                                          const commentRole = comment.nama === project.clientName ? "client" : comment.nama === project.vendorName ? "vendor" : "admin";
                                          const commentBg = commentRole === "client" ? "bg-emerald-500/10 border border-emerald-500/20" : commentRole === "vendor" ? "bg-blue-500/10 border border-blue-500/20" : "bg-purple-500/10 border border-purple-500/20";
                                          const commentAccent = commentRole === "client" ? "text-emerald-400" : commentRole === "vendor" ? "text-blue-400" : "text-purple-400";
                                          const commentLabel = commentRole === "client" ? "Client" : commentRole === "vendor" ? "Vendor" : "Admin";
                                          return (
                                            <div key={comment.id} className={`p-2 rounded ${commentBg}`}>
                                              <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                                                <span className={`text-xs font-medium ${commentAccent}`}>
                                                  {comment.nama}
                                                </span>
                                                <span className={`text-[10px] font-medium ${commentAccent}`}>
                                                  {commentLabel}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                  {formatDateTime(comment.tanggal)}
                                                </span>
                                              </div>
                                              {comment.teks && (
                                                <p className="text-sm text-slate-300 mb-2">{comment.teks}</p>
                                              )}
                                              {commentFiles.length > 0 && (
                                                <div className="mt-2">
                                                  <FileAttachments files={commentFiles} maxThumbnails={3} />
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 text-center py-4 mt-3">
                            Belum ada log aktivitas
                          </p>
                        )}
                      </div>
                    )}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <GlassCardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Status Retensi
              </GlassCardTitle>
              <div className="flex items-center gap-2">
                {canReleaseRetensi && (
                  <Button
                    size="sm"
                    className="glass-button"
                    onClick={handleReleaseRetensi}
                    disabled={retensiLoading}
                  >
                    {retensiLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Banknote className="w-4 h-4" />
                    )}
                    Bayar / Cairkan Retensi
                  </Button>
                )}
                {project.retensi?.status === "paid" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    onClick={() =>
                      downloadRetensiReceipt(
                      {
                        id: project.retensi!.id,
                        status: project.retensi!.status,
                        percent: project.retensi!.percent,
                        days: project.retensi!.days,
                        value: project.retensi!.value,
                        startDate: project.retensi!.startDate,
                        endDate: project.retensi!.endDate,
                        logs: project.retensi!.logs?.map((l: { tipe: string; tanggal: string }) => ({ tipe: l.tipe, tanggal: l.tanggal })),
                      },
                      { judul: project.judul, clientName: project.clientName, vendorName: project.vendorName }
                    )
                  }
                >
                  <FileDown className="w-4 h-4" />
                  Bukti PDF
                </Button>
                )}
              </div>
            </div>
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
