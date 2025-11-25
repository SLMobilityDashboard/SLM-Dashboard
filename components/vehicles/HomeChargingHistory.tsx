import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CreditCard,
  Wallet,
  TrendingUp,
  DollarSign,
  Home,
  Zap,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Calendar,
  Activity,
  Battery,
  Download,
  Sun,
  Moon,
  Sunrise,
  Sunset,
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
} from "recharts";

// -------------------- Interfaces --------------------
interface PaymentTransaction {
  PAYMENT_ID: string;
  PAYMENT_METHOD_ID: string | null;
  APPROVED_SWAP_ID: string | null;
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
  REFUND_PERCENTAGE: number;
  PAYMENT_TRIES: number | null;
  PREVIOUS_WALLET_BAL: number | null;
  WALLET_BALANCE: number | null;
  WALLET_MIN_BAL: number | null;
  WALLET_CODE: string | null;
  PAYMENT_METHOD_TYPE: string | null;
  PAYMENT_TYPE: string;
  REASON: string | null;
  AGREEMENT: string | null;
  EVENT_CODE: string | null;
  EVENT_MSG: string | null;
  CREATED_EPOCH: number;
  DETAILS_JSON: any;
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

interface ChargingPatterns {
  peakChargingHour: number;
  preferredPaymentMethod: string;
  avgDailyCost: number;
  avgWeeklyCost: number;
  avgMonthlyCost: number;
  chargingFrequency: number;
  costTrend: "increasing" | "decreasing" | "stable";
  reliabilityScore: number;
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

function formatDate(timestamp: number): string {
  const date =
    timestamp > 9999999999 ? new Date(timestamp) : new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    year: "2-digit",
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
function processHomeChargingData(rawData: PaymentTransaction[]) {
  try {
    const chargingPayments = rawData.filter(
      (payment) => payment.PAYMENT_TYPE === "HOME_CHARGING"
    );

    if (chargingPayments.length === 0) {
      return {
        dailyData: [],
        timeOfDayData: [],
        weeklyPattern: [],
        chargingPatterns: {
          peakChargingHour: 20,
          preferredPaymentMethod: "WALLET",
          avgDailyCost: 0,
          avgWeeklyCost: 0,
          avgMonthlyCost: 0,
          chargingFrequency: 0,
          costTrend: "stable" as const,
          reliabilityScore: 100,
        },
        chargingPayments: [],
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
        },
      };
    }

    const dailyData: Record<string, DailyChargingData> = {};
    const timeOfDayCount: Record<number, { charges: number; cost: number }> =
      {};
    const weeklyCount: Record<string, { charges: number; cost: number }> = {};

    chargingPayments.forEach((payment) => {
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

    const totalCost = chargingPayments.reduce(
      (sum, p) => sum + (p.CHARGE_AMOUNT || p.AMOUNT || 0),
      0
    );
    const totalCharges = chargingPayments.length;
    const successfulCharges = chargingPayments.filter(
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
    chargingPayments.forEach((p) => {
      const method = p.PAYMENT_METHOD || "UNKNOWN";
      paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1;
    });
    const preferredPaymentMethod =
      Object.keys(paymentMethodCounts).reduce((a, b) =>
        paymentMethodCounts[a] > paymentMethodCounts[b] ? a : b
      ) || "WALLET";

    const recentData = processedDailyData.slice(-30);
    const costTrend =
      recentData.length > 10
        ? recentData.slice(-5).reduce((s, d) => s + d.cost, 0) / 5 >
          recentData.slice(0, 5).reduce((s, d) => s + d.cost, 0) / 5
          ? "increasing"
          : "decreasing"
        : ("stable" as const);

    const daysCovered = processedDailyData.length;
    const chargingFrequency =
      daysCovered > 0 ? (totalCharges * 7) / daysCovered : 0;

    const estimatedPublicChargingCost = totalCost * 1.3;
    const costSavings = estimatedPublicChargingCost - totalCost;

    const avgChargePercentage =
      totalCharges > 0
        ? chargingPayments.reduce(
            (sum, p) => sum + (p.CHARGE_PERCENTAGE || 0),
            0
          ) / totalCharges
        : 0;

    const chargingPatterns: ChargingPatterns = {
      peakChargingHour,
      preferredPaymentMethod,
      avgDailyCost: totalCost / Math.max(processedDailyData.length, 1),
      avgWeeklyCost: totalCost / Math.max(processedDailyData.length / 7, 1),
      avgMonthlyCost: totalCost / Math.max(processedDailyData.length / 30, 1),
      chargingFrequency,
      costTrend,
      reliabilityScore:
        totalCharges > 0 ? (successfulCharges / totalCharges) * 100 : 100,
    };

    const metrics = {
      totalCost,
      totalCharges,
      totalRefunds: chargingPayments.reduce(
        (sum, p) => sum + (p.REFUND_AMOUNT || 0),
        0
      ),
      successRate:
        totalCharges > 0 ? (successfulCharges / totalCharges) * 100 : 0,
      avgChargeCost: totalCharges > 0 ? totalCost / totalCharges : 0,
      totalEnergyEstimated: chargingPayments.reduce(
        (sum, p) =>
          sum + estimateEnergyDelivered(p.CHARGE_AMOUNT || p.AMOUNT || 0),
        0
      ),
      avgChargingTime:
        totalCharges > 0
          ? chargingPayments.reduce(
              (sum, p) =>
                sum + estimateChargingTime(p.CHARGE_AMOUNT || p.AMOUNT || 0),
              0
            ) / totalCharges
          : 0,
      costSavings,
      avgChargePercentage,
    };

    return {
      dailyData: processedDailyData,
      timeOfDayData,
      weeklyPattern,
      chargingPatterns,
      chargingPayments,
      metrics,
    };
  } catch (error) {
    console.error("Error processing home charging data:", error);
    return {
      dailyData: [],
      timeOfDayData: [],
      weeklyPattern: [],
      chargingPatterns: {
        peakChargingHour: 20,
        preferredPaymentMethod: "WALLET",
        avgDailyCost: 0,
        avgWeeklyCost: 0,
        avgMonthlyCost: 0,
        chargingFrequency: 0,
        costTrend: "stable" as const,
        reliabilityScore: 100,
      },
      chargingPayments: [],
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

const generateCSV = (data: PaymentTransaction[]): string => {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);

  const isEpochTimestamp = (key: string, value: any): boolean => {
    const timestampFields = [
      "CREATED_EPOCH",
      "CREATED_AT",
      "PAID_AT",
      "UPDATED_AT",
      "TIMESTAMP",
    ];
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
          const value = row[header];

          if (value === null || value === undefined) return "";

          // Convert epoch timestamps & wrap them in quotes
          if (isEpochTimestamp(header, value)) {
            const formatted = formatEpochToDateTime(value);
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

// -------------------- Main Component --------------------
export default function HomeChargingHistory({
  CustomerID,
}: {
  CustomerID: string;
}) {
  const [rawData, setRawData] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const rowsPerPage = 15;

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
            SELECT *
              FROM SOURCE_DATA.DYNAMO_DB.FACT_PAYMENT
              WHERE CUSTOMER_ID = '${CustomerID}'
                AND PAYMENT_TYPE in ('HOME_CHARGING')
              ORDER BY CREATED_EPOCH DESC;
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
  }, [CustomerID]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const analytics = useMemo(() => {
    return processHomeChargingData(rawData);
  }, [rawData]);

  const totalPages = Math.ceil(analytics.chargingPayments.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPageData = useMemo(
    () =>
      analytics.chargingPayments
        .sort((a, b) => b.CREATED_EPOCH / 1000 - a.CREATED_EPOCH / 1000)
        .slice(startIndex, endIndex),
    [analytics.chargingPayments, startIndex, endIndex]
  );

  const handleRefresh = useCallback(() => {
    if (!refreshing) {
      fetchData();
    }
  }, [refreshing, fetchData]);

  if (loading) {
    return (
      <div className="grid gap-6 p-6 min-h-screen bg-slate-950">
        <div className="space-y-2">
          <div className="h-8 w-80 bg-slate-800/50 animate-pulse rounded" />
          <div className="h-4 w-96 bg-slate-800/50 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
      <div className="p-6 bg-slate-950 min-h-screen">
        <Card className="bg-red-900/20 border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              Error Loading Home Charging Data
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
      </div>
    );
  }

  // Check if there are no home charging records
  if (!loading && analytics.chargingPayments.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Home className="w-8 h-8 text-cyan-400" />
              Home Charging Analytics
            </h1>
            <p className="text-slate-400">
              Personal charging insights, costs, and usage patterns for your
              home EV charger
            </p>
          </div>
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
        </div>

        <Card className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 border-slate-700">
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-24 h-24 mx-auto bg-slate-800/50 rounded-full flex items-center justify-center">
                <Home className="w-12 h-12 text-cyan-400" />
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-slate-100">
                  No Home Charging Records Yet
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                  We haven't detected any home charging sessions for this
                  account yet. Once start using your home charger, you'll see
                  detailed analytics here including:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 text-left bg-slate-800/30 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-slate-200 font-medium">
                      Cost Tracking
                    </div>
                    <div className="text-sm text-slate-400">
                      Monitor your daily, weekly, and monthly charging expenses
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Battery className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-slate-200 font-medium">
                      Energy Insights
                    </div>
                    <div className="text-sm text-slate-400">
                      Track kWh consumption and charging patterns
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-slate-200 font-medium">
                      Usage Patterns
                    </div>
                    <div className="text-sm text-slate-400">
                      Discover your peak charging hours and weekly trends
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Activity className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-slate-200 font-medium">
                      Savings Calculator
                    </div>
                    <div className="text-sm text-slate-400">
                      See how much you save vs public charging
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-500">
                  Start charging at home to unlock personalized insights and
                  track your EV charging journey!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Home className="w-8 h-8 text-cyan-400" />
            My Home Charging Analytics
          </h1>
          <p className="text-slate-400">
            Personal charging insights, costs, and usage patterns for your home
            EV charger
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
              const csvContent = generateCSV(analytics.chargingPayments);
              if (!csvContent) return;

              const blob = new Blob([csvContent], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `home_charging_sessions_${
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-sm text-slate-300">
                Total Charging Cost
              </span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(analytics.metrics.totalCost)}
            </div>
            <div className="text-xs text-green-300 mt-1">
              Saved {formatCurrency(analytics.metrics.costSavings)} vs public
              charging
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 border-cyan-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Battery className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-slate-300">Energy Consumed</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400">
              {analytics.metrics.totalEnergyEstimated.toFixed(0)} kWh
            </div>
            <div className="text-xs text-cyan-300 mt-1">
              From {analytics.metrics.totalCharges} charging sessions
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-slate-300">
                Avg Cost per Charge
              </span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {formatCurrency(analytics.metrics.avgChargeCost)}
            </div>
            <div className="text-xs text-purple-300 mt-1">
              {analytics.chargingPatterns.chargingFrequency.toFixed(1)}{" "}
              charges/week
            </div>
          </CardContent>
        </Card>

        {/* <Card className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border-orange-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-slate-300">Avg Charge Level</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">
              {analytics.metrics.avgChargePercentage.toFixed(0)}%
            </div>
            <div className="text-xs text-orange-300 mt-1">
              {analytics.chargingPatterns.reliabilityScore.toFixed(1)}% success
              rate
            </div>
          </CardContent>
        </Card> */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-slate-100 text-lg">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Cost Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-400 mb-2 capitalize">
                {analytics.chargingPatterns.costTrend}
              </div>
              <div className="text-sm text-slate-400">
                Monthly avg:{" "}
                {formatCurrency(analytics.chargingPatterns.avgMonthlyCost)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charging Patterns Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"></div>

      {/* Daily Cost Trend Chart */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Daily Charging Costs & Usage
          </CardTitle>
          <CardDescription className="text-slate-400">
            Your daily charging costs and energy consumption patterns over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={analytics.dailyData.slice(-30)}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
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
                    year: "2-digit",
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis
                yAxisId="cost"
                orientation="left"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(value) => `Rs ${value}`}
              />
              <YAxis
                yAxisId="energy"
                orientation="right"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(value) => `${value} kWh`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-slate-900/95 backdrop-blur-sm p-4 shadow-xl border-slate-700">
                        <div className="text-sm font-medium text-slate-200 mb-2">
                          {new Date(label).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <div className="text-slate-400 mb-1">
                              Daily Cost
                            </div>
                            <div className="font-bold text-green-400">
                              {formatCurrency(data.cost)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">Charges</div>
                            <div className="font-bold text-blue-400">
                              {data.chargingCount}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">Energy</div>
                            <div className="font-bold text-purple-400">
                              {data.estimatedKwh.toFixed(1)} kWh
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">Avg %</div>
                            <div className="font-bold text-cyan-400">
                              {data.avgChargePercentage.toFixed(0)}%
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
                yAxisId="cost"
                type="monotone"
                dataKey="cost"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#costGradient)"
                name="Daily Cost"
              />
              <Line
                yAxisId="energy"
                type="monotone"
                dataKey="estimatedKwh"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                name="Energy (kWh)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charging Patterns Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time of Day Analysis */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Clock className="w-5 h-5 text-blue-400" />
              Charging by Time of Day
            </CardTitle>
            <CardDescription className="text-slate-400">
              When do you typically charge your EV at home?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={analytics.timeOfDayData.filter((d) => d.charges > 0)}
              >
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
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-slate-900/95 backdrop-blur-sm p-3 shadow-xl border-slate-700">
                          <div className="text-sm font-medium text-slate-200 mb-2">
                            {label}:00 ({data.period})
                          </div>
                          <div className="grid gap-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Charges:</span>
                              <span className="text-slate-200 font-medium">
                                {data.charges}
                              </span>
                            </div>
                            <div className="flex justify-between">
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
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Calendar className="w-5 h-5 text-purple-400" />
              Weekly Charging Pattern
            </CardTitle>
            <CardDescription className="text-slate-400">
              Your charging habits throughout the week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.weeklyPattern}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-700"
                />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-slate-900/95 backdrop-blur-sm p-3 shadow-xl border-slate-700">
                          <div className="text-sm font-medium text-slate-200 mb-2">
                            {label}
                          </div>
                          <div className="grid gap-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Charges:</span>
                              <span className="text-slate-200 font-medium">
                                {data.charges}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                Total Cost:
                              </span>
                              <span className="text-green-400 font-medium">
                                {formatCurrency(data.cost)}
                              </span>
                            </div>
                            <div className="flex justify-between">
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

      {/* Cost Breakdown and Insights */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <DollarSign className="w-5 h-5 text-green-400" />
            Cost Analysis & Insights
          </CardTitle>
          <CardDescription className="text-slate-400">
            Breakdown of your home charging expenses and cost-saving insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/40 rounded-lg p-4 text-center">
              <div className="text-sm text-slate-400 mb-2">Daily Average</div>
              <div className="text-xl font-bold text-green-400">
                {formatCurrency(analytics.chargingPatterns.avgDailyCost)}
              </div>
              <div className="text-xs text-slate-500 mt-1">per day</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 text-center">
              <div className="text-sm text-slate-400 mb-2">Weekly Average</div>
              <div className="text-xl font-bold text-blue-400">
                {formatCurrency(analytics.chargingPatterns.avgWeeklyCost)}
              </div>
              <div className="text-xs text-slate-500 mt-1">per week</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 text-center">
              <div className="text-sm text-slate-400 mb-2">Monthly Average</div>
              <div className="text-xl font-bold text-purple-400">
                {formatCurrency(analytics.chargingPatterns.avgMonthlyCost)}
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

      {/* Recent Charging History Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Activity className="w-5 h-5 text-cyan-400" />
            Recent Charging Sessions ({analytics.chargingPayments.length} total)
          </CardTitle>
          <CardDescription className="text-slate-400">
            Detailed history of your home charging sessions with cost and
            payment details
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/30">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Date & Time
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Cost
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Est. Energy
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Payment Method
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">
                    Est. Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentPageData.map((payment) => (
                  <tr
                    key={payment.PAYMENT_ID}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-200">
                      <div>
                        {new Date(payment.CREATED_EPOCH).toLocaleString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {getTimeOfDay(
                          new Date(payment.CREATED_EPOCH).getHours()
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium">
                      {formatCurrency(payment.CHARGE_AMOUNT || payment.AMOUNT)}
                      {payment.CHARGE_PERCENTAGE && (
                        <div className="text-xs text-cyan-400">
                          {payment.CHARGE_PERCENTAGE}% charged
                        </div>
                      )}
                      {payment.REFUND_AMOUNT > 0 && (
                        <div className="text-xs text-red-400">
                          -{formatCurrency(payment.REFUND_AMOUNT)} refund
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {estimateEnergyDelivered(
                        payment.CHARGE_AMOUNT || payment.AMOUNT
                      ).toFixed(1)}{" "}
                      kWh
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-700/40">
                        {payment.PAYMENT_METHOD}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {payment.PAYMENT_STATUS === "SUCCESS" ||
                        payment.PAYMENT_STATUS === "PAID" ? (
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
                              {payment.PAYMENT_STATUS}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-xs">
                      {Math.floor(
                        estimateChargingTime(
                          payment.CHARGE_AMOUNT || payment.AMOUNT
                        ) / 60
                      )}
                      h{" "}
                      {estimateChargingTime(
                        payment.CHARGE_AMOUNT || payment.AMOUNT
                      ) % 60}
                      m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Component */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      {/* Summary Footer */}
      <Card className="bg-gradient-to-r from-slate-900/70 to-slate-800/70 border-slate-700">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">
              Your Home Charging Summary
            </h3>
            <p className="text-slate-400 text-sm">
              Based on {analytics.chargingPayments.length} charging sessions
              over the last {analytics.dailyData.length} days
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(analytics.metrics.costSavings)}
              </div>
              <div className="text-sm text-slate-400">Total Savings</div>
              <div className="text-xs text-slate-500">vs public charging</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {(analytics.metrics.totalEnergyEstimated * 3.6).toFixed(1)} kg
              </div>
              <div className="text-sm text-slate-400">CO₂ Avoided</div>
              <div className="text-xs text-slate-500">approx. vs petrol</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {analytics.chargingPatterns.chargingFrequency.toFixed(1)}
              </div>
              <div className="text-sm text-slate-400">Charges per Week</div>
              <div className="text-xs text-slate-500">avg frequency</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">
                {(analytics.metrics.avgChargingTime / 60).toFixed(1)}h
              </div>
              <div className="text-sm text-slate-400">Avg Charge Time</div>
              <div className="text-xs text-slate-500">per session</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
