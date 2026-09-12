"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, ShieldCheck, Lock, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@fitnex.in");
  const [password, setPassword] = useState("••••••••••••");
  const [selectedRole, setSelectedRole] = useState("GYM_OWNER");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const quickRoles = [
    { label: "Gym Owner", role: "GYM_OWNER", email: "owner@fitnex.in" },
    { label: "Receptionist", role: "RECEPTIONIST", email: "reception@fitnex.in" },
    { label: "Trainer", role: "TRAINER", email: "trainer@fitnex.in" },
    { label: "Accountant", role: "ACCOUNTANT", email: "accountant@fitnex.in" }
  ];

  const handleQuickSelect = (item: typeof quickRoles[0]) => {
    setSelectedRole(item.role);
    setEmail(item.email);
    setPassword("fitnex2026");
    setErrorMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      // Set the authenticated role token
      const mockToken = `mock-role-${selectedRole.toLowerCase()}`;
      if (typeof window !== "undefined") {
        localStorage.setItem("gymcare_token", mockToken);
        localStorage.setItem("gymcare_user_email", email);
        localStorage.setItem("gymcare_user_role", selectedRole);
        localStorage.setItem("gymcare_selected_branch", "00000000-0000-0000-0000-000000000011");
      }

      // Simulate quick authentication transition
      setTimeout(() => {
        if (selectedRole === "RECEPTIONIST") {
          router.push("/reception");
        } else {
          router.push("/");
        }
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || "Authentication failed. Please verify your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gym-bg text-gym-text flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Brand Showcase */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="relative group p-4 px-6 rounded-2xl bg-gradient-to-b from-white via-white to-slate-100 shadow-2xl shadow-red-950/25 border border-white/40 backdrop-blur-xl flex items-center justify-center mb-4 transition-all duration-300 hover:shadow-red-600/20 hover:scale-[1.02]">
            <img
              src="/fitnex-logo.png"
              alt="FITNEX - Stronger Today | Brighter Tomorrow"
              className="h-16 md:h-20 w-auto object-contain drop-shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Enterprise Fitness Management</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gym-red/20 text-gym-red border border-gym-red/30 uppercase tracking-wider">
              PRO CRM
            </span>
          </div>
          <p className="text-xs text-gym-muted mt-1.5">
            Commercial Multi-Branch Gym Management &amp; Billing SaaS
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-gym-card/80 border border-gym-border p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-gym-border/60 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Staff & Management Portal</h2>
              <p className="text-xs text-gym-muted">Sign in to your branch management console</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-gym-emerald" />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Quick Role Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Select Demo Role Profile:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {quickRoles.map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => handleQuickSelect(item)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                    selectedRole === item.role
                      ? "bg-gym-red/20 border-gym-red text-white"
                      : "bg-gym-bg border-gym-border text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span>{item.label}</span>
                  {selectedRole === item.role && <CheckCircle2 className="w-3.5 h-3.5 text-gym-red" />}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gym-bg border border-gym-border text-white text-sm focus:outline-none focus:border-gym-red font-mono"
                  placeholder="name@gym.in"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Security Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gym-bg border border-gym-border text-white text-sm focus:outline-none focus:border-gym-red font-mono"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gym-red hover:bg-gym-redHover text-white font-semibold text-sm shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? "Authenticating Session..." : `Sign In as ${quickRoles.find(r => r.role === selectedRole)?.label || "Staff"}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 border-t border-gym-border/40 text-center text-[11px] text-gym-muted">
            <span>Secure 256-bit SSL Session • GST & Multi-Tenant Isolated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
