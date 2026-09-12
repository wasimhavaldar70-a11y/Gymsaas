"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function useRealtimeSync(organizationId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId || process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder")) {
      return;
    }

    // Subscribe to attendance real-time updates
    const attendanceChannel = supabase
      .channel("realtime-attendance")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance"
        },
        (payload) => {
          console.log("⚡ [Realtime] Attendance updated:", payload);
          queryClient.invalidateQueries({ queryKey: ["attendance"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        }
      )
      .subscribe();

    // Subscribe to member real-time updates
    const membersChannel = supabase
      .channel("realtime-members")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "members"
        },
        (payload) => {
          console.log("⚡ [Realtime] Members updated:", payload);
          queryClient.invalidateQueries({ queryKey: ["members"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        }
      )
      .subscribe();

    // Subscribe to payments real-time updates
    const paymentsChannel = supabase
      .channel("realtime-payments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments"
        },
        (payload) => {
          console.log("⚡ [Realtime] Payment recorded:", payload);
          queryClient.invalidateQueries({ queryKey: ["payments"] });
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, [organizationId, queryClient]);
}
