"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
} from "@/components/ui/glass-card";
import { HardHat, ArrowRight, Shield, Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "admin">("login");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check");
        const data = await response.json();
        
        if (data.loggedIn && data.user) {
          // User is logged in, redirect based on role
          if (data.user.role === "admin") {
            router.push("/admin/dashboard");
          } else if (data.user.projectId) {
            router.push(`/project/${data.user.projectId}`);
          }
          return;
        }
      } catch {
        // Not logged in or error, continue to login page
      }
      setCheckingAuth(false);
    };
    
    checkAuth();
  }, [router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "login" && !projectId) {
      setError("ID Proyek diperlukan");
      return;
    }

    if (!email) {
      setError("Email diperlukan");
      return;
    }

    setLoading(true);

    try {
      // Clear any existing session first
      sessionStorage.removeItem("otp_email");
      sessionStorage.removeItem("otp_projectId");
      sessionStorage.removeItem("otp_mode");

      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          projectId: mode === "login" ? projectId : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store email and projectId in sessionStorage for verify-otp page
        sessionStorage.setItem("otp_email", email);
        if (mode === "login" && projectId) {
          sessionStorage.setItem("otp_projectId", projectId);
        }
        sessionStorage.setItem("otp_mode", mode);
        
        // In development mode, store the OTP for display
        if (data.devOtp) {
          sessionStorage.setItem("dev_otp", data.devOtp);
        }
        
        router.push("/verify-otp");
      } else {
        setError(data.message || "Gagal mengirim OTP");
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-grid-pattern">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF9013] to-[#E07A00] mb-4 shadow-lg glow-primary">
            <HardHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Adogalo</h1>
          <p className="text-slate-400">Sistem Manajemen Proyek Konstruksi</p>
        </div>

        {/* Checking Auth Loading */}
        {checkingAuth && (
          <GlassCard glow="primary" className="p-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF9013]" />
              <p className="text-slate-400">Memeriksa sesi...</p>
            </div>
          </GlassCard>
        )}

        {/* Login Card */}
        {!checkingAuth && (
          <GlassCard glow="primary">
            <GlassCardHeader>
              <GlassCardTitle>
                {mode === "login" ? "Masuk ke Proyek" : "Masuk sebagai Admin"}
              </GlassCardTitle>
              <GlassCardDescription>
                {mode === "login"
                  ? "Masukkan ID Proyek dan email Anda untuk masuk"
                  : "Masukkan email admin untuk masuk"}
              </GlassCardDescription>
            </GlassCardHeader>

            <form onSubmit={handleSendOtp}>
              <GlassCardContent className="space-y-4">
                {mode === "login" && (
                  <div className="space-y-2">
                    <Label htmlFor="projectId" className="text-slate-300">
                      ID Proyek
                    </Label>
                    <Input
                      id="projectId"
                      type="text"
                      placeholder="Masukkan ID Proyek"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="glass-input h-11 text-white placeholder:text-slate-500"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Masukkan email Anda"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input h-11 text-white placeholder:text-slate-500"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 glass-button text-white font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengirim OTP...
                    </>
                  ) : (
                    <>
                      Kirim OTP
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </GlassCardContent>
            </form>

            <GlassCardFooter className="flex-col gap-3 pt-4">
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => setMode("admin")}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#FF9013] transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Login sebagai Admin
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#FF9013] transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Kembali ke login proyek
                </button>
              )}
            </GlassCardFooter>
          </GlassCard>
        )}

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          © {new Date().getFullYear()} Adogalo. All rights reserved.
        </p>
      </div>
    </div>
  );
}
