"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReportListItem } from "./ReportListItem";

export const ReportHistoryCard = ({ reports }) => {
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-slate-100">Report History</CardTitle>
        <CardDescription className="text-slate-400">
          Previously generated batch analysis reports
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportListItem key={report.id} report={report} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
