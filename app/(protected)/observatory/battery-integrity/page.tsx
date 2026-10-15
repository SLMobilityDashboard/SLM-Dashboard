// app/(protected)/Observatory/battery-integrity/page.tsx
"use client";

import { RefreshCw, ShieldAlert } from "lucide-react";

import { useWarehouseQuery } from "@/hooks/use-warehouse-query";
import { BATTERY_MISMATCH_SQL, BatteryMismatchRow } from "@/lib/battery-integrity-queries";
import BatteryIntegrityPanel from "@/components/monitoring/battery-integrity-panel";

// The underlying query scans full transaction history per customer via a
// window function, and fraud review doesn't need minute-level freshness —
// so this polls Snowflake roughly once a day. Investigation marks (status,
// notes) are handled entirely through Redis (see use-battery-marks.ts) and
// refresh independently on their own, much shorter interval, so reviewers
// still see each other's status changes promptly even though the mismatch
// data itself only refreshes daily.
const REFRESH_MS = 24 * 60 * 60_000;

export default function BatteryIntegrityPage() {
  const mismatches = useWarehouseQuery<BatteryMismatchRow>(BATTERY_MISMATCH_SQL, {
    refreshIntervalMs: REFRESH_MS,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-red-400" />
            Battery Integrity
          </h1>
          <p className="text-slate-400 mt-1">
            Swaps where the returned battery doesn't match what was last issued to the customer
          </p>
        </div>
        <button
          onClick={() => mismatches.refetch()}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${mismatches.loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <BatteryIntegrityPanel
        data={mismatches.data}
        loading={mismatches.loading}
        error={mismatches.error}
      />
    </div>
  );
}