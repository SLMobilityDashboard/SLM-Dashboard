"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, CheckCircle2, XCircle, FileStack } from "lucide-react";
import {
  TaskExecutionRow,
  PipeLogRow,
  WarehouseCostRow,
  normalizeTaskStatus,
  isPipeHealthy,
  formatCredits,
} from "@/lib/monitoring-queries";

interface Props {
  tasks: TaskExecutionRow[] | null;
  pipes: PipeLogRow[] | null;
  costs: WarehouseCostRow[] | null;
}

export default function OverviewPanel({ tasks, pipes, costs }: Props) {
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
      sub: "in last 48h",
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
  );
}