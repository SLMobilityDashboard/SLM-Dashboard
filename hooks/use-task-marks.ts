// hooks/use-task-marks.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export interface TaskMark {
  logId: number;
  markedBy: string;
  markedByUsername: string;
  markedAt: string;
}

interface UseTaskMarksResult {
  marked: Map<number, TaskMark>;
  loading: boolean;
  toggle: (logId: number) => void;
}

export function useTaskMarks(): UseTaskMarksResult {
  const { data: sessionData } = useSession();
  const [marked, setMarked] = useState<Map<number, TaskMark>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/task-marks");
      if (!res.ok) return;
      const body = await res.json();
      const entries: TaskMark[] = body.marked ?? [];
      setMarked(new Map(entries.map((m) => [m.logId, m])));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    (logId: number) => {
      const willMark = !marked.has(logId);
      const previous = marked.get(logId);

      // Optimistic update using whatever we know about the current user
      // client-side; the server response (or a subsequent reload) fills in
      // the authoritative name/username.
      setMarked((prev) => {
        const next = new Map(prev);
        if (willMark) {
          next.set(logId, {
            logId,
            markedBy: sessionData?.user?.name ?? "You",
            markedByUsername: (sessionData?.user as any)?.username ?? "",
            markedAt: new Date().toISOString(),
          });
        } else {
          next.delete(logId);
        }
        return next;
      });

      fetch("/api/task-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, marked: willMark }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("request failed");
          const body = await res.json();
          if (willMark && body.mark) {
            // Replace optimistic entry with the server's authoritative one.
            setMarked((prev) => {
              const next = new Map(prev);
              next.set(logId, body.mark as TaskMark);
              return next;
            });
          }
        })
        .catch(() => {
          // Roll back to whatever the state was before this toggle.
          setMarked((prev) => {
            const next = new Map(prev);
            if (willMark) {
              next.delete(logId);
            } else if (previous) {
              next.set(logId, previous);
            }
            return next;
          });
        });
    },
    [marked, sessionData]
  );

  return { marked, loading, toggle };
}