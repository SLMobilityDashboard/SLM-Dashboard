// components/monitoring/task-execution-panel.tsx
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  SkipForward,
  HelpCircle,
  Search,
  Bookmark,
} from "lucide-react";
import {
  TaskExecutionRow,
  normalizeTaskStatus,
  formatCredits,
  formatDateTime,
} from "@/lib/monitoring-queries";
import { useTaskMarks } from "@/hooks/use-task-marks";

const STATUS_META: Record<
  string,
  { label: string; icon: any; className: string }
> = {
  success: {
    label: "Success",
    icon: CheckCircle,
    className: "bg-green-500/10 text-green-400 border-green-500/30",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-500/10 text-red-400 border-red-500/30",
  },
  running: {
    label: "Running",
    icon: Clock,
    className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  },
  skipped: {
    label: "Skipped",
    icon: SkipForward,
    className: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  },
  other: {
    label: "Unknown",
    icon: HelpCircle,
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
};

interface Props {
  data: TaskExecutionRow[] | null;
  loading: boolean;
  error: string | null;
}

export default function TaskExecutionPanel({ data, loading, error }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { marked, toggle } = useTaskMarks();

  const rows = data ?? [];

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const group = normalizeTaskStatus(row.STATUS);
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "marked" ? marked.has(row.LOG_ID) : group === statusFilter);
      const searchMatch =
        !search ||
        row.TASK_NAME?.toLowerCase().includes(search.toLowerCase()) ||
        row.WAREHOUSE_NAME?.toLowerCase().includes(search.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [rows, statusFilter, search, marked]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { success: 0, failed: 0, running: 0, skipped: 0, other: 0 };
    rows.forEach((row) => {
      c[normalizeTaskStatus(row.STATUS)]++;
    });
    return c;
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "success", "failed", "running", "skipped", "other"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              statusFilter === key
                ? "bg-slate-700 border-slate-600 text-white"
                : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {key === "all" ? `All (${rows.length})` : `${STATUS_META[key].label} (${counts[key]})`}
          </button>
        ))}

        <button
          onClick={() => setStatusFilter("marked")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            statusFilter === "marked"
              ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
              : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bookmark className="w-3 h-3" fill={statusFilter === "marked" ? "currentColor" : "none"} />
          Marked ({marked.size})
        </button>

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task or warehouse…"
            className="pl-8 pr-3 py-1.5 text-sm bg-slate-800/50 border border-slate-700 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 w-64"
          />
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100 text-lg">
            Task Execution Log
            <span className="ml-2 text-sm font-normal text-slate-500">
              last 48h · {filtered.length} of {rows.length} shown
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && rows.length === 0 && (
            <p className="text-sm text-slate-500 py-6 text-center">Loading task history…</p>
          )}
          {error && (
            <p className="text-sm text-red-400 py-6 text-center">Failed to load tasks: {error}</p>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-sm text-slate-500 py-6 text-center">No tasks match the current filters.</p>
          )}

          {filtered.length > 0 && (
            // Single scrolling region (both axes) so the sticky header and
            // the scrollbar behave consistently instead of the table
            // clipping oddly with only overflow-x set.
            <div className="task-log-scroll overflow-auto max-h-[60vh] rounded-md border border-slate-800">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-900">
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="py-2 pl-4 pr-2 font-medium w-28">Mark</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Task</th>
                    <th className="py-2 pr-4 font-medium">Warehouse</th>
                    <th className="py-2 pr-4 font-medium">Scheduled</th>
                    <th className="py-2 pr-4 font-medium">Duration</th>
                    <th className="py-2 pr-4 font-medium">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const group = normalizeTaskStatus(row.STATUS);
                    const meta = STATUS_META[group];
                    const Icon = meta.icon;
                    const markInfo = marked.get(row.LOG_ID);
                    const isMarked = !!markInfo;

                    return (
                      <tr
                        key={row.LOG_ID}
                        className={`border-b border-slate-800 hover:bg-slate-800/30 ${
                          isMarked ? "bg-cyan-500/5" : ""
                        }`}
                      >
                        <td className="py-2.5 pl-4 pr-2">
                          <button
                            onClick={() => toggle(row.LOG_ID)}
                            aria-pressed={isMarked}
                            title={
                              isMarked
                                ? `Marked by ${markInfo.markedBy} · ${formatDateTime(markInfo.markedAt)} · click to unmark`
                                : "Mark this task"
                            }
                            className={`flex items-center gap-1.5 max-w-[7rem] rounded transition-colors ${
                              isMarked ? "text-cyan-400" : "text-slate-600 hover:text-slate-300"
                            }`}
                          >
                            <Bookmark className="w-4 h-4 shrink-0" fill={isMarked ? "currentColor" : "none"} />
                            {isMarked && (
                              <span className="text-[11px] text-cyan-400/80 truncate">{markInfo.markedBy}</span>
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge className={`${meta.className} inline-flex items-center gap-1`}>
                            <Icon className="w-3 h-3" />
                            {row.STATUS ?? meta.label}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-200 font-medium whitespace-nowrap">
                          {row.TASK_NAME}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">
                          {row.WAREHOUSE_NAME ?? "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">
                          {formatDateTime(row.SCHEDULED_TIME)}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap">
                          {row.EXECUTION_TIME_SECONDS != null ? `${row.EXECUTION_TIME_SECONDS.toFixed(1)}s` : "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-cyan-400 whitespace-nowrap">
                          {formatCredits(row.CREDITS_USED, 4)}
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

      <style jsx>{`
        .task-log-scroll {
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: #475569 #0f172a;
        }
        .task-log-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .task-log-scroll::-webkit-scrollbar-track {
          background: #0f172a;
        }
        .task-log-scroll::-webkit-scrollbar-thumb {
          background-color: #475569;
          border-radius: 9999px;
          border: 2px solid #0f172a;
        }
        .task-log-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #64748b;
        }
      `}</style>
    </div>
  );
}