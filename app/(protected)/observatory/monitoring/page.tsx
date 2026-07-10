"use client";

import { useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Activity, ListChecks, Database, DollarSign, RefreshCw } from "lucide-react";

import { useWarehouseQuery } from "@/hooks/use-warehouse-query";
import { TASKS_SQL, PIPES_SQL, COSTS_SQL, TaskExecutionRow, PipeLogRow, WarehouseCostRow } from "@/lib/monitoring-queries";

import OverviewPanel from "@/components/monitoring/overview-panel";
import TaskExecutionPanel, { TaskExecutionPanelHandle } from "@/components/monitoring/task-execution-panel";
import PipelineStatusPanel from "@/components/monitoring/pipeline-status-panel";
import WarehouseCostPanel from "@/components/monitoring/warehouse-cost-panel";

const REFRESH_MS = 60_000; // client re-polls /api/query every minute; the
// endpoint itself decides whether that's a cache hit or a fresh Snowflake run.

export default function WarehouseMonitoringPage() {
  const tasks = useWarehouseQuery<TaskExecutionRow>(TASKS_SQL, {
    refreshIntervalMs: REFRESH_MS,
    forceDynamic: true, // task log is near-real-time; don't let /api/query bucket it hourly/daily
  });
  const pipes = useWarehouseQuery<PipeLogRow>(PIPES_SQL, { refreshIntervalMs: REFRESH_MS });
  const costs = useWarehouseQuery<WarehouseCostRow>(COSTS_SQL, { refreshIntervalMs: REFRESH_MS });

  const [tab, setTab] = useState("overview");
  const taskPanelRef = useRef<TaskExecutionPanelHandle>(null);

  const anyLoading = tasks.loading || pipes.loading || costs.loading;

  const refetchAll = () => {
    tasks.refetch();
    pipes.refetch();
    costs.refetch();
    taskPanelRef.current?.refreshMarks();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Warehouse Monitoring
          </h1>
          <p className="text-slate-400 mt-1">
            Task execution, pipeline ingestion, and Snowflake credit usage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-slate-800/50 text-slate-400 border-slate-700">
            <CacheStatusDot statuses={[tasks.cacheStatus, pipes.cacheStatus, costs.cacheStatus]} />
          </Badge>
          <button
            onClick={refetchAll}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${anyLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="bg-slate-900/50 p-1 border border-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400">
            <Activity className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400">
            <ListChecks className="w-4 h-4 mr-2" />
            Task Execution
          </TabsTrigger>
          <TabsTrigger value="pipes" className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400">
            <Database className="w-4 h-4 mr-2" />
            Pipeline Ingestion
          </TabsTrigger>
          <TabsTrigger value="costs" className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400">
            <DollarSign className="w-4 h-4 mr-2" />
            Warehouse Costs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewPanel tasks={tasks.data} pipes={pipes.data} costs={costs.data} />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskExecutionPanel
            ref={taskPanelRef}
            data={tasks.data}
            loading={tasks.loading}
            error={tasks.error}
            onRefetch={tasks.refetch}
          />
        </TabsContent>

        <TabsContent value="pipes">
          <PipelineStatusPanel data={pipes.data} loading={pipes.loading} error={pipes.error} />
        </TabsContent>

        <TabsContent value="costs">
          <WarehouseCostPanel data={costs.data} loading={costs.loading} error={costs.error} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CacheStatusDot({ statuses }: { statuses: (string | null)[] }) {
  const anyHit = statuses.some((s) => s === "HIT" || s === "HIT-REVALIDATING" || s === "DEDUP");
  const anyMiss = statuses.some((s) => s === "MISS");
  const label = anyMiss ? "Fresh from Snowflake" : anyHit ? "Served from cache" : "—";
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${anyMiss ? "bg-amber-400" : "bg-green-400"}`} />
      {label}
    </span>
  );
}