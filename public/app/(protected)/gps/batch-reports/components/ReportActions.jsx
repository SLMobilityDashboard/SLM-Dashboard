"use client";

import { Button } from "@/components/ui/button";
import { Eye, Download, Pause, RefreshCw, Trash2 } from "lucide-react";

export const ReportActions = ({
  report,
  handlePreviewReport,
  handleDownloadReport,
  handleCancelGeneration,
  handleRetryReport,
  handleDeleteReport,
}) => {
  return (
    <div className="flex gap-2">
      {report.status === "completed" && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 bg-transparent"
            onClick={() => handlePreviewReport(report)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 bg-transparent"
            onClick={() => handleDownloadReport(report)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </>
      )}
      {report.status === "generating" && (
        <Button
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 bg-transparent"
          onClick={() => handleCancelGeneration(report.id)}
        >
          <Pause className="h-4 w-4" />
        </Button>
      )}
      {report.status === "failed" && (
        <Button
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 bg-transparent"
          onClick={() => handleRetryReport(report.id)}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="border-slate-600 text-slate-300 bg-transparent hover:border-red-500 hover:text-red-400"
        onClick={() => handleDeleteReport(report.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
