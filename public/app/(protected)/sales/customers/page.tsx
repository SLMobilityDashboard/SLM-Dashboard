"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  UserCheck,
  Building2,
  Target,
  Heart,
  Star,
  RefreshCw,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertCircle,
} from "lucide-react";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

interface CustomerInsights {
  totalCustomers: number;
  individualCustomers: number;
  fleetCustomers: number;
  averageCustomerValue: number;
  customerRetentionRate: number;
  subscriptionAdoptionRate: number;
  customerSegments: Array<{
    segment: string;
    count: number;
    percentage: number;
    averageValue: number;
    retentionRate: number;
  }>;
  customerSatisfaction: Array<{
    category: string;
    score: number;
    trend: number;
  }>;
  leadSources: Array<{
    source: string;
    leads: number;
    conversions: number;
    conversionRate: number;
    cost: number;
  }>;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

export default function CustomerInsightsPage() {
  const [data, setData] = useState<CustomerInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/sales/customers");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching customer insights:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center space-y-4 mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <Activity className="h-4 w-4 text-cyan-400 mr-2 animate-spin" />
            <span className="text-cyan-400 text-sm font-medium">
              Loading Customer Data
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Customer Insights
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Loading comprehensive customer analytics and segmentation data...
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center space-y-4 mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
            <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
            <span className="text-red-400 text-sm font-medium">
              Error Loading Data
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Customer Insights
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Failed to load customer data. Please try again.
          </p>
          <Button onClick={fetchData} className="bg-cyan-600 hover:bg-cyan-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
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

  const totalLeads = data.leadSources.reduce(
    (sum, source) => sum + source.leads,
    0
  );
  const totalConversions = data.leadSources.reduce(
    (sum, source) => sum + source.conversions,
    0
  );
  const overallConversionRate = (totalConversions / totalLeads) * 100;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
          <Users className="h-4 w-4 text-cyan-400 mr-2" />
          <span className="text-cyan-400 text-sm font-medium">
            Customer Analytics
          </span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Customer Insights Dashboard
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Comprehensive customer analytics, segmentation, and behavioral
          insights for strategic decision making.
        </p>
      </div>

      {/* Customer Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">
                {formatNumber(data.totalCustomers)}
              </div>
              <Users className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="text-sm text-slate-400 mt-2">
              Active customer base
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Individual Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">
                {formatNumber(data.individualCustomers)}
              </div>
              <UserCheck className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-sm text-slate-400 mt-2">
              {((data.individualCustomers / data.totalCustomers) * 100).toFixed(
                1
              )}
              % of total
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Fleet Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">
                {formatNumber(data.fleetCustomers)}
              </div>
              <Building2 className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-sm text-slate-400 mt-2">
              {((data.fleetCustomers / data.totalCustomers) * 100).toFixed(1)}%
              of total
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Avg Customer Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">
                {formatCurrency(data.averageCustomerValue)}
              </div>
              <Target className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-sm text-slate-400 mt-2">Per customer</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Retention Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">
                {data.customerRetentionRate.toFixed(1)}%
              </div>
              <Heart className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-sm text-slate-400 mt-2">Customer loyalty</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Subscription Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">
                {data.subscriptionAdoptionRate.toFixed(1)}%
              </div>
              <Star className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="text-sm text-slate-400 mt-2">
              Battery subscription
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="segments" className="space-y-6">
        <TabsList className="border-slate-700/50 backdrop-blur-sm">
          <TabsTrigger
            value="segments"
            className="data-[state=active]:bg-slate-700"
          >
            Customer Segments
          </TabsTrigger>
          <TabsTrigger
            value="satisfaction"
            className="data-[state=active]:bg-slate-700"
          >
            Satisfaction Analysis
          </TabsTrigger>
          <TabsTrigger
            value="acquisition"
            className="data-[state=active]:bg-slate-700"
          >
            Lead Acquisition
          </TabsTrigger>
          <TabsTrigger
            value="behavior"
            className="data-[state=active]:bg-slate-700"
          >
            Behavior Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="segments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Segmentation */}
            <Card className="border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">
                  Customer Segmentation
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Distribution by customer segments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.customerSegments}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ segment, percentage }) =>
                        `${segment}: ${percentage}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.customerSegments.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Segment Value Analysis */}
            <Card className="border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">
                  Segment Value Analysis
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Average value and retention by segment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.customerSegments}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="segment" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string) => [
                        name === "averageValue"
                          ? formatCurrency(value)
                          : `${value}%`,
                        name === "averageValue"
                          ? "Average Value"
                          : "Retention Rate",
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="averageValue"
                      fill="#3B82F6"
                      name="Average Value"
                    />
                    <Bar
                      dataKey="retentionRate"
                      fill="#10B981"
                      name="Retention Rate"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Segment Breakdown */}
          <Card className="border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">
                Segment Performance Details
              </CardTitle>
              <CardDescription className="text-slate-400">
                Comprehensive metrics by customer segment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.customerSegments.map((segment, index) => (
                  <div
                    key={segment.segment}
                    className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">
                        {segment.segment}
                      </h3>
                      <div
                        className={`w-3 h-3 rounded-full`}
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">
                          Customers:
                        </span>
                        <span className="text-sm text-white font-medium">
                          {formatNumber(segment.count)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Share:</span>
                        <span className="text-sm text-white font-medium">
                          {segment.percentage}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">
                          Avg Value:
                        </span>
                        <span className="text-sm text-white font-medium">
                          {formatCurrency(segment.averageValue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">
                          Retention:
                        </span>
                        <span className="text-sm text-white font-medium">
                          {segment.retentionRate}%
                        </span>
                      </div>
                      <div className="mt-3">
                        <Progress
                          value={segment.retentionRate}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="satisfaction" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Satisfaction Radar Chart */}
            <Card className="border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">
                  Customer Satisfaction Radar
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Multi-dimensional satisfaction analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={data.customerSatisfaction}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fill: "#9CA3AF", fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 5]}
                      tick={{ fill: "#9CA3AF", fontSize: 10 }}
                    />
                    <Radar
                      name="Satisfaction Score"
                      dataKey="score"
                      stroke="#06B6D4"
                      fill="#06B6D4"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Satisfaction Trends */}
            <Card className="border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">
                  Satisfaction Trends
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Score changes and improvement areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.customerSatisfaction.map((item, index) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <div className="text-white font-medium">
                            {item.category}
                          </div>
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(item.score)
                                    ? "text-yellow-500 fill-current"
                                    : "text-slate-600"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-white font-medium">
                          {item.score.toFixed(1)}
                        </span>
                        <div className="flex items-center space-x-1">
                          {item.trend >= 0 ? (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                          <span
                            className={`text-sm ${
                              item.trend >= 0
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
                            {item.trend >= 0 ? "+" : ""}
                            {item.trend.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="acquisition" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Source Performance */}
            <Card className="border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">
                  Lead Source Performance
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Conversion rates by acquisition channel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.leadSources}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="source" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="leads" fill="#3B82F6" name="Total Leads" />
                    <Bar
                      dataKey="conversions"
                      fill="#10B981"
                      name="Conversions"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Conversion Rate Analysis */}
            <Card className="border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">
                  Conversion Rate Analysis
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Effectiveness of each lead source
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.leadSources
                    .sort((a, b) => b.conversionRate - a.conversionRate)
                    .map((source, index) => (
                      <div
                        key={source.source}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0
                                ? "bg-green-500 text-white"
                                : index === 1
                                ? "bg-blue-500 text-white"
                                : index === 2
                                ? "bg-yellow-500 text-black"
                                : "bg-slate-600 text-white"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {source.source}
                            </div>
                            <div className="text-sm text-slate-400">
                              {formatNumber(source.leads)} leads
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-white">
                            {source.conversionRate.toFixed(1)}%
                          </div>
                          <div className="text-sm text-slate-400">
                            {formatNumber(source.conversions)} conversions
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Type Distribution */}
            <Card className="border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">
                  Customer Type Distribution
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Individual vs Fleet customer breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Individual",
                          value: data.individualCustomers,
                          percentage: (
                            (data.individualCustomers / data.totalCustomers) *
                            100
                          ).toFixed(1),
                        },
                        {
                          name: "Fleet",
                          value: data.fleetCustomers,
                          percentage: (
                            (data.fleetCustomers / data.totalCustomers) *
                            100
                          ).toFixed(1),
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) =>
                        `${name}: ${percentage}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#06B6D4" />
                      <Cell fill="#10B981" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subscription Adoption */}
            <Card className="border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">
                  Subscription Adoption
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Battery subscription vs ownership preference
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300">
                        Subscription Adoption Rate
                      </span>
                      <span className="text-white font-medium">
                        {data.subscriptionAdoptionRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={data.subscriptionAdoptionRate}
                      className="h-3"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300">
                        Customer Retention Rate
                      </span>
                      <span className="text-white font-medium">
                        {data.customerRetentionRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={data.customerRetentionRate}
                      className="h-3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="text-center p-4 rounded-lg bg-slate-700/30">
                      <div className="text-2xl font-bold text-cyan-400">
                        {Math.round(data.subscriptionAdoptionRate)}%
                      </div>
                      <div className="text-sm text-slate-400">
                        Choose Subscription
                      </div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-slate-700/30">
                      <div className="text-2xl font-bold text-green-400">
                        {Math.round(100 - data.subscriptionAdoptionRate)}%
                      </div>
                      <div className="text-sm text-slate-400">Own Battery</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
