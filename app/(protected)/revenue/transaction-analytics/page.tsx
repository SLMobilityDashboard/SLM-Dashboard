"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock,
  MapPin,
  Battery,
  Search,
  Download,
  DollarSign,
  Package,
  TrendingUp,
  Zap,
  User,
  ArrowRight,
  CheckCircle,
  Thermometer,
  AlertCircle,
  CircleDot,
  Hash,
  DoorOpen,
  Power,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  SwapFilters,
  type SwapFilters as SwapFiltersType,
} from "@/components/revenue/SwapFilters";
import {
  useSwapTransactions,
  type SwapTransaction,
} from "@/hooks/useSwapTransactions";

// Display helpers
const formatTimestamp = (timestampMs: number) => {
  if (!timestampMs) return { date: "—", time: "—" };
  const d = new Date(timestampMs);
  return {
    date: d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const fmt = (v: number, dp = 1, unit = "", showZero = false): string => {
  if (!showZero && (v === 0 || v === null || v === undefined)) return "—";
  return `${v.toFixed(dp)}${unit}`;
};

const fmtInt = (v: number, unit = "", showZero = false): string => {
  if (!showZero && !v) return "—";
  return `${Math.round(v)}${unit}`;
};

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "PAID":
    case "SUCCESS":
    case "COMPLETED":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    
    case "FAILED":
    case "CANCELLED":
    case "VOIDED":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    
    case "PENDING":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
};

const getBatteryHealth = (temp: number, voltage: number, battStatus: number) => {
  if (battStatus === 0)
    return { label: "Fault", color: "text-red-400", icon: AlertCircle };
  if (temp > 40)
    return { label: "Hot", color: "text-orange-400", icon: Thermometer };
  if (voltage > 0 && voltage < 45)
    return { label: "Low V", color: "text-yellow-400", icon: Zap };
  return { label: "Good", color: "text-green-400", icon: CheckCircle };
};

const SwapCard: React.FC<{ swap: SwapTransaction }> = ({ swap }) => {
  const { date, time } = formatTimestamp(swap.TRANSACTION_TIME);
  const batteryGain = swap.NEWBID_BATPERCENT - swap.OLDBID_BATPERCENT;

  const oldHealth = getBatteryHealth(
    swap.OLDCABINET_CELL_TEMP,
    swap.OLDCABINET_V,
    swap.OLDCABINET_BATTERY_STATUS
  );
  const newHealth = getBatteryHealth(
    swap.NEWCABINET_CELL_TEMP,
    swap.NEWCABINET_V,
    swap.NEWCABINET_BATTERY_STATUS
  );

  return (
    <Card className="border-slate-800 hover:border-slate-700 transition-all duration-200 group">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-slate-800 rounded-lg flex-shrink-0">
              <Battery className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-slate-200 font-semibold text-base font-mono truncate">
                {swap.PAYMENT_ID || "—"}
              </h3>
              <p className="text-slate-400 text-xs">
                {date} · {time}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-lg p-3 space-y-2 mb-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Transaction
          </p>
          <div className="grid grid-cols-1 gap-1.5 text-xs">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-purple-400 flex-shrink-0" />
              <span className="text-slate-500">Customer:</span>
              <span className="text-slate-200 font-mono truncate">
                {swap.CUSTOMER_NAME || swap.CUSTOMER_ID || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-blue-400 flex-shrink-0" />
              <span className="text-slate-500">Station:</span>
              <span className="text-slate-200 truncate">
                {swap.STATION_NAME || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CircleDot className="h-3 w-3 text-cyan-400 flex-shrink-0" />
              <span className="text-slate-500">Location:</span>
              <span className="text-slate-200 truncate">
                {swap.LOCATION_NAME || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-3 space-y-3 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-xs font-medium uppercase tracking-wide">
              Battery Swap
            </span>
            <span
              className={`text-sm font-bold ${
                batteryGain >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {batteryGain >= 0 ? "+" : ""}
              {batteryGain}%
            </span>
          </div>

          <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-700/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Battery className="h-3.5 w-3.5 text-red-400" />
                <span className="text-slate-400 text-xs">Returned</span>
              </div>
              <Badge variant="outline" className="text-xs font-mono h-5 px-1.5">
                Cab {swap.OLDCABINET_NO || "—"}
              </Badge>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-slate-500">BID</span>
              <span className="text-slate-300 font-mono">
                {swap.OLDCABINET_BID || "—"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Charge</span>
                <span className="text-red-400 font-semibold">
                  {fmtInt(swap.OLDBID_BATPERCENT, "%", true)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Voltage</span>
                <span className="text-slate-300">
                  {fmt(swap.OLDCABINET_V, 1, "V")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-800 text-xs">
              <span
                className={`flex items-center gap-1 ${
                  swap.OLDCABINET_DOOR ? "text-green-400" : "text-slate-500"
                }`}
              >
                <DoorOpen className="h-3 w-3" />
                {swap.OLDCABINET_DOOR ? "Door open" : "Door closed"}
              </span>
              <span
                className={`flex items-center gap-1 ${
                  swap.OLDCABINET_CHARGER_ONLINE
                    ? "text-green-400"
                    : "text-slate-500"
                }`}
              >
                <Power className="h-3 w-3" />
                {swap.OLDCABINET_CHARGER_ONLINE ? "Charger on" : "Charger off"}
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-4 w-4 text-slate-600" />
          </div>

          <div className="bg-slate-900/60 rounded-lg p-2.5 border border-emerald-800/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Battery className="h-3.5 w-3.5 text-green-400" />
                <span className="text-slate-400 text-xs">Dispensed</span>
              </div>
              <Badge
                variant="outline"
                className="text-xs font-mono h-5 px-1.5 border-emerald-800"
              >
                Cab {swap.NEWCABINET_NO || "—"}
              </Badge>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-slate-500">BID</span>
              <span className="text-slate-300 font-mono">
                {swap.NEWCABINET_BID || "—"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Charge</span>
                <span className="text-emerald-400 font-semibold">
                  {fmtInt(swap.NEWBID_BATPERCENT, "%", true)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Voltage</span>
                <span className="text-slate-300">
                  {fmt(swap.NEWCABINET_V, 1, "V")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-800 text-xs">
              <span
                className={`flex items-center gap-1 ${
                  swap.NEWCABINET_DOOR ? "text-green-400" : "text-slate-500"
                }`}
              >
                <DoorOpen className="h-3 w-3" />
                {swap.NEWCABINET_DOOR ? "Door open" : "Door closed"}
              </span>
              <span
                className={`flex items-center gap-1 ${
                  swap.NEWCABINET_CHARGER_ONLINE
                    ? "text-green-400"
                    : "text-slate-500"
                }`}
              >
                <Power className="h-3 w-3" />
                {swap.NEWCABINET_CHARGER_ONLINE ? "Charger on" : "Charger off"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Payment
          </p>
          <div className="flex items-center justify-between py-1.5 px-2 bg-slate-900/50 rounded">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-slate-300 text-sm">Amount</span>
            </div>
            <span className="text-slate-100 font-bold">
              {swap.AMOUNT > 0 ? `LKR ${swap.AMOUNT.toFixed(2)}` : "—"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between py-1 px-2 bg-slate-900/30 rounded">
              <span className="text-slate-500">Method</span>
              <span className="text-slate-300">
                {swap.PAYMENT_METHOD || "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 px-2 bg-slate-900/30 rounded">
              <span className="text-slate-500">Type</span>
              <span className="text-slate-300">{swap.PAYMENT_TYPE || "—"}</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-1.5 px-2 bg-slate-900/50 rounded">
            <span className="text-slate-400 text-xs">Pay status</span>
            <Badge
              className={`${getStatusColor(swap.PAYMENT_STATUS)} text-xs h-5 px-2`}
            >
              {swap.PAYMENT_STATUS || "—"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity border-t border-slate-800 pt-2 mt-3">
          <Hash className="h-3 w-3" />
          <span className="font-mono">{swap.PAYMENT_ID || "—"}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const SkeletonCard: React.FC = () => (
  <Card className="border-slate-800 animate-pulse">
    <CardContent className="p-3 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-slate-800 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-800 rounded w-40" />
          <div className="h-3 bg-slate-800 rounded w-24" />
        </div>
        <div className="h-5 bg-slate-800 rounded w-20" />
      </div>
      <div className="h-14 bg-slate-800/50 rounded-lg" />
      <div className="h-44 bg-slate-800/50 rounded-lg" />
      <div className="h-20 bg-slate-800/50 rounded-lg" />
    </CardContent>
  </Card>
);

const SkeletonKpi: React.FC = () => (
  <Card className="animate-pulse">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 bg-slate-800 rounded w-28" />
      <div className="h-4 w-4 bg-slate-800 rounded" />
    </CardHeader>
    <CardContent>
      <div className="h-8 bg-slate-800 rounded w-36 mb-2" />
      <div className="h-3 bg-slate-800 rounded w-48" />
    </CardContent>
  </Card>
);

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, totalItems, pageSize, loading, onPageChange }) => {
  const pages: (number | "...")[] = [];

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
    [1, 2, 3, 4].forEach((p) => pages.push(p));
    pages.push("...");
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1);
    pages.push("...");
    for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push("...");
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push("...");
    pages.push(totalPages);
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
      <p className="text-slate-400 text-sm">
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading page {currentPage}…
          </span>
        ) : (
          <>
            {start.toLocaleString()}–{end.toLocaleString()} of{" "}
            {totalItems.toLocaleString()} swaps
          </>
        )}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="bg-slate-800 border-slate-700 hover:bg-slate-700 disabled:opacity-40"
        >
          Previous
        </Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={i} className="px-2 text-slate-500 text-sm">
              …
            </span>
          ) : (
            <Button
              key={i}
              variant={currentPage === p ? "default" : "ghost"}
              size="sm"
              onClick={() => onPageChange(p as number)}
              disabled={loading}
              className={`min-w-[36px] ${
                currentPage === p
                  ? "bg-slate-700 text-slate-200"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          className="bg-slate-800 border-slate-700 hover:bg-slate-700 disabled:opacity-40"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default function SwapAnalyticsPage() {
  const getDefaultDateRange = () => {
    const today = new Date();
    const lastYear = today.getFullYear() - 1;
    const from = new Date(lastYear, 0, 1); // January 1st of last year
    const to = new Date(lastYear, 11, 31); // December 31st of last year
    return { from, to };
  };

  // ✅ FIX: Use correct SwapFiltersType with selectedCustomers array
  const [appliedFilters, setAppliedFilters] = useState<SwapFiltersType>({
    dateRange: getDefaultDateRange(),
    selectedAreas: [],
    selectedStations: [],
    selectedCustomers: [],  // ✅ Changed from customerId: ""
    paymentMethods: [],
  });

  const [searchTerm, setSearchTerm] = useState("");

  // Debug: Log initial state
  useEffect(() => {
    console.log("🎯 [Page] Mounted with appliedFilters:", appliedFilters);
    console.log("🎯 [Page] Date range valid?", 
      appliedFilters.dateRange?.from instanceof Date,
      appliedFilters.dateRange?.to instanceof Date
    );
  }, []);

  // ✅ FIX: Use appliedFilters (what user confirmed) instead of filters (what's being edited)
  const {
    swaps,
    swapsLoading,
    swapsError,
    kpi,
    kpiLoading,
    kpiError,
    currentPage,
    totalCount,
    totalPages,
    goToPage,
    refetch,
  } = useSwapTransactions(appliedFilters);

  // ✅ FIX: Update appliedFilters when user confirms changes
  const handleFiltersChange = useCallback((f: SwapFiltersType) => {
    console.log("🎯 [Page] Filters changed, updating appliedFilters:", f);
    setAppliedFilters(f);
    setSearchTerm("");
  }, []);

  const isDateRangeSet =
    appliedFilters.dateRange?.from instanceof Date &&
    appliedFilters.dateRange?.to instanceof Date;

  const visibleSwaps = searchTerm
    ? swaps.filter(
        (s) =>
          s.PAYMENT_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.CUSTOMER_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.CUSTOMER_NAME?.toLowerCase().includes(searchTerm.toLowerCase()) ||  // ✅ Added customer name search
          s.STATION_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.LOCATION_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.OLDCABINET_BID.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.NEWCABINET_BID.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : swaps;

  const filterSummary = (() => {
    const parts: string[] = [];
    if (appliedFilters.selectedStations?.length)
      parts.push(
        `${appliedFilters.selectedStations.length} Station${appliedFilters.selectedStations.length > 1 ? "s" : ""}`
      );
    if (appliedFilters.paymentMethods?.length)
      parts.push(
        `${appliedFilters.paymentMethods.length} Payment Method${appliedFilters.paymentMethods.length > 1 ? "s" : ""}`
      );
    if (appliedFilters.selectedAreas?.length)
      parts.push(
        `${appliedFilters.selectedAreas.length} Area${appliedFilters.selectedAreas.length > 1 ? "s" : ""}`
      );
    if (appliedFilters.selectedCustomers?.length)  // ✅ Changed from customerId
      parts.push(
        `${appliedFilters.selectedCustomers.length} Customer${appliedFilters.selectedCustomers.length > 1 ? "s" : ""}`
      );
    return parts.length > 0 ? ` — ${parts.join(", ")}` : "";
  })();

  const handleExport = () => {
    const headers = [
      "Payment ID", "Date", "Time", "Customer ID", "Customer Name", "Model", "Status",
      "Station", "Location",
      "Old Cab", "Old BID", "Old SOC%", "Old Temp°C", "Old V", "Old A",
      "New Cab", "New BID", "New SOC%", "New Temp°C", "New V", "New A",
      "Bat Gain%", "Amount LKR", "Pay Method", "Pay Type", "Pay Status",
    ];
    const rows = swaps.map((s) => {
      const { date, time } = formatTimestamp(s.TRANSACTION_TIME);
      return [
        s.PAYMENT_ID, date, time, s.CUSTOMER_ID, s.CUSTOMER_NAME || "", s.MODEL, s.STATUS,
        s.STATION_NAME, s.LOCATION_NAME,
        s.OLDCABINET_NO, s.OLDCABINET_BID, s.OLDBID_BATPERCENT,
        s.OLDCABINET_CELL_TEMP.toFixed(1), s.OLDCABINET_V.toFixed(1), s.OLDCABINET_I.toFixed(1),
        s.NEWCABINET_NO, s.NEWCABINET_BID, s.NEWBID_BATPERCENT,
        s.NEWCABINET_CELL_TEMP.toFixed(1), s.NEWCABINET_V.toFixed(1), s.NEWCABINET_I.toFixed(1),
        s.NEWBID_BATPERCENT - s.OLDBID_BATPERCENT,
        s.AMOUNT.toFixed(2), s.PAYMENT_METHOD, s.PAYMENT_TYPE, s.PAYMENT_STATUS,
      ];
    });

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swaps_p${currentPage}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Transaction Analytics{filterSummary}
          </h2>
          {isDateRangeSet && (
            <p className="text-muted-foreground text-sm mt-1">
              {totalCount.toLocaleString()} transactions &middot; {totalPages} page
              {totalPages !== 1 ? "s" : ""} · 200 per page
            </p>
          )}
        </div>
        {isDateRangeSet && (
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={swapsLoading || kpiLoading}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                swapsLoading || kpiLoading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        )}
      </div>

      <SwapFilters onFiltersChange={handleFiltersChange} />

      {/* {isDateRangeSet && ( */}
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpiLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} />)
            ) : kpiError ? (
              <div className="col-span-4 flex items-center gap-2 text-red-400 text-sm py-4">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                KPI error: {kpiError}
              </div>
            ) : kpi ? (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Swaps</CardTitle>
                    <Battery className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {kpi.totalSwaps.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {kpi.successfulSwaps.toLocaleString()} completed (
                      {kpi.successRate.toFixed(1)}%)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Revenue
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      LKR{" "}
                      {kpi.totalRevenue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      LKR {kpi.avgSwapValue.toFixed(2)} avg / swap
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avg Battery Gain
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      +{kpi.avgBatteryImprovement.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Per swap improvement
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Infrastructure
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {kpi.uniqueCabinets.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cabinets · {kpi.uniqueStations} Stations ·{" "}
                      {kpi.uniqueBatteries} Batteries
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Transactions{filterSummary}
                  </CardTitle>
                  <CardDescription>
                    Most recent 200 records per page, ordered newest first
                  </CardDescription>
                </div>
                <Button
                  onClick={handleExport}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={swapsLoading || swaps.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Export Page
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search payment ID, customer, station, BID…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {searchTerm && (
                  <p className="text-sm text-slate-400 whitespace-nowrap">
                    {visibleSwaps.length} match
                    {visibleSwaps.length !== 1 ? "es" : ""}
                  </p>
                )}
              </div>

              {swapsError && !swapsLoading && (
                <div className="flex flex-col items-center gap-3 py-10 text-red-400 text-sm">
                  <AlertCircle className="h-8 w-8" />
                  <p className="font-medium">Failed to load transactions</p>
                  <p className="text-slate-500">{swapsError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refetch}
                    className="gap-2 mt-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              )}

              {swapsLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              )}

              {!swapsLoading && !swapsError && visibleSwaps.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-14 bg-slate-900/40 rounded-lg border border-slate-800">
                  <Battery className="h-10 w-10 text-slate-600" />
                  <p className="text-slate-300 font-semibold">
                    {searchTerm
                      ? "No swaps match your search"
                      : "No swaps found for the selected filters"}
                  </p>
                  <p className="text-slate-500 text-sm">
                    {searchTerm
                      ? "Try a different search term"
                      : "Adjust the date range or filters above"}
                  </p>
                </div>
              )}

              {!swapsLoading && !swapsError && visibleSwaps.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {visibleSwaps.map((swap, idx) => (
                      <SwapCard 
                        key={swap.PAYMENT_ID || `swap-${swap.TRANSACTION_TIME}-${idx}`} 
                        swap={swap} 
                      />
                    ))}
                  </div>

                  {!searchTerm && totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalCount}
                      pageSize={200}
                      loading={swapsLoading}
                      onPageChange={goToPage}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      {/* )} */}
    </div>
  );
}