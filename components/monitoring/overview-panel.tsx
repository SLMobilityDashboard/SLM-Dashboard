"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, CheckCircle2, XCircle, FileStack, AlertTriangle } from "lucide-react";
import {
  TaskExecutionRow,
  PipeLogRow,
  WarehouseCostRow,
  normalizeTaskStatus,
  isPipeHealthy,
  formatCredits,
  formatDateTime,
} from "@/lib/monitoring-queries";

interface Props {
  tasks: TaskExecutionRow[] | null;
  pipes: PipeLogRow[] | null;
  costs: WarehouseCostRow[] | null;
}

function CardSkeleton() {
  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
            <div className="h-7 w-16 rounded bg-slate-800 animate-pulse" />
            <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
          </div>
          <div className="p-3 rounded-lg bg-slate-800/60">
            <div className="w-6 h-6 rounded bg-slate-700 animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewPanel({ tasks, pipes, costs }: Props) {
  // Treat null as "not yet loaded"; an empty array means loaded but no data.
  const isLoading = tasks === null && pipes === null && costs === null;

  const taskRows = tasks ?? [];
  const pipeRows = pipes ?? [];
  const costRows = costs ?? [];

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const creditsToday = costRows
      .filter((r) => r.USAGE_DATE?.slice(0, 10) === today)
      .reduce((sum, r) => sum + (r.TOTAL_CREDITS_USED ?? 0), 0);
    const creditsWeek = costRows.reduce((sum, r) => sum + (r.TOTAL_CREDITS_USED ?? 0), 0);

    const failed24h = taskRows.filter((r) => normalizeTaskStatus(r.STATUS) === "failed").length;
    const success24h = taskRows.filter((r) => normalizeTaskStatus(r.STATUS) === "success").length;
    const totalTasks = taskRows.length;
    const successRate = totalTasks > 0 ? (success24h / totalTasks) * 100 : null;

    const unhealthyPipes = pipeRows.filter((p) => !isPipeHealthy(p.EXECUTION_STATE)).length;
    const pendingFiles = pipeRows.reduce((sum, p) => sum + (p.PENDING_FILE_COUNT ?? 0), 0);

    return { creditsToday, creditsWeek, failed24h, successRate, totalTasks, unhealthyPipes, pendingFiles };
  }, [taskRows, pipeRows, costRows]);

  // Recent failures + a quick "is this the same task looping" signal.
  // A single task failing 10x in 48h is a very different problem than
  // 10 different tasks each failing once — surface both.
  const failureInsights = useMemo(() => {
    const failed = taskRows
      .filter((r) => normalizeTaskStatus(r.STATUS) === "failed")
      .sort((a, b) => new Date(b.SCHEDULED_TIME ?? 0).getTime() - new Date(a.SCHEDULED_TIME ?? 0).getTime());

    const countByTask = new Map<string, number>();
    failed.forEach((r) => {
      countByTask.set(r.TASK_NAME, (countByTask.get(r.TASK_NAME) ?? 0) + 1);
    });

    const repeatOffenders = [...countByTask.entries()]
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1]);

    return {
      recent: failed.slice(0, 5),
      distinctFailingTasks: countByTask.size,
      repeatOffenders,
    };
  }, [taskRows]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Credits Today",
      value: formatCredits(stats.creditsToday),
      sub: `${formatCredits(stats.creditsWeek)} over last 7 days`,
      icon: Zap,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
    },
    {
      title: "Task Success Rate",
      value: stats.successRate !== null ? `${stats.successRate.toFixed(1)}%` : "—",
      sub: `${stats.totalTasks} tasks in last 48h`,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      title: "Failed Tasks",
      value: stats.failed24h,
      sub:
        failureInsights.distinctFailingTasks > 0
          ? `across ${failureInsights.distinctFailingTasks} distinct task${failureInsights.distinctFailingTasks === 1 ? "" : "s"}`
          : "in last 48h",
      icon: XCircle,
      color: stats.failed24h > 0 ? "text-red-400" : "text-slate-300",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    {
      title: "Pipe Backlog",
      value: stats.pendingFiles,
      sub: stats.unhealthyPipes > 0 ? `${stats.unhealthyPipes} pipe(s) not running` : "all pipes running",
      icon: FileStack,
      color: stats.unhealthyPipes > 0 ? "text-amber-400" : "text-slate-300",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Card key={card.title} className={`bg-slate-900/50 border-slate-800 ${card.border} backdrop-blur-sm`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-slate-100">{card.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {failureInsights.recent.length > 0 && (
        <Card className="bg-slate-900/50 border-red-500/20 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-slate-200">Recent Failures</h3>
            </div>

            {failureInsights.repeatOffenders.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {failureInsights.repeatOffenders.map(([taskName, count]) => (
                  <span
                    key={taskName}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-red-500/10 border border-red-500/30 text-red-400"
                  >
                    {taskName} failed {count}x
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {failureInsights.recent.map((row) => (
                <div
                  key={row.LOG_ID}
                  className="flex items-center justify-between text-sm border-b border-slate-800 last:border-0 pb-2 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-slate-200 font-medium truncate">{row.TASK_NAME}</p>
                    {row.ERROR_MESSAGE && (
                      <p className="text-xs text-slate-500 truncate max-w-md" title={row.ERROR_MESSAGE}>
                        {row.ERROR_MESSAGE.split("\n")[0]}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-4">
                    {formatDateTime(row.SCHEDULED_TIME)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}