"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  Users,
  CreditCard,
  CalendarCheck,
  Building2,
  Bell,
  Menu,
  X,
  Dumbbell,
  MessageSquare,
  ShieldCheck,
  LogOut,
  Sparkles
} from "lucide-react";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import { fetchApi } from "../../lib/api-client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [userRole, setUserRole] = useState<string>("GYM_OWNER");
  const [orgName, setOrgName] = useState<string>("FITNEX Fitness Club");
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedGymName, setImpersonatedGymName] = useState("");

  useEffect(() => {
    // Check impersonation status
    if (typeof window !== "undefined") {
      const imp = localStorage.getItem("gymcare_impersonating") === "true";
      setIsImpersonating(imp);
      if (imp) {
        setImpersonatedGymName(localStorage.getItem("gymcare_impersonating_org_name") || "Gym Tenant");
      }

      const savedBranch = localStorage.getItem("gymcare_selected_branch");
      if (savedBranch) setSelectedBranch(savedBranch);

      const savedRole = localStorage.getItem("gymcare_user_role");
      if (savedRole) setUserRole(savedRole);
    }

    // Fetch authenticated organization context
    fetchApi<{ organization: { id: string; name: string }; user: { role: string } }>("/auth/me")
      .then((res) => {
        if (res?.organization?.id) {
          setOrgId(res.organization.id);
          if (res.organization.name) setOrgName(res.organization.name);
        }
        if (res?.user?.role) {
          setUserRole(res.user.role);
          if (typeof window !== "undefined") {
            localStorage.setItem("gymcare_user_role", res.user.role);
          }
        }
      })
      .catch(() => {});

    // Fetch tenant branches dynamically
    fetchApi<{ id: string; name: string; code: string }[]>("/branches")
      .then((res) => {
        if (Array.isArray(res)) setBranches(res);
      })
      .catch(() => {});
  }, [pathname]);

  // Realtime synchronization for active tenant
  useRealtimeSync(orgId);

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    if (typeof window !== "undefined") {
      localStorage.setItem("gymcare_selected_branch", branchId);
    }
  };

  const exitImpersonation = () => {
    if (typeof window !== "undefined") {
      const superadminToken = localStorage.getItem("gymcare_superadmin_token");
      if (superadminToken) {
        localStorage.setItem("gymcare_auth_token", superadminToken);
        localStorage.setItem("gymcare_user_role", "SUPER_ADMIN");
      }
      localStorage.removeItem("gymcare_impersonating");
      localStorage.removeItem("gymcare_impersonating_org_name");
      setIsImpersonating(false);
      window.location.href = "/superadmin/dashboard";
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // For un-authenticated login page, render full-screen without sidebar/shell
  if (pathname === "/login") {
    return <>{children}</>;
  }

  const isSuperAdminView = (userRole === "SUPER_ADMIN" || pathname?.startsWith("/superadmin")) && !isImpersonating;

  interface NavItem {
    label: string;
    href: string;
    icon: any;
    badge?: string;
  }

  // Super Admin vs Gym CRM Navigation
  const superAdminNavItems: NavItem[] = [
    { label: "Platform Overview", href: "/superadmin/dashboard", icon: LayoutDashboard },
    { label: "Gym Directory", href: "/superadmin/dashboard#gyms", icon: Building2 },
    { label: "Subscriptions & MRR", href: "/superadmin/dashboard#plans", icon: CreditCard },
    { label: "Security & Audit", href: "/superadmin/dashboard#logs", icon: ShieldCheck },
  ];

  const gymNavItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Reception Desk", href: "/reception", icon: QrCode, badge: "Live" },
    { label: "Members", href: "/members", icon: Users },
    { label: "Billing & GST", href: "/billing", icon: CreditCard },
    { label: "WhatsApp Alerts", href: "/whatsapp", icon: MessageSquare, badge: "New" },
    { label: "Attendance Log", href: "/attendance", icon: CalendarCheck },
    { label: "Leads CRM", href: "/leads", icon: Bell },
    { label: "Workouts", href: "/workouts", icon: Dumbbell },
    { label: "GST Reports", href: "/reports", icon: Building2 },
  ];

  const currentNavItems: NavItem[] = isSuperAdminView ? superAdminNavItems : gymNavItems;

  return (
    <div className="min-h-screen bg-gym-bg text-gym-text flex flex-col md:flex-row">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gym-border bg-gym-surface/80 backdrop-blur-xl shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-gym-border/80">
          <Link href={isSuperAdminView ? "/superadmin/dashboard" : "/dashboard"} className="block group">
            <div className="relative rounded-2xl bg-gradient-to-b from-white via-white to-slate-100 p-2.5 shadow-xl shadow-red-950/20 border border-white/20 transition-all duration-300 group-hover:shadow-red-600/15 group-hover:scale-[1.01] flex items-center justify-center">
              <img
                src="/fitnex-logo.png"
                alt="FITNEX - Stronger Today | Brighter Tomorrow"
                className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </div>
          </Link>
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              {isSuperAdminView ? "Super Admin SaaS" : "Multi-Branch SaaS"}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                isSuperAdminView
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-gym-red/20 text-gym-red border-gym-red/30"
              }`}
            >
              {isSuperAdminView ? "PLATFORM ROOT" : "PRO CRM"}
            </span>
          </div>
        </div>

        {/* Tenant Gym Profile Badge or Super Admin Badge */}
        {isSuperAdminView ? (
          <div className="p-3 mx-3 my-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-sm">
                SA
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-amber-300 truncate">GYMCARE Platform</div>
                <div className="text-[10px] text-slate-400">All Gym Organizations</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 mx-3 my-2.5 rounded-xl bg-gym-card/60 border border-gym-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-gym-red to-red-600 flex items-center justify-center text-white font-black text-xs border border-gym-red/40 shadow-sm">
                FX
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{orgName}</div>
                <div className="text-[10px] text-gym-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gym-emerald animate-pulse"></span>
                  Active Tenant
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gym-border/40 flex items-center justify-between text-[10px] text-gym-muted">
              <span>GSTIN: 27AAACI1234F1Z5</span>
              <span className="text-emerald-400 font-medium">Verified</span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {currentNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? isSuperAdminView
                      ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-bold"
                      : "bg-gym-red text-white shadow-lg shadow-red-500/20 font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-gym-cardHover"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? (isSuperAdminView ? "text-slate-950" : "text-white") : "text-slate-400"}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      isActive ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* IST Clock & Version */}
        <div className="p-4 border-t border-gym-border text-center">
          <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            IST: {currentTime || "08:45:00 AM"}
          </div>
          <div className="text-[10px] text-slate-500 mt-2">v1.0.0 (Production Multi-Tenant)</div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* STICKY SUPER ADMIN IMPERSONATION BANNER */}
        {isImpersonating && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold px-4 py-2.5 text-xs flex items-center justify-between sticky top-0 z-50 shadow-xl border-b border-amber-600">
            <div className="flex items-center gap-2">
              <span className="text-base animate-bounce">⚡</span>
              <span>
                IMPERSONATING TENANT: <span className="font-extrabold uppercase tracking-wide bg-slate-950 text-amber-300 px-2 py-0.5 rounded">{impersonatedGymName}</span> (Super Admin Mode) — All actions mutate this gym's database live.
              </span>
            </div>
            <button
              onClick={exitImpersonation}
              className="bg-slate-950 hover:bg-slate-900 text-white px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all shadow-md hover:scale-105 flex items-center gap-1"
            >
              <span>Exit Impersonation</span>
              <span>✕</span>
            </button>
          </div>
        )}

        {/* TOP APP HEADER */}
        <header className="h-16 border-b border-gym-border bg-gym-surface/60 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger & Brand */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-gym-card text-slate-300 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link href={isSuperAdminView ? "/superadmin/dashboard" : "/dashboard"} className="bg-white rounded-lg px-2 py-1 shadow-sm flex items-center">
                <img src="/fitnex-logo.png" alt="FITNEX" className="h-6 w-auto object-contain" />
              </Link>
            </div>

            {/* Branch Selector Dropdown (for non-superadmins) */}
            {!isSuperAdminView && (
              <div className="flex items-center gap-2 bg-gym-card border border-gym-border px-3 py-1.5 rounded-xl text-xs">
                <Building2 className="w-4 h-4 text-gym-muted shrink-0" />
                <select
                  value={selectedBranch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-gym-card text-white">All Branches ({orgName})</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-gym-card text-white">
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Links */}
            {!isSuperAdminView && (
              <>
                <Link
                  href="/whatsapp"
                  className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </Link>

                <Link
                  href="/reception"
                  className="hidden sm:flex items-center gap-1.5 bg-gym-red/10 border border-gym-red/30 text-gym-red hover:bg-gym-red hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Reception</span>
                </Link>

                <Link
                  href="/billing"
                  className="hidden md:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-slate-950 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Billing &amp; GST</span>
                </Link>
              </>
            )}

            {/* Notifications */}
            <button className="p-2 rounded-xl bg-gym-card border border-gym-border text-slate-400 hover:text-white relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gym-red"></span>
            </button>

            {/* User Profile Avatar / Logout */}
            <Link
              href="/login"
              className="flex items-center gap-2.5 pl-2 border-l border-gym-border hover:opacity-85 transition-opacity"
              title="Click to Sign Out or Switch User"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-md uppercase ${
                isSuperAdminView ? "bg-amber-500 text-slate-950 font-black" : "bg-gradient-to-br from-red-500 to-amber-500 text-white"
              }`}>
                {isSuperAdminView ? "SA" : "GO"}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-white">
                  {isSuperAdminView ? "Wasim Havaldar" : "Gym Owner / Admin"}
                </div>
                <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {isSuperAdminView ? "Super Admin Root" : "Full Operations"}
                </div>
              </div>
            </Link>
          </div>
        </header>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-16 bg-gym-surface/95 backdrop-blur-2xl border-b border-gym-border z-40 p-4 space-y-2">
            {currentNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                    isActive ? "bg-gym-red text-white font-semibold" : "text-slate-300 hover:bg-gym-card"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-gym-surface/95 backdrop-blur-xl border-t border-gym-border flex items-center justify-around px-2 z-40">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 ${pathname === "/dashboard" || pathname === "/" ? "text-gym-red font-bold" : "text-slate-400"}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link
          href="/reception"
          className={`flex flex-col items-center gap-1 ${pathname === "/reception" ? "text-gym-red font-bold" : "text-slate-400"}`}
        >
          <div className="p-1 rounded-lg bg-gym-red/20 text-gym-red -mt-2 shadow-lg shadow-red-500/20">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="text-[10px]">Check-In</span>
        </Link>
        <Link
          href="/members"
          className={`flex flex-col items-center gap-1 ${pathname === "/members" ? "text-gym-red font-bold" : "text-slate-400"}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Members</span>
        </Link>
        <Link
          href="/whatsapp"
          className={`flex flex-col items-center gap-1 ${pathname === "/whatsapp" ? "text-emerald-400 font-bold" : "text-slate-400"}`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">WhatsApp</span>
        </Link>
        <Link
          href="/billing"
          className={`flex flex-col items-center gap-1 ${pathname === "/billing" ? "text-gym-red font-bold" : "text-slate-400"}`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px]">Billing</span>
        </Link>
      </nav>
    </div>
  );
}
