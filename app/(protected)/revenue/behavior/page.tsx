"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Battery,
  Home,
  MapPin,
  Users,
  DollarSign,
  Zap,
  Activity,
  Target,
  Package,
} from "lucide-react";

// Enhanced mock data generator with more realistic patterns
const generateMockData = () => {
  const months = [
    "2024-01",
    "2024-02",
    "2024-03",
    "2024-04",
    "2024-05",
    "2024-06",
  ];
  const vehicles = Array.from(
    { length: 20 },
    (_, i) => `TBX${String(i + 1).padStart(3, "0")}`
  );
  const stations = [
    "Station Alpha",
    "Station Beta",
    "Station Gamma",
    "Station Delta",
    "Station Epsilon",
    "Station Zeta",
  ];
  const regions = ["North", "South", "East", "West", "Central"];

  const data = [];
  vehicles.forEach((vehicle, idx) => {
    const baseUsage = 50 + (idx % 4) * 60; // Different usage patterns
    const region = regions[idx % regions.length];

    months.forEach((month, monthIdx) => {
      const seasonalFactor = 1 + Math.sin(monthIdx / 2) * 0.2;
      const distance = Math.floor(
        (baseUsage + Math.random() * 40 - 20) * seasonalFactor
      );
      const swaps = Math.floor(distance / (25 + Math.random() * 10));
      const homeCharging = Math.floor(Math.random() * 8);
      const avgSpeed = 35 + Math.random() * 20;
      const idleTime = Math.floor(Math.random() * 120) + 30;

      data.push({
        TBOXID: vehicle,
        MONTH_START: month,
        TOTAL_DISTANCE_KM: distance,
        USAGE_TYPE:
          distance <= 50
            ? "Low Usage"
            : distance <= 150
            ? "Medium Usage"
            : "High Usage",
        NO_OF_SWAPS: swaps,
        NO_OF_HOMECHARGINGS: homeCharging,
        FREQUENT_SWIPING_STATIONS: `${
          stations[Math.floor(Math.random() * stations.length)]
        }, ${stations[Math.floor(Math.random() * stations.length)]}`,
        AVG_DISTANCE_PER_PERIOD: Math.round((distance / 30) * 100) / 100,
        REGION: region,
        AVG_SPEED_KMH: Math.round(avgSpeed * 10) / 10,
        IDLE_TIME_HOURS: idleTime,
        REVENUE_ESTIMATE: Math.round(swaps * 50 + homeCharging * 30),
        BATTERY_HEALTH: 95 - Math.floor(Math.random() * 20),
        MAINTENANCE_DUE: Math.random() > 0.8,
      });
    });
  });

  return data;
};

const VehicleInsightsDashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState("2024-06");
  const [selectedInsight, setSelectedInsight] = useState("fleet");
  const [selectedRegion, setSelectedRegion] = useState("All");

  const mockData = useMemo(() => generateMockData(), []);

  const filteredData = mockData.filter(
    (d) =>
      d.MONTH_START === selectedMonth &&
      (selectedRegion === "All" || d.REGION === selectedRegion)
  );
  const allMonths = [...new Set(mockData.map((d) => d.MONTH_START))].sort();
  const regions = ["All", ...new Set(mockData.map((d) => d.REGION))];

  // Comprehensive insights calculations
  const insights = useMemo(() => {
    const currentMonth = filteredData;
    const prevMonthData = mockData.filter((d) => {
      const prevIdx = allMonths.indexOf(selectedMonth) - 1;
      return (
        prevIdx >= 0 &&
        d.MONTH_START === allMonths[prevIdx] &&
        (selectedRegion === "All" || d.REGION === selectedRegion)
      );
    });

    const avgDistance =
      currentMonth.reduce((sum, v) => sum + v.TOTAL_DISTANCE_KM, 0) /
      currentMonth.length;
    const prevAvgDistance =
      prevMonthData.length > 0
        ? prevMonthData.reduce((sum, v) => sum + v.TOTAL_DISTANCE_KM, 0) /
          prevMonthData.length
        : avgDistance;

    const totalSwaps = currentMonth.reduce((sum, v) => sum + v.NO_OF_SWAPS, 0);
    const totalHomeCharging = currentMonth.reduce(
      (sum, v) => sum + v.NO_OF_HOMECHARGINGS,
      0
    );
    const totalRevenue = currentMonth.reduce(
      (sum, v) => sum + v.REVENUE_ESTIMATE,
      0
    );
    const prevRevenue = prevMonthData.reduce(
      (sum, v) => sum + v.REVENUE_ESTIMATE,
      0
    );

    const lowUsageVehicles = currentMonth.filter(
      (v) => v.USAGE_TYPE === "Low Usage"
    );
    const mediumUsageVehicles = currentMonth.filter(
      (v) => v.USAGE_TYPE === "Medium Usage"
    );
    const highUsageVehicles = currentMonth.filter(
      (v) => v.USAGE_TYPE === "High Usage"
    );

    const maintenanceDue = currentMonth.filter((v) => v.MAINTENANCE_DUE).length;
    const avgBatteryHealth =
      currentMonth.reduce((sum, v) => sum + v.BATTERY_HEALTH, 0) /
      currentMonth.length;
    const avgIdleTime =
      currentMonth.reduce((sum, v) => sum + v.IDLE_TIME_HOURS, 0) /
      currentMonth.length;

    // Fleet utilization rate
    const fleetUtilization =
      ((mediumUsageVehicles.length + highUsageVehicles.length) /
        currentMonth.length) *
      100;

    // Station analysis
    const stationFrequency = {};
    currentMonth.forEach((v) => {
      const stations = v.FREQUENT_SWIPING_STATIONS.split(", ");
      stations.forEach((s) => {
        stationFrequency[s] = (stationFrequency[s] || 0) + 1;
      });
    });

    const topStation = Object.entries(stationFrequency).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const stationLoad = Object.entries(stationFrequency).map(
      ([name, count]) => ({ name, count })
    );

    // Cost efficiency
    const avgCostPerKm =
      totalRevenue /
      currentMonth.reduce((sum, v) => sum + v.TOTAL_DISTANCE_KM, 0);

    return {
      avgDistance: Math.round(avgDistance),
      distanceTrend: prevAvgDistance
        ? (((avgDistance - prevAvgDistance) / prevAvgDistance) * 100).toFixed(1)
        : "0",
      totalSwaps,
      totalHomeCharging,
      swapRatio: (
        (totalSwaps / (totalSwaps + totalHomeCharging)) *
        100
      ).toFixed(1),
      lowUsageCount: lowUsageVehicles.length,
      mediumUsageCount: mediumUsageVehicles.length,
      highUsageCount: highUsageVehicles.length,
      maintenanceDue,
      avgBatteryHealth: avgBatteryHealth.toFixed(1),
      avgIdleTime: Math.round(avgIdleTime),
      fleetUtilization: fleetUtilization.toFixed(1),
      totalRevenue,
      revenueTrend: prevRevenue
        ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1)
        : "0",
      avgCostPerKm: avgCostPerKm.toFixed(2),
      topStation: topStation ? topStation[0] : "N/A",
      topStationCount: topStation ? topStation[1] : 0,
      stationLoad,
      activeFleetSize: currentMonth.length,
    };
  }, [filteredData, mockData, selectedMonth, selectedRegion, allMonths]);

  // Regional performance comparison
  const regionalData = useMemo(() => {
    if (selectedRegion !== "All") return [];

    const regionStats = {};
    filteredData.forEach((v) => {
      if (!regionStats[v.REGION]) {
        regionStats[v.REGION] = {
          region: v.REGION,
          vehicles: 0,
          totalDistance: 0,
          totalRevenue: 0,
          swaps: 0,
          avgBatteryHealth: 0,
        };
      }
      regionStats[v.REGION].vehicles++;
      regionStats[v.REGION].totalDistance += v.TOTAL_DISTANCE_KM;
      regionStats[v.REGION].totalRevenue += v.REVENUE_ESTIMATE;
      regionStats[v.REGION].swaps += v.NO_OF_SWAPS;
      regionStats[v.REGION].avgBatteryHealth += v.BATTERY_HEALTH;
    });

    return Object.values(regionStats).map((r) => ({
      ...r,
      avgDistance: Math.round(r.totalDistance / r.vehicles),
      avgRevenue: Math.round(r.totalRevenue / r.vehicles),
      avgBatteryHealth: Math.round(r.avgBatteryHealth / r.vehicles),
    }));
  }, [filteredData, selectedRegion]);

  // Fleet health analysis
  const fleetHealth = useMemo(() => {
    return filteredData.map((v) => ({
      vehicle: v.TBOXID,
      batteryHealth: v.BATTERY_HEALTH,
      distance: v.TOTAL_DISTANCE_KM,
      idleTime: v.IDLE_TIME_HOURS,
      maintenance: v.MAINTENANCE_DUE,
    }));
  }, [filteredData]);

  // Monthly trends across all metrics
  const comprehensiveTrends = useMemo(() => {
    return allMonths.map((month) => {
      const monthData = mockData.filter(
        (d) =>
          d.MONTH_START === month &&
          (selectedRegion === "All" || d.REGION === selectedRegion)
      );
      return {
        month: month.substring(5),
        avgDistance: Math.round(
          monthData.reduce((sum, v) => sum + v.TOTAL_DISTANCE_KM, 0) /
            monthData.length
        ),
        totalSwaps: monthData.reduce((sum, v) => sum + v.NO_OF_SWAPS, 0),
        revenue: Math.round(
          monthData.reduce((sum, v) => sum + v.REVENUE_ESTIMATE, 0) / 1000
        ),
        utilization: (
          (monthData.filter((v) => v.USAGE_TYPE !== "Low Usage").length /
            monthData.length) *
          100
        ).toFixed(1),
        avgBatteryHealth: Math.round(
          monthData.reduce((sum, v) => sum + v.BATTERY_HEALTH, 0) /
            monthData.length
        ),
      };
    });
  }, [mockData, allMonths, selectedRegion]);

  // Usage vs Revenue scatter
  const usageRevenueCorrelation = useMemo(() => {
    return filteredData.map((v) => ({
      distance: v.TOTAL_DISTANCE_KM,
      revenue: v.REVENUE_ESTIMATE,
      swaps: v.NO_OF_SWAPS,
      vehicle: v.TBOXID,
    }));
  }, [filteredData]);

  const COLORS = [
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
  ];

  const InsightCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    alert,
    color = "blue",
  }) => (
    <div className={` rounded-lg shadow-md p-6 border-l-4 border-${color}-500`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`text-${color}-600`} size={24} />
        </div>
      </div>
      {trend && (
        <div
          className={`flex items-center mt-3 text-sm ${
            parseFloat(trend) >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {parseFloat(trend) >= 0 ? (
            <TrendingUp size={16} />
          ) : (
            <TrendingDown size={16} />
          )}
          <span className="ml-1">
            {Math.abs(parseFloat(trend))}% vs last month
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Fleet Intelligence Hub
            </h1>
            <p className="text-gray-600 mt-1">
              Comprehensive vehicle analytics and operational insights
            </p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region} Region
                </option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {allMonths.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <InsightCard
            title="Fleet Utilization"
            value={`${insights.fleetUtilization}%`}
            subtitle={`${insights.activeFleetSize} active vehicles`}
            icon={Activity}
            trend={insights.distanceTrend}
            color="blue"
          />
          <InsightCard
            title="Monthly Revenue"
            value={`$${(insights.totalRevenue / 1000).toFixed(1)}K`}
            subtitle={`$${insights.avgCostPerKm}/km average`}
            icon={DollarSign}
            trend={insights.revenueTrend}
            color="green"
          />
          <InsightCard
            title="Battery Health"
            value={`${insights.avgBatteryHealth}%`}
            subtitle={`${insights.maintenanceDue} vehicles need service`}
            icon={Battery}
            alert={insights.maintenanceDue > 3}
            color={insights.maintenanceDue > 3 ? "red" : "green"}
          />
          <InsightCard
            title="Charging Events"
            value={insights.totalSwaps + insights.totalHomeCharging}
            subtitle={`${insights.swapRatio}% battery swaps`}
            icon={Zap}
            color="purple"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6  rounded-lg p-1 shadow overflow-x-auto">
          {[
            { id: "fleet", label: "Fleet Overview", icon: Package },
            { id: "performance", label: "Performance Metrics", icon: Target },
            { id: "regional", label: "Regional Analysis", icon: MapPin },
            { id: "health", label: "Fleet Health", icon: Activity },
            { id: "financial", label: "Financial Insights", icon: DollarSign },
            {
              id: "strategic",
              label: "Strategic Recommendations",
              icon: TrendingUp,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedInsight(tab.id)}
              className={`flex items-center gap-2 py-2 px-4 rounded-md font-medium transition whitespace-nowrap ${
                selectedInsight === tab.id
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Fleet Overview Tab */}
        {selectedInsight === "fleet" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className=" rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Fleet Distribution by Usage
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Low Usage", value: insights.lowUsageCount },
                      {
                        name: "Medium Usage",
                        value: insights.mediumUsageCount,
                      },
                      { name: "High Usage", value: insights.highUsageCount },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1, 2].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {insights.lowUsageCount}
                  </p>
                  <p className="text-sm text-gray-600">Low Usage</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {insights.mediumUsageCount}
                  </p>
                  <p className="text-sm text-gray-600">Medium Usage</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {insights.highUsageCount}
                  </p>
                  <p className="text-sm text-gray-600">High Usage</p>
                </div>
              </div>
            </div>

            <div className=" rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Station Load Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={insights.stationLoad.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Visits" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className=" rounded-lg shadow-md p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">
                6-Month Fleet Performance Trends
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={comprehensiveTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="utilization"
                    fill="#8b5cf6"
                    stroke="#8b5cf6"
                    name="Utilization %"
                    fillOpacity={0.3}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="avgDistance"
                    fill="#3b82f6"
                    name="Avg Distance (km)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={3}
                    name="Revenue ($K)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Performance Metrics Tab */}
        {selectedInsight === "performance" && (
          <div className="grid grid-cols-1 gap-6">
            <div className=" rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Usage vs Revenue Correlation
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="distance" name="Distance (km)" />
                  <YAxis dataKey="revenue" name="Revenue ($)" />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Legend />
                  <Scatter
                    name="Vehicles"
                    data={usageRevenueCorrelation}
                    fill="#3b82f6"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className=" rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Charging Mix Trends
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={comprehensiveTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="totalSwaps"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      name="Battery Swaps"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className=" rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Idle Time Analysis
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4  rounded">
                    <span className="font-medium">Average Idle Time</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {insights.avgIdleTime}h
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4  rounded">
                    <span className="font-medium">Productive Hours</span>
                    <span className="text-2xl font-bold text-green-600">
                      {720 - insights.avgIdleTime}h
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4  rounded">
                    <span className="font-medium">Fleet Efficiency</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {(((720 - insights.avgIdleTime) / 720) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regional Analysis Tab */}
        {selectedInsight === "regional" && selectedRegion === "All" && (
          <div className="grid grid-cols-1 gap-6">
            <div className=" rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Regional Performance Comparison
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={regionalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="avgDistance"
                    fill="#3b82f6"
                    name="Avg Distance (km)"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="swaps"
                    fill="#10b981"
                    name="Total Swaps"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="avgRevenue"
                    fill="#f59e0b"
                    name="Avg Revenue ($)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className=" rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Regional Fleet Health
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="avgBatteryHealth"
                    fill="#8b5cf6"
                    name="Avg Battery Health %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {selectedInsight === "regional" && selectedRegion !== "All" && (
          <div className=" rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {selectedRegion} Region - Detailed View
            </h3>
            <p className="text-gray-600 mb-4">
              Select "All Regions" to view comparative regional analysis
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Active Vehicles</p>
                <p className="text-2xl font-bold text-blue-600">
                  {insights.activeFleetSize}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Distance</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(
                    filteredData.reduce(
                      (sum, v) => sum + v.TOTAL_DISTANCE_KM,
                      0
                    )
                  )}{" "}
                  km
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${(insights.totalRevenue / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">Avg Utilization</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {insights.fleetUtilization}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Fleet Health Tab */}
        {selectedInsight === "health" && (
          <div className="grid grid-cols-1 gap-6">
            <div className=" rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Battery Health vs Distance Traveled
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="distance" name="Distance (km)" />
                  <YAxis dataKey="batteryHealth" name="Battery Health %" />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Legend />
                  <Scatter
                    name="Vehicles"
                    data={fleetHealth}
                    fill="#8b5cf6"
                    shape={(props) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={payload.maintenance ? "#ef4444" : "#8b5cf6"}
                          stroke={payload.maintenance ? "#991b1b" : "#5b21b6"}
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <p className="text-sm text-gray-600 mt-2">
                <span className="inline-block w-3 h-3 bg-purple-600 rounded-full mr-2"></span>
                Healthy vehicles
                <span className="inline-block w-3 h-3 bg-red-600 rounded-full ml-4 mr-2"></span>
                Maintenance required
              </p>
            </div>

            <div className=" rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Fleet Health Overview
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className=" border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Vehicle
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Battery %
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Distance
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Idle Time
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fleetHealth.slice(0, 10).map((v, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:">
                        <td className="px-4 py-3 font-medium">{v.vehicle}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-semibold ${
                              v.batteryHealth >= 85
                                ? "text-green-600"
                                : v.batteryHealth >= 70
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {v.batteryHealth}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {v.distance} km
                        </td>
                        <td className="px-4 py-3 text-right">{v.idleTime}h</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              v.maintenance
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {v.maintenance ? "Maintenance Due" : "Healthy"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Financial Insights Tab */}
        {selectedInsight === "financial" && (
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Total Revenue</h3>
                  <DollarSign size={28} />
                </div>
                <p className="text-4xl font-bold">
                  ${(insights.totalRevenue / 1000).toFixed(1)}K
                </p>
                <p className="text-green-100 text-sm mt-2">
                  {parseFloat(insights.revenueTrend) >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(parseFloat(insights.revenueTrend))}% from last month
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Revenue per Vehicle</h3>
                  <TrendingUp size={28} />
                </div>
                <p className="text-4xl font-bold">
                  $
                  {Math.round(insights.totalRevenue / insights.activeFleetSize)}
                </p>
                <p className="text-blue-100 text-sm mt-2">
                  Average monthly revenue
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Cost per KM</h3>
                  <Target size={28} />
                </div>
                <p className="text-4xl font-bold">${insights.avgCostPerKm}</p>
                <p className="text-purple-100 text-sm mt-2">
                  Fleet average efficiency
                </p>
              </div>
            </div>

            <div className=" rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Revenue Composition Analysis
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={comprehensiveTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue ($K)" />
                  <Line
                    type="monotone"
                    dataKey="totalSwaps"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Total Swaps"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className=" rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Revenue Drivers & Opportunities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                  <h4 className="font-semibold text-green-800 mb-2">
                    High-Value Segments
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>
                      • High usage vehicles generate $
                      {Math.round(
                        (insights.totalRevenue / insights.activeFleetSize) * 1.5
                      )}{" "}
                      avg/month
                    </li>
                    <li>
                      • Battery swap revenue: $
                      {Math.round((insights.totalSwaps * 50) / 1000)}K this
                      month
                    </li>
                    <li>
                      • Top performing region contributes 30% of total revenue
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Growth Opportunities
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>
                      • {insights.lowUsageCount} underutilized vehicles could
                      generate +${insights.lowUsageCount * 200}/month
                    </li>
                    <li>
                      • Increasing swap adoption by 10% = +$
                      {Math.round((insights.totalRevenue * 0.05) / 1000)}K
                      revenue
                    </li>
                    <li>
                      • Premium service tier opportunity for high-usage
                      customers
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Strategic Recommendations Tab */}
        {selectedInsight === "strategic" && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">
              AI-Powered Strategic Insights & Recommendations
            </h3>

            {/* Critical Priorities */}
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="text-red-600 flex-shrink-0"
                  size={24}
                />
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-red-800 mb-3">
                    Critical Action Items
                  </h4>

                  {insights.lowUsageCount > 3 && (
                    <div className="mb-4  rounded p-4">
                      <p className="font-semibold text-gray-800">
                        Asset Underutilization Crisis
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {insights.lowUsageCount} vehicles (
                        {(
                          (insights.lowUsageCount / insights.activeFleetSize) *
                          100
                        ).toFixed(1)}
                        % of fleet) traveling &lt;50km/month. Estimated
                        opportunity cost: ${insights.lowUsageCount * 200}/month.
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-blue-700">
                        <p>
                          → <strong>Immediate:</strong> Reallocate{" "}
                          {Math.ceil(insights.lowUsageCount / 2)} vehicles to
                          high-demand regions
                        </p>
                        <p>
                          → <strong>Short-term:</strong> Launch promotional
                          pricing (20% discount) for underutilized vehicles
                        </p>
                        <p>
                          → <strong>Long-term:</strong> Implement dynamic fleet
                          distribution based on regional demand patterns
                        </p>
                      </div>
                    </div>
                  )}

                  {insights.maintenanceDue > 2 && (
                    <div className="mb-4  rounded p-4">
                      <p className="font-semibold text-gray-800">
                        Maintenance Backlog Risk
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {insights.maintenanceDue} vehicles require immediate
                        maintenance. Delayed service increases breakdown risk by
                        35% and reduces customer satisfaction.
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-blue-700">
                        <p>
                          → <strong>Immediate:</strong> Schedule service for all{" "}
                          {insights.maintenanceDue} vehicles within 48 hours
                        </p>
                        <p>
                          → <strong>Preventive:</strong> Implement predictive
                          maintenance alerts at 80% battery health threshold
                        </p>
                      </div>
                    </div>
                  )}

                  {insights.topStationCount >
                    insights.activeFleetSize * 0.5 && (
                    <div className=" rounded p-4">
                      <p className="font-semibold text-gray-800">
                        Infrastructure Bottleneck Alert
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {insights.topStation} handling{" "}
                        {(
                          (insights.topStationCount /
                            insights.activeFleetSize) *
                          100
                        ).toFixed(0)}
                        % of swaps creates single-point failure risk and
                        customer wait times.
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-blue-700">
                        <p>
                          → <strong>Urgent:</strong> Deploy 2 mobile swap units
                          near {insights.topStation} to reduce congestion
                        </p>
                        <p>
                          → <strong>Strategic:</strong> Open new permanent
                          station within 3km radius (ROI: 8-12 months)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Growth Opportunities */}
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <TrendingUp
                  className="text-green-600 flex-shrink-0"
                  size={24}
                />
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-green-800 mb-3">
                    Revenue Growth Opportunities
                  </h4>

                  <div className="space-y-4">
                    <div className=" rounded p-4">
                      <p className="font-semibold text-gray-800">
                        Premium Tier Launch Opportunity
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {insights.highUsageCount} high-usage vehicles average{" "}
                        {insights.avgDistance}km/month. These customers show 3x
                        engagement vs average.
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-blue-700">
                        <p>
                          → Launch "Power User" tier: Unlimited swaps for $
                          {Math.round(
                            (insights.totalRevenue / insights.activeFleetSize) *
                              1.3
                          )}
                          /month
                        </p>
                        <p>
                          → Include priority swap access + dedicated support
                        </p>
                        <p>
                          → Projected uptake: 60% of high-usage customers = +$
                          {Math.round(
                            (insights.highUsageCount * 0.6 * 50) / 1000
                          )}
                          K monthly
                        </p>
                      </div>
                    </div>

                    {insights.swapRatio < 50 && (
                      <div className=" rounded p-4">
                        <p className="font-semibold text-gray-800">
                          Swap Adoption Enhancement
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          Current swap rate: {insights.swapRatio}%. Industry
                          benchmark: 65%. Each 10% increase = +$
                          {Math.round((insights.totalRevenue * 0.08) / 1000)}K
                          revenue.
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-blue-700">
                          <p>
                            → Gamification: Reward points for swap usage
                            (redeemable for free swaps)
                          </p>
                          <p>
                            → Partner with delivery/rideshare platforms for
                            guaranteed swap access
                          </p>
                          <p>
                            → Install 5-minute express swap lanes at top 3
                            stations
                          </p>
                        </div>
                      </div>
                    )}

                    <div className=" rounded p-4">
                      <p className="font-semibold text-gray-800">
                        Regional Expansion Strategy
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        Regional performance analysis shows 40% variance. Top
                        region generates $
                        {Math.round(
                          (insights.totalRevenue / insights.activeFleetSize) *
                            1.4
                        )}
                        /vehicle vs fleet average.
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-blue-700">
                        <p>
                          → Replicate top region's station density in
                          underperforming areas
                        </p>
                        <p>
                          → Focus next expansion in high-density residential
                          zones (25km from current stations)
                        </p>
                        <p>
                          → Projected impact: +15-20% utilization in targeted
                          regions within 6 months
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Efficiency */}
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Activity className="text-blue-600 flex-shrink-0" size={24} />
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-blue-800 mb-3">
                    Operational Excellence Initiatives
                  </h4>

                  <div className="space-y-4">
                    <div className=" rounded p-4">
                      <p className="font-semibold text-gray-800">
                        Idle Time Optimization
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        Fleet average idle time: {insights.avgIdleTime}h/month.
                        Each 10-hour reduction = ~{Math.round((10 / 24) * 35)}{" "}
                        additional km capacity per vehicle.
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-blue-700">
                        <p>
                          → Deploy AI-based demand prediction to pre-position
                          vehicles
                        </p>
                        <p>
                          → Implement vehicle sharing program for underutilized
                          assets
                        </p>
                        <p>
                          → Target: Reduce idle time to{" "}
                          {Math.round(insights.avgIdleTime * 0.7)}h (30%
                          improvement)
                        </p>
                      </div>
                    </div>

                    <div className=" rounded p-4">
                      <p className="font-semibold text-gray-800">
                        Battery Health Program
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        Average battery health: {insights.avgBatteryHealth}%.
                        Proactive battery management extends lifespan by 25% and
                        reduces emergency replacements.
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-blue-700">
                        <p>
                          → Automated health monitoring with ML-based
                          degradation prediction
                        </p>
                        <p>
                          → Scheduled battery rotation program every 50 swap
                          cycles
                        </p>
                        <p>
                          → Cost savings: $15K-20K annually in avoided emergency
                          replacements
                        </p>
                      </div>
                    </div>

                    <div className=" rounded p-4">
                      <p className="font-semibold text-gray-800">
                        Smart Routing & Energy Efficiency
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        Cost per km: ${insights.avgCostPerKm}. Route
                        optimization and driving behavior coaching can reduce by
                        12-15%.
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-blue-700">
                        <p>
                          → Integrate real-time traffic data for optimal routing
                        </p>
                        <p>
                          → Driver coaching app with eco-driving tips and
                          rewards
                        </p>
                        <p>
                          → Projected savings: $
                          {Math.round((insights.totalRevenue * 0.12) / 1000)}K
                          monthly
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data-Driven Insights */}
            <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Target className="text-purple-600 flex-shrink-0" size={24} />
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-purple-800 mb-3">
                    Long-Term Strategic Planning
                  </h4>

                  <div className="space-y-4">
                    <div className=" rounded p-4">
                      <p className="font-semibold text-gray-800">
                        12-Month Fleet Expansion Model
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        Current utilization: {insights.fleetUtilization}%. At
                        85%+ utilization, expansion becomes economically viable.
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-blue-700">
                        <p>
                          → Q1: Optimize current fleet (target: 80% utilization)
                        </p>
                        <p>→ Q2-Q3: Add 15 vehicles in high-demand regions</p>
                        <p>
                          → Q4: Launch corporate partnership program (estimated
                          +30 vehicles)
                        </p>
                        <p>
                          → ROI projection: Break-even month 8, 45% IRR over 3
                          years
                        </p>
                      </div>
                    </div>

                    <div className=" rounded p-4">
                      <p className="font-semibold text-gray-800">
                        Technology Investment Roadmap
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        Strategic tech investments to improve margins and
                        customer experience.
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-blue-700">
                        <p>
                          → Phase 1 (Q1): Advanced analytics dashboard for
                          real-time decision making
                        </p>
                        <p>
                          → Phase 2 (Q2): Customer mobile app with predictive
                          battery planning
                        </p>
                        <p>
                          → Phase 3 (Q3): Automated fleet management with AI
                          optimization
                        </p>
                        <p>
                          → Expected efficiency gains: 20-25% operational cost
                          reduction
                        </p>
                      </div>
                    </div>

                    <div className=" rounded p-4">
                      <p className="font-semibold text-gray-800">
                        Sustainability & ESG Positioning
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        Current fleet offset: ~
                        {Math.round(
                          insights.avgDistance * insights.activeFleetSize * 0.2
                        )}{" "}
                        tons CO₂/month. Strong ESG story attracts corporate
                        clients.
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-blue-700">
                        <p>→ Publish monthly sustainability impact reports</p>
                        <p>
                          → Partner with eco-conscious brands for co-marketing
                        </p>
                        <p>
                          → Develop "Green Fleet" tier for carbon-neutral
                          operations
                        </p>
                        <p>
                          → Target: 25% corporate client base within 12 months
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-gray-800 text-white rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-3">
                Executive Summary - Key Metrics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Fleet Utilization</p>
                  <p className="text-2xl font-bold">
                    {insights.fleetUtilization}%
                  </p>
                  <p className="text-xs text-gray-400">Target: 80%+</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Revenue Trend</p>
                  <p className="text-2xl font-bold">
                    {parseFloat(insights.revenueTrend) >= 0 ? "+" : ""}
                    {insights.revenueTrend}%
                  </p>
                  <p className="text-xs text-gray-400">Month-over-month</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Avg Battery Health</p>
                  <p className="text-2xl font-bold">
                    {insights.avgBatteryHealth}%
                  </p>
                  <p className="text-xs text-gray-400">Fleet average</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Action Items</p>
                  <p className="text-2xl font-bold">
                    {(insights.lowUsageCount > 3 ? 1 : 0) +
                      (insights.maintenanceDue > 2 ? 1 : 0) +
                      (insights.topStationCount > insights.activeFleetSize * 0.5
                        ? 1
                        : 0)}
                  </p>
                  <p className="text-xs text-gray-400">Critical priorities</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleInsightsDashboard;
