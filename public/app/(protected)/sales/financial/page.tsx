"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  PiggyBank,
  Calculator,
  Percent,
  Target,
  Activity,
  Banknote,
} from "lucide-react";
import {
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
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

interface FinancialData {
  financialMetrics: {
    totalRevenue: number;
    bikeRevenue: number;
    subscriptionRevenue: number;
    totalDiscounts: number;
    averageDiscount: number;
    grossMargin: number;
    netProfit: number;
    revenueByPaymentMethod: {
      cash: number;
      finance: number;
      card: number;
    };
    discountImpact: {
      totalDiscounts: number;
      discountPercentage: number;
      averageDiscountPerSale: number;
    };
  };
  emiAnalysis: {
    averageEmi: number;
    averageLoanAmount: number;
    averageDownPayment: number;
    financePartnerBreakdown: Record<string, number>;
  };
  monthlyRevenue: Array<{
    month: string;
    bikeRevenue: number;
    subscriptionRevenue: number;
    totalRevenue: number;
    discounts: number;
  }>;
  paymentMethodAnalysis: {
    financeRate: number;
    cashRate: number;
    cardRate: number;
  };
  revenueStreams: {
    primaryRevenue: number;
    recurringRevenue: number;
    serviceRevenue: number;
  };
}

const COLORS = ["#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function FinancialAnalysisPage() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/sales/financial");
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Activity className="h-12 w-12 animate-spin text-cyan-400 mx-auto" />
            <p className="text-lg text-slate-400">
              Loading financial analytics...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Banknote className="h-12 w-12 text-slate-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-slate-300 mb-2">
                Failed to load data
              </h2>
              <p className="text-slate-400 mb-4">
                Unable to fetch financial analytics
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-LK").format(num);
  };

  // Prepare payment method data for charts
  const paymentMethodData = [
    {
      method: "Cash",
      amount: data.financialMetrics.revenueByPaymentMethod.cash,
      percentage: data.paymentMethodAnalysis.cashRate,
    },
    {
      method: "Finance",
      amount: data.financialMetrics.revenueByPaymentMethod.finance,
      percentage: data.paymentMethodAnalysis.financeRate,
    },
    {
      method: "Card",
      amount: data.financialMetrics.revenueByPaymentMethod.card,
      percentage: data.paymentMethodAnalysis.cardRate,
    },
  ];

  // Prepare finance partner data
  const financePartnerData = Object.entries(
    data.emiAnalysis.financePartnerBreakdown
  ).map(([partner, count]) => ({
    partner,
    count,
  }));

  // Prepare revenue streams data
  const revenueStreamsData = [
    {
      stream: "Bike Sales",
      amount: data.revenueStreams.primaryRevenue,
      color: "#06B6D4",
    },
    {
      stream: "Subscriptions",
      amount: data.revenueStreams.recurringRevenue,
      color: "#10B981",
    },
    {
      stream: "Services",
      amount: data.revenueStreams.serviceRevenue,
      color: "#F59E0B",
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
          <Banknote className="h-4 w-4 text-cyan-400 mr-2" />
          <span className="text-cyan-400 text-sm font-medium">
            Financial Analytics
          </span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Financial Analysis Dashboard
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Comprehensive financial performance insights with profitability
          analysis and revenue optimization
        </p>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 border-emerald-500/30 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(data.financialMetrics.totalRevenue)}
            </div>
            <div className="text-sm text-emerald-400 mt-1">
              Primary income stream
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-cyan-500/30 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Percent className="h-4 w-4 text-cyan-500" />
              Dealer Comission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(
                (data.financialMetrics.totalRevenue * 0.1).toFixed(2)
              )}
            </div>
            <div className="text-sm text-cyan-400 mt-1">
              Dealer commission around 10%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border-red-500/30 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Total Discounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(data.financialMetrics.totalDiscounts)}
            </div>
            <div className="text-sm text-red-400 mt-1">
              {data.financialMetrics.discountImpact.discountPercentage.toFixed(
                1
              )}
              % of revenue
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              Bike Sales Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(
                (
                  data.financialMetrics.totalRevenue * 0.9 -
                  data.financialMetrics.totalDiscounts
                ).toFixed(2)
              )}
            </div>
            <div className="text-sm text-purple-400 mt-1">
              Net revenue After all expenses
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">
              Monthly Revenue Breakdown
            </CardTitle>
            <CardDescription className="text-slate-400">
              Revenue streams over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    backdropFilter: "blur(8px)",
                  }}
                  formatter={(value: number) => [formatCurrency(value), ""]}
                />
                <Legend />
                <Bar
                  dataKey="bikeRevenue"
                  stackId="a"
                  fill="#06B6D4"
                  name="Bike Sales"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="subscriptionRevenue"
                  stackId="a"
                  fill="#10B981"
                  name="Subscriptions"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="totalRevenue"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  name="Total Revenue"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Revenue vs Discounts</CardTitle>
            <CardDescription className="text-slate-400">
              Impact of discounts on monthly revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    backdropFilter: "blur(8px)",
                  }}
                  formatter={(value: number) => [formatCurrency(value), ""]}
                />
                <Legend />
                <Bar
                  dataKey="totalRevenue"
                  fill="#10B981"
                  name="Revenue"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="discounts"
                  fill="#EF4444"
                  name="Discounts"
                  radius={[4, 4, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payment Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">
              Payment Method Distribution
            </CardTitle>
            <CardDescription className="text-slate-400">
              Revenue by payment type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, percentage }) =>
                    `${method}: ${percentage.toFixed(1)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Revenue",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">
              Finance Partner Distribution
            </CardTitle>
            <CardDescription className="text-slate-400">
              Loan partnerships breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={financePartnerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="partner"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    backdropFilter: "blur(8px)",
                  }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* EMI and Finance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calculator className="h-5 w-5 text-cyan-500" />
              EMI Analysis
            </CardTitle>
            <CardDescription className="text-slate-400">
              Financing patterns and affordability metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 p-4 rounded-lg backdrop-blur-sm">
                <div className="text-sm text-slate-400">Average EMI</div>
                <div className="text-xl font-bold text-white">
                  {formatCurrency(data.emiAnalysis.averageEmi)}
                </div>
                <div className="text-xs text-slate-400 mt-1">Per month</div>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg backdrop-blur-sm">
                <div className="text-sm text-slate-400">
                  Average Loan Amount
                </div>
                <div className="text-xl font-bold text-white">
                  {formatCurrency(data.emiAnalysis.averageLoanAmount)}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Principal amount
                </div>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg backdrop-blur-sm">
                <div className="text-sm text-slate-400">
                  Average Down Payment
                </div>
                <div className="text-xl font-bold text-white">
                  {formatCurrency(data.emiAnalysis.averageDownPayment)}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Initial payment
                </div>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg backdrop-blur-sm">
                <div className="text-sm text-slate-400">Finance Rate</div>
                <div className="text-xl font-bold text-white">
                  {data.paymentMethodAnalysis.financeRate.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Of total sales
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-emerald-500" />
              Profitability Insights
            </CardTitle>
            <CardDescription className="text-slate-400">
              Key profitability metrics and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-400 font-medium">
                    Revenue Growth
                  </span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(data.financialMetrics.totalRevenue)}
                </div>
                <div className="text-sm text-emerald-400">
                  Total business revenue
                </div>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-lg backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-cyan-400 font-medium">
                    Recurring Revenue
                  </span>
                  <CreditCard className="h-4 w-4 text-cyan-500" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(data.revenueStreams.recurringRevenue)}
                </div>
                <div className="text-sm text-cyan-400">
                  Annual subscription value
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-400 font-medium">
                    Discount Impact
                  </span>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {data.financialMetrics.discountImpact.discountPercentage.toFixed(
                    1
                  )}
                  %
                </div>
                <div className="text-sm text-red-400">Of total revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card className="border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">
            Financial Performance Summary
          </CardTitle>
          <CardDescription className="text-slate-400">
            Key financial indicators and strategic insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">
                Revenue Analysis
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bike Sales Revenue</span>
                  <span className="text-white font-medium">
                    {formatCurrency(data.financialMetrics.bikeRevenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Subscription Revenue</span>
                  <span className="text-white font-medium">
                    {formatCurrency(data.financialMetrics.subscriptionRevenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Service Revenue</span>
                  <span className="text-white font-medium">
                    {formatCurrency(data.revenueStreams.serviceRevenue)}
                  </span>
                </div>
                <div className="border-t border-slate-700 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-300">Total Revenue</span>
                    <span className="text-white">
                      {formatCurrency(data.financialMetrics.totalRevenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">
                Cost Analysis
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Discounts</span>
                  <span className="text-red-400 font-medium">
                    -{formatCurrency(data.financialMetrics.totalDiscounts)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Average Discount per Sale
                  </span>
                  <span className="text-red-400 font-medium">
                    -{formatCurrency(data.financialMetrics.averageDiscount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gross Margin</span>
                  <span className="text-emerald-400 font-medium">
                    {(data.financialMetrics.grossMargin * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="border-t border-slate-700 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-300">Net Profit Margin</span>
                    <span className="text-emerald-400">
                      {(data.financialMetrics.netProfit * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">
                Strategic Insights
              </h4>
              <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-lg backdrop-blur-sm">
                <h5 className="text-cyan-400 font-medium mb-2">
                  Key Recommendations
                </h5>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• Optimize discount strategies to improve margins</li>
                  <li>• Focus on growing subscription revenue stream</li>
                  <li>• Strengthen partnerships with finance providers</li>
                  <li>• Monitor EMI affordability for customer retention</li>
                  <li>• Develop premium service offerings</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
