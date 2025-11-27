"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Database,
  Activity,
  Clock,
  BarChart3,
  Users,
  RefreshCw,
  Search,
  TrendingUp,
  Route,
  Bike,
  Box,
  Hash,
  Calendar,
  Signal,
  Navigation,
  Gauge,
  Battery,
  Zap,
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import GPS_Filters from "@/components/gps/gps-filters";

// Filter Types
type GPSFiltersType = {
  tboxId: string;
  bmsId: string;
  batteryType: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  timeRange: string;
  customTimeFrom: string;
  customTimeTo: string;
};

const finalFormatter = (value: number, name: string) => {
  return [`${value}`, name];
};

// Components
const GPSFilters = ({
  onFiltersChange,
}: {
  onFiltersChange: (filters: GPSFiltersType) => void;
}) => {
  const [filters, setFilters] = useState<GPSFiltersType>({
    tboxId: "all",
    bmsId: "all",
    batteryType: "all",
    timeRange: "last_7_days",
    customTimeFrom: "",
    customTimeTo: "",
  });

  const vehicleData = [
    {
      tboxId: "TB001",
      bmsId: "BMS001",
      batteryType: "Lithium-ion",
      status: "active",
    },
    {
      tboxId: "TB002",
      bmsId: "BMS002",
      batteryType: "LiFePO4",
      status: "active",
    },
    {
      tboxId: "TB003",
      bmsId: "BMS003",
      batteryType: "Lithium-ion",
      status: "maintenance",
    },
    { tboxId: "TB004", bmsId: "BMS004", batteryType: "NiMH", status: "active" },
    {
      tboxId: "TB005",
      bmsId: "BMS005",
      batteryType: "LiFePO4",
      status: "active",
    },
    {
      tboxId: "TB006",
      bmsId: "BMS006",
      batteryType: "Lithium-ion",
      status: "active",
    },
    {
      tboxId: "TB007",
      bmsId: "BMS007",
      batteryType: "LiFePO4",
      status: "inactive",
    },
    {
      tboxId: "TB008",
      bmsId: "BMS008",
      batteryType: "Lithium-ion",
      status: "active",
    },
    { tboxId: "TB009", bmsId: "BMS009", batteryType: "NiMH", status: "active" },
    {
      tboxId: "TB010",
      bmsId: "BMS010",
      batteryType: "LiFePO4",
      status: "active",
    },
  ];

  const timeRangeOptions = [
    { value: "last_hour", label: "Last Hour" },
    { value: "last_4_hours", label: "Last 4 Hours" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last_7_days", label: "Last 7 Days" },
    { value: "last_30_days", label: "Last 30 Days" },
    { value: "custom", label: "Custom Range" },
  ];

  const batteryTypes = ["Lithium-ion", "LiFePO4", "NiMH"];

  const handleFilterChange = (key: keyof GPSFiltersType, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* TBox ID Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            <Box className="inline h-3 w-3 mr-1" />
            TBox ID
          </label>
          <select
            className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md text-slate-300 text-sm"
            value={filters.tboxId}
            onChange={(e) => handleFilterChange("tboxId", e.target.value)}
          >
            <option value="all">All TBoxes</option>
            {vehicleData
              .filter((v) => v.status === "active")
              .map((vehicle) => (
                <option key={vehicle.tboxId} value={vehicle.tboxId}>
                  {vehicle.tboxId}
                </option>
              ))}
          </select>
        </div>

        {/* BMS ID Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            <Zap className="inline h-3 w-3 mr-1" />
            BMS ID
          </label>
          <select
            className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md text-slate-300 text-sm"
            value={filters.bmsId}
            onChange={(e) => handleFilterChange("bmsId", e.target.value)}
          >
            <option value="all">All BMS</option>
            {vehicleData
              .filter((v) => v.status === "active")
              .map((vehicle) => (
                <option key={vehicle.bmsId} value={vehicle.bmsId}>
                  {vehicle.bmsId}
                </option>
              ))}
          </select>
        </div>

        {/* Battery Type Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            <Battery className="inline h-3 w-3 mr-1" />
            Battery Type
          </label>
          <select
            className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md text-slate-300 text-sm"
            value={filters.batteryType}
            onChange={(e) => handleFilterChange("batteryType", e.target.value)}
          >
            <option value="all">All Battery Types</option>
            {batteryTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            <Calendar className="inline h-3 w-3 mr-1" />
            Time Range
          </label>
          <select
            className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md text-slate-300 text-sm"
            value={filters.timeRange}
            onChange={(e) => handleFilterChange("timeRange", e.target.value)}
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Custom Date Range */}
      {filters.timeRange === "custom" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md text-slate-300 text-sm"
              value={filters.customTimeFrom}
              onChange={(e) =>
                handleFilterChange("customTimeFrom", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md text-slate-300 text-sm"
              value={filters.customTimeTo}
              onChange={(e) =>
                handleFilterChange("customTimeTo", e.target.value)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

const GPSMetrics = ({
  filters,
  data,
  loading,
}: {
  filters: GPSFiltersType;
  data: any;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-lg p-4 animate-pulse"
          >
            <div className="h-4 bg-slate-700 rounded mb-2"></div>
            <div className="h-8 bg-slate-700 rounded"></div>
          </div>
        ))}
      </>
    );
  }

  const metrics = [
    {
      title: "Total Distance",
      value: `${(data?.summary?.totalDistance / 1000).toFixed(1)}K km`,
      icon: Route,
      color: "text-cyan-400",
      iconColor: "text-cyan-500",
    },
    {
      title: "GPS Points",
      value: `${(data?.summary?.totalGpsPoints / 1000).toFixed(1)}K`,
      icon: MapPin,
      color: "text-green-400",
      iconColor: "text-green-500",
    },
    {
      title: "Heartbeat Messages",
      value: `${(data?.summary?.totalHeartbeats / 1000).toFixed(1)}K`,
      icon: Signal,
      color: "text-purple-400",
      iconColor: "text-purple-500",
    },
    {
      title: "Active TBoxes",
      value: data?.summary?.activeTBoxes || 0,
      icon: Box,
      color: "text-orange-400",
      iconColor: "text-orange-500",
    },
    {
      title: "Active BMS",
      value: data?.summary?.activeTBoxes || 0,
      icon: Zap,
      color: "text-yellow-400",
      iconColor: "text-yellow-500",
    },
  ];

  return (
    <>
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        return (
          <div
            key={index}
            className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-lg p-4 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">{metric.title}</p>
                <p className={`text-xl font-bold ${metric.color}`}>
                  {metric.value}
                </p>
              </div>
              <IconComponent className={`h-6 w-6 ${metric.iconColor}`} />
            </div>
          </div>
        );
      })}
    </>
  );
};

