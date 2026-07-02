"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Car,
  Filter,
  X,
  Search,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
  ShieldAlert,
  Shield,
  Zap,
  TrendingUp,
  Activity,
  Users,
  RefreshCw,
  Download,
  Eye,
  ChevronsUpDown,
  Calendar,
  Battery,
  ArrowLeftRight,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import BatteryHistory from "@/components/home-charging/BatteryHistory";
import { BatteryFilters } from "@/hooks/useHomeCharging";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VehicleListItem {
  VEHICLE_ID: string;
  TBOX_IMEI_NO: string;
  CHASSIS_NUMBER: string;
}

interface SuspiciousRecord {
  REPORT_DATE: string;
  TBOXID: string;
  CUSTOMER_ID: string;
  CUSTOMER_NAME: string;
  CHASSIS_NUMBER: string;
  YESTERDAY_FIRST_CTIME: string;
  YESTERDAY_FIRST_BATPERCENT: number;
  YESTERDAY_FIRST_BMS_ID: string;
  BEFORE_YESTERDAY_MAX_CTIME: string;
  BEFORE_YESTERDAY_MAX_BATPERCENT: number;
  BEFORE_YESTERDAY_MAX_BMS_ID: string;
  BATPERCENT_DIFFERENCE: number;
  EVENT_TYPE: 'ILLEGAL_CHARGE' | 'BATTERY_SWAP';
  IS_SWAP: boolean;
}

type SortField = keyof SuspiciousRecord;
type SortDir = "asc" | "desc";
type EventTypeFilter = "all" | "ILLEGAL_CHARGE" | "BATTERY_SWAP";

// ─── Constants ────────────────────────────────────────────────────────────────

const THRESHOLD_CRITICAL = 30;
const THRESHOLD_WARNING = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getSeverity = (diff: number): "critical" | "warning" | "low" => {
  if (diff >= THRESHOLD_CRITICAL) return "critical";
  if (diff >= THRESHOLD_WARNING) return "warning";
  return "low";
};

const severityConfig = {
  critical: {
    label: "Critical",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    badge: "bg-red-500/20 text-red-300 border-red-500/30",
    bar: "bg-red-500",
    glow: "shadow-red-500/20",
  },
  warning: {
    label: "Warning",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    bar: "bg-amber-500",
    glow: "shadow-amber-500/20",
  },
  low: {
    label: "Suspicious",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    badge: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    bar: "bg-sky-500",
    glow: "shadow-sky-500/20",
  },
};

