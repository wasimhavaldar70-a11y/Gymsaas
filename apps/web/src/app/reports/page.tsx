"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Download,
  IndianRupee,
  Receipt,
  Calendar,
  Building,
  CheckCircle2
} from "lucide-react";
import { fetchApi } from "../../lib/api-client";

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: gstReport, isLoading } = useQuery<{
    summary: {
      total_taxable_turnover: number;
      total_cgst: number;
      total_sgst: number;
      total_igst: number;
      total_tax_liability: number;
      grand_total: number;
      invoice_count: number;
    };
    invoices: any[];
  }>({
    queryKey: ["reports-gst", startDate, endDate],
    queryFn: () => fetchApi<{ summary: any; invoices: any[] }>(`/reports/gst?start_date=${startDate}&end_date=${endDate}`)
  });

  const summary = gstReport?.summary || {
    total_taxable_turnover: 0,
    total_cgst: 0,
    total_sgst: 0,
    total_igst: 0,
    total_tax_liability: 0,
    grand_total: 0,
    invoice_count: 0
  };

  const handleDownloadCsv = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    window.open(`${apiUrl}/reports/export/members.csv`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-gym-red" />
            <span>GST Financial & Business Reports</span>
          </h1>
          <p className="text-xs text-gym-muted mt-0.5">
            Audit-ready GST tax liability reports, taxable turnover, and server-side data exports.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="flex items-center gap-2 bg-gym-card hover:bg-gym-cardHover text-white border border-gym-border px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
        >
          <Download className="w-4 h-4 text-gym-emerald" />
          <span>Export Members CSV</span>
        </button>
      </div>

      {/* DATE RANGE FILTER */}
      <div className="p-4 rounded-2xl bg-gym-card/60 border border-gym-border flex flex-col sm:flex-row items-center gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Report Period:</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-gym-bg border border-gym-border text-white font-mono"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-gym-bg border border-gym-border text-white font-mono"
          />
        </div>
      </div>

      {/* GST SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gym-card/60 border border-gym-border space-y-1">
          <span className="text-[11px] font-bold text-gym-muted uppercase">Taxable Turnover</span>
          <div className="text-xl md:text-2xl font-black text-white font-mono">
            ₹{summary.total_taxable_turnover.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">Base fee before tax</div>
        </div>

        <div className="p-5 rounded-2xl bg-gym-card/60 border border-gym-border space-y-1">
          <span className="text-[11px] font-bold text-gym-muted uppercase">CGST (9.0%)</span>
          <div className="text-xl md:text-2xl font-black text-slate-300 font-mono">
            ₹{summary.total_cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">Central Goods & Services Tax</div>
        </div>

        <div className="p-5 rounded-2xl bg-gym-card/60 border border-gym-border space-y-1">
          <span className="text-[11px] font-bold text-gym-muted uppercase">SGST (9.0%)</span>
          <div className="text-xl md:text-2xl font-black text-slate-300 font-mono">
            ₹{summary.total_sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">State Goods & Services Tax</div>
        </div>

        <div className="p-5 rounded-2xl bg-gym-card/60 border border-emerald-500/20 bg-emerald-500/5 space-y-1">
          <span className="text-[11px] font-bold text-emerald-400 uppercase">Total GST Collected</span>
          <div className="text-xl md:text-2xl font-black text-emerald-400 font-mono">
            ₹{summary.total_tax_liability.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-500/70">Total Tax Liability (18%)</div>
        </div>
      </div>

      {/* TAX INVOICES AUDIT TABLE */}
      <div className="rounded-2xl bg-gym-card/60 border border-gym-border overflow-hidden">
        <div className="p-4 border-b border-gym-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">GST Invoices Ledger (SAC 999723)</h2>
          <span className="text-xs text-gym-muted font-mono">{summary.invoice_count} Invoices in period</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-gym-muted">Loading GST ledger...</div>
        ) : (gstReport?.invoices || []).length === 0 ? (
          <div className="py-16 text-center text-sm text-gym-muted">No invoices found for this date range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gym-surface/80 border-b border-gym-border text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Invoice #</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Taxable</th>
                  <th className="px-6 py-3.5">CGST (9%)</th>
                  <th className="px-6 py-3.5">SGST (9%)</th>
                  <th className="px-6 py-3.5">Total Tax</th>
                  <th className="px-6 py-3.5 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border/60 font-mono">
                {gstReport?.invoices.map((inv) => (
                  <tr key={inv.invoice_number} className="hover:bg-gym-cardHover/50 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-gym-emerald">{inv.invoice_number}</td>
                    <td className="px-6 py-3.5 text-slate-400">{inv.issue_date}</td>
                    <td className="px-6 py-3.5 text-white">₹{Number(inv.taxable_amount).toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-slate-300">₹{Number(inv.cgst).toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-slate-300">₹{Number(inv.sgst).toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-amber-400">₹{Number(inv.total_tax).toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-white">
                      ₹{Number(inv.total_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
