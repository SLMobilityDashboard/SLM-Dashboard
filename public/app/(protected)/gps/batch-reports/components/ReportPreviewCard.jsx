"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Users, Route, Battery, AlertTriangle } from "lucide-react";

export const ReportPreviewCard = ({ reportType, reportTemplates }) => {
  const getReportTypeIcon = (type) => {
    switch (type) {
      case "comprehensive":
        return <BarChart3 className="h-5 w-5" />;
      case "vehicle_usage":
        return <Users className="h-5 w-5" />;
      case "route_analysis":
        return <Route className="h-5 w-5" />;
      case "battery_health":
        return <Battery className="h-5 w-5" />;
      case "alert_analysis":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <BarChart3 className="h-5 w-5" />;
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-slate-100">Report Preview</CardTitle>
        <CardDescription className="text-slate-400">
          Preview of the selected report template
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reportTemplates
          .filter((template) => template.id === reportType)
          .map((template) => (
            <div key={template.id} className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-cyan-600/20 text-cyan-400">
                  {getReportTypeIcon(template.id)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-slate-200 mb-2">
                    {template.name}
                  </h3>
                  <p className="text-slate-400 mb-4">{template.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Estimated Pages:</span>
                      <span className="text-slate-300 ml-2">
                        {template.estimatedPages}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Generation Time:</span>
                      <span className="text-slate-300 ml-2">
                        {template.estimatedTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Data Points:</span>
                      <span className="text-slate-300 ml-2">
                        {template.dataPoints}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-md font-medium text-slate-300">
                  Report Sections:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {template.sections.map((section, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded bg-slate-800/30 border border-slate-700/30"
                    >
                      <div className="w-6 h-6 rounded-full bg-cyan-600/20 text-cyan-400 text-xs flex items-center justify-center">
                        {index + 1}
                      </div>
                      <span className="text-sm text-slate-300">{section}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
};
