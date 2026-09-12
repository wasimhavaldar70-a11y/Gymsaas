"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  UserPlus,
  QrCode,
  Calendar,
  Phone,
  Filter,
  CheckCircle2,
  X,
  RefreshCw,
  Eye,
  CreditCard,
  Building
} from "lucide-react";
import { fetchApi } from "../../lib/api-client";
import { Member, PaginatedResult } from "@gymcare/shared";
import Link from "next/link";

export default function MembersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const queryClient = useQueryClient();

  // Form states for New Member
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    gender: "MALE",
    mobile: "",
    email: "",
    city: "Kolhapur",
    joining_date: new Date().toISOString().split("T")[0],
    notes: ""
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch paginated members list
  const { data: memberResult, isLoading, refetch } = useQuery<PaginatedResult<Member>>({
    queryKey: ["members", searchTerm, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      return fetchApi<PaginatedResult<Member>>(`/members?${params.toString()}`);
    }
  });

  // Query branches dynamically (FIX-UX-001)
  const { data: branches } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["branches"],
    queryFn: () => fetchApi<{ id: string; name: string }[]>("/branches")
  });

  // Create member mutation
  const createMemberMutation = useMutation({
    mutationFn: (newMember: any) => {
      const savedBranch = typeof window !== "undefined" ? localStorage.getItem("gymcare_selected_branch") : null;
      const activeBranchId = savedBranch && savedBranch !== "all" ? savedBranch : (branches?.[0]?.id || "");

      return fetchApi<Member>("/members", {
        method: "POST",
        body: JSON.stringify({
          branch_id: activeBranchId,
          ...newMember
        })
      });
    },
    onSuccess: (member) => {
      setIsNewMemberModalOpen(false);
      setFormData({
        first_name: "",
        last_name: "",
        gender: "MALE",
        mobile: "",
        email: "",
        city: "Kolhapur",
        joining_date: new Date().toISOString().split("T")[0],
        notes: ""
      });
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setSelectedMember(member);
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create member. Ensure valid Indian mobile.");
    }
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.first_name || !formData.last_name || !formData.mobile) {
      setFormError("First name, last name, and mobile are required.");
      return;
    }
    createMemberMutation.mutate(formData);
  };

  const members = memberResult?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-gym-red" />
            <span>Member CRM Directory</span>
          </h1>
          <p className="text-xs text-gym-muted mt-0.5">
            Manage gym members, membership states, and individual profiles.
          </p>
        </div>

        <button
          onClick={() => setIsNewMemberModalOpen(true)}
          className="flex items-center gap-2 bg-gym-red hover:bg-gym-redHover text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-red-500/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Member</span>
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="p-4 rounded-2xl bg-gym-card/60 border border-gym-border flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, mobile, or MEM-0001..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gym-bg border border-gym-border text-xs md:text-sm text-white focus:outline-none focus:border-gym-red"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {["ALL", "ACTIVE", "EXPIRING_SOON", "EXPIRED", "LEAD"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab
                  ? "bg-gym-red text-white shadow-md shadow-red-500/20"
                  : "bg-gym-surface text-slate-400 hover:text-white"
              }`}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* MEMBER TABLE */}
      <div className="rounded-2xl bg-gym-card/60 border border-gym-border overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gym-muted">Loading members list...</div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-400">No members found matching your search.</div>
            <button
              onClick={() => setIsNewMemberModalOpen(true)}
              className="text-xs text-gym-red hover:underline font-semibold"
            >
              Register a new member now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-gym-surface/80 border-b border-gym-border text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Member</th>
                  <th className="px-6 py-3.5">Mobile</th>
                  <th className="px-6 py-3.5">Branch</th>
                  <th className="px-6 py-3.5">Active Plan</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border/60">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gym-cardHover/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-gym-border flex items-center justify-center font-bold text-xs text-white">
                          {member.first_name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">{member.member_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">{member.mobile}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {member.branch_name || "Kolhapur Central"}
                    </td>
                    <td className="px-6 py-4">
                      {member.active_membership ? (
                        <span className="text-slate-300 font-medium">{member.active_membership.plan_name}</span>
                      ) : (
                        <span className="text-slate-500 italic">No plan assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          member.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : member.status === "FREEZED"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : member.status === "LEAD"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedMember(member)}
                        className="p-1.5 rounded-lg bg-gym-surface hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                        title="View Member 360"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW MEMBER MODAL */}
      {isNewMemberModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-surface border border-gym-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gym-border pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-gym-red" />
                <span>Register New Member</span>
              </h2>
              <button
                onClick={() => setIsNewMemberModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gym-card text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="e.g. Rahul"
                    className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="e.g. Patil"
                    className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Indian Mobile (+91) *</label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="e.g. 9822012345"
                    className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white font-mono focus:outline-none focus:border-gym-red"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. rahul@gmail.com"
                    className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Joining Date</label>
                <input
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gym-border text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMemberMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-gym-red hover:bg-gym-redHover text-white font-semibold flex items-center gap-1.5"
                >
                  {createMemberMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Save Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMBER 360 MODAL */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-surface border border-gym-border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gym-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-gym-border flex items-center justify-center font-bold text-sm text-white">
                  {selectedMember.first_name[0]}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {selectedMember.first_name} {selectedMember.last_name}
                  </h2>
                  <div className="font-mono text-xs text-slate-400">{selectedMember.member_id}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-1.5 rounded-lg hover:bg-gym-card text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-gym-card border border-gym-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mobile:</span>
                  <span className="font-mono font-bold text-white">{selectedMember.mobile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-emerald-400">{selectedMember.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Joining Date:</span>
                  <span className="text-slate-300">{selectedMember.joining_date}</span>
                </div>
              </div>

              {/* QR Code Card */}
              <div className="p-4 rounded-2xl bg-gym-bg border border-gym-border text-center space-y-2">
                <div className="text-[11px] font-bold text-slate-300">Reception Check-In QR Pass</div>
                <div className="w-32 h-32 bg-white rounded-xl mx-auto flex items-center justify-center p-2 shadow-inner">
                  {/* High contrast QR code mock/preview token */}
                  <QrCode className="w-24 h-24 text-black" />
                </div>
                <div className="font-mono text-[10px] text-slate-500 break-all">{selectedMember.qr_token}</div>
              </div>
            </div>

            <div className="pt-2 flex justify-between gap-3">
              <Link
                href={`/billing?action=collect&member_id=${selectedMember.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-gym-red hover:bg-gym-redHover text-white py-2 rounded-xl text-xs font-semibold"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Renew / Bill Plan</span>
              </Link>
              <button
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 rounded-xl border border-gym-border text-slate-300 hover:text-white text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
