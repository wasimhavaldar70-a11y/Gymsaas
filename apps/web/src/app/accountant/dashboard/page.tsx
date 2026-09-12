"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountantDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/reports");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-2">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-mono">Redirecting to GST & Financial Reports...</p>
      </div>
    </div>
  );
}
