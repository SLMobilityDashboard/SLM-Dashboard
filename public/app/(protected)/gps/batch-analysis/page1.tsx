"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Database,
  Clock,
  Zap,
  Battery,
  Map,
  Users,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  RefreshCw,
  Route,
} from "lucide-react";
import { addDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import CartoMap from "@/components/maps/carto-map";

// Types for our batch analysis data
interface BatchJobStatus {
  id: string;
  name: string;
  status: "running" | "completed" | "failed" | "queued";
  startTime: string;
  endTime?: string;
  progress: number;
  recordsProcessed: number;
  totalRecords: number;
  duration?: string;
  error?: string;
}

interface VehicleUsageSummary {
  tboxId: string;
  vehicleId: string;
  date: string;
  distanceKm: number;
  batteryDrop: number;
  avgTemp: number;
  rpmMax: number;
  idleTimeMinutes: number;
  efficiency: number;
}

interface RouteMetrics {
  routeId: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  frequency: number;
  avgDuration: number;
  efficiencyScore: number;
  distanceKm: number;
}

interface BatteryHealthData {
  batteryId: string;
  tboxId: string;
  sohTrend: number;
  batCycleCount: number;
  chargeCycleSum: number;
  temperatureMax: number;
  healthStatus: "good" | "warning" | "critical";
  lastUpdated: string;
}

interface AlertLog {
  id: string;
  tboxId: string;
  alertType: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  location: string;
  lat: number;
  lng: number;
  description: string;
  resolved: boolean;
}

interface HeatmapData {
  lat: number;
  lng: number;
  intensity: number;
  count: number;
}

export default function BatchAnalysisPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTimeRange, setSelectedTimeRange] = useState("today");
  const [selectedCity, setSelectedCity] = useState("all");
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });

  // Mock data for batch jobs
  const [batchJobs, setBatchJobs] = useState<BatchJobStatus[]>([
    {
      id: "job_001",
      name: "Daily GPS Analysis",
      status: "completed",
      startTime: "2024-01-15 00:00:15",
      endTime: "2024-01-15 00:45:32",
      progress: 100,
      recordsProcessed: 2340000,
      totalRecords: 2340000,
      duration: "45m 17s",
    },
    {
      id: "job_002",
      name: "Telemetry Health Check",
      status: "running",
      startTime: "2024-01-15 01:00:00",
      progress: 67,
      recordsProcessed: 1560000,
      totalRecords: 2340000,
    },
    {
      id: "job_003",
      name: "Route Optimization",
      status: "queued",
      startTime: "",
      progress: 0,
      recordsProcessed: 0,
      totalRecords: 890000,
    },
    {
      id: "job_004",
      name: "Battery Analysis",
      status: "failed",
      startTime: "2024-01-14 23:30:00",
      endTime: "2024-01-14 23:45:12",
      progress: 45,
      recordsProcessed: 450000,
      totalRecords: 1000000,
      error: "Database connection timeout",
    },
  ]);

  // Mock KPI data
  const kpiData = {
    activeVehicles: 1247,
    totalDistance: 45678.9,
    avgBatteryHealth: 87.3,
    alertsGenerated: 23,
    routesAnalyzed: 567,
    dataPointsProcessed: 2340000,
    avgEfficiency: 78.5,
    criticalAlerts: 3,
  };

  // Mock vehicle usage data
  const vehicleUsageData: VehicleUsageSummary[] = [
    {
      tboxId: "TB001",
      vehicleId: "EV001",
      date: "2024-01-14",
      distanceKm: 87.5,
      batteryDrop: 45.2,
      avgTemp: 32.1,
      rpmMax: 3200,
      idleTimeMinutes: 45,
      efficiency: 82.3,
    },
    {
      tboxId: "TB002",
      vehicleId: "EV002",
      date: "2024-01-14",
      distanceKm: 124.8,
      batteryDrop: 67.8,
      avgTemp: 35.7,
      rpmMax: 3450,
      idleTimeMinutes: 23,
      efficiency: 76.9,
    },
    {
      tboxId: "TB003",
      vehicleId: "EV003",
      date: "2024-01-14",
      distanceKm: 56.3,
      batteryDrop: 28.9,
      avgTemp: 29.4,
      rpmMax: 2890,
      idleTimeMinutes: 67,
      efficiency: 89.1,
    },
  ];

  // Mock route metrics
  const routeMetrics: RouteMetrics[] = [
    {
      routeId: "R001",
      originLat: 6.9271,
      originLng: 79.8612,
      destLat: 6.9319,
      destLng: 79.8478,
      frequency: 45,
      avgDuration: 28.5,
      efficiencyScore: 85.2,
      distanceKm: 12.4,
    },
    {
      routeId: "R002",
      originLat: 6.9319,
      originLng: 79.8478,
      destLat: 6.9271,
      destLng: 79.8612,
      frequency: 38,
      avgDuration: 32.1,
      efficiencyScore: 78.9,
      distanceKm: 12.4,
    },
    {
      routeId: "R003",
      originLat: 6.9271,
      originLng: 79.8612,
      destLat: 7.2906,
      destLng: 80.6337,
      frequency: 23,
      avgDuration: 145.7,
      efficiencyScore: 72.3,
      distanceKm: 115.8,
    },
  ];

  // Mock battery health data
  const batteryHealthData: BatteryHealthData[] = [
    {
      batteryId: "BAT001",
      tboxId: "TB001",
      sohTrend: 87.5,
      batCycleCount: 245,
      chargeCycleSum: 1234,
      temperatureMax: 42.3,
      healthStatus: "good",
      lastUpdated: "2024-01-15 00:45:32",
    },
    {
      batteryId: "BAT002",
      tboxId: "TB002",
      sohTrend: 72.1,
      batCycleCount: 456,
      chargeCycleSum: 2345,
      temperatureMax: 48.7,
      healthStatus: "warning",
      lastUpdated: "2024-01-15 00:45:32",
    },
    {
      batteryId: "BAT003",
      tboxId: "TB003",
      sohTrend: 58.9,
      batCycleCount: 678,
      chargeCycleSum: 3456,
      temperatureMax: 52.1,
      healthStatus: "critical",
      lastUpdated: "2024-01-15 00:45:32",
    },
  ];

  // Mock alert data
  const alertLogs: AlertLog[] = [
    {
      id: "ALT001",
      tboxId: "TB002",
      alertType: "BATTERY_DRAIN_SPIKE",
      severity: "high",
      timestamp: "2024-01-14 14:23:45",
      location: "Colombo Central",
      lat: 6.9271,
      lng: 79.8612,
      description: "Battery dropped 25% in 15 minutes",
      resolved: false,
    },
    {
      id: "ALT002",
      tboxId: "TB003",
      alertType: "OVER_TEMP",
      severity: "critical",
      timestamp: "2024-01-14 16:45:12",
      location: "Kandy Hills",
      lat: 7.2906,
      lng: 80.6337,
      description: "Motor temperature exceeded 55°C",
      resolved: true,
    },
    {
      id: "ALT003",
      tboxId: "TB001",
      alertType: "HIGH_RPM_WITH_LOW_THROTTLE",
      severity: "medium",
      timestamp: "2024-01-14 09:15:33",
      location: "Galle Road",
      lat: 6.8649,
      lng: 79.8997,
      description: "RPM > 3000 with throttle < 20%",
      resolved: false,
    },
  ];

  // Mock heatmap data
  const heatmapData: HeatmapData[] = [
    { lat: 6.9271, lng: 79.8612, intensity: 0.9, count: 234 },
    { lat: 6.9319, lng: 79.8478, intensity: 0.7, count: 187 },
    { lat: 6.9156, lng: 79.8567, intensity: 0.8, count: 203 },
    { lat: 6.9234, lng: 79.8723, intensity: 0.6, count: 156 },
    { lat: 7.2906, lng: 80.6337, intensity: 0.5, count: 123 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "running":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "queued":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "running":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      case "queued":
        return <Clock className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-400";
      case "warning":
        return "text-yellow-400";
      case "critical":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const handleRunAnalysis = () => {
    setIsRunningAnalysis(true);
    // Simulate running analysis
    setTimeout(() => {
      setIsRunningAnalysis(false);
      // Update job status
      setBatchJobs((prev) =>
        prev.map((job) =>
          job.id === "job_003"
            ? {
                ...job,
                status: "running" as const,
                startTime: new Date().toISOString(),
                progress: 15,
              }
            : job
        )
      );
    }, 2000);
  };

  // Prepare map data
  const mapMarkers = [
    // Vehicle locations
    ...vehicleUsageData.slice(0, 3).map((vehicle, index) => ({
      position: [6.9271 + index * 0.01, 79.8612 + index * 0.01] as [
        number,
        number
      ],
      popup: `<strong>Vehicle ${vehicle.vehicleId}</strong><br>Distance: ${vehicle.distanceKm}km<br>Efficiency: ${vehicle.efficiency}%`,
      color:
        vehicle.efficiency > 80
          ? "#10b981"
          : vehicle.efficiency > 70
          ? "#f59e0b"
          : "#ef4444",
      icon: "location",
    })),
    // Alert locations
    ...alertLogs.map((alert) => ({
      position: [alert.lat, alert.lng] as [number, number],
      popup: `<strong>${alert.alertType}</strong><br>${alert.description}<br>Severity: ${alert.severity}`,
      color:
        alert.severity === "critical"
          ? "#ef4444"
          : alert.severity === "high"
          ? "#f59e0b"
          : "#3b82f6",
      icon: "alert",
    })),
  ];

  const mapRoutes = routeMetrics.map((route) => ({
    path: [
      [route.originLat, route.originLng],
      [route.destLat, route.destLng],
    ] as [number, number][],
    color:
      route.efficiencyScore > 80
        ? "#10b981"
        : route.efficiencyScore > 70
        ? "#f59e0b"
        : "#ef4444",
    dashArray: route.frequency > 30 ? undefined : "5, 10",
  }));

  const mapClusters = heatmapData.map((point) => ({
    center: [point.lat, point.lng] as [number, number],
    radius: point.intensity * 1000,
    color: "#06b6d4",
    fillColor: "#06b6d4",
    fillOpacity: point.intensity * 0.3,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Daily Batch Analysis Pipeline
          </h1>
          <p className="text-slate-400">
            Comprehensive GPS and telemetry data analysis for EV fleet
            optimization
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 bg-transparent"
          >
            <Settings className="mr-2 h-4 w-4" />
            Configure Pipeline
          </Button>
          <Button
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
            onClick={handleRunAnalysis}
            disabled={isRunningAnalysis}
          >
            {isRunningAnalysis ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Active Vehicles</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {kpiData.activeVehicles}
                </p>
              </div>
              <Users className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Total Distance</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {kpiData.totalDistance} km
                </p>
              </div>
              <Map className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">
                  Avg Battery Health
                </p>
                <p className="text-2xl font-bold text-cyan-400">
                  {kpiData.avgBatteryHealth}%
                </p>
              </div>
              <Battery className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Alerts Generated</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {kpiData.alertsGenerated}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Routes Analyzed</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {kpiData.routesAnalyzed}
                </p>
              </div>
              <Route className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">
                  Data Points Processed
                </p>
                <p className="text-2xl font-bold text-cyan-400">
                  {kpiData.dataPointsProcessed}
                </p>
              </div>
              <Database className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Avg Efficiency</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {kpiData.avgEfficiency}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Critical Alerts</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {kpiData.criticalAlerts}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Jobs */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Batch Jobs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {batchJobs.map((job) => (
            <Card
              key={job.id}
              className={`bg-slate-900/50 border-slate-700/50 ${getStatusColor(
                job.status
              )} backdrop-blur-sm`}
            >
              <CardHeader>
                <CardTitle>{job.name}</CardTitle>
                <CardDescription>{job.status}</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Start Time</p>
                    <p className="text-sm font-bold">{job.startTime}</p>
                  </div>
                  {job.endTime && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">End Time</p>
                      <p className="text-sm font-bold">{job.endTime}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">
                      Records Processed
                    </p>
                    <p className="text-sm font-bold">{job.recordsProcessed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Total Records</p>
                    <p className="text-sm font-bold">{job.totalRecords}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Progress</p>
                    <Progress value={job.progress} className="w-full" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{job.progress}%</p>
                  </div>
                </div>
                {job.duration && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Duration</p>
                      <p className="text-sm font-bold">{job.duration}</p>
                    </div>
                  </div>
                )}
                {job.error && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Error</p>
                      <p className="text-sm font-bold text-red-400">
                        {job.error}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <CartoMap
            markers={mapMarkers}
            routes={mapRoutes}
            clusters={mapClusters}
          />
        </CardContent>
      </div>
    </div>
  );
}
