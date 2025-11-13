"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  Users,
  TrendingUp,
  Battery,
  MapPin,
  Clock,
  DollarSign,
  AlertTriangle,
  Award,
  Activity,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Calendar,
  RefreshCw,
  Upload,
  BarChart3,
  Lightbulb,
} from "lucide-react";

// ============================================================================
// BADGE COMPONENT
// ============================================================================
const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
    warning: "bg-yellow-600 text-white hover:bg-yellow-700",
    outline: "text-gray-700 border border-gray-300 bg-white hover:bg-gray-50",
  };
  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const CustomerBehaviorDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30days");
  const [selectedProfile, setSelectedProfile] = useState(null);

  // ============================================================================
  // MOCK DATA
  // ============================================================================
  const usageFrequencyData = [
    {
      name: "Heavy Users",
      value: 450,
      color: "#10b981",
      revenue: 675000,
      avgSwaps: 28,
      growthRate: 15.5,
    },
    {
      name: "Moderate Users",
      value: 1200,
      color: "#3b82f6",
      revenue: 960000,
      avgSwaps: 12,
      growthRate: 8.2,
    },
    {
      name: "Low Users",
      value: 850,
      color: "#f59e0b",
      revenue: 340000,
      avgSwaps: 4,
      growthRate: -2.1,
    },
    {
      name: "Dormant",
      value: 320,
      color: "#ef4444",
      revenue: 0,
      avgSwaps: 0,
      growthRate: -25.3,
    },
  ];

  const distancePatternData = [
    {
      name: "Short Distance",
      users: 980,
      avgKm: 5.2,
      revenue: 294000,
      color: "#8b5cf6",
    },
    {
      name: "Long Distance",
      users: 640,
      avgKm: 28.5,
      revenue: 547200,
      color: "#ec4899",
    },
    {
      name: "Random",
      users: 420,
      avgKm: 15.3,
      revenue: 183960,
      color: "#f59e0b",
    },
  ];

  const timeOfDayData = [
    { hour: "6-9am", swaps: 450, revenue: 27000, efficiency: 85 },
    { hour: "9-11am", swaps: 180, revenue: 10800, efficiency: 65 },
    { hour: "11am-3pm", swaps: 320, revenue: 22400, efficiency: 78 },
    { hour: "3-5pm", swaps: 220, revenue: 13200, efficiency: 70 },
    { hour: "5-9pm", swaps: 580, revenue: 40600, efficiency: 92 },
    { hour: "9pm-2am", swaps: 140, revenue: 11200, efficiency: 55 },
  ];

  const customerProfiles = [
    {
      name: "Daily Commuter",
      count: 680,
      revenue: 510000,
      churnRisk: "Low",
      avgSwaps: 15,
      ltv: 18000,
      satisfaction: 4.5,
      engagement: 92,
    },
    {
      name: "Delivery Rider",
      count: 520,
      revenue: 780000,
      churnRisk: "Low",
      avgSwaps: 30,
      ltv: 36000,
      satisfaction: 4.7,
      engagement: 98,
    },
    {
      name: "Long-Trip Explorer",
      count: 280,
      revenue: 252000,
      churnRisk: "Medium",
      avgSwaps: 18,
      ltv: 21600,
      satisfaction: 4.2,
      engagement: 75,
    },
    {
      name: "City Hopper",
      count: 450,
      revenue: 270000,
      churnRisk: "Medium",
      avgSwaps: 12,
      ltv: 14400,
      satisfaction: 4.3,
      engagement: 80,
    },
    {
      name: "Weekenders",
      count: 340,
      revenue: 102000,
      churnRisk: "High",
      avgSwaps: 6,
      ltv: 7200,
      satisfaction: 3.9,
      engagement: 45,
    },
    {
      name: "Dormant Rider",
      count: 320,
      revenue: 0,
      churnRisk: "Critical",
      avgSwaps: 0,
      ltv: 0,
      satisfaction: 3.2,
      engagement: 0,
    },
  ];

  const stationDependency = [
    { type: "Single-Station", value: 45, users: 1269 },
    { type: "Multi-Station", value: 38, users: 1071 },
    { type: "Rural Users", value: 17, users: 480 },
  ];

  const churnRiskData = [
    { risk: "Low Risk", count: 1200, percentage: 42, revenue: 1290000 },
    { risk: "Medium Risk", count: 730, percentage: 26, revenue: 522000 },
    { risk: "High Risk", count: 540, percentage: 19, revenue: 102000 },
    { risk: "Critical", count: 320, percentage: 13, revenue: 0 },
  ];

  const monthlyTrends = [
    { month: "May", users: 2450, swaps: 38200, revenue: 1145000 },
    { month: "Jun", users: 2580, swaps: 41300, revenue: 1239000 },
    { month: "Jul", users: 2650, swaps: 42800, revenue: 1284000 },
    { month: "Aug", users: 2720, swaps: 44500, revenue: 1335000 },
    { month: "Sep", users: 2790, swaps: 45680, revenue: 1370400 },
    { month: "Oct", users: 2820, swaps: 46200, revenue: 1386000 },
  ];

  const stationPerformance = [
    {
      station: "Colombo Central",
      swaps: 8500,
      revenue: 510000,
      utilization: 92,
      batteryHealth: 87,
    },
    {
      station: "Negombo Hub",
      swaps: 7200,
      revenue: 432000,
      utilization: 88,
      batteryHealth: 90,
    },
    {
      station: "Galle Road",
      swaps: 6800,
      revenue: 408000,
      utilization: 85,
      batteryHealth: 85,
    },
    {
      station: "Kandy Downtown",
      swaps: 5900,
      revenue: 354000,
      utilization: 78,
      batteryHealth: 88,
    },
    {
      station: "Dehiwala",
      swaps: 5400,
      revenue: 324000,
      utilization: 75,
      batteryHealth: 82,
    },
    {
      station: "Nugegoda",
      swaps: 4900,
      revenue: 294000,
      utilization: 72,
      batteryHealth: 86,
    },
  ];

  const customerJourney = [
    { stage: "New User", count: 420, conversion: 85 },
    { stage: "Active (1-3m)", count: 890, conversion: 78 },
    { stage: "Regular (3-6m)", count: 1050, conversion: 92 },
    { stage: "Loyal (6m+)", count: 460, conversion: 96 },
  ];

  const revenueBySegment = [
    { segment: "Daily Commuter", revenue: 510000, percentage: 26.6, trend: 12 },
    { segment: "Delivery Rider", revenue: 780000, percentage: 40.7, trend: 18 },
    {
      segment: "Long-Trip Explorer",
      revenue: 252000,
      percentage: 13.1,
      trend: 5,
    },
    { segment: "City Hopper", revenue: 270000, percentage: 14.1, trend: -3 },
    { segment: "Weekenders", revenue: 102000, percentage: 5.3, trend: -8 },
  ];

  const batteryHealthMetrics = [
    { metric: "Avg Health", value: 86.5, target: 85, status: "good" },
    { metric: "Swaps/Battery", value: 45, target: 50, status: "warning" },
    { metric: "Maintenance Rate", value: 8.2, target: 10, status: "good" },
    { metric: "Replacement Rate", value: 3.5, target: 5, status: "good" },
  ];

  const behaviorRadarData = [
    { behavior: "Frequency", heavy: 95, moderate: 65, low: 30 },
    { behavior: "Revenue", heavy: 90, moderate: 60, low: 25 },
    { behavior: "Loyalty", heavy: 88, moderate: 70, low: 40 },
    { behavior: "Engagement", heavy: 92, moderate: 55, low: 20 },
    { behavior: "Satisfaction", heavy: 85, moderate: 75, low: 60 },
  ];

  const weekdayPatterns = [
    { day: "Mon", swaps: 7200, revenue: 432000 },
    { day: "Tue", swaps: 7450, revenue: 447000 },
    { day: "Wed", swaps: 7100, revenue: 426000 },
    { day: "Thu", swaps: 7380, revenue: 442800 },
    { day: "Fri", swaps: 8100, revenue: 486000 },
    { day: "Sat", swaps: 5850, revenue: 351000 },
    { day: "Sun", swaps: 3600, revenue: 216000 },
  ];

  const COLORS = [
    "#10b981",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];
  const RISK_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

  // ============================================================================
  // REUSABLE COMPONENTS
  // ============================================================================
  const MetricCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    trend,
    color,
    badge,
  }) => (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 border-l-4" style={{ borderLeftColor: color }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {title}
              {badge && <Badge variant="secondary">{badge}</Badge>}
            </p>
            <h3 className="text-3xl font-bold mt-2" style={{ color }}>
              {value}
            </h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="bg-muted p-3 rounded-lg">
            <Icon size={24} style={{ color }} />
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-4 flex items-center text-sm">
            {trend > 0 ? (
              <>
                <ArrowUpRight size={16} className="text-green-600 mr-1" />
                <span className="text-green-600 font-medium">+{trend}%</span>
              </>
            ) : (
              <>
                <ArrowDownRight size={16} className="text-red-600 mr-1" />
                <span className="text-red-600 font-medium">{trend}%</span>
              </>
            )}
            <span className="text-muted-foreground ml-1">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );

  const StatCard = ({ label, value, change, icon: Icon, color }) => (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon size={18} style={{ color }} />}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold" style={{ color }}>
          {value}
        </span>
        {change !== undefined && (
          <span
            className={`text-sm font-medium ${
              change >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {change >= 0 ? "+" : ""}
            {change}%
          </span>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // TAB CONTENT RENDERERS
  // ============================================================================
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={Users}
          title="Total Active Users"
          value="2,820"
          subtitle="Active in last 30 days"
          trend={12.5}
          color="#3b82f6"
          badge="Live"
        />
        <MetricCard
          icon={Battery}
          title="Total Swaps"
          value="46,200"
          subtitle="This month"
          trend={18.3}
          color="#10b981"
        />
        <MetricCard
          icon={DollarSign}
          title="Monthly Revenue"
          value="LKR 1.39M"
          subtitle="From battery swaps"
          trend={15.7}
          color="#f59e0b"
        />
        <MetricCard
          icon={AlertTriangle}
          title="Churn Risk"
          value="860"
          subtitle="Users at risk"
          trend={-5.2}
          color="#ef4444"
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Avg Swaps/User"
          value="16.4"
          change={8.2}
          icon={Activity}
          color="#3b82f6"
        />
        <StatCard
          label="Revenue/Swap"
          value="LKR 60"
          change={3.5}
          icon={DollarSign}
          color="#10b981"
        />
        <StatCard
          label="Customer LTV"
          value="LKR 21K"
          change={12.8}
          icon={Award}
          color="#8b5cf6"
        />
        <StatCard
          label="Satisfaction"
          value="4.4/5"
          change={2.1}
          icon={Target}
          color="#f59e0b"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold leading-none tracking-tight">
                Growth Trends
              </h3>
              <select className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent px-3 py-1.5">
                <option>Last 6 Months</option>
                <option>Last 12 Months</option>
                <option>This Year</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis yAxisId="left" stroke="#3b82f6" />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                <Tooltip />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="users"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                  name="Active Users"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Revenue (LKR)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Usage Frequency Pie */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">
              Usage Frequency Distribution
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={usageFrequencyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) =>
                    `${name} ${(percentage * 100).toFixed(0)}%`
                  }
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {usageFrequencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {usageFrequencyData.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-muted rounded hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Time Patterns & Weekday Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">
              Time-of-Day Swap Patterns
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeOfDayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" stroke="#666" />
                <YAxis yAxisId="left" stroke="#3b82f6" />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="swaps"
                  fill="#3b82f6"
                  name="Swaps"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="efficiency"
                  fill="#10b981"
                  name="Efficiency %"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">
              Weekly Pattern Analysis
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weekdayPatterns}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="swaps"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  name="Swaps"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfiles = () => (
    <div className="space-y-6">
      {/* Profile Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Award size={32} />
            <span className="text-3xl font-bold">1,200</span>
          </div>
          <h4 className="text-xl font-semibold mb-2">High Value Customers</h4>
          <p className="text-blue-100 text-sm">Contributing 67% of revenue</p>
        </div>
        <div className="rounded-lg border bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp size={32} />
            <span className="text-3xl font-bold">94%</span>
          </div>
          <h4 className="text-xl font-semibold mb-2">Retention Rate</h4>
          <p className="text-green-100 text-sm">For loyal customers (6m+)</p>
        </div>
        <div className="rounded-lg border bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Zap size={32} />
            <span className="text-3xl font-bold">LKR 21K</span>
          </div>
          <h4 className="text-xl font-semibold mb-2">Avg Customer LTV</h4>
          <p className="text-purple-100 text-sm">Lifetime value per user</p>
        </div>
      </div>

      {/* Detailed Profile Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold leading-none tracking-tight">
              Customer Behavior Profiles
            </h3>
            <div className="flex gap-2">
              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                <Download size={16} className="mr-2" />
                Export
              </button>
              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent h-10 px-4 py-2">
                <Filter size={16} className="mr-2" />
                Filter
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-4 px-4 font-semibold text-sm">
                    Profile Type
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-sm">
                    Users
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-sm">
                    Revenue
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-sm">
                    Avg Swaps
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-sm">
                    LTV
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-sm">
                    Satisfaction
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-sm">
                    Risk
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-sm">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {customerProfiles.map((profile, idx) => (
                  <tr
                    key={idx}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        >
                          {profile.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold">{profile.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {profile.engagement}% engaged
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4 font-medium">
                      {profile.count.toLocaleString()}
                    </td>
                    <td className="text-right py-4 px-4 font-medium">
                      LKR {(profile.revenue / 1000).toFixed(0)}K
                    </td>
                    <td className="text-right py-4 px-4">{profile.avgSwaps}</td>
                    <td className="text-right py-4 px-4 font-medium">
                      LKR {(profile.ltv / 1000).toFixed(0)}K
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="font-medium">
                          {profile.satisfaction}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <Badge
                        variant={
                          profile.churnRisk === "Low"
                            ? "success"
                            : profile.churnRisk === "Medium"
                            ? "warning"
                            : profile.churnRisk === "High"
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {profile.churnRisk}
                      </Badge>
                    </td>
                    <td className="text-center py-4 px-4">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline">
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Behavior Radar & Revenue Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">
              Behavior Pattern Comparison
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={behaviorRadarData}>
                <PolarGrid stroke="#e0e0e0" />
                <PolarAngleAxis dataKey="behavior" stroke="#666" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Heavy Users"
                  dataKey="heavy"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Moderate Users"
                  dataKey="moderate"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.4}
                />
                <Radar
                  name="Low Users"
                  dataKey="low"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.3}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">
              Revenue Distribution by Segment
            </h3>
            <div className="space-y-4 mt-6">
              {revenueBySegment.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">{item.segment}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">
                        LKR {(item.revenue / 1000).toFixed(0)}K
                      </span>
                      <Badge
                        variant={item.trend >= 0 ? "success" : "destructive"}
                      >
                        {item.trend >= 0 ? "+" : ""}
                        {item.trend}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: COLORS[idx % COLORS.length],
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.percentage}% of total revenue
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Journey */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold leading-none tracking-tight mb-6">
            Customer Journey Funnel
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {customerJourney.map((stage, idx) => (
              <div key={idx} className="relative">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-center border-2 border-blue-200 hover:shadow-lg transition-shadow">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {stage.count}
                  </div>
                  <div className="text-sm font-semibold text-gray-700 mb-3">
                    {stage.stage}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${stage.conversion}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground mt-2 block">
                    {stage.conversion}% retention
                  </span>
                </div>
                {idx < customerJourney.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-blue-300 text-2xl">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderChurn = () => (
    <div className="space-y-6">
      {/* Churn Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {churnRiskData.map((item, idx) => (
          <div key={idx} className="rounded-lg border bg-card shadow-sm">
            <div
              className="p-6 border-t-4"
              style={{ borderTopColor: RISK_COLORS[idx] }}
            >
              <div className="flex items-center justify-between mb-4">
                <AlertTriangle size={24} style={{ color: RISK_COLORS[idx] }} />
                <span
                  className="text-3xl font-bold"
                  style={{ color: RISK_COLORS[idx] }}
                >
                  {item.count}
                </span>
              </div>
              <h4 className="font-semibold mb-2">{item.risk}</h4>
              <p className="text-sm text-muted-foreground">
                Revenue: LKR {(item.revenue / 1000).toFixed(0)}K
              </p>
              <div className="mt-3 w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: RISK_COLORS[idx],
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Churn Risk Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">
              Churn Risk Distribution
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={churnRiskData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ risk, percentage }) => `${risk}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {churnRiskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">
              Revenue at Risk Analysis
            </h3>
            <div className="space-y-4">
              {churnRiskData.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{item.risk}</span>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: RISK_COLORS[idx] }}
                    >
                      {item.count}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mb-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: RISK_COLORS[idx],
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.percentage}% of users
                    </span>
                    <span className="font-semibold">
                      LKR {(item.revenue / 1000).toFixed(0)}K at risk
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alert Section */}
      <div className="rounded-lg border bg-gradient-to-r from-red-50 via-orange-50 to-red-50 shadow-sm">
        <div className="p-6 border-l-4 border-red-500">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-red-800 mb-4">
                ⚠️ Immediate Action Required
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">
                    Critical Churn Risk
                  </p>
                  <p className="text-3xl font-bold text-red-600 mb-1">320</p>
                  <p className="text-xs text-muted-foreground">
                    No swaps in 30+ days
                  </p>
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-xs font-medium text-red-700">
                      🔥 Urgent intervention needed
                    </span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">
                    Revenue at Risk
                  </p>
                  <p className="text-3xl font-bold text-orange-600 mb-1">
                    LKR 624K
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Potential monthly loss
                  </p>
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-xs font-medium text-orange-700">
                      💰 32% of at-risk revenue
                    </span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2">
                    Win-back Campaign
                  </p>
                  <p className="text-3xl font-bold text-blue-600 mb-1">860</p>
                  <p className="text-xs text-muted-foreground">
                    Users targeted
                  </p>
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-xs font-medium text-blue-700">
                      📧 Campaign ready to deploy
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors bg-red-600 text-white hover:bg-red-700 h-10 px-6 py-2">
                  <Zap size={18} className="mr-2" />
                  Launch Win-back Campaign
                </button>
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border-2 border-red-600 text-red-600 bg-white hover:bg-red-50 h-10 px-6 py-2">
                  View Detailed Report
                </button>
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent h-10 px-6 py-2">
                  Export List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Churn Prediction Insights */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold leading-none tracking-tight mb-6">
            Churn Prediction Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-4">Top Churn Risk Indicators</h4>
              <div className="space-y-3">
                {[
                  {
                    indicator: "No swap in 30+ days",
                    impact: 95,
                    color: "#ef4444",
                  },
                  {
                    indicator: "Declining swap frequency",
                    impact: 78,
                    color: "#f59e0b",
                  },
                  {
                    indicator: "Low engagement score",
                    impact: 65,
                    color: "#f59e0b",
                  },
                  {
                    indicator: "Single station dependency",
                    impact: 52,
                    color: "#3b82f6",
                  },
                  { indicator: "Payment issues", impact: 48, color: "#3b82f6" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">
                          {item.indicator}
                        </span>
                        <span className="text-sm font-bold">
                          {item.impact}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${item.impact}%`,
                            backgroundColor: item.color,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">
                Recommended Retention Actions
              </h4>
              <div className="space-y-3">
                {[
                  {
                    action: "Send personalized discount (20% off)",
                    success: "68% success rate",
                    icon: "🎁",
                  },
                  {
                    action: "Free battery swap coupon",
                    success: "72% success rate",
                    icon: "🔋",
                  },
                  {
                    action: "Engagement push notification",
                    success: "45% success rate",
                    icon: "📱",
                  },
                  {
                    action: "Loyalty rewards reminder",
                    success: "58% success rate",
                    icon: "⭐",
                  },
                  {
                    action: "Customer service outreach",
                    success: "82% success rate",
                    icon: "☎️",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-muted rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.success}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStations = () => (
    <div className="space-y-6">
      {/* Station Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          label="Total Stations"
          value="6"
          icon={MapPin}
          color="#3b82f6"
        />
        <StatCard
          label="Avg Utilization"
          value="82%"
          change={5.2}
          icon={Activity}
          color="#10b981"
        />
        <StatCard
          label="Total Swaps"
          value="38,700"
          change={12.8}
          icon={Battery}
          color="#f59e0b"
        />
        <StatCard
          label="Avg Battery Health"
          value="86.5%"
          change={2.1}
          icon={Zap}
          color="#8b5cf6"
        />
      </div>

      {/* Station Performance Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold leading-none tracking-tight">
              Station Performance Metrics
            </h3>
            <div className="flex gap-2">
              <select className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent px-4 py-2">
                <option>All Regions</option>
                <option>Colombo</option>
                <option>Western Province</option>
              </select>
              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                View Map
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-4 px-4 font-semibold text-sm">
                    Station Name
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-sm">
                    Swaps
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-sm">
                    Revenue
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-sm">
                    Utilization
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-sm">
                    Battery Health
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-sm">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {stationPerformance.map((station, idx) => (
                  <tr
                    key={idx}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        >
                          {station.station.charAt(0)}
                        </div>
                        <span className="font-medium">{station.station}</span>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4 font-medium">
                      {station.swaps.toLocaleString()}
                    </td>
                    <td className="text-right py-4 px-4 font-medium">
                      LKR {(station.revenue / 1000).toFixed(0)}K
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="flex flex-col items-center">
                        <span className="font-bold mb-1">
                          {station.utilization}%
                        </span>
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${station.utilization}%`,
                              backgroundColor:
                                station.utilization >= 85
                                  ? "#10b981"
                                  : station.utilization >= 70
                                  ? "#f59e0b"
                                  : "#ef4444",
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <Badge
                        variant={
                          station.batteryHealth >= 85
                            ? "success"
                            : station.batteryHealth >= 80
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {station.batteryHealth}%
                      </Badge>
                    </td>
                    <td className="text-center py-4 px-4">
                      <Badge variant="success">
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1"></span>
                        Active
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Station Dependency & Distance Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">
              Station Dependency Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stationDependency}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, value }) => `${type}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stationDependency.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {stationDependency.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-2 bg-muted rounded"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    ></div>
                    <span className="text-sm font-medium">{item.type}</span>
                  </div>
                  <span className="text-sm font-bold">{item.users} users</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">
              Distance Travel Patterns
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distancePatternData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="users"
                  fill="#3b82f6"
                  name="User Count"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="avgKm"
                  fill="#10b981"
                  name="Avg KM"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Battery Health Metrics */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold leading-none tracking-tight mb-6">
            Battery Health & Maintenance Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {batteryHealthMetrics.map((metric, idx) => (
              <div
                key={idx}
                className="p-5 border-2 rounded-lg"
                style={{
                  borderColor: metric.status === "good" ? "#10b981" : "#f59e0b",
                }}
              >
                <p className="text-sm text-muted-foreground mb-2">
                  {metric.metric}
                </p>
                <div className="flex items-end justify-between mb-3">
                  <span
                    className="text-3xl font-bold"
                    style={{
                      color: metric.status === "good" ? "#10b981" : "#f59e0b",
                    }}
                  >
                    {metric.value}
                    {metric.metric.includes("%") ||
                    metric.metric.includes("Rate")
                      ? "%"
                      : ""}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Target: {metric.target}
                    {metric.metric.includes("%") ||
                    metric.metric.includes("Rate")
                      ? "%"
                      : ""}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(metric.value / metric.target) * 100}%`,
                      backgroundColor:
                        metric.status === "good" ? "#10b981" : "#f59e0b",
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Customer Behavior Analysis
            </h1>
            <p className="text-muted-foreground">
              Lencar EV Scooter & Battery Swapping Analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success" className="hidden sm:flex">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1"></span>
              Live
            </Badge>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent h-10 px-4 py-2">
              <Calendar size={18} className="mr-2" />
              {dateRange === "30days"
                ? "Last 30 Days"
                : dateRange === "90days"
                ? "Last 90 Days"
                : "This Year"}
            </button>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent h-10 px-4 py-2">
              <RefreshCw size={18} className="mr-2" />
              Refresh
            </button>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              <Download size={18} className="mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between overflow-x-auto">
        <div className="flex-1 inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "profiles", label: "Customer Profiles", icon: Users },
            { id: "churn", label: "Churn Analysis", icon: AlertTriangle },
            { id: "stations", label: "Station Analytics", icon: MapPin },
            { id: "insights", label: "Insights", icon: Lightbulb },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-background/50"
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && renderOverview()}
      {activeTab === "profiles" && renderProfiles()}
      {activeTab === "churn" && renderChurn()}
      {activeTab === "stations" && renderStations()}
      {activeTab === "insights" && (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-16">
              <Lightbulb className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-2xl font-semibold leading-none tracking-tight mb-2">
                AI-Powered Insights Coming Soon
              </h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                Advanced predictive analytics and personalized recommendations
                will be available here
              </p>
              <Badge variant="secondary">
                <Zap className="w-3 h-3 mr-1" /> In Development
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerBehaviorDashboard;
