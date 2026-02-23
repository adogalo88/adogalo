"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/glass-card";
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
  Users,
  Loader2,
  Edit,
  Trash2,
  Mail,
  Building2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Manager {
  id: string;
  nama: string;
  email: string;
  projectIds: string[];
  projects: { id: string; judul: string }[];
  createdAt: string;
}

interface Project {
  id: string;
  judul: string;
}

export default function AdminManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    projectIds: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [managersRes, projectsRes] = await Promise.all([
        fetch("/api/managers"),
        fetch("/api/projects"),
      ]);

      const managersData = await managersRes.json();
      const projectsData = await projectsRes.json();

      if (managersData.success) {
        setManagers(managersData.managers);
      }
      if (projectsData.success) {
        setProjects(projectsData.projects);
      }
    } catch {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingManager(null);
    setFormData({
      nama: "",
      email: "",
      projectIds: [],
    });
    setShowModal(true);
  };

  const openEditModal = (manager: Manager) => {
    setEditingManager(manager);
    setFormData({
      nama: manager.nama,
      email: manager.email,
      projectIds: manager.projectIds,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);

    try {
      const url = editingManager
        ? `/api/managers/${editingManager.id}`
        : "/api/managers";
      const method = editingManager ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Berhasil",
          description: editingManager
            ? "Manager berhasil diperbarui"
            : "Manager berhasil ditambahkan",
          variant: "success",
        });
        setShowModal(false);
        fetchData();
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
      setModalLoading(false);
    }
  };

  const handleDelete = async (managerId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus manager ini?")) return;

    try {
      const response = await fetch(`/api/managers/${managerId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Berhasil",
          description: "Manager berhasil dihapus",
          variant: "success",
        });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: data.message || "Gagal menghapus manager",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  const toggleProject = (projectId: string) => {
    setFormData((prev) => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter((id) => id !== projectId)
        : [...prev.projectIds, projectId],
    }));
  };

  const filteredManagers = managers.filter(
    (manager) =>
      manager.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      manager.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Manajemen Manager</h1>
            <p className="text-slate-400 mt-1">Kelola pengguna dengan akses manager</p>
          </div>
          <Button onClick={openCreateModal} className="glass-button">
            <Plus className="w-4 h-4" />
            Tambah Manager
          </Button>
        </div>

        {/* Info Card */}
        <GlassCard variant="light" className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Akses Manager</h3>
              <p className="text-sm text-slate-400 mt-1">
                Manager dapat melihat dan mengelola proyek yang ditugaskan kepada mereka.
                Mereka login dengan email dan OTP, tanpa perlu memasukkan ID proyek.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Cari manager berdasarkan nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 glass-input text-white placeholder:text-slate-500"
          />
        </div>

        {/* Managers List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
          </div>
        ) : filteredManagers.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery ? "Tidak ada manager ditemukan" : "Belum ada manager"}
            </h3>
            <p className="text-slate-400 mb-4">
              {searchQuery
                ? "Coba ubah kata kunci pencarian"
                : "Klik tombol 'Tambah Manager' untuk memulai"}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateModal} className="glass-button">
                <Plus className="w-4 h-4" />
                Tambah Manager
              </Button>
            )}
          </GlassCard>
        ) : (
          <div className="grid gap-4">
            {filteredManagers.map((manager) => (
              <GlassCard key={manager.id} className="p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {manager.nama.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {manager.nama}
                        </h3>
                        <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                          <Mail className="w-4 h-4" />
                          <span>{manager.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Projects */}
                    <div className="mt-4">
                      <p className="text-sm text-slate-400 mb-2">Proyek yang dapat diakses:</p>
                      {manager.projects.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">
                          Belum ada proyek yang ditugaskan
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {manager.projects.map((project) => (
                            <span
                              key={project.id}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#FF9013]/20 text-[#FF9013] border border-[#FF9013]/30"
                            >
                              <Building2 className="w-3 h-3" />
                              {project.judul}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEditModal(manager)}
                      variant="outline"
                      size="sm"
                      className="border-white/10 bg-white/5 hover:bg-[#8B5CF6]/10 hover:border-[#8B5CF6]/30 text-white"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(manager.id)}
                      variant="outline"
                      size="sm"
                      className="border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-white"
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

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="glass-modal max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {editingManager ? "Edit Manager" : "Tambah Manager Baru"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingManager
                ? "Perbarui informasi dan akses proyek manager"
                : "Manager akan dapat login dengan email dan OTP"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="nama" className="text-slate-300">
                Nama Lengkap
              </Label>
              <Input
                id="nama"
                placeholder="Masukkan nama lengkap"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                className="glass-input text-white placeholder:text-slate-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="manager@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="glass-input text-white placeholder:text-slate-500"
                required
                disabled={!!editingManager}
              />
              {editingManager && (
                <p className="text-xs text-slate-500">Email tidak dapat diubah</p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-slate-300">Akses Proyek</Label>
              <p className="text-sm text-slate-500">
                Pilih proyek yang dapat diakses oleh manager ini
              </p>

              {projects.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  Belum ada proyek tersedia
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {projects.map((project) => (
                    <label
                      key={project.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={formData.projectIds.includes(project.id)}
                        onCheckedChange={() => toggleProject(project.id)}
                      />
                      <span className="text-sm text-white">{project.judul}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={modalLoading}
                className="flex-1 glass-button"
              >
                {modalLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : editingManager ? (
                  "Simpan Perubahan"
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Tambah Manager
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
