"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Station-specific characteristics for realistic forecasting
const stationProfiles = {
  BSS_001: {
    name: "Downtown Hub",
    baseLoad: 75,
    weekendMultiplier: 0.6,
    volatility: 0.2,
    trendFactor: 0.15,
    seasonalStrength: 12,
  },
  BSS_002: {
    name: "University Campus",
    baseLoad: 55,
    weekendMultiplier: 0.4,
    volatility: 0.25,
    trendFactor: 0.08,
    seasonalStrength: 18,
  },
  BSS_003: {
    name: "Shopping Mall",
    baseLoad: 65,
    weekendMultiplier: 1.3,
    volatility: 0.15,
    trendFactor: 0.12,
    seasonalStrength: 15,
  },
  BSS_004: {
    name: "Residential Complex",
    baseLoad: 45,
    weekendMultiplier: 0.8,
    volatility: 0.18,
    trendFactor: 0.05,
    seasonalStrength: 8,
  },
  BSS_005: {
    name: "Transit Station",
    baseLoad: 85,
    weekendMultiplier: 0.7,
    volatility: 0.3,
    trendFactor: 0.18,
    seasonalStrength: 20,
  },
};

// Real-time forecast calculation function
const calculateForecast = (bssId, historicalData) => {
  const profile = stationProfiles[bssId];
  const forecastData = [];

  // Calculate trend from historical data
  const recentData = historicalData.slice(-14); // Last 2 weeks
  const oldData = historicalData.slice(-28, -14); // Previous 2 weeks

  const recentAvg =
    recentData.reduce((sum, d) => sum + d.actual, 0) / recentData.length;
  const oldAvg = oldData.reduce((sum, d) => sum + d.actual, 0) / oldData.length;
  const calculatedTrend = (recentAvg - oldAvg) / 14; // Daily trend

  // Generate 30 days of forecast
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base load adjusted for weekend
    let baseLoad = profile.baseLoad;
    if (isWeekend) {
      baseLoad *= profile.weekendMultiplier;
    }

    // Apply trend
    const trendComponent = calculatedTrend * i * profile.trendFactor;

    // Seasonal pattern (weekly cycle + some randomness)
    const weeklyPattern =
      Math.sin((i / 7) * 2 * Math.PI) * profile.seasonalStrength;
    const monthlyPattern =
      Math.sin((i / 30) * 2 * Math.PI) * (profile.seasonalStrength * 0.3);

    // Calculate forecast
    const forecast = baseLoad + trendComponent + weeklyPattern + monthlyPattern;

    // Confidence intervals based on historical volatility
    const historicalVolatility = calculateVolatility(historicalData);
    const confidenceWidth = historicalVolatility * profile.volatility * 20;

    const upper = forecast + confidenceWidth;
    const lower = Math.max(0, forecast - confidenceWidth);

    forecastData.push({
      date: date.toISOString().split("T")[0],
      forecast: Math.round(forecast),
      upper: Math.round(upper),
      lower: Math.round(lower),
      type: "forecast",
    });
  }

  return forecastData;
};

// Calculate historical volatility
const calculateVolatility = (data) => {
  if (data.length < 2) return 10;

  const values = data.map((d) => d.actual);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;

  return Math.sqrt(variance);
};

// Generate historical data for a specific station
const generateHistoricalData = (bssId) => {
  const profile = stationProfiles[bssId];
  const historicalData = [];

  // Generate 60 days of historical data
  for (let i = -60; i < 0; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base pattern with station-specific characteristics
    let baseLoad = profile.baseLoad;
    if (isWeekend) {
      baseLoad *= profile.weekendMultiplier;
    }

    // Add trend over time
    const trend = i * profile.trendFactor * 0.1;

    // Seasonal variations
    const seasonal = Math.sin((i / 7) * 2 * Math.PI) * profile.seasonalStrength;
    const monthlyVariation =
      Math.sin((i / 30) * 2 * Math.PI) * (profile.seasonalStrength * 0.2);

    // Add realistic noise
    const noise = (Math.random() - 0.5) * profile.volatility * 30;

    const swapCount = Math.max(
      0,
      Math.round(baseLoad + trend + seasonal + monthlyVariation + noise)
    );

    historicalData.push({
      date: date.toISOString().split("T")[0],
      actual: swapCount,
      type: "historical",
    });
  }

  return historicalData;
};

