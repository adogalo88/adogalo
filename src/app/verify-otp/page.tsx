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
import { ArrowLeft, Loader2, Mail } from "lucide-react";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState("");
  const [projectId, setProjectId] = useState("");
  const [mode, setMode] = useState("login");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Get email and projectId from sessionStorage
    const storedEmail = sessionStorage.getItem("otp_email");
    const storedProjectId = sessionStorage.getItem("otp_projectId");
    const storedMode = sessionStorage.getItem("otp_mode");
    const storedDevOtp = sessionStorage.getItem("dev_otp");

    if (!storedEmail) {
      router.push("/");
      return;
    }

    setEmail(storedEmail);
    if (storedProjectId) setProjectId(storedProjectId);
    if (storedMode) setMode(storedMode);
    if (storedDevOtp) setDevOtp(storedDevOtp);

    // Focus first input
    inputRefs.current[0]?.focus();
  }, [router]);

  useEffect(() => {
    // Auto-submit when all 6 digits are filled
    if (otp.every((digit) => digit !== "")) {
      handleVerify();
    }
  }, [otp]);

  useEffect(() => {
    // Countdown timer for resend
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
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

    // Move to next input
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
      // For admin mode, don't send projectId at all
      const bodyPayload: { email: string; otp: string; projectId?: string } = {
        email,
        otp: otpCode,
      };
      
      // Only include projectId for non-admin login
      if (mode === "login" && projectId) {
        bodyPayload.projectId = projectId;
      }

      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (data.success) {
        // Clear sessionStorage
        sessionStorage.removeItem("otp_email");
        sessionStorage.removeItem("otp_projectId");
        sessionStorage.removeItem("otp_mode");
        sessionStorage.removeItem("dev_otp");

        // Redirect based on role
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
      // For admin mode, don't send projectId at all
      const bodyPayload: { email: string; projectId?: string } = {
        email,
      };
      
      // Only include projectId for non-admin login
      if (mode === "login" && projectId) {
        bodyPayload.projectId = projectId;
      }

      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (data.success) {
        setCountdown(60); // 60 seconds countdown
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        
        // In development mode, save the new OTP
        if (data.devOtp) {
          setDevOtp(data.devOtp);
          sessionStorage.setItem("dev_otp", data.devOtp);
        }
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
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Verifikasi OTP</h1>
          <p className="text-slate-400">Masukkan kode 6 digit yang dikirim ke email Anda</p>
        </div>

        {/* OTP Card */}
        <GlassCard glow="primary">
          <GlassCardHeader>
            <GlassCardTitle>Kode Verifikasi</GlassCardTitle>
            <GlassCardDescription className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="truncate">{email}</span>
            </GlassCardDescription>
          </GlassCardHeader>

          <GlassCardContent>
            {/* Development Mode OTP Display */}
            {devOtp && (
              <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-500 text-sm font-semibold">🔧 Development Mode</span>
                </div>
                <p className="text-yellow-400/80 text-xs mb-3">
                  Klik tombol di bawah untuk auto-fill OTP:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const digits = devOtp.split("");
                    setOtp(digits);
                  }}
                  className="w-full py-3 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-400 font-mono text-2xl tracking-widest transition-colors"
                >
                  {devOtp}
                </button>
              </div>
            )}

            {/* OTP Input */}
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
                  className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#FF9013] focus:ring-2 focus:ring-[#FF9013]/20 outline-none transition-all"
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
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#FF9013] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke login
            </button>
          </GlassCardFooter>
        </GlassCard>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          © {new Date().getFullYear()} Adogalo. All rights reserved.
        </p>
      </div>
    </div>
  );
}
