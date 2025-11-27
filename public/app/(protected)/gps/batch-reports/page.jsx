"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import ReportGenerationService from "./Services/reportService";
import ReportPreviewModal from "./components/ReportPreviewModal";
import { TemplateManager } from "./components/TemplateManager";
import { NotificationBanner } from "./components/NotificationBanner";
import { ReportConfigurationCard } from "./components/ReportConfigurationCard";
import { ReportPreviewCard } from "./components/ReportPreviewCard";
import { ReportHistoryCard } from "./components/ReportHistoryCard";
import { reportTemplates } from "./components/constants";

// Create singleton instance
const reportService = new ReportGenerationService();

export default function BatchReportsPage() {
  const [activeTab, setActiveTab] = useState("generate");
  const [reportType, setReportType] = useState("comprehensive");
  const [timeRange, setTimeRange] = useState("30d");
  const [reportTitle, setReportTitle] = useState("");
  const [outputFormat, setOutputFormat] = useState("pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [includedTables, setIncludedTables] = useState({
    vehicle_usage: true,
    route_metrics: true,
    battery_health: true,
    alert_logs: false,
  });

  // Load reports on mount and set up listener
  useEffect(() => {
    const updateReports = () => {
      setReports(reportService.getAllReports());
    };

    updateReports();
    reportService.addListener(updateReports);

    return () => {
      reportService.removeListener(updateReports);
    };
  }, []);

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const config = {
        type: reportType,
        timeRange,
        format: outputFormat,
        title: reportTitle || undefined,
        includedTables,
      };

      const report = await reportService.generateReport(config);
      showNotification(`Report generation started: ${report.name}`, "success");
      setActiveTab("history");
    } catch (error) {
      showNotification("Failed to start report generation", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelGeneration = (reportId) => {
    if (reportService.cancelGeneration(reportId)) {
      showNotification("Report generation cancelled", "info");
    }
  };

  const handleRetryReport = (reportId) => {
    if (reportService.retryReport(reportId)) {
      showNotification("Report generation restarted", "info");
    }
  };

  const handleDeleteReport = (reportId) => {
    if (reportService.deleteReport(reportId)) {
      showNotification("Report deleted successfully", "info");
    }
  };

  const handleDownloadReport = async (report) => {
    try {
      const result = await reportService.downloadReport(report);
      showNotification(result.message, "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const handlePreviewReport = (report) => {
    setSelectedReport(report);
    setPreviewOpen(true);
  };

  const handleTableToggle = (tableKey) => {
    setIncludedTables((prev) => ({
      ...prev,
      [tableKey]: !prev[tableKey],
    }));
  };

  return (
    <div className="space-y-6">
      <NotificationBanner notification={notification} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Batch Analysis Reports
          </h1>
          <p className="text-slate-400">
            Generate comprehensive reports from daily GPS and telemetry batch
            processing
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 bg-transparent"
            onClick={() => setActiveTab("templates")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Report Templates
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-3 bg-slate-800/50 p-1">
          <TabsTrigger
            value="generate"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
          >
            Generate Report
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
          >
            Report History
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
          >
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ReportConfigurationCard
              reportType={reportType}
              setReportType={setReportType}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              reportTitle={reportTitle}
              setReportTitle={setReportTitle}
              outputFormat={outputFormat}
              setOutputFormat={setOutputFormat}
              includedTables={includedTables}
              handleTableToggle={handleTableToggle}
              handleGenerateReport={handleGenerateReport}
              isGenerating={isGenerating}
            />

            <div className="lg:col-span-2 space-y-6">
              <ReportPreviewCard
                reportType={reportType}
                reportTemplates={reportTemplates}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <ReportHistoryCard
            reports={reports}
            handlePreviewReport={handlePreviewReport}
            handleDownloadReport={handleDownloadReport}
            handleCancelGeneration={handleCancelGeneration}
            handleRetryReport={handleRetryReport}
            handleDeleteReport={handleDeleteReport}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <TemplateManager
            onTemplateSelect={(template) => {
              setReportType(template.id);
              setActiveTab("generate");
            }}
          />
        </TabsContent>
      </Tabs>

      <ReportPreviewModal
        report={selectedReport}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownloadReport}
      />
    </div>
  );
}
