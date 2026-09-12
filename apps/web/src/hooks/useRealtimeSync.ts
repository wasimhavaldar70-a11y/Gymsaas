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

    const orgFilter = `organization_id=eq.${organizationId}`;

    // Subscribe to attendance real-time updates (FIX-03: Tenant Scoped)
    const attendanceChannel = supabase
      .channel(`org:${organizationId}:attendance`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: orgFilter
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["attendance"] });
          queryClient.invalidateQueries({ queryKey: ["attendance-log"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        }
      )
      .subscribe();

    // Subscribe to member real-time updates (FIX-03: Tenant Scoped)
    const membersChannel = supabase
      .channel(`org:${organizationId}:members`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "members",
          filter: orgFilter
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["members"] });
          queryClient.invalidateQueries({ queryKey: ["members-selector"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        }
      )
      .subscribe();

    // Subscribe to payments real-time updates (FIX-03: Tenant Scoped)
    const paymentsChannel = supabase
      .channel(`org:${organizationId}:payments`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: orgFilter
        },
        () => {
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
