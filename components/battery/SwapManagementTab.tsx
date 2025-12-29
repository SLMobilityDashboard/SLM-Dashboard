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
  <div className="h-[300px] w-full bg-slate-800/50 animate-pulse rounded-lg flex items-center justify-center">
    <div className="text-slate-400">Loading chart data...</div>
  </div>
);

const MetricSkeleton = () => (
  <div className="h-24 bg-slate-800/50 animate-pulse rounded-lg" />
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
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
      <div className="text-sm text-slate-400">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
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
              key={pageNum}
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
          <ChevronRight className="w-4 h-4" />
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
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/testquery`,
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
            INNER JOIN SOURCE_DATA.DYNAMO_DB.FACT_PAYMENT p
              ON s.PAYMENT_ID = p.PAYMENT_ID
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
      <div className="grid gap-6">
        <div className="space-y-2">
          <div className="h-8 w-80 bg-slate-800/50 animate-pulse rounded" />
          <div className="h-4 w-96 bg-slate-800/50 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            Error Loading Swap Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-300">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!loading && analytics.swapTransactions.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 border-slate-700">
        <CardContent className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-24 h-24 mx-auto bg-slate-800/50 rounded-full flex items-center justify-center">
              <Battery className="w-12 h-12 text-cyan-400" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-slate-100">
                No Battery Swap Records for This Battery
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                This battery hasn't been used in any swap transactions yet. Once
                swap activity begins, you'll see comprehensive analytics here.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 text-left bg-slate-800/30 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-slate-200 font-medium">
                    Swap Frequency Tracking
                  </div>
                  <div className="text-sm text-slate-400">
                    Monitor how often this battery is swapped
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-slate-200 font-medium">
                    Location History
                  </div>
                  <div className="text-sm text-slate-400">
                    Track which stations this battery has visited
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-slate-200 font-medium">
                    Usage Patterns
                  </div>
                  <div className="text-sm text-slate-400">
                    Analyze swap trends and performance metrics
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <p className="text-sm text-slate-500">
                Battery will appear in swap records once it enters circulation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-100">
            Battery Swap Analytics - Last {analytics.swapTransactions.length}{" "}
            Swaps
          </h2>
          <p className="text-slate-400">
            Comprehensive insights, performance metrics, and transaction history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
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
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Primary Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 border-cyan-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Battery className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-slate-300">Total Swaps</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-cyan-400">
              {analytics.metrics.totalSwaps.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="text-xs text-cyan-300">
                {analytics.metrics.successRate.toFixed(1)}% success rate
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-sm text-slate-300">Total Revenue</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-400">
              {formatCurrency(analytics.metrics.totalRevenue)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="text-xs text-green-300">
                Net:{" "}
                {formatCurrency(
                  analytics.metrics.totalRevenue -
                    analytics.metrics.totalRefunds
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-slate-300">
                  Avg Battery Health
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-2xl font-bold text-red-400">
                  {analytics.metrics.avgBatteryHealthOut.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-400">Out</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {analytics.metrics.avgBatteryHealthIn.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-400">In</div>
              </div>
            </div>
            <div className="text-xs text-purple-300 mt-2">
              {analytics.metrics.healthDegradation > 0 ? "+" : ""}
              {analytics.metrics.healthDegradation.toFixed(1)}% net gain
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border-orange-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-400" />
                <span className="text-sm text-slate-300">Coverage</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-orange-400">
              {analytics.metrics.uniqueStations}
            </div>
            <div className="text-xs text-orange-300 mt-2">
              Stations across {analytics.metrics.uniqueLocations} locations
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400">Avg Swap Cost</span>
            </div>
            <div className="text-xl font-bold text-slate-200">
              {formatCurrency(analytics.metrics.avgSwapCost)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-violet-400" />
              <span className="text-xs text-slate-400">Peak Hour</span>
            </div>
            <div className="text-xl font-bold text-slate-200">
              {analytics.metrics.peakHour}:00
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="w-4 h-4 text-pink-400" />
              <span className="text-xs text-slate-400">Avg Time Between</span>
            </div>
            <div className="text-xl font-bold text-slate-200">
              {analytics.metrics.avgTimeBetweenSwaps.toFixed(1)} days
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Top Payment</span>
            </div>
            <div className="text-xl font-bold text-slate-200 truncate">
              {analytics.metrics.mostUsedPaymentMethod}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Swap Direction Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Activity className="w-5 h-5 text-cyan-400" />
              Swap Direction Distribution
            </CardTitle>
            <CardDescription className="text-slate-400">
              Battery returned (OUT) vs battery received (IN)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Swaps OUT",
                      value: analytics.swapDirectionStats.swapsOut,
                      color: "#ef4444",
                    },
                    {
                      name: "Swaps IN",
                      value: analytics.swapDirectionStats.swapsIn,
                      color: "#10b981",
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[{ color: "#ef4444" }, { color: "#10b981" }].map(
                    (entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    )
                  )}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgb(51, 65, 85)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-red-900/20 rounded-lg border border-red-800/40">
                <div className="text-2xl font-bold text-red-400">
                  {analytics.swapDirectionStats.swapsOut}
                </div>
                <div className="text-xs text-red-300">Battery Returned</div>
              </div>
              <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-800/40">
                <div className="text-2xl font-bold text-green-400">
                  {analytics.swapDirectionStats.swapsIn}
                </div>
                <div className="text-xs text-green-300">Battery Received</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Distribution */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <PieChartIcon className="w-5 h-5 text-purple-400" />
              Payment Method Breakdown
            </CardTitle>
            <CardDescription className="text-slate-400">
              Distribution by payment type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.paymentMethodStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, percentage }) =>
                    `${method}: ${percentage.toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="method"
                >
                  {analytics.paymentMethodStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgb(51, 65, 85)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: any, name: any, props: any) => [
                    `${value} swaps (${formatCurrency(
                      props.payload.totalRevenue
                    )})`,
                    props.payload.method,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {analytics.paymentMethodStats.slice(0, 3).map((method, index) => (
                <div
                  key={method.method}
                  className="flex items-center justify-between p-2 bg-slate-800/40 rounded"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index] }}
                    />
                    <span className="text-sm text-slate-300">
                      {method.method}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-200">
                    {method.count} ({method.percentage.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity & Revenue Chart */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Activity className="w-5 h-5 text-cyan-400" />
            Daily Swap Activity & Revenue Trends
          </CardTitle>
          <CardDescription className="text-slate-400">
            30-day overview of swap frequency and revenue generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={analytics.dailyStats.slice(0, 30).reverse()}>
              <defs>
                <linearGradient
                  id="swapCountGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-slate-700"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis
                yAxisId="count"
                orientation="left"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
              />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgb(51, 65, 85)",
                  borderRadius: "8px",
                }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-slate-900/95 backdrop-blur-sm p-4 shadow-xl border-slate-700">
                        <div className="text-sm font-medium text-slate-200 mb-3">
                          {new Date(label).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <div className="text-slate-400 mb-1">
                              Swap Count
                            </div>
                            <div className="font-bold text-cyan-400">
                              {data.swapCount}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">Revenue</div>
                            <div className="font-bold text-green-400">
                              {formatCurrency(data.revenue)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">
                              Avg Amount
                            </div>
                            <div className="font-bold text-purple-400">
                              {formatCurrency(data.avgAmount)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">
                              Success Rate
                            </div>
                            <div className="font-bold text-blue-400">
                              {(
                                (data.successfulSwaps /
                                  (data.successfulSwaps + data.failedSwaps)) *
                                100
                              ).toFixed(1)}
                              %
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                yAxisId="count"
                type="monotone"
                dataKey="swapCount"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#swapCountGradient)"
                name="Swap Count"
              />
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                fill="#10b981"
                name="Revenue"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Battery Health Trend */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Zap className="w-5 h-5 text-purple-400" />
            Battery Health Trend Analysis
          </CardTitle>
          <CardDescription className="text-slate-400">
            Comparing battery charge levels when returned vs received
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={analytics.batteryHealthTrend}>
              <defs>
                <linearGradient id="outGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="inGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-slate-700"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                domain={[0, 100]}
                label={{
                  value: "Battery %",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#94a3b8", fontSize: 12 },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgb(51, 65, 85)",
                  borderRadius: "8px",
                }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-slate-900/95 backdrop-blur-sm p-4 shadow-xl border-slate-700">
                        <div className="text-sm font-medium text-slate-200 mb-2">
                          {new Date(label).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-red-400">Battery OUT:</span>
                            <span className="font-bold text-slate-200">
                              {data.avgOutPercent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-green-400">Battery IN:</span>
                            <span className="font-bold text-slate-200">
                              {data.avgInPercent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-700">
                            <span className="text-cyan-400">Net Gain:</span>
                            <span className="font-bold text-cyan-400">
                              +{data.difference.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="avgOutPercent"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#outGradient)"
                name="Battery OUT %"
              />
              <Area
                type="monotone"
                dataKey="avgInPercent"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#inGradient)"
                name="Battery IN %"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-red-900/20 rounded-lg border border-red-800/40">
              <div className="text-2xl font-bold text-red-400">
                {analytics.metrics.avgBatteryHealthOut.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400">Avg OUT</div>
            </div>
            <div className="text-center p-3 bg-cyan-900/20 rounded-lg border border-cyan-800/40">
              <div className="text-2xl font-bold text-cyan-400">
                +{analytics.metrics.healthDegradation.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400">Net Gain</div>
            </div>
            <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-800/40">
              <div className="text-2xl font-bold text-green-400">
                {analytics.metrics.avgBatteryHealthIn.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400">Avg IN</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Usage Pattern */}
      <div className="grid grid-cols-2">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Clock className="w-5 h-5 text-blue-400" />
              Hourly Swap Pattern Analysis
            </CardTitle>
            <CardDescription className="text-slate-400">
              Identify peak usage hours and optimize operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analytics.hourlyPattern}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-700"
                />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(value) => `${value}:00`}
                />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgb(51, 65, 85)",
                    borderRadius: "8px",
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-slate-900/95 backdrop-blur-sm p-4 shadow-xl border-slate-700">
                          <div className="text-sm font-medium text-slate-200 mb-2">
                            {data.hour}:00 - {data.hour + 1}:00
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Swaps:</span>
                              <span className="font-bold text-cyan-400">
                                {data.swapCount}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">
                                Avg Amount:
                              </span>
                              <span className="font-bold text-green-400">
                                {formatCurrency(data.avgAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="swapCount"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  name="Swap Count"
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-2 mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/40">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-300">
                Peak activity at{" "}
                <span className="font-bold text-blue-400">
                  {analytics.metrics.peakHour}:00
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top Locations */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <MapPin className="w-5 h-5 text-orange-400" />
              Most Visited Swap Stations
            </CardTitle>
            <CardDescription className="text-slate-400">
              Top performing locations with detailed metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.locationStats.slice(0, 3).map((location, index) => (
                <div
                  key={`${location.locationName}-${location.stationName}`}
                  className="bg-slate-800/40 rounded-lg p-4 hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-slate-200">
                          {location.locationName}
                        </div>
                        <div className="text-sm text-slate-400">
                          {location.stationName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-cyan-400">
                        {location.swapCount} swaps
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatCurrency(location.totalRevenue)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-900/50 p-2 rounded">
                      <div className="text-slate-500 mb-1">Avg Cost</div>
                      <div className="font-medium text-slate-200">
                        {formatCurrency(location.avgAmount)}
                      </div>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded">
                      <div className="text-slate-500 mb-1">Success</div>
                      <div className="font-medium text-green-400">
                        {location.successRate.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded">
                      <div className="text-slate-500 mb-1">OUT %</div>
                      <div className="font-medium text-red-400">
                        {location.avgBatteryOutPercent.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded">
                      <div className="text-slate-500 mb-1">IN %</div>
                      <div className="font-medium text-green-400">
                        {location.avgBatteryInPercent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Details Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Clock className="w-5 h-5 text-blue-400" />
            Swap Transaction History ({analytics.swapTransactions.length} total)
          </CardTitle>
          <CardDescription className="text-slate-400">
            Detailed chronological view of all swap transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/30">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Transaction ID
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Payment Method
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Location
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Date & Time
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Battery OUT %
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Battery IN %
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentPageData.map((transaction) => (
                  <tr
                    key={transaction.PAYMENT_ID}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-200 font-mono text-xs">
                      {transaction.PAYMENT_ID.substring(0, 16)}...
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium">
                      {formatCurrency(transaction.AMOUNT)}
                      {transaction.REFUND_AMOUNT > 0 && (
                        <div className="text-xs text-red-400">
                          -{formatCurrency(transaction.REFUND_AMOUNT)} refund
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-700/40">
                        {transaction.PAYMENT_METHOD}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {transaction.PAYMENT_STATUS === "PAID" ||
                        transaction.PAYMENT_STATUS === "VOIDED" ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-green-400 text-xs font-medium">
                              Success
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-400 text-xs font-medium">
                              {transaction.PAYMENT_STATUS}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-xs">
                      <div>{transaction.LOCATION_NAME}</div>
                      <div className="text-slate-500">
                        {transaction.STATION_NAME}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                      {formatDateTime(transaction.CREATED_EPOCH)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-400">
                          {transaction.OLDBID_BATPERCENT}%
                        </div>
                        {transaction.OLDCABINET_BID === BMSID && (
                          <span className="px-1.5 py-0.5 text-xs bg-red-900/30 text-red-400 rounded border border-red-700/40">
                            OUT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-400">
                          {transaction.NEWBID_BATPERCENT}%
                        </div>
                        {transaction.NEWCABINET_BID === BMSID && (
                          <span className="px-1.5 py-0.5 text-xs bg-green-900/30 text-green-400 rounded border border-green-700/40">
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
      <Card className="bg-gradient-to-r from-slate-900/70 to-slate-800/70 border-slate-700">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-slate-200 mb-2">
              Performance Summary
            </h3>
            <p className="text-sm text-slate-400">
              Comprehensive metrics for battery swap operations
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(
                  analytics.metrics.totalRevenue -
                    analytics.metrics.totalRefunds
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1">Net Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {analytics.metrics.totalSwaps > 0
                  ? (
                      analytics.dailyStats.reduce(
                        (sum, day) => sum + day.swapCount,
                        0
                      ) / analytics.dailyStats.length
                    ).toFixed(1)
                  : "0"}
              </div>
              <div className="text-xs text-slate-400 mt-1">Avg Swaps/Day</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {analytics.metrics.successRate.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400 mt-1">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">
                {analytics.metrics.uniqueStations}
              </div>
              <div className="text-xs text-slate-400 mt-1">Stations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {analytics.metrics.avgTimeBetweenSwaps.toFixed(1)}d
              </div>
              <div className="text-xs text-slate-400 mt-1">Swap Frequency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-400">
                {analytics.metrics.healthDegradation > 0 ? "+" : ""}
                {analytics.metrics.healthDegradation.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400 mt-1">Health Gain</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
