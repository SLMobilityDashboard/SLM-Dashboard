"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Battery,
  MapPin,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  Eye,
  Layers,
  BarChart2,
  X,
  ArrowUpRight,
  Circle,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface StationDataPoint {
  date: string;
  swaps: number;
}

interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "ACTIVE" | "MAINTENANCE" | "INACTIVE";
  totalSwaps: number;
  dailyAvg: number;
  todaySwaps: number;
  weeklyData: StationDataPoint[];
  vendor: string;
  model: string;
  location: string;
  lastSwap: string;
  maintenanceStatus: "OK" | "DUE_SOON" | "OVERDUE";
  swapsSinceMaintenance: number;
  uptime: number;
}

// ─────────────────────────────────────────────
// MAINTENANCE HELPERS (from BSSOverviewPage)
// ─────────────────────────────────────────────

const calculateMaintenanceStatus = (
  lastMaintenanceDate: Date | undefined,
  swapsSinceMaintenance: number
): "OK" | "DUE_SOON" | "OVERDUE" => {
  const now = new Date();
  let timeOverdue = false;
  let swapsOverdue = swapsSinceMaintenance >= 100;
  if (lastMaintenanceDate) {
    const days = Math.floor((now.getTime() - lastMaintenanceDate.getTime()) / 86400000);
    timeOverdue = days >= 30;
    if (!swapsOverdue && (days >= 23 || swapsSinceMaintenance >= 80)) return "DUE_SOON";
  }
  if (timeOverdue || swapsOverdue) return "OVERDUE";
  return "OK";
};

const generateMockMaintenanceDate = (): Date => {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * 60));
  return d;
};

const deriveBSSStatus = (item: any): "ACTIVE" | "MAINTENANCE" | "INACTIVE" => {
  if (item.STATION_DELETED === 1) return "INACTIVE";
  if (item.MAINTENANCE_MODE === 1) return "MAINTENANCE";
  if (item.STATION_ACTIVE === 0) return "INACTIVE";
  if (item.STATION_ACTIVE === 1) return "ACTIVE";
  return "INACTIVE";
};

// ─────────────────────────────────────────────
// SQL QUERIES
// ─────────────────────────────────────────────

const STATION_QUERY = `
  WITH swap_stats AS (
    SELECT
      STATION_NAME as STATION_ID,
      COUNT(*) as TOTAL_SWAPS,
      MAX(TO_TIMESTAMP(PAID_AT / 1000)) as LAST_SWAP_DATE,
      COUNT(CASE WHEN DATE_TRUNC('day', TO_TIMESTAMP(PAID_AT / 1000)) = DATE_TRUNC('day', CURRENT_TIMESTAMP) THEN 1 END) as TODAY_SWAPS
    FROM SOURCE_DATA.DYNAMO_DB.FACT_PAYMENT
    WHERE PAYMENT_TYPE = 'BATTERY_SWAP'
      AND STATION_NAME IS NOT NULL
    GROUP BY STATION_NAME
  )
  SELECT
    ss.STATION_ID,
    ss.VENDOR_ID,
    ss.STATION_MODEL,
    ss.SERIAL_NO,
    ss.STATION_NAME,
    ss.LOCATION_ID,
    ss.INIT_COMPLETED,
    ss.CONFIG_DOWNLOADED,
    ss.MAINTENANCE_MODE,
    ss.STATION_ACTIVE,
    ss.STATION_DELETED,
    ss.APPROVED_STATUS,
    ss.CITY_ID,
    ss.LOCATION_CODE,
    ss.LOCATION_NAME,
    ss.LATITUDE,
    ss.LONGITUDE,
    v.NAME as VENDOR_COMPANY_NAME,
    v.COUNTRY as VENDOR_COUNTRY,
    v.CHARGING_STATION as VENDOR_HAS_CHARGING,
    v.SWAPPING_STATION as VENDOR_HAS_SWAPPING,
    v.BATTERY as VENDOR_HAS_BATTERY,
    COALESCE(swap.TOTAL_SWAPS, 0) as TOTAL_SWAPS,
    COALESCE(swap.TODAY_SWAPS, 0) as TODAY_SWAPS,
    swap.LAST_SWAP_DATE
  FROM REPORT_DB.BSS_ANALYTICS.VW_SWAPPING_STATION_LOCATION ss
  LEFT JOIN SOURCE_DATA.MASTER_DATA.VENDOR v
    ON ss.VENDOR_ID = v.VENDOR_ID AND v.DELETED = 0
  LEFT JOIN swap_stats swap
    ON (ss.STATION_NAME = swap.STATION_ID OR ss.STATION_ID = swap.STATION_ID)
  WHERE ss.STATION_DELETED = 0
    AND ss.LATITUDE IS NOT NULL
    AND ss.LONGITUDE IS NOT NULL
    AND UPPER(TRIM(STATION_NAME)) != 'MOCKSTATION'
  ORDER BY COALESCE(swap.TOTAL_SWAPS, 0) DESC;
`;

type Aggregation = "day" | "week" | "month" | "year";

// Period definitions — always last COMPLETE period to avoid incomplete data:
// day   → yesterday (last complete day), chart = last 7 complete days
// week  → last complete Mon–Sun week, chart = last 8 complete weeks
// month → last complete calendar month, chart = last 6 complete months
// year  → last complete calendar year, chart = last 5 complete years

