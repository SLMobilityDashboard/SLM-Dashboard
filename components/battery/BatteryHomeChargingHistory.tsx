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
  Home,
  TrendingUp,
  DollarSign,
  Zap,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Calendar,
  Activity,
  Download,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts";

// -------------------- Interfaces --------------------
interface HomeChargingTransaction {
  PAYMENT_ID: string;
  PAYMENT_METHOD_ID: string | null;
  CUSTOMER_ID: string;
  RATING_ID: string;
  PAYMENT_METHOD: string;
  PAYMENT_STATUS: string;
  AMOUNT: number;
  CURRENCY: string;
  TRANSACTION_ID: string;
  LOCATION_NAME: string;
  STATION_NAME: string;
  PAID_AT: number | null;
  CREATED_AT: number;
  AMOUNT_PAID: number | null;
  CHARGE_AMOUNT: number;
  CHARGE_PERCENTAGE: number;
  REFUND_AMOUNT: number;
  PAYMENT_TRIES: number | null;
  PREVIOUS_WALLET_BAL: number | null;
  WALLET_BALANCE: number | null;
  WALLET_CODE: string | null;
  PAYMENT_METHOD_TYPE: string | null;
  PAYMENT_TYPE: string;
  CREATED_EPOCH: number;
  BMSID: string;
  MODEL: string;
  CABINET_ID: string;
}

interface DailyChargingData {
  date: string;
  cost: number;
  chargingCount: number;
  avgCost: number;
  successfulCharges: number;
  failedCharges: number;
  estimatedKwh: number;
  avgChargingDuration: number;
  avgChargePercentage: number;
  timeOfDay: string[];
  dayOfWeek: string;
}

interface TimeOfDayData {
  hour: number;
  charges: number;
  cost: number;
  period: "Night" | "Morning" | "Afternoon" | "Evening";
}

interface WeeklyPattern {
  day: string;
  charges: number;
  cost: number;
  avgCost: number;
}

