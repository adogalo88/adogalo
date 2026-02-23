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
  GlassCardFooter,
} from "@/components/ui/glass-card";
import { HardHat, ArrowRight, Shield, Loader2, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
        }),
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem("otp_email", email);
        sessionStorage.setItem("otp_mode", "admin");
        router.push("/admin/verify-otp");
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] mb-4 shadow-lg glow-admin">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-slate-400">Masuk sebagai Administrator</p>
        </div>

        <GlassCard glow="admin">
          <GlassCardHeader>
            <GlassCardTitle className="text-[#8B5CF6]">Login Admin</GlassCardTitle>
            <GlassCardDescription>
              Masukkan email admin untuk menerima kode OTP
            </GlassCardDescription>
          </GlassCardHeader>

          <form onSubmit={handleSendOtp}>
            <GlassCardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Email Admin
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Masukkan email admin"
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
                className="w-full h-11 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#9D6FFF] hover:to-[#8B5CF6] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
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

          <GlassCardFooter>
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#8B5CF6] transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke login proyek
            </button>
          </GlassCardFooter>
        </GlassCard>

        <div className="flex items-center justify-center gap-2 mt-6 text-slate-500 text-sm">
          <HardHat className="w-4 h-4" />
          <span>Adogalo © {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
