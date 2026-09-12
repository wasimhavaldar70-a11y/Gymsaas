"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  Users,
  CreditCard,
  CalendarCheck,
  Building2,
  Bell,
  Search,
  Menu,
  X,
  Dumbbell
} from "lucide-react";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import { fetchApi } from "../../lib/api-client";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [userRole, setUserRole] = useState<string>("GYM_OWNER");

  useEffect(() => {
    // Load persisted branch & role from localStorage
    const savedBranch = localStorage.getItem("gymcare_selected_branch");
    if (savedBranch) {
      setSelectedBranch(savedBranch);
    }
    const savedRole = localStorage.getItem("gymcare_user_role");
    if (savedRole) {
      setUserRole(savedRole);
    }

    // Fetch authenticated organization context
    fetchApi<{ organization: { id: string } }>("/auth/me")
      .then((res) => {
        if (res?.organization?.id) setOrgId(res.organization.id);
      })
      .catch(() => {
        setOrgId("00000000-0000-0000-0000-000000000001");
      });
  }, []);

  // Activate background realtime synchronization for authenticated tenant
  useRealtimeSync(orgId);

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    if (typeof window !== "undefined") {
      localStorage.setItem("gymcare_selected_branch", branchId);
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

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Reception Desk", href: "/reception", icon: QrCode, badge: "Live" },
    { label: "Members", href: "/members", icon: Users },
    { label: "Billing & GST", href: "/billing", icon: CreditCard },
    { label: "Attendance Log", href: "/attendance", icon: CalendarCheck },
    { label: "Leads CRM", href: "/leads", icon: Bell },
    { label: "Workouts", href: "/workouts", icon: Dumbbell },
    { label: "GST Reports", href: "/reports", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-gym-bg text-gym-text flex flex-col md:flex-row">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gym-border bg-gym-surface/80 backdrop-blur-xl shrink-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-gym-border gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gym-red to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20 text-white">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-lg text-white">GYMCARE</span>
            <span className="text-xs ml-1 font-semibold px-1.5 py-0.5 rounded bg-gym-red/20 text-gym-red uppercase tracking-wider">CRM</span>
            <div className="text-[10px] text-gym-muted -mt-0.5">Indian SaaS Edition</div>
          </div>
        </div>

        {/* Tenant Gym Profile Badge */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-gym-card/60 border border-gym-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-gym-emerald font-bold text-xs border border-gym-border">
              IP
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">IronPulse Fitness Club</div>
              <div className="text-[10px] text-gym-muted flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gym-emerald animate-pulse"></span>
                Kolhapur & Pune
              </div>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-gym-border/40 flex items-center justify-between text-[10px] text-gym-muted">
            <span>GSTIN: 27AAACI1234F1Z5</span>
            <span className="text-emerald-400 font-medium">Verified</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gym-red text-white shadow-lg shadow-red-500/20 font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-gym-cardHover"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      isActive ? "bg-white/20 text-white" : "bg-gym-red/20 text-gym-red"
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
        {/* TOP APP HEADER */}
        <header className="h-16 border-b border-gym-border bg-gym-surface/60 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-gym-card text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Branch Selector Dropdown */}
            <div className="flex items-center gap-2 bg-gym-card border border-gym-border px-3 py-1.5 rounded-xl text-xs">
              <Building2 className="w-4 h-4 text-gym-muted shrink-0" />
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-gym-card text-white">All Branches (Organization)</option>
                <option value="00000000-0000-0000-0000-000000000011" className="bg-gym-card text-white">Kolhapur Central Branch</option>
                <option value="00000000-0000-0000-0000-000000000012" className="bg-gym-card text-white">Pune Kothrud Branch</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Link to Reception */}
            <Link
              href="/reception"
              className="hidden sm:flex items-center gap-1.5 bg-gym-red/10 border border-gym-red/30 text-gym-red hover:bg-gym-red hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Reception Mode</span>
            </Link>

            {/* Notifications */}
            <button className="p-2 rounded-xl bg-gym-card border border-gym-border text-slate-400 hover:text-white relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gym-red"></span>
            </button>

            {/* User Profile avatar / Switch Role */}
            <Link
              href="/login"
              className="flex items-center gap-2.5 pl-2 border-l border-gym-border hover:opacity-85 transition-opacity"
              title="Click to Switch Role or Sign Out"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-md uppercase">
                {userRole ? userRole.substring(0, 2) : "GO"}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-white capitalize">
                  {userRole ? userRole.toLowerCase().replace("_", " ") : "Gym Owner"}
                </div>
                <div className="text-[10px] text-gym-muted">Switch Role / Portal</div>
              </div>
            </Link>
          </div>
        </header>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-16 bg-gym-surface/95 backdrop-blur-2xl border-b border-gym-border z-40 p-4 space-y-2">
            {navItems.map((item) => {
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
          href="/"
          className={`flex flex-col items-center gap-1 ${pathname === "/" ? "text-gym-red font-bold" : "text-slate-400"}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Dashboard</span>
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
