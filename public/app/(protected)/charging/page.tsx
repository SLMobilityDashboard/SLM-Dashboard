"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Battery,
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Zap,
  Shield,
  Globe,
  Award,
} from "lucide-react";

// Station data with comprehensive metrics
const stationData = {
  BSS_001: {
    name: "Downtown Hub",
    location: "Financial District",
    status: "optimal",
    totalBatteries: 48,
    availableBatteries: 42,
    dailySwaps: 89,
    avgWaitTime: "2.3 min",
    efficiency: 94,
    revenue: 1245,
    peakHours: "8-10 AM, 5-7 PM",
    weeklyTrend: 12.5,
    lastMaintenance: "2 days ago",
    coordinates: { lat: 40.7589, lng: -73.9851 },
    utilizationRate: 87,
    customerSatisfaction: 4.6,
  },
  BSS_002: {
    name: "University Campus",
    location: "Education Zone",
    status: "good",
    totalBatteries: 36,
    availableBatteries: 28,
    dailySwaps: 67,
    avgWaitTime: "3.1 min",
    efficiency: 89,
    revenue: 892,
    peakHours: "7-9 AM, 4-6 PM",
    weeklyTrend: 8.2,
    lastMaintenance: "5 days ago",
    coordinates: { lat: 40.7505, lng: -73.9934 },
    utilizationRate: 78,
    customerSatisfaction: 4.4,
  },
  BSS_003: {
    name: "Shopping Mall",
    location: "Commercial Center",
    status: "optimal",
    totalBatteries: 42,
    availableBatteries: 35,
    dailySwaps: 78,
    avgWaitTime: "1.8 min",
    efficiency: 96,
    revenue: 1089,
    peakHours: "12-2 PM, 6-8 PM",
    weeklyTrend: 15.7,
    lastMaintenance: "1 day ago",
    coordinates: { lat: 40.7614, lng: -73.9776 },
    utilizationRate: 83,
    customerSatisfaction: 4.7,
  },
  BSS_004: {
    name: "Residential Complex",
    location: "Housing District",
    status: "maintenance",
    totalBatteries: 30,
    availableBatteries: 18,
    dailySwaps: 45,
    avgWaitTime: "4.2 min",
    efficiency: 76,
    revenue: 634,
    peakHours: "6-8 AM, 7-9 PM",
    weeklyTrend: -3.1,
    lastMaintenance: "In progress",
    coordinates: { lat: 40.7282, lng: -73.9942 },
    utilizationRate: 60,
    customerSatisfaction: 3.8,
  },
  BSS_005: {
    name: "Transit Station",
    location: "Transportation Hub",
    status: "good",
    totalBatteries: 54,
    availableBatteries: 48,
    dailySwaps: 112,
    avgWaitTime: "2.7 min",
    efficiency: 91,
    revenue: 1567,
    peakHours: "7-9 AM, 5-7 PM",
    weeklyTrend: 9.8,
    lastMaintenance: "3 days ago",
    coordinates: { lat: 40.7505, lng: -73.9934 },
    utilizationRate: 89,
    customerSatisfaction: 4.5,
  },
};

// Custom Badge Component
const Badge = ({ children, className }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
  >
    {children}
  </span>
);

// Custom Card Components
const Card = ({ children, className }) => (
  <div className={`rounded-lg ${className}`}>{children}</div>
);

const CardContent = ({ children, className }) => (
  <div className={className}>{children}</div>
);