function formatDateTime(ts: string) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function BatteryBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-300 w-9 text-right">
        {pct}%
      </span>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  record,
  onClose,
}: {
  record: SuspiciousRecord;
  onClose: () => void;
}) {
  const severity = getSeverity(record.BATPERCENT_DIFFERENCE);
  const cfg = severityConfig[severity];
  const isSwap = record.IS_SWAP;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full max-w-lg rounded-2xl border ${cfg.border} bg-slate-900 shadow-2xl`}
      >
        <div className={`p-5 border-b ${cfg.border} flex items-start justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${cfg.bg}`}>
              {isSwap ? (
                <ArrowLeftRight className={`w-5 h-5 text-blue-400`} />
              ) : (
                <ShieldAlert className={`w-5 h-5 ${cfg.color}`} />
              )}
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-lg">
                {isSwap ? "Battery Swap Detected" : "Illegal Charge Detected"}
              </h2>
              <p className="text-sm text-slate-400">{record.TBOXID}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Customer ID</p>
              <p className="text-sm font-mono text-slate-200">{record.CUSTOMER_ID}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Customer Name</p>
              <p className="text-sm font-medium text-slate-200 truncate">
                {record.CUSTOMER_NAME || "—"}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Chassis Number</p>
              <p className="text-sm font-mono text-slate-200">{record.CHASSIS_NUMBER || "—"}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Report Date</p>
              <p className="text-sm font-mono text-slate-200">
                {record.REPORT_DATE
                  ? new Date(record.REPORT_DATE).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>

          {/* BMS ID Comparison */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              BMS ID Comparison
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1">Before (Day Before Yesterday)</p>
                <p className="text-sm font-mono text-slate-200">{record.BEFORE_YESTERDAY_MAX_BMS_ID || "—"}</p>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1">After (Yesterday First)</p>
                <p className="text-sm font-mono text-slate-200">{record.YESTERDAY_FIRST_BMS_ID || "—"}</p>
              </div>
            </div>
            {isSwap ? (
              <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-300">Different BMS IDs detected - Battery Swap</span>
              </div>
            ) : (
              <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-300">Same BMS ID - Illegal Charging Detected</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Battery Timeline
            </p>
            <div className="space-y-3">
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>Day Before Yesterday (max)</span>
                  <span>{formatDateTime(record.BEFORE_YESTERDAY_MAX_CTIME)}</span>
                </div>
                <BatteryBar pct={record.BEFORE_YESTERDAY_MAX_BATPERCENT} color="bg-slate-500" />
                <div className="text-xs text-slate-500 mt-1">BMS: {record.BEFORE_YESTERDAY_MAX_BMS_ID || "—"}</div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="h-px flex-1 bg-slate-700" />
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${cfg.badge} border`}>
                  <TrendingUp className="w-3 h-3" />
                  +{record.BATPERCENT_DIFFERENCE}% jump
                </div>
                <div className="h-px flex-1 bg-slate-700" />
              </div>
              <div className={`rounded-xl p-3 border ${cfg.border} ${cfg.bg}`}>
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>Yesterday (first recorded)</span>
                  <span>{formatDateTime(record.YESTERDAY_FIRST_CTIME)}</span>
                </div>
                <BatteryBar pct={record.YESTERDAY_FIRST_BATPERCENT} color={cfg.bar} />
                <div className="text-xs text-slate-500 mt-1">BMS: {record.YESTERDAY_FIRST_BMS_ID || "—"}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Event Type</span>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${isSwap ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : cfg.badge}`}>
              {isSwap ? "🔄 Battery Swap" : `${cfg.label} (+${record.BATPERCENT_DIFFERENCE}%)`}
            </span>
          </div>
        </div>

        <div className={`p-4 border-t ${cfg.border}`}>
          <Button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BatteryAnalysisPage() {

  // ── Battery History filter state ───────────────────────────────────────────

  const [availableVehicles, setAvailableVehicles] = useState<VehicleListItem[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleLoadError, setVehicleLoadError] = useState<string | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);

  const getDefaultEndDate = () => new Date().toISOString().split("T")[0];
  const getDefaultStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return d.toISOString().split("T")[0];
  };

  const [tempSelectedVehicle, setTempSelectedVehicle] = useState<string | null>(null);
  const [tempStartDate, setTempStartDate] = useState(getDefaultStartDate());
  const [tempEndDate, setTempEndDate] = useState(getDefaultEndDate());
  const [dateRangeError, setDateRangeError] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");

  const [batteryFilters, setBatteryFilters] = useState<BatteryFilters>({
    timeRange: 72,
    includeIdleData: true,
    selectedVehicleImei: null,
    startTimestamp: Math.floor(new Date(getDefaultStartDate() + "T00:00:00").getTime() / 1000),
    endTimestamp: Math.floor(new Date(getDefaultEndDate() + "T23:59:59").getTime() / 1000),
  });

  // ── Illegal charging state ─────────────────────────────────────────────────

  const [fraudRecords, setFraudRecords] = useState<SuspiciousRecord[]>([]);
  const [fraudLoading, setFraudLoading] = useState(false);
  const [fraudError, setFraudError] = useState<string | null>(null);
  const [fraudLastRefreshed, setFraudLastRefreshed] = useState<Date | null>(null);
  const [isFraudSectionExpanded, setIsFraudSectionExpanded] = useState(true);

  const [fraudSearch, setFraudSearch] = useState("");
  const [fraudSeverityFilter, setFraudSeverityFilter] = useState<"all" | "critical" | "warning" | "low">("all");
  const [fraudEventTypeFilter, setFraudEventTypeFilter] = useState<EventTypeFilter>("all");
  const [fraudMinThreshold, setFraudMinThreshold] = useState(5);
  const [fraudSortField, setFraudSortField] = useState<SortField>("BATPERCENT_DIFFERENCE");
  const [fraudSortDir, setFraudSortDir] = useState<SortDir>("desc");
  const [selectedFraudRecord, setSelectedFraudRecord] = useState<SuspiciousRecord | null>(null);

  // ── Vehicle list fetch ─────────────────────────────────────────────────────

  useEffect(() => { fetchVehicleList(); }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(e.target as Node))
        setIsVehicleDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchVehicleList = async () => {
    if (loadingVehicles) return;
    try {
      setLoadingVehicles(true);
      setVehicleLoadError(null);
      const sql = `
        SELECT DISTINCT
          TBOX_ID as TBOX_IMEI_NO,
          VEHICLE_ID,
          COALESCE(CHASSIS_NUMBER, VEHICLE_ID, TBOX_ID) as CHASSIS_NUMBER
        FROM SOURCE_DATA.MASTER_DATA.VEHICLE
        WHERE TBOX_ID IS NOT NULL
          AND LENGTH(TBOX_ID) > 5
          AND ACTIVE = 1
          AND (DELETED = 0 OR DELETED IS NULL)
        ORDER BY CHASSIS_NUMBER
        LIMIT 1000
      `;
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const results = await res.json();
      setAvailableVehicles(results || []);
    } catch (err) {
      setVehicleLoadError(err instanceof Error ? err.message : "Failed to load vehicles");
      setAvailableVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  // ── Fraud data fetch ───────────────────────────────────────────────────────

  const fetchFraudData = useCallback(async () => {
    setFraudLoading(true);
    setFraudError(null);
    const sql = `
      SELECT
        REPORT_DATE, 
        TBOXID, 
        CUSTOMER_ID, 
        CUSTOMER_NAME, 
        CHASSIS_NUMBER,
        YESTERDAY_FIRST_CTIME, 
        YESTERDAY_FIRST_BATPERCENT,
        YESTERDAY_FIRST_BMS_ID,
        BEFORE_YESTERDAY_MAX_CTIME, 
        BEFORE_YESTERDAY_MAX_BATPERCENT,
        BEFORE_YESTERDAY_MAX_BMS_ID,
        BATPERCENT_DIFFERENCE,
        CASE 
          WHEN YESTERDAY_FIRST_BMS_ID != BEFORE_YESTERDAY_MAX_BMS_ID 
            OR YESTERDAY_FIRST_BMS_ID IS NULL 
            OR BEFORE_YESTERDAY_MAX_BMS_ID IS NULL
          THEN 'BATTERY_SWAP' 
          ELSE 'ILLEGAL_CHARGE' 
        END as EVENT_TYPE,
        CASE 
          WHEN YESTERDAY_FIRST_BMS_ID != BEFORE_YESTERDAY_MAX_BMS_ID 
            OR YESTERDAY_FIRST_BMS_ID IS NULL 
            OR BEFORE_YESTERDAY_MAX_BMS_ID IS NULL
          THEN 1 
          ELSE 0 
        END as IS_SWAP
      FROM REPORT_DB.GPS_DASHBOARD.TBOX_BATPERCENT_SUMMARY
      WHERE BATPERCENT_DIFFERENCE >= ${fraudMinThreshold}
        AND REPORT_DATE >= DATEADD(day, -7, CURRENT_DATE())
      ORDER BY REPORT_DATE DESC, BATPERCENT_DIFFERENCE DESC
      LIMIT 1000
    `;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFraudRecords(data || []);
      setFraudLastRefreshed(new Date());
    } catch (err) {
      setFraudError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setFraudLoading(false);
    }
  }, [fraudMinThreshold]);

  useEffect(() => { fetchFraudData(); }, [fetchFraudData]);

  // ── Battery History helpers ────────────────────────────────────────────────

  const calculateDaysDifference = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));

  const handleStartDateChange = (val: string) => {
    setTempStartDate(val);
    setDateRangeError("");
    const maxEnd = new Date(val);
    maxEnd.setDate(maxEnd.getDate() + 3);
    if (calculateDaysDifference(val, tempEndDate) > 3) {
      setTempEndDate(maxEnd.toISOString().split("T")[0]);
      setDateRangeError("End date adjusted to maintain 3-day maximum range");
    } else if (new Date(tempEndDate) < new Date(val)) {
      setTempEndDate(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    setDateRangeError("");
    if (calculateDaysDifference(tempStartDate, val) > 3) {
      const maxEnd = new Date(tempStartDate);
      maxEnd.setDate(maxEnd.getDate() + 3);
      setTempEndDate(maxEnd.toISOString().split("T")[0]);
      setDateRangeError("Maximum date range is 3 days");
      return;
    }
    if (new Date(val) < new Date(tempStartDate)) {
      setTempEndDate(tempStartDate);
      setDateRangeError("End date cannot be before start date");
      return;
    }
    setTempEndDate(val);
  };

  const getMaxEndDate = () => {
    const maxEnd = new Date(tempStartDate);
    maxEnd.setDate(maxEnd.getDate() + 3);
    const today = new Date();
    return maxEnd < today ? maxEnd.toISOString().split("T")[0] : today.toISOString().split("T")[0];
  };

  const handleVehicleSelect = (imei: string) => {
    setTempSelectedVehicle(imei);
    setVehicleSearch("");
    setIsVehicleDropdownOpen(false);
  };

  const handleApplyFilters = () => {
    const startTime = new Date(tempStartDate + "T00:00:00").getTime() / 1000;
    const endTime = new Date(tempEndDate + "T23:59:59").getTime() / 1000;
    setBatteryFilters({
      timeRange: Math.ceil((endTime - startTime) / 3600),
      startTimestamp: startTime,
      endTimestamp: endTime,
      includeIdleData: true,
      selectedVehicleImei: tempSelectedVehicle,
    });
  };

  const handleClearFilters = () => {
    const s = getDefaultStartDate();
    const e = getDefaultEndDate();
    setTempStartDate(s);
    setTempEndDate(e);
    setTempSelectedVehicle(null);
    setDateRangeError("");
    setVehicleSearch("");
    setBatteryFilters({
      timeRange: 72,
      startTimestamp: new Date(s + "T00:00:00").getTime() / 1000,
      endTimestamp: new Date(e + "T23:59:59").getTime() / 1000,
      includeIdleData: true,
      selectedVehicleImei: null,
    });
  };

  const hasUnappliedChanges = () => {
    return (
      tempSelectedVehicle !== batteryFilters.selectedVehicleImei ||
      new Date(tempStartDate + "T00:00:00").getTime() / 1000 !== batteryFilters.startTimestamp ||
      new Date(tempEndDate + "T23:59:59").getTime() / 1000 !== batteryFilters.endTimestamp
    );
  };

  const getActiveFiltersCount = () => {
    let n = 0;
    if (batteryFilters.selectedVehicleImei) n++;
    if (batteryFilters.timeRange !== 72) n++;
    if (batteryFilters.includeIdleData) n++;
    return n;
  };

  // ── Fraud table derived data ───────────────────────────────────────────────

  const filteredFraud = fraudRecords
    .filter((r) => {
      const sev = getSeverity(r.BATPERCENT_DIFFERENCE);
      if (fraudSeverityFilter !== "all" && sev !== fraudSeverityFilter) return false;
      if (fraudEventTypeFilter !== "all" && r.EVENT_TYPE !== fraudEventTypeFilter) return false;
      if (fraudSearch) {
        const q = fraudSearch.toLowerCase();
        return (
          r.TBOXID?.toLowerCase().includes(q) ||
          r.CUSTOMER_ID?.toLowerCase().includes(q) ||
          r.CUSTOMER_NAME?.toLowerCase().includes(q) ||
          r.CHASSIS_NUMBER?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const av = a[fraudSortField], bv = b[fraudSortField];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return fraudSortDir === "asc" ? cmp : -cmp;
    });

  const fraudStats = {
    critical: fraudRecords.filter((r) => getSeverity(r.BATPERCENT_DIFFERENCE) === "critical").length,
    warning: fraudRecords.filter((r) => getSeverity(r.BATPERCENT_DIFFERENCE) === "warning").length,
    low: fraudRecords.filter((r) => getSeverity(r.BATPERCENT_DIFFERENCE) === "low").length,
    swaps: fraudRecords.filter((r) => r.IS_SWAP).length,
    illegalCharges: fraudRecords.filter((r) => !r.IS_SWAP).length,
    uniqueVehicles: new Set(fraudRecords.map((r) => r.TBOXID)).size,
    maxJump: fraudRecords.length > 0 ? Math.max(...fraudRecords.map((r) => r.BATPERCENT_DIFFERENCE)) : 0,
    avgJump: fraudRecords.length > 0
      ? Math.round(fraudRecords.reduce((s, r) => s + r.BATPERCENT_DIFFERENCE, 0) / fraudRecords.length)
      : 0,
  };

  const handleFraudSort = (field: SortField) => {
    if (fraudSortField === field) setFraudSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setFraudSortField(field); setFraudSortDir("desc"); }
  };

  const FraudSortIcon = ({ field }: { field: SortField }) => {
    if (fraudSortField !== field) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />;
    return fraudSortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-purple-400" />
      : <ChevronDown className="w-3 h-3 text-purple-400" />;
  };

  const exportFraudCSV = () => {
    if (!filteredFraud.length) return;
    const headers = Object.keys(filteredFraud[0]).join(",");
    const rows = filteredFraud.map((r) => Object.values(r).join(","));
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `battery_events_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedVehicle = availableVehicles.find((v) => v.TBOX_IMEI_NO === tempSelectedVehicle);
  const appliedVehicle = availableVehicles.find((v) => v.TBOX_IMEI_NO === batteryFilters.selectedVehicleImei);
  const filteredVehicles = availableVehicles.filter((v) =>
    v.CHASSIS_NUMBER?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.TBOX_IMEI_NO?.includes(vehicleSearch) ||
    v.VEHICLE_ID?.toLowerCase().includes(vehicleSearch.toLowerCase())
  );
  const daysDifference = calculateDaysDifference(tempStartDate, tempEndDate);

  // ── Compute fraud events for the currently selected vehicle ───────────────
  const selectedVehicleFraudEvents = batteryFilters.selectedVehicleImei
    ? (() => {
        const appliedChassis = availableVehicles.find(
          (v) => v.TBOX_IMEI_NO === batteryFilters.selectedVehicleImei
        )?.CHASSIS_NUMBER;

        if (!appliedChassis) return [];

        return fraudRecords
          .filter((r) => r.CHASSIS_NUMBER === appliedChassis)
          .map((r) => ({
            timestamp: r.YESTERDAY_FIRST_CTIME,
            beforePct: r.BEFORE_YESTERDAY_MAX_BATPERCENT,
            afterPct: r.YESTERDAY_FIRST_BATPERCENT,
            diff: r.BATPERCENT_DIFFERENCE,
            isSwap: r.IS_SWAP,
            beforeBmsId: r.BEFORE_YESTERDAY_MAX_BMS_ID,
            afterBmsId: r.YESTERDAY_FIRST_BMS_ID,
          }));
      })()
    : [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {selectedFraudRecord && (
        <DetailModal record={selectedFraudRecord} onClose={() => setSelectedFraudRecord(null)} />
      )}

      <div className="max-w-7xl mx-auto space-y-6 p-6">

        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <Car className="h-4 w-4 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-sm font-medium">Battery Analytics</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Battery History & Diagnostics
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Comprehensive battery performance, health insights, and fraud detection with BMS tracking
          </p>
        </div>

        {/* Fraud Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Critical", value: fraudStats.critical, icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", filter: "critical" as const },
            { label: "Warning", value: fraudStats.warning, icon: <Zap className="w-4 h-4" />, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", filter: "warning" as const },
            { label: "Suspicious", value: fraudStats.low, icon: <Shield className="w-4 h-4" />, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", filter: "low" as const },
            { label: "Illegal Charges", value: fraudStats.illegalCharges, icon: <ShieldAlert className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", filter: null },
            { label: "Battery Swaps", value: fraudStats.swaps, icon: <ArrowLeftRight className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", filter: null },
            { label: "Vehicles", value: fraudStats.uniqueVehicles, icon: <Car className="w-4 h-4" />, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", filter: null },
            { label: "Max Jump", value: `+${fraudStats.maxJump}%`, icon: <TrendingUp className="w-4 h-4" />, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", filter: null },
            { label: "Avg Jump", value: `+${fraudStats.avgJump}%`, icon: <Activity className="w-4 h-4" />, color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20", filter: null },
          ].map((s, i) => (
            <button
              key={i}
              onClick={() => s.filter && setFraudSeverityFilter(fraudSeverityFilter === s.filter ? "all" : s.filter)}
              className={`rounded-xl border p-3 text-left transition-all duration-200 ${s.border} ${s.bg}
                ${s.filter ? "cursor-pointer hover:scale-105 hover:shadow-lg" : "cursor-default"}
                ${s.filter && fraudSeverityFilter === s.filter ? "ring-2 ring-white/20 scale-105" : ""}
              `}
            >
              <div className={`flex items-center gap-1.5 mb-1 ${s.color}`}>
                {s.icon}
                <span className="text-xs font-medium">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </button>
          ))}
        </div>

        {/* Fraud Collapsible Section */}
        <Card className="transition-all duration-300">
          <CardContent className="p-0">
            <button
              onClick={() => setIsFraudSectionExpanded(!isFraudSectionExpanded)}
              className="w-full p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400" />
                <span className="font-medium">Battery Events & Alerts</span>
                {fraudStats.critical > 0 && (
                  <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">
                    {fraudStats.critical} critical
                  </Badge>
                )}
                {fraudStats.swaps > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {fraudStats.swaps} swaps
                  </Badge>
                )}
                {fraudLastRefreshed && !isFraudSectionExpanded && (
                  <span className="text-xs text-slate-500 ml-1">
                    · {filteredFraud.length} records
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); fetchFraudData(); }}
                  disabled={fraudLoading}
                >
                  {fraudLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RefreshCw className="w-4 h-4" />
                  }
                </Button>
                {isFraudSectionExpanded
                  ? <ChevronUp className="h-5 w-5 text-slate-400" />
                  : <ChevronDown className="h-5 w-5 text-slate-400" />
                }
              </div>
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isFraudSectionExpanded ? "opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
              <div className="border-t border-slate-700">

                {/* Fraud Filters Bar */}
                <div className="p-4 border-b border-slate-800">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-48 space-y-1">
                      <Label className="text-xs">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="TBOX ID, Chassis, Customer ID or Name…"
                          value={fraudSearch}
                          onChange={(e) => setFraudSearch(e.target.value)}
                          className="w-full bg-slate-700 border border-slate-600 text-slate-200 pl-9 pr-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        />
                        {fraudSearch && (
                          <button onClick={() => setFraudSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 w-44">
                      <Label className="text-xs">Min. Battery Jump (%)</Label>
                      <input
                        type="number"
                        min={1} max={100}
                        value={fraudMinThreshold}
                        onChange={(e) => setFraudMinThreshold(Number(e.target.value))}
                        className="w-full bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Severity</Label>
                      <div className="flex items-center gap-2">
                        {(["all", "critical", "warning", "low"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setFraudSeverityFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                              fraudSeverityFilter === s
                                ? "bg-purple-600 text-white border-purple-500"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Event Type</Label>
                      <div className="flex items-center gap-2">
                        {(["all", "ILLEGAL_CHARGE", "BATTERY_SWAP"] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => setFraudEventTypeFilter(type)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                              fraudEventTypeFilter === type
                                ? type === "BATTERY_SWAP" 
                                  ? "bg-blue-600 text-white border-blue-500"
                                  : "bg-purple-600 text-white border-purple-500"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            {type === "all" ? "All" : type === "ILLEGAL_CHARGE" ? "⚡ Illegal" : "🔄 Swap"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-auto">
                      <Button variant="outline" size="sm" onClick={exportFraudCSV} disabled={!filteredFraud.length} className="border-slate-600">
                        <Download className="w-4 h-4 mr-1.5" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Fraud Table */}
                {fraudError ? (
                  <div className="p-10 text-center">
                    <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <p className="text-red-400 font-medium">Failed to load data</p>
                    <p className="text-slate-500 text-sm mt-1">{fraudError}</p>
                    <Button variant="outline" size="sm" onClick={fetchFraudData} className="mt-4">Retry</Button>
                  </div>
                ) : fraudLoading && fraudRecords.length === 0 ? (
                  <div className="p-10 text-center">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Loading battery events…</p>
                  </div>
                ) : filteredFraud.length === 0 ? (
                  <div className="p-10 text-center">
                    <Shield className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No events found</p>
                    <p className="text-slate-500 text-sm mt-1">Try adjusting the filters or minimum battery jump threshold</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {filteredFraud.length} of {fraudRecords.length} records
                        {fraudLastRefreshed && ` · refreshed ${fraudLastRefreshed.toLocaleTimeString()}`}
                      </span>
                      {fraudLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/50">
                            {[
                              { key: "REPORT_DATE", label: "Date" },
                              { key: "TBOXID", label: "TBOX ID" },
                              { key: "CHASSIS_NUMBER", label: "Chassis" },
                              { key: "CUSTOMER_NAME", label: "Customer" },
                              { key: "BEFORE_YESTERDAY_MAX_BATPERCENT", label: "Before" },
                              { key: "YESTERDAY_FIRST_BATPERCENT", label: "After" },
                              { key: "BATPERCENT_DIFFERENCE", label: "Jump" },
                              { key: "BMS_IDS", label: "BMS ID" },
                            ].map((col) => (
                              <th
                                key={col.key}
                                onClick={() => col.key !== "BMS_IDS" && handleFraudSort(col.key as SortField)}
                                className={`px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider ${
                                  col.key !== "BMS_IDS" ? "cursor-pointer hover:text-slate-200 transition-colors" : ""
                                } select-none`}
                              >
                                <div className="flex items-center gap-1">
                                  {col.label}
                                  {col.key !== "BMS_IDS" && <FraudSortIcon field={col.key as SortField} />}
                                </div>
                              </th>
                            ))}
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Severity</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {filteredFraud.map((record, idx) => {
                            const severity = getSeverity(record.BATPERCENT_DIFFERENCE);
                            const cfg = severityConfig[severity];
                            const isSwap = record.IS_SWAP;
                            return (
                              <tr key={`${record.TBOXID}-${record.REPORT_DATE}-${idx}`} className="hover:bg-slate-800/30 transition-colors group">
                                {/* Report Date */}
                                <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-500" />
                                    {record.REPORT_DATE
                                      ? new Date(record.REPORT_DATE).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                      : "—"}
                                  </div>
                                </td>
                                {/* TBOX ID */}
                                <td className="px-4 py-3">
                                  <span className="font-mono text-slate-200 text-xs bg-slate-800 px-2 py-1 rounded">
                                    {record.TBOXID}
                                  </span>
                                </td>
                                {/* Chassis */}
                                <td className="px-4 py-3">
                                  <span className="font-mono text-slate-300 text-xs">
                                    {record.CHASSIS_NUMBER || "—"}
                                  </span>
                                </td>
                                {/* Customer */}
                                <td className="px-4 py-3">
                                  <div className="text-slate-200 font-medium text-xs">{record.CUSTOMER_NAME || "—"}</div>
                                  <div className="text-slate-500 text-xs">{record.CUSTOMER_ID}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="w-28">
                                    <BatteryBar pct={record.BEFORE_YESTERDAY_MAX_BATPERCENT} color="bg-slate-500" />
                                    <div className="text-xs text-slate-500 mt-0.5">
                                      {formatDateTime(record.BEFORE_YESTERDAY_MAX_CTIME)}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="w-28">
                                    <BatteryBar pct={record.YESTERDAY_FIRST_BATPERCENT} color={isSwap ? "bg-blue-500" : cfg.bar} />
                                    <div className="text-xs text-slate-500 mt-0.5">
                                      {formatDateTime(record.YESTERDAY_FIRST_CTIME)}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className={`inline-flex items-center gap-1 font-bold text-sm ${isSwap ? "text-blue-400" : cfg.color}`}>
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    +{record.BATPERCENT_DIFFERENCE}%
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-xs">
                                    <div className="text-slate-400">Before: <span className="font-mono text-slate-300">{record.BEFORE_YESTERDAY_MAX_BMS_ID || "—"}</span></div>
                                    <div className="text-slate-400">After: <span className="font-mono text-slate-300">{record.YESTERDAY_FIRST_BMS_ID || "—"}</span></div>
                                    {isSwap && (
                                      <Badge className="mt-1 bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
                                        🔄 Different
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {isSwap ? (
                                    <span className="text-xs px-2.5 py-1 rounded-full border font-medium bg-blue-500/20 text-blue-300 border-blue-500/30 flex items-center gap-1">
                                      <ArrowLeftRight className="w-3 h-3" /> Swap
                                    </span>
                                  ) : (
                                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.badge}`}>
                                      ⚡ Illegal
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${isSwap ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : cfg.badge}`}>
                                    {isSwap ? "N/A" : cfg.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setSelectedFraudRecord(record)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                                    title="View details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Legend */}
                <div className="p-4 border-t border-slate-800">
                  <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500">
                    <span className="font-semibold text-slate-400">Detection Logic:</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /><b className="text-slate-400">Critical</b> ≥ {THRESHOLD_CRITICAL}% jump</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /><b className="text-slate-400">Warning</b> {THRESHOLD_WARNING}–{THRESHOLD_CRITICAL - 1}%</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /><b className="text-slate-400">Suspicious</b> below {THRESHOLD_WARNING}%</span>
                    <span className="flex items-center gap-1.5"><ArrowLeftRight className="w-3 h-3 text-blue-400" /><b className="text-slate-400">Swap</b> Different BMS IDs</span>
                    <span className="flex items-center gap-1.5"><ShieldAlert className="w-3 h-3 text-red-400" /><b className="text-slate-400">Illegal</b> Same BMS ID</span>
                    <span className="ml-auto">Last 7 days · Compares day-before-yesterday max vs yesterday first reading</span>
                  </div>
                </div>

              </div>
            </div>
          </CardContent>
        </Card>

        {/* Battery History Filters Card */}
        <Card className="transition-all duration-300">
          <CardContent className="p-0">
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="w-full p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="font-medium">Battery Filters</span>
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary">{getActiveFiltersCount()} active</Badge>
                )}
                {appliedVehicle && !isFilterExpanded && (
                  <Badge variant="outline" className="ml-2">{appliedVehicle.CHASSIS_NUMBER}</Badge>
                )}
                {hasUnappliedChanges() && (
                  <Badge variant="default" className="ml-2 bg-orange-600">Unapplied changes</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getActiveFiltersCount() > 0 && (
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleClearFilters(); }}>
                    <X className="h-4 w-4 mr-1" />Clear All
                  </Button>
                )}
                {isFilterExpanded
                  ? <ChevronUp className="h-5 w-5 text-slate-400" />
                  : <ChevronDown className="h-5 w-5 text-slate-400" />
                }
              </div>
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isFilterExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
              <div className="p-4 pt-4 space-y-4 border-t border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                  {/* Vehicle dropdown */}
                  <div className="space-y-2 relative" ref={vehicleDropdownRef}>
                    <Label>Select Vehicle</Label>
                    <button
                      onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                      className="w-full bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 flex items-center justify-between hover:bg-slate-600 transition-colors"
                    >
                      <span className="truncate">
                        {selectedVehicle ? selectedVehicle.CHASSIS_NUMBER : "Click to select vehicle..."}
                      </span>
                      <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isVehicleDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isVehicleDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-2">
                        <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-80 overflow-hidden">
                          <div className="p-2 border-b border-slate-700 sticky top-0 bg-slate-800">
                            <div className="relative">
                              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Search by chassis or IMEI..."
                                value={vehicleSearch}
                                onChange={(e) => setVehicleSearch(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 text-slate-200 pl-10 pr-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto p-2">
                            {loadingVehicles ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400 mr-2" />
                                <span className="text-sm text-slate-400">Loading vehicles...</span>
                              </div>
                            ) : vehicleLoadError ? (
                              <div className="text-center py-4">
                                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                                <p className="text-sm text-red-400 mb-2">Failed to load vehicles</p>
                                <p className="text-xs text-slate-500 mb-3">{vehicleLoadError}</p>
                                <button onClick={fetchVehicleList} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded">
                                  Retry
                                </button>
                              </div>
                            ) : filteredVehicles.length === 0 ? (
                              <div className="text-center py-4 text-sm text-slate-400">
                                {vehicleSearch ? "No vehicles found" : "No vehicles available"}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {filteredVehicles.map((vehicle) => (
                                  <button
                                    key={vehicle.VEHICLE_ID}
                                    onClick={() => handleVehicleSelect(vehicle.TBOX_IMEI_NO)}
                                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                                      tempSelectedVehicle === vehicle.TBOX_IMEI_NO
                                        ? "bg-purple-600 text-white"
                                        : "hover:bg-slate-700 text-slate-300"
                                    }`}
                                  >
                                    <div className="text-sm font-medium">{vehicle.CHASSIS_NUMBER}</div>
                                    <div className="text-xs opacity-70">IMEI: {vehicle.TBOX_IMEI_NO}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedVehicle && (
                      <Badge variant="secondary" className="w-full justify-between mt-2">
                        <span className="truncate">{selectedVehicle.CHASSIS_NUMBER}</span>
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer hover:text-red-400"
                          onClick={(e) => { e.stopPropagation(); handleVehicleSelect(""); }}
                        />
                      </Badge>
                    )}
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      max={getDefaultEndDate()}
                      className="w-full bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      min={tempStartDate}
                      max={getMaxEndDate()}
                      className="w-full bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Selected Range:</span>
                      <span className={`font-medium ${daysDifference === 3 ? "text-purple-400" : "text-blue-400"}`}>
                        {daysDifference} day{daysDifference !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {dateRangeError && (
                      <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded px-2 py-1">
                        {dateRangeError}
                      </div>
                    )}
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      onClick={handleApplyFilters}
                      disabled={!tempSelectedVehicle || !hasUnappliedChanges()}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Battery History Component ──────────────────────────────────── */}
        {batteryFilters.selectedVehicleImei ? (
          <BatteryHistory
            IMEI={batteryFilters.selectedVehicleImei}
            filters={batteryFilters}
            illegalChargeEvents={selectedVehicleFraudEvents}
          />
        ) : (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Car className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-medium text-slate-300 mb-2">No Vehicle Selected</h3>
              <p className="text-slate-400 mb-6">
                Please select a vehicle from the filters above and click "Apply Filters" to view its battery history
              </p>
              <Button variant="outline" onClick={() => setIsFilterExpanded(true)} className="mx-auto">
                <Filter className="h-4 w-4 mr-2" />
                Open Filters
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}