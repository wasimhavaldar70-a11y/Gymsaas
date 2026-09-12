"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Settings2,
  Calendar,
  IndianRupee,
  Users,
  Sparkles,
  X,
  Play,
  ShieldCheck,
  Smartphone,
  ExternalLink
} from "lucide-react";
import { fetchApi } from "../../lib/api-client";
import { Member, PaginatedResult } from "@gymcare/shared";

interface WhatsAppDashboardData {
  messages_sent_today: number;
  messages_pending_today: number;
  messages_failed_today: number;
  total_messages_all_time: number;
  categories: {
    payment_receipts: number;
    payment_dues: number;
    expiry_reminders: number;
    renewals: number;
    birthdays: number;
    custom: number;
  };
}

interface WhatsAppLog {
  id: string;
  member_id?: string;
  message_type: string;
  recipient: string;
  provider: string;
  provider_message_id?: string;
  message_body: string;
  status: "QUEUED" | "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  failure_reason?: string;
  sent_at?: string;
  created_at: string;
  members?: { first_name: string; last_name: string };
}

interface WhatsAppTemplate {
  id: string;
  event_type: string;
  template_body: string;
  variables: any;
  is_active: boolean;
  created_at: string;
}

export default function WhatsAppAlertsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"logs" | "templates" | "rules">("logs");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [automationNotice, setAutomationNotice] = useState<string | null>(null);

  // Form state for manual send
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("PAYMENT_RECEIPT");
  const [customMessage, setCustomMessage] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  // 1. Fetch Dashboard Metrics
  const { data: metricsData, isLoading: loadingMetrics, refetch: refetchMetrics } = useQuery<{ success: boolean; data: WhatsAppDashboardData }>({
    queryKey: ["whatsapp-metrics"],
    queryFn: () => fetchApi<{ success: boolean; data: WhatsAppDashboardData }>("/notifications/whatsapp/dashboard"),
    refetchInterval: 10_000
  });

  // 2. Fetch Delivery Logs
  const { data: logsData, isLoading: loadingLogs, refetch: refetchLogs } = useQuery<{ success: boolean; data: WhatsAppLog[] }>({
    queryKey: ["whatsapp-logs", statusFilter],
    queryFn: () => fetchApi<{ success: boolean; data: WhatsAppLog[] }>(`/notifications/whatsapp/logs?status=${statusFilter}&limit=100`),
    refetchInterval: 8_000
  });

  // 3. Fetch Notification Templates
  const { data: templatesData, isLoading: loadingTemplates } = useQuery<{ success: boolean; data: WhatsAppTemplate[] }>({
    queryKey: ["whatsapp-templates"],
    queryFn: () => fetchApi<{ success: boolean; data: WhatsAppTemplate[] }>("/notifications/whatsapp/templates")
  });

  // 4. Fetch Members for manual send picker
  const { data: membersResult } = useQuery<PaginatedResult<Member>>({
    queryKey: ["members-picker"],
    queryFn: () => fetchApi<PaginatedResult<Member>>("/members?page_size=100")
  });

  // Automation Runner Mutation
  const runAutomationMutation = useMutation({
    mutationFn: () =>
      fetchApi<{ success: boolean; message: string; data: { sent_count: number; skipped_count: number } }>(
        "/notifications/whatsapp/run-automation",
        { method: "POST" }
      ),
    onSuccess: (res) => {
      setAutomationNotice(res.message || "Automation runner completed successfully.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
      setTimeout(() => setAutomationNotice(null), 7000);
    },
    onError: (err: any) => {
      setAutomationNotice(`Error running automation: ${err.message || "Failed"}`);
    }
  });

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi("/notifications/whatsapp/send", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      setIsSendModalOpen(false);
      setRecipientPhone("");
      setCustomMessage("");
      setSelectedMemberId("");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-metrics"] });
    },
    onError: (err: any) => {
      setSendError(err.message || "Failed to send WhatsApp message.");
    }
  });

  // Template Update Mutation
  const updateTemplateMutation = useMutation({
    mutationFn: (tpl: { id: string; template_body: string; is_active: boolean }) =>
      fetchApi(`/notifications/whatsapp/templates/${tpl.id}`, {
        method: "PUT",
        body: JSON.stringify({
          template_body: tpl.template_body,
          is_active: tpl.is_active
        })
      }),
    onSuccess: () => {
      setEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    }
  });

  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId);
    const m = (membersResult?.data || []).find((x) => x.id === memberId);
    if (m) {
      setRecipientPhone(m.mobile);
    }
  };

  const handleSendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone.trim()) {
      setSendError("Recipient phone number is required.");
      return;
    }

    setSendError(null);
    sendMessageMutation.mutate({
      recipient_phone: recipientPhone.trim(),
      member_id: selectedMemberId || undefined,
      event_type: selectedEventType,
      custom_message: customMessage.trim() || undefined,
      variables: {
        member_name: (membersResult?.data || []).find((x) => x.id === selectedMemberId)?.first_name || "Member",
        amount: "2,500",
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        plan_name: "Fitness Pro"
      }
    });
  };

  const metrics = metricsData?.data;
  const logs = (logsData?.data || []).filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.recipient.toLowerCase().includes(q) ||
      l.message_body.toLowerCase().includes(q) ||
      l.message_type.toLowerCase().includes(q) ||
      (l.members && `${l.members.first_name} ${l.members.last_name}`.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Meta Cloud &amp; Twilio Engine Active
            </span>
            <span className="text-xs font-mono text-slate-400 bg-gym-card px-2 py-0.5 rounded-full border border-gym-border">
              Idempotency Protected
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            <span>WhatsApp Alerts &amp; Automated CRM</span>
          </h1>
          <p className="text-xs text-gym-muted mt-0.5">
            Automated payment receipts, membership expiry warnings, and member retention messaging.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => runAutomationMutation.mutate()}
            disabled={runAutomationMutation.isPending}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gym-card hover:bg-gym-cardHover border border-gym-border text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            title="Scan upcoming expiries and dispatch reminders"
          >
            {runAutomationMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Play className="w-4 h-4 text-emerald-400" />
            )}
            <span>Run Automation Now</span>
          </button>

          <button
            onClick={() => {
              setSendError(null);
              setIsSendModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Send Alert / Message</span>
          </button>
        </div>
      </div>

      {/* Automation Execution Notice */}
      {automationNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{automationNotice}</span>
          </div>
          <button onClick={() => setAutomationNotice(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 TOP METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gym-muted uppercase tracking-wider">Sent Today</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {loadingMetrics ? "..." : metrics?.messages_sent_today ?? 0}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            <span>Delivered via WhatsApp Gateway</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gym-muted uppercase tracking-wider">Pending / Queued</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {loadingMetrics ? "..." : metrics?.messages_pending_today ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">In provider queue</div>
        </div>

        <div className="p-4 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-red-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gym-muted uppercase tracking-wider">Failed / Rejected</span>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {loadingMetrics ? "..." : metrics?.messages_failed_today ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Non-WhatsApp or invalid mobile</div>
        </div>

        <div className="p-4 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-blue-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gym-muted uppercase tracking-wider">Total Lifetime</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {loadingMetrics ? "..." : metrics?.total_messages_all_time ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">All broadcast &amp; auto-alerts</div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-gym-border pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "logs"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Delivery Logs
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "templates"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Message Templates
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "rules"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Automation Rules
        </button>
      </div>

      {/* TAB 1: DELIVERY LOGS */}
      {activeTab === "logs" && (
        <div className="rounded-2xl bg-gym-card/60 border border-gym-border overflow-hidden space-y-4">
          {/* Table Search & Filter Bar */}
          <div className="p-4 border-b border-gym-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gym-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search member, phone number, or alert content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-gym-surface border border-gym-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gym-surface border border-gym-border text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="DELIVERED">Delivered</option>
                <option value="READ">Read</option>
                <option value="QUEUED">Queued</option>
                <option value="FAILED">Failed</option>
              </select>
              <button
                onClick={() => refetchLogs()}
                className="p-2 rounded-xl bg-gym-surface hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Refresh Logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {loadingLogs ? (
            <div className="py-16 text-center text-xs text-gym-muted">Loading WhatsApp message ledger...</div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-400">No WhatsApp message logs recorded yet.</div>
              <p className="text-xs text-gym-muted">Trigger an instant test message or collect a member payment to see live delivery.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-gym-surface/80 border-b border-gym-border text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Recipient / Member</th>
                    <th className="px-5 py-3">Alert Type</th>
                    <th className="px-5 py-3">Message Content</th>
                    <th className="px-5 py-3">Provider</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Sent Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gym-border/60">
                  {logs.map((log) => {
                    const statusColors = {
                      SENT: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                      DELIVERED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                      READ: "bg-purple-500/20 text-purple-400 border-purple-500/30",
                      QUEUED: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                      SENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                      FAILED: "bg-red-500/20 text-red-400 border-red-500/30"
                    };
                    const badgeClass = statusColors[log.status] || "bg-slate-800 text-slate-300";

                    return (
                      <tr key={log.id} className="hover:bg-gym-cardHover/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-white">
                            {log.members ? `${log.members.first_name} ${log.members.last_name}` : "Direct Contact"}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">{log.recipient}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-[10px] border border-gym-border uppercase font-semibold">
                            {log.message_type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 max-w-md">
                          <div className="text-xs text-slate-300 line-clamp-2" title={log.message_body}>
                            {log.message_body}
                          </div>
                          {log.failure_reason && (
                            <div className="text-[10px] text-red-400 mt-0.5">{log.failure_reason}</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400">
                          {log.provider}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badgeClass}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-[11px] text-slate-400">
                          {new Date(log.created_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short"
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MESSAGE TEMPLATES */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(templatesData?.data || []).map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-gym-border flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    {tpl.event_type.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      tpl.is_active
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {tpl.is_active ? "Active" : "Disabled"}
                  </span>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-gym-surface border border-gym-border text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                  {tpl.template_body}
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {(Array.isArray(tpl.variables) ? tpl.variables : []).map((v: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-gym-bg border border-gym-border text-[10px] font-mono text-amber-400"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-gym-border flex items-center justify-between text-xs">
                <button
                  onClick={() => setEditingTemplate(tpl)}
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  Edit Template Text
                </button>
                <button
                  onClick={() =>
                    updateTemplateMutation.mutate({
                      id: tpl.id,
                      template_body: tpl.template_body,
                      is_active: !tpl.is_active
                    })
                  }
                  className="text-slate-400 hover:text-white"
                >
                  {tpl.is_active ? "Disable Automation" : "Enable Automation"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: AUTOMATION RULES & SCHEDULE */}
      {activeTab === "rules" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-gym-border space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Automated Notification Schedule</span>
            </h2>
            <p className="text-xs text-gym-muted">
              Scheduled CRON tasks run daily in Asia/Kolkata timezone to scan memberships and dispatch reminders.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-gym-surface/80 border border-gym-border space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Expiry Warning (7 Days Prior)</span>
                  <span className="font-mono text-[11px] text-emerald-400">Daily 09:00 AM IST</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Sends renewal reminder with gym fee payment options and branch desk instructions.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gym-surface/80 border border-gym-border space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Final Expiry Notice (1 Day Prior)</span>
                  <span className="font-mono text-[11px] text-emerald-400">Daily 09:00 AM IST</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Alerts the member that access will freeze tomorrow unless renewed.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gym-surface/80 border border-gym-border space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Instant Payment Receipt</span>
                  <span className="font-mono text-[11px] text-cyan-400">Realtime on Payment</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Non-blocking instant delivery with invoice number, amount paid, and balance due.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gym-card/60 backdrop-blur-md border border-gym-border space-y-4 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Idempotency &amp; Anti-Spam Guarantee</span>
              </h2>
              <p className="text-xs text-gym-muted mt-0.5">
                Mathematical assurance that members are never sent duplicate reminders.
              </p>

              <div className="mt-4 space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                  <div>
                    <span className="font-semibold text-white">Unique Key Indexing: </span>
                    Every reminder creates a unique idempotency key: <code className="text-amber-400 font-mono text-[11px]">EXPIRY-&#123;id&#125;-&#123;date&#125;</code>. Repeated executions immediately skip duplicate records.
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gym-surface/80 border border-gym-border flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0"></div>
                  <div>
                    <span className="font-semibold text-white">Zero-Lag Checkout: </span>
                    Fee collections at reception desk complete instantly. WhatsApp notification dispatches asynchronously in the background so slow cellular networks never block billing.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gym-border">
              <button
                onClick={() => runAutomationMutation.mutate()}
                disabled={runAutomationMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-gym-cardHover hover:bg-slate-800 text-white border border-gym-border py-2.5 rounded-xl text-xs font-semibold transition-all"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Test Idempotent Automation Trigger</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SEND WHATSAPP MESSAGE */}
      {isSendModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-surface border border-gym-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gym-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                <span>Send WhatsApp Notification</span>
              </h2>
              <button
                onClick={() => setIsSendModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gym-card text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sendError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium">
                {sendError}
              </div>
            )}

            <form onSubmit={handleSendSubmit} className="space-y-4 text-xs">
              {/* Member Selector */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Select Member (Optional)</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleMemberSelect(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Manual Mobile Number / Custom Recipient --</option>
                  {(membersResult?.data || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} ({m.mobile})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Recipient Mobile Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 9876543210"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gym-bg border border-gym-border text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Notification Type</label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="PAYMENT_RECEIPT">Payment Receipt Confirmation</option>
                  <option value="PAYMENT_DUE">Payment Due Reminder</option>
                  <option value="EXPIRY_REMINDER_7">Membership Expiry (7 Days)</option>
                  <option value="WELCOME">Welcome to Gym</option>
                  <option value="CUSTOM">Custom Message</option>
                </select>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Custom Message Text (Leave blank to use default template)
                </label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type a custom WhatsApp message or use template..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-gym-card hover:bg-gym-cardHover text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendMessageMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {sendMessageMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Dispatch WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT TEMPLATE */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-surface border border-gym-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gym-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>Edit Template: {editingTemplate.event_type}</span>
              </h2>
              <button
                onClick={() => setEditingTemplate(null)}
                className="p-1.5 rounded-lg hover:bg-gym-card text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Template Body</label>
                <textarea
                  rows={5}
                  value={editingTemplate.template_body}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      template_body: e.target.value
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tpl_active"
                  checked={editingTemplate.is_active}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      is_active: e.target.checked
                    })
                  }
                  className="rounded bg-gym-bg border-gym-border text-emerald-500 focus:ring-0"
                />
                <label htmlFor="tpl_active" className="text-white font-medium cursor-pointer">
                  Template is Active for Automated Sending
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 rounded-xl bg-gym-card hover:bg-gym-cardHover text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateTemplateMutation.isPending}
                onClick={() =>
                  updateTemplateMutation.mutate({
                    id: editingTemplate.id,
                    template_body: editingTemplate.template_body,
                    is_active: editingTemplate.is_active
                  })
                }
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {updateTemplateMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Template</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
