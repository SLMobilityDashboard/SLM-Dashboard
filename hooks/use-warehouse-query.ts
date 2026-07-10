// hooks/use-warehouse-query.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CacheStatus =
  | "HIT"
  | "HIT-REVALIDATING"
  | "MISS"
  | "DEDUP"
  | null;

interface UseWarehouseQueryOptions {
  /** Force the /api/log-query endpoint to bucket this query by day even without a date fn in the SQL. */
  forceDynamic?: boolean;
  /** Poll the endpoint on this interval (ms). 0 / undefined = fetch once. */
  refreshIntervalMs?: number;
  /** Skip fetching entirely (e.g. while a dependent value isn't ready yet). */
  enabled?: boolean;
}

interface UseWarehouseQueryResult<T> {
  data: T[] | null;
  error: string | null;
  loading: boolean;
  cacheStatus: CacheStatus;
  /** Value of X-Cache-Type header (static | daily | hourly) if present. */
  cacheType: string | null;
  refetch: () => void;
}

/**
 * Sends a SQL string to the existing /api/log-query endpoint (auth, caching,
 * and dedup are all handled server-side already) and exposes the result
 * as normal React state. No new API routes needed — this just standardizes
 * how dashboard components talk to that one endpoint.
 */
export function useWarehouseQuery<T = Record<string, any>>(
  sql: string,
  options: UseWarehouseQueryOptions = {}
): UseWarehouseQueryResult<T> {
  const { forceDynamic = false, refreshIntervalMs = 0, enabled = true } = options;

  const [data, setData] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>(null);
  const [cacheType, setCacheType] = useState<string | null>(null);

  // Keep the latest SQL in a ref so the polling interval (set up once)
  // always sends the current query text without needing to be torn down
  // and recreated every render.
  const sqlRef = useRef(sql);
  sqlRef.current = sql;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/log-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlRef.current, forceDynamic }),
      });

      setCacheStatus(res.headers.get("X-Cache-Status") as CacheStatus);
      setCacheType(res.headers.get("X-Cache-Type"));

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error || `Query failed (${res.status})`);
      }

      setData(body as T[]);
    } catch (err: any) {
      setError(err?.message ?? "Query failed");
    } finally {
      setLoading(false);
    }
  }, [forceDynamic, enabled]);

  useEffect(() => {
    fetchData();

    if (!refreshIntervalMs || refreshIntervalMs <= 0) return;

    const id = setInterval(fetchData, refreshIntervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, refreshIntervalMs, sql]);

  return { data, error, loading, cacheStatus, cacheType, refetch: fetchData };
}