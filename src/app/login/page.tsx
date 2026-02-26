"use client";

import { useState } from "react";
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
} from "@/components/ui/glass-card";
import { HardHat, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!projectId) {
      setError("ID Proyek diperlukan");
      return;
    }

    if (!email) {
      setError("Email diperlukan");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          projectId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem("otp_email", email);
        sessionStorage.setItem("otp_projectId", projectId);
        sessionStorage.setItem("otp_mode", "login");
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
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF9013] to-[#E07A00] mb-4 shadow-lg glow-primary">
            <HardHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Adogalo</h1>
          <p className="text-slate-400">Sistem Manajemen Proyek Konstruksi</p>
        </div>

        <GlassCard glow="primary">
          <GlassCardHeader>
            <GlassCardTitle>Masuk ke Proyek</GlassCardTitle>
            <GlassCardDescription>
              Masukkan ID Proyek dan email Anda untuk masuk
            </GlassCardDescription>
          </GlassCardHeader>

          <form onSubmit={handleSendOtp}>
            <GlassCardContent className="space-y-4">
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
        </GlassCard>

        <p className="text-center text-slate-500 text-sm mt-6">
          © {new Date().getFullYear()} Adogalo. All rights reserved.
        </p>
      </div>
    </div>
  );
}
