"use client";

import { fetchApi } from "./api-client";

export interface PendingAttendanceOperation {
  id: string;
  idempotency_key: string;
  member_identifier: string;
  branch_id: string;
  timestamp: string;
  method: "QR" | "SEARCH" | "MANUAL";
  retry_count: number;
}

const STORAGE_KEY = "gymcare_offline_attendance_queue";

export function getOfflineQueue(): PendingAttendanceOperation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToOfflineQueue(op: PendingAttendanceOperation): void {
  if (typeof window === "undefined") return;
  const current = getOfflineQueue();
  current.push(op);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function clearFromOfflineQueue(id: string): void {
  if (typeof window === "undefined") return;
  const current = getOfflineQueue().filter((op) => op.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

// Synchronizes pending offline operations when network connection is restored
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const op of queue) {
    try {
      await fetchApi("/attendance/check-in", {
        method: "POST",
        body: JSON.stringify({
          branch_id: op.branch_id,
          member_identifier: op.member_identifier,
          method: op.method,
          idempotency_key: op.idempotency_key
        })
      });
      clearFromOfflineQueue(op.id);
      synced++;
    } catch (err) {
      console.warn(`[Offline Sync] Failed to sync check-in for ${op.member_identifier}`, err);
      failed++;
    }
  }

  return { synced, failed };
}
