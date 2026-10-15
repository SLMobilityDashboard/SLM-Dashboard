// hooks/use-battery-marks.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { MismatchStatus } from "@/lib/battery-integrity-queries";

interface RawMarkEntry {
  status: MismatchStatus;
  note: string | null;
  markedBy: string;
  markedAt: string;
}

// Shape the panel expects (mirrors the columns it reads off each row).
export interface BatteryMark {
  TRNXID: string;
  STATUS: MismatchStatus;
  NOTE: string | null;
  MARKED_BY: string;
  MARKED_AT: string;
}

// Marks live entirely in Redis now (see /api/battery-integrity/marks) —
// no Snowflake round trip, so this can poll fairly often without cost concern.
const REFRESH_MS = 15_000;

const MARKS_ENDPOINT = "/api/battery-integrity/marks";

export function useBatteryMarks() {
  const { data: session } = useSession();

  const [raw, setRaw] = useState<Record<string, RawMarkEntry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Local overlay for marks *this* browser just wrote, so a click updates
  // the UI immediately instead of waiting for the next poll.
  const [pending, setPending] = useState<Map<string, BatteryMark>>(new Map());

  const fetchMarks = useCallback(async () => {
    try {
      const res = await fetch(MARKS_ENDPOINT);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to load marks (${res.status})`);
      }
      const body = await res.json();
      setRaw(body.marks ?? {});
      setError(null);
    } catch (err: any) {
      console.error("Failed to load battery marks:", err);
      setError(err?.message ?? "Failed to load marks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarks();
    const id = setInterval(fetchMarks, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchMarks]);

  const marks = useMemo(() => {
    const map = new Map<string, BatteryMark>();
    Object.entries(raw).forEach(([trnxid, entry]) =>
      map.set(trnxid, {
        TRNXID: trnxid,
        STATUS: entry.status,
        NOTE: entry.note,
        MARKED_BY: entry.markedBy,
        MARKED_AT: entry.markedAt,
      })
    );
    pending.forEach((mark, trnxid) => map.set(trnxid, mark)); // optimistic wins
    return map;
  }, [raw, pending]);

  const setStatus = useCallback(
    async (trnxid: string, status: MismatchStatus, note?: string) => {
      const user = session?.user as any;
      // Prefer an actual display name over the Cognito username/email so
      // reviewers see a real name in the UI, not a login handle. Falls back
      // in order: full name -> given+middle name -> username -> email.
      const fullName = [user?.givenName, user?.middleName].filter(Boolean).join(" ").trim();
      const markedBy = user?.name || fullName || user?.username || user?.email || "unknown";

      setSaveError(null);
      setPending((prev) => {
        const next = new Map(prev);
        next.set(trnxid, {
          TRNXID: trnxid,
          STATUS: status,
          NOTE: note?.trim() || null,
          MARKED_BY: markedBy,
          MARKED_AT: new Date().toISOString(),
        });
        return next;
      });

      try {
        const res = await fetch(MARKS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trnxid, status, note }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Save failed (${res.status})`);
        }
        // Re-sync with what Redis actually has (e.g. "open" clears the key
        // server-side, so the hash and our local state should agree).
        await fetchMarks();
        setPending((prev) => {
          const next = new Map(prev);
          next.delete(trnxid);
          return next;
        });
      } catch (err: any) {
        console.error("Failed to save battery mark:", err);
        setSaveError(err?.message ?? "Failed to save");
        // Roll back the optimistic entry — safer to show "unsaved" (open)
        // than to claim a status that never made it to Redis.
        setPending((prev) => {
          const next = new Map(prev);
          next.delete(trnxid);
          return next;
        });
      }
    },
    [session, fetchMarks]
  );

  return { marks, loading, error, saveError, setStatus, refetch: fetchMarks };
}