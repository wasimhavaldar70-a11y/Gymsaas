"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  CalendarCheck,
  TrendingUp,
  IndianRupee,
  AlertTriangle,
  QrCode,
  UserPlus,
  Receipt,
  ArrowUpRight,
  UserX,
  Dumbbell,
  MessageSquare
} from "lucide-react";
import { fetchApi } from "../../lib/api-client";
import { DashboardMetrics } from "@gymcare/shared";

export default function GymOwnerDashboardPage() {
  const { data: metrics, isLoading, refetch } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics"],
    queryFn: () => fetchApi<DashboardMetrics>("/dashboard/metrics"),
    refetchInterval: 15_000 // Realtime live sync
  });

  const { data: authData } = useQuery<{ organization?: { name: string; code?: string; gstin?: string }; user?: { full_name: string; role: string } }>({
    queryKey: ["auth-me"],
    queryFn: () => fetchApi<{ organization?: { name: string; code?: string; gstin?: string }; user?: { full_name: string; role: string } }>("/auth/me")
  });

  const gymName = authData?.organization?.name || "FITNEX Fitness Club";
  const gymCode = authData?.organization?.code || "GYM-000001";
  const ownerName = authData?.user?.full_name || "Gym Owner";

  // 10 KPI Metric Cards
  const kpiCards = [
    {
      label: "Total Members",
      value: isLoading ? "..." : (metrics?.total_members ?? 0).toLocaleString(),
      sub: "Registered in directory",
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      label: "Active Members",
      value: isLoading ? "..." : (metrics?.active_members ?? 0).toLocaleString(),
      sub: "Valid ongoing plans",
      icon: UserCheck,
      color: "text-gym-emerald",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    {
      label: "New This Month",
      value: isLoading ? "..." : (metrics?.new_members_this_month ?? 0).toLocaleString(),
      sub: "Joined this calendar month",
      icon: UserPlus,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20"
    },
    {
      label: "Expired Members",
      value: isLoading ? "..." : (metrics?.expired_members ?? 0).toLocaleString(),
      sub: "Need renewal follow-up",
      icon: UserX,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20"
    },
    {
      label: "Today's Attendance",
      value: isLoading ? "..." : (metrics?.today_attendance ?? 0).toLocaleString(),
      sub: "QR / biometric check-ins",
      icon: CalendarCheck,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    },
    {
      label: "Today's Collection",
      value: isLoading ? "..." : `₹${(metrics?.today_collection ?? 0).toLocaleString("en-IN")}`,
      sub: "Cash, UPI, Card & Online",
      icon: IndianRupee,
      color: "text-gym-emerald",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    {
      label: "Monthly Revenue",
      value: isLoading ? "..." : `₹${(metrics?.monthly_revenue ?? 0).toLocaleString("en-IN")}`,
      sub: "Gross fees collected",
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    {
      label: "Pending Dues",
      value: isLoading ? "..." : `₹${(metrics?.pending_payments ?? 0).toLocaleString("en-IN")}`,
      sub: "Balance payment due",
      icon: Receipt,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20"
    },
    {
      label: "Expiring (7 Days)",
      value: isLoading ? "..." : (metrics?.expiring_in_7_days ?? 0).toLocaleString(),
      sub: "Action required",
      icon: AlertTriangle,
      color: "text-gym-amber",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    },
    {
      label: "Active Trainers",
      value: isLoading ? "..." : (metrics?.active_trainers ?? 0).toLocaleString(),
      sub: "On floor & PT sessions",
      icon: Dumbbell,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-gym-red/20 text-gym-red border border-gym-red/30">
              {gymCode}
            </span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Tenant Isolated Live Sync
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>{gymName}</span>
          </h1>
          <p className="text-xs md:text-sm text-gym-muted mt-1">
            Welcome back, <span className="text-white font-semibold">{ownerName}</span>. Real-time operations, attendance, billing, and automated WhatsApp CRM.
          </p>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <Link
            href="/reception"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gym-red hover:bg-gym-redHover text-white px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold shadow-lg shadow-red-500/25 transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Reception Desk</span>
          </Link>

          <Link
            href="/members?action=new"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gym-card hover:bg-gym-cardHover border border-gym-border text-white px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all"
          >
            <UserPlus className="w-4 h-4 text-gym-emerald" />
            <span>Add Member</span>
          </Link>

          <Link
            href="/billing"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gym-card hover:bg-gym-cardHover border border-gym-border text-white px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all"
          >
            <Receipt className="w-4 h-4 text-gym-amber" />
            <span>Collect Fee</span>
          </Link>

          <Link
            href="/whatsapp"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp Alerts</span>
          </Link>
        </div>
      </div>

      {/* 10 KPI CARDS GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Key Performance Indicators (Realtime)
          </h2>
          <button
            onClick={() => refetch()}
            className="text-xs text-gym-muted hover:text-white flex items-center gap-1"
          >
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          {kpiCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl bg-gym-card/70 backdrop-blur-md border ${card.border} hover:bg-gym-cardHover transition-all flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gym-muted uppercase tracking-wider line-clamp-1">
                    {card.label}
                  </span>
                  <div className={`p-1.5 rounded-lg ${card.bg} ${card.color} shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl md:text-2xl font-black text-white tracking-tight">
                    {card.value}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {card.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REVENUE OVERVIEW & ATTENDANCE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Activity Trend (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-gym-border space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-cyan-400" />
                <span>7-Day Attendance Activity</span>
              </h2>
              <p className="text-xs text-gym-muted">Daily member check-in frequency at reception</p>
            </div>
            <Link
              href="/attendance"
              className="text-xs text-gym-red hover:underline flex items-center gap-1 font-semibold"
            >
              <span>View Full Log</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
            {(metrics?.charts?.attendance_trend && metrics.charts.attendance_trend.length > 0
              ? metrics.charts.attendance_trend
              : [
                  { date: "Mon", count: 42 },
                  { date: "Tue", count: 50 },
                  { date: "Wed", count: 38 },
                  { date: "Thu", count: 48 },
                  { date: "Fri", count: 54 },
                  { date: "Sat", count: 62 },
                  { date: "Sun", count: 30 }
                ]
            ).map((point, i) => {
              const maxVal = 70;
              const heightPct = Math.min(100, Math.max(15, (point.count / maxVal) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[11px] font-mono text-slate-400 group-hover:text-white transition-colors">
                    {point.count}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-red-600/30 via-red-500/70 to-gym-red group-hover:brightness-125 transition-all shadow-md"
                  ></div>
                  <span className="text-[11px] font-medium text-gym-muted">{point.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Membership Distribution Breakdown (1 Col) */}
        <div className="p-6 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-gym-border space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-purple-400" />
                <span>Active Plan Mix</span>
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Distribution
              </span>
            </div>
            <p className="text-xs text-gym-muted mt-0.5">Enrolled membership tiers</p>

            <div className="mt-5 space-y-3">
              {(metrics?.charts?.membership_distribution && metrics.charts.membership_distribution.length > 0
                ? metrics.charts.membership_distribution
                : [
                    { name: "Annual Premium Plan", value: 120 },
                    { name: "6-Month Fitness Pro", value: 85 },
                    { name: "3-Month General", value: 45 },
                    { name: "1-Month Monthly", value: 30 }
                  ]
              ).map((plan, i) => {
                const total = (metrics?.charts?.membership_distribution || []).reduce((acc, p) => acc + p.value, 0) || 1;
                const pct = Math.round((plan.value / total) * 100) || 25;
                const colors = [
                  "bg-red-500 text-red-400",
                  "bg-emerald-500 text-emerald-400",
                  "bg-cyan-500 text-cyan-400",
                  "bg-purple-500 text-purple-400"
                ];
                const color = colors[i % colors.length];

                return (
                  <div key={i} className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white truncate">{plan.name}</span>
                      <span className="font-mono font-bold text-slate-300">{plan.value} members</span>
                    </div>
                    <div className="w-full bg-gym-bg rounded-full h-1.5 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full ${color.split(" ")[0]}`}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-gym-border/60">
            <Link
              href="/members"
              className="w-full flex items-center justify-center gap-2 bg-gym-cardHover hover:bg-slate-800 text-white border border-gym-border py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-gym-emerald" />
              <span>Manage Member Directory</span>
            </Link>
          </div>
        </div>
      </div>

      {/* RECENT FINANCIALS & QUICK OPERATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GST Billing & Tax Invoice Ledger */}
        <div className="p-6 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-gym-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-gym-emerald" />
              <span>GST Financial Health</span>
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              SAC 999723 (18%)
            </span>
          </div>
          <p className="text-xs text-gym-muted">Auto-computed CGST 9% & SGST 9% for Maharashtra/India</p>

          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Month Collection</span>
              <span className="font-mono font-bold text-white text-sm">
                ₹{(metrics?.monthly_revenue ?? 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border flex items-center justify-between text-xs">
              <span className="text-slate-400">Estimated Tax Output (18% GST)</span>
              <span className="font-mono font-bold text-slate-300">
                ₹{Math.round((metrics?.monthly_revenue ?? 0) * 0.1525).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border flex items-center justify-between text-xs">
              <span className="text-slate-400">Net Business Revenue (Excl. Tax)</span>
              <span className="font-mono font-bold text-emerald-400">
                ₹{Math.round((metrics?.monthly_revenue ?? 0) * (1 - 0.1525)).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Link
              href="/billing"
              className="flex-1 flex items-center justify-center gap-2 bg-gym-red hover:bg-gym-redHover text-white py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-red-500/20 transition-all"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Open Billing Ledger</span>
            </Link>
            <Link
              href="/reports"
              className="flex-1 flex items-center justify-center gap-2 bg-gym-card hover:bg-gym-cardHover border border-gym-border text-white py-2.5 rounded-xl text-xs font-semibold transition-all"
            >
              <span>Download GST Report</span>
            </Link>
          </div>
        </div>

        {/* WhatsApp Automated Alerts Summary */}
        <div className="p-6 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-gym-border space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp Automation Engine</span>
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Idempotent &amp; Active
              </span>
            </div>
            <p className="text-xs text-gym-muted mt-0.5">Automated expiry alerts, fee dues & instant payment receipts</p>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gym-surface/60 border border-gym-border text-xs">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Payment Receipt Confirmation
                </span>
                <span className="text-emerald-400 font-mono font-semibold">Instant on Pay</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gym-surface/60 border border-gym-border text-xs">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Membership Expiry Reminder (7 Days)
                </span>
                <span className="text-slate-400 font-mono">Daily 09:00 AM IST</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gym-surface/60 border border-gym-border text-xs">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  Birthday & Welcome Greetings
                </span>
                <span className="text-slate-400 font-mono">Automated</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gym-border/60">
            <Link
              href="/whatsapp"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-emerald-600/20"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Configure WhatsApp Templates & Logs</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