// -------------------- Skeleton Components --------------------
const ChartSkeleton = () => (
  <div className="h-[300px] w-full bg-slate-800/50 animate-pulse rounded-lg flex items-center justify-center">
    <div className="text-slate-400">Loading charging data...</div>
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

function getTimeOfDay(hour: number): string {
  if (hour >= 6 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 22) return "Evening";
  return "Night";
}

function getTimeIcon(period: string) {
  switch (period) {
    case "Morning":
      return <Sunrise className="w-4 h-4" />;
    case "Afternoon":
      return <Sun className="w-4 h-4" />;
    case "Evening":
      return <Sunset className="w-4 h-4" />;
    case "Night":
      return <Moon className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function estimateChargingTime(amount: number): number {
  const estimatedKwh = amount / 10;
  const chargingTimeHours = estimatedKwh / 7;
  return Math.round(chargingTimeHours * 60);
}

function estimateEnergyDelivered(amount: number): number {
  return amount / 10;
}

// -------------------- Data Processing --------------------
function processHomeChargingData(rawData: HomeChargingTransaction[]) {
  try {
    if (rawData.length === 0) {
      return {
        dailyData: [],
        timeOfDayData: [],
        weeklyPattern: [],
        chargingTransactions: [],
        metrics: {
          totalCost: 0,
          totalCharges: 0,
          totalRefunds: 0,
          successRate: 0,
          avgChargeCost: 0,
          totalEnergyEstimated: 0,
          avgChargingTime: 0,
          costSavings: 0,
          avgChargePercentage: 0,
          peakChargingHour: 20,
          preferredPaymentMethod: "WALLET",
          avgDailyCost: 0,
          avgWeeklyCost: 0,
          avgMonthlyCost: 0,
          chargingFrequency: 0,
        },
      };
    }

    const dailyData: Record<string, DailyChargingData> = {};
    const timeOfDayCount: Record<number, { charges: number; cost: number }> = {};
    const weeklyCount: Record<string, { charges: number; cost: number }> = {};

    rawData.forEach((payment) => {
      const timestamp = payment.CREATED_EPOCH;
      const date = new Date(timestamp).toISOString().split("T")[0];
      const hour = new Date(timestamp).getHours();
      const dayOfWeek = new Date(timestamp).toLocaleDateString("en-US", {
        weekday: "long",
      });

      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          cost: 0,
          chargingCount: 0,
          avgCost: 0,
          successfulCharges: 0,
          failedCharges: 0,
          estimatedKwh: 0,
          avgChargingDuration: 0,
          avgChargePercentage: 0,
          timeOfDay: [],
          dayOfWeek,
        };
      }

      dailyData[date].chargingCount += 1;
      dailyData[date].cost += payment.CHARGE_AMOUNT || payment.AMOUNT || 0;
      dailyData[date].estimatedKwh += estimateEnergyDelivered(
        payment.CHARGE_AMOUNT || payment.AMOUNT || 0
      );
      dailyData[date].avgChargingDuration += estimateChargingTime(
        payment.CHARGE_AMOUNT || payment.AMOUNT || 0
      );
      dailyData[date].avgChargePercentage += payment.CHARGE_PERCENTAGE || 0;
      dailyData[date].timeOfDay.push(getTimeOfDay(hour));

      if (
        payment.PAYMENT_STATUS === "SUCCESS" ||
        payment.PAYMENT_STATUS === "PAID"
      ) {
        dailyData[date].successfulCharges += 1;
      } else {
        dailyData[date].failedCharges += 1;
      }

      if (!timeOfDayCount[hour]) {
        timeOfDayCount[hour] = { charges: 0, cost: 0 };
      }
      timeOfDayCount[hour].charges += 1;
      timeOfDayCount[hour].cost += payment.CHARGE_AMOUNT || payment.AMOUNT || 0;

      if (!weeklyCount[dayOfWeek]) {
        weeklyCount[dayOfWeek] = { charges: 0, cost: 0 };
      }
      weeklyCount[dayOfWeek].charges += 1;
      weeklyCount[dayOfWeek].cost +=
        payment.CHARGE_AMOUNT || payment.AMOUNT || 0;
    });

    Object.values(dailyData).forEach((day) => {
      day.avgCost = day.chargingCount > 0 ? day.cost / day.chargingCount : 0;
      day.avgChargingDuration =
        day.chargingCount > 0 ? day.avgChargingDuration / day.chargingCount : 0;
      day.avgChargePercentage =
        day.chargingCount > 0 ? day.avgChargePercentage / day.chargingCount : 0;
    });

    const processedDailyData = Object.values(dailyData).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const timeOfDayData: TimeOfDayData[] = Array.from(
      { length: 24 },
      (_, hour) => ({
        hour,
        charges: timeOfDayCount[hour]?.charges || 0,
        cost: timeOfDayCount[hour]?.cost || 0,
        period: getTimeOfDay(hour) as
          | "Night"
          | "Morning"
          | "Afternoon"
          | "Evening",
      })
    );

    const daysOrder = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const weeklyPattern: WeeklyPattern[] = daysOrder.map((day) => ({
      day: day.substring(0, 3),
      charges: weeklyCount[day]?.charges || 0,
      cost: weeklyCount[day]?.cost || 0,
      avgCost: weeklyCount[day]
        ? weeklyCount[day].cost / weeklyCount[day].charges
        : 0,
    }));

    const totalCost = rawData.reduce(
      (sum, p) => sum + (p.CHARGE_AMOUNT || p.AMOUNT || 0),
      0
    );
    const totalCharges = rawData.length;
    const successfulCharges = rawData.filter(
      (p) => p.PAYMENT_STATUS === "SUCCESS" || p.PAYMENT_STATUS === "PAID"
    ).length;

    const peakChargingHour = timeOfDayData.reduce(
      (maxHour, current) =>
        current.charges > timeOfDayData[maxHour].charges
          ? current.hour
          : maxHour,
      0
    );

    const paymentMethodCounts: Record<string, number> = {};
    rawData.forEach((p) => {
      const method = p.PAYMENT_METHOD || "UNKNOWN";
      paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1;
    });
    const preferredPaymentMethod =
      Object.keys(paymentMethodCounts).reduce((a, b) =>
        paymentMethodCounts[a] > paymentMethodCounts[b] ? a : b
      ) || "WALLET";

    const daysCovered = processedDailyData.length;
    const chargingFrequency =
      daysCovered > 0 ? (totalCharges * 7) / daysCovered : 0;

    const estimatedPublicChargingCost = totalCost * 1.3;
    const costSavings = estimatedPublicChargingCost - totalCost;

    const avgChargePercentage =
      totalCharges > 0
        ? rawData.reduce(
            (sum, p) => sum + (p.CHARGE_PERCENTAGE || 0),
            0
          ) / totalCharges
        : 0;

    const metrics = {
      totalCost,
      totalCharges,
      totalRefunds: rawData.reduce(
        (sum, p) => sum + (p.REFUND_AMOUNT || 0),
        0
      ),
      successRate:
        totalCharges > 0 ? (successfulCharges / totalCharges) * 100 : 0,
      avgChargeCost: totalCharges > 0 ? totalCost / totalCharges : 0,
      totalEnergyEstimated: rawData.reduce(
        (sum, p) =>
          sum + estimateEnergyDelivered(p.CHARGE_AMOUNT || p.AMOUNT || 0),
        0
      ),
      avgChargingTime:
        totalCharges > 0
          ? rawData.reduce(
              (sum, p) =>
                sum + estimateChargingTime(p.CHARGE_AMOUNT || p.AMOUNT || 0),
              0
            ) / totalCharges
          : 0,
      costSavings,
      avgChargePercentage,
      peakChargingHour,
      preferredPaymentMethod,
      avgDailyCost: totalCost / Math.max(processedDailyData.length, 1),
      avgWeeklyCost: totalCost / Math.max(processedDailyData.length / 7, 1),
      avgMonthlyCost: totalCost / Math.max(processedDailyData.length / 30, 1),
      chargingFrequency,
    };

    return {
      dailyData: processedDailyData,
      timeOfDayData,
      weeklyPattern,
      chargingTransactions: rawData,
      metrics,
    };
  } catch (error) {
    console.error("Error processing home charging data:", error);
    return {
      dailyData: [],
      timeOfDayData: [],
      weeklyPattern: [],
      chargingTransactions: [],
      metrics: {
        totalCost: 0,
        totalCharges: 0,
        totalRefunds: 0,
        successRate: 0,
        avgChargeCost: 0,
        totalEnergyEstimated: 0,
        avgChargingTime: 0,
        costSavings: 0,
        avgChargePercentage: 0,
        peakChargingHour: 20,
        preferredPaymentMethod: "WALLET",
        avgDailyCost: 0,
        avgWeeklyCost: 0,
        avgMonthlyCost: 0,
        chargingFrequency: 0,
      },
    };
  }
}

const generateCSV = (data: HomeChargingTransaction[]): string => {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);

  const isEpochTimestamp = (key: string, value: any): boolean => {
    const timestampFields = ["CREATED_EPOCH", "CREATED_AT", "PAID_AT"];
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
          const value = row[header as keyof HomeChargingTransaction];
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
export default function BatteryHomeChargingHistory({ BMSID }: { BMSID: string }) {
  const [rawData, setRawData] = useState<HomeChargingTransaction[]>([]);
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
                p.*,
                hc.BMSID,
                hc.MODEL,
                hc.CABINET_ID
              FROM SOURCE_DATA.DYNAMO_DB.FACT_PAYMENT p
              INNER JOIN DB_DUMP.PUBLIC.HOME_CHARGING hc 
                ON p.PAYMENT_ID = hc.PAYMENT_ID
              WHERE hc.BMSID = '${BMSID}'
                AND p.PAYMENT_TYPE = 'HOME_CHARGING'
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
          "Invalid data format: expected an array of payment transactions"
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
    return processHomeChargingData(rawData);
  }, [rawData]);

  const totalPages = Math.ceil(analytics.chargingTransactions.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPageData = useMemo(
    () =>
      analytics.chargingTransactions
        .sort((a, b) => b.CREATED_EPOCH - a.CREATED_EPOCH)
        .slice(startIndex, endIndex),
    [analytics.chargingTransactions, startIndex, endIndex]
  );

  const handleRefresh = useCallback(() => {
    if (!refreshing) {
      fetchData();
    }
  }, [refreshing, fetchData]);

  const COLORS = {
    primary: "#06b6d4",
    secondary: "#10b981",
    tertiary: "#8b5cf6",
    quaternary: "#f59e0b",
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6 bg-slate-950 min-h-screen">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
              Error Loading Home Charging Data
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

  if (!loading && analytics.chargingTransactions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <Home className="h-16 w-16 text-slate-600 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">
                  No Home Charging Records for This Battery
                </h3>
                <p className="text-slate-400">
                  This battery hasn't been used in any home charging sessions yet.
                  Once charging activity begins, you'll see comprehensive analytics here.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="p-4 bg-slate-800 rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-500 mb-2" />
                  <h4 className="text-sm font-semibold text-slate-200 mb-1">
                    Cost Tracking
                  </h4>
                  <p className="text-xs text-slate-400">
                    Monitor charging costs and savings
                  </p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg">
                  <Battery className="h-8 w-8 text-cyan-500 mb-2" />
                  <h4 className="text-sm font-semibold text-slate-200 mb-1">
                    Energy Insights
                  </h4>
                  <p className="text-xs text-slate-400">
                    Track kWh consumption patterns
                  </p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-purple-500 mb-2" />
                  <h4 className="text-sm font-semibold text-slate-200 mb-1">
                    Usage Patterns
                  </h4>
                  <p className="text-xs text-slate-400">
                    Discover charging trends and frequency
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-500 mt-6">
                Battery will appear in home charging records once it's used in charging sessions
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
            Battery Home Charging Analytics - Last {analytics.chargingTransactions.length} Sessions
          </h2>
          <p className="text-slate-400 mt-1">
            Comprehensive charging insights, costs, and usage patterns
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
              const csvContent = generateCSV(analytics.chargingTransactions);
              if (!csvContent) return;
              const blob = new Blob([csvContent], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `battery_home_charging_${BMSID}_${
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
                <p className="text-slate-400 text-sm">Total Charging Cost</p>
                <p className="text-3xl font-bold text-slate-200 mt-1">
                  {formatCurrency(analytics.metrics.totalCost)}
                </p>
                <p className="text-xs text-emerald-400 mt-1">
                  Saved {formatCurrency(analytics.metrics.costSavings)} vs public
                </p>
              </div>
              <div className="p-3 bg-green-600 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">Energy Consumed</p>
                <p className="text-3xl font-bold text-slate-200 mt-1">
                  {analytics.metrics.totalEnergyEstimated.toFixed(0)} kWh
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  From {analytics.metrics.totalCharges} sessions
                </p>
              </div>
              <div className="p-3 bg-cyan-600 rounded-lg">
                <Battery className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">Avg Cost per Charge</p>
                <p className="text-3xl font-bold text-slate-200 mt-1">
                  {formatCurrency(analytics.metrics.avgChargeCost)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {analytics.metrics.chargingFrequency.toFixed(1)} charges/week
                </p>
              </div>
              <div className="p-3 bg-purple-600 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">Success Rate</p>
                <p className="text-3xl font-bold text-slate-200 mt-1">
                  {analytics.metrics.successRate.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {analytics.metrics.totalCharges} total sessions
                </p>
              </div>
              <div className="p-3 bg-amber-600 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-slate-400 text-xs">Peak Charging Hour</p>
            <p className="text-xl font-bold text-slate-200 mt-1">
              {analytics.metrics.peakChargingHour}:00
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-slate-400 text-xs">Avg Charge Level</p>
            <p className="text-xl font-bold text-slate-200 mt-1">
              {analytics.metrics.avgChargePercentage.toFixed(0)}%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-slate-400 text-xs">Avg Duration</p>
            <p className="text-xl font-bold text-slate-200 mt-1">
              {(analytics.metrics.avgChargingTime / 60).toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-slate-400 text-xs">Top Payment</p>
            <p className="text-xl font-bold text-slate-200 mt-1">
              {analytics.metrics.preferredPaymentMethod}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Charging Activity Chart */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-500" />
            Daily Charging Activity & Cost Trends
          </CardTitle>
          <CardDescription className="text-slate-400">
            30-day overview of charging frequency and cost patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={analytics.dailyData.slice(-30)}>
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
                tickFormatter={(value) => `Rs ${value}`}
              />
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
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Charges</span>
                            <span className="text-cyan-400 font-semibold">
                              {data.chargingCount}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Total Cost</span>
                            <span className="text-emerald-400 font-semibold">
                              {formatCurrency(data.cost)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Energy</span>
                            <span className="text-slate-200">
                              {data.estimatedKwh.toFixed(1)} kWh
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Avg %</span>
                            <span className="text-slate-200">
                              {data.avgChargePercentage.toFixed(0)}%
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
                dataKey="chargingCount"
                name="Charging Sessions"
                fill={COLORS.primary}
                radius={[8, 8, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cost"
                name="Daily Cost"
                stroke={COLORS.secondary}
                strokeWidth={3}
                dot={{ fill: COLORS.secondary, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Energy & Cost Analysis */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-500" />
            Energy Consumption & Cost Breakdown
          </CardTitle>
          <CardDescription className="text-slate-400">
            Detailed view of energy usage and charging costs over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.dailyData.slice(-30)}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
              <YAxis yAxisId="cost" stroke="#94a3b8" />
              <YAxis
                yAxisId="energy"
                orientation="right"
                stroke="#94a3b8"
                tickFormatter={(value) => `${value} kWh`}
              />
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
                          <div className="text-emerald-400">
                            Cost: {formatCurrency(data.cost)}
                          </div>
                          <div className="text-purple-400">
                            Energy: {data.estimatedKwh.toFixed(1)} kWh
                          </div>
                          <div className="text-slate-200">
                            Charges: {data.chargingCount}
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
                yAxisId="cost"
                type="monotone"
                dataKey="cost"
                name="Daily Cost"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#costGradient)"
              />
              <Area
                yAxisId="energy"
                type="monotone"
                dataKey="estimatedKwh"
                name="Energy (kWh)"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#energyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charging Patterns Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time of Day Analysis */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-400" />
              Charging by Time of Day
            </CardTitle>
            <CardDescription className="text-slate-400">
              When does this battery typically charge?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={analytics.timeOfDayData.filter((d) => d.charges > 0)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="hour"
                  stroke="#94a3b8"
                  tickFormatter={(value) => `${value}:00`}
                />
                <YAxis stroke="#94a3b8" />
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
                            {label}:00 ({data.period})
                          </p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Charges:</span>
                              <span className="text-slate-200 font-medium">
                                {data.charges}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">
                                Total Cost:
                              </span>
                              <span className="text-green-400 font-medium">
                                {formatCurrency(data.cost)}
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
                  dataKey="charges"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  name="Charging Sessions"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Charging Pattern */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-400" />
              Weekly Charging Pattern
            </CardTitle>
            <CardDescription className="text-slate-400">
              Charging habits throughout the week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.weeklyPattern}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
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
                            {label}
                          </p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Charges:</span>
                              <span className="text-slate-200 font-medium">
                                {data.charges}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">
                                Total Cost:
                              </span>
                              <span className="text-green-400 font-medium">
                                {formatCurrency(data.cost)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Avg Cost:</span>
                              <span className="text-purple-400 font-medium">
                                {formatCurrency(data.avgCost)}
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
                  dataKey="cost"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  name="Cost"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cost Analysis */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            Cost Analysis & Savings
          </CardTitle>
          <CardDescription className="text-slate-400">
            Breakdown of charging expenses and cost-saving insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/40 rounded-lg p-4 text-center">
              <div className="text-sm text-slate-400 mb-2">Daily Average</div>
              <div className="text-xl font-bold text-green-400">
                {formatCurrency(analytics.metrics.avgDailyCost)}
              </div>
              <div className="text-xs text-slate-500 mt-1">per day</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 text-center">
              <div className="text-sm text-slate-400 mb-2">Weekly Average</div>
              <div className="text-xl font-bold text-blue-400">
                {formatCurrency(analytics.metrics.avgWeeklyCost)}
              </div>
              <div className="text-xs text-slate-500 mt-1">per week</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 text-center">
              <div className="text-sm text-slate-400 mb-2">Monthly Average</div>
              <div className="text-xl font-bold text-purple-400">
                {formatCurrency(analytics.metrics.avgMonthlyCost)}
              </div>
              <div className="text-xs text-slate-500 mt-1">per month</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 text-center">
              <div className="text-sm text-slate-400 mb-2">Cost per kWh</div>
              <div className="text-xl font-bold text-cyan-400">
                {analytics.metrics.totalEnergyEstimated > 0
                  ? formatCurrency(
                      analytics.metrics.totalCost /
                        analytics.metrics.totalEnergyEstimated
                    )
                  : formatCurrency(0)}
              </div>
              <div className="text-xs text-slate-500 mt-1">per kWh</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-500" />
            Charging Session History ({analytics.chargingTransactions.length} total)
          </CardTitle>
          <CardDescription className="text-slate-400">
            Detailed chronological view of all home charging sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Payment ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Est. Energy
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Charge %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Est. Duration
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
                          {formatCurrency(transaction.CHARGE_AMOUNT || transaction.AMOUNT)}
                        </p>
                        {transaction.REFUND_AMOUNT > 0 && (
                          <p className="text-xs text-red-400">
                            -{formatCurrency(transaction.REFUND_AMOUNT)} refund
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {estimateEnergyDelivered(
                        transaction.CHARGE_AMOUNT || transaction.AMOUNT
                      ).toFixed(1)}{" "}
                      kWh
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-cyan-400 font-semibold">
                        {transaction.CHARGE_PERCENTAGE}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {transaction.PAYMENT_METHOD}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {transaction.PAYMENT_STATUS === "SUCCESS" ||
                      transaction.PAYMENT_STATUS === "PAID" ? (
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
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {formatDateTime(transaction.CREATED_EPOCH)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {Math.floor(
                        estimateChargingTime(
                          transaction.CHARGE_AMOUNT || transaction.AMOUNT
                        ) / 60
                      )}
                      h{" "}
                      {estimateChargingTime(
                        transaction.CHARGE_AMOUNT || transaction.AMOUNT
                      ) % 60}
                      m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      {/* Summary Footer */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-500" />
            Performance Summary
          </CardTitle>
          <CardDescription className="text-slate-400">
            Comprehensive metrics for battery home charging operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold text-emerald-400">
                {formatCurrency(analytics.metrics.totalCost - analytics.metrics.totalRefunds)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Net Cost</p>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold text-cyan-400">
                {analytics.dailyData.length > 0
                  ? (
                      analytics.dailyData.reduce(
                        (sum, day) => sum + day.chargingCount,
                        0
                      ) / analytics.dailyData.length
                    ).toFixed(1)
                  : "0"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Avg Charges/Day</p>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold text-emerald-400">
                {formatCurrency(analytics.metrics.costSavings)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Total Savings</p>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold text-purple-400">
                {analytics.metrics.totalEnergyEstimated.toFixed(0)} kWh
              </p>
              <p className="text-xs text-slate-400 mt-1">Total Energy</p>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold text-amber-400">
                {analytics.metrics.chargingFrequency.toFixed(1)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Charges/Week</p>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <p className="text-2xl font-bold text-cyan-400">
                {(analytics.metrics.avgChargingTime / 60).toFixed(1)}h
              </p>
              <p className="text-xs text-slate-400 mt-1">Avg Duration</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}