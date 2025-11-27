import React, { useState } from "react";

// Report Preview Modal Component
const ReportPreviewModal = ({ report, isOpen, onClose, onDownload }) => {
  const [zoomLevel, setZoomLevel] = useState(100);

  if (!report || !isOpen) return null;

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
        return <FileText className="h-5 w-5" />;
    }
  };

  const mockReportContent = {
    comprehensive: {
      sections: [
        {
          title: "Executive Summary",
          content:
            "During the analyzed period, 1,247 vehicles generated 2.34M data points. Average daily distance: 156.7 km per vehicle. Battery efficiency improved by 12% compared to previous period. Peak operational hours identified between 8:00-10:00 AM and 5:00-7:00 PM with 87% route efficiency achieved across the fleet.",
        },
        {
          title: "Vehicle Usage Summary",
          content:
            "Total fleet distance: 195,439 km across all monitored vehicles. Most active vehicle: VH-1247 averaging 289 km/day with 94.2% efficiency rating. Least active: VH-0034 averaging 47 km/day. Temperature correlation analysis shows -0.34 impact on performance during extreme weather conditions.",
        },
      ],
      charts: [
        "Daily Distance Distribution",
        "Battery Health Heatmap",
        "Route Efficiency Analysis",
      ],
    },
    vehicle_usage: {
      sections: [
        {
          title: "Daily Distance Analysis",
          content:
            "Fleet average daily distance: 156.7 km per vehicle with standard deviation of 42.3 km. Top performing 10% of vehicles average 287 km/day while bottom 10% average 68 km/day.",
        },
      ],
      charts: ["Distance Distribution", "Efficiency Rankings"],
    },
  };

  const currentContent =
    mockReportContent[report.type] || mockReportContent.comprehensive;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl h-[85vh] mx-4 bg-slate-900 border border-slate-700 rounded-lg flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
              {getReportTypeIcon(report.type)}
              {report.name}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Report preview - Generated on {report.generatedAt}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {report.generatedAt}
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {report.pages} pages
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              {report.dataPoints?.toLocaleString()} points
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-slate-400 bg-slate-700/50 rounded-lg p-1">
              <button
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                className="p-1 hover:bg-slate-600 rounded transition-colors"
                disabled={zoomLevel <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[4rem] text-center font-mono">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                className="p-1 hover:bg-slate-600 rounded transition-colors"
                disabled={zoomLevel >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="p-1 hover:bg-slate-600 rounded transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => onDownload(report)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div
            className="p-8 bg-white text-black rounded-lg min-h-full transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top left",
              width: `${10000 / zoomLevel}%`,
            }}
          >
            {/* Report Header */}
            <div className="border-b-2 border-gray-300 pb-6 mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {report.name}
              </h1>
              <p className="text-gray-600 text-lg">
                Generated on {report.generatedAt}
              </p>
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-600 text-sm font-medium">
                    Data Points
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {report.dataPoints?.toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-green-600 text-sm font-medium">Vehicles</p>
                  <p className="text-2xl font-bold text-green-900">
                    {report.vehiclesAnalyzed}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-purple-600 text-sm font-medium">Pages</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {report.pages}
                  </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-amber-600 text-sm font-medium">
                    File Size
                  </p>
                  <p className="text-2xl font-bold text-amber-900">
                    {report.size}
                  </p>
                </div>
              </div>
            </div>

            {/* Report Sections */}
            <div className="space-y-8">
              {currentContent.sections.map((section, index) => (
                <div key={index} className="space-y-4">
                  <h2 className="text-2xl font-semibold text-gray-900 border-l-4 border-cyan-500 pl-4">
                    {index + 1}. {section.title}
                  </h2>
                  <div className="pl-4">
                    <p className="text-gray-700 leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* Charts Section */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900 border-l-4 border-cyan-500 pl-4">
                  Data Visualizations
                </h2>
                <div className="grid grid-cols-2 gap-6 pl-4">
                  {currentContent.charts.map((chart, index) => (
                    <div
                      key={index}
                      className="border-2 border-gray-200 rounded-lg p-6 h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"
                    >
                      <div className="text-center text-gray-500">
                        <BarChart3 className="h-16 w-16 mx-auto mb-3 text-cyan-500" />
                        <p className="text-lg font-semibold text-gray-700">
                          {chart}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Interactive chart visualization
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-gray-300 pt-6 mt-12 text-sm text-gray-600">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">
                    Generated by GPS Fleet Management System
                  </p>
                  <p>© 2024 Fleet Analytics Dashboard - Confidential</p>
                </div>
                <div className="text-right">
                  <p>Page 1 of {report.pages}</p>
                  <p>Report ID: RPT-{report.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPreviewModal;
