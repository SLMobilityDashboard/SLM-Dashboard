"use client";

import { Calendar, FileText, Database, Users } from "lucide-react";
import { ReportStatusBadge } from "./ReportStatusBadge";
import { ReportActions } from "./ReportActions";
import { getReportTypeIcon } from "./constants";

export const ReportListItem = ({ report }) => {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
      <div className="p-2 rounded-lg bg-slate-700/50">
        {getReportTypeIcon(report.type)}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-md font-medium text-slate-300">{report.name}</h3>
          <ReportStatusBadge status={report.status} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-slate-400">
          {report.generatedAt && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{report.generatedAt}</span>
            </div>
          )}
          {report.size && (
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{report.size}</span>
            </div>
          )}
          {report.pages && (
            <div className="flex items-center gap-1">
              <span>{report.pages} pages</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            <span>{report.dataPoints?.toLocaleString()} points</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{report.vehiclesAnalyzed} vehicles</span>
          </div>
        </div>
        {report.status === "generating" && report.progress && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Generating...</span>
              <span>{report.progress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${report.progress}%` }}
              ></div>
            </div>
          </div>
        )}
        {report.status === "failed" && report.error && (
          <div className="mt-2 text-xs text-red-400">Error: {report.error}</div>
        )}
      </div>
      <ReportActions report={report} />
    </div>
  );
};