const BatteryStationsOverview = () => {
  const [selectedMetric, setSelectedMetric] = useState("dailySwaps");

  // Calculate network-wide statistics
  const networkStats = useMemo(() => {
    const stations = Object.values(stationData);

    const totalStations = stations.length;
    const operationalStations = stations.filter(
      (s) => s.status !== "maintenance"
    ).length;
    const totalBatteries = stations.reduce(
      (sum, s) => sum + s.totalBatteries,
      0
    );
    const availableBatteries = stations.reduce(
      (sum, s) => sum + s.availableBatteries,
      0
    );
    const totalDailySwaps = stations.reduce((sum, s) => sum + s.dailySwaps, 0);
    const totalRevenue = stations.reduce((sum, s) => sum + s.revenue, 0);
    const avgEfficiency =
      stations.reduce((sum, s) => sum + s.efficiency, 0) / stations.length;
    const avgSatisfaction =
      stations.reduce((sum, s) => sum + s.customerSatisfaction, 0) /
      stations.length;

    return {
      totalStations,
      operationalStations,
      totalBatteries,
      availableBatteries,
      totalDailySwaps,
      totalRevenue,
      avgEfficiency,
      avgSatisfaction,
      batteryUtilization:
        ((totalBatteries - availableBatteries) / totalBatteries) * 100,
    };
  }, []);

  // Prepare chart data
  const chartData = useMemo(() => {
    return Object.entries(stationData).map(([id, station]) => ({
      id,
      name: station.name.replace(" ", "\n"),
      dailySwaps: station.dailySwaps,
      efficiency: station.efficiency,
      revenue: station.revenue,
      utilization: station.utilizationRate,
      satisfaction: station.customerSatisfaction,
      available: station.availableBatteries,
      total: station.totalBatteries,
    }));
  }, []);

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    const statusCount = {};
    Object.values(stationData).forEach((station) => {
      statusCount[station.status] = (statusCount[station.status] || 0) + 1;
    });

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      percentage: Math.round((count / Object.keys(stationData).length) * 100),
    }));
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "optimal":
        return "text-green-400";
      case "good":
        return "text-cyan-400";
      case "maintenance":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "optimal":
        return <CheckCircle className="w-4 h-4" />;
      case "good":
        return <Clock className="w-4 h-4" />;
      case "maintenance":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Battery className="w-4 h-4" />;
    }
  };

  const COLORS = ["#22C55E", "#06B6D4", "#EF4444", "#6B7280"];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/90 border border-white/20 rounded-lg p-3 shadow-lg backdrop-blur-sm">
          <p className="text-white font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
              {entry.dataKey === "efficiency" && "%"}
              {entry.dataKey === "revenue" && " $"}
              {entry.dataKey === "satisfaction" && "/5"}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen text-white">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-cyan-900/20" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative z-10 p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-4">
            <Badge className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 px-4 py-2">
              <Award className="w-4 h-4 mr-2" />
              Battery Swap Network
            </Badge>
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Network
                </span>
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Overview
                </span>
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed max-w-2xl">
                Real-time monitoring and analytics across all battery swap
                stations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gradient-to-r from-gray-900/50 to-black/50 border border-white/10 backdrop-blur-sm rounded-2xl px-6 py-4">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Battery className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg">
                {networkStats.operationalStations}/{networkStats.totalStations}
              </div>
              <div className="text-gray-400 text-sm">Operational</div>
            </div>
          </div>
        </div>

        {/* Network Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[
            {
              icon: MapPin,
              label: "Total Stations",
              value: networkStats.totalStations,
              color: "cyan",
              subtitle: "network wide",
            },
            {
              icon: Battery,
              label: "Total Swaps",
              value: networkStats.totalDailySwaps,
              color: "green",
              subtitle: "today",
            },
            {
              icon: TrendingUp,
              label: "Revenue",
              value: `${networkStats.totalRevenue.toLocaleString()}`,
              color: "purple",
              subtitle: "today",
            },
            {
              icon: CheckCircle,
              label: "Efficiency",
              value: `${networkStats.avgEfficiency.toFixed(1)}%`,
              color: "yellow",
              subtitle: "network avg",
            },
            {
              icon: Users,
              label: "Satisfaction",
              value: `${networkStats.avgSatisfaction.toFixed(1)}/5`,
              color: "pink",
              subtitle: "avg rating",
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="group hover:-translate-y-1 transition-all duration-300"
            >
              <Card className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-white/10 backdrop-blur-sm hover:border-cyan-500/30 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 bg-gradient-to-r from-${stat.color}-500/20 to-${stat.color}-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                    >
                      <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                    </div>
                    <span className="text-sm text-gray-400">{stat.label}</span>
                  </div>
                  <div className="space-y-1">
                    <div
                      className={`text-2xl font-bold text-${stat.color}-400`}
                    >
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-500">{stat.subtitle}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Station Status and Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Station Status Distribution */}
          <Card className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-white/10 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="p-6 pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                    <Shield className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-1">
                      Station Status
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Current operational status distribution
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-3">
                  {statusData.map((status, index) => (
                    <div
                      key={status.name}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full group-hover:scale-110 transition-transform duration-300"
                          style={{ backgroundColor: COLORS[index] }}
                        />
                        <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                          {status.name}
                        </span>
                      </div>
                      <Badge className="bg-gray-800/50 text-gray-300 border border-gray-700/50">
                        {status.percentage}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Comparison */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-gray-900/50 to-black/50 border border-white/10 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="p-6 pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-1">
                      Station Performance
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Daily swaps and efficiency comparison
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="name"
                        stroke="#9CA3AF"
                        tick={{ fill: "#9CA3AF", fontSize: 12 }}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        tick={{ fill: "#9CA3AF", fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                      <Bar
                        dataKey="dailySwaps"
                        fill="#3B82F6"
                        name="Daily Swaps"
                      />
                      <Bar
                        dataKey="efficiency"
                        fill="#22C55E"
                        name="Efficiency %"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Station List */}
        <Card className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-white/10 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="p-6 pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <Globe className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-1">
                    Station Details
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Comprehensive view of all battery swap stations
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-gray-300 font-medium p-4 text-sm">
                        Station
                      </th>
                      <th className="text-left text-gray-300 font-medium p-4 text-sm">
                        Status
                      </th>
                      <th className="text-left text-gray-300 font-medium p-4 text-sm">
                        Batteries
                      </th>
                      <th className="text-left text-gray-300 font-medium p-4 text-sm">
                        Daily Swaps
                      </th>
                      <th className="text-left text-gray-300 font-medium p-4 text-sm">
                        Efficiency
                      </th>
                      <th className="text-left text-gray-300 font-medium p-4 text-sm">
                        Revenue
                      </th>
                      <th className="text-left text-gray-300 font-medium p-4 text-sm">
                        Trend
                      </th>
                      <th className="text-left text-gray-300 font-medium p-4 text-sm">
                        Rating
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stationData).map(([id, station]) => (
                      <tr
                        key={id}
                        className="border-b border-white/5 hover:bg-gray-800/30 transition-colors group"
                      >
                        <td className="p-4">
                          <div>
                            <div className="text-white font-medium group-hover:text-cyan-400 transition-colors">
                              {station.name}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {station.location}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            className={`flex items-center gap-2 w-fit ${
                              station.status === "optimal"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : station.status === "good"
                                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                : "bg-red-500/20 text-red-400 border-red-500/30"
                            }`}
                          >
                            {getStatusIcon(station.status)}
                            <span className="capitalize text-xs">
                              {station.status}
                            </span>
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="text-white font-medium">
                            {station.availableBatteries}/
                            {station.totalBatteries}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {Math.round(
                              (station.availableBatteries /
                                station.totalBatteries) *
                                100
                            )}
                            % available
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-white font-medium">
                            {station.dailySwaps}
                          </div>
                          <div className="text-gray-400 text-sm">
                            swaps today
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="text-white font-medium">
                              {station.efficiency}%
                            </div>
                            <div className="w-16 bg-gray-800 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-1000 ease-out"
                                style={{ width: `${station.efficiency}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-white font-medium">
                            ${station.revenue}
                          </div>
                          <div className="text-gray-400 text-sm">today</div>
                        </td>
                        <td className="p-4">
                          <div
                            className={`flex items-center gap-2 ${
                              station.weeklyTrend >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {station.weeklyTrend >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">
                              {Math.abs(station.weeklyTrend)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-white font-medium">
                            {station.customerSatisfaction}/5
                          </div>
                          <div className="flex gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                  i < Math.floor(station.customerSatisfaction)
                                    ? "bg-yellow-400"
                                    : "bg-gray-600"
                                }`}
                              />
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BatteryStationsOverview;
