"use client";

import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusIcons = {
  completed: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  failed: <AlertCircle className="h-4 w-4 text-red-400" />,
  started: <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />,
};

const statusColors = {
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  started: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function AnalysisHistoryItem({ analysis, onClick }) {
  const getAnalysisScope = () => {
    const enabledTables = Object.entries(analysis.config.includedTables)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key.replace("_", " "));

    return enabledTables.join(", ");
  };

  const getInsightCountByType = () => {
    const countByType = analysis.insights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(countByType)
      .map(([type, count]) => `${count} ${type}`)
      .join(", ");
  };

  return (
    <div
      className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/50 transition-colors cursor-pointer"
      onClick={() => onClick(analysis)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-slate-200">
              {new Date(analysis.timestamp).toLocaleString()}
            </h3>
            <Badge className={`${statusColors[analysis.status]} text-xs`}>
              {statusIcons[analysis.status]}
              <span className="ml-1 capitalize">{analysis.status}</span>
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{analysis.config.timeRange} period</span>
            </div>

            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{analysis.insights.length} total insights</span>
            </div>

            <div className="truncate">
              <span className="text-slate-300">Scope:</span>{" "}
              <span className="text-cyan-400">{getAnalysisScope()}</span>
            </div>
          </div>

          {analysis.insights.length > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              <span className="text-slate-400">Insights:</span>{" "}
              {getInsightCountByType()}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-slate-200"
          onClick={(e) => {
            e.stopPropagation();
            onClick(analysis);
          }}
        >
          View Details
        </Button>
      </div>

      {analysis.error && (
        <div className="mt-2 text-xs text-red-400">Error: {analysis.error}</div>
      )}
    </div>
  );
}
