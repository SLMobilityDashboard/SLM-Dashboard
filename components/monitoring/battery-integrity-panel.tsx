"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Search,
  AlertCircle,
  Ban,
  Repeat,
  CheckCircle2,
  Eye,
  Flame,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import {
  BatteryMismatchRow,
  formatEpoch,
  customerDisplayName,
} from "@/lib/battery-integrity-queries";
import { useBatteryMarks } from "@/hooks/use-battery-marks";
import type { MismatchStatus } from "@/lib/battery-integrity-queries";

interface Props {
  data: BatteryMismatchRow[] | null;
  loading: boolean;
  error: string | null;
}

const STATUS_META: Record<
  MismatchStatus,
  { label: string; icon: any; className: string }
> = {
  open: {
    label: "Open",
    icon: AlertCircle,
    className: "bg-red-500/10 text-red-400 border-red-500/30",
  },
  investigating: {
    label: "Investigating",
    icon: Eye,
    className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-400 border-green-500/30",
  },
  confirmed_theft: {
    label: "Confirmed Theft",
    icon: Flame,
    className: "bg-red-600/15 text-red-400 border-red-600/40",
  },
};

function StatCardSkeleton() {
  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
            <div className="h-7 w-16 rounded bg-slate-800 animate-pulse" />
          </div>
          <div className="p-3 rounded-lg bg-slate-800/60">
            <div className="w-6 h-6 rounded bg-slate-700 animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-10 rounded-md bg-slate-800/60 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}

const STATUS_ORDER: Record<MismatchStatus, number> = {
  open: 0,
  investigating: 1,
  confirmed_theft: 2,
  resolved: 3,
};

type SortKey = "status" | "customer" | "station" | "swapTime";
type SortDir = "asc" | "desc";

export default function BatteryIntegrityPanel({ data, loading, error }: Props) {
  const [filter, setFilter] = useState<"all" | "unresolved" | "repeat" | "blocked">("unresolved");
  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("swapTime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { marks, setStatus } = useBatteryMarks();

  const rows = data ?? [];
  const isInitialLoad = loading && rows.length === 0 && !error;

  const statusOf = (trnxid: string): MismatchStatus => marks.get(trnxid)?.STATUS ?? "open";

  const stationOptions = useMemo(() => {
    const names = new Set<string>();
    rows.forEach((r) => {
      const name = r.STATION_NAME ?? r.STATION_ID;
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Sensible default direction per column: newest-first for time,
      // A-Z for everything else.
      setSortDir(key === "swapTime" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-cyan-400" />
    ) : (
      <ChevronDown className="w-3 h-3 text-cyan-400" />
    );
  };

  const repeatCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => counts.set(r.CUSTOMER_ID, (counts.get(r.CUSTOMER_ID) ?? 0) + 1));
    return counts;
  }, [rows]);

  const stats = useMemo(() => {
    const unresolved = rows.filter((r) => {
      const s = statusOf(r.TRNXID);
      return s === "open" || s === "investigating";
    }).length;
    const confirmedTheft = rows.filter((r) => statusOf(r.TRNXID) === "confirmed_theft").length;
    const blockedFlagged = new Set(
      rows.filter((r) => r.IS_BLOCKED === 1).map((r) => r.CUSTOMER_ID)
    ).size;
    return {
      totalFlags: rows.length,
      unresolved,
      confirmedTheft,
      blockedFlagged,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, marks]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const s = statusOf(row.TRNXID);
      let filterMatch: boolean;
      switch (filter) {
        case "unresolved":
          filterMatch = s === "open" || s === "investigating";
          break;
        case "repeat":
          filterMatch = (repeatCounts.get(row.CUSTOMER_ID) ?? 0) > 1;
          break;
        case "blocked":
          filterMatch = row.IS_BLOCKED === 1;
          break;
        default:
          filterMatch = true;
      }
      const stationMatch =
        stationFilter === "all" || (row.STATION_NAME ?? row.STATION_ID) === stationFilter;
      const q = search.toLowerCase();
      const searchMatch =
        !search ||
        customerDisplayName(row).toLowerCase().includes(q) ||
        row.CUSTOMER_ID.toLowerCase().includes(q) ||
        row.TRNXID.toLowerCase().includes(q) ||
        row.RETURNED_BID.toLowerCase().includes(q) ||
        row.EXPECTED_BID.toLowerCase().includes(q) ||
        (row.STATION_NAME ?? "").toLowerCase().includes(q);
      return filterMatch && stationMatch && searchMatch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filter, search, stationFilter, repeatCounts, marks]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortKey) {
        case "status":
          return (STATUS_ORDER[statusOf(a.TRNXID)] - STATUS_ORDER[statusOf(b.TRNXID)]) * dir;
        case "customer":
          return customerDisplayName(a).localeCompare(customerDisplayName(b)) * dir;
        case "station":
          return (a.STATION_NAME ?? a.STATION_ID ?? "").localeCompare(
            b.STATION_NAME ?? b.STATION_ID ?? ""
          ) * dir;
        case "swapTime":
        default:
          return (a.CREATED_EPOCH - b.CREATED_EPOCH) * dir;
      }
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortKey, sortDir, marks]);

  const statCards = [
    {
      title: "Flagged Swaps",
      value: stats.totalFlags,
      icon: ShieldAlert,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    {
      title: "Unresolved",
      value: stats.unresolved,
      icon: AlertCircle,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      title: "Confirmed Theft",
      value: stats.confirmedTheft,
      icon: Flame,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    {
      title: "Already Blocked",
      value: stats.blockedFlagged,
      icon: Ban,
      color: "text-slate-300",
      bg: "bg-slate-500/10",
      border: "border-slate-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isInitialLoad
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => (
              <Card key={card.title} className={`bg-slate-900/50 border-slate-800 ${card.border} backdrop-blur-sm`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">{card.title}</p>
                      <p className="text-2xl font-bold text-slate-100">{card.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${card.bg}`}>
                      <card.icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["unresolved", "all", "repeat", "blocked"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              filter === key
                ? "bg-slate-700 border-slate-600 text-white"
                : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {key === "unresolved" && `Unresolved (${stats.unresolved})`}
            {key === "all" && `All (${rows.length})`}
            {key === "repeat" && "Repeat offenders"}
            {key === "blocked" && `Already blocked (${stats.blockedFlagged})`}
          </button>
        ))}

        <select
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-slate-800/50 border border-slate-700 rounded-md text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        >
          <option value="all">All stations</option>
          {stationOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, station, battery ID…"
            className="pl-8 pr-3 py-1.5 text-sm bg-slate-800/50 border border-slate-700 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 w-72"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100 text-lg flex items-center">
            <ShieldAlert className="w-5 h-5 mr-2 text-red-400" />
            Battery Custody Mismatches
            <span className="ml-2 text-sm font-normal text-slate-500">
              {sorted.length} of {rows.length} shown
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isInitialLoad && <TableSkeleton />}

          {error && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-400">Failed to load mismatches: {error}</p>
            </div>
          )}

          {!isInitialLoad && !error && sorted.length === 0 && (
            <p className="text-sm text-slate-500 py-10 text-center">
              {rows.length === 0
                ? "No custody mismatches found — every returned battery matched what was last issued."
                : "No flagged swaps match the current filters."}
            </p>
          )}

          {sorted.length > 0 && (
            <div className="battery-table-scroll overflow-auto max-h-[60vh] rounded-md border border-slate-800">
              <style>{`
                .battery-table-scroll::-webkit-scrollbar {
                  height: 10px;
                  width: 10px;
                }
                .battery-table-scroll::-webkit-scrollbar-track {
                  background: rgb(15 23 42 / 0.6); /* slate-900/60 */
                }
                .battery-table-scroll::-webkit-scrollbar-thumb {
                  background-color: rgb(51 65 85); /* slate-700 */
                  border-radius: 9999px;
                  border: 2px solid rgb(15 23 42 / 0.6);
                }
                .battery-table-scroll::-webkit-scrollbar-thumb:hover {
                  background-color: rgb(71 85 105); /* slate-600 */
                }
                .battery-table-scroll {
                  scrollbar-width: thin;
                  scrollbar-color: rgb(51 65 85) rgb(15 23 42 / 0.6);
                }
              `}</style>
              <table className="w-full text-sm border-collapse table-fixed">
                <colgroup>
                  <col className="w-[110px]" />
                  <col className="w-[170px]" />
                  <col className="w-[130px]" />
                  <col className="w-[130px]" />
                  <col className="w-[200px]" />
                  <col className="w-[150px]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-900">
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="py-2 pl-4 pr-4 font-medium">
                      <button
                        onClick={() => toggleSort("status")}
                        className="flex items-center gap-1 hover:text-slate-200"
                      >
                        Status <SortIcon column="status" />
                      </button>
                    </th>
                    <th className="py-2 pr-4 font-medium">
                      <button
                        onClick={() => toggleSort("customer")}
                        className="flex items-center gap-1 hover:text-slate-200"
                      >
                        Customer <SortIcon column="customer" />
                      </button>
                    </th>
                    <th className="py-2 pr-4 font-medium">
                      <button
                        onClick={() => toggleSort("station")}
                        className="flex items-center gap-1 hover:text-slate-200"
                      >
                        Station <SortIcon column="station" />
                      </button>
                    </th>
                    <th className="py-2 pr-4 font-medium">
                      <button
                        onClick={() => toggleSort("swapTime")}
                        className="flex items-center gap-1 hover:text-slate-200"
                      >
                        Swap Time <SortIcon column="swapTime" />
                      </button>
                    </th>
                    <th className="py-2 pr-4 font-medium">Battery Mismatch</th>
                    <th className="py-2 pr-4 font-medium">Previous Swap</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const repeatCount = repeatCounts.get(row.CUSTOMER_ID) ?? 0;
                    const isRepeat = repeatCount > 1;
                    const isBlocked = row.IS_BLOCKED === 1;
                    const status = statusOf(row.TRNXID);
                    const meta = STATUS_META[status];
                    const Icon = meta.icon;
                    const mark = marks.get(row.TRNXID);

                    return (
                      <tr
                        key={row.TRNXID}
                        className={`border-b border-slate-800 hover:bg-slate-800/30 ${
                          status === "resolved"
                            ? "opacity-50"
                            : status === "confirmed_theft" || isBlocked
                            ? "bg-red-500/5"
                            : isRepeat
                            ? "bg-amber-500/5"
                            : ""
                        }`}
                      >
                        <td className="py-2.5 pl-4 pr-4">
                          <select
                            value={status}
                            onChange={(e) => setStatus(row.TRNXID, e.target.value as MismatchStatus)}
                            className={`w-full text-xs font-medium rounded-md border pl-2 pr-1 py-1 bg-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 ${meta.className}`}
                          >
                            <option value="open">Open</option>
                            <option value="investigating">Investigating</option>
                            <option value="resolved">Resolved</option>
                            <option value="confirmed_theft">Confirmed Theft</option>
                          </select>
                          {mark?.MARKED_BY && (
                            <div
                              className="text-[11px] text-slate-500 mt-1 truncate"
                              title={mark.MARKED_AT ? new Date(mark.MARKED_AT).toLocaleString() : undefined}
                            >
                              by {mark.MARKED_BY}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="min-w-0">
                              <div
                                className="text-slate-200 font-medium truncate"
                                title={customerDisplayName(row)}
                              >
                                {customerDisplayName(row)}
                              </div>
                              <div className="text-xs text-slate-500 truncate" title={row.CUSTOMER_ID}>
                                {row.CUSTOMER_ID}
                              </div>
                            </div>
                          </div>
                          {(isBlocked || isRepeat) && (
                            <div className="flex items-center gap-1 mt-1">
                              {isBlocked && (
                                <Badge className="bg-red-500/10 text-red-400 border-red-500/30 inline-flex items-center gap-1">
                                  <Ban className="w-3 h-3" />
                                  Blocked
                                </Badge>
                              )}
                              {isRepeat && (
                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 inline-flex items-center gap-1">
                                  <Repeat className="w-3 h-3" />
                                  {repeatCount}×
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-300 truncate" title={row.STATION_NAME ?? row.STATION_ID ?? "—"}>
                          {row.STATION_NAME ?? row.STATION_ID ?? "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">
                          {formatEpoch(row.CREATED_EPOCH)}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs leading-relaxed">
                          <div className="text-slate-300 break-all" title={row.EXPECTED_BID}>
                            {row.EXPECTED_BID}
                          </div>
                          <div className="text-red-400 break-all" title={row.RETURNED_BID}>
                            {row.RETURNED_BID}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 font-sans">
                            expected → returned
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500 text-xs truncate" title={`${row.PREV_STATION_NAME ?? "—"} · ${formatEpoch(row.PREV_CREATED_EPOCH)}`}>
                          {row.PREV_STATION_NAME ?? "—"} · {formatEpoch(row.PREV_CREATED_EPOCH)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}