const DistanceChart = ({
  filters,
  data,
  loading,
}: {
  filters: GPSFiltersType;
  data: any;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RechartsLineChart data={data?.distanceOverTime || []}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1F2937",
            border: "1px solid #374151",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="totalDistance"
          stroke="#3B82F6"
          strokeWidth={3}
          name="Distance (km)"
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

const HeartbeatChart = ({
  filters,
  data,
  loading,
}: {
  filters: GPSFiltersType;
  data: any;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RechartsLineChart data={data?.gpsHeartbeatsOverTime || []}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1F2937",
            border: "1px solid #374151",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="heartbeats"
          stroke="#A855F7"
          strokeWidth={3}
          name="Heartbeats"
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

const TopTBoxes = ({
  filters,
  data,
  loading,
}: {
  filters: GPSFiltersType;
  data: any;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-slate-800 rounded animate-pulse"
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left text-slate-400 py-3 px-2">Rank</th>
            <th className="text-left text-slate-400 py-3 px-2">TBox ID</th>
            <th className="text-left text-slate-400 py-3 px-2">Battery Type</th>
            <th className="text-right text-slate-400 py-3 px-2">
              Distance (km)
            </th>
            <th className="text-right text-slate-400 py-3 px-2">Last Active</th>
          </tr>
        </thead>
        <tbody>
          {(data?.topTBoxesByDistance || [])
            .slice(0, 8)
            .map((tbox: any, index: number) => (
              <tr
                key={tbox.tboxId}
                className="border-b border-slate-800 hover:bg-slate-800/30"
              >
                <td className="py-3 px-2">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      index === 0
                        ? "bg-yellow-900/50 text-yellow-300"
                        : index === 1
                        ? "bg-slate-600/50 text-slate-300"
                        : index === 2
                        ? "bg-orange-900/50 text-orange-300"
                        : "bg-slate-700/50 text-slate-400"
                    }`}
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="py-3 px-2 text-cyan-400 font-mono">
                  {tbox.tboxId}
                </td>
                <td className="py-3 px-2 text-slate-300">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      tbox.batteryType === "Lithium-ion"
                        ? "bg-blue-900/50 text-blue-300"
                        : tbox.batteryType === "LiFePO4"
                        ? "bg-green-900/50 text-green-300"
                        : "bg-orange-900/50 text-orange-300"
                    }`}
                  >
                    {tbox.batteryType}
                  </span>
                </td>
                <td className="py-3 px-2 text-right text-slate-300 font-bold">
                  {tbox.totalDistance}
                </td>
                <td className="py-3 px-2 text-right">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      tbox.lastActive < 2
                        ? "bg-green-900/50 text-green-300"
                        : tbox.lastActive < 12
                        ? "bg-yellow-900/50 text-yellow-300"
                        : "bg-red-900/50 text-red-300"
                    }`}
                  >
                    {tbox.lastActive}h ago
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

const BatteryTypeChart = ({
  filters,
  data,
  loading,
}: {
  filters: GPSFiltersType;
  data: any;
  loading: boolean;
}) => {
  const pieColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  if (loading) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data?.batteryTypeDistribution || []}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ batteryType, percent }: any) =>
            `${batteryType} ${(percent * 100).toFixed(0)}%`
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="totalDistance"
        >
          {(data?.batteryTypeDistribution || []).map(
            (entry: any, index: number) => (
              <Cell
                key={`cell-${index}`}
                fill={pieColors[index % pieColors.length]}
              />
            )
          )}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#1F2937",
            border: "1px solid #374151",
          }}
          formatter={finalFormatter}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Custom hook to simulate data fetching
const useGPSData = (filters: GPSFiltersType) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const vehicleData = [
    {
      tboxId: "TB001",
      bmsId: "BMS001",
      batteryType: "Lithium-ion",
      status: "active",
    },
    {
      tboxId: "TB002",
      bmsId: "BMS002",
      batteryType: "LiFePO4",
      status: "active",
    },
    {
      tboxId: "TB003",
      bmsId: "BMS003",
      batteryType: "Lithium-ion",
      status: "maintenance",
    },
    { tboxId: "TB004", bmsId: "BMS004", batteryType: "NiMH", status: "active" },
    {
      tboxId: "TB005",
      bmsId: "BMS005",
      batteryType: "LiFePO4",
      status: "active",
    },
    {
      tboxId: "TB006",
      bmsId: "BMS006",
      batteryType: "Lithium-ion",
      status: "active",
    },
    {
      tboxId: "TB007",
      bmsId: "BMS007",
      batteryType: "LiFePO4",
      status: "inactive",
    },
    {
      tboxId: "TB008",
      bmsId: "BMS008",
      batteryType: "Lithium-ion",
      status: "active",
    },
    { tboxId: "TB009", bmsId: "BMS009", batteryType: "NiMH", status: "active" },
    {
      tboxId: "TB010",
      bmsId: "BMS010",
      batteryType: "LiFePO4",
      status: "active",
    },
  ];

  const batteryTypes = ["Lithium-ion", "LiFePO4", "NiMH"];

  const generateData = () => {
    const filteredVehicles = vehicleData.filter((vehicle) => {
      const tboxMatch =
        filters.tboxId === "all" || vehicle.tboxId === filters.tboxId;
      const bmsMatch =
        filters.bmsId === "all" || vehicle.bmsId === filters.bmsId;
      const batteryMatch =
        filters.batteryType === "all" ||
        vehicle.batteryType === filters.batteryType;
      return (
        tboxMatch && bmsMatch && batteryMatch && vehicle.status === "active"
      );
    });

    const multiplier = filteredVehicles.length / vehicleData.length;

    const distanceOverTime = Array.from({ length: 7 }, (_, i) => ({
      date: `2025-07-${21 + i}`,
      totalDistance: Math.round((487.3 + Math.random() * 120) * multiplier),
    }));

    const gpsHeartbeatsOverTime = Array.from({ length: 7 }, (_, i) => ({
      date: `2025-07-${21 + i}`,
      heartbeats: Math.round((1500 + Math.random() * 400) * multiplier),
    }));

    const topTBoxesByDistance = filteredVehicles
      .slice(0, 10)
      .map((vehicle) => ({
        tboxId: vehicle.tboxId,
        bmsId: vehicle.bmsId,
        batteryType: vehicle.batteryType,
        totalDistance: Math.round(450 + Math.random() * 350),
        gpsPointsCollected: Math.round(2800 + Math.random() * 1200),
        heartbeatMessages: Math.round(1200 + Math.random() * 600),
        lastActive: Math.round(Math.random() * 24),
      }))
      .sort((a, b) => b.totalDistance - a.totalDistance);

    const batteryTypeDistribution = batteryTypes
      .map((type) => {
        const vehiclesWithType = topTBoxesByDistance.filter(
          (v) => v.batteryType === type
        );
        const totalDistance = vehiclesWithType.reduce(
          (sum, v) => sum + v.totalDistance,
          0
        );
        return {
          batteryType: type,
          totalDistance,
          count: vehiclesWithType.length,
        };
      })
      .filter((item) => item.totalDistance > 0);

    return {
      summary: {
        totalDistance: Math.round(3847.5 * multiplier),
        totalGpsPoints: Math.round(24586 * multiplier),
        totalHeartbeats: Math.round(12500 * multiplier),
        activeTBoxes: filteredVehicles.length,
      },
      distanceOverTime,
      gpsHeartbeatsOverTime,
      topTBoxesByDistance,
      batteryTypeDistribution,
    };
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setData(generateData());
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [filters]);

  return { data, loading };
};

// Main Component
export default function GPSAnalyticsDashboard() {
  const [filters, setFilters] = useState<GPSFiltersType>({
    tboxId: "all",
    bmsId: "all",
    batteryType: "all",
    timeRange: "last_7_days",
    customTimeFrom: "",
    customTimeTo: "",
  });

  const handleFiltersChange = (newFilters: GPSFiltersType) => {
    setFilters(newFilters);
  };

  const { data: gpsData, loading } = useGPSData(filters);

  const chartTitle = useMemo(() => {
    return filters.tboxId !== "all"
      ? `Distance Analysis - ${filters.tboxId}`
      : "Fleet Distance Analysis";
  }, [filters.tboxId]);

  const chartDescription = useMemo(() => {
    return filters.tboxId !== "all"
      ? `GPS tracking data for TBox ${filters.tboxId}`
      : "GPS tracking data across all active TBoxes";
  }, [filters.tboxId]);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-100">
            GPS Analytics Dashboard
          </h2>
        </div>

        {/* Filters */}
        <GPSFilters onFiltersChange={handleFiltersChange} />

        {/* KPI Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <GPSMetrics filters={filters} data={gpsData} loading={loading} />
        </div>

        {/* Distance Chart */}
        <div className="grid gap-4">
          <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-lg">
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-cyan-500" />
                Total Distance Travelled Over Time
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Distance trends over the selected period
              </p>
            </div>
            <div className="p-6">
              <DistanceChart
                filters={filters}
                data={gpsData}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* Heartbeat Chart */}
        <div className="grid gap-4">
          <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-lg">
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                <Signal className="mr-2 h-5 w-5 text-purple-500" />
                Total GPS Heartbeats Over Time
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                GPS heartbeat message trends over the selected period
              </p>
            </div>
            <div className="p-6">
              <HeartbeatChart
                filters={filters}
                data={gpsData}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* TBoxes and Battery Distribution */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-lg">
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-cyan-500" />
                Top Performing TBoxes
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                TBoxes generating the highest distance
              </p>
            </div>
            <div className="p-6">
              <TopTBoxes filters={filters} data={gpsData} loading={loading} />
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-lg">
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                <Battery className="mr-2 h-5 w-5 text-green-500" />
                Distance by Battery Type
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Distribution of distance across different battery types
              </p>
            </div>
            <div className="p-6">
              <BatteryTypeChart
                filters={filters}
                data={gpsData}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