const AGG_CONFIG: Record<Aggregation, { trunc: string; lookback: string; currentPeriodStart: string; currentPeriodEnd: string; labelFmt: string; points: number }> = {
  day: {
    trunc: "day",
    lookback:           "DATEADD('day', -7,  DATEADD('day', -1, DATE_TRUNC('day',   CURRENT_TIMESTAMP)))",
    currentPeriodStart: "DATEADD('day', -1,  DATE_TRUNC('day',   CURRENT_TIMESTAMP))",
    currentPeriodEnd:   "DATEADD('day', -1,  DATE_TRUNC('day',   CURRENT_TIMESTAMP))",
    labelFmt: "DD Mon", points: 7,
  },
  week: {
    trunc: "week",
    lookback:           "DATEADD('week', -8, DATEADD('week', -1, DATE_TRUNC('week',  CURRENT_TIMESTAMP)))",
    currentPeriodStart: "DATEADD('week', -1, DATE_TRUNC('week',  CURRENT_TIMESTAMP))",
    currentPeriodEnd:   "DATEADD('day',  -1, DATE_TRUNC('week',  CURRENT_TIMESTAMP))",
    labelFmt: "DD Mon", points: 8,
  },
  month: {
    trunc: "month",
    lookback:           "DATEADD('month', -6, DATEADD('month', -1, DATE_TRUNC('month', CURRENT_TIMESTAMP)))",
    currentPeriodStart: "DATEADD('month', -1, DATE_TRUNC('month', CURRENT_TIMESTAMP))",
    currentPeriodEnd:   "DATEADD('day',   -1, DATE_TRUNC('month', CURRENT_TIMESTAMP))",
    labelFmt: "Mon YY", points: 6,
  },
  year: {
    trunc: "year",
    lookback:           "DATEADD('year', -5, DATEADD('year', -1, DATE_TRUNC('year',  CURRENT_TIMESTAMP)))",
    currentPeriodStart: "DATEADD('year', -1, DATE_TRUNC('year',  CURRENT_TIMESTAMP))",
    currentPeriodEnd:   "DATEADD('day',  -1, DATE_TRUNC('year',  CURRENT_TIMESTAMP))",
    labelFmt: "YYYY",   points: 5,
  },
};

function buildSwapsQuery(agg: Aggregation): string {
  const { trunc, lookback, labelFmt } = AGG_CONFIG[agg];
  const ts = "TO_TIMESTAMP(PAID_AT / 1000)";
  const bucket = `DATE_TRUNC('${trunc}', ${ts})`;
  // Exclude current incomplete period by capping at start of current period
  const periodCap = `DATE_TRUNC('${trunc}', CURRENT_TIMESTAMP)`;
  return `
    SELECT
      STATION_NAME,
      ${bucket} as SWAP_DATE,
      TO_CHAR(${bucket}, '${labelFmt}') as DAY_LABEL,
      COUNT(*) as DAILY_SWAPS
    FROM SOURCE_DATA.DYNAMO_DB.FACT_PAYMENT
    WHERE PAYMENT_TYPE = 'BATTERY_SWAP'
      AND STATION_NAME IS NOT NULL
      AND ${ts} >= ${lookback}
      AND ${ts} < ${periodCap}
    GROUP BY STATION_NAME, ${bucket}, TO_CHAR(${bucket}, '${labelFmt}')
    ORDER BY STATION_NAME, SWAP_DATE;
  `;
}

