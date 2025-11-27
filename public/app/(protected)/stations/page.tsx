"use client";

import type React from "react";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  MapPin,
  TrendingUp,
  Battery,
  AlertTriangle,
  Search,
  RefreshCw,
  Clock,
  Gauge,
  Building2,
  CheckCircle,
} from "lucide-react";

// Types
interface StationData {
  STATION_ID: string;
  STATION_NAME: string;
  LOCATION: string;
  LATITUDE: number;
  LONGITUDE: number;
  STATUS: string;
  TOTAL_SLOTS: number;
  AVAILABLE_SLOTS: number;
  OCCUPIED_SLOTS: number;
  MAINTENANCE_SLOTS: number;
  TOTAL_SWAPS_TODAY: number;
  TOTAL_SWAPS_MONTHLY: number;
  AVERAGE_SWAP_TIME: number;
  REVENUE_TODAY: number;
  REVENUE_MONTHLY: number;
  LAST_MAINTENANCE?: Date;
  REGION: string;
  OPERATOR: string;
}

interface StationKPIs {
  TOTAL_STATIONS: number;
  ACTIVE_STATIONS: number;
  TOTAL_SLOTS: number;
  AVAILABLE_SLOTS: number;
  UTILIZATION_RATE: number;
  TOTAL_SWAPS_TODAY: number;
  TOTAL_REVENUE_TODAY: number;
  AVERAGE_SWAP_TIME: number;
}

interface FilterState {
  searchTerm: string;
  status: string;
  region: string;
  operator: string;
  utilizationRange: string;
}

// Component: Loading State
const LoadingState = () => (
  <div className="min-h-screen p-6">
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-slate-300">Loading station data...</span>
        </div>
      </div>
    </div>
  </div>
);