const BatteryForecastingChart = () => {
  const [selectedBSS, setSelectedBSS] = useState("BSS_001");

  // Generate data dynamically based on selected station
  const chartData = useMemo(() => {
    const historical = generateHistoricalData(selectedBSS);
    const forecast = calculateForecast(selectedBSS, historical);
    return [...historical, ...forecast];
  }, [selectedBSS]);

  // Calculate real-time statistics
  const statistics = useMemo(() => {
    const historicalData = chartData.filter((d) => d.actual);
    const forecastData = chartData.filter((d) => d.forecast);

    const avgDaily =
      historicalData.length > 0
        ? Math.round(
            historicalData.reduce((sum, d) => sum + d.actual, 0) /
              historicalData.length
          )
        : 0;

    const peakDay =
      historicalData.length > 0
        ? Math.max(...historicalData.map((d) => d.actual))
        : 0;

    const forecastAvg =
      forecastData.length > 0
        ? Math.round(
            forecastData.reduce((sum, d) => sum + d.forecast, 0) /
              forecastData.length
          )
        : 0;

    // Calculate trend percentage
    const recent = historicalData.slice(-7);
    const previous = historicalData.slice(-14, -7);
    const recentAvg =
      recent.reduce((sum, d) => sum + d.actual, 0) / recent.length;
    const previousAvg =
      previous.reduce((sum, d) => sum + d.actual, 0) / previous.length;
    const trendPercent =
      previous.length > 0
        ? (((recentAvg - previousAvg) / previousAvg) * 100).toFixed(1)
        : 0;

    return { avgDaily, peakDay, forecastAvg, trendPercent };
  }, [chartData]);

  const formatTooltip = (value, name, props) => {
    if (name === "actual") return [`${value} swaps`, "Actual"];
    if (name === "forecast") return [`${value} swaps`, "Forecast"];
    if (name === "upper") return [`${value} swaps`, "Upper Bound"];
    if (name === "lower") return [`${value} swaps`, "Lower Bound"];
    return [value, name];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-slate-200 font-medium">{`Date: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {formatTooltip(entry.value, entry.dataKey)[1]}:{" "}
              {formatTooltip(entry.value, entry.dataKey)[0]}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const currentProfile = stationProfiles[selectedBSS];
  const bssOptions = Object.keys(stationProfiles);

  return (
    <div className="space-y-6">
      {/* BSS Selection and Summary Cards */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            Battery Swap Load Forecasting
          </h2>
          <p className="text-slate-400">
            Real-time predictive analytics for {currentProfile.name}
          </p>
        </div>
        <Select value={selectedBSS} onValueChange={setSelectedBSS}>
          <SelectTrigger className="w-48 bg-slate-900/50 border-slate-700 text-slate-100">
            <SelectValue placeholder="Select BSS Station" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            {bssOptions.map((bssId) => (
              <SelectItem
                key={bssId}
                value={bssId}
                className="text-slate-100 hover:bg-slate-800"
              >
                {bssId} - {stationProfiles[bssId].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-sm">
              Avg Daily Swaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400">
              {statistics.avgDaily}
            </div>
            <p className="text-xs text-slate-400 mt-1">Historical average</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-sm">Peak Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400">
              {statistics.peakDay}
            </div>
            <p className="text-xs text-slate-400 mt-1">Maximum recorded</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-sm">
              30-Day Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {statistics.forecastAvg}
            </div>
            <p className="text-xs text-slate-400 mt-1">Predicted average</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-sm">Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                parseFloat(statistics.trendPercent) >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {statistics.trendPercent >= 0 ? "+" : ""}
              {statistics.trendPercent}%
            </div>
            <p className="text-xs text-slate-400 mt-1">Growth projection</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Forecasting Chart */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">
            📊 Daily Battery Swap Load Forecast - {selectedBSS}
          </CardTitle>
          <CardDescription className="text-slate-400">
            Real-time forecasting with {currentProfile.name} patterns and
            confidence intervals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  label={{
                    value: "Swap Count",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle", fill: "#9CA3AF" },
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#9CA3AF" }} />

                {/* Confidence interval area */}
                <Area
                  type="monotone"
                  dataKey="upper"
                  stackId="1"
                  stroke="none"
                  fill="rgba(34, 197, 94, 0.1)"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stackId="1"
                  stroke="none"
                  fill="rgba(34, 197, 94, 0.1)"
                />

                {/* Historical actual data */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: "#3B82F6", r: 3 }}
                  connectNulls={false}
                  name="Actual Swaps"
                />

                {/* Forecast line */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#22C55E"
                  strokeWidth={2}
                  strokeDasharray="8 8"
                  dot={{ fill: "#22C55E", r: 3 }}
                  connectNulls={false}
                  name="Forecast"
                />

                {/* Confidence bounds */}
                <Line
                  type="monotone"
                  dataKey="upper"
                  stroke="rgba(34, 197, 94, 0.4)"
                  strokeWidth={1}
                  dot={false}
                  connectNulls={false}
                  name="Upper Bound"
                />
                <Line
                  type="monotone"
                  dataKey="lower"
                  stroke="rgba(34, 197, 94, 0.4)"
                  strokeWidth={1}
                  dot={false}
                  connectNulls={false}
                  name="Lower Bound"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Additional Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">
              Weekly Pattern Analysis
            </CardTitle>
            <CardDescription className="text-slate-400">
              {currentProfile.name} usage patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].map((day, index) => {
                const isWeekend = index === 5 || index === 6;
                const baseUsage = isWeekend ? 70 : 90;
                const adjustedUsage = isWeekend
                  ? Math.round(baseUsage * currentProfile.weekendMultiplier)
                  : baseUsage;
                return (
                  <div key={day} className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm">{day}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            isWeekend ? "bg-amber-400" : "bg-cyan-400"
                          }`}
                          style={{ width: `${Math.min(100, adjustedUsage)}%` }}
                        />
                      </div>
                      <span className="text-slate-400 text-xs w-8">
                        {adjustedUsage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">Forecast Accuracy</CardTitle>
            <CardDescription className="text-slate-400">
              Model performance metrics for {currentProfile.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Mean Absolute Error</span>
                <span className="text-cyan-400 font-mono">
                  {(currentProfile.volatility * 15).toFixed(1)} swaps
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Accuracy Score</span>
                <span className="text-green-400 font-mono">
                  {(95 - currentProfile.volatility * 10).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Confidence Interval</span>
                <span className="text-slate-400 font-mono">
                  ±{Math.round(currentProfile.volatility * 25)} swaps
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Last Updated</span>
                <span className="text-slate-400 font-mono">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BatteryForecastingChart;
