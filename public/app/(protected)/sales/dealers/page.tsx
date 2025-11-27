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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TrendingUp,
  Star,
  Users,
  DollarSign,
  Award,
  MapPin,
  RefreshCw,
  Download,
  Activity,
  AlertCircle,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DealerPerformance {
  dealerName: string;
  dealerAddress: string;
  city: string;
  region: string;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  customerSatisfactionScore: number;
  deliveryRating: number;
  salesGrowth: number;
  revenueGrowth: number;
  topSalesperson: string;
  salespeople: Array<{
    name: string;
    sales: number;
    revenue: number;
    conversionRate: number;
    customerRating: number;
  }>;
  monthlyPerformance: Array<{
    month: string;
    sales: number;
    revenue: number;
    targets: number;
    achievement: number;
  }>;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF7C7C",
];

export default function DealerPerformancePage() {
  const [data, setData] = useState<DealerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDealer, setSelectedDealer] =
    useState<DealerPerformance | null>(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/sales/dealers");
      const result = await response.json();
      setData(result);
      if (result.length > 0 && !selectedDealer) {
        setSelectedDealer(result[0]);
      }
    } catch (error) {
      console.error("Error fetching dealer performance:", error);
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
              Loading Dealer Data
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Dealer Performance
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Loading comprehensive dealer and salesperson analytics...
          </p>
        </div>
      </div>
    );
  }

  if (!data.length) {
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
            Dealer Performance
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Failed to load dealer data. Please try again.
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

  const totalSales = data.reduce((sum, dealer) => sum + dealer.totalSales, 0);
  const totalRevenue = data.reduce(
    (sum, dealer) => sum + dealer.totalRevenue,
    0
  );
  const averageSatisfaction =
    data.reduce((sum, dealer) => sum + dealer.customerSatisfactionScore, 0) /
    data.length;

  // Sort dealers by performance
  const topPerformers = [...data].sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );
  const regionPerformance = data.reduce((acc, dealer) => {
    if (!acc[dealer.region]) {
      acc[dealer.region] = { sales: 0, revenue: 0, dealers: 0 };
    }
    acc[dealer.region].sales += dealer.totalSales;
    acc[dealer.region].revenue += dealer.totalRevenue;
    acc[dealer.region].dealers += 1;
    return acc;
  }, {} as Record<string, { sales: number; revenue: number; dealers: number }>);

  const regionData = Object.entries(regionPerformance).map(
    ([region, data]) => ({
      region,
      ...data,
      averageRevenue: data.revenue / data.dealers,
    })
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
          <Building2 className="h-4 w-4 text-cyan-400 mr-2" />
          <span className="text-cyan-400 text-sm font-medium">
            Dealer Analytics
          </span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Dealer Performance Dashboard
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Comprehensive dealer network performance analysis with individual and
          regional insights.
        </p>
        
      </div>

      {/* Network Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Network Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">
                {formatNumber(totalSales)}
              </div>
              <Users className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="text-sm text-slate-400 mt-2">
              Across {data.length} dealers
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Network Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">
                {formatCurrency(totalRevenue)}
              </div>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-sm text-slate-400 mt-2">
              Network performance
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Average Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">
                {averageSatisfaction.toFixed(1)}
              </div>
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="flex items-center mt-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(averageSatisfaction)
                      ? "text-yellow-500 fill-current"
                      : "text-slate-600"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-white">
                {topPerformers[0]?.dealerName.split(" ")[0]}
              </div>
              <Award className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-sm text-slate-400 mt-2">
              {formatCurrency(topPerformers[0]?.totalRevenue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="border-slate-700/50 backdrop-blur-sm">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-slate-700"
          >
            Network Overview
          </TabsTrigger>
          <TabsTrigger
            value="individual"
            className="data-[state=active]:bg-slate-700"
          >
            Individual Performance
          </TabsTrigger>
          <TabsTrigger
            value="salespeople"
            className="data-[state=active]:bg-slate-700"
          >
            Salesperson Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dealer Rankings */}
            <Card className="border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">
                  Top Performing Dealers
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Ranked by total revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers.slice(0, 6).map((dealer, index) => (
                    <div
                      key={dealer.dealerName}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0
                              ? "bg-yellow-500 text-black"
                              : index === 1
                              ? "bg-slate-400 text-black"
                              : index === 2
                              ? "bg-amber-600 text-white"
                              : "bg-slate-600 text-white"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {dealer.dealerName}
                          </div>
                          <div className="text-sm text-slate-400">
                            {dealer.city}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white">
                          {formatCurrency(dealer.totalRevenue)}
                        </div>
                        <div className="text-sm text-slate-400">
                          {dealer.totalSales} sales
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Distribution */}
            <Card className="border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">
                  Revenue Distribution
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Revenue share by dealer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topPerformers.slice(0, 6).map((dealer) => ({
                        name: dealer.dealerName.split(" ")[0],
                        value: dealer.totalRevenue,
                        percentage: (
                          (dealer.totalRevenue / totalRevenue) *
                          100
                        ).toFixed(1),
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) =>
                        `${name}: ${percentage}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {topPerformers.slice(0, 6).map((entry, index) => (
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
          </div>

          {/* Network Performance Trends */}
          <Card className="border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">
                Network Performance Comparison
              </CardTitle>
              <CardDescription className="text-slate-400">
                Sales vs Revenue performance by dealer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topPerformers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="dealerName"
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                    fontSize={12}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "totalRevenue"
                        ? formatCurrency(value)
                        : formatNumber(value),
                      name === "totalRevenue" ? "Revenue" : "Sales",
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="totalSales" fill="#06B6D4" name="Sales Count" />
                  <Bar dataKey="totalRevenue" fill="#10B981" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dealer Selection */}
            <Card className="border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Select Dealer</CardTitle>
                <CardDescription className="text-slate-400">
                  Choose a dealer to view detailed performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.map((dealer) => (
                    <button
                      key={dealer.dealerName}
                      onClick={() => setSelectedDealer(dealer)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedDealer?.dealerName === dealer.dealerName
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-700/30 text-slate-300 hover:bg-slate-700/50"
                      }`}
                    >
                      <div className="font-medium">{dealer.dealerName}</div>
                      <div className="text-sm opacity-75">
                        {dealer.city} • {dealer.totalSales} sales
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selected Dealer Details */}
            {selectedDealer && (
              <div className="lg:col-span-2 space-y-6">
                {/* Dealer Info Card */}
                <Card className="border-slate-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-cyan-500" />
                      {selectedDealer.dealerName}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {selectedDealer.dealerAddress}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                          {selectedDealer.totalSales}
                        </div>
                        <div className="text-sm text-slate-400">
                          Total Sales
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                          {formatCurrency(selectedDealer.totalRevenue)}
                        </div>
                        <div className="text-sm text-slate-400">Revenue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                          {selectedDealer.customerSatisfactionScore.toFixed(1)}
                        </div>
                        <div className="text-sm text-slate-400">
                          Satisfaction
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                          {selectedDealer.deliveryRating.toFixed(1)}
                        </div>
                        <div className="text-sm text-slate-400">
                          Delivery Rating
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-slate-400">
                          Sales Growth:
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            selectedDealer.salesGrowth >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {selectedDealer.salesGrowth >= 0 ? "+" : ""}
                          {selectedDealer.salesGrowth.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-purple-500" />
                        <span className="text-sm text-slate-400">
                          Top Salesperson:
                        </span>
                        <span className="text-sm font-medium text-white">
                          {selectedDealer.topSalesperson}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Performance */}
                <Card className="border-slate-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Monthly Performance
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Sales vs targets throughout the year
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={selectedDealer.monthlyPerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1F2937",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          stroke="#06B6D4"
                          strokeWidth={2}
                          name="Actual Sales"
                        />
                        <Line
                          type="monotone"
                          dataKey="targets"
                          stroke="#EF4444"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Targets"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="salespeople" className="space-y-6">
          {selectedDealer && (
            <Card className="border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">
                  Salesperson Performance - {selectedDealer.dealerName}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Individual salesperson metrics and rankings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-400">
                          Rank
                        </th>
                        <th className="text-left py-3 px-4 text-slate-400">
                          Salesperson
                        </th>
                        <th className="text-left py-3 px-4 text-slate-400">
                          Sales
                        </th>
                        <th className="text-left py-3 px-4 text-slate-400">
                          Revenue
                        </th>
                        <th className="text-left py-3 px-4 text-slate-400">
                          Conversion Rate
                        </th>
                        <th className="text-left py-3 px-4 text-slate-400">
                          Customer Rating
                        </th>
                        <th className="text-left py-3 px-4 text-slate-400">
                          Performance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDealer.salespeople
                        .sort((a, b) => b.revenue - a.revenue)
                        .map((salesperson, index) => (
                          <tr
                            key={salesperson.name}
                            className="border-b border-slate-800 hover:bg-slate-800/30"
                          >
                            <td className="py-3 px-4">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  index === 0
                                    ? "bg-yellow-500 text-black"
                                    : index === 1
                                    ? "bg-slate-400 text-black"
                                    : index === 2
                                    ? "bg-amber-600 text-white"
                                    : "bg-slate-600 text-white"
                                }`}
                              >
                                {index + 1}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={`/placeholder.svg?height=32&width=32`}
                                  />
                                  <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                                    {salesperson.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-slate-300 font-medium">
                                  {salesperson.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {salesperson.sales}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {formatCurrency(salesperson.revenue)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  salesperson.conversionRate >= 80
                                    ? "default"
                                    : salesperson.conversionRate >= 70
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {salesperson.conversionRate.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-1">
                                <span className="text-slate-300">
                                  {salesperson.customerRating.toFixed(1)}
                                </span>
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  index === 0
                                    ? "default"
                                    : index <= 2
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {index === 0
                                  ? "Top Performer"
                                  : index <= 2
                                  ? "High Performer"
                                  : "Standard"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