// Component: Error State
const ErrorState = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => (
  <div className="min-h-screen p-6">
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-center h-64">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-red-400 font-medium mb-2">
              Error Loading Data
            </h3>
            <p className="text-slate-400 text-sm mb-4">{error}</p>
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

// Component: KPI Cards
const StationKPICards = ({ kpis }: { kpis: StationKPIs }) => {
  const kpiCards = [
    {
      title: "Total Stations",
      value: kpis.TOTAL_STATIONS.toLocaleString(),
      icon: Building2,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Active Stations",
      value: kpis.ACTIVE_STATIONS.toLocaleString(),
      icon: CheckCircle,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
    },
    {
      title: "Total Slots",
      value: kpis.TOTAL_SLOTS.toLocaleString(),
      icon: Battery,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
    },
    {
      title: "Available Slots",
      value: kpis.AVAILABLE_SLOTS.toLocaleString(),
      icon: Zap,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "Utilization Rate",
      value: `${kpis.UTILIZATION_RATE.toFixed(1)}%`,
      icon: Gauge,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    },
    {
      title: "Swaps Today",
      value: kpis.TOTAL_SWAPS_TODAY.toLocaleString(),
      icon: RefreshCw,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
    },
    {
      title: "Revenue Today",
      value: `$${kpis.TOTAL_REVENUE_TODAY.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
    },
    {
      title: "Avg Swap Time",
      value: `${kpis.AVERAGE_SWAP_TIME.toFixed(1)}min`,
      icon: Clock,
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpiCards.map((kpi, index) => (
        <Card
          key={index}
          className={`${kpi.bgColor} ${kpi.borderColor} backdrop-blur-sm hover:scale-105 transition-transform duration-200`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">
                  {kpi.title}
                </p>
                <p className={`text-2xl font-bold ${kpi.color} mt-1`}>
                  {kpi.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Component: Station Table
const StationTable = ({ stations }: { stations: StationData[] }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "text-green-400 bg-green-500/10";
      case "maintenance":
        return "text-yellow-400 bg-yellow-500/10";
      case "offline":
        return "text-red-400 bg-red-500/10";
      case "limited":
        return "text-orange-400 bg-orange-500/10";
      default:
        return "text-slate-400 bg-slate-500/10";
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return "text-red-400";
    if (utilization >= 60) return "text-yellow-400";
    if (utilization >= 40) return "text-green-400";
    return "text-cyan-400";
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-400" />
          Station Network
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Station ID
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Location
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Slots
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Utilization
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Swaps Today
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Revenue
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {stations.map((station) => {
                const utilization =
                  ((station.TOTAL_SLOTS - station.AVAILABLE_SLOTS) /
                    station.TOTAL_SLOTS) *
                  100;

                return (
                  <tr
                    key={station.STATION_ID}
                    className="border-b border-slate-800 hover:bg-slate-800/30"
                  >
                    <td className="py-3 px-4 text-slate-200 font-mono text-sm">
                      {station.STATION_ID}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {station.STATION_NAME}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {station.LOCATION}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          station.STATUS
                        )}`}
                      >
                        {station.STATUS}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">
                            {station.AVAILABLE_SLOTS}
                          </span>
                          <span className="text-slate-500">/</span>
                          <span>{station.TOTAL_SLOTS}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {station.OCCUPIED_SLOTS} occupied
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              utilization >= 80
                                ? "bg-red-500"
                                : utilization >= 60
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${utilization}%` }}
                          />
                        </div>
                        <span
                          className={`text-sm font-medium ${getUtilizationColor(
                            utilization
                          )}`}
                        >
                          {utilization.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {station.TOTAL_SWAPS_TODAY.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      ${station.REVENUE_TODAY.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 bg-transparent"
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Component: Filters
const Filters = ({
  filters,
  setFilters,
  onRefresh,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onRefresh: () => void;
}) => (
  <Card className="bg-slate-900/50 border-slate-700/50">
    <CardContent className="p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search stations..."
            value={filters.searchTerm}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
            }
            className="w-64 bg-slate-800 border-slate-600"
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger className="w-48 bg-slate-800 border-slate-600">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="limited">Limited</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.region}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, region: value }))
          }
        >
          <SelectTrigger className="w-48 bg-slate-800 border-slate-600">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            <SelectItem value="North">North</SelectItem>
            <SelectItem value="South">South</SelectItem>
            <SelectItem value="East">East</SelectItem>
            <SelectItem value="West">West</SelectItem>
            <SelectItem value="Central">Central</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.operator}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, operator: value }))
          }
        >
          <SelectTrigger className="w-48 bg-slate-800 border-slate-600">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Operators</SelectItem>
            <SelectItem value="SL-Mobility">SL-Mobility</SelectItem>
            <SelectItem value="Partner A">Partner A</SelectItem>
            <SelectItem value="Partner B">Partner B</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.utilizationRange}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, utilizationRange: value }))
          }
        >
          <SelectTrigger className="w-48 bg-slate-800 border-slate-600">
            <SelectValue placeholder="Utilization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Utilization</SelectItem>
            <SelectItem value="high">High (80-100%)</SelectItem>
            <SelectItem value="medium">Medium (40-79%)</SelectItem>
            <SelectItem value="low">Low (0-39%)</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </CardContent>
  </Card>
);

const StationsOverviewPage = () => {
  const [stations, setStations] = useState<StationData[]>([]);
  const [stationKPIs, setStationKPIs] = useState<StationKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    status: "all",
    region: "all",
    operator: "all",
    utilizationRange: "all",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock data for now - replace with actual API call
      const mockStations: StationData[] = Array.from({ length: 25 }, (_, i) => {
        const totalSlots = Math.floor(Math.random() * 20) + 10;
        const availableSlots = Math.floor(Math.random() * totalSlots);
        const occupiedSlots =
          totalSlots - availableSlots - Math.floor(Math.random() * 3);
        const maintenanceSlots = totalSlots - availableSlots - occupiedSlots;

        return {
          STATION_ID: `ST-${String(i + 1).padStart(3, "0")}`,
          STATION_NAME: `Station ${String.fromCharCode(65 + (i % 26))}`,
          LOCATION: [
            `Downtown`,
            `Mall Plaza`,
            `Tech Park`,
            `Airport`,
            `University`,
          ][i % 5],
          LATITUDE: 6.9 + Math.random() * 0.1,
          LONGITUDE: 79.8 + Math.random() * 0.2,
          STATUS: ["active", "maintenance", "offline", "limited"][i % 4],
          TOTAL_SLOTS: totalSlots,
          AVAILABLE_SLOTS: availableSlots,
          OCCUPIED_SLOTS: occupiedSlots,
          MAINTENANCE_SLOTS: maintenanceSlots,
          TOTAL_SWAPS_TODAY: Math.floor(Math.random() * 100) + 20,
          TOTAL_SWAPS_MONTHLY: Math.floor(Math.random() * 2000) + 500,
          AVERAGE_SWAP_TIME: Math.random() * 5 + 2,
          REVENUE_TODAY: Math.floor(Math.random() * 5000) + 1000,
          REVENUE_MONTHLY: Math.floor(Math.random() * 100000) + 20000,
          LAST_MAINTENANCE: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ),
          REGION: ["North", "South", "East", "West", "Central"][i % 5],
          OPERATOR: ["SL-Mobility", "Partner A", "Partner B"][i % 3],
        };
      });

      const mockKPIs: StationKPIs = {
        TOTAL_STATIONS: mockStations.length,
        ACTIVE_STATIONS: mockStations.filter((s) => s.STATUS === "active")
          .length,
        TOTAL_SLOTS: mockStations.reduce((sum, s) => sum + s.TOTAL_SLOTS, 0),
        AVAILABLE_SLOTS: mockStations.reduce(
          (sum, s) => sum + s.AVAILABLE_SLOTS,
          0
        ),
        UTILIZATION_RATE:
          mockStations.reduce(
            (sum, s) =>
              sum + ((s.TOTAL_SLOTS - s.AVAILABLE_SLOTS) / s.TOTAL_SLOTS) * 100,
            0
          ) / mockStations.length,
        TOTAL_SWAPS_TODAY: mockStations.reduce(
          (sum, s) => sum + s.TOTAL_SWAPS_TODAY,
          0
        ),
        TOTAL_REVENUE_TODAY: mockStations.reduce(
          (sum, s) => sum + s.REVENUE_TODAY,
          0
        ),
        AVERAGE_SWAP_TIME:
          mockStations.reduce((sum, s) => sum + s.AVERAGE_SWAP_TIME, 0) /
          mockStations.length,
      };

      setStations(mockStations);
      setStationKPIs(mockKPIs);
    } catch (err) {
      setError("Failed to fetch station data");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter stations
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      const matchesSearch =
        station.STATION_ID.toLowerCase().includes(
          filters.searchTerm.toLowerCase()
        ) ||
        station.STATION_NAME.toLowerCase().includes(
          filters.searchTerm.toLowerCase()
        ) ||
        station.LOCATION.toLowerCase().includes(
          filters.searchTerm.toLowerCase()
        );

      const matchesStatus =
        filters.status === "all" || station.STATUS === filters.status;

      const matchesRegion =
        filters.region === "all" || station.REGION === filters.region;

      const matchesOperator =
        filters.operator === "all" || station.OPERATOR === filters.operator;

      const matchesUtilization = (() => {
        if (filters.utilizationRange === "all") return true;
        const utilization =
          ((station.TOTAL_SLOTS - station.AVAILABLE_SLOTS) /
            station.TOTAL_SLOTS) *
          100;
        switch (filters.utilizationRange) {
          case "high":
            return utilization >= 80;
          case "medium":
            return utilization >= 40 && utilization < 80;
          case "low":
            return utilization < 40;
          default:
            return true;
        }
      })();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRegion &&
        matchesOperator &&
        matchesUtilization
      );
    });
  }, [stations, filters]);

  // Paginated stations
  const paginatedStations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStations, currentPage]);

  const totalPages = Math.ceil(filteredStations.length / itemsPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
            <Zap className="h-4 w-4 text-purple-400 mr-2" />
            <span className="text-purple-400 text-sm font-medium">
              Battery Swapping Station Network
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            BSS Overview Dashboard
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Monitor and manage your battery swapping station network with
            real-time availability, utilization, and performance metrics
          </p>
        </div>

        <Filters
          filters={filters}
          setFilters={setFilters}
          onRefresh={fetchData}
        />

        {stationKPIs && <StationKPICards kpis={stationKPIs} />}

        <StationTable stations={paginatedStations} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredStations.length)} of{" "}
              {filteredStations.length} stations
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-slate-300 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StationsOverviewPage;
