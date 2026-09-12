"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  UserX,
  CreditCard,
  UserPlus,
  RefreshCw
} from "lucide-react";
import { fetchApi, ApiError } from "../../lib/api-client";
import Link from "next/link";

export default function ReceptionDeskPage() {
  const [queryInput, setQueryInput] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "warning" | "error";
    message: string;
    member?: any;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);

  // Query tenant branches dynamically (FIX-UX-001)
  const { data: branches } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["branches"],
    queryFn: () => fetchApi<{ id: string; name: string }[]>("/branches")
  });

  const getOfflineQueue = (): { identifier: string; branchId: string; timestamp: string }[] => {
    if (typeof window === "undefined") return [];
    try {
      const q = localStorage.getItem("gymcare_offline_attendance");
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  };

  const saveOfflineQueue = (items: { identifier: string; branchId: string; timestamp: string }[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("gymcare_offline_attendance", JSON.stringify(items));
      setOfflineQueueCount(items.length);
    } catch {}
  };

  const syncOfflineQueue = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    let synced = 0;
    const remaining: typeof queue = [];

    for (const item of queue) {
      try {
        await fetchApi("/attendance/check-in", {
          method: "POST",
          body: JSON.stringify({
            branch_id: item.branchId,
            member_identifier: item.identifier,
            method: "SEARCH"
          })
        });
        synced++;
      } catch (err: any) {
        if (err.status === 409 || err.message?.includes("already")) {
          synced++;
        } else {
          remaining.push(item);
        }
      }
    }

    saveOfflineQueue(remaining);
    if (synced > 0) {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setFeedback({
        type: "success",
        message: `Network restored: Successfully synced ${synced} offline check-in record(s).`
      });
    }
  };

  useEffect(() => {
    searchInputRef.current?.focus();
    setOfflineQueueCount(getOfflineQueue().length);

    const handleOnline = () => {
      syncOfflineQueue();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // Fetch today's live attendee roster
  const { data: todayAttendance, isLoading: loadingAttendance, refetch } = useQuery<{
    data: any[];
    count: number;
    date: string;
  }>({
    queryKey: ["attendance-today"],
    queryFn: () => fetchApi<{ data: any[]; count: number; date: string }>("/attendance/today"),
    refetchInterval: 10_000 // Refresh every 10s or upon mutations
  });

  // Check-in Mutation with Offline Fallback (FIX-SYNC-001)
  const checkInMutation = useMutation({
    mutationFn: async (memberIdentifier: string) => {
      const savedBranch = typeof window !== "undefined" ? localStorage.getItem("gymcare_selected_branch") : null;
      const activeBranchId = savedBranch && savedBranch !== "all" ? savedBranch : (branches?.[0]?.id || "");

      // If browser is offline, queue locally immediately
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const queue = getOfflineQueue();
        queue.push({
          identifier: memberIdentifier,
          branchId: activeBranchId,
          timestamp: new Date().toISOString()
        });
        saveOfflineQueue(queue);
        return {
          already_checked_in: false,
          offline_queued: true,
          message: `Offline: Check-in queued locally for ${memberIdentifier}. Will auto-sync when online.`,
          data: null
        };
      }

      try {
        return await fetchApi<{
          already_checked_in: boolean;
          offline_queued?: boolean;
          message: string;
          data: any;
        }>("/attendance/check-in", {
          method: "POST",
          body: JSON.stringify({
            branch_id: activeBranchId,
            member_identifier: memberIdentifier,
            method: "SEARCH"
          })
        });
      } catch (err: any) {
        // Network disconnection during fetch: queue locally
        if (err.code === "NETWORK_ERROR" || !navigator.onLine) {
          const queue = getOfflineQueue();
          queue.push({
            identifier: memberIdentifier,
            branchId: activeBranchId,
            timestamp: new Date().toISOString()
          });
          saveOfflineQueue(queue);
          return {
            already_checked_in: false,
            offline_queued: true,
            message: `Network offline: Check-in queued for ${memberIdentifier}. Will auto-sync when online.`,
            data: null
          };
        }
        throw err;
      }
    },
    onSuccess: (res: any) => {
      if (res.offline_queued) {
        setFeedback({
          type: "warning",
          message: res.message
        });
      } else if (res.already_checked_in) {
        setFeedback({
          type: "warning",
          message: res.message,
          member: res.data?.member
        });
      } else {
        setFeedback({
          type: "success",
          message: res.message,
          member: res.data?.member
        });
      }
      setQueryInput("");
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      searchInputRef.current?.focus();
    },
    onError: (err: ApiError) => {
      setFeedback({
        type: "error",
        message: err.message || "Failed to mark attendance. Verify member ID or phone."
      });
      searchInputRef.current?.focus();
    }
  });

  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    checkInMutation.mutate(queryInput.trim());
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner with Reception Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gym-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gym-red/20 text-gym-red">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Reception Check-In Desk</h1>
              <p className="text-xs text-gym-muted">Fast barcode/QR scanner gun, Member ID, or Phone Search</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="px-4 py-2 rounded-xl bg-gym-card border border-gym-border text-center flex-1 sm:flex-initial">
            <div className="text-[10px] text-gym-muted uppercase font-bold tracking-wider">Today Checked In</div>
            <div className="text-xl font-mono font-black text-cyan-400">{todayAttendance?.count ?? 0}</div>
          </div>

          {offlineQueueCount > 0 && (
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center flex-1 sm:flex-initial animate-pulse">
              <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Offline Queued</div>
              <div className="text-xl font-mono font-black text-amber-400">{offlineQueueCount}</div>
            </div>
          )}

          <Link
            href="/members?action=new"
            className="flex items-center gap-2 bg-gym-card hover:bg-gym-cardHover text-white border border-gym-border px-4 py-2.5 rounded-xl text-xs font-semibold"
          >
            <UserPlus className="w-4 h-4 text-gym-emerald" />
            <span>New Member</span>
          </Link>
        </div>
      </div>

      {/* RAPID CHECK-IN SCANNER BOX */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-b from-gym-card to-gym-surface border-2 border-gym-red/40 shadow-2xl shadow-red-950/20">
        <form onSubmit={handleCheckInSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-300">
            Quick Scan / Member ID / Mobile Number:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Scan QR or enter MEM-0001 / +919822... (Press Enter)"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gym-bg border-2 border-gym-border text-white text-base md:text-lg font-mono focus:border-gym-red focus:outline-none placeholder:text-slate-600 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={checkInMutation.isPending || !queryInput.trim()}
              className="px-8 py-4 bg-gym-red hover:bg-gym-redHover disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/30 text-base md:text-lg flex items-center justify-center gap-2 shrink-0"
            >
              {checkInMutation.isPending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  <span>Check In Member</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Realtime Feedback Card */}
        {feedback && (
          <div
            className={`mt-6 p-4 rounded-2xl border flex items-start gap-4 transition-all ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : feedback.type === "warning"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {feedback.type === "success" && <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />}
            {feedback.type === "warning" && <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />}
            {feedback.type === "error" && <UserX className="w-6 h-6 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm md:text-base">{feedback.message}</div>
              {feedback.member && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <span className="font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 font-bold">
                    {feedback.member.member_id}
                  </span>
                  <span>{feedback.member.name}</span>
                  {feedback.member.plan_name && (
                    <span className="text-slate-400">Plan: {feedback.member.plan_name}</span>
                  )}
                  {feedback.member.membership_status && (
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        feedback.member.membership_status === "ACTIVE"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : feedback.member.membership_status === "EXPIRING_SOON"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {feedback.member.membership_status}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TODAY'S LIVE ATTENDEE ROSTER */}
      <div className="p-6 rounded-2xl bg-gym-card/60 border border-gym-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Today's Live Check-Ins</h2>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg bg-gym-surface hover:bg-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {loadingAttendance ? (
          <div className="text-center py-12 text-sm text-gym-muted">Loading live attendance roster...</div>
        ) : (todayAttendance?.data || []).length === 0 ? (
          <div className="text-center py-12 text-sm text-gym-muted border border-dashed border-gym-border/60 rounded-xl">
            No check-ins recorded yet today. Use the search bar above to check in arriving members!
          </div>
        ) : (
          <div className="divide-y divide-gym-border/60 overflow-hidden">
            {todayAttendance?.data.map((record) => {
              const checkInTime = new Date(record.check_in).toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div key={record.id} className="py-3.5 flex items-center justify-between gap-4 hover:bg-gym-cardHover/50 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-gym-border flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {record.members?.first_name?.[0] || "M"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="truncate">{record.members?.first_name} {record.members?.last_name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gym-border text-slate-300 font-normal">
                          {record.members?.member_id}
                        </span>
                      </div>
                      <div className="text-xs text-gym-muted flex items-center gap-2 mt-0.5">
                        <span>{record.members?.mobile}</span>
                        <span>•</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">{record.method}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-bold text-cyan-400">{checkInTime}</div>
                    <div className="text-[10px] text-slate-500 font-mono">IST (Asia/Kolkata)</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
