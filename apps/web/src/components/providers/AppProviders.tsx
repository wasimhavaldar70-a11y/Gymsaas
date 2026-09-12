"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { syncOfflineQueue } from "../../lib/offline-queue";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: 1
          }
        }
      })
  );

  useEffect(() => {
    const handleOnline = () => {
      syncOfflineQueue().then(({ synced }) => {
        if (synced > 0) {
          queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        }
      });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
