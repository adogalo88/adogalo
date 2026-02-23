"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import ProjectLayout from "@/components/project/ProjectLayout";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsSkeleton, MilestoneSkeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronUp,
  Users,
  Wallet,
  Milestone,
  Clock,
  Loader2,
  AlertCircle,
  MessageSquare,
  Calendar,
} from "lucide-react";
import ImageGallery from "@/components/project/ImageGallery";
import FileAttachments from "@/components/project/FileAttachments";
import MilestoneActions from "@/components/project/MilestoneActions";
import CommentForm from "@/components/project/CommentForm";
import RetensiSection from "@/components/project/RetensiSection";
import AdditionalWorkSection from "@/components/project/AdditionalWorkSection";
import ReductionSection from "@/components/project/ReductionSection";
import MilestoneManager from "@/components/project/MilestoneManager";
import TerminSection from "@/components/project/TerminSection";
import { toast } from "@/hooks/use-toast";
import { formatCurrency as formatCurrencyHelper, CLIENT_FEE_PERCENT } from "@/lib/financial";

interface Project {
  id: string;
  judul: string;
  clientName: string;
  clientEmail: string;
  vendorName: string;
  vendorEmail: string;
  baseTotal: number;
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
    fundsWarning: {
      isSufficient: boolean;
      requiredFunds: number;
      shortage: number;
      warningMessage: string | null;
    } | null;
  };
  headerValues: {
    vendor: number;
    client: number;
    admin: number;
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
  changeRequests: ChangeRequest[];
  // Role-based display fields
  displayAmount?: number;
  displayLabel?: string;
  displayBreakdown?: {
    grossAmount: number;
    clientFeeAmount: number;
    totalWithClientFee: number;
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
  userId: string;
  nama: string;
  teks: string;
  files: string;
  tanggal: string;
  reply: string | null;
}

interface ChangeRequest {
  id: string;
  milestoneId: string | null;
  amount: number;
  alasan: string | null;
  status: string;
  createdAt: string;
}

interface AdditionalWork {
  id: string;
  judul: string;
  amount: number;
  deskripsi: string | null;
  status: string;
  createdAt: string;
}

interface Retensi {
  id: string;
  status: string;
  percent: number;
  days: number;
  value: number;
  logs: { tipe: string; catatan: string; tanggal: string }[];
}

interface Termin {
  id: string;
  judul: string;
  baseAmount: number;
  type: string;
  feeClientAmount: number;
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
  waiting: "Menunggu Persetujuan",
  waiting_admin: "Menunggu Admin",
  completed: "Selesai",
  complaint: "Komplain",
  pending_additional: "Pekerjaan Tambahan",
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

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      const data = await response.json();

      if (data.success) {
        setProject(data.project);
        setUserRole(data.userRole);
      } else {
        toast({
          title: "Error",
          description: data.message || "Gagal mengambil data proyek",
          variant: "destructive",
        });
        router.push("/");
      }
    } catch {
      toast({
        title: "Error",
        description: "Terjadi kesalahan",
        variant: "destructive",
      });
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId);
      } else {
        newSet.add(milestoneId);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return formatCurrencyHelper(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
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

  const getDisplayName = () => {
    if (!project) return "";
    if (userRole === "client") return project.clientName;
    if (userRole === "vendor") return project.vendorName;
    return "Manager";
  };

  if (loading) {
    return (
      <ProjectLayout
        userRole="client"
        userName="Loading..."
        projectTitle="Memuat..."
      >
        <div className="space-y-6 animate-pulse">
          <StatsSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-4 rounded-xl">
              <div className="h-4 bg-white/10 rounded w-24 mb-3"></div>
              <div className="h-3 bg-white/10 rounded w-full mb-2"></div>
              <div className="h-2 bg-white/10 rounded w-full"></div>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <div className="h-4 bg-white/10 rounded w-24 mb-3"></div>
              <div className="h-3 bg-white/10 rounded w-full mb-2"></div>
              <div className="h-2 bg-white/10 rounded w-full"></div>
            </div>
          </div>
          <MilestoneSkeleton />
        </div>
      </ProjectLayout>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grid-pattern">
        <div className="text-center">
          <h2 className="text-xl text-white">Proyek tidak ditemukan</h2>
          <Button onClick={() => router.push("/")} className="mt-4">
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ProjectLayout
      userRole={userRole as "client" | "vendor" | "manager"}
      userName={getDisplayName()}
      projectTitle={project.judul}
    >
      <div className="space-y-6">
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
                  {formatCurrency(project.statistics.totalValue)}
                </p>
                <p className="text-xs text-slate-400">Nilai Proyek</p>
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
                <Wallet className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(project.statistics.totalPaid)}
                </p>
                <p className="text-xs text-slate-400">Total Dibayar</p>
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

        {/* Funds Warning Banner */}
        {project.statistics.fundsWarning && (
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-yellow-500">Peringatan Dana</h4>
                <p className="text-sm text-yellow-400/80 mt-1">
                  {project.statistics.fundsWarning.warningMessage}
                </p>
                <div className="mt-2 text-xs text-yellow-400/60">
                  <span>Dibutuhkan: {formatCurrency(project.statistics.fundsWarning.requiredFunds)}</span>
                  <span className="mx-2">•</span>
                  <span>Kekurangan: {formatCurrency(project.statistics.fundsWarning.shortage)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Budget Display - Role Based */}
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
              {/* Vendor tidak melihat fee, Client/Manager melihat +1% */}
              {userRole !== "vendor" && (
                <div className="flex flex-col sm:items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Biaya Admin ({CLIENT_FEE_PERCENT}%)</span>
                    <span className="text-sm text-[#FF9013]">+{formatCurrency(project.baseTotal * 0.01)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Total Tagihan</span>
                    <span className="text-lg font-bold text-[#FF9013]">
                      {formatCurrency(project.baseTotal * 1.01)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Client & Vendor Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
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

        {/* Termin Pembayaran Section with Actions */}
        <TerminSection
          projectId={project.id}
          termins={project.termins}
          userRole={userRole as "client" | "vendor" | "admin" | "manager"}
          clientFunds={project.adminData?.clientFunds || 0}
          projectBudget={project.baseTotal}
          onUpdate={fetchProject}
        />

        {/* Daftar Progres/Pekerjaan */}
        <GlassCard>
          <GlassCardHeader className="flex flex-row items-center justify-between">
            <GlassCardTitle className="text-lg flex items-center gap-2">
              <Milestone className="w-5 h-5 text-[#FF9013]" />
              Daftar Progres/Pekerjaan
            </GlassCardTitle>
            <MilestoneManager
              projectId={project.id}
              projectBudget={project.baseTotal}
              existingMilestones={project.milestones.map(m => ({ id: m.id, persentase: m.persentase }))}
              userRole={userRole as "client" | "vendor" | "admin" | "manager"}
              onUpdate={fetchProject}
            />
          </GlassCardHeader>
          <GlassCardContent>
            {project.milestones.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">
                  {userRole === "admin"
                    ? "Belum ada progres/pekerjaan. Silakan tambahkan pekerjaan untuk memulai."
                    : "Belum ada progres/pekerjaan."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {project.milestones.map((milestone, index) => (
                  <div
                    key={milestone.id}
                    className="rounded-lg bg-white/5 overflow-hidden"
                  >
                    {/* Milestone Header */}
                    <button
                      onClick={() => toggleMilestone(milestone.id)}
                      className="w-full p-4 flex items-center justify-between border-l-4"
                      style={{
                        borderLeftColor:
                          milestone.status === "completed"
                            ? "#10B981"
                            : milestone.status === "active"
                            ? "#3B82F6"
                            : milestone.status === "complaint"
                            ? "#EF4444"
                            : milestone.status === "waiting" ||
                              milestone.status === "waiting_admin"
                            ? "#F59E0B"
                            : "#94a3b8",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white">
                          {index + 1}
                        </span>
                        <div className="text-left">
                          <h4 className="text-white font-medium">{milestone.judul}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-[#FF9013]">
                              {milestone.persentase}%
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-sm text-slate-400">
                              {formatCurrency(milestone.price)}
                            </span>
                            {milestone.originalPrice > milestone.price && (
                              <span className="text-xs text-red-400">
                                (-{formatCurrency(milestone.originalPrice - milestone.price)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={statusColors[milestone.status]}>
                          {statusLabels[milestone.status]}
                        </Badge>
                        {expandedMilestones.has(milestone.id) ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Milestone Content (Expanded) */}
                    {expandedMilestones.has(milestone.id) && (
                      <div className="p-4 pt-0 border-l-4 border-transparent animate-fade-in">
                        {/* Deskripsi */}
                        {milestone.deskripsi && (
                          <p className="text-slate-400 text-sm mb-4 p-3 rounded-lg bg-white/5">
                            {milestone.deskripsi}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="mb-4">
                          <MilestoneActions
                            milestone={{
                              id: milestone.id,
                              status: milestone.status,
                              harga: milestone.price,
                              project: {
                                id: project.id,
                                clientEmail: project.clientEmail,
                                vendorEmail: project.vendorEmail,
                              },
                            }}
                            userRole={userRole as "client" | "vendor" | "admin" | "manager"}
                            onActionComplete={fetchProject}
                          />
                        </div>

                        {/* Logs */}
                        {milestone.logs.length > 0 && (
                          <div className="space-y-3">
                            <h5 className="text-sm font-semibold text-white flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Log Aktivitas ({milestone.logs.length})
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
                                    <p className="text-sm text-slate-300 mb-3">
                                      {log.catatan}
                                    </p>
                                  )}

                                  {/* Images/Documents */}
                                  {files.length > 0 && (
                                    <div className="mb-3">
                                      <FileAttachments files={files} maxThumbnails={4} />
                                    </div>
                                  )}

                                  {/* Comments */}
                                  <div className="mt-3 pt-3 border-t border-white/10">
                                    {log.comments.length > 0 && (
                                      <>
                                        <h6 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                                          <MessageSquare className="w-3 h-3" />
                                          Komentar ({log.comments.length})
                                        </h6>
                                        <div className="space-y-2">
                                          {log.comments.map((comment) => {
                                            const commentFiles = parseFiles(comment.files);
                                            return (
                                              <div
                                                key={comment.id}
                                                className="p-2 rounded bg-white/5"
                                              >
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="text-xs font-medium text-[#FF9013]">
                                                    {comment.nama}
                                                  </span>
                                                  <span className="text-xs text-slate-500">
                                                    {formatDateTime(comment.tanggal)}
                                                  </span>
                                                </div>
                                                {comment.teks && (
                                                  <p className="text-sm text-slate-300 mb-2">
                                                    {comment.teks}
                                                  </p>
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
                                      </>
                                    )}
                                    {/* Comment Form - always show for client/vendor */}
                                    {(userRole === "client" || userRole === "vendor") && (
                                      <CommentForm
                                        logId={log.id}
                                        onCommentAdded={fetchProject}
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {milestone.logs.length === 0 && (
                          <p className="text-sm text-slate-500 text-center py-4">
                            Belum ada log aktivitas
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>

        {/* Retensi Section */}
        <RetensiSection
          projectId={project.id}
          retensi={project.retensi}
          userRole={userRole as "client" | "vendor" | "admin" | "manager"}
          onUpdate={fetchProject}
        />

        {/* Additional Work Section */}
        <AdditionalWorkSection
          projectId={project.id}
          additionalWorks={project.additionalWorks}
          userRole={userRole as "client" | "vendor" | "admin" | "manager"}
          onUpdate={fetchProject}
        />

        {/* Reduction Section - inside GlassCard */}
        <GlassCard className="p-4">
          <ReductionSection
            projectId={project.id}
            milestones={project.milestones}
            changeRequests={project.milestones.flatMap((m) => m.changeRequests || [])}
            userRole={userRole as "client" | "vendor" | "admin" | "manager"}
            onUpdate={fetchProject}
          />
        </GlassCard>
      </div>
    </ProjectLayout>
  );
}
