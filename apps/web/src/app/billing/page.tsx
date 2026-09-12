"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Receipt,
  Printer,
  Plus,
  IndianRupee,
  CheckCircle2,
  X,
  RefreshCw,
  Building,
  FileText
} from "lucide-react";
import { fetchApi } from "../../lib/api-client";
import { Payment, MembershipPlan, Member, calculateGst, PaginatedResult } from "@gymcare/shared";

export default function BillingPage() {
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<any | null>(null);

  const queryClient = useQueryClient();

  // Form state for fee collection
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("UPI");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [transactionId, setTransactionId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch payments list
  const { data: paymentsData, isLoading: loadingPayments } = useQuery<PaginatedResult<Payment>>({
    queryKey: ["payments"],
    queryFn: () => fetchApi<PaginatedResult<Payment>>("/payments?page_size=30")
  });

  // Fetch membership plans
  const { data: plans } = useQuery<MembershipPlan[]>({
    queryKey: ["membership-plans"],
    queryFn: () => fetchApi<MembershipPlan[]>("/memberships/plans")
  });

  // Fetch members for selector
  const { data: membersResult } = useQuery<PaginatedResult<Member>>({
    queryKey: ["members-selector"],
    queryFn: () => fetchApi<PaginatedResult<Member>>("/members?page_size=100")
  });

  // Selected plan calculation
  const currentPlan = (plans || []).find((p) => p.id === selectedPlanId);
  const finalPrice = Math.max(0, (currentPlan?.price || 0) - (Number(discountAmount) || 0));
  const gstBreakdown = currentPlan
    ? calculateGst({
        amount: finalPrice,
        taxRate: currentPlan.tax_rate,
        isInclusive: currentPlan.is_tax_inclusive,
        supplierStateCode: "27",
        recipientStateCode: "27"
      })
    : null;

  // Collect Fee & Assign Plan Mutation
  const assignMembershipMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi("/memberships/assign", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: (res: any) => {
      setIsCollectModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      if (res?.data?.invoice) {
        setSelectedInvoiceForPrint(res.data.invoice);
      }
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to process payment and assign membership.");
    }
  });

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = (plans || []).find((p) => p.id === planId);
    if (plan) {
      setAmountPaid(plan.price);
    }
  };

  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !selectedPlanId) {
      setFormError("Please select both a member and a membership plan.");
      return;
    }

    assignMembershipMutation.mutate({
      branch_id: "00000000-0000-0000-0000-000000000011",
      member_id: selectedMemberId,
      plan_id: selectedPlanId,
      start_date: new Date().toISOString().split("T")[0],
      discount_amount: Number(discountAmount) || 0,
      payment_method: paymentMethod,
      amount_paid: Number(amountPaid) || 0,
      transaction_id: transactionId
    });
  };

  const payments = paymentsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-gym-red" />
            <span>GST Billing & Payments</span>
          </h1>
          <p className="text-xs text-gym-muted mt-0.5">
            Immutable tax invoices, UPI/Cash receipts, and Indian GST compliant billing.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setIsCollectModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gym-red hover:bg-gym-redHover text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-red-500/20 transition-all"
        >
          <Receipt className="w-4 h-4" />
          <span>Collect Fee / New Bill</span>
        </button>
      </div>

      {/* PAYMENTS & RECEIPTS TABLE */}
      <div className="rounded-2xl bg-gym-card/60 border border-gym-border overflow-hidden">
        <div className="p-4 border-b border-gym-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Recent Payment Transactions</span>
          </h2>
          <span className="text-xs text-gym-muted">Auto-reconciled with GST ledgers</span>
        </div>

        {loadingPayments ? (
          <div className="py-16 text-center text-sm text-gym-muted">Loading payments ledger...</div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-400">No payment records found yet.</div>
            <button
              onClick={() => setIsCollectModalOpen(true)}
              className="text-xs text-gym-red hover:underline font-semibold"
            >
              Collect a member fee now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-gym-surface/80 border-b border-gym-border text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Receipt #</th>
                  <th className="px-6 py-3.5">Member</th>
                  <th className="px-6 py-3.5">Invoice #</th>
                  <th className="px-6 py-3.5">Payment Method</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border/60">
                {payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gym-cardHover/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gym-emerald">{p.receipt_number}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">
                        {p.members?.first_name} {p.members?.last_name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">{p.members?.mobile}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">{p.invoices?.invoice_number || "-"}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs border border-gym-border">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      ₹{Number(p.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(p.payment_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedInvoiceForPrint(p.invoices)}
                        className="p-1.5 rounded-lg bg-gym-surface hover:bg-slate-800 text-slate-300 hover:text-white"
                        title="Print Thermal / A4 Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* COLLECT FEE MODAL */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-surface border border-gym-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gym-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gym-red" />
                <span>Fee Collection & Tax Invoice</span>
              </h2>
              <button
                onClick={() => setIsCollectModalOpen(false)}
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

            <form onSubmit={handleCollectSubmit} className="space-y-4 text-xs">
              {/* Member Selector */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Select Member *</label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                >
                  <option value="">-- Choose Member --</option>
                  {(membersResult?.data || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} ({m.member_id} - {m.mobile})
                    </option>
                  ))}
                </select>
              </div>

              {/* Membership Plan Selector */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Membership Plan *</label>
                <select
                  required
                  value={selectedPlanId}
                  onChange={(e) => handlePlanSelect(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                >
                  <option value="">-- Choose Plan --</option>
                  {(plans || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ₹{p.price} ({p.duration_days} Days, 18% GST Incl.)
                    </option>
                  ))}
                </select>
              </div>

              {/* Discount Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white font-mono focus:outline-none focus:border-gym-red"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red font-semibold"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="RAZORPAY">Razorpay Online</option>
                  </select>
                </div>
              </div>

              {/* Amount Paid & Transaction ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Amount Paid Now (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-gym-red"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Transaction / UPI Ref ID</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 329012398401"
                    className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white font-mono focus:outline-none focus:border-gym-red"
                  />
                </div>
              </div>

              {/* Realtime Indian GST Tax Summary Card */}
              {gstBreakdown && (
                <div className="p-3 rounded-2xl bg-gym-card border border-gym-border space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Value:</span>
                    <span>₹{gstBreakdown.taxableAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>CGST (9.0%):</span>
                    <span>₹{gstBreakdown.cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>SGST (9.0%):</span>
                    <span>₹{gstBreakdown.sgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-gym-border font-bold text-white text-xs">
                    <span>Total Bill (Incl. GST):</span>
                    <span className="text-gym-emerald">₹{gstBreakdown.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gym-border text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMembershipMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-gym-red hover:bg-gym-redHover text-white font-semibold flex items-center gap-1.5"
                >
                  {assignMembershipMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Generate Invoice & Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE GST INVOICE MODAL */}
      {selectedInvoiceForPrint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-black rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">TAX INVOICE / RECEIPT</h2>
                <div className="text-xs text-gray-500 font-mono">GST Compliant Document</div>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPrint(null)}
                className="p-1 rounded hover:bg-gray-200 text-gray-600 no-print"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Business Header */}
            <div className="text-xs space-y-1">
              <div className="font-black text-sm">IronPulse Fitness Club</div>
              <div>Plot 45, Tarabai Park, Kolhapur, Maharashtra - 416003</div>
              <div className="font-mono font-bold">GSTIN: 27AAACI1234F1Z5</div>
              <div>Contact: +91 98220 12345 | contact@ironpulse.in</div>
            </div>

            {/* Bill Details */}
            <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t">
              <div>
                <span className="text-gray-500">Invoice No:</span>
                <div className="font-mono font-bold">{selectedInvoiceForPrint.invoice_number || "INV-IP-2026-0001"}</div>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <div className="font-mono font-bold">{selectedInvoiceForPrint.issue_date || new Date().toISOString().split("T")[0]}</div>
              </div>
            </div>

            {/* SAC Code & Items */}
            <div className="border-t pt-3">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b font-bold text-gray-600">
                    <th className="py-1">Description</th>
                    <th className="py-1">SAC</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2">Fitness Membership Plan</td>
                    <td className="py-2 font-mono">999723</td>
                    <td className="py-2 text-right font-mono font-bold">
                      ₹{selectedInvoiceForPrint.total_amount || "2,500.00"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border-t pt-4 flex justify-between items-center text-xs">
              <div className="font-mono text-gray-500">Authorized Signatory</div>
              <div className="flex gap-2 no-print">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-black text-white font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
