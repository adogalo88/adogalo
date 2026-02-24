"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Play,
  Upload,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Loader2,
  Wallet,
} from "lucide-react";
import FileUploader from "./FileUploader";
import { toast } from "@/hooks/use-toast";

interface MilestoneActionsProps {
  milestone: {
    id: string;
    status: string;
    harga: number;
    project: {
      id: string;
      clientEmail: string;
      vendorEmail: string;
    };
  };
  userRole: "client" | "vendor" | "admin" | "manager";
  onActionComplete: () => void;
}

export default function MilestoneActions({
  milestone,
  userRole,
  onActionComplete,
}: MilestoneActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<string>("");
  const [catatan, setCatatan] = useState("");
  const [files, setFiles] = useState<string[]>([]);

  const handleAction = async (action: string) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/milestones/${milestone.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, catatan, files }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Berhasil",
          description: data.message,
          variant: "success",
        });
        setShowModal(false);
        setCatatan("");
        setFiles([]);
        onActionComplete();
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

  const closeModal = () => {
    setShowModal(false);
    setCatatan("");
    setFiles([]);
  };

  const renderModalContent = () => {
    switch (modalType) {
      case "daily":
        return {
          title: "Upload Laporan Harian",
          description: "Upload foto/dokumen progress dan catatan pekerjaan hari ini",
          icon: <Upload className="w-5 h-5 text-blue-500" />,
          action: () => handleAction("daily"),
          actionLabel: "Upload Laporan",
        };
      case "finish":
        return {
          title: "Ajukan Selesai",
          description: "Upload foto/dokumen hasil akhir pekerjaan",
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          action: () => handleAction("finish"),
          actionLabel: "Ajukan Selesai",
        };
      case "fix":
        return {
          title: "Upload Perbaikan",
          description: "Upload foto/dokumen perbaikan yang telah dilakukan",
          icon: <Wrench className="w-5 h-5 text-purple-500" />,
          action: () => handleAction("fix"),
          actionLabel: "Upload Perbaikan",
        };
      case "complain":
        return {
          title: "Ajukan Komplain",
          description: "Jelaskan masalah dan upload foto/dokumen bukti",
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          action: () => handleAction("complain"),
          actionLabel: "Ajukan Komplain",
        };
      default:
        return null;
    }
  };

  const modalContent = renderModalContent();

  // Render action buttons based on role and status
  const renderActions = () => {
    // Vendor Actions
    if (userRole === "vendor") {
      if (milestone.status === "pending" || milestone.status === "pending_additional") {
        return (
          <Button
            onClick={() => handleAction("start")}
            disabled={loading}
            className="glass-button"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Mulai Pekerjaan
          </Button>
        );
      }

      if (milestone.status === "active") {
        return (
          <>
            <Button
              onClick={() => openModal("daily")}
              variant="outline"
              className="border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500"
            >
              <Upload className="w-4 h-4" />
              Upload Harian
            </Button>
            <Button
              onClick={() => openModal("finish")}
              className="glass-button"
            >
              <CheckCircle className="w-4 h-4" />
              Ajukan Selesai
            </Button>
          </>
        );
      }

      if (milestone.status === "complaint") {
        return (
          <Button
            onClick={() => openModal("fix")}
            className="bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-500"
          >
            <Wrench className="w-4 h-4" />
            Perbaiki & Upload Ulang
          </Button>
        );
      }
    }

    // Client Actions
    if (userRole === "client") {
      if (milestone.status === "waiting") {
        return (
          <>
            <Button
              onClick={() => handleAction("approve")}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Setujui Selesai
            </Button>
            <Button
              onClick={() => openModal("complain")}
              variant="outline"
              className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500"
            >
              <AlertTriangle className="w-4 h-4" />
              Komplain
            </Button>
          </>
        );
      }

      if (milestone.status === "waiting_admin") {
        return (
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-sm text-purple-400">
              Menunggu konfirmasi pembayaran dari Admin
            </p>
          </div>
        );
      }

      if (milestone.status === "complaint") {
        return (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-400">
              Komplain diajukan. Menunggu perbaikan dari Vendor.
            </p>
          </div>
        );
      }
    }

    // Admin/Manager Actions
    if (userRole === "admin" || userRole === "manager") {
      if (milestone.status === "waiting_admin") {
        return (
          <Button
            onClick={() => handleAction("confirm-payment")}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wallet className="w-4 h-4" />
            )}
            Konfirmasi Pembayaran
          </Button>
        );
      }
    }

    return null;
  };

  const actions = renderActions();

  // If no actions, return null
  if (!actions) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">{actions}</div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="glass-modal max-w-md">
          {modalContent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  {modalContent.icon}
                  {modalContent.title}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {modalContent.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">
                    Catatan {modalType === "complain" && <span className="text-red-400">(wajib diisi)</span>}
                  </label>
                  <Textarea
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder={
                      modalType === "complain"
                        ? "Jelaskan masalah yang ditemukan..."
                        : "Tulis catatan..."
                    }
                    className="glass-input text-white placeholder:text-slate-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-300 mb-2 block">
                    Upload File (Foto/Dokumen)
                  </label>
                  <FileUploader onUpload={setFiles} maxFiles={5} acceptTypes="all" />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    onClick={modalContent.action}
                    disabled={loading || (modalType === "complain" && !catatan.trim())}
                    className="flex-1 glass-button"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      modalContent.actionLabel
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
