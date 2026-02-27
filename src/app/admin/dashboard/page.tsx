"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Building2,
  Users,
  Calendar,
  Loader2,
  Eye,
  Trash2,
  Copy,
  Check,
  Trash2 as TrashIcon,
  AlertCircle,
  Clock,
  Banknote,
  FileWarning,
  ArrowRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/financial";
import { Textarea } from "@/components/ui/textarea";

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
  progress: number;
  valueProgress: number;
  totalMilestones: number;
  completedMilestones: number;
  activeMilestones: number;
  hasUnread?: boolean;
}

interface MilestoneItem {
  judul: string;
  deskripsi: string;
  persentase: number;
}

interface Analytics {
  pendingActions: {
    terminPending: number;
    retensiReleaseCount: number;
    retensiNeedsAttentionCount: number;
    milestonesComplaintCount: number;
    changeRequestPending: number;
    retensiDetails: { projectId: string; projectJudul: string; status: string }[];
    terminDetails?: { projectId: string; projectJudul: string }[];
    changeRequestDetails?: { projectId: string; projectJudul: string }[];
  };
  financialSummary: {
    totalPipelineValue: number;
    totalAdminBalance: number;
    totalRetentionHeld: number;
    totalClientFunds: number;
  };
  projectHealth: { projectsNeedingAttentionCount: number };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    judul: "",
    clientName: "",
    clientEmail: "",
    vendorName: "",
    vendorEmail: "",
    budget: "",
    clientFeePercent: "1",
    vendorFeePercent: "2",
    retensiPercent: "0",
    retensiDays: "0",
  });

  // Milestones state
  const [milestones, setMilestones] = useState<MilestoneItem[]>([
    { judul: "", deskripsi: "", persentase: 0 }
  ]);

  useEffect(() => {
    fetchProjects();
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      const data = await res.json();
      if (data.success) setAnalytics(data);
    } catch {
      // Analytics optional, no toast on fail
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();

      if (data.success) {
        setProjects(data.projects);
        fetchAnalytics();
      } else {
        toast({
          title: "Error",
          description: data.message || "Gagal mengambil data proyek",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil data proyek",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      judul: "",
      clientName: "",
      clientEmail: "",
      vendorName: "",
      vendorEmail: "",
      budget: "",
      clientFeePercent: "1",
      vendorFeePercent: "2",
      retensiPercent: "0",
      retensiDays: "0",
    });
    setMilestones([{ judul: "", deskripsi: "", persentase: 0 }]);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate milestones total = 100%
    const totalPercentage = milestones.reduce((sum, m) => sum + m.persentase, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast({
        title: "Error",
        description: `Total persentase progress harus 100%. Saat ini: ${totalPercentage.toFixed(1)}%`,
        variant: "destructive",
      });
      return;
    }

    // Validate all milestones have judul
    const invalidMilestone = milestones.find(m => !m.judul.trim());
    if (invalidMilestone) {
      toast({
        title: "Error",
        description: "Semua progress/pekerjaan harus memiliki judul",
        variant: "destructive",
      });
      return;
    }

    setCreateLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          milestones,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Berhasil",
          description: "Proyek berhasil dibuat",
          variant: "success",
        });
        setShowCreateModal(false);
        resetForm();
        fetchProjects();
      } else {
        toast({
          title: "Error",
          description: data.message || "Gagal membuat proyek",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat membuat proyek",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus proyek ini?")) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Berhasil",
          description: "Proyek berhasil dihapus",
          variant: "success",
        });
        fetchProjects();
      } else {
        toast({
          title: "Error",
          description: data.message || "Gagal menghapus proyek",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus proyek",
        variant: "destructive",
      });
    }
  };

  const copyProjectId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      toast({
        title: "Berhasil",
        description: "ID Proyek berhasil disalin",
        variant: "success",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Gagal menyalin ID",
        variant: "destructive",
      });
    }
  };

  // Milestone handlers
  const addMilestone = () => {
    setMilestones([...milestones, { judul: "", deskripsi: "", persentase: 0 }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: keyof MilestoneItem, value: string | number) => {
    setMilestones(
      milestones.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      )
    );
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Calculations
  const budgetValue = parseFloat(formData.budget) || 0;
  const totalPercentage = milestones.reduce((sum, m) => sum + m.persentase, 0);
  const clientFeePercent = parseFloat(formData.clientFeePercent) || 1;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Dashboard Admin</h1>
            <p className="text-slate-400 mt-1">Kelola semua proyek konstruksi</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="glass-button"
          >
            <Plus className="w-4 h-4" />
            Buat Proyek Baru
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard variant="light" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF9013]/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#FF9013]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{projects.length}</p>
                <p className="text-sm text-slate-400">Total Proyek</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="light" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {projects.filter((p) => p.status === "active").length}
                </p>
                <p className="text-sm text-slate-400">Proyek Aktif</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="light" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {projects.reduce((sum, p) => sum + p.activeMilestones, 0)}
                </p>
                <p className="text-sm text-slate-400">Milestone Aktif</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="light" className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {projects.reduce((sum, p) => sum + p.completedMilestones, 0)}
                </p>
                <p className="text-sm text-slate-400">Milestone Selesai</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Pending Actions */}
        {analytics && (
          (analytics.pendingActions.terminPending > 0 ||
            analytics.pendingActions.retensiReleaseCount > 0 ||
            analytics.pendingActions.retensiNeedsAttentionCount > 0 ||
            analytics.pendingActions.milestonesComplaintCount > 0 ||
            analytics.pendingActions.changeRequestPending > 0) && (
            <GlassCard className="p-4 border-amber-500/30 bg-amber-500/5">
              <GlassCardHeader className="mb-2">
                <GlassCardTitle className="flex items-center gap-2 text-amber-400 text-lg">
                  <AlertCircle className="w-5 h-5" />
                  Tindakan Prioritas
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                  <div className="flex flex-wrap gap-3">
                    {analytics.pendingActions.terminPending > 0 && (
                      <button
                        onClick={() => {
                          const first = analytics.pendingActions.terminDetails?.[0];
                          if (first) router.push(`/admin/project/${first.projectId}`);
                          else router.push("/admin/dashboard");
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors"
                      >
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">
                          {analytics.pendingActions.terminPending} Termin menunggu konfirmasi
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    {analytics.pendingActions.retensiReleaseCount > 0 && (
                      <button
                        onClick={() => {
                          const first = analytics.pendingActions.retensiDetails.find((r) => r.status === "pending_release");
                          if (first) router.push(`/admin/project/${first.projectId}`);
                          else router.push("/admin/dashboard");
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                      >
                        <Banknote className="w-4 h-4" />
                        <span className="font-medium">
                          {analytics.pendingActions.retensiReleaseCount} Retensi siap dicairkan
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    {analytics.pendingActions.retensiNeedsAttentionCount > 0 && (
                      <button
                        onClick={() => {
                          const first = analytics.pendingActions.retensiDetails.find(
                            (r) => r.status === "waiting_confirmation" || r.status === "complaint_paused"
                          );
                          if (first) router.push(`/admin/project/${first.projectId}`);
                          else router.push("/admin/dashboard");
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                      >
                        <FileWarning className="w-4 h-4" />
                        <span className="font-medium">
                          {analytics.pendingActions.retensiNeedsAttentionCount} Retensi perlu konfirmasi
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    {analytics.pendingActions.milestonesComplaintCount > 0 && (
                      <button
                        onClick={() => router.push("/admin/dashboard")}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">
                          {analytics.pendingActions.milestonesComplaintCount} Milestone komplain
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    {analytics.pendingActions.changeRequestPending > 0 && (
                      <button
                        onClick={() => {
                          const first = analytics.pendingActions.changeRequestDetails?.[0];
                          if (first) router.push(`/admin/project/${first.projectId}`);
                          else router.push("/admin/dashboard");
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                      >
                        <FileWarning className="w-4 h-4" />
                        <span className="font-medium">
                          {analytics.pendingActions.changeRequestPending} Change request menunggu admin
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {analytics.pendingActions.retensiDetails.length > 0 && (
                    <p className="text-xs text-slate-400 mt-3">
                      Proyek: {analytics.pendingActions.retensiDetails.map((r) => r.projectJudul).join(", ")}
                    </p>
                  )}
              </GlassCardContent>
            </GlassCard>
          )
        )}

        {/* Financial Summary */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard variant="light" className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(analytics.financialSummary.totalPipelineValue)}
                  </p>
                  <p className="text-xs text-slate-400">Pipeline Value (Proyek Aktif)</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard variant="light" className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-[#8B5CF6]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(analytics.financialSummary.totalAdminBalance)}
                  </p>
                  <p className="text-xs text-slate-400">Saldo Dikelola</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard variant="light" className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(analytics.financialSummary.totalRetentionHeld)}
                  </p>
                  <p className="text-xs text-slate-400">Retensi Ditahan</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard variant="light" className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(analytics.financialSummary.totalClientFunds)}
                  </p>
                  <p className="text-xs text-slate-400">Dana Client</p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Cari proyek berdasarkan judul, client, vendor, atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 glass-input text-white placeholder:text-slate-500"
          />
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery ? "Tidak ada proyek ditemukan" : "Belum ada proyek"}
            </h3>
            <p className="text-slate-400 mb-4">
              {searchQuery
                ? "Coba ubah kata kunci pencarian"
                : "Klik tombol 'Buat Proyek Baru' untuk memulai"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)} className="glass-button">
                <Plus className="w-4 h-4" />
                Buat Proyek Baru
              </Button>
            )}
          </GlassCard>
        ) : (
          <div className="grid gap-4">
            {filteredProjects.map((project) => (
              <GlassCard
                key={project.id}
                className={`p-4 lg:p-6 hover:border-[#8B5CF6]/30 transition-colors relative ${
                  project.status === "completed" ? "opacity-90 border-green-500/30" : ""
                }`}
              >
                {project.status === "completed" && (
                  <div
                    className="absolute top-6 right-6 -rotate-12 px-4 py-2 rounded-lg bg-green-500/20 border-2 border-green-500/60 shadow-lg"
                    style={{ fontFamily: "monospace" }}
                  >
                    <span className="text-base font-bold text-green-400 tracking-wider">✓ SELESAI</span>
                  </div>
                )}
                {project.hasUnread && project.status !== "completed" && (
                  <span
                    className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-red-500"
                    title="Ada update belum dibaca"
                  />
                )}
                <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9013] to-[#E07A00] flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {project.judul}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-sm text-slate-400">
                            ID: {project.id.slice(0, 8)}...
                          </span>
                          <button
                            onClick={() => copyProjectId(project.id)}
                            className="p-1 hover:bg-white/10 rounded"
                            title="Salin ID lengkap"
                          >
                            {copiedId === project.id ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Users className="w-4 h-4" />
                        <span className="truncate">
                          Client: <span className="text-white">{project.clientName}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Users className="w-4 h-4" />
                        <span className="truncate">
                          Vendor: <span className="text-white">{project.vendorName}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>Dibuat: {formatDate(project.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>
                          Milestone:{" "}
                          <span className="text-white">
                            {project.completedMilestones}/{project.totalMilestones}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Budget Display */}
                    {project.baseTotal > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs text-slate-400">Anggaran Proyek</span>
                            <p className="text-white font-medium">
                              {formatCurrency(project.baseTotal)}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-xs text-[#FF9013]">+{project.clientFeePercent || 1}% Biaya Admin</span>
                            <p className="text-[#FF9013] font-semibold">
                              {formatCurrency(project.baseTotal * (1 + (project.clientFeePercent || 1) / 100))}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-white font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 lg:flex-col">
                    <Button
                      onClick={() => router.push(`/admin/project/${project.id}`)}
                      variant="outline"
                      size="sm"
                      className="flex-1 lg:flex-none border-white/10 bg-white/5 hover:bg-[#8B5CF6]/10 hover:border-[#8B5CF6]/30 text-white"
                    >
                      <Eye className="w-4 h-4" />
                      Lihat Detail
                    </Button>
                    <Button
                      onClick={() => handleDeleteProject(project.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1 lg:flex-none border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="glass-modal max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Buat Proyek Baru</DialogTitle>
            <DialogDescription className="text-slate-400">
              Isi informasi proyek, pengaturan fee, retensi, dan progress/pekerjaan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProject} className="space-y-6 mt-4">
            {/* Informasi Dasar */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white border-b border-white/10 pb-2">
                Informasi Dasar
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="judul" className="text-slate-300">
                  Judul Proyek
                </Label>
                <Input
                  id="judul"
                  placeholder="Contoh: Pembangunan Rumah Tinggal"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="glass-input text-white placeholder:text-slate-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget" className="text-slate-300">
                  Anggaran Proyek (Rp)
                </Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="Contoh: 500000000"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="glass-input text-white placeholder:text-slate-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName" className="text-slate-300">
                    Nama Client
                  </Label>
                  <Input
                    id="clientName"
                    placeholder="Nama lengkap client"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="glass-input text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail" className="text-slate-300">
                    Email Client
                  </Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="client@email.com"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    className="glass-input text-white placeholder:text-slate-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorName" className="text-slate-300">
                    Nama Vendor
                  </Label>
                  <Input
                    id="vendorName"
                    placeholder="Nama lengkap vendor"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    className="glass-input text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendorEmail" className="text-slate-300">
                    Email Vendor
                  </Label>
                  <Input
                    id="vendorEmail"
                    type="email"
                    placeholder="vendor@email.com"
                    value={formData.vendorEmail}
                    onChange={(e) => setFormData({ ...formData, vendorEmail: e.target.value })}
                    className="glass-input text-white placeholder:text-slate-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Pengaturan Fee */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white border-b border-white/10 pb-2">
                Pengaturan Fee
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientFeePercent" className="text-slate-300">
                    Biaya Admin (%) - dari Client
                  </Label>
                  <Input
                    id="clientFeePercent"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="1"
                    value={formData.clientFeePercent}
                    onChange={(e) => setFormData({ ...formData, clientFeePercent: e.target.value })}
                    className="glass-input text-white placeholder:text-slate-500"
                  />
                  <p className="text-xs text-slate-500">Ditambahkan ke tagihan client</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendorFeePercent" className="text-slate-300">
                    Jasa Aplikasi Admin (%) - dari Vendor
                  </Label>
                  <Input
                    id="vendorFeePercent"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="2"
                    value={formData.vendorFeePercent}
                    onChange={(e) => setFormData({ ...formData, vendorFeePercent: e.target.value })}
                    className="glass-input text-white placeholder:text-slate-500"
                  />
                  <p className="text-xs text-slate-500">Dipotong dari pembayaran vendor</p>
                </div>
              </div>

              {budgetValue > 0 && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Anggaran:</span>
                    <span className="text-white">{formatCurrency(budgetValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">+ Biaya Admin ({formData.clientFeePercent || 0}%):</span>
                    <span className="text-[#FF9013]">+{formatCurrency(budgetValue * (parseFloat(formData.clientFeePercent) || 0) / 100)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-white/10">
                    <span className="text-white font-medium">Total Tagihan Client:</span>
                    <span className="text-[#FF9013] font-bold">{formatCurrency(budgetValue * (1 + (parseFloat(formData.clientFeePercent) || 0) / 100))}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Pengaturan Retensi */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white border-b border-white/10 pb-2">
                Pengaturan Retensi
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retensiPercent" className="text-slate-300">
                    Persentase Retensi (%)
                  </Label>
                  <Input
                    id="retensiPercent"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={formData.retensiPercent}
                    onChange={(e) => setFormData({ ...formData, retensiPercent: e.target.value })}
                    className="glass-input text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retensiDays" className="text-slate-300">
                    Durasi Retensi (Hari)
                  </Label>
                  <Input
                    id="retensiDays"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.retensiDays}
                    onChange={(e) => setFormData({ ...formData, retensiDays: e.target.value })}
                    className="glass-input text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              {budgetValue > 0 && parseFloat(formData.retensiPercent) > 0 && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Nilai Retensi ({formData.retensiPercent}%):</span>
                    <span className="text-purple-400 font-medium">{formatCurrency(budgetValue * (parseFloat(formData.retensiPercent) || 0) / 100)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">Durasi:</span>
                    <span className="text-purple-400">{formData.retensiDays || 0} hari setelah proyek selesai</span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress/Pekerjaan */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-sm font-semibold text-white">
                  Progress/Pekerjaan (Total: {totalPercentage.toFixed(1)}%)
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMilestone}
                  className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                >
                  <Plus className="w-4 h-4" />
                  Tambah
                </Button>
              </div>

              {milestones.map((milestone, index) => {
                const nominal = budgetValue * (milestone.persentase / 100);
                return (
                  <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Pekerjaan {index + 1}</span>
                      {milestones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMilestone(index)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">Judul / Nama Pekerjaan</Label>
                      <Input
                        value={milestone.judul}
                        onChange={(e) => updateMilestone(index, "judul", e.target.value)}
                        placeholder="Contoh: Pengerjaan Pondasi"
                        className="glass-input text-white h-9"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">Detail / Deskripsi (kriteria penyelesaian)</Label>
                      <Textarea
                        value={milestone.deskripsi}
                        onChange={(e) => updateMilestone(index, "deskripsi", e.target.value)}
                        placeholder="Informasikan sampai tahap mana progress akan dianggap selesai..."
                        className="glass-input text-white"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Persentase (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={milestone.persentase || ""}
                          onChange={(e) => updateMilestone(index, "persentase", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="glass-input text-white h-9"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Nilai (Rp)</Label>
                        <div className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 flex items-center">
                          <span className="text-white text-sm">{formatCurrency(nominal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Percentage Validation */}
              <div className={`p-3 rounded-lg ${
                Math.abs(totalPercentage - 100) < 0.01
                  ? "bg-green-500/10 border border-green-500/30"
                  : totalPercentage > 100
                  ? "bg-red-500/10 border border-red-500/30"
                  : "bg-yellow-500/10 border border-yellow-500/30"
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${
                    Math.abs(totalPercentage - 100) < 0.01
                      ? "text-green-400"
                      : totalPercentage > 100
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}>
                    Total Persentase:
                  </span>
                  <span className={`text-lg font-bold ${
                    Math.abs(totalPercentage - 100) < 0.01
                      ? "text-green-400"
                      : totalPercentage > 100
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}>
                    {totalPercentage.toFixed(1)}%
                  </span>
                </div>
                {Math.abs(totalPercentage - 100) >= 0.01 && (
                  <p className={`text-xs mt-1 ${
                    totalPercentage > 100 ? "text-red-400" : "text-yellow-400"
                  }`}>
                    {totalPercentage > 100
                      ? `Melebihi 100% (${(totalPercentage - 100).toFixed(1)}% lebih)`
                      : `Kurang ${(100 - totalPercentage).toFixed(1)}% dari 100%`}
                  </p>
                )}
                {Math.abs(totalPercentage - 100) < 0.01 && (
                  <p className="text-xs text-green-400 mt-1">
                    ✓ Total persentase sudah 100%
                  </p>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 sticky bottom-0 bg-inherit">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createLoading || Math.abs(totalPercentage - 100) >= 0.01}
                className="flex-1 glass-button"
              >
                {createLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Buat Proyek
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