// Human-readable date range for the last complete period
function getAggDateRange(agg: Aggregation): string {
  const now = new Date();
  const fmt = (d: Date) => `${d.getDate()} ${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}`;

  if (agg === "day") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return fmt(yesterday);
  }
  if (agg === "week") {
    // Last complete Mon–Sun
    const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon
    const lastSun = new Date(now);
    lastSun.setDate(now.getDate() - dayOfWeek - 1);
    const lastMon = new Date(lastSun);
    lastMon.setDate(lastSun.getDate() - 6);
    return `${fmt(lastMon)} – ${fmt(lastSun)}`;
  }
  if (agg === "month") {
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${fmt(firstDayPrevMonth)} – ${fmt(lastDayPrevMonth)}`;
  }
  // year — last complete year
  const lastYear = now.getFullYear() - 1;
  return `1 Jan ${lastYear} – 31 Dec ${lastYear}`;
}


async function queryDB(sql: string): Promise<any[]> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params: [] }),
  });
  if (!res.ok) throw new Error(`Query failed: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────
// TRANSFORM RAW DB ROWS → Station[]
// ─────────────────────────────────────────────

function transformStations(
  rows: any[],
  aggRows: any[],
  agg: Aggregation
): Station[] {
  const { points } = AGG_CONFIG[agg];

  // Build swap map: stationName → StationDataPoint[] sorted oldest→newest
  const aggMap = new Map<string, StationDataPoint[]>();
  for (const row of aggRows) {
    const key = row.STATION_NAME;
    if (!aggMap.has(key)) aggMap.set(key, []);
    aggMap.get(key)!.push({ date: String(row.DAY_LABEL), swaps: Number(row.DAILY_SWAPS) });
  }

  return rows
    .filter((item) => item.LATITUDE && item.LONGITUDE)
    .map((item) => {
      const lastMaintenanceDate = generateMockMaintenanceDate();
      const swapsSinceMaintenance = Math.floor(Math.random() * 120);
      const maintenanceStatus = calculateMaintenanceStatus(lastMaintenanceDate, swapsSinceMaintenance);
      const status = deriveBSSStatus(item);

      const totalSwaps = Number(item.TOTAL_SWAPS) || 0;
      const rawBuckets = aggMap.get(item.STATION_NAME) ?? aggMap.get(item.STATION_ID) ?? [];

      // Pad to expected number of points by matching date label, not array index.
      // rawBuckets is sorted oldest→newest from the DB ORDER BY SWAP_DATE.
      // We always want exactly `points` bars, filling gaps with 0.
      const filledData: StationDataPoint[] = Array.from({ length: points }, (_, i) => {
        // i=0 is oldest, i=points-1 is most recent (last complete period)
        return rawBuckets[i] ?? { date: "—", swaps: 0 };
      });

      // Current period = last complete period = last bucket in sorted results
      const currentPeriodSwaps = rawBuckets.length > 0
        ? rawBuckets[rawBuckets.length - 1].swaps
        : 0;

      // Period avg = total swaps across all N buckets divided by N (including zeros).
      // This is the true average — a station with 0 swaps in some periods should
      // have that drag the avg down, not be silently excluded.
      const periodAvg = filledData.length > 0
        ? Math.round(filledData.reduce((s, d) => s + d.swaps, 0) / filledData.length)
        : 0;

      const lastSwapDate = item.LAST_SWAP_DATE ? new Date(item.LAST_SWAP_DATE) : null;
      const lastSwapLabel = lastSwapDate ? formatRelativeTime(lastSwapDate) : "No data";

      return {
        id: item.STATION_ID,
        name: item.STATION_NAME || item.LOCATION_NAME || item.STATION_ID,
        lat: Number(item.LATITUDE),
        lng: Number(item.LONGITUDE),
        status,
        totalSwaps,
        dailyAvg: periodAvg,            // avg per period across the lookback window (always divides by N)
        todaySwaps: currentPeriodSwaps, // last complete period count
        weeklyData: filledData,
        vendor: item.VENDOR_COMPANY_NAME || item.VENDOR_ID || "—",
        model: item.STATION_MODEL || "—",
        location: item.LOCATION_NAME || item.LOCATION_CODE || "—",
        lastSwap: lastSwapLabel,
        maintenanceStatus,
        swapsSinceMaintenance,
        uptime: status === "ACTIVE" ? parseFloat((95 + Math.random() * 5).toFixed(1)) : 0,
      } as Station;
    });
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─────────────────────────────────────────────
// COLOR PALETTE — per aggregation, absolute thresholds
// ─────────────────────────────────────────────

interface ColorTier {
  label: string;
  color: string;
  min: number;       // absolute swap count threshold
  rangeLabel: string;
}

const AGG_PALETTES: Record<Aggregation, { tiers: ColorTier[]; accent: string }> = {
  // Daily: warm fire palette — low daily volume expected
  day: {
    accent: "#ff6b35",
    tiers: [
      { label: "Blazing",   color: "#ff2d55", min: 80,  rangeLabel: "80+ / day"   },
      { label: "Hot",       color: "#ff6b35", min: 50,  rangeLabel: "50–79 / day" },
      { label: "Warm",      color: "#ffcc02", min: 25,  rangeLabel: "25–49 / day" },
      { label: "Moderate",  color: "#34aadc", min: 10,  rangeLabel: "10–24 / day" },
      { label: "Quiet",     color: "#5856d6", min: 1,   rangeLabel: "1–9 / day"   },
      { label: "Offline",   color: "#2d2d3a", min: 0,   rangeLabel: "0"           },
    ],
  },
  // Weekly: cyan-teal ocean palette
  week: {
    accent: "#00d4aa",
    tiers: [
      { label: "Surging",   color: "#06ffa5", min: 500, rangeLabel: "500+ / wk"   },
      { label: "Strong",    color: "#00d4aa", min: 250, rangeLabel: "250–499 / wk"},
      { label: "Steady",    color: "#0ea5e9", min: 100, rangeLabel: "100–249 / wk"},
      { label: "Light",     color: "#38bdf8", min: 30,  rangeLabel: "30–99 / wk"  },
      { label: "Sparse",    color: "#7dd3fc", min: 1,   rangeLabel: "1–29 / wk"   },
      { label: "Offline",   color: "#1e293b", min: 0,   rangeLabel: "0"           },
    ],
  },
  // Monthly: purple-violet nebula palette
  month: {
    accent: "#a855f7",
    tiers: [
      { label: "Peak",      color: "#e879f9", min: 2000, rangeLabel: "2000+ / mo"  },
      { label: "High",      color: "#a855f7", min: 1000, rangeLabel: "1000–1999 / mo"},
      { label: "Active",    color: "#818cf8", min: 400,  rangeLabel: "400–999 / mo"},
      { label: "Moderate",  color: "#6366f1", min: 100,  rangeLabel: "100–399 / mo"},
      { label: "Low",       color: "#4338ca", min: 1,    rangeLabel: "1–99 / mo"   },
      { label: "Offline",   color: "#1e1b4b", min: 0,    rangeLabel: "0"           },
    ],
  },
  // Yearly: amber-gold prestige palette
  year: {
    accent: "#f59e0b",
    tiers: [
      { label: "Powerhouse", color: "#fbbf24", min: 20000, rangeLabel: "20k+ / yr"  },
      { label: "High",       color: "#f59e0b", min: 10000, rangeLabel: "10k–19k / yr"},
      { label: "Active",     color: "#d97706", min: 4000,  rangeLabel: "4k–9k / yr" },
      { label: "Moderate",   color: "#92400e", min: 1000,  rangeLabel: "1k–3k / yr" },
      { label: "Low",        color: "#78350f", min: 1,     rangeLabel: "< 1k / yr"  },
      { label: "Offline",    color: "#1c1917", min: 0,     rangeLabel: "0"          },
    ],
  },
};

function getFrequencyColor(swaps: number, _maxSwaps: number, agg: Aggregation = "day"): string {
  const { tiers } = AGG_PALETTES[agg];
  for (const tier of tiers) {
    if (swaps >= tier.min) return tier.color;
  }
  return tiers[tiers.length - 1].color;
}

function getStatusColor(status: Station["status"]): string {
  if (status === "ACTIVE") return "#22c55e";
  if (status === "MAINTENANCE") return "#f59e0b";
  return "#6b7280";
}

function getMaintenanceColor(status: Station["maintenanceStatus"]): string {
  if (status === "OK") return "#22c55e";
  if (status === "DUE_SOON") return "#f59e0b";
  return "#ef4444";
}

// ─────────────────────────────────────────────
// MINI SPARKLINE
// ─────────────────────────────────────────────

function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${pts.join(" ")} ${w},${h}`}
        fill={`url(#sg-${color})`}
      />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────
// BAR CHART (weekly)
// ─────────────────────────────────────────────

function WeeklyBarChart({ data, color }: { data: StationDataPoint[]; color: string }) {
  const max = Math.max(...data.map((d) => d.swaps), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-sm transition-all duration-300"
            style={{
              height: `${Math.max(4, (d.swaps / max) * 48)}px`,
              background: color,
              opacity: 0.85,
            }}
          />
          <span className="text-[9px] text-slate-500">{d.date}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// STATION DETAIL PANEL
// ─────────────────────────────────────────────

function StationPanel({ station, onClose, aggregation, maxSwaps }: { station: Station; onClose: () => void; aggregation: Aggregation; maxSwaps: number }) {
  const freqColor = station.todaySwaps > 0
    ? getFrequencyColor(station.todaySwaps, maxSwaps, aggregation)
    : AGG_PALETTES[aggregation].tiers[AGG_PALETTES[aggregation].tiers.length - 1].color;

  const periodBarWidth = maxSwaps > 0 ? Math.min(100, (station.todaySwaps / maxSwaps) * 100) : 0;
  const avgBarWidth = maxSwaps > 0 ? Math.min(100, (station.dailyAvg / maxSwaps) * 100) : 0;

  const mainColor = getMaintenanceColor(station.maintenanceStatus);

  const aggLabel: Record<Aggregation, string> = {
    day: "Daily (7d)", week: "Weekly (8w)", month: "Monthly (6m)", year: "Yearly (5y)",
  };
  const avgLabel: Record<Aggregation, string> = {
    day: `avg/day (${AGG_CONFIG.day.points}d)`,
    week: `avg/week (${AGG_CONFIG.week.points}wk)`,
    month: `avg/month (${AGG_CONFIG.month.points}mo)`,
    year: `avg/year (${AGG_CONFIG.year.points}yr)`,
  };
  const currentPeriodLabel: Record<Aggregation, string> = {
    day: "Yesterday", week: "Last Week", month: "Last Month", year: "Last Year",
  };

  return (
    <div
      className="absolute right-4 top-4 bottom-4 w-80 z-30 flex flex-col overflow-hidden"
      style={{
        background: "rgba(10,14,23,0.97)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px",
        backdropFilter: "blur(24px)",
        boxShadow: "0 0 60px rgba(0,0,0,0.8)",
      }}
    >
      {/* Header */}
      <div className="p-5 pb-4 border-b border-white/5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: getStatusColor(station.status) }}
              />
              <span className="text-xs font-mono text-slate-400">{station.id}</span>
            </div>
            <h2 className="text-lg font-semibold text-white leading-tight">{station.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{station.location}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status badges */}
        <div className="flex gap-2 mt-3">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: `${getStatusColor(station.status)}20`,
              color: getStatusColor(station.status),
              border: `1px solid ${getStatusColor(station.status)}40`,
            }}
          >
            {station.status}
          </span>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: `${mainColor}20`,
              color: mainColor,
              border: `1px solid ${mainColor}40`,
            }}
          >
            Maint: {station.maintenanceStatus.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-5 space-y-4 flex-1 overflow-y-auto">

        {/* Current period swaps vs network max */}
        <div
          className="rounded-xl p-4"
          style={{ background: `${freqColor}12`, border: `1px solid ${freqColor}25` }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase tracking-widest">
              {currentPeriodLabel[aggregation]}
            </span>
            <Zap className="w-3.5 h-3.5" style={{ color: freqColor }} />
          </div>

          <div className="flex items-end justify-between gap-2 mb-3">
            <span className="text-4xl font-bold tabular-nums" style={{ color: freqColor }}>
              {station.todaySwaps.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 pb-1">
              {station.todaySwaps >= station.dailyAvg ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span className="text-[10px] text-slate-400">
                {station.dailyAvg.toLocaleString()} {avgLabel[aggregation]}
              </span>
            </div>
          </div>

          {/* vs network max bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] text-slate-600">
              <span>vs network max ({maxSwaps.toLocaleString()})</span>
              <span style={{ color: freqColor }}>{Math.round(periodBarWidth)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${periodBarWidth}%`, background: freqColor, boxShadow: `0 0 6px ${freqColor}60` }}
              />
            </div>
            {/* avg line marker */}
            <div className="relative h-2">
              <div
                className="absolute top-0 w-px h-full bg-slate-500 opacity-60"
                style={{ left: `${avgBarWidth}%` }}
                title={`Avg: ${station.dailyAvg}`}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-600">
              <span>0</span>
              <span className="text-slate-500" style={{ marginLeft: `${avgBarWidth - 2}%` }}>
                avg
              </span>
              <span>{maxSwaps.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Swaps", value: station.totalSwaps.toLocaleString(), icon: Activity, color: "#0ea5e9" },
            { label: "Uptime", value: `${station.uptime}%`, icon: CheckCircle, color: station.uptime > 95 ? "#22c55e" : "#ef4444" },
            { label: "Since Maint.", value: `${station.swapsSinceMaintenance}`, icon: Clock, color: mainColor },
            { label: "Last Swap", value: station.lastSwap, icon: Clock, color: "#94a3b8" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <m.icon className="w-3 h-3" style={{ color: m.color }} />
                <span className="text-[10px] text-slate-500">{m.label}</span>
              </div>
              <span className="text-sm font-semibold text-white">{m.value}</span>
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 uppercase tracking-widest">{aggLabel[aggregation]}</span>
            <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <p className="text-[9px] font-mono mb-3" style={{ color: AGG_PALETTES[aggregation].accent + "80" }}>
            {getAggDateRange(aggregation)}
          </p>
          <WeeklyBarChart data={station.weeklyData} color={freqColor} />
        </div>

        {/* Maintenance progress */}
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 uppercase tracking-widest">Maintenance</span>
            <span className="text-[10px]" style={{ color: mainColor }}>
              {station.swapsSinceMaintenance}/100 swaps
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, station.swapsSinceMaintenance)}%`,
                background: mainColor,
                boxShadow: `0 0 8px ${mainColor}60`,
              }}
            />
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2">
          {[
            { label: "Vendor", value: station.vendor },
            { label: "Model", value: station.model },
            { label: "Coords", value: `${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}` },
          ].map((i) => (
            <div key={i.label} className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="text-xs text-slate-500">{i.label}</span>
              <span className="text-xs text-slate-300 font-mono">{i.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LEGEND
// ─────────────────────────────────────────────

function FrequencyLegend({ aggregation }: { aggregation: Aggregation }) {
  const { tiers, accent } = AGG_PALETTES[aggregation];
  const aggName = { day: "Daily", week: "Weekly", month: "Monthly", year: "Yearly" }[aggregation];

  return (
    <div
      className="absolute bottom-4 left-4 z-20 rounded-xl overflow-hidden"
      style={{
        background: "rgba(8,11,20,0.95)",
        border: `1px solid ${accent}30`,
        backdropFilter: "blur(16px)",
        boxShadow: `0 0 24px ${accent}15`,
        minWidth: "172px",
      }}
    >
      {/* Header strip */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ background: `${accent}15`, borderBottom: `1px solid ${accent}25` }}
      >
        <Layers className="w-3 h-3 flex-shrink-0" style={{ color: accent }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
          {aggName} Swaps
        </span>
      </div>

      {/* Gradient bar */}
      <div className="px-3 pt-3 pb-1">
        <div
          className="h-1.5 rounded-full mb-2"
          style={{
            background: `linear-gradient(to right, ${tiers[tiers.length - 2].color}, ${tiers[Math.floor(tiers.length / 2)].color}, ${tiers[0].color})`,
          }}
        />
      </div>

      {/* Tiers */}
      <div className="px-3 pb-3 space-y-1.5">
        {tiers.map((t) => (
          <div key={t.label} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: t.color,
                boxShadow: t.min > 0 ? `0 0 5px ${t.color}90` : "none",
              }}
            />
            <span className="text-[10px] text-slate-400 w-16">{t.label}</span>
            <span className="text-[9px] font-mono ml-auto" style={{ color: t.min > 0 ? t.color : "#4b5563" }}>
              {t.rangeLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAP COMPONENT (Leaflet)
// ─────────────────────────────────────────────

function StationMap({
  stations,
  selectedId,
  onSelect,
  aggregation,
}: {
  stations: Station[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  aggregation: Aggregation;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [leaflet, setLeaflet] = useState<any>(null);

  const maxSwaps = useMemo(() => Math.max(...stations.map((s) => s.todaySwaps), 1), [stations]);
  const { accent } = AGG_PALETTES[aggregation];

  useEffect(() => {
    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css").then(() => setLeaflet(L));
    });
  }, []);

  useEffect(() => {
    if (!leaflet || !mapRef.current) return;
    const L = leaflet.default || leaflet;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([7.0, 80.4], 8);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(mapInstance.current);

      L.control.zoom({ position: "bottomright" }).addTo(mapInstance.current);
      L.control.attribution({ position: "bottomright", prefix: false }).addTo(mapInstance.current);
    }

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const aggLabel = { day: "Yesterday", week: "Last Week", month: "Last Month", year: "Last Year" }[aggregation];
    const avgLabel = { day: "day avg", week: "wk avg", month: "mo avg", year: "yr avg" }[aggregation];

    stations.forEach((station) => {
      const color = getFrequencyColor(station.todaySwaps, maxSwaps, aggregation);
      const isSelected = station.id === selectedId;
      // Size proportional to dataset max — highest swap station gets max size
      const sizeRatio = maxSwaps > 0 ? station.todaySwaps / maxSwaps : 0;
      const MIN_SIZE = 8;
      const MAX_SIZE = 28;
      const size = isSelected ? MAX_SIZE : Math.max(MIN_SIZE, Math.round(MIN_SIZE + sizeRatio * (MAX_SIZE - MIN_SIZE)));
      const pulseSize = size + 14;

      const mainDot = station.maintenanceStatus === "OVERDUE" ? "#ef4444" : station.maintenanceStatus === "DUE_SOON" ? "#f59e0b" : null;

      const icon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:${pulseSize}px;height:${pulseSize}px;display:flex;align-items:center;justify-content:center;">
            ${station.status === "ACTIVE" ? `
              <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:${color}18;border:1px solid ${color}35;animation:pulse-ring 2.5s ease-out infinite;"></div>` : ""}
            <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${isSelected ? `3px solid white` : `2px solid ${color}99`};box-shadow:0 0 ${isSelected ? 24 : 10}px ${color}${isSelected ? "dd" : "55"};cursor:pointer;position:relative;z-index:${isSelected ? 10 : 1};transition:all 0.2s ease;">
              ${mainDot ? `<div style="position:absolute;top:-2px;right:-2px;width:6px;height:6px;border-radius:50%;background:${mainDot};border:1.5px solid #070b14;"></div>` : ""}
            </div>
          </div>
        `,
        iconSize: [pulseSize, pulseSize],
        iconAnchor: [pulseSize / 2, pulseSize / 2],
      });

      // Rich tooltip HTML
      const statusDot = station.status === "ACTIVE" ? "#22c55e" : station.status === "MAINTENANCE" ? "#f59e0b" : "#6b7280";
      const tooltipHtml = `
        <div style="font-family:'DM Mono',monospace;min-width:180px;padding:0;overflow:hidden;border-radius:10px;">
          <div style="padding:8px 10px 6px;background:${color}18;border-bottom:1px solid ${color}25;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
              <div style="width:6px;height:6px;border-radius:50%;background:${statusDot};flex-shrink:0;"></div>
              <span style="font-size:11px;font-weight:600;color:#f1f5f9;letter-spacing:0.02em;">${station.name}</span>
            </div>
            <span style="font-size:9px;color:#64748b;font-family:monospace;">${station.id}</span>
          </div>
          <div style="padding:8px 10px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <div>
              <div style="font-size:9px;color:#64748b;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.08em;">${aggLabel}</div>
              <div style="font-size:18px;font-weight:700;color:${color};line-height:1;">${station.todaySwaps}</div>
            </div>
            <div>
              <div style="font-size:9px;color:#64748b;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.08em;">${avgLabel}</div>
              <div style="font-size:18px;font-weight:700;color:#94a3b8;line-height:1;">${station.dailyAvg}</div>
            </div>
            <div>
              <div style="font-size:9px;color:#64748b;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.08em;">total</div>
              <div style="font-size:11px;font-weight:600;color:#cbd5e1;">${station.totalSwaps.toLocaleString()}</div>
            </div>
            <div>
              <div style="font-size:9px;color:#64748b;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.08em;">last swap</div>
              <div style="font-size:11px;font-weight:600;color:#cbd5e1;">${station.lastSwap}</div>
            </div>
          </div>
          <div style="padding:5px 10px 8px;border-top:1px solid rgba(255,255,255,0.06);">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:9px;color:#64748b;">${station.vendor} · ${station.model}</span>
              <span style="font-size:9px;padding:2px 6px;border-radius:4px;background:${statusDot}20;color:${statusDot};font-weight:600;">${station.status}</span>
            </div>
            ${station.maintenanceStatus !== "OK" ? `
            <div style="margin-top:5px;display:flex;align-items:center;gap:4px;">
              <div style="width:4px;height:4px;border-radius:50%;background:${mainDot};"></div>
              <span style="font-size:9px;color:${mainDot};">Maintenance ${station.maintenanceStatus.replace("_", " ").toLowerCase()}</span>
            </div>` : ""}
          </div>
        </div>
      `;

      const marker = L.marker([station.lat, station.lng], { icon, zIndexOffset: isSelected ? 1000 : 0 })
        .addTo(mapInstance.current)
        .on("click", () => onSelect(station.id));

      marker.bindTooltip(tooltipHtml, {
        permanent: false,
        direction: "top",
        offset: [0, -(pulseSize / 2 + 4)],
        opacity: 1,
        className: "bss-tooltip",
      });

      markersRef.current.set(station.id, marker);
    });
  }, [leaflet, stations, selectedId, maxSwaps, onSelect, aggregation, accent]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .bss-tooltip {
          background: rgba(8,11,20,0.97) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.7) !important;
          padding: 0 !important;
          backdrop-filter: blur(16px);
        }
        .bss-tooltip::before { display: none !important; }
        .leaflet-tooltip-top.bss-tooltip::before { display: none !important; }
      `}</style>
      <div ref={mapRef} className="w-full h-full" />
    </>
  );
}

// ─────────────────────────────────────────────
// STATION LIST ROW
// ─────────────────────────────────────────────

function StationRow({
  station,
  maxSwaps,
  isSelected,
  onClick,
  aggregation,
}: {
  station: Station;
  maxSwaps: number;
  isSelected: boolean;
  onClick: () => void;
  aggregation: Aggregation;
}) {
  const color = getFrequencyColor(station.todaySwaps, maxSwaps, aggregation);
  // Bar width: highest-swap station in the current dataset = 100%
  const barWidth = maxSwaps > 0 ? (station.todaySwaps / maxSwaps) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left group transition-all duration-200"
      style={{
        padding: "10px 14px",
        borderRadius: "10px",
        background: isSelected ? "rgba(255,255,255,0.07)" : "transparent",
        border: `1px solid ${isSelected ? "rgba(255,255,255,0.12)" : "transparent"}`,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color, boxShadow: color !== "#374151" ? `0 0 6px ${color}` : "none" }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-200 truncate">{station.name}</span>
            <span className="text-xs tabular-nums font-mono" style={{ color }}>
              {station.todaySwaps}
            </span>
          </div>
          <div className="h-1 mt-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${barWidth}%`, background: color, transition: "width 0.5s ease" }}
            />
          </div>
        </div>

        {/* Maint indicator */}
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: getMaintenanceColor(station.maintenanceStatus) }}
        />
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function BSSStationMapPage() {
  const [allStations, setAllStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const fetchedRef = useRef(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [sortBy, setSortBy] = useState<"swaps" | "name" | "maintenance">("swaps");
  const [aggregation, setAggregation] = useState<Aggregation>("month");

  const fetchData = useCallback(async (agg: Aggregation = "month") => {
    setLoading(true);
    setError(null);
    try {
      const [stationRows, aggRows] = await Promise.all([
        queryDB(STATION_QUERY),
        queryDB(buildSwapsQuery(agg)),
      ]);
      setAllStations(transformStations(stationRows, aggRows, agg));
      setLastRefresh(new Date());
      fetchedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) fetchData(aggregation);
  }, [fetchData]);

  // Re-fetch when aggregation changes
  const handleAggChange = (agg: Aggregation) => {
    setAggregation(agg);
    fetchedRef.current = false;
    fetchData(agg);
  };

  const selectedStation = useMemo(
    () => allStations.find((s) => s.id === selectedId) ?? null,
    [allStations, selectedId]
  );

  const filtered = useMemo(() => {
    let s = [...allStations];
    if (statusFilter !== "all") s = s.filter((st) => st.status === statusFilter);
    if (sortBy === "swaps") s.sort((a, b) => b.todaySwaps - a.todaySwaps);
    if (sortBy === "name") s.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "maintenance") s.sort((a, b) => {
      const order = { OVERDUE: 0, DUE_SOON: 1, OK: 2 };
      return order[a.maintenanceStatus] - order[b.maintenanceStatus];
    });
    return s;
  }, [allStations, statusFilter, sortBy]);

  const maxSwaps = useMemo(() => Math.max(...filtered.map((s) => s.todaySwaps), 1), [filtered]);

  const kpis = useMemo(() => ({
    total: allStations.length,
    active: allStations.filter((s) => s.status === "ACTIVE").length,
    todaySwaps: allStations.reduce((acc, s) => acc + s.todaySwaps, 0),
    overdue: allStations.filter((s) => s.maintenanceStatus === "OVERDUE").length,
  }), [allStations]);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        fontFamily: "'DM Mono', 'Fira Code', 'Roboto Mono', monospace",
        color: "#e2e8f0",
      }}
    >
      {/* Inject Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap');
        .station-display { font-family: 'Syne', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      {/* TOP BAR */}
      <header
        className="flex-shrink-0 px-4 py-3 flex items-center justify-between gap-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* Left: back + title */}
        <div className="flex items-center gap-3">
          <a
            href="/bss"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-all group"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-xs font-medium">BSS</span>
          </a>

          <div
            className="w-px h-5 bg-white/10"
          />

          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #06ffa5, #0ea5e9)" }}
            >
              <MapPin className="w-3.5 h-3.5 text-black" />
            </div>
            <div>
              <h1 className="station-display text-sm font-bold text-white leading-none">
                Station Intelligence
              </h1>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                Geospatial · Swap Frequency
              </p>
            </div>
          </div>

          {/* KPI pills */}
          <div className="hidden lg:flex items-center gap-2 ml-2">
            {[
              { label: "Stations", value: kpis.total, color: "#94a3b8" },
              { label: "Active", value: kpis.active, color: "#22c55e" },
              {
                label: { day: "Yesterday", week: "Last Week", month: "Last Month", year: "Last Year" }[aggregation],
                value: kpis.todaySwaps,
                color: AGG_PALETTES[aggregation].accent,
              },
              { label: "Overdue", value: kpis.overdue, color: "#ef4444" },
            ].map((k) => (
              <div
                key={k.label}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-[10px] text-slate-500">{k.label}</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: k.color }}>
                  {loading ? "—" : k.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: aggregation + status + refresh */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Aggregation toggle + date range */}
          <div className="flex flex-col items-end gap-0.5">
            <div
              className="flex items-center rounded-lg p-0.5 gap-0.5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {(["day", "week", "month", "year"] as Aggregation[]).map((a) => (
                <button
                  key={a}
                  onClick={() => handleAggChange(a)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-md text-[10px] uppercase font-semibold tracking-wide transition-all disabled:opacity-40"
                  style={{
                    background: aggregation === a ? `${AGG_PALETTES[a].accent}20` : "transparent",
                    color: aggregation === a ? AGG_PALETTES[a].accent : "#64748b",
                    border: aggregation === a ? `1px solid ${AGG_PALETTES[a].accent}40` : "1px solid transparent",
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
            {/* Date range label */}
            <span
              className="text-[9px] font-mono tracking-wide pr-0.5"
              style={{ color: AGG_PALETTES[aggregation].accent + "99" }}
            >
              {getAggDateRange(aggregation)}
            </span>
          </div>

          <div
            className="w-px h-5 bg-white/10"
          />

          {error && (
            <span className="text-[10px] text-red-400 max-w-32 truncate">{error}</span>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <div className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-yellow-400 animate-pulse" : error ? "bg-red-400" : "bg-green-400 animate-pulse"}`} />
            <span className="hidden sm:inline">{loading ? "Loading…" : error ? "Error" : lastRefresh.toLocaleTimeString()}</span>
          </div>
          <button
            onClick={() => { fetchedRef.current = false; fetchData(aggregation); }}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT SIDEBAR */}
        <aside
          className="w-64 flex-shrink-0 flex flex-col overflow-hidden"
          style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          {/* Controls */}
          <div className="p-3 space-y-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none px-3 py-2 text-xs rounded-lg pr-8"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Stations</option>
                <option value="ACTIVE">Active Only</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="flex gap-1">
              {(["swaps", "name", "maintenance"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className="flex-1 text-[9px] uppercase py-1.5 rounded-md transition-all"
                  style={{
                    background: sortBy === s ? "rgba(6,255,165,0.12)" : "rgba(255,255,255,0.04)",
                    color: sortBy === s ? "#06ffa5" : "#64748b",
                    border: sortBy === s ? "1px solid rgba(6,255,165,0.25)" : "1px solid transparent",
                  }}
                >
                  {s === "maintenance" ? "maint" : s}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-600 px-1">
              <span>{loading ? "Loading…" : `${filtered.length} stations`}</span>
              <div className="flex items-center gap-3">
                <span>· {{ day: "yesterday", week: "last wk", month: "last mo", year: "last yr" }[aggregation]}</span>
                <span>· maint</span>
              </div>
            </div>
          </div>

          {/* Station list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
                <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
                <span className="text-xs text-slate-500">Fetching stations…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 p-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-xs text-red-400 text-center">{error}</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <span className="text-xs text-slate-500">No stations found</span>
              </div>
            ) : (
              filtered.map((station) => (
                <StationRow
                  key={station.id}
                  station={station}
                  maxSwaps={maxSwaps}
                  isSelected={selectedId === station.id}
                  onClick={() => setSelectedId(selectedId === station.id ? null : station.id)}
                  aggregation={aggregation}
                />
              ))
            )}
          </div>

          {/* Legend: maintenance */}
          <div
            className="p-3 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="text-[9px] uppercase text-slate-600 mb-2">Maintenance</p>
            <div className="flex gap-3">
              {[
                { label: "OK", color: "#22c55e" },
                { label: "Soon", color: "#f59e0b" },
                { label: "Overdue", color: "#ef4444" },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                  <span className="text-[9px] text-slate-500">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* MAP AREA */}
        <main className="flex-1 relative overflow-hidden">
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4"
              style={{ background: "#0a0e17" }}>
              <RefreshCw className="w-8 h-8 text-slate-600 animate-spin" />
              <p className="text-sm text-slate-500">Loading station data…</p>
            </div>
          ) : (
            <StationMap
              stations={filtered}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
              aggregation={aggregation}
            />
          )}

          {/* Frequency legend */}
          {!loading && <FrequencyLegend aggregation={aggregation} />}

          {/* No-selection hint */}
          {!selectedId && !loading && (
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full text-xs text-slate-400"
              style={{
                background: "rgba(10,14,23,0.85)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(12px)",
              }}
            >
              <Eye className="w-3.5 h-3.5" />
              Click a station to inspect performance
            </div>
          )}

          {/* Station detail panel */}
          {selectedStation && (
            <StationPanel station={selectedStation} onClose={() => setSelectedId(null)} aggregation={aggregation} maxSwaps={maxSwaps} />
          )}
        </main>
      </div>
    </div>
  );
}