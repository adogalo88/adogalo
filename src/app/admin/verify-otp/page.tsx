"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
} from "@/components/ui/glass-card";
import { Shield, ArrowLeft, Loader2, Mail } from "lucide-react";

export default function AdminVerifyOtpPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("otp_email");

    if (!storedEmail) {
      router.push("/admin/login");
      return;
    }

    setEmail(storedEmail);
    inputRefs.current[0]?.focus();
  }, [router]);

  useEffect(() => {
    if (otp.every((digit) => digit !== "")) {
      handleVerify();
    }
  }, [otp]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6);
      const newOtp = [...otp];
      digits.split("").forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      return;
    }

    const digit = value.replace(/\D/g, "");
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Masukkan 6 digit kode OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp: otpCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.removeItem("otp_email");
        sessionStorage.removeItem("otp_mode");
        router.push(data.redirect);
      } else {
        setError(data.message || "Kode OTP tidak valid");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setLoading(true);
    setError("");

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
        setCountdown(60);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setError(data.message || "Gagal mengirim ulang OTP");
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
          <h1 className="text-3xl font-bold text-white mb-2">Verifikasi Admin</h1>
          <p className="text-slate-400">Masukkan kode 6 digit yang dikirim ke email Anda</p>
        </div>

        <GlassCard glow="admin">
          <GlassCardHeader>
            <GlassCardTitle className="text-[#8B5CF6]">Kode Verifikasi</GlassCardTitle>
            <GlassCardDescription className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="truncate">{email}</span>
            </GlassCardDescription>
          </GlassCardHeader>

          <GlassCardContent>
            <div className="flex gap-2 justify-center mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading}
                  className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 outline-none transition-all"
                />
              ))}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center mb-4">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </div>
            )}
          </GlassCardContent>

          <GlassCardFooter className="flex-col gap-3">
            <Button
              onClick={handleResend}
              disabled={countdown > 0 || loading}
              variant="outline"
              className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              {countdown > 0 ? (
                `Kirim Ulang (${countdown}s)`
              ) : (
                "Kirim Ulang OTP"
              )}
            </Button>

            <button
              onClick={() => router.push("/admin/login")}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#8B5CF6] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke login admin
            </button>
          </GlassCardFooter>
        </GlassCard>

        <p className="text-center text-slate-500 text-sm mt-6">
          © {new Date().getFullYear()} Adogalo. All rights reserved.
        </p>
      </div>
    </div>
  );
}
