import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Battery,
  MapPin,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Activity,
  Download,
  Clock,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Timer,
  Percent,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import SwapStationMap from "./SwapStationMap";

// -------------------- Interfaces --------------------
interface SwapTransaction {
  MODEL: string;
  STATUS: string;
  CUSTOMER_ID: string;
  PAYMENT_TIME: number;
  LOCATION_NAME: string;
  STATION_NAME: string;
  OLDCABINET_BID: string;
  OLDBID_BATPERCENT: number;
  NEWCABINET_BID: string;
  NEWBID_BATPERCENT: number;
  PAYMENT_ID: string;
  PAYMENT_METHOD: string;
  PAYMENT_STATUS: string;
  PAYMENT_TYPE: string;
  AMOUNT: number;
  CURRENCY: string;
  TRANSACTION_ID: string;
  CREATED_EPOCH: number;
  AMOUNT_PAID: number;
  REFUND_AMOUNT: number;
}

interface DailySwapStats {
  date: string;
  swapCount: number;
  revenue: number;
  avgAmount: number;
  successfulSwaps: number;
  failedSwaps: number;
  avgBatteryOutPercent: number;
  avgBatteryInPercent: number;
}

interface LocationSwapStats {
  locationName: string;
  stationName: string;
  swapCount: number;
  totalRevenue: number;
  avgAmount: number;
  successRate: number;
  avgBatteryOutPercent: number;
  avgBatteryInPercent: number;
}

interface HourlyPattern {
  hour: number;
  swapCount: number;
  avgAmount: number;
}

interface BatteryHealthTrend {
  date: string;
  avgOutPercent: number;
  avgInPercent: number;
  difference: number;
}

interface PaymentMethodStats {
  method: string;
  count: number;
  totalRevenue: number;
  avgAmount: number;
  percentage: number;
}

// -------------------- Skeleton Components --------------------
const ChartSkeleton = () => (
  <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg">
    <div className="text-center space-y-2">
      <RefreshCw className="h-8 w-8 text-slate-600 animate-spin mx-auto" />
      <p className="text-slate-500 text-sm">Loading chart data...</p>
    </div>
  </div>
);

const MetricSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-slate-800 rounded w-3/4 mb-2"></div>
    <div className="h-8 bg-slate-800 rounded w-1/2"></div>
  </div>
);

// -------------------- Helper Functions --------------------
function formatCurrency(amount: number, currency: string = "LKR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(timestamp: number): string {
  const date =
    timestamp > 9999999999 ? new Date(timestamp) : new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(timestamp: number): string {
  const date =
    timestamp > 9999999999 ? new Date(timestamp) : new Date(timestamp * 1000);
  return date.toLocaleString("en-US", {
    year: "2-digit",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const generateCSV = (data: SwapTransaction[]): string => {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);

  const isEpochTimestamp = (key: string, value: any): boolean => {
    const timestampFields = ["CREATED_EPOCH", "PAYMENT_TIME"];
    return (
      timestampFields.includes(key) && typeof value === "number" && value > 0
    );
  };

  const formatEpochToDateTime = (timestamp: number): string => {
    const date =
      timestamp > 9999999999 ? new Date(timestamp) : new Date(timestamp * 1000);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header as keyof SwapTransaction];
          if (value === null || value === undefined) return "";
          if (isEpochTimestamp(header, value)) {
            const formatted = formatEpochToDateTime(value as number);
            return `"${formatted.replace(/"/g, '""')}"`;
          }
          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ];
  return csvRows.join("\n");
};

// -------------------- Data Processing --------------------
function processSwapData(rawData: SwapTransaction[], BMSID: string) {
  try {
    const swapTransactions = rawData.filter(
      (transaction) => transaction.PAYMENT_TYPE === "BATTERY_SWAP"
    );

    if (swapTransactions.length === 0) {
      return {
        dailyStats: [],
        locationStats: [],
        swapTransactions: [],
        hourlyPattern: [],
        batteryHealthTrend: [],
        paymentMethodStats: [],
        swapDirectionStats: { swapsOut: 0, swapsIn: 0 },
        metrics: {
          totalSwaps: 0,
          totalRevenue: 0,
          avgSwapCost: 0,
          successRate: 0,
          uniqueLocations: 0,
          uniqueStations: 0,
          totalRefunds: 0,
          avgBatteryHealthOut: 0,
          avgBatteryHealthIn: 0,
          healthDegradation: 0,
          peakHour: 0,
          mostUsedPaymentMethod: "",
          avgTimeBetweenSwaps: 0,
        },
      };
    }

    // Process daily statistics with battery health
    const dailyData: Record<string, DailySwapStats> = {};
    swapTransactions.forEach((transaction) => {
      const timestamp = transaction.CREATED_EPOCH;
      const date = new Date(
        timestamp > 9999999999 ? timestamp : timestamp * 1000
      )
        .toISOString()
        .split("T")[0];

      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          swapCount: 0,
          revenue: 0,
          avgAmount: 0,
          successfulSwaps: 0,
          failedSwaps: 0,
          avgBatteryOutPercent: 0,
          avgBatteryInPercent: 0,
        };
      }

      dailyData[date].swapCount += 1;
      dailyData[date].revenue += transaction.AMOUNT || 0;
      dailyData[date].avgBatteryOutPercent +=
        transaction.OLDBID_BATPERCENT || 0;
      dailyData[date].avgBatteryInPercent += transaction.NEWBID_BATPERCENT || 0;

      if (
        transaction.PAYMENT_STATUS === "PAID" ||
        transaction.PAYMENT_STATUS === "VOIDED"
      ) {
        dailyData[date].successfulSwaps += 1;
      } else {
        dailyData[date].failedSwaps += 1;
      }
    });

    Object.values(dailyData).forEach((day) => {
      day.avgAmount = day.swapCount > 0 ? day.revenue / day.swapCount : 0;
      day.avgBatteryOutPercent =
        day.swapCount > 0 ? day.avgBatteryOutPercent / day.swapCount : 0;
      day.avgBatteryInPercent =
        day.swapCount > 0 ? day.avgBatteryInPercent / day.swapCount : 0;
    });

    const dailyStats = Object.values(dailyData)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .reverse();

    // Process hourly patterns
    const hourlyData: Record<number, { count: number; totalAmount: number }> =
      {};
    swapTransactions.forEach((transaction) => {
      const hour = new Date(
        transaction.CREATED_EPOCH > 9999999999
          ? transaction.CREATED_EPOCH
          : transaction.CREATED_EPOCH * 1000
      ).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { count: 0, totalAmount: 0 };
      }
      hourlyData[hour].count += 1;
      hourlyData[hour].totalAmount += transaction.AMOUNT || 0;
    });

    const hourlyPattern: HourlyPattern[] = Array.from(
      { length: 24 },
      (_, i) => ({
        hour: i,
        swapCount: hourlyData[i]?.count || 0,
        avgAmount: hourlyData[i]
          ? hourlyData[i].totalAmount / hourlyData[i].count
          : 0,
      })
    );

    // Battery health trend over time
    const batteryHealthTrend: BatteryHealthTrend[] = dailyStats
      .slice(0, 30)
      .reverse()
      .map((day) => ({
        date: day.date,
        avgOutPercent: day.avgBatteryOutPercent,
        avgInPercent: day.avgBatteryInPercent,
        difference: day.avgBatteryInPercent - day.avgBatteryOutPercent,
      }));

    // Payment method statistics
    const paymentMethodData: Record<
      string,
      { count: number; totalRevenue: number }
    > = {};
    swapTransactions.forEach((transaction) => {
      const method = transaction.PAYMENT_METHOD || "Unknown";
      if (!paymentMethodData[method]) {
        paymentMethodData[method] = { count: 0, totalRevenue: 0 };
      }
      paymentMethodData[method].count += 1;
      paymentMethodData[method].totalRevenue += transaction.AMOUNT || 0;
    });

    const totalSwaps = swapTransactions.length;
    const paymentMethodStats: PaymentMethodStats[] = Object.entries(
      paymentMethodData
    )
      .map(([method, data]) => ({
        method,
        count: data.count,
        totalRevenue: data.totalRevenue,
        avgAmount: data.totalRevenue / data.count,
        percentage: (data.count / totalSwaps) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Swap direction statistics
    const swapsOut = swapTransactions.filter(
      (t) => t.OLDCABINET_BID === BMSID
    ).length;
    const swapsIn = swapTransactions.filter(
      (t) => t.NEWCABINET_BID === BMSID
    ).length;

    // Process location statistics with enhanced metrics
    const locationData: Record<string, any> = {};
    swapTransactions.forEach((transaction) => {
      const key = `${transaction.LOCATION_NAME}-${transaction.STATION_NAME}`;
      if (!locationData[key]) {
        locationData[key] = {
          locationName: transaction.LOCATION_NAME || "Unknown Location",
          stationName: transaction.STATION_NAME || "Unknown Station",
          swapCount: 0,
          totalRevenue: 0,
          avgAmount: 0,
          successRate: 0,
          avgBatteryOutPercent: 0,
          avgBatteryInPercent: 0,
        };
      }

      locationData[key].swapCount += 1;
      locationData[key].totalRevenue += transaction.AMOUNT || 0;
      locationData[key].avgBatteryOutPercent +=
        transaction.OLDBID_BATPERCENT || 0;
      locationData[key].avgBatteryInPercent +=
        transaction.NEWBID_BATPERCENT || 0;
    });

    Object.values(locationData).forEach((stat: any) => {
      stat.avgAmount =
        stat.swapCount > 0 ? stat.totalRevenue / stat.swapCount : 0;
      stat.avgBatteryOutPercent =
        stat.swapCount > 0 ? stat.avgBatteryOutPercent / stat.swapCount : 0;
      stat.avgBatteryInPercent =
        stat.swapCount > 0 ? stat.avgBatteryInPercent / stat.swapCount : 0;

      const locationTransactions = swapTransactions.filter(
        (t) =>
          t.LOCATION_NAME === stat.locationName &&
          t.STATION_NAME === stat.stationName
      );
      const successfulSwaps = locationTransactions.filter(
        (t) => t.PAYMENT_STATUS === "PAID" || t.PAYMENT_STATUS === "VOIDED"
      ).length;
      stat.successRate =
        locationTransactions.length > 0
          ? (successfulSwaps / locationTransactions.length) * 100
          : 0;
    });

    const locationStats = Object.values(locationData)
      .sort((a: any, b: any) => b.swapCount - a.swapCount)
      .slice(0, 10);

    // Calculate enhanced metrics
    const totalRevenue = swapTransactions.reduce(
      (sum, t) => sum + (t.AMOUNT_PAID || t.AMOUNT || 0),
      0
    );
    const totalRefunds = swapTransactions.reduce(
      (sum, t) => sum + (t.REFUND_AMOUNT || 0),
      0
    );
    const successfulSwaps = swapTransactions.filter(
      (t) => t.PAYMENT_STATUS === "PAID" || t.PAYMENT_STATUS === "VOIDED"
    ).length;
    const successRate =
      totalSwaps > 0 ? (successfulSwaps / totalSwaps) * 100 : 0;
    const avgSwapCost = totalSwaps > 0 ? totalRevenue / totalSwaps : 0;
    const uniqueLocations = new Set(
      swapTransactions.map((t) => `${t.LOCATION_NAME}-${t.STATION_NAME}`)
    ).size;
    const uniqueStations = new Set(swapTransactions.map((t) => t.STATION_NAME))
      .size;

    // Battery health metrics
    const avgBatteryHealthOut =
      swapTransactions.reduce((sum, t) => sum + (t.OLDBID_BATPERCENT || 0), 0) /
      totalSwaps;
    const avgBatteryHealthIn =
      swapTransactions.reduce((sum, t) => sum + (t.NEWBID_BATPERCENT || 0), 0) /
      totalSwaps;
    const healthDegradation = avgBatteryHealthIn - avgBatteryHealthOut;

    // Peak hour
    const peakHour = hourlyPattern.reduce((max, curr) =>
      curr.swapCount > max.swapCount ? curr : max
    ).hour;

    // Most used payment method
    const mostUsedPaymentMethod = paymentMethodStats[0]?.method || "N/A";

    // Average time between swaps
    const sortedTransactions = [...swapTransactions].sort(
      (a, b) => a.CREATED_EPOCH - b.CREATED_EPOCH
    );
    let totalTimeDiff = 0;
    for (let i = 1; i < sortedTransactions.length; i++) {
      totalTimeDiff +=
        sortedTransactions[i].CREATED_EPOCH -
        sortedTransactions[i - 1].CREATED_EPOCH;
    }
    const avgTimeBetweenSwaps =
      sortedTransactions.length > 1
        ? totalTimeDiff /
          (sortedTransactions.length - 1) /
          (1000 * 60 * 60 * 24) // Convert to days
        : 0;

    return {
      dailyStats,
      locationStats,
      swapTransactions,
      hourlyPattern,
      batteryHealthTrend,
      paymentMethodStats,
      swapDirectionStats: { swapsOut, swapsIn },
      metrics: {
        totalSwaps,
        totalRevenue,
        avgSwapCost,
        successRate,
        uniqueLocations,
        uniqueStations,
        totalRefunds,
        avgBatteryHealthOut,
        avgBatteryHealthIn,
        healthDegradation,
        peakHour,
        mostUsedPaymentMethod,
        avgTimeBetweenSwaps,
      },
    };
  } catch (error) {
    console.error("Error processing swap data:", error);
    return {
      dailyStats: [],
      locationStats: [],
      swapTransactions: [],
      hourlyPattern: [],
      batteryHealthTrend: [],
      paymentMethodStats: [],
      swapDirectionStats: { swapsOut: 0, swapsIn: 0 },
      metrics: {
        totalSwaps: 0,
        totalRevenue: 0,
        avgSwapCost: 0,
        successRate: 0,
        uniqueLocations: 0,
        uniqueStations: 0,
        totalRefunds: 0,
        avgBatteryHealthOut: 0,
        avgBatteryHealthIn: 0,
        healthDegradation: 0,
        peakHour: 0,
        mostUsedPaymentMethod: "",
        avgTimeBetweenSwaps: 0,
      },
    };
  }
}

// -------------------- Pagination Component --------------------
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-t border-slate-800">
      <div className="text-sm text-slate-400">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
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
            <button
              key={i}
              onClick={() => onPageChange(pageNum)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentPage === pageNum
                  ? "bg-cyan-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

// -------------------- Main Component --------------------
export default function SwapManagementTab({ BMSID }: { BMSID: string }) {
  const [rawData, setRawData] = useState<SwapTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const rowsPerPage = 20;

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sql: `
              SELECT
                s.MODEL,
                s.STATUS,
                s.CUSTOMER_ID,
                s.PAYMENT_TIME,
                s.LOCATION_NAME,
                s.STATION_NAME,
                s.OLDCABINET_BID,
                s.OLDBID_BATPERCENT,
                s.NEWCABINET_BID,
                s.NEWBID_BATPERCENT,
                p.PAYMENT_ID,
                p.PAYMENT_METHOD,
                p.PAYMENT_STATUS,
                p.PAYMENT_TYPE,
                p.AMOUNT,
                p.CURRENCY,
                p.TRANSACTION_ID,
                p.CREATED_EPOCH,
                p.AMOUNT_PAID,
                p.REFUND_AMOUNT
              FROM DB_DUMP.PUBLIC.SWAP_OVERALL s
              INNER JOIN SOURCE_DATA.DYNAMO_DB.FACT_PAYMENT p ON s.PAYMENT_ID = p.PAYMENT_ID
              WHERE (s.OLDCABINET_BID = '${BMSID}' OR s.NEWCABINET_BID = '${BMSID}')
                AND p.PAYMENT_TYPE = 'BATTERY_SWAP'
              ORDER BY p.CREATED_EPOCH DESC
              LIMIT 1000;
            `,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `API request failed with status ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid data format: expected an array of swap transactions"
        );
      }

      setRawData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while fetching data";
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [BMSID]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const analytics = useMemo(() => {
    return processSwapData(rawData, BMSID);
  }, [rawData, BMSID]);

  const totalPages = Math.ceil(analytics.swapTransactions.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPageData = useMemo(
    () =>
      analytics.swapTransactions
        .sort((a, b) => b.CREATED_EPOCH - a.CREATED_EPOCH)
        .slice(startIndex, endIndex),
    [analytics.swapTransactions, startIndex, endIndex]
  );

  const handleRefresh = useCallback(() => {
    if (!refreshing) {
      fetchData();
    }
  }, [refreshing, fetchData]);

  // Color palette for charts
  const COLORS = {
    primary: "#06b6d4",
    secondary: "#10b981",
    tertiary: "#8b5cf6",
    quaternary: "#f59e0b",
    danger: "#ef4444",
    warning: "#f97316",
  };

  const PIE_COLORS = [
    "#06b6d4",
    "#10b981",
    "#8b5cf6",
    "#f59e0b",
    "#ec4899",
    "#3b82f6",
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6">
                <MetricSkeleton />
              </CardContent>
            </Card>
          ))}
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-900 border-slate-800 m-6">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-200">
              Error Loading Swap Data
            </h3>
            <p className="text-slate-400">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!loading && analytics.swapTransactions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <Battery className="h-16 w-16 text-slate-600 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">
                  No Battery Swap Records for This Battery
                </h3>
                <p className="text-slate-400">
                  This battery hasn't been used in any swap transactions yet.
                  Once swap activity begins, you'll see comprehensive analytics
                  here.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="p-4 bg-slate-800 rounded-lg">
                  <Activity className="h-8 w-8 text-cyan-500 mb-2" />
                  <h4 className="text-sm font-semibold text-slate-200 mb-1">
                    Swap Frequency Tracking
                  </h4>
                  <p className="text-xs text-slate-400">
                    Monitor how often this battery is swapped
                  </p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg">
                  <MapPin className="h-8 w-8 text-emerald-500 mb-2" />
                  <h4 className="text-sm font-semibold text-slate-200 mb-1">
                    Location History
                  </h4>
                  <p className="text-xs text-slate-400">
                    Track which stations this battery has visited
                  </p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-purple-500 mb-2" />
                  <h4 className="text-sm font-semibold text-slate-200 mb-1">
                    Usage Patterns
                  </h4>
                  <p className="text-xs text-slate-400">
                    Analyze swap trends and performance metrics
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-500 mt-6">
                Battery will appear in swap records once it enters circulation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-200">
            Battery Swap Analytics - Last {analytics.swapTransactions.length}{" "}
            Swaps
          </h2>
          <p className="text-slate-400 mt-1">
            Comprehensive insights, performance metrics, and transaction history
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            onClick={() => {
              const csvContent = generateCSV(analytics.swapTransactions);
              if (!csvContent) return;
              const blob = new Blob([csvContent], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `battery_swap_history_${BMSID}_${
                new Date().toISOString().split("T")[0]
              }.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Primary Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Swaps</p>
                <p className="text-3xl font-bold text-slate-200 mt-1">
                  {analytics.metrics.totalSwaps.toLocaleString()}
                </p>
                <p className="text-xs text-emerald-400 mt-1">
                  {analytics.metrics.successRate.toFixed(1)}% success rate
                </p>
              </div>
              <div className="p-3 bg-cyan-600 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold text-slate-200 mt-1">
                  {formatCurrency(analytics.metrics.totalRevenue)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Net:{" "}
                  {formatCurrency(
                    analytics.metrics.totalRevenue -
                      analytics.metrics.totalRefunds
                  )}
                </p>
              </div>
              <div className="p-3 bg-emerald-600 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-slate-400 text-sm mb-2">
                  Avg Battery Health
                </p>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-orange-400">
                      {analytics.metrics.avgBatteryHealthOut.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">Out</p>
                  </div>
                  {/* <TrendingUp className="h-5 w-5 text-emerald-400" /> */}
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">
                      {analytics.metrics.avgBatteryHealthIn.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">In</p>
                  </div>
                </div>
                <p className="text-xs text-cyan-400 mt-1">
                  {analytics.metrics.healthDegradation > 0 ? "+" : ""}
                  {analytics.metrics.healthDegradation.toFixed(1)}% net gain
                </p>
              </div>
              <div className="p-3 bg-purple-600 rounded-lg">
                <Battery className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">Coverage</p>
                <p className="text-3xl font-bold text-slate-200 mt-1">
                  {analytics.metrics.uniqueStations}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Stations across {analytics.metrics.uniqueLocations} locations
                </p>
              </div>
              <div className="p-3 bg-amber-600 rounded-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-slate-400 text-xs">Avg Swap Cost</p>
            <p className="text-xl font-bold text-slate-200 mt-1">
              {formatCurrency(analytics.metrics.avgSwapCost)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-slate-400 text-xs">Peak Hour</p>
            <p className="text-xl font-bold text-slate-200 mt-1">
              {analytics.metrics.peakHour}:00
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-slate-400 text-xs">Avg Time Between</p>
            <p className="text-xl font-bold text-slate-200 mt-1">
              {analytics.metrics.avgTimeBetweenSwaps.toFixed(1)} days
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-slate-400 text-xs">Top Payment</p>
            <p className="text-xl font-bold text-slate-200 mt-1">
              {analytics.metrics.mostUsedPaymentMethod}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity & Revenue Chart */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-500" />
            Daily Swap Activity & Revenue Trends
          </CardTitle>
          <CardDescription className="text-slate-400">
            30-day overview of swap frequency and revenue generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={analytics.dailyStats.slice(0, 30).reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis yAxisId="left" stroke="#94a3b8" />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#94a3b8"
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#e2e8f0" }}
                itemStyle={{ color: "#94a3b8" }}
                formatter={(value, name) => {
                  if (name === "Swap Count") return [value, name];
                  return [formatCurrency(Number(value)), name];
                }}
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })
                }
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
                        <p className="text-slate-200 font-semibold mb-2">
                          {new Date(label).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Swap Count</span>
                            <span className="text-cyan-400 font-semibold">
                              {data.swapCount}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Revenue</span>
                            <span className="text-emerald-400 font-semibold">
                              {formatCurrency(data.revenue)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Avg Amount</span>
                            <span className="text-slate-200">
                              {formatCurrency(data.avgAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Success Rate</span>
                            <span className="text-slate-200">
                              {(
                                (data.successfulSwaps /
                                  (data.successfulSwaps + data.failedSwaps)) *
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ color: "#94a3b8" }} iconType="circle" />
              <Bar
                yAxisId="left"
                dataKey="swapCount"
                name="Swap Count"
                fill={COLORS.primary}
                radius={[8, 8, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={COLORS.secondary}
                strokeWidth={3}
                dot={{ fill: COLORS.secondary, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Battery Health Trend */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <Battery className="h-5 w-5 text-cyan-500" />
            Battery Health Trend Analysis
          </CardTitle>
          <CardDescription className="text-slate-400">
            Comparing battery charge levels when returned vs received
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.batteryHealthTrend}>
              <defs>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#e2e8f0" }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
                        <p className="text-slate-200 font-semibold mb-2">
                          {new Date(label).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="text-orange-400">
                            Battery OUT: {data.avgOutPercent.toFixed(1)}%
                          </div>
                          <div className="text-emerald-400">
                            Battery IN: {data.avgInPercent.toFixed(1)}%
                          </div>
                          <div className="text-cyan-400 font-semibold">
                            Net Gain: +{data.difference.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ color: "#94a3b8" }} />
              <Area
                type="monotone"
                dataKey="avgOutPercent"
                name="Battery OUT %"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#colorOut)"
              />
              <Area
                type="monotone"
                dataKey="avgInPercent"
                name="Battery IN %"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorIn)"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-800">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-400">
                {analytics.metrics.avgBatteryHealthOut.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Avg OUT</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-400">
                +{analytics.metrics.healthDegradation.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Net Gain</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {analytics.metrics.avgBatteryHealthIn.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Avg IN</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replace Hourly Usage Pattern with Map Component */}
      <SwapStationMap
        swapTransactions={analytics.swapTransactions}
        BMSID={BMSID}
      />

      {/* Transaction Details Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-500" />
            Swap Transaction History ({analytics.swapTransactions.length} total)
          </CardTitle>
          <CardDescription className="text-slate-400">
            Detailed chronological view of all swap transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Battery OUT %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Battery IN %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {currentPageData.map((transaction) => (
                  <tr
                    key={transaction.PAYMENT_ID}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {transaction.PAYMENT_ID.substring(0, 16)}...
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="text-slate-200 font-semibold">
                          {formatCurrency(transaction.AMOUNT)}
                        </p>
                        {transaction.REFUND_AMOUNT > 0 && (
                          <p className="text-xs text-red-400">
                            -{formatCurrency(transaction.REFUND_AMOUNT)} refund
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {transaction.PAYMENT_METHOD}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {transaction.PAYMENT_STATUS === "PAID" ||
                      transaction.PAYMENT_STATUS === "VOIDED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded-full text-xs font-medium">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/30 text-red-400 rounded-full text-xs font-medium">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          {transaction.PAYMENT_STATUS}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="text-slate-200">
                          {transaction.LOCATION_NAME}
                        </p>
                        <p className="text-xs text-slate-400">
                          {transaction.STATION_NAME}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {formatDateTime(transaction.CREATED_EPOCH)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-orange-400 font-semibold">
                          {transaction.OLDBID_BATPERCENT}%
                        </span>
                        {transaction.OLDCABINET_BID === BMSID && (
                          <span className="px-2 py-0.5 bg-orange-900/30 text-orange-400 rounded text-xs">
                            OUT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-semibold">
                          {transaction.NEWBID_BATPERCENT}%
                        </span>
                        {transaction.NEWCABINET_BID === BMSID && (
                          <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-400 rounded text-xs">
                            IN
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      {/* Enhanced Summary Footer */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-500" />
            Performance Summary
          </CardTitle>
          <CardDescription className="text-slate-400">
            Comprehensive metrics for battery swap operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold text-emerald-400">
                {formatCurrency(
                  analytics.metrics.totalRevenue -
                    analytics.metrics.totalRefunds
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">Net Revenue</p>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold text-cyan-400">
                {analytics.metrics.totalSwaps > 0
                  ? (
                      analytics.dailyStats.reduce(
                        (sum, day) => sum + day.swapCount,
                        0
                      ) / analytics.dailyStats.length
                    ).toFixed(1)
                  : "0"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Avg Swaps/Day</p>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold text-emerald-400">
                {analytics.metrics.successRate.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Success Rate</p>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold text-purple-400">
                {analytics.metrics.uniqueStations}
              </p>
              <p className="text-xs text-slate-400 mt-1">Stations</p>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold text-amber-400">
                {analytics.metrics.avgTimeBetweenSwaps.toFixed(1)}d
              </p>
              <p className="text-xs text-slate-400 mt-1">Swap Frequency</p>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold text-cyan-400">
                {analytics.metrics.healthDegradation > 0 ? "+" : ""}
                {analytics.metrics.healthDegradation.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Health Gain</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
