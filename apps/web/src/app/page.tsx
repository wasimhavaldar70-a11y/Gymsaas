"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  CalendarCheck,
  TrendingUp,
  IndianRupee,
  Clock,
  AlertTriangle,
  QrCode,
  UserPlus,
  Receipt,
  ArrowUpRight,
  ShieldCheck
} from "lucide-react";
import { fetchApi } from "../lib/api-client";
import { DashboardMetrics } from "@gymcare/shared";

export default function DashboardPage() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics"],
    queryFn: () => fetchApi<DashboardMetrics>("/dashboard/metrics"),
    refetchInterval: 15_000 // Refreshes every 15s or on realtime events
  });

  const stats = [
    {
      label: "Total Members",
      value: isLoading ? "..." : metrics?.total_members ?? 0,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      label: "Active Members",
      value: isLoading ? "..." : metrics?.active_members ?? 0,
      icon: UserCheck,
      color: "text-gym-emerald",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    {
      label: "Today's Attendance",
      value: isLoading ? "..." : metrics?.today_attendance ?? 0,
      icon: CalendarCheck,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20"
    },
    {
      label: "Today's Collection",
      value: isLoading ? "..." : `₹${(metrics?.today_collection ?? 0).toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-gym-emerald",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    {
      label: "Monthly Revenue",
      value: isLoading ? "..." : `₹${(metrics?.monthly_revenue ?? 0).toLocaleString("en-IN")}`,
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    {
      label: "Expiring in 7 Days",
      value: isLoading ? "..." : metrics?.expiring_in_7_days ?? 0,
      icon: AlertTriangle,
      color: "text-gym-amber",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>IronPulse Management Dashboard</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sync
            </span>
          </h1>
          <p className="text-sm text-gym-muted mt-1">
            Real-time gym operations, reception check-in feed and GST financial analytics.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <Link
            href="/reception"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gym-red hover:bg-gym-redHover text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-red-500/25 transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Reception Desk</span>
          </Link>

          <Link
            href="/members?action=new"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gym-card hover:bg-gym-cardHover border border-gym-border text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            <UserPlus className="w-4 h-4 text-gym-emerald" />
            <span>Add Member</span>
          </Link>

          <Link
            href="/billing?action=collect"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gym-card hover:bg-gym-cardHover border border-gym-border text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            <Receipt className="w-4 h-4 text-gym-amber" />
            <span>Collect Fee</span>
          </Link>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl bg-gym-card/60 backdrop-blur-md border ${stat.border} hover:bg-gym-cardHover transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gym-muted uppercase tracking-wider">{stat.label}</span>
                <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-white mt-2 tracking-tight">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* RECEPTION LIVE MONITOR & TREND CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-gym-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>7-Day Attendance Activity</span>
              </h2>
              <p className="text-xs text-gym-muted">Daily member check-in frequency</p>
            </div>
            <Link href="/attendance" className="text-xs text-gym-red hover:underline flex items-center gap-1 font-semibold">
              <span>View Full Log</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
            {(metrics?.charts?.attendance_trend || [
              { date: "Mon", count: 42 },
              { date: "Tue", count: 50 },
              { date: "Wed", count: 38 },
              { date: "Thu", count: 48 },
              { date: "Fri", count: 54 },
              { date: "Sat", count: 62 },
              { date: "Sun", count: 30 }
            ]).map((point, i) => {
              const maxVal = 70;
              const heightPct = Math.min(100, Math.max(15, (point.count / maxVal) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[11px] font-mono text-slate-400 group-hover:text-white transition-colors">{point.count}</span>
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

        {/* GST & Financial Health Overview */}
        <div className="p-6 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-gym-border space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">GST Billing Overview</h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                18% GST (SAC 999723)
              </span>
            </div>
            <p className="text-xs text-gym-muted mt-0.5">Automated CGST 9% & SGST 9%</p>

            <div className="mt-5 space-y-3">
              <div className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Tax Invoiced (This Month)</span>
                <span className="font-mono font-bold text-white">
                  ₹{Math.round((metrics?.monthly_revenue ?? 0) * 0.1525).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border flex items-center justify-between text-xs">
                <span className="text-slate-400">CGST (9%)</span>
                <span className="font-mono font-bold text-slate-300">
                  ₹{Math.round(((metrics?.monthly_revenue ?? 0) * 0.1525) / 2).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border flex items-center justify-between text-xs">
                <span className="text-slate-400">SGST (9%)</span>
                <span className="font-mono font-bold text-slate-300">
                  ₹{Math.round(((metrics?.monthly_revenue ?? 0) * 0.1525) / 2).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gym-border/60">
            <Link
              href="/billing"
              className="w-full flex items-center justify-center gap-2 bg-gym-cardHover hover:bg-slate-800 text-white border border-gym-border py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <Receipt className="w-3.5 h-3.5 text-gym-emerald" />
              <span>Open Tax Invoices & Receipts</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
