"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  LogIn,
  Sliders,
  DollarSign,
  ChevronRight,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  FileText
} from "lucide-react";

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // New Gym Form State
  const [newGym, setNewGym] = useState({
    name: "",
    slug: "",
    phone: "",
    email: "",
    owner_first_name: "",
    owner_last_name: "",
    owner_mobile: "",
    owner_email: "",
    plan_id: "BUSINESS",
    city: "Kolhapur",
    state: "Maharashtra",
    state_code: "27",
    gstin: "",
    address: "",
    pincode: ""
  });

  const fetchPlatformData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("gymcare_token") || "mock-role-super_admin";

      const [metricsRes, gymsRes] = await Promise.all([
        fetch("http://localhost:4000/api/v1/superadmin/dashboard", {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()),
        fetch(`http://localhost:4000/api/v1/superadmin/gyms?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json())
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data);
      if (gymsRes.success) setGyms(gymsRes.data);
    } catch (err) {
      console.error("Failed to load Super Admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, [statusFilter]);

  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionFeedback(null);

    try {
      const token = localStorage.getItem("gymcare_token") || "mock-role-super_admin";
      const res = await fetch("http://localhost:4000/api/v1/superadmin/gyms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newGym,
          slug: newGym.slug || newGym.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create gym tenant");
      }

      setActionFeedback(`Tenant ${data.data.org_code} (${newGym.name}) created successfully!`);
      setModalOpen(false);
      setNewGym({
        name: "",
        slug: "",
        phone: "",
        email: "",
        owner_first_name: "",
        owner_last_name: "",
        owner_mobile: "",
        owner_email: "",
        plan_id: "BUSINESS",
        city: "Kolhapur",
        state: "Maharashtra",
        state_code: "27",
        gstin: "",
        address: "",
        pincode: ""
      });
      fetchPlatformData();
    } catch (err: any) {
      alert(err.message || "Failed to create gym");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (gymId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (!confirm(`Are you sure you want to set status to ${nextStatus} for this gym?`)) return;

    try {
      const token = localStorage.getItem("gymcare_token") || "mock-role-super_admin";
      const res = await fetch(`http://localhost:4000/api/v1/superadmin/gyms/${gymId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        fetchPlatformData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImpersonate = async (gym: any) => {
    if (!confirm(`Login to "${gym.name}" as Gym Owner? This will initiate an audit-logged impersonation session.`)) return;

    try {
      const token = localStorage.getItem("gymcare_token") || "mock-role-super_admin";
      const res = await fetch("http://localhost:4000/api/v1/superadmin/impersonate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          organization_id: gym.id,
          reason: "Super Admin Platform Support & Inspection"
        })
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem("gymcare_impersonating", "true");
        localStorage.setItem("gymcare_impersonating_org_name", gym.name);
        localStorage.setItem("gymcare_token", data.data.token);
        localStorage.setItem("gymcare_user_role", "GYM_OWNER");
        localStorage.setItem("gymcare_user_email", data.data.target_user.email);
        localStorage.setItem("gymcare_tenant_id", gym.id);
        router.push("/dashboard");
      }
    } catch (err) {
      alert("Failed to initiate impersonation session");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Platform Health */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-gym-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold uppercase">
              SUPER ADMIN GOVERNANCE
            </span>
            <span className="text-xs text-gym-muted">Centralized Multi-Tenant Control Layer</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Platform Operations Hub</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </h1>
          <p className="text-xs text-gym-muted mt-1">
            Logged in as <span className="text-amber-400 font-bold">Wasim Havaldar (Super Admin)</span> &bull; Full administrative authority over all gym owners and tenant databases.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => fetchPlatformData()}
            className="p-2.5 rounded-xl bg-gym-card hover:bg-slate-800 border border-gym-border text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Platform Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 lg:flex-initial flex items-center justify-center gap-2 bg-gym-red hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-red-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Provision New Gym Tenant</span>
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="font-bold text-base">&times;</button>
        </div>
      )}

      {/* =========================================================================
          1. PLATFORM HIGH-LEVEL METRICS (12 KEY METRICS)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        <div className="p-4 rounded-2xl bg-gym-card/80 border border-gym-border">
          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Gyms</div>
          <div className="text-2xl font-black text-white mt-1">{metrics?.total_gyms ?? "..."}</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Platform Organizations</div>
        </div>

        <div className="p-4 rounded-2xl bg-gym-card/80 border border-gym-border">
          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Active Gyms</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{metrics?.active_gyms ?? "..."}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Running Smoothly</div>
        </div>

        <div className="p-4 rounded-2xl bg-gym-card/80 border border-gym-border">
          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Trial Gyms</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{metrics?.trial_gyms ?? "0"}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">14-Day Onboarding</div>
        </div>

        <div className="p-4 rounded-2xl bg-gym-card/80 border border-gym-border">
          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Suspended / Expired</div>
          <div className="text-2xl font-black text-red-400 mt-1">{metrics?.suspended_gyms ?? "0"}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Payment Inactive</div>
        </div>

        <div className="p-4 rounded-2xl bg-gym-card/80 border border-gym-border">
          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Platform Members</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">{metrics?.total_platform_members ?? "..."}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{metrics?.total_active_members ?? 0} Active Athletes</div>
        </div>

        <div className="p-4 rounded-2xl bg-gym-card/80 border border-gym-border">
          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Platform MRR</div>
          <div className="text-2xl font-black text-white mt-1">₹{(metrics?.monthly_recurring_revenue ?? 0).toLocaleString("en-IN")}</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Monthly Recurring</div>
        </div>
      </div>

      {/* =========================================================================
          2. GYM DIRECTORY & TENANT MANAGEMENT TABLE
          ========================================================================= */}
      <div className="rounded-2xl bg-gym-card/60 border border-gym-border overflow-hidden">
        <div className="p-5 border-b border-gym-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">Gym Organizations Directory</h2>
            <p className="text-xs text-gym-muted">Audit tenants, subscription plans, usage and execute owner impersonation.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchPlatformData()}
                placeholder="Search by code, gym name, phone..."
                className="w-full bg-slate-950 border border-gym-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-gym-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="TRIAL">Trial Only</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-gym-border text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Organization</th>
                <th className="px-4 py-3.5">Owner &amp; Contact</th>
                <th className="px-4 py-3.5">Location &amp; GST</th>
                <th className="px-4 py-3.5 text-center">Branches</th>
                <th className="px-4 py-3.5 text-center">Members</th>
                <th className="px-4 py-3.5">SaaS Plan</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/40">
              {gyms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                    {loading ? "Loading platform organizations..." : "No gym tenants found matching filters."}
                  </td>
                </tr>
              ) : (
                gyms.map((gym) => (
                  <tr key={gym.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{gym.name}</div>
                      <div className="text-[11px] font-mono text-red-400 font-semibold">{gym.org_code}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-white font-medium">{gym.owner?.name || "Unassigned"}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{gym.owner?.mobile || gym.phone}</div>
                      <div className="text-[11px] text-slate-500">{gym.owner?.email || gym.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-slate-300">{gym.city}, {gym.state}</div>
                      <div className="text-[10px] font-mono text-slate-500">GST: {gym.gstin || "Unregistered"}</div>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-slate-200">
                      {gym.branch_count}
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-cyan-400 font-mono">
                      {gym.member_count}
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {gym.subscription?.plan_id || "BUSINESS"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        gym.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : gym.status === "TRIAL"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-red-500/10 text-red-400 border border-red-500/30"
                      }`}>
                        {gym.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      {/* Impersonate Button */}
                      <button
                        onClick={() => handleImpersonate(gym)}
                        className="p-1.5 px-2.5 rounded-lg bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 transition-colors font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                        title="Login as Gym Owner"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Login</span>
                      </button>

                      {/* Suspend / Activate Toggle */}
                      <button
                        onClick={() => handleToggleStatus(gym.id, gym.status)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          gym.status === "ACTIVE"
                            ? "bg-slate-900 text-slate-400 hover:text-red-400 border-gym-border"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        }`}
                        title={gym.status === "ACTIVE" ? "Suspend Organization" : "Activate Organization"}
                      >
                        {gym.status === "ACTIVE" ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          3. MODAL: PROVISION NEW GYM TENANT (ATOMIC CREATION WORKFLOW)
          ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Provision New Gym Tenant</h3>
                <p className="text-xs text-slate-400">Creates Organization code (GYM-XXXXXX), primary branch, and owner account (OWN-XXXXXX).</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleCreateGym} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gym Commercial Name *</label>
                  <input
                    type="text"
                    required
                    value={newGym.name}
                    onChange={(e) => setNewGym({ ...newGym, name: e.target.value })}
                    placeholder="e.g. Titan Power Gym"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tenant URL Slug (Unique) *</label>
                  <input
                    type="text"
                    required
                    value={newGym.slug}
                    onChange={(e) => setNewGym({ ...newGym, slug: e.target.value })}
                    placeholder="e.g. titan-gym"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white lowercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gym Official Phone *</label>
                  <input
                    type="text"
                    required
                    value={newGym.phone}
                    onChange={(e) => setNewGym({ ...newGym, phone: e.target.value })}
                    placeholder="+91 98220 12345"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gym Official Email *</label>
                  <input
                    type="email"
                    required
                    value={newGym.email}
                    onChange={(e) => setNewGym({ ...newGym, email: e.target.value })}
                    placeholder="contact@titangym.in"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] font-mono text-red-400 font-bold uppercase mb-2">Primary Gym Owner Account</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Owner First Name *</label>
                    <input
                      type="text"
                      required
                      value={newGym.owner_first_name}
                      onChange={(e) => setNewGym({ ...newGym, owner_first_name: e.target.value })}
                      placeholder="Vikram"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Owner Last Name *</label>
                    <input
                      type="text"
                      required
                      value={newGym.owner_last_name}
                      onChange={(e) => setNewGym({ ...newGym, owner_last_name: e.target.value })}
                      placeholder="Patil"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Owner Mobile Number *</label>
                    <input
                      type="text"
                      required
                      value={newGym.owner_mobile}
                      onChange={(e) => setNewGym({ ...newGym, owner_mobile: e.target.value })}
                      placeholder="+91 98220 99999"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Owner Login Email *</label>
                    <input
                      type="email"
                      required
                      value={newGym.owner_email}
                      onChange={(e) => setNewGym({ ...newGym, owner_email: e.target.value })}
                      placeholder="owner@titangym.in"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">SaaS Plan</label>
                  <select
                    value={newGym.plan_id}
                    onChange={(e) => setNewGym({ ...newGym, plan_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="STARTER">STARTER (₹2,999/mo)</option>
                    <option value="BUSINESS">BUSINESS (₹5,999/mo)</option>
                    <option value="ENTERPRISE">ENTERPRISE (₹11,999/mo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={newGym.city}
                    onChange={(e) => setNewGym({ ...newGym, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={newGym.gstin}
                    onChange={(e) => setNewGym({ ...newGym, gstin: e.target.value.toUpperCase() })}
                    placeholder="27AAACI1234F1Z5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gym-red hover:bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-red-500/25 transition-all disabled:opacity-50"
                >
                  {submitting ? "Provisioning Tenant..." : "Create Gym Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
