"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Clock, FileStack, HardDrive, AlertTriangle } from "lucide-react";
import {
  PipeLogRow,
  isPipeHealthy,
  formatBytes,
  formatCredits,
  formatDateTime,
  minutesAgo,
} from "@/lib/monitoring-queries";

interface Props {
  data: PipeLogRow[] | null;
  loading: boolean;
  error: string | null;
}

const STALE_THRESHOLD_MIN = 60;
const BACKLOG_WARNING = 10;

export default function PipelineStatusPanel({ data, loading, error }: Props) {
  const pipes = data ?? [];

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100 text-lg">Pipeline Ingestion</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && pipes.length === 0 && (
            <p className="text-sm text-slate-500 py-6 text-center">Loading pipe status…</p>
          )}
          {error && (
            <p className="text-sm text-red-400 py-6 text-center">Failed to load pipes: {error}</p>
          )}
          {!loading && !error && pipes.length === 0 && (
            <p className="text-sm text-slate-500 py-6 text-center">No pipe status returned.</p>
          )}

          {pipes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pipes.map((pipe) => {
                const healthy = isPipeHealthy(pipe.EXECUTION_STATE);
                const staleMin = minutesAgo(pipe.LAST_INGESTED_AT);
                const isStale = staleMin !== null && staleMin > STALE_THRESHOLD_MIN;
                const backlog = pipe.PENDING_FILE_COUNT ?? 0;
                const hasBacklog = backlog > BACKLOG_WARNING;

                return (
                  <div
                    key={pipe.PIPE_ID}
                    className={`p-4 rounded-lg border ${
                      healthy && !isStale && !hasBacklog
                        ? "border-slate-700/50 bg-slate-800/30"
                        : "border-amber-500/30 bg-amber-500/5"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-semibold text-slate-200 text-sm">{pipe.PIPE_NAME}</h4>
                      </div>
                      <Badge
                        className={
                          healthy
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        }
                      >
                        {pipe.EXECUTION_STATE ?? "UNKNOWN"}
                      </Badge>
                    </div>

                    {(isStale || hasBacklog) && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-3">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {isStale && hasBacklog
                          ? `Stale ingest + ${backlog} files pending`
                          : isStale
                          ? "No files ingested in over an hour"
                          : `${backlog} files pending`}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-900/50 rounded-md p-2">
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                          <Clock className="w-3 h-3" />
                          Last ingested
                        </div>
                        <div className="text-slate-300">{formatDateTime(pipe.LAST_INGESTED_AT)}</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-md p-2">
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                          <FileStack className="w-3 h-3" />
                          Pending files
                        </div>
                        <div className={hasBacklog ? "text-amber-400" : "text-slate-300"}>{backlog}</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-md p-2">
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                          <HardDrive className="w-3 h-3" />
                          Bytes billed
                        </div>
                        <div className="text-slate-300">{formatBytes(pipe.BYTES_BILLED)}</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-md p-2">
                        <div className="text-slate-500 mb-1">Credits (last run)</div>
                        <div className="text-cyan-400">{formatCredits(pipe.CREDITS_USED, 4)}</div>
                      </div>
                    </div>

                    {pipe.LAST_INGESTED_FILE_PATH && (
                      <div className="mt-3 text-xs text-slate-500 truncate" title={pipe.LAST_INGESTED_FILE_PATH}>
                        {pipe.LAST_INGESTED_FILE_PATH}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {pipes[0]?._AS_OF && (
            <p className="text-xs text-slate-600 mt-4">Snapshot as of {formatDateTime(pipes[0]._AS_OF)}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}