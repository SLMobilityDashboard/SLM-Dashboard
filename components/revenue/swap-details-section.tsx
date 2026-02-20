"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Clock,
  MapPin,
  CreditCard,
  Battery,
  Search,
  Download,
  DollarSign,
  Package,
  ArrowUpDown,
  TrendingUp,
  Activity,
} from "lucide-react";
import { RevenueFilters as RevenueFiltersType } from "@/components/revenue/revenue-filters";

const generateMockSwapData = (count: number = 200) => {
  const areas = ["Downtown", "Uptown", "Midtown", "Suburbs", "Industrial"];
  const stations = [
    "Station Alpha",
    "Station Beta",
    "Station Gamma",
    "Station Delta",
    "Station Epsilon",
    "Station Zeta",
    "Station Theta",
  ];
  const cabinets = Array.from({ length: 20 }, (_, i) => `CAB-${String(i + 1).padStart(3, "0")}`);
  const segments = ["Premium", "Standard", "Budget"];
  const paymentMethods = ["Credit Card", "Debit Card", "Mobile Pay", "Cash"];

  const swaps = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const hour = Math.floor(Math.random() * 24);
    const peakHours = [7, 8, 9, 17, 18, 19];
    const adjustedHour = Math.random() < 0.6 && peakHours.includes(hour)
      ? hour
      : Math.floor(Math.random() * 24);

    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(adjustedHour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

    const station = stations[Math.floor(Math.random() * stations.length)];
    const cabinet = cabinets[Math.floor(Math.random() * cabinets.length)];
    const batteryBefore = 5 + Math.floor(Math.random() * 30);
    const batteryAfter = 85 + Math.floor(Math.random() * 15);
    const segment = segments[Math.floor(Math.random() * segments.length)];

    const baseRevenue = segment === "Premium" ? 12 : segment === "Standard" ? 8 : 5;
    const revenue = baseRevenue + Math.random() * 4;

    const electricityCost = 1.5 + Math.random() * 1;
    const operationalCost = 0.8 + Math.random() * 0.5;
    const totalCost = electricityCost + operationalCost;
    const profit = revenue - totalCost;

    swaps.push({
      id: `SWP-${String(i + 1).padStart(6, "0")}`,
      timestamp: date,
      area: areas[Math.floor(Math.random() * areas.length)],
      station: station,
      cabinet: cabinet,
      customerSegment: segment,
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      batteryBefore,
      batteryAfter,
      batterySwapped: batteryAfter - batteryBefore,
      revenue: parseFloat(revenue.toFixed(2)),
      electricityCost: parseFloat(electricityCost.toFixed(2)),
      operationalCost: parseFloat(operationalCost.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      duration: Math.floor(Math.random() * 180 + 60),
      customerId: `CUST-${String(Math.floor(Math.random() * 1000)).padStart(4, "0")}`,
    });
  }

  return swaps.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

const ScooterTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 shadow-xl bg-slate-900 p-4 max-w-xs">
        <div className="grid gap-1 text-xs">
          {payload.map(
            (entry: any, index: number) =>
              entry.value !== null && (
                <div key={index} className="flex justify-between gap-4">
                  <span style={{ color: entry.color }}>{entry.name}:</span>
                  <span className="font-medium text-slate-200">
                    {typeof entry.value === "number"
                      ? entry.value.toFixed(2)
                      : entry.value}
                  </span>
                </div>
              )
          )}
        </div>
      </div>
    );
  }
  return null;
};

interface SwapDetailsSectionProps {
  filters: RevenueFiltersType;
}

export function SwapDetailsSection({ filters }: SwapDetailsSectionProps) {
  const [swaps] = useState(generateMockSwapData(200));
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredSwaps = useMemo(() => {
    let filtered = [...swaps];

    if (searchTerm) {
      filtered = filtered.filter(
        (swap) =>
          swap.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          swap.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          swap.station.toLowerCase().includes(searchTerm.toLowerCase()) ||
          swap.cabinet.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.selectedAreas && filters.selectedAreas.length > 0) {
      filtered = filtered.filter((swap) => filters.selectedAreas!.includes(swap.area));
    }

    if (filters.selectedStations && filters.selectedStations.length > 0) {
      filtered = filtered.filter((swap) => filters.selectedStations!.includes(swap.station));
    }

    if (filters.customerSegments && filters.customerSegments.length > 0) {
      filtered = filtered.filter((swap) => filters.customerSegments!.includes(swap.customerSegment));
    }

    if (filters.paymentMethods && filters.paymentMethods.length > 0) {
      filtered = filtered.filter((swap) => filters.paymentMethods!.includes(swap.paymentMethod));
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "timestamp") {
        aVal = a.timestamp.getTime();
        bVal = b.timestamp.getTime();
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [swaps, searchTerm, filters, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredSwaps.length / itemsPerPage);
  const paginatedSwaps = filteredSwaps.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const chartData = useMemo(() => {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      swaps: 0,
      revenue: 0,
    }));

    filteredSwaps.forEach((swap) => {
      const hour = swap.timestamp.getHours();
      hourlyData[hour].swaps += 1;
      hourlyData[hour].revenue += swap.revenue;
    });

    const cabinetUsage = new Map();
    filteredSwaps.forEach((swap) => {
      cabinetUsage.set(swap.cabinet, (cabinetUsage.get(swap.cabinet) || 0) + 1);
    });
    const topCabinets = Array.from(cabinetUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cabinet, count]) => ({ cabinet, count }));

    const stationData = new Map();
    filteredSwaps.forEach((swap) => {
      const existing = stationData.get(swap.station) || { swaps: 0, revenue: 0, profit: 0 };
      stationData.set(swap.station, {
        swaps: existing.swaps + 1,
        revenue: existing.revenue + swap.revenue,
        profit: existing.profit + swap.profit,
      });
    });
    const stationPerformance = Array.from(stationData.entries()).map(([station, data]) => ({
      station: station.replace("Station ", ""),
      ...data,
      avgRevenue: data.revenue / data.swaps,
    }));

    const segmentData = new Map();
    filteredSwaps.forEach((swap) => {
      const existing = segmentData.get(swap.customerSegment) || {
        revenue: 0,
        cost: 0,
        profit: 0,
        count: 0,
      };
      segmentData.set(swap.customerSegment, {
        revenue: existing.revenue + swap.revenue,
        cost: existing.cost + swap.totalCost,
        profit: existing.profit + swap.profit,
        count: existing.count + 1,
      });
    });
    const financialBySegment = Array.from(segmentData.entries()).map(([segment, data]) => ({
      segment,
      revenue: parseFloat(data.revenue.toFixed(2)),
      cost: parseFloat(data.cost.toFixed(2)),
      profit: parseFloat(data.profit.toFixed(2)),
      count: data.count,
    }));

    return { hourlyData, topCabinets, stationPerformance, financialBySegment };
  }, [filteredSwaps]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const COLORS = {
    primary: "#8b5cf6",
    secondary: "#06b6d4",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Battery className="w-7 h-7 text-purple-400" />
            Swap Transaction Analytics
          </h2>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-4">
            <span>{filteredSwaps.length} transactions</span>
            <span>•</span>
            <span>{chartData.topCabinets.length} active cabinets</span>
            <span>•</span>
            <span>{chartData.stationPerformance.length} stations</span>
          </div>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Swap Distribution */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Swap Activity by Hour
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                interval={2}
              />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip content={<ScooterTooltip />} />
              <Area
                type="monotone"
                dataKey="swaps"
                fill="#8b5cf6"
                fillOpacity={0.6}
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Swaps"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Cabinets Usage */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            Most Used Cabinets
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.topCabinets} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis
                dataKey="cabinet"
                type="category"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                width={60}
              />
              <Tooltip content={<ScooterTooltip />} />
              <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Swaps" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Station Performance */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-400" />
            Station Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.stationPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                dataKey="station"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip
                content={<ScooterTooltip />}
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Financial by Segment */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-orange-400" />
            Revenue & Profit by Segment
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.financialBySegment}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="segment" tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip
                content={<ScooterTooltip />}
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Cost" />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Detailed Swap Transactions
          </h3>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by swap ID, customer, station, or cabinet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>
        </div>

        <div className="rounded-md border border-slate-800">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-800/50">
                  <TableHead className="text-slate-300">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 p-0 hover:bg-transparent text-slate-300"
                      onClick={() => handleSort("id")}
                    >
                      Swap ID
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-slate-300">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 p-0 hover:bg-transparent text-slate-300"
                      onClick={() => handleSort("timestamp")}
                    >
                      Date & Time
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-slate-300">Station</TableHead>
                  <TableHead className="text-slate-300">Cabinet</TableHead>
                  <TableHead className="text-slate-300">Segment</TableHead>
                  <TableHead className="text-center text-slate-300">Battery Swap</TableHead>
                  <TableHead className="text-right text-slate-300">Revenue</TableHead>
                  <TableHead className="text-right text-slate-300">Cost</TableHead>
                  <TableHead className="text-right text-slate-300">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 p-0 hover:bg-transparent text-slate-300"
                      onClick={() => handleSort("profit")}
                    >
                      Profit
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-slate-300">Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSwaps.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-8 text-slate-400 border-slate-700"
                    >
                      No swaps found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSwaps.map((swap) => (
                    <TableRow
                      key={swap.id}
                      className="border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <TableCell className="font-mono text-xs font-medium text-blue-400">
                        {swap.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-300">
                            {formatDate(swap.timestamp)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatTime(swap.timestamp)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-300">
                            {swap.station}
                          </span>
                          <span className="text-xs text-slate-500">{swap.area}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs bg-slate-800 text-cyan-400 border-slate-700"
                        >
                          {swap.cabinet}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            swap.customerSegment === "Premium"
                              ? "bg-purple-900/50 text-purple-400 border-purple-800"
                              : swap.customerSegment === "Standard"
                              ? "bg-blue-900/50 text-blue-400 border-blue-800"
                              : "bg-green-900/50 text-green-400 border-green-800"
                          }
                        >
                          {swap.customerSegment}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs text-slate-500">
                            {swap.batteryBefore}%
                          </span>
                          <Battery className="w-3 h-3 text-slate-500" />
                          <span className="text-xs font-medium text-green-400">
                            {swap.batteryAfter}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-purple-400">
                        ${swap.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-orange-400">
                        ${swap.totalCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span
                          className={swap.profit > 0 ? "text-green-400" : "text-red-400"}
                        >
                          ${swap.profit.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <CreditCard className="w-3 h-3" />
                          <span>{swap.paymentMethod}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredSwaps.length)} of{" "}
              {filteredSwaps.length} swaps
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className={`w-9 ${
                        currentPage === pageNum
                          ? "bg-purple-600 text-white hover:bg-purple-700"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="text-center text-slate-500 text-sm py-4 border-t border-slate-800">
        <div className="flex justify-center items-center gap-6 text-xs">
          <span>Total Swaps: {filteredSwaps.length}</span>
          <span>•</span>
          <span>Stations: {chartData.stationPerformance.length}</span>
          <span>•</span>
          <span>Cabinets: {chartData.topCabinets.length}</span>
          <span>•</span>
          <span className="px-2 py-1 rounded bg-purple-900/50 text-purple-400">
            LIVE DATA
          </span>
        </div>
      </div>
    </div>
  );
}