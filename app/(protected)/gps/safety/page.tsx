"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  MapPin,
  Gauge,
  Battery,
  Thermometer,
  Eye,
  Bell,
  TrendingUp,
  TrendingDown,
  Zap,
  Settings,
  RefreshCw,
  Target,
  Radio,
  Cpu,
  Loader2,
  AlertCircle,
  Info,
  Wrench,
  Users,
  Navigation,
  BarChart3,
} from "lucide-react";

// Fleet monitoring function for checking multiple scooters
const fetchFleetProximityAlerts = async (scooterIds) => {
  try {
    // Prepare fleet data - in real implementation, get this from your fleet management system
    const scooters = scooterIds.map((id) => ({
      scooter_id: id,
      current_location: "6.9271,79.8612", // Replace with actual GPS data
      battery_percent: Math.floor(Math.random() * 100),
      efficiency_km_per_percent: 0.7,
      speed_kmh: Math.random() * 40,
      direction_degrees: Math.random() * 360,
      last_update: new Date().toISOString(),
    }));

    const response = await fetch(`${process.env.NEXT_PUBLIC_FAST_API_URL}/ev-route-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scooters: scooters,
        safety_margin: 0.3,
        max_hops: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log("Fleet Proximity Alerts Response:", data);

    if (!data.success) {
      throw new Error(
        data.message || "Fleet monitoring API returned failure status"
      );
    }

    return data;
  } catch (error) {
    console.error("Error fetching fleet proximity alerts:", error);
    throw new Error(`Failed to fetch fleet data: ${error.message}`);
  }
};

// Real API implementation using your proximity alert system
const fetchScooterSafetyData = async (scooterId) => {
  try {
    // First, get basic scooter data (you might have this from your fleet management system)
    // For now, we'll use some default values - replace with actual fleet data
    const scooterData = {
      scooter_id: scooterId,
      current_location: "6.9271,79.8612", // Default to Colombo - replace with actual GPS
      battery_percent: 75, // Replace with actual battery level
      efficiency_km_per_percent: 0.7, // Replace with actual efficiency
      speed_kmh: 25.0, // Replace with actual speed
      direction_degrees: 90.0, // Replace with actual direction
      last_update: new Date().toISOString(),
    };

    // Call your proximity alert API
    const response = await fetch(`${process.env.NEXT_PUBLIC_FAST_API_URL}/ev-route-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scooterData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "API returned failure status");
    }

    const result = data.result;

    // Transform your API response to match the component's expected format
    return {
      success: true,
      scooter_id: result.scooter_id,
      timestamp: result.analysis_timestamp,
      safety_score: Math.round(result.safety_score),
      location: {
        lat: parseFloat(scooterData.current_location.split(",")[0]),
        lng: parseFloat(scooterData.current_location.split(",")[1]),
        address: "Current Location", // You can enhance this with reverse geocoding
      },
      battery_level: scooterData.battery_percent,
      speed: scooterData.speed_kmh,
      temperature: 30 + Math.random() * 20, // Mock temperature - replace with sensor data
      vibration_level: Math.round(result.movement_risk_factor * 100),
      proximity_alerts:
        result.reachable_stations_count > 5
          ? 0
          : 5 - result.reachable_stations_count,
      ride_quality:
        result.safety_score >= 80
          ? "Excellent"
          : result.safety_score >= 65
          ? "Good"
          : result.safety_score >= 45
          ? "Fair"
          : "Poor",
      maintenance_status: result.battery_sufficient_for_return
        ? "Good"
        : result.nearest_station_distance_km < 10
        ? "Due Soon"
        : "Overdue",
      safety_factors: {
        // Derive safety factors from your proximity data
        battery_health: Math.min(100, scooterData.battery_percent + 10),
        brake_condition: Math.round(result.safety_score * 0.9),
        tire_pressure: Math.round(result.safety_score * 0.95),
        electronics_status: result.battery_sufficient_for_return ? 85 : 60,
        structural_integrity: Math.round(
          100 - result.movement_risk_factor * 30
        ),
      },
      alerts: [
        // Generate alerts based on severity
        ...(result.severity === "CRITICAL"
          ? [
              {
                type: "error",
                message:
                  "Critical: No reachable charging stations with current battery",
                timestamp: result.analysis_timestamp,
                severity: "high",
              },
            ]
          : []),
        ...(result.severity === "HIGH"
          ? [
              {
                type: "warning",
                message: "High risk: Limited charging options detected",
                timestamp: result.analysis_timestamp,
                severity: "high",
              },
            ]
          : []),
        ...(result.severity === "MEDIUM"
          ? [
              {
                type: "warning",
                message: "Moderate risk: Plan charging route carefully",
                timestamp: result.analysis_timestamp,
                severity: "medium",
              },
            ]
          : []),
        ...(result.severity === "LOW"
          ? [
              {
                type: "info",
                message: "Low risk: Reduced charging options available",
                timestamp: result.analysis_timestamp,
                severity: "low",
              },
            ]
          : []),
        ...(scooterData.battery_percent < 20
          ? [
              {
                type: "warning",
                message: "Battery level below 20%",
                timestamp: result.analysis_timestamp,
                severity: "medium",
              },
            ]
          : []),
        ...(result.time_to_danger_minutes && result.time_to_danger_minutes < 10
          ? [
              {
                type: "error",
                message: `Estimated ${Math.round(
                  result.time_to_danger_minutes
                )} minutes to danger zone`,
                timestamp: result.analysis_timestamp,
                severity: "high",
              },
            ]
          : []),
      ],
      recommendations: [
        // Generate recommendations based on proximity analysis
        ...(result.severity !== "SAFE"
          ? ["Find nearest charging station immediately"]
          : []),
        ...(result.movement_risk_factor > 0.5
          ? ["Reconsider current route direction"]
          : []),
        ...(result.nearest_station_distance_km > 15
          ? ["Plan charging stop within next 10km"]
          : []),
        ...(scooterData.battery_percent < 30
          ? ["Charge battery before continuing journey"]
          : []),
        ...(result.reachable_stations_count < 3
          ? ["Move toward areas with more charging stations"]
          : []),
        "Monitor battery level continuously",
        "Check weather conditions for route planning",
      ],
      usage_stats: {
        // Mock usage stats - replace with actual data from your fleet system
        daily_distance: Math.floor(Math.random() * 50) + 10,
        weekly_rides: Math.floor(Math.random() * 20) + 5,
        average_speed: scooterData.speed_kmh,
        total_runtime: Math.floor(Math.random() * 500) + 100,
      },
      // Include raw proximity data for advanced analysis
      proximity_data: {
        severity: result.severity,
        reachable_stations_count: result.reachable_stations_count,
        nearest_station_distance_km: result.nearest_station_distance_km,
        movement_risk_factor: result.movement_risk_factor,
        time_to_danger_minutes: result.time_to_danger_minutes,
        battery_sufficient_for_return: result.battery_sufficient_for_return,
      },
    };
  } catch (error) {
    console.error("Error fetching scooter safety data:", error);
    throw new Error(`Failed to fetch safety data: ${error.message}`);
  }
};

