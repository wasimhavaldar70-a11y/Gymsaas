"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  Calendar,
  Building2,
  Clock,
  QrCode,
  Search,
  Users,
  Download
} from "lucide-react";
import { fetchApi } from "../../lib/api-client";
import Link from "next/link";

export default function AttendanceLogPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date())
  );

  const { data: attendanceData, isLoading } = useQuery<{
    data: any[];
    count: number;
    date: string;
  }>({
    queryKey: ["attendance-log", selectedDate],
    queryFn: () => fetchApi<{ data: any[]; count: number; date: string }>("/attendance/today")
  });

  const records = attendanceData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-cyan-400" />
            <span>Attendance History Log</span>
          </h1>
          <p className="text-xs text-gym-muted mt-0.5">
            Realtime entry timestamps synchronized with Asia/Kolkata timezone.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/reception"
            className="flex items-center gap-2 bg-gym-red hover:bg-gym-redHover text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-red-500/20 transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Open Reception Scanner</span>
          </Link>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="p-4 rounded-2xl bg-gym-card/60 border border-gym-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-gym-bg border border-gym-border text-white text-xs md:text-sm font-mono focus:outline-none focus:border-gym-red"
          />
        </div>

        <div className="text-xs font-mono text-cyan-400 font-bold">
          Total Check-Ins: {records.length}
        </div>
      </div>

      {/* ATTENDANCE TABLE */}
      <div className="rounded-2xl bg-gym-card/60 border border-gym-border overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gym-muted">Loading attendance log...</div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-400">No attendance records found for this date.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-gym-surface/80 border-b border-gym-border text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Member</th>
                  <th className="px-6 py-3.5">Mobile</th>
                  <th className="px-6 py-3.5">Branch</th>
                  <th className="px-6 py-3.5">Method</th>
                  <th className="px-6 py-3.5">Check-In Time</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border/60">
                {records.map((r: any) => {
                  const checkInTime = new Date(r.check_in).toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  });

                  return (
                    <tr key={r.id} className="hover:bg-gym-cardHover/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                          {r.members?.first_name} {r.members?.last_name}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">{r.members?.member_id}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">{r.members?.mobile}</td>
                      <td className="px-6 py-4 text-slate-400">{r.branches?.name || "Kolhapur Central"}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs border border-gym-border uppercase font-bold">
                          {r.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-cyan-400">{checkInTime}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                          {r.members?.status || "ACTIVE"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
