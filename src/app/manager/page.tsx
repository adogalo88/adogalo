"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ManagerPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-grid-pattern">
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />
      <div className="relative z-10 text-slate-400">Mengalihkan ke login admin...</div>
    </div>
  );
}
