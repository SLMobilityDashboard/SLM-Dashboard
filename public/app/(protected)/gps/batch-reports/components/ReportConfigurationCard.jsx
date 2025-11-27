"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play } from "lucide-react";

export const ReportConfigurationCard = ({
  reportType,
  setReportType,
  timeRange,
  setTimeRange,
  reportTitle,
  setReportTitle,
  outputFormat,
  setOutputFormat,
  includedTables,
  handleTableToggle,
  handleGenerateReport,
  isGenerating,
}) => {
  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-slate-100">Report Configuration</CardTitle>
        <CardDescription className="text-slate-400">
          Configure your batch analysis report parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-slate-300">Report Type</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comprehensive">
                Daily GPS Batch Analysis Report
              </SelectItem>
              <SelectItem value="vehicle_usage">
                Vehicle Usage Summary Report
              </SelectItem>
              <SelectItem value="route_analysis">
                Route Metrics Analysis Report
              </SelectItem>
              <SelectItem value="battery_health">
                Battery Health Tracker Report
              </SelectItem>
              <SelectItem value="alert_analysis">
                Alert Logs Analysis Report
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Time Range</Label>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Report Title</Label>
          <Input
            placeholder="Enter custom report title"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="bg-slate-800/50 border-slate-700 text-slate-300"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-slate-300">Include Data Tables</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="vehicle_usage"
                checked={includedTables.vehicle_usage}
                onCheckedChange={() => handleTableToggle("vehicle_usage")}
              />
              <Label htmlFor="vehicle_usage" className="text-sm text-slate-400">
                DAILY_VEHICLE_USAGE_SUMMARY
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="route_metrics"
                checked={includedTables.route_metrics}
                onCheckedChange={() => handleTableToggle("route_metrics")}
              />
              <Label htmlFor="route_metrics" className="text-sm text-slate-400">
                DAILY_ROUTE_METRICS
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="battery_health"
                checked={includedTables.battery_health}
                onCheckedChange={() => handleTableToggle("battery_health")}
              />
              <Label
                htmlFor="battery_health"
                className="text-sm text-slate-400"
              >
                BATTERY_HEALTH_TRACKER
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="alert_logs"
                checked={includedTables.alert_logs}
                onCheckedChange={() => handleTableToggle("alert_logs")}
              />
              <Label htmlFor="alert_logs" className="text-sm text-slate-400">
                ALERT_LOGS
              </Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Output Format</Label>
          <Select value={outputFormat} onValueChange={setOutputFormat}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF Document</SelectItem>
              <SelectItem value="excel">Excel Workbook</SelectItem>
              <SelectItem value="csv">CSV Data Export</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
          onClick={handleGenerateReport}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
