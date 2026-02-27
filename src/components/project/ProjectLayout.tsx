"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, User, FolderOpen, Loader2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface ProjectLayoutProps {
  children: React.ReactNode;
  userRole: "client" | "vendor" | "manager";
  userName: string;
  projectTitle: string;
  projectId?: string;
}

interface MyProject {
  id: string;
  judul: string;
  role: "client" | "vendor";
}

export default function ProjectLayout({
  children,
  userRole,
  userName,
  projectTitle,
  projectId,
}: ProjectLayoutProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [myProjects, setMyProjects] = useState<MyProject[]>([]);
  const [switchLoading, setSwitchLoading] = useState<string | null>(null);

  useEffect(() => {
    if ((userRole === "client" || userRole === "vendor") && projectId) {
      fetch("/api/projects/my-projects")
        .then((res) => res.json())
        .then((data) => setMyProjects(data.success && Array.isArray(data.projects) ? data.projects : []))
        .catch(() => setMyProjects([]));
    }
  }, [userRole, projectId]);

  const handleSwitchProject = async (targetProjectId: string) => {
    if (targetProjectId === projectId) return;
    setSwitchLoading(targetProjectId);
    try {
      const res = await fetch("/api/auth/switch-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: targetProjectId }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/project/${targetProjectId}`);
      }
    } finally {
      setSwitchLoading(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const roleColors = {
    client: {
      bg: "from-[#10B981] to-[#059669]",
      text: "text-green-500",
      label: "Client",
    },
    vendor: {
      bg: "from-[#3B82F6] to-[#2563EB]",
      text: "text-blue-500",
      label: "Vendor",
    },
    manager: {
      bg: "from-[#8B5CF6] to-[#7C3AED]",
      text: "text-purple-500",
      label: "Manager",
    },
  };

  const roleInfo = roleColors[userRole] || roleColors.client;

  return (
    <div className="min-h-screen bg-grid-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card rounded-none border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
              <div className="min-w-0 flex-1 sm:flex-initial">
                <h1 className="text-base sm:text-lg font-bold text-white line-clamp-1">
                  {projectTitle}
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">Adogalo</p>
              </div>
            </div>

            {/* Right: User Info & Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Ganti proyek - client & vendor */}
              {(userRole === "client" || userRole === "vendor") && myProjects.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-sm text-slate-400 hover:text-[#FF9013] hover:bg-white/5"
                    >
                      <FolderOpen className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Ganti proyek</span>
                      <ChevronDown className="w-3 h-3 ml-0.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-modal border-white/10 min-w-[220px]">
                    <DropdownMenuLabel className="text-slate-400 text-xs">Proyek Anda</DropdownMenuLabel>
                    {myProjects.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => handleSwitchProject(p.id)}
                        disabled={switchLoading !== null}
                        className={p.id === projectId ? "bg-white/5" : ""}
                      >
                        <span className="truncate flex-1">{p.judul}</span>
                        {p.id === projectId ? (
                          <span className="text-xs text-slate-500 ml-1">(aktif)</span>
                        ) : (
                          <span className={`text-xs ml-1 ${p.role === "client" ? "text-green-500" : "text-blue-500"}`}>
                            {p.role === "client" ? "Client" : "Vendor"}
                          </span>
                        )}
                        {switchLoading === p.id && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {/* Kembali ke beranda - client & vendor */}
              {(userRole === "client" || userRole === "vendor") && (
                <a
                  href="https://adogalo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-400 hover:text-[#FF9013] transition-colors whitespace-nowrap"
                >
                  Kembali ke beranda
                </a>
              )}
              {/* User Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                <div
                  className={`w-2 h-2 rounded-full bg-gradient-to-r ${roleInfo.bg}`}
                />
                <span className="text-sm text-slate-300">{userName}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 ${roleInfo.text}`}
                >
                  {roleInfo.label}
                </span>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg bg-white/5 text-white"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Logout Button */}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="hidden sm:flex border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-white"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden mt-3 pt-3 border-t border-white/10 animate-fade-in">
              {(userRole === "client" || userRole === "vendor") && myProjects.length > 1 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1">Ganti proyek</p>
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                    {myProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setMobileMenuOpen(false); handleSwitchProject(p.id); }}
                        disabled={switchLoading !== null}
                        className={`text-left text-sm py-2 px-3 rounded-lg ${p.id === projectId ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"}`}
                      >
                        <span className="block truncate">{p.judul}</span>
                        <span className="text-xs">{p.id === projectId ? "Aktif" : p.role === "client" ? "Client" : "Vendor"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(userRole === "client" || userRole === "vendor") && (
                <a
                  href="https://adogalo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-slate-400 hover:text-[#FF9013] mb-3"
                >
                  Kembali ke beranda
                </a>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-white">{userName}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 ${roleInfo.text}`}
                  >
                    {roleInfo.label}
                  </span>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-white/5 hover:bg-red-500/10 text-white"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </Button>
              </div>
              <h1 className="text-lg font-bold text-white mt-3 line-clamp-1">
                {projectTitle}
              </h1>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