export default function ScooterSafetyDashboard() {
  const [scooterId, setScooterId] = useState("SC001");
  const [safetyData, setSafetyData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10); // minutes
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Auto-refresh functionality
  useEffect(() => {
    let intervalId;
    if (autoRefresh && scooterId) {
      intervalId = setInterval(() => {
        handleSafetyCheck();
      }, refreshInterval * 60 * 1000); // Convert minutes to milliseconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, scooterId]);

  // Initial load
  useEffect(() => {
    if (scooterId) {
      handleSafetyCheck();
    }
  }, []);

  const handleSafetyCheck = async () => {
    if (!scooterId.trim()) {
      setError("Please enter a scooter ID");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchScooterSafetyData(scooterId.trim());
      setSafetyData(data);
      setLastUpdate(new Date().toISOString());
    } catch (err) {
      console.error("Error fetching safety data:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while checking scooter safety"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getSafetyScoreColor = (score) => {
    if (score >= 90)
      return {
        bg: "bg-green-900/20",
        border: "border-green-500/30",
        text: "text-green-400",
      };
    if (score >= 75)
      return {
        bg: "bg-blue-900/20",
        border: "border-blue-500/30",
        text: "text-blue-400",
      };
    if (score >= 60)
      return {
        bg: "bg-amber-900/20",
        border: "border-amber-500/30",
        text: "text-amber-400",
      };
    return {
      bg: "bg-red-900/20",
      border: "border-red-500/30",
      text: "text-red-400",
    };
  };

  const getSafetyScoreIcon = (score) => {
    if (score >= 90) return <CheckCircle2 className="h-6 w-6" />;
    if (score >= 75) return <Shield className="h-6 w-6" />;
    if (score >= 60) return <AlertTriangle className="h-6 w-6" />;
    return <XCircle className="h-6 w-6" />;
  };

  const getFactorColor = (value) => {
    if (value >= 85) return "text-green-400";
    if (value >= 70) return "text-blue-400";
    if (value >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case "high":
        return "border-red-500/50 bg-red-900/20";
      case "medium":
        return "border-amber-500/50 bg-amber-900/20";
      case "low":
        return "border-blue-500/50 bg-blue-900/20";
      default:
        return "border-slate-500/50 bg-slate-800/30";
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-400" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Shield className="h-6 w-6 mr-2 text-cyan-500" />
            Scooter Safety Monitor
            <Badge className="ml-3 bg-cyan-900/30 text-cyan-400 border-cyan-500/50">
              Real-time
            </Badge>
          </h1>
          <p className="text-slate-400">
            Continuous safety monitoring with 10-minute interval checks and
            alerts
          </p>
        </div>
        {lastUpdate && (
          <div className="text-right">
            <div className="text-sm text-slate-300">Last Updated</div>
            <div className="text-xs text-slate-400">
              {formatTimeAgo(lastUpdate)}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Safety Check Form */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <Target className="h-5 w-5 mr-2 text-cyan-500" />
              Safety Monitoring Control
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter scooter ID for real-time safety analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="scooterId"
                    className="text-slate-300 flex items-center"
                  >
                    <Radio className="h-4 w-4 mr-2 text-cyan-500" />
                    Scooter ID
                  </Label>
                  <Input
                    id="scooterId"
                    placeholder="e.g. SC001, SC002"
                    value={scooterId}
                    onChange={(e) => setScooterId(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-slate-300"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-cyan-500" />
                      Auto-refresh Interval
                    </div>
                    <span className="text-cyan-400">{refreshInterval} min</span>
                  </Label>
                  <Slider
                    min={1}
                    max={30}
                    step={1}
                    value={[refreshInterval]}
                    onValueChange={(value) => setRefreshInterval(value[0])}
                    className="py-4"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center">
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${
                        autoRefresh ? "text-green-400" : "text-slate-400"
                      }`}
                    />
                    <span className="text-slate-300 text-sm">Auto-refresh</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={
                      autoRefresh ? "text-green-400" : "text-slate-400"
                    }
                  >
                    {autoRefresh ? "ON" : "OFF"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleSafetyCheck}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Checking Safety...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Check Safety Status
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/50">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {safetyData && (
                <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/50">
                  <div className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                    <span className="text-green-400 text-sm">
                      Connected to {safetyData.scooter_id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Next check in {refreshInterval} minutes
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Safety Overview */}
        <div className="lg:col-span-2 space-y-6">
          {safetyData && (
            <>
              {/* Safety Score Card */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center justify-between">
                    <div className="flex items-center">
                      <Gauge className="h-5 w-5 mr-2 text-purple-400" />
                      Safety Score Overview
                    </div>
                    <Badge className="bg-slate-800/50 text-slate-400 border-slate-600">
                      {safetyData.scooter_id}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Real-time safety assessment with proximity monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Main Safety Score */}
                    <div
                      className={`p-6 rounded-lg ${
                        getSafetyScoreColor(safetyData.safety_score).bg
                      } border ${
                        getSafetyScoreColor(safetyData.safety_score).border
                      } col-span-1 md:col-span-2`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`${
                            getSafetyScoreColor(safetyData.safety_score).text
                          }`}
                        >
                          {getSafetyScoreIcon(safetyData.safety_score)}
                        </div>
                        <Badge
                          className={`${
                            getSafetyScoreColor(safetyData.safety_score).bg
                          } ${
                            getSafetyScoreColor(safetyData.safety_score).text
                          } border-current`}
                        >
                          {safetyData.safety_score >= 90
                            ? "EXCELLENT"
                            : safetyData.safety_score >= 75
                            ? "GOOD"
                            : safetyData.safety_score >= 60
                            ? "FAIR"
                            : "POOR"}
                        </Badge>
                      </div>
                      <div
                        className={`text-4xl font-bold ${
                          getSafetyScoreColor(safetyData.safety_score).text
                        } mb-2`}
                      >
                        {safetyData.safety_score}
                      </div>
                      <div className="text-slate-400 text-sm">
                        Overall Safety Score
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
                        <div
                          className={`h-2 rounded-full ${
                            safetyData.safety_score >= 75
                              ? "bg-green-400"
                              : safetyData.safety_score >= 60
                              ? "bg-amber-400"
                              : "bg-red-400"
                          }`}
                          style={{ width: `${safetyData.safety_score}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <Battery className="h-5 w-5 text-blue-400" />
                        <Badge className="bg-blue-900/30 text-blue-400 border-blue-500/50 text-xs">
                          BATTERY
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-blue-400 mb-1">
                        {safetyData.battery_level}%
                      </div>
                      <div className="text-xs text-slate-400">
                        Current Level
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                        <Badge className="bg-amber-900/30 text-amber-400 border-amber-500/50 text-xs">
                          ALERTS
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-amber-400 mb-1">
                        {safetyData.alerts.length}
                      </div>
                      <div className="text-xs text-slate-400">
                        Active Alerts
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "overview"
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/50"
                  }`}
                >
                  <Activity className="h-4 w-4 inline mr-2" />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("factors")}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "factors"
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/50"
                  }`}
                >
                  <BarChart3 className="h-4 w-4 inline mr-2" />
                  Safety Factors
                </button>
                <button
                  onClick={() => setActiveTab("alerts")}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "alerts"
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/50"
                  }`}
                >
                  <Bell className="h-4 w-4 inline mr-2" />
                  Alerts & Recommendations
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {safetyData && (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Current Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Zap className="h-5 w-5 text-cyan-400" />
                      <Badge className="bg-cyan-900/30 text-cyan-400 border-cyan-500/50 text-xs">
                        SPEED
                      </Badge>
                    </div>
                    <div className="text-xl font-bold text-slate-300 mb-1">
                      {safetyData.speed} km/h
                    </div>
                    <div className="text-xs text-slate-400">Current Speed</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Thermometer className="h-5 w-5 text-orange-400" />
                      <Badge className="bg-orange-900/30 text-orange-400 border-orange-500/50 text-xs">
                        TEMP
                      </Badge>
                    </div>
                    <div className="text-xl font-bold text-slate-300 mb-1">
                      {safetyData.temperature}°C
                    </div>
                    <div className="text-xs text-slate-400">Engine Temp</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Activity className="h-5 w-5 text-purple-400" />
                      <Badge className="bg-purple-900/30 text-purple-400 border-purple-500/50 text-xs">
                        VIBRATION
                      </Badge>
                    </div>
                    <div className="text-xl font-bold text-slate-300 mb-1">
                      {safetyData.vibration_level}%
                    </div>
                    <div className="text-xs text-slate-400">
                      Vibration Level
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Eye className="h-5 w-5 text-green-400" />
                      <Badge className="bg-green-900/30 text-green-400 border-green-500/50 text-xs">
                        PROXIMITY
                      </Badge>
                    </div>
                    <div className="text-xl font-bold text-slate-300 mb-1">
                      {safetyData.proximity_alerts}
                    </div>
                    <div className="text-xs text-slate-400">Nearby Objects</div>
                  </CardContent>
                </Card>
              </div>

              {/* Usage Statistics */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-green-400" />
                    Usage Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 text-center">
                      <div className="text-2xl font-bold text-blue-400 mb-1">
                        {safetyData.usage_stats.daily_distance} km
                      </div>
                      <div className="text-sm text-slate-400">
                        Today's Distance
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 text-center">
                      <div className="text-2xl font-bold text-green-400 mb-1">
                        {safetyData.usage_stats.weekly_rides}
                      </div>
                      <div className="text-sm text-slate-400">Weekly Rides</div>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 text-center">
                      <div className="text-2xl font-bold text-purple-400 mb-1">
                        {safetyData.usage_stats.average_speed} km/h
                      </div>
                      <div className="text-sm text-slate-400">
                        Average Speed
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 text-center">
                      <div className="text-2xl font-bold text-amber-400 mb-1">
                        {safetyData.usage_stats.total_runtime}h
                      </div>
                      <div className="text-sm text-slate-400">
                        Total Runtime
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location and Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-cyan-400" />
                      Current Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                        <div className="text-sm text-slate-400 mb-1">
                          Coordinates
                        </div>
                        <div className="text-slate-300 font-mono">
                          {safetyData.location.lat.toFixed(6)},{" "}
                          {safetyData.location.lng.toFixed(6)}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                        <div className="text-sm text-slate-400 mb-1">
                          Address
                        </div>
                        <div className="text-slate-300">
                          {safetyData.location.address}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center">
                      <Settings className="h-5 w-5 mr-2 text-orange-400" />
                      System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                        <span className="text-slate-400">Ride Quality</span>
                        <Badge
                          className={`text-xs ${
                            safetyData.ride_quality === "Excellent"
                              ? "bg-green-900/30 text-green-400 border-green-500/50"
                              : safetyData.ride_quality === "Good"
                              ? "bg-blue-900/30 text-blue-400 border-blue-500/50"
                              : safetyData.ride_quality === "Fair"
                              ? "bg-amber-900/30 text-amber-400 border-amber-500/50"
                              : "bg-red-900/30 text-red-400 border-red-500/50"
                          }`}
                        >
                          {safetyData.ride_quality}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                        <span className="text-slate-400">
                          Maintenance Status
                        </span>
                        <Badge
                          className={`text-xs ${
                            safetyData.maintenance_status === "Good"
                              ? "bg-green-900/30 text-green-400 border-green-500/50"
                              : safetyData.maintenance_status === "Due Soon"
                              ? "bg-amber-900/30 text-amber-400 border-amber-500/50"
                              : "bg-red-900/30 text-red-400 border-red-500/50"
                          }`}
                        >
                          {safetyData.maintenance_status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Safety Factors Tab */}
          {activeTab === "factors" && (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-green-400" />
                  Safety Factor Analysis
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Detailed breakdown of safety components and their condition
                  scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(safetyData.safety_factors).map(
                    ([factor, value]) => (
                      <div key={factor} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 capitalize">
                            {factor.replace("_", " ")}
                          </span>
                          <span
                            className={`text-lg font-bold ${getFactorColor(
                              value
                            )}`}
                          >
                            {value}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              value >= 85
                                ? "bg-green-400"
                                : value >= 70
                                ? "bg-blue-400"
                                : value >= 50
                                ? "bg-amber-400"
                                : "bg-red-400"
                            }`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerts and Recommendations Tab */}
          {activeTab === "alerts" && (
            <div className="space-y-6">
              {/* Active Alerts */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-amber-400" />
                    Active Alerts
                    <Badge className="ml-3 bg-amber-900/30 text-amber-400 border-amber-500/50">
                      {safetyData.alerts.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Current safety alerts and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {safetyData.alerts.map((alert, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${getAlertColor(
                          alert.severity
                        )}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            <div className="mr-3 mt-0.5">
                              {getAlertIcon(alert.type)}
                            </div>
                            <div>
                              <div className="text-slate-300 font-medium mb-1">
                                {alert.message}
                              </div>
                              <div className="text-xs text-slate-400">
                                {formatTimeAgo(alert.timestamp)}
                              </div>
                            </div>
                          </div>
                          <Badge
                            className={`text-xs ${
                              alert.severity === "high"
                                ? "bg-red-900/30 text-red-400 border-red-500/50"
                                : alert.severity === "medium"
                                ? "bg-amber-900/30 text-amber-400 border-amber-500/50"
                                : "bg-blue-900/30 text-blue-400 border-blue-500/50"
                            }`}
                          >
                            {alert.severity.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}

                    {safetyData.alerts.length === 0 && (
                      <div className="p-6 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                        <div className="text-slate-300 font-medium mb-1">
                          All Clear
                        </div>
                        <div className="text-slate-400 text-sm">
                          No active alerts for this scooter
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-cyan-400" />
                    Safety Recommendations
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    AI-powered suggestions to improve safety score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {safetyData.recommendations.map((recommendation, index) => (
                      <div
                        key={index}
                        className="flex items-start p-3 rounded-md bg-slate-800/30 border border-slate-700/30"
                      >
                        <div className="h-5 w-5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <span className="text-xs font-medium">
                            {index + 1}
                          </span>
                        </div>
                        <div className="text-sm text-slate-300">
                          {recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Priority Actions */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center">
                    <Wrench className="h-5 w-5 mr-2 text-orange-400" />
                    Priority Actions
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Immediate actions to address safety concerns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-red-900/10 border border-red-500/30">
                      <div className="flex items-center mb-3">
                        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                        <span className="text-red-400 font-medium">Urgent</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        {safetyData.safety_score < 70 && (
                          <div className="text-slate-300">
                            • Immediate safety inspection required
                          </div>
                        )}
                        {safetyData.battery_level < 20 && (
                          <div className="text-slate-300">
                            • Charge battery immediately
                          </div>
                        )}
                        {safetyData.alerts.filter((a) => a.severity === "high")
                          .length > 0 && (
                          <div className="text-slate-300">
                            • Address high-priority alerts
                          </div>
                        )}
                        {Object.values(safetyData.safety_factors).some(
                          (value) => value < 50
                        ) && (
                          <div className="text-slate-300">
                            • Critical component failure detected
                          </div>
                        )}
                        {safetyData.temperature > 80 && (
                          <div className="text-slate-300">
                            • Engine overheating - stop immediately
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-amber-900/10 border border-amber-500/30">
                      <div className="flex items-center mb-3">
                        <Clock className="h-5 w-5 text-amber-400 mr-2" />
                        <span className="text-amber-400 font-medium">
                          Scheduled
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        {safetyData.maintenance_status !== "Good" && (
                          <div className="text-slate-300">
                            • Schedule maintenance service
                          </div>
                        )}
                        <div className="text-slate-300">
                          • Weekly safety check recommended
                        </div>
                        <div className="text-slate-300">
                          • Update sensor calibration
                        </div>
                        {safetyData.vibration_level > 70 && (
                          <div className="text-slate-300">
                            • Investigate vibration source
                          </div>
                        )}
                        {Object.values(safetyData.safety_factors).some(
                          (value) => value < 70
                        ) && (
                          <div className="text-slate-300">
                            • Component maintenance required
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Real-time Monitoring Status */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-cyan-400" />
                Real-time Monitoring Status
              </CardTitle>
              <CardDescription className="text-slate-400">
                Live monitoring system status and connection health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-green-900/10 border border-green-500/30">
                  <div className="flex items-center mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                    <span className="text-sm font-medium text-green-400">
                      Connected
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Scooter {safetyData.scooter_id} is online and transmitting
                    data
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-900/10 border border-blue-500/30">
                  <div className="flex items-center mb-2">
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${
                        autoRefresh
                          ? "text-blue-400 animate-spin"
                          : "text-slate-400"
                      }`}
                    />
                    <span className="text-sm font-medium text-blue-400">
                      {autoRefresh ? "Auto-refreshing" : "Manual mode"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Next check in {refreshInterval} minutes
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-purple-900/10 border border-purple-500/30">
                  <div className="flex items-center mb-2">
                    <Clock className="h-4 w-4 text-purple-400 mr-2" />
                    <span className="text-sm font-medium text-purple-400">
                      Last Updated
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatTimeAgo(safetyData.timestamp)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* API Connection and Help Information */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center">
            <Info className="h-5 w-5 mr-2 text-cyan-400" />
            Safety Monitoring System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300">
                API Integration Features
              </h4>
              <div className="space-y-2 text-sm text-slate-400">
                <div className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-xs">
                    ✓
                  </div>
                  <span>Real-time API calls to safety monitoring system</span>
                </div>
                <div className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-xs">
                    ✓
                  </div>
                  <span>
                    Automatic 10-minute interval checks with configurable timing
                  </span>
                </div>
                <div className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-xs">
                    ✓
                  </div>
                  <span>
                    Dynamic data transformation for various API response formats
                  </span>
                </div>
                <div className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-xs">
                    ✓
                  </div>
                  <span>Error handling with fallback mechanisms</span>
                </div>
                <div className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-xs">
                    ✓
                  </div>
                  <span>Push notifications for critical safety alerts</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300">
                Safety Score Calculation
              </h4>
              <div className="space-y-2">
                <Badge className="bg-green-900/30 text-green-400 border-green-500/50 mr-2 mb-2 text-xs">
                  Battery Health (20%)
                </Badge>
                <Badge className="bg-blue-900/30 text-blue-400 border-blue-500/50 mr-2 mb-2 text-xs">
                  Brake Condition (25%)
                </Badge>
                <Badge className="bg-purple-900/30 text-purple-400 border-purple-500/50 mr-2 mb-2 text-xs">
                  Tire Pressure (20%)
                </Badge>
                <Badge className="bg-amber-900/30 text-amber-400 border-amber-500/50 mr-2 mb-2 text-xs">
                  Electronics (20%)
                </Badge>
                <Badge className="bg-cyan-900/30 text-cyan-400 border-cyan-500/50 mr-2 mb-2 text-xs">
                  Structure (15%)
                </Badge>
              </div>
              <div className="text-sm text-slate-400 mt-4">
                The safety monitoring system continuously analyzes these
                weighted factors and proximity sensors to provide real-time
                safety scores and proactive maintenance recommendations. Data is
                automatically synced every {refreshInterval} minutes.
              </div>
            </div>
          </div>

          <Separator className="my-6 bg-slate-700" />

          <div className="text-xs text-slate-500">
            <div className="flex items-center justify-between mb-2">
              <span>API Endpoint</span>
              <Badge className="bg-slate-800 text-slate-400 border-slate-600 font-mono text-xs">
                POST /proximity-alert-info
              </Badge>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span>Monitoring Interval</span>
              <Badge className="bg-slate-800 text-slate-400 border-slate-600">
                Every {refreshInterval} minutes
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Auto-refresh Status</span>
              <Badge
                className={
                  autoRefresh
                    ? "bg-green-800/30 text-green-400 border-green-600/30"
                    : "bg-slate-800 text-slate-400 border-slate-600"
                }
              >
                {autoRefresh ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
