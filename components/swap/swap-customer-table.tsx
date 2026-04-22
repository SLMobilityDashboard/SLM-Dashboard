"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownUp, MapPin, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SEGMENT_COLORS,
  SEGMENT_BG,
  OFFERS,
  type CustomerSwapData,
} from "@/hooks/useSwapAnalytics";
import type { SwapFilters } from "./swap-filters";
import { cn } from "@/lib/utils";

interface SwapCustomerTableProps {
  customers: CustomerSwapData[];
  loading: boolean;
  filters: SwapFilters;
}

// ---- Sparkline ----------------------------------------------------------------
function Sparkline({ history, color }: { history: number[]; color: string }) {
  const max = Math.max(...history, 1);
  return (
    <div className="flex items-end gap-[2px] h-7">
      {history.map((v, i) => (
        <div
          key={i}
          className="w-[5px] rounded-sm"
          style={{
            height: `${Math.max(3, Math.round((v / max) * 28))}px`,
            background: color,
            opacity: v === 0 ? 0.18 : 1,
          }}
        />
      ))}
    </div>
  );
}

// ---- Score ring ----------------------------------------------------------------
function ScoreRing({ score }: { score: number }) {
  const cls =
    score >= 70
      ? "border-green-400 text-green-700"
      : score >= 45
      ? "border-amber-400 text-amber-700"
      : "border-red-400 text-red-700";
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-full border-2 text-xs font-medium shrink-0",
        cls
      )}
    >
      {score}
    </div>
  );
}

// ---- Trend label ---------------------------------------------------------------
function TrendLabel({ trend }: { trend: number }) {
  const label = trend > 0 ? `+${trend}%` : `${trend}%`;
  const cls =
    trend >= 10
      ? "text-green-700"
      : trend <= -10
      ? "text-red-700"
      : "text-muted-foreground";
  return <span className={cn("text-xs font-medium tabular-nums", cls)}>{label}</span>;
}

// ---- Single customer row -------------------------------------------------------
function CustomerRow({
  customer: c,
  index,
  maxSwaps,
}: {
  customer: CustomerSwapData;
  index: number;
  maxSwaps: number;
}) {
  const pctOfTop = Math.round((c.total / maxSwaps) * 100);
  const color = SEGMENT_COLORS[c.segment];

  return (
    <TooltipProvider>
      <div className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow duration-150 bg-card">
        <div className="flex items-start justify-between gap-4">

          {/* Left: identity */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-muted-foreground w-5 shrink-0">
              #{index + 1}
            </span>
            <ScoreRing score={c.score} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{c.customerName}</p>
              <p className="text-xs text-muted-foreground truncate">{c.customerId}</p>
              {c.primaryLocation && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">
                    {c.primaryLocation}
                    {c.primaryStation ? ` · ${c.primaryStation}` : ""}
                  </span>
                </div>
              )}
              <div className="mt-1.5">
                <Sparkline history={c.history} color={color} />
              </div>
            </div>
          </div>

          {/* Right: stats */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <Badge className={cn("text-[11px]", SEGMENT_BG[c.segment])}>
                {c.segment}
              </Badge>
              {c.dayPattern && (
                <Badge variant="outline" className="text-[11px] font-normal">
                  {c.dayPattern}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap justify-end items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    Trend: <TrendLabel trend={c.trend} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  Last 3-month avg vs first 3-month avg
                </TooltipContent>
              </Tooltip>
              <span>
                Peak:{" "}
                <span className="font-medium text-foreground">{c.peak}</span>
              </span>
              <span>
                Consistency:{" "}
                <span className="font-medium text-foreground">{c.consistency}%</span>
              </span>
            </div>

            {/* Telemetry enrichment from SWAP_OVERALL */}
            <div className="flex items-center gap-x-3 text-xs text-muted-foreground">
              {c.avgBatteryImprovement > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-help">
                      <Zap className="h-3 w-3" />
                      +{c.avgBatteryImprovement.toFixed(1)}% bat
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    Avg battery improvement per swap (new − old %)
                  </TooltipContent>
                </Tooltip>
              )}
              <span>
                Success:{" "}
                <span className="font-medium text-foreground">{c.successRate}%</span>
              </span>
              <span className="text-green-600 font-medium">
                Rs. {c.totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Volume bar */}
        <Progress value={pctOfTop} className="h-1.5 mt-3" />

        {/* Offer + contact */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Offer:</span>{" "}
            {OFFERS[c.segment]}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-3 border-blue-300 text-blue-600 hover:bg-blue-50 shrink-0"
            onClick={() =>
              window.sendPromptIfAvailable?.(
                `Write a short personalized WhatsApp/SMS message in Sinhala and English for ${c.customerName} ` +
                `(ID: ${c.customerId}, ${c.segment} customer, health score ${c.score}/100, ` +
                `trend ${c.trend > 0 ? "+" : ""}${c.trend}%, ` +
                `primary station: ${c.primaryStation || "unknown"}). ` +
                `Offer: "${OFFERS[c.segment]}". Keep it under 3 sentences.`
              )
            }
          >
            Contact ↗
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---- Main table ----------------------------------------------------------------
export function SwapCustomerTable({
  customers,
  loading,
  filters,
}: SwapCustomerTableProps) {
  const [ascending, setAscending] = useState(false);

  const sorted = useMemo(() => {
    const dir = ascending ? 1 : -1;
    const list = [...customers];

    if (filters.sortBy === "score")  list.sort((a, b) => dir * (b.score - a.score));
    else if (filters.sortBy === "swaps") list.sort((a, b) => dir * (b.total - a.total));
    else if (filters.sortBy === "trend") list.sort((a, b) => dir * (b.trend - a.trend));
    else list.sort((a, b) => dir * a.customerName.localeCompare(b.customerName));

    return list;
  }, [customers, filters.sortBy, ascending]);

  const maxSwaps = Math.max(...sorted.map((c) => c.total), 1);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border border-border rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex gap-3 items-center">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-40" />
                </div>
              </div>
              <div className="space-y-1 items-end flex flex-col">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <Skeleton className="h-1.5 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

//   if (sorted.length === 0) {
//     return (
//       <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
//         No customers found for the selected filters.
//       </div>
//     );
//   }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {sorted.length} customer{sorted.length !== 1 ? "s" : ""}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAscending((p) => !p)}
          className="text-xs gap-1"
        >
          <ArrowDownUp className="w-3 h-3" />
          {ascending ? "Ascending" : "Descending"}
        </Button>
      </div>

      <ScrollArea className="h-[600px] w-full rounded-md">
        <div className="space-y-2 pr-3">
          {sorted.map((c, idx) => (
            <CustomerRow key={c.customerId} customer={c} index={idx} maxSwaps={maxSwaps} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Safety shim so the Contact button doesn't throw if sendPromptIfAvailable is undefined
declare global {
  interface Window {
    sendPromptIfAvailable?: (text: string) => void;
  }
}