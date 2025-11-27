import {
  BarChart3,
  Users,
  Route,
  Battery,
  AlertTriangle,
  FileText,
} from "lucide-react";

export const reportTemplates = [
  {
    id: "comprehensive",
    name: "Daily GPS Batch Analysis Report",
    description:
      "Complete analysis of GPS data, telemetry, routes, battery health, and alerts from daily batch processing",
    sections: [
      "Executive Summary",
      "Vehicle Usage Summary (DAILY_VEHICLE_USAGE_SUMMARY)",
      "Route Metrics Analysis (DAILY_ROUTE_METRICS)",
      "Battery Health Tracking (BATTERY_HEALTH_TRACKER)",
      "Alert Logs Analysis (ALERT_LOGS)",
      "Heatmap Coordinates",
      "Performance Recommendations",
    ],
    estimatedPages: "60-80",
    estimatedTime: "25-30 min",
    dataPoints: "2M+",
  },
  // ... other templates
];

export const getReportTypeIcon = (type) => {
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
