"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Phone,
  Search,
  CheckCircle2,
  Filter,
  ArrowRight,
  X,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { fetchApi } from "../../lib/api-client";
import { Lead, LeadStatus } from "@gymcare/shared";

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    source: "WALK_IN",
    notes: ""
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Leads
  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["leads", statusFilter, searchTerm],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchTerm) params.set("search", searchTerm);
      return fetchApi<Lead[]>(`/leads?${params.toString()}`);
    }
  });

  // Query tenant branches dynamically (FIX-UX-001)
  const { data: branches } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["branches"],
    queryFn: () => fetchApi<{ id: string; name: string }[]>("/branches")
  });

  // Create Lead Mutation
  const createLeadMutation = useMutation({
    mutationFn: (newLead: any) => {
      const savedBranch = typeof window !== "undefined" ? localStorage.getItem("gymcare_selected_branch") : null;
      const activeBranchId = savedBranch && savedBranch !== "all" ? savedBranch : (branches?.[0]?.id || "");

      return fetchApi("/leads", {
        method: "POST",
        body: JSON.stringify({
          branch_id: activeBranchId,
          ...newLead
        })
      });
    },
    onSuccess: () => {
      setIsAddLeadOpen(false);
      setFormData({ name: "", mobile: "", email: "", source: "WALK_IN", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create lead.");
    }
  });

  // Convert Lead Mutation
  const convertMutation = useMutation({
    mutationFn: (leadId: string) =>
      fetchApi(`/leads/${leadId}/convert`, {
        method: "POST"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    }
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) {
      setFormError("Name and mobile are required");
      return;
    }
    createLeadMutation.mutate(formData);
  };

  const leadsList = leads || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-gym-amber" />
            <span>Leads CRM & Inquiries</span>
          </h1>
          <p className="text-xs text-gym-muted mt-0.5">
            Capture prospective walk-ins, follow-up calls, trials, and 1-click convert to members.
          </p>
        </div>

        <button
          onClick={() => setIsAddLeadOpen(true)}
          className="flex items-center gap-2 bg-gym-red hover:bg-gym-redHover text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-red-500/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Lead</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="p-4 rounded-2xl bg-gym-card/60 border border-gym-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search lead by name or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gym-bg border border-gym-border text-xs md:text-sm text-white focus:outline-none focus:border-gym-red"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["ALL", "NEW", "CONTACTED", "FOLLOW_UP", "TRIAL", "CONVERTED", "LOST"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === s
                  ? "bg-gym-red text-white shadow-md shadow-red-500/20"
                  : "bg-gym-surface text-slate-400 hover:text-white"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* LEADS LIST */}
      <div className="rounded-2xl bg-gym-card/60 border border-gym-border overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gym-muted">Loading leads...</div>
        ) : leadsList.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Sparkles className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-400">No leads found in this stage.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-gym-surface/80 border-b border-gym-border text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Mobile</th>
                  <th className="px-6 py-3.5">Source</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Convert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border/60">
                {leadsList.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gym-cardHover/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{lead.name}</td>
                    <td className="px-6 py-4 font-mono text-slate-300">{lead.mobile}</td>
                    <td className="px-6 py-4 text-slate-400">{lead.source || "Walk-In"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          lead.status === "CONVERTED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : lead.status === "LOST"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(lead.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {lead.status !== "CONVERTED" ? (
                        <button
                          onClick={() => convertMutation.mutate(lead.id)}
                          disabled={convertMutation.isPending}
                          className="px-3 py-1.5 rounded-xl bg-gym-surface hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 ml-auto"
                        >
                          <span>Convert to Member</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Member</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD LEAD MODAL */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-surface border border-gym-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gym-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-gym-amber" />
                <span>Add New Inquiry / Lead</span>
              </h2>
              <button
                onClick={() => setIsAddLeadOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gym-card text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Anand Kulkarni"
                  className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Indian Mobile (+91) *</label>
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="e.g. 9822099999"
                  className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white font-mono focus:outline-none focus:border-gym-red"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                >
                  <option value="WALK_IN">Walk-In</option>
                  <option value="INSTAGRAM">Instagram / Social Media</option>
                  <option value="GOOGLE">Google Search / Maps</option>
                  <option value="REFERRAL">Member Referral</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Inquired about 3-month weight loss plan..."
                  className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddLeadOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gym-border text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLeadMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-gym-red hover:bg-gym-redHover text-white font-semibold flex items-center gap-1.5"
                >
                  {createLeadMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Save Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
