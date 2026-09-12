"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Dumbbell,
  BarChart3,
  Users,
  CheckCircle2,
  Lock,
  Smartphone,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("wasimhavaldar70@gmail.com");
  const [password, setPassword] = useState("wasimhavaldar70");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);

  const demoAccounts = [
    {
      label: "Wasim Havaldar (Super Admin)",
      id: "wasimhavaldar70@gmail.com",
      password: "wasimhavaldar70",
      role: "SUPER_ADMIN",
      desc: "Platform Root & SaaS Management • Control all Gym Tenants & Owners"
    },
    {
      label: "Gym Owner / Admin (FITNEX)",
      id: "owner@fitnex.in",
      password: "fitnex2026",
      role: "GYM_OWNER",
      desc: "Single Gym Operator • Complete Authority over Reception, Members, Billing & WhatsApp"
    }
  ];

  const handleSelectDemo = (acc: typeof demoAccounts[0]) => {
    setIdentifier(acc.id);
    setPassword(acc.password || "fitnex2026");
    setErrorMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage("Please enter both your mobile/email and password.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("http://localhost:4000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Invalid credentials. Please verify your mobile/email and password.");
      }

      const { token, user, role, redirect_to, organization } = data.data;

      if (typeof window !== "undefined") {
        localStorage.setItem("gymcare_token", token);
        localStorage.setItem("gymcare_user_email", user?.email || identifier);
        localStorage.setItem("gymcare_user_role", role);
        if (organization?.id) {
          localStorage.setItem("gymcare_tenant_id", organization.id);
        }
        if (rememberMe) {
          localStorage.setItem("gymcare_remember_identifier", identifier);
        }
      }

      // Navigate to authenticated role dashboard
      router.push(redirect_to || "/dashboard");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to authenticate. Ensure the API server is active.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* =========================================================================
          LEFT PANE: BRAND HERO & PRODUCT ANNOUNCEMENTS (MOCKUP ACCURACY)
          ========================================================================= */}
      <div className="relative flex-1 hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-red-950/40 border-r border-slate-800">
        {/* Ambient fitness background lighting */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding Badge */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 bg-white/95 rounded-2xl p-2.5 px-4 shadow-2xl border border-white/20">
            <img
              src="/fitnex-logo.png"
              alt="FITNEX CRM"
              className="h-9 w-auto object-contain"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-red-400 font-bold uppercase">
              COMMERCIAL MULTI-TENANT SAAS
            </span>
            <span className="w-1 h-1 rounded-full bg-red-500" />
            <span className="text-[10px] font-mono text-slate-400">INDIA GST COMPLIANT</span>
          </div>
        </div>

        {/* Center Hero Headline */}
        <div className="relative z-10 max-w-xl my-auto py-12">
          <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white leading-[1.15]">
            Powering the World&apos;s <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-amber-400">
              Elite Gyms &amp; Studios.
            </span>
          </h1>
          <p className="mt-4 text-slate-400 text-sm xl:text-base leading-relaxed">
            3000+ gyms, fitness centers and multi-branch wellness chains across India operate their members, attendance, billing, and automated WhatsApp CRM with complete tenant isolation.
          </p>

          {/* Announcements / Features Showcase */}
          <div className="mt-10 space-y-3.5">
            <div className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">
              FEATURE UPDATES &amp; PLATFORM CAPABILITIES
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wide">
                  AUTOMATED WHATSAPP ALERTS
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Send instant payment receipts, 7-day expiry alerts, and due notices with provider idempotency.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wide">
                  SUPER ADMIN &amp; TENANT ISOLATION
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Platform-level governance for provisioning gym organizations (GYM-000001) with Supabase RLS.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wide">
                  ATOMIC GST REVENUE &amp; ATTENDANCE
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Intra-state and inter-state tax reconciliation, collision-free member codes, and offline queueing.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-600 flex items-center justify-between border-t border-slate-900 pt-6">
          <div>&copy; 2026 GYMCARE SAAS SYSTEMS. ALL RIGHTS RESERVED.</div>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANE: AUTHENTICATION PORTAL (SINGLE LOGIN ENTRY POINT)
          ========================================================================= */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 xl:p-16 max-w-xl mx-auto w-full">
        {/* Mobile Brand Top Banner */}
        <div className="lg:hidden w-full text-center mb-6">
          <div className="inline-block bg-white rounded-2xl p-2 px-4 shadow-xl mb-3">
            <img src="/fitnex-logo.png" alt="FITNEX CRM" className="h-8 w-auto object-contain mx-auto" />
          </div>
          <div className="text-xs text-slate-400 font-mono uppercase tracking-widest">
            Commercial Multi-Tenant SaaS
          </div>
        </div>

        {/* Login Form Card */}
        <div className="w-full bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative">
          <div className="mb-8">
            <div className="text-xs font-mono font-bold tracking-wider text-red-500 uppercase flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>SECURE ACCESS PORTAL</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Console Sign In
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Enter authorized credentials to access the Super Admin or Gym Owner console.
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-start gap-2.5">
              <span className="text-base leading-none font-bold">&times;</span>
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Input 1: Mobile Number or Email */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Mobile Number or Email Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. owner@fitnex.in or +919822012345"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 transition-colors focus:outline-none"
                />
              </div>
            </div>

            {/* Input 2: Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert("Please contact your Platform Super Admin or Branch Owner to reset your password.")}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Lost your password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3.5 pr-12 text-sm text-white placeholder-slate-600 transition-colors focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Session */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-red-600 focus:ring-red-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span>Remember this device</span>
              </label>
            </div>

            {/* Submit CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black py-4 px-6 rounded-xl text-sm uppercase tracking-wider shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <>
                  <span>Login to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* =========================================================================
              COLLAPSIBLE DEMO CREDENTIALS DRAWER (DEVELOPMENT / TESTER AID)
              ========================================================================= */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowDemoDrawer(!showDemoDrawer)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white py-1 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">
                  Quick Demo Accounts (Super Admin &amp; Gym Owner)
                </span>
              </div>
              {showDemoDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDemoDrawer && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSelectDemo(acc)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition-all group flex items-start justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                        <span>{acc.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {acc.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{acc.id}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{acc.desc}</div>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Security watermark */}
        <div className="mt-8 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>256-Bit Encrypted Multi-Tenant Session</span>
        </div>
      </div>
    </div>
  );
}
