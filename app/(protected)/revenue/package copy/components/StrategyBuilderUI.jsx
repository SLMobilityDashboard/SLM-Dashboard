"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import {
  Lightbulb,
  X,
  Heart,
  Star,
  ThumbsUp,
  Award,
  Frown,
  Meh,
  RefreshCw,
  Bike,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Activity,
  Target,
  PieChart,
  BarChart3,
  Info,
} from "lucide-react";

// Re-export Badge and InfoCard components
export const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-cyan-600 text-white hover:bg-cyan-700",
    secondary: "bg-slate-700 text-slate-100 hover:bg-slate-600",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline:
      "text-slate-100 border border-slate-600 bg-slate-800 hover:bg-slate-700",
    success: "bg-green-600 text-white hover:bg-green-700",
    warning: "bg-amber-600 text-white hover:bg-amber-700",
  };
  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
};

export const InfoCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  color = "cyan",
  trend,
  badgeText,
  badgeVariant,
}) => (
  <div
    className={`bg-slate-900/50 border border-${color}-500/20 backdrop-blur-sm rounded-lg p-6`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={`p-3 rounded-lg bg-${color}-500/10`}>
        <Icon className={`w-6 h-6 text-${color}-400`} />
      </div>
      {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
    </div>
    <div>
      <p className="text-sm text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      {trend && (
        <div
          className={`flex items-center gap-1 mt-2 text-sm ${
            trend.positive ? "text-green-400" : "text-red-400"
          }`}
        >
          {trend.positive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  </div>
);

// Helper functions
const getPackageTypeName = (type) => {
  const names = {
    swaps: "Swaps Only",
    home: "Home Charging Only",
    combo: "Swaps + Home Charging",
    "unlimited-swaps": "Unlimited Swaps",
    "unlimited-home": "Unlimited Home Charging",
    "unlimited-both": "Unlimited Both",
  };
  return names[type] || type;
};

const getSatisfactionColor = (score) => {
  if (score >= 80) return "#10b981";
  if (score >= 70) return "#06b6d4";
  if (score >= 60) return "#f59e0b";
  if (score >= 50) return "#f97316";
  return "#ef4444";
};

const getSegmentColor = (segment) => {
  const colors = {
    "Power Riders": "#10b981",
    "Steady Riders": "#06b6d4",
    "Casual Commuters": "#f59e0b",
    "Home Energizers": "#a855f7",
  };
  return colors[segment] || "#64748b";
};

// Import the calculateStrategy function (this would be imported from your data hook)
import { calculateStrategy } from "../hooks/useStrategyData";

// Main UI Component
export const StrategyBuilderUI = ({ data, actions }) => {
  const {
    segments,
    strategies,
    activeView,
    expandedStrategy,
    selectedSegment,
    currentStrategy,
    allBaselines,
    selectedSegmentData,
    selectedBaseline,
  } = data;

  const {
    setActiveView,
    setExpandedStrategy,
    setSelectedSegment,
    setCurrentStrategy,
    addStrategy,
    removeStrategy,
    resetAll,
  } = actions;

  if (segments.length === 0) return null;

  return (
    <div className="min-h-screen text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
            <Package className="w-10 h-10 text-cyan-400" />
            Advanced Package Strategy Builder
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Complete baseline analysis, customer satisfaction scoring, and
            profitability comparison
          </p>
        </div>
        <button
          onClick={resetAll}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg transition border border-slate-700 shadow-lg"
        >
          <RefreshCw className="w-5 h-5" />
          Reset All
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-900/50 p-1 border border-slate-800 rounded-lg backdrop-blur-sm inline-flex gap-1">
        {["baseline", "builder", "comparison", "satisfaction", "details"].map(
          (view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeView === view
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          )
        )}
      </div>

      {/* Baseline Analysis View */}
      {activeView === "baseline" && (
        <BaselineView
          segments={segments}
          selectedSegment={selectedSegment}
          selectedBaseline={selectedBaseline}
          selectedSegmentData={selectedSegmentData}
          allBaselines={allBaselines}
          onSegmentChange={setSelectedSegment}
        />
      )}

      {/* Builder View */}
      {activeView === "builder" && (
        <BuilderView
          currentStrategy={currentStrategy}
          segments={segments}
          onStrategyChange={setCurrentStrategy}
          onAddStrategy={addStrategy}
        />
      )}

      {/* Comparison View */}
      {activeView === "comparison" && strategies.length > 0 && (
        <ComparisonView
          strategies={strategies}
          segments={segments}
          onRemoveStrategy={removeStrategy}
          calculateStrategy={calculateStrategy}
        />
      )}

      {/* Satisfaction Analysis View */}
      {activeView === "satisfaction" && strategies.length > 0 && (
        <SatisfactionView
          strategies={strategies}
          onRemoveStrategy={removeStrategy}
        />
      )}

      {/* Details View */}
      {activeView === "details" && strategies.length > 0 && (
        <DetailsView
          strategies={strategies}
          expandedStrategy={expandedStrategy}
          onRemoveStrategy={removeStrategy}
          onExpandStrategy={setExpandedStrategy}
        />
      )}

      {/* Empty State */}
      {strategies.length === 0 &&
        (activeView === "comparison" ||
          activeView === "satisfaction" ||
          activeView === "details") && (
          <EmptyState onNavigateToBuilder={() => setActiveView("builder")} />
        )}
    </div>
  );
};

// View Components

const BaselineView = ({
  segments,
  selectedSegment,
  selectedBaseline,
  selectedSegmentData,
  allBaselines,
  onSegmentChange,
}) => (
  <div className="space-y-6">
    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-cyan-400" />
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">
            Baseline (PAYG) Analysis
          </h2>
          <p className="text-slate-400 text-sm">
            Current pay-as-you-go performance without packages
          </p>
        </div>
      </div>
      {/* Segment Selector */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block text-slate-300">
          Select Segment to Analyze
        </label>
        <select
          value={selectedSegment}
          onChange={(e) => onSegmentChange(e.target.value)}
          className="w-full max-w-md px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:border-cyan-500 focus:outline-none"
        >
          {segments.map((seg) => (
            <option key={seg.name} value={seg.name}>
              {seg.name} ({seg.count} customers)
            </option>
          ))}
        </select>
      </div>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <InfoCard
          icon={Users}
          title="Total Customers"
          value={selectedBaseline?.customerCount.toLocaleString()}
          subtitle={selectedSegmentData?.name}
          color="cyan"
        />
        <InfoCard
          icon={DollarSign}
          title="Annual Revenue"
          value={`LKR ${(selectedBaseline?.annualRevenue / 1000000).toFixed(
            2
          )}M`}
          subtitle={`LKR ${selectedBaseline?.revenuePerCustomer.toLocaleString()} per customer`}
          color="green"
        />
        <InfoCard
          icon={TrendingDown}
          title="Annual Costs"
          value={`LKR ${(selectedBaseline?.annualCosts / 1000000).toFixed(2)}M`}
          subtitle={`LKR ${selectedBaseline?.costPerCustomer.toLocaleString()} per customer`}
          color="red"
        />
        <InfoCard
          icon={TrendingUp}
          title="Annual Profit"
          value={`LKR ${(selectedBaseline?.profit / 1000000).toFixed(2)}M`}
          subtitle={`${selectedBaseline?.margin.toFixed(1)}% margin`}
          color="purple"
          badgeText={`LKR ${Math.round(
            selectedBaseline?.profitPerCustomer
          ).toLocaleString()}/customer`}
          badgeVariant="success"
        />
      </div>
      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            Revenue Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Swap Costs</span>
              <span className="text-slate-100 font-semibold">
                LKR {selectedBaseline?.annualSwapCosts.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Home Charge Costs</span>
              <span className="text-slate-100 font-semibold">
                LKR {selectedBaseline?.annualHomeCosts.toLocaleString()}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
              <span className="text-slate-200 font-semibold">
                Total Annual Costs
              </span>
              <span className="text-red-400 font-bold text-lg">
                LKR {selectedBaseline?.annualCosts.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Cost per customer: LKR{" "}
              {Math.round(selectedBaseline?.costPerCustomer).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      {/* All Segments Comparison */}
      <AllSegmentsComparison
        allBaselines={allBaselines}
        selectedSegment={selectedSegment}
      />
      {/* Charts */}
      <BaselineCharts allBaselines={allBaselines} />
    </div>
  </div>
);

const AllSegmentsComparison = ({ allBaselines, selectedSegment }) => (
  <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
    <h3 className="text-lg font-semibold text-slate-100 mb-4">
      All Segments Baseline Comparison
    </h3>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-slate-700">
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
              Segment
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
              Customers
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
              Annual Revenue
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
              Annual Costs
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
              Annual Profit
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
              Margin
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
              Profit/Customer
            </th>
          </tr>
        </thead>
        <tbody>
          {allBaselines.map((baseline, idx) => (
            <tr
              key={idx}
              className={`border-b border-slate-800 hover:bg-slate-800/30 transition ${
                baseline.segment === selectedSegment ? "bg-cyan-500/10" : ""
              }`}
            >
              <td className="py-3 px-4 text-sm font-medium text-slate-100">
                {baseline.segment}
              </td>
              <td className="text-right py-3 px-4 text-sm text-slate-300">
                {baseline.customerCount}
              </td>
              <td className="text-right py-3 px-4 text-sm text-slate-100 font-semibold">
                LKR {(baseline.annualRevenue / 1000000).toFixed(2)}M
              </td>
              <td className="text-right py-3 px-4 text-sm text-red-400">
                LKR {(baseline.annualCosts / 1000000).toFixed(2)}M
              </td>
              <td className="text-right py-3 px-4 text-sm text-green-400 font-bold">
                LKR {(baseline.profit / 1000000).toFixed(2)}M
              </td>
              <td className="text-right py-3 px-4 text-sm text-slate-100">
                {baseline.margin.toFixed(1)}%
              </td>
              <td className="text-right py-3 px-4 text-sm text-slate-100 font-semibold">
                LKR {Math.round(baseline.profitPerCustomer).toLocaleString()}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-600 bg-slate-800/50 font-bold">
            <td className="py-3 px-4 text-sm text-slate-100">TOTAL</td>
            <td className="text-right py-3 px-4 text-sm text-slate-100">
              {allBaselines.reduce((sum, b) => sum + b.customerCount, 0)}
            </td>
            <td className="text-right py-3 px-4 text-sm text-slate-100">
              LKR{" "}
              {(
                allBaselines.reduce((sum, b) => sum + b.annualRevenue, 0) /
                1000000
              ).toFixed(2)}
              M
            </td>
            <td className="text-right py-3 px-4 text-sm text-red-400">
              LKR{" "}
              {(
                allBaselines.reduce((sum, b) => sum + b.annualCosts, 0) /
                1000000
              ).toFixed(2)}
              M
            </td>
            <td className="text-right py-3 px-4 text-sm text-green-400">
              LKR{" "}
              {(
                allBaselines.reduce((sum, b) => sum + b.profit, 0) / 1000000
              ).toFixed(2)}
              M
            </td>
            <td className="text-right py-3 px-4 text-sm text-slate-100">
              {(
                (allBaselines.reduce((sum, b) => sum + b.profit, 0) /
                  allBaselines.reduce((sum, b) => sum + b.annualRevenue, 0)) *
                100
              ).toFixed(1)}
              %
            </td>
            <td className="text-right py-3 px-4 text-sm text-slate-100">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const BaselineCharts = ({ allBaselines }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">
        Revenue vs Profit by Segment
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={allBaselines}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="segment"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            angle={-20}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "2px solid #06b6d4",
              borderRadius: "8px",
              color: "#cbd5e1",
            }}
            formatter={(value) => `LKR ${(value / 1000000).toFixed(2)}M`}
          />
          <Legend />
          <Bar
            dataKey="annualRevenue"
            name="Revenue"
            fill="#10b981"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="profit"
            name="Profit"
            fill="#06b6d4"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">
        Profit Margin Comparison
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={allBaselines}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="segment"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            angle={-20}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "2px solid #06b6d4",
              borderRadius: "8px",
              color: "#cbd5e1",
            }}
            formatter={(value) => `${value.toFixed(1)}%`}
          />
          <Bar dataKey="margin" name="Profit Margin %" radius={[8, 8, 0, 0]}>
            {allBaselines.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getSegmentColor(entry.segment)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Builder View Component
const BuilderView = ({
  currentStrategy,
  segments,
  onStrategyChange,
  onAddStrategy,
}) => (
  <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
    <div className="flex items-center gap-2 mb-6">
      <Lightbulb className="w-6 h-6 text-yellow-500" />
      <h3 className="text-xl font-semibold text-slate-100">
        Create New Package Strategy
      </h3>
    </div>

    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className="text-sm font-medium mb-2 block text-slate-300">
          Strategy Name
        </label>
        <input
          type="text"
          value={currentStrategy.name}
          onChange={(e) =>
            onStrategyChange({ ...currentStrategy, name: e.target.value })
          }
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
          placeholder="e.g., Premium Bike + Swaps"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block text-slate-300">
          Target Segment
        </label>
        <select
          value={currentStrategy.targetSegment}
          onChange={(e) =>
            onStrategyChange({
              ...currentStrategy,
              targetSegment: e.target.value,
            })
          }
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
        >
          {segments.map((seg) => (
            <option key={seg.name} value={seg.name}>
              {seg.name} ({seg.count} customers)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block text-slate-300">
          Package Type
        </label>
        <select
          value={currentStrategy.packageType}
          onChange={(e) =>
            onStrategyChange({
              ...currentStrategy,
              packageType: e.target.value,
            })
          }
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
        >
          <option value="swaps">Swaps Only</option>
          <option value="home">Home Charging Only</option>
          <option value="combo">Swaps + Home Charging</option>
          <option value="unlimited-swaps">Unlimited Swaps</option>
          <option value="unlimited-home">Unlimited Home Charging</option>
          <option value="unlimited-both">Unlimited Both</option>
        </select>
      </div>

      {(currentStrategy.packageType === "swaps" ||
        currentStrategy.packageType === "combo") && (
        <div>
          <label className="text-sm font-medium mb-2 block text-slate-300">
            Swap Limit (per week)
          </label>
          <input
            type="number"
            value={currentStrategy.swapLimit}
            onChange={(e) =>
              onStrategyChange({
                ...currentStrategy,
                swapLimit: parseInt(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      )}

      {(currentStrategy.packageType === "home" ||
        currentStrategy.packageType === "combo") && (
        <div>
          <label className="text-sm font-medium mb-2 block text-slate-300">
            Home Charge Limit (per week)
          </label>
          <input
            type="number"
            value={currentStrategy.homeChargeLimit}
            onChange={(e) =>
              onStrategyChange({
                ...currentStrategy,
                homeChargeLimit: parseInt(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="text-sm font-medium mb-2 block text-slate-300">
          Weekly Service Price (LKR)
        </label>
        <input
          type="number"
          value={currentStrategy.price}
          onChange={(e) =>
            onStrategyChange({
              ...currentStrategy,
              price: parseFloat(e.target.value) || 0,
            })
          }
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block text-slate-300">
          Adoption Rate (%)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={currentStrategy.adoptionRate}
          onChange={(e) =>
            onStrategyChange({
              ...currentStrategy,
              adoptionRate: parseFloat(e.target.value) || 0,
            })
          }
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block text-slate-300">
          Utilization Rate (%)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={currentStrategy.utilizationRate}
          onChange={(e) =>
            onStrategyChange({
              ...currentStrategy,
              utilizationRate: parseFloat(e.target.value) || 0,
            })
          }
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block text-slate-300">
          Cost per Swap (LKR)
        </label>
        <input
          type="number"
          value={currentStrategy.costPerSwap}
          onChange={(e) =>
            onStrategyChange({
              ...currentStrategy,
              costPerSwap: parseFloat(e.target.value) || 0,
            })
          }
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block text-slate-300">
          Cost per Home Charge (LKR)
        </label>
        <input
          type="number"
          value={currentStrategy.costPerHomeCharge}
          onChange={(e) =>
            onStrategyChange({
              ...currentStrategy,
              costPerHomeCharge: parseFloat(e.target.value) || 0,
            })
          }
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
        />
      </div>
    </div>

    {/* Bike Lease Section */}
    <BikeLeaseSection
      currentStrategy={currentStrategy}
      onStrategyChange={onStrategyChange}
    />

    <button
      onClick={onAddStrategy}
      className="mt-6 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg text-lg"
    >
      Calculate & Add Strategy
    </button>
  </div>
);

const BikeLeaseSection = ({ currentStrategy, onStrategyChange }) => (
  <div className="mt-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
    <div className="flex items-center gap-3 mb-4">
      <input
        type="checkbox"
        id="includeBikeLease"
        checked={currentStrategy.includeBikeLease}
        onChange={(e) =>
          onStrategyChange({
            ...currentStrategy,
            includeBikeLease: e.target.checked,
          })
        }
        className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
      />
      <label
        htmlFor="includeBikeLease"
        className="flex items-center gap-2 text-lg font-semibold text-slate-100 cursor-pointer"
      >
        <Bike className="w-5 h-5 text-cyan-400" />
        Include Bike Lease Package
      </label>
    </div>

    {currentStrategy.includeBikeLease && (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
        <div>
          <label className="text-sm font-medium mb-2 block text-slate-300">
            Down Payment (LKR)
          </label>
          <input
            type="number"
            value={currentStrategy.bikeDownPayment}
            onChange={(e) =>
              onStrategyChange({
                ...currentStrategy,
                bikeDownPayment: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block text-slate-300">
            Monthly Lease Payment (LKR)
          </label>
          <input
            type="number"
            value={currentStrategy.monthlyLeasePayment}
            onChange={(e) =>
              onStrategyChange({
                ...currentStrategy,
                monthlyLeasePayment: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block text-slate-300">
            Lease Duration (months)
          </label>
          <input
            type="number"
            value={currentStrategy.leaseDurationMonths}
            onChange={(e) =>
              onStrategyChange({
                ...currentStrategy,
                leaseDurationMonths: parseInt(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block text-slate-300">
            Free Swaps Duration (months)
          </label>
          <input
            type="number"
            value={currentStrategy.freeSwapsDuration}
            onChange={(e) =>
              onStrategyChange({
                ...currentStrategy,
                freeSwapsDuration: parseInt(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
            placeholder="e.g., 3 for 3 months free"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block text-slate-300">
            Cost per Bike (LKR)
          </label>
          <input
            type="number"
            value={currentStrategy.costPerBike}
            onChange={(e) =>
              onStrategyChange({
                ...currentStrategy,
                costPerBike: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>
    )}
  </div>
);

// Comparison View Component
const ComparisonView = ({
  strategies,
  segments,
  onRemoveStrategy,
  calculateStrategy,
}) => (
  <div className="space-y-6">
    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
        <Target className="w-6 h-6 text-cyan-400" />
        Baseline vs Package Comparison
      </h2>

      {strategies.map((strategy, idx) => {
        const segment = segments.find((s) => s.name === strategy.targetSegment);
        const baseline = strategy.baseline;

        return (
          <div
            key={idx}
            className="mb-8 p-6 bg-slate-800/30 rounded-lg border-2 border-slate-700"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {strategy.includeBikeLease && (
                  <Bike className="w-6 h-6 text-purple-400" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-slate-100">
                    {strategy.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {strategy.targetSegment} •{" "}
                    {getPackageTypeName(strategy.packageType)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {strategy.isProfitable ? (
                  <Badge
                    variant="success"
                    className="text-sm px-3 py-1.5 flex items-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Beats Baseline
                  </Badge>
                ) : (
                  <Badge
                    variant="destructive"
                    className="text-sm px-3 py-1.5 flex items-center gap-1"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Below Baseline
                  </Badge>
                )}
                <button
                  onClick={() => onRemoveStrategy(idx)}
                  className="p-2 hover:bg-red-500/20 rounded text-red-400 transition border border-red-500/30"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div
                className={`p-4 rounded-lg border-2 ${
                  strategy.revenueChange >= 0
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <div className="text-xs text-slate-400 mb-1">
                  Revenue Change
                </div>
                <div
                  className={`text-2xl font-bold ${
                    strategy.revenueChange >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {strategy.revenueChange >= 0 ? "+" : ""}LKR{" "}
                  {(strategy.revenueChange / 1000000).toFixed(2)}M
                </div>
                <div className="text-sm text-slate-300 mt-1">
                  {strategy.revenueChangePercent >= 0 ? "+" : ""}
                  {strategy.revenueChangePercent.toFixed(1)}%
                </div>
              </div>

              <div className="p-4 rounded-lg border-2 border-red-500/30 bg-red-500/10">
                <div className="text-xs text-slate-400 mb-1">Cost Change</div>
                <div className="text-2xl font-bold text-red-400">
                  +LKR {(strategy.costChange / 1000000).toFixed(2)}M
                </div>
                <div className="text-sm text-slate-300 mt-1">
                  +{strategy.costChangePercent.toFixed(1)}%
                </div>
              </div>

              <div
                className={`p-4 rounded-lg border-2 ${
                  strategy.profitChange >= 0
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <div className="text-xs text-slate-400 mb-1">Profit Change</div>
                <div
                  className={`text-2xl font-bold ${
                    strategy.profitChange >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {strategy.profitChange >= 0 ? "+" : ""}LKR{" "}
                  {(strategy.profitChange / 1000000).toFixed(2)}M
                </div>
                <div className="text-sm text-slate-300 mt-1">
                  {strategy.profitChangePercent >= 0 ? "+" : ""}
                  {strategy.profitChangePercent.toFixed(1)}%
                </div>
              </div>

              <div className="p-4 rounded-lg border-2 border-cyan-500/30 bg-cyan-500/10">
                <div className="text-xs text-slate-400 mb-1">Satisfaction</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {strategy.satisfaction.overall}%
                </div>
                <div className="text-sm text-slate-300 mt-1">
                  {strategy.satisfaction.interestLevel}
                </div>
              </div>
            </div>

            {/* Detailed Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                      Metric
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                      Baseline (PAYG)
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                      With Package
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                      Change
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4 text-sm text-slate-300">
                      Total Revenue
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-slate-100 font-semibold">
                      LKR {(baseline.annualRevenue / 1000000).toFixed(2)}M
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-slate-100 font-semibold">
                      LKR {(strategy.totalRevenue / 1000000).toFixed(2)}M
                    </td>
                    <td
                      className="text-right py-3 px-4 text-sm font-bold"
                      style={{
                        color:
                          strategy.revenueChange >= 0 ? "#10b981" : "#ef4444",
                      }}
                    >
                      {strategy.revenueChange >= 0 ? "+" : ""}LKR{" "}
                      {(strategy.revenueChange / 1000000).toFixed(2)}M
                    </td>
                    <td className="text-center py-3 px-4">
                      {strategy.revenueChange >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4 text-sm text-slate-300">
                      Total Costs
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-slate-100 font-semibold">
                      LKR {(baseline.annualCosts / 1000000).toFixed(2)}M
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-slate-100 font-semibold">
                      LKR {(strategy.totalCost / 1000000).toFixed(2)}M
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-red-400 font-bold">
                      +LKR {(strategy.costChange / 1000000).toFixed(2)}M
                    </td>
                    <td className="text-center py-3 px-4">
                      <TrendingUp className="w-5 h-5 text-red-400 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800 bg-slate-800/30">
                    <td className="py-3 px-4 text-sm font-bold text-slate-100">
                      Net Profit
                    </td>
                    <td className="text-right py-3 px-4 text-sm font-bold text-green-400">
                      LKR {(baseline.profit / 1000000).toFixed(2)}M
                    </td>
                    <td
                      className="text-right py-3 px-4 text-sm font-bold"
                      style={{
                        color: strategy.netProfit > 0 ? "#10b981" : "#ef4444",
                      }}
                    >
                      LKR {(strategy.netProfit / 1000000).toFixed(2)}M
                    </td>
                    <td
                      className="text-right py-3 px-4 text-sm font-bold"
                      style={{
                        color:
                          strategy.profitChange >= 0 ? "#10b981" : "#ef4444",
                      }}
                    >
                      {strategy.profitChange >= 0 ? "+" : ""}LKR{" "}
                      {(strategy.profitChange / 1000000).toFixed(2)}M
                    </td>
                    <td className="text-center py-3 px-4">
                      {strategy.profitChange >= 0 ? (
                        <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4 text-sm text-slate-300">
                      Profit Margin
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-slate-100 font-semibold">
                      {baseline.margin.toFixed(1)}%
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-slate-100 font-semibold">
                      {strategy.profitMargin.toFixed(1)}%
                    </td>
                    <td
                      className="text-right py-3 px-4 text-sm font-bold"
                      style={{
                        color:
                          strategy.profitMargin - baseline.margin >= 0
                            ? "#10b981"
                            : "#ef4444",
                      }}
                    >
                      {strategy.profitMargin - baseline.margin >= 0 ? "+" : ""}
                      {(strategy.profitMargin - baseline.margin).toFixed(1)} pp
                    </td>
                    <td className="text-center py-3 px-4">
                      {strategy.profitMargin - baseline.margin >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Verdict Section */}
            <div
              className={`mt-6 p-4 rounded-lg border-2 ${
                strategy.isProfitable
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-red-500/50 bg-red-500/10"
              }`}
            >
              <div className="flex items-center gap-3">
                {strategy.isProfitable ? (
                  <CheckCircle className="w-8 h-8 text-green-400" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                )}
                <div>
                  <div className="text-lg font-bold text-slate-100">
                    {strategy.verdict}
                  </div>
                  <div className="text-sm text-slate-300">
                    {strategy.recommendation}
                  </div>
                </div>
              </div>
            </div>

            {/* Waterfall Chart */}
            <div className="mt-6 bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h4 className="text-lg font-semibold text-slate-100 mb-4">
                Profit Waterfall Analysis
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={[
                    {
                      name: "Baseline\nProfit",
                      value: baseline.profit,
                      cumulative: baseline.profit,
                    },
                    {
                      name: "Revenue\nIncrease",
                      value: strategy.revenueChange,
                      cumulative: baseline.profit + strategy.revenueChange,
                    },
                    {
                      name: "Cost\nIncrease",
                      value: -strategy.costChange,
                      cumulative:
                        baseline.profit +
                        strategy.revenueChange -
                        strategy.costChange,
                    },
                    {
                      name: "Final\nProfit",
                      value: 0,
                      cumulative: strategy.netProfit,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      border: "2px solid #06b6d4",
                      borderRadius: "8px",
                      color: "#cbd5e1",
                    }}
                    formatter={(value) =>
                      `LKR ${(value / 1000000).toFixed(2)}M`
                    }
                  />
                  <Bar dataKey="value" name="Change">
                    {[
                      baseline.profit,
                      strategy.revenueChange,
                      -strategy.costChange,
                      0,
                    ].map((value, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={value >= 0 ? "#10b981" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={{ r: 6 }}
                    name="Cumulative"
                  />
                  <ReferenceLine
                    y={baseline.profit}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label="Baseline"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Adoption Sensitivity Analysis */}
            <div className="mt-6 bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h4 className="text-lg font-semibold text-slate-100 mb-4">
                Adoption Rate Sensitivity
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={[20, 30, 40, 50, 60, 70, 80].map((rate) => {
                    const testStrategy = { ...strategy, adoptionRate: rate };
                    const result = calculateStrategy(testStrategy, segments);
                    return {
                      adoptionRate: rate,
                      profit: result.netProfit,
                      baseline: baseline.profit,
                      breakEven: baseline.profit,
                    };
                  })}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="adoptionRate"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    label={{
                      value: "Adoption Rate (%)",
                      position: "insideBottom",
                      offset: -5,
                      fill: "#94a3b8",
                    }}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      border: "2px solid #06b6d4",
                      borderRadius: "8px",
                      color: "#cbd5e1",
                    }}
                    formatter={(value) =>
                      `LKR ${(value / 1000000).toFixed(2)}M`
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    name="Package Profit"
                  />
                  <ReferenceLine
                    y={baseline.profit}
                    stroke="#10b981"
                    strokeDasharray="5 5"
                    label="Baseline"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// Satisfaction View Component
const SatisfactionView = ({ strategies, onRemoveStrategy }) => (
  <div className="space-y-6">
    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-6 h-6 text-red-400" />
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">
            Customer Satisfaction Analysis
          </h2>
          <p className="text-slate-400 text-sm">
            Detailed satisfaction scoring and sweet spot analysis
          </p>
        </div>
      </div>

      {/* Sweet Spot Scatter Plot */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Sweet Spot Analysis: Satisfaction vs Profitability
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              type="number"
              dataKey="satisfaction.overall"
              name="Satisfaction"
              domain={[0, 100]}
              tick={{ fill: "#94a3b8" }}
              label={{
                value: "Customer Satisfaction (%)",
                position: "insideBottom",
                offset: -10,
                fill: "#94a3b8",
              }}
            />
            <YAxis
              type="number"
              dataKey="profitMargin"
              name="Profit Margin"
              domain={[0, "dataMax + 10"]}
              tick={{ fill: "#94a3b8" }}
              label={{
                value: "Profit Margin (%)",
                angle: -90,
                position: "insideLeft",
                fill: "#94a3b8",
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border-2 border-cyan-500 rounded-lg p-4">
                      <p className="font-bold text-cyan-400 mb-2">
                        {data.name}
                      </p>
                      {data.includeBikeLease && (
                        <p className="text-purple-400 text-xs mb-1 flex items-center gap-1">
                          <Bike className="w-3 h-3" /> Includes Bike Lease
                        </p>
                      )}
                      <p className="text-slate-300 text-sm">
                        Satisfaction: {data.satisfaction.overall}%
                      </p>
                      <p className="text-slate-300 text-sm">
                        Profit Margin: {data.profitMargin.toFixed(1)}%
                      </p>
                      <p className="text-green-400 text-sm font-semibold">
                        Sweet Spot Score: {data.satisfaction.sweetSpotScore}
                      </p>
                      <p
                        className={`text-sm font-semibold mt-1 ${
                          data.isProfitable ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {data.isProfitable
                          ? "✅ Beats Baseline"
                          : "❌ Below Baseline"}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter data={strategies}>
              {strategies.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getSegmentColor(entry.targetSegment)}
                />
              ))}
            </Scatter>
            <ReferenceLine
              y={50}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label="50% Margin"
            />
            <ReferenceLine
              x={70}
              stroke="#06b6d4"
              strokeDasharray="5 5"
              label="70% Satisfaction"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Best Strategy Recommendation */}
      <BestStrategyRecommendation strategies={strategies} />

      {/* Satisfaction Breakdown by Strategy */}
      {strategies.map((strategy, idx) => (
        <SatisfactionBreakdown
          key={idx}
          strategy={strategy}
          index={idx}
          onRemoveStrategy={onRemoveStrategy}
        />
      ))}

      {/* Satisfaction Comparison Chart */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Satisfaction Metrics Comparison
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={strategies.map((s) => ({
              name: s.name.substring(0, 20) + (s.name.length > 20 ? "..." : ""),
              value: s.satisfaction.valueScore,
              flexibility: s.satisfaction.flexibilityScore,
              affordability: s.satisfaction.affordabilityScore,
              convenience: s.satisfaction.convenienceScore,
            }))}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              angle={-20}
              textAnchor="end"
              height={100}
            />
            <YAxis domain={[0, 25]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "2px solid #06b6d4",
                borderRadius: "8px",
                color: "#cbd5e1",
              }}
            />
            <Legend />
            <Bar dataKey="value" name="Value" fill="#10b981" stackId="a" />
            <Bar
              dataKey="flexibility"
              name="Flexibility"
              fill="#06b6d4"
              stackId="a"
            />
            <Bar
              dataKey="affordability"
              name="Affordability"
              fill="#f59e0b"
              stackId="a"
            />
            <Bar
              dataKey="convenience"
              name="Convenience"
              fill="#a855f7"
              stackId="a"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const BestStrategyRecommendation = ({ strategies }) => {
  const bestSweetSpot = strategies.reduce((best, current) =>
    current.satisfaction.sweetSpotScore > best.satisfaction.sweetSpotScore
      ? current
      : best
  );
  const bestProfitable = strategies
    .filter((s) => s.isProfitable)
    .reduce(
      (best, current) =>
        !best || current.netProfit > best.netProfit ? current : best,
      null
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-gradient-to-br from-yellow-950/30 to-amber-950/30 rounded-lg p-6 border-2 border-yellow-500/30">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Highest Sweet Spot Score
          </h4>
          <Badge variant="warning" className="text-sm">
            Score: {bestSweetSpot.satisfaction.sweetSpotScore}
          </Badge>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-xl font-bold text-slate-100">
              {bestSweetSpot.name}
            </div>
            <div className="text-sm text-slate-400">
              {bestSweetSpot.targetSegment}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500">Satisfaction</div>
              <div className="text-lg font-bold text-green-400">
                {bestSweetSpot.satisfaction.overall}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Profit Margin</div>
              <div className="text-lg font-bold text-cyan-400">
                {bestSweetSpot.profitMargin.toFixed(1)}%
              </div>
            </div>
          </div>
          <div
            className={`text-sm font-semibold ${
              bestSweetSpot.isProfitable ? "text-green-400" : "text-amber-400"
            }`}
          >
            {bestSweetSpot.isProfitable
              ? "✅ Beats baseline profit"
              : "⚠️ Below baseline - needs optimization"}
          </div>
        </div>
      </div>

      {bestProfitable && (
        <div className="bg-gradient-to-br from-green-950/30 to-emerald-950/30 rounded-lg p-6 border-2 border-green-500/30">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Most Profitable
            </h4>
            <Badge variant="success" className="text-sm">
              +{bestProfitable.profitChangePercent.toFixed(1)}%
            </Badge>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xl font-bold text-slate-100">
                {bestProfitable.name}
              </div>
              <div className="text-sm text-slate-400">
                {bestProfitable.targetSegment}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500">Net Profit</div>
                <div className="text-lg font-bold text-green-400">
                  LKR {(bestProfitable.netProfit / 1000000).toFixed(2)}M
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">vs Baseline</div>
                <div className="text-lg font-bold text-green-400">
                  +{(bestProfitable.profitChange / 1000000).toFixed(2)}M
                </div>
              </div>
            </div>
            <div className="text-sm font-semibold text-green-400">
              ✅ Recommended for launch
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SatisfactionBreakdown = ({ strategy, index, onRemoveStrategy }) => (
  <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 mb-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {strategy.includeBikeLease && (
          <Bike className="w-5 h-5 text-purple-400" />
        )}
        <h4 className="text-lg font-bold text-slate-100">{strategy.name}</h4>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          style={{
            backgroundColor: `${getSatisfactionColor(
              strategy.satisfaction.overall
            )}20`,
            color: getSatisfactionColor(strategy.satisfaction.overall),
            borderColor: getSatisfactionColor(strategy.satisfaction.overall),
          }}
        >
          {strategy.satisfaction.overall}% Overall
        </Badge>
        <Badge
          variant={
            strategy.satisfaction.interestLevel === "Very High"
              ? "success"
              : strategy.satisfaction.interestLevel === "High"
              ? "default"
              : strategy.satisfaction.interestLevel === "Moderate"
              ? "warning"
              : "destructive"
          }
        >
          {strategy.satisfaction.interestLevel}
        </Badge>
        <button
          onClick={() => onRemoveStrategy(index)}
          className="p-2 hover:bg-red-500/20 rounded text-red-400 transition border border-red-500/30"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        {
          label: "Value Proposition",
          score: strategy.satisfaction.valueScore,
          color: "#10b981",
        },
        {
          label: "Flexibility",
          score: strategy.satisfaction.flexibilityScore,
          color: "#06b6d4",
        },
        {
          label: "Affordability",
          score: strategy.satisfaction.affordabilityScore,
          color: "#f59e0b",
        },
        {
          label: "Convenience",
          score: strategy.satisfaction.convenienceScore,
          color: "#a855f7",
        },
      ].map((item, i) => (
        <div key={i} className="text-center">
          <div className="text-xs text-slate-400 mb-2">{item.label}</div>
          <div
            className="text-3xl font-bold mb-2"
            style={{ color: item.color }}
          >
            {item.score}%
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${item.score}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Details View Component
const DetailsView = ({
  strategies,
  expandedStrategy,
  onRemoveStrategy,
  onExpandStrategy,
}) => (
  <div className="space-y-6">
    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
        <Info className="w-6 h-6 text-cyan-400" />
        Detailed Strategy Breakdown
      </h3>

      {strategies.map((strategy, idx) => (
        <StrategyDetailCard
          key={idx}
          strategy={strategy}
          index={idx}
          isExpanded={expandedStrategy === idx}
          onRemoveStrategy={onRemoveStrategy}
          onExpandStrategy={onExpandStrategy}
        />
      ))}

      {/* Summary Comparison Table */}
      <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700 rounded-lg p-6 mt-8">
        <h3 className="text-xl font-semibold text-slate-100 mb-6">
          Strategy Comparison Table
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                  Strategy
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                  Segment
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                  Adopters
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                  Revenue
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                  Profit
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                  Margin
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                  vs Baseline
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">
                  Satisfaction
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-800 hover:bg-slate-800/30 transition"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {strategy.includeBikeLease && (
                        <Bike className="w-4 h-4 text-purple-400" />
                      )}
                      <span className="text-sm font-medium text-slate-100">
                        {strategy.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-300">
                    {strategy.targetSegment}
                  </td>
                  <td className="text-right py-3 px-4 text-sm text-slate-300">
                    {strategy.adopters} ({strategy.adoptionRate}%)
                  </td>
                  <td className="text-right py-3 px-4 text-sm text-slate-100 font-semibold">
                    LKR {(strategy.totalRevenue / 1000000).toFixed(2)}M
                  </td>
                  <td
                    className="text-right py-3 px-4 text-sm font-bold"
                    style={{
                      color: strategy.netProfit > 0 ? "#10b981" : "#ef4444",
                    }}
                  >
                    LKR {(strategy.netProfit / 1000000).toFixed(2)}M
                  </td>
                  <td className="text-right py-3 px-4 text-sm text-slate-100">
                    {strategy.profitMargin.toFixed(1)}%
                  </td>
                  <td
                    className="text-right py-3 px-4 text-sm font-bold"
                    style={{
                      color: strategy.profitChange >= 0 ? "#10b981" : "#ef4444",
                    }}
                  >
                    {strategy.profitChange >= 0 ? "+" : ""}
                    {strategy.profitChangePercent.toFixed(1)}%
                  </td>
                  <td className="text-center py-3 px-4">
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${getSatisfactionColor(
                          strategy.satisfaction.overall
                        )}20`,
                        color: getSatisfactionColor(
                          strategy.satisfaction.overall
                        ),
                        borderColor: getSatisfactionColor(
                          strategy.satisfaction.overall
                        ),
                      }}
                    >
                      {strategy.satisfaction.overall}%
                    </Badge>
                  </td>
                  <td className="text-center py-3 px-4">
                    {strategy.isProfitable ? (
                      <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

const StrategyDetailCard = ({
  strategy,
  index,
  isExpanded,
  onRemoveStrategy,
  onExpandStrategy,
}) => (
  <div className="mb-8 bg-slate-800/30 rounded-lg border border-slate-700 overflow-hidden">
    <div className="p-6 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {strategy.includeBikeLease && (
            <Bike className="w-6 h-6 text-purple-400" />
          )}
          <div>
            <h4 className="text-xl font-bold text-slate-100">
              {strategy.name}
            </h4>
            <p className="text-sm text-slate-400">
              {strategy.targetSegment} •{" "}
              {getPackageTypeName(strategy.packageType)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={strategy.isProfitable ? "success" : "destructive"}>
            {strategy.isProfitable ? "✅ Profitable" : "❌ Unprofitable"}
          </Badge>
          <button
            onClick={() => onExpandStrategy(isExpanded ? null : index)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-100 transition text-sm"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
          <button
            onClick={() => onRemoveStrategy(index)}
            className="p-2 hover:bg-red-500/20 rounded text-red-400 transition border border-red-500/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <div className="p-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          icon={Users}
          title="Adopters"
          value={strategy.adopters}
          subtitle={`${strategy.adoptionRate}% adoption rate`}
          color="cyan"
        />
        <InfoCard
          icon={DollarSign}
          title="Total Revenue"
          value={`LKR ${(strategy.totalRevenue / 1000000).toFixed(2)}M`}
          subtitle={`vs ${(strategy.baseline.annualRevenue / 1000000).toFixed(
            2
          )}M baseline`}
          color="green"
          trend={{
            positive: strategy.revenueChange >= 0,
            value: `${
              strategy.revenueChangePercent >= 0 ? "+" : ""
            }${strategy.revenueChangePercent.toFixed(1)}%`,
          }}
        />
        <InfoCard
          icon={TrendingDown}
          title="Total Costs"
          value={`LKR ${(strategy.totalCost / 1000000).toFixed(2)}M`}
          subtitle={`vs ${(strategy.baseline.annualCosts / 1000000).toFixed(
            2
          )}M baseline`}
          color="red"
          trend={{
            positive: false,
            value: `+${strategy.costChangePercent.toFixed(1)}%`,
          }}
        />
        <InfoCard
          icon={TrendingUp}
          title="Net Profit"
          value={`LKR ${(strategy.netProfit / 1000000).toFixed(2)}M`}
          subtitle={`${strategy.profitMargin.toFixed(1)}% margin`}
          color="purple"
          trend={{
            positive: strategy.profitChange >= 0,
            value: `${
              strategy.profitChange >= 0 ? "+" : ""
            }${strategy.profitChangePercent.toFixed(1)}%`,
          }}
          badgeText={
            strategy.isProfitable ? "Beats Baseline" : "Below Baseline"
          }
          badgeVariant={strategy.isProfitable ? "success" : "destructive"}
        />
      </div>

      {isExpanded && <ExpandedStrategyDetails strategy={strategy} />}
    </div>
  </div>
);

const ExpandedStrategyDetails = ({ strategy }) => (
  <div className="mt-6 pt-6 border-t border-slate-700">
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Revenue Breakdown */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h5 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          Revenue Breakdown
        </h5>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Package Adopters:</span>
            <span className="text-slate-100 font-medium">
              LKR {(strategy.packageAdopterRevenue / 1000000).toFixed(2)}M
            </span>
          </div>
          {strategy.includeBikeLease && (
            <>
              <div className="flex justify-between pl-4 text-xs">
                <span className="text-slate-500">- Service Revenue:</span>
                <span className="text-slate-300">
                  LKR {(strategy.annualServiceRevenue / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="flex justify-between pl-4 text-xs">
                <span className="text-slate-500">- Lease Revenue:</span>
                <span className="text-purple-400">
                  LKR {(strategy.bikeLeaseRevenue / 1000000).toFixed(2)}M
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">Non-Adopters (PAYG):</span>
            <span className="text-slate-100 font-medium">
              LKR {(strategy.nonAdopterAnnualRevenue / 1000000).toFixed(2)}M
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-700 font-bold">
            <span className="text-slate-200">Total Revenue:</span>
            <span className="text-green-400">
              LKR {(strategy.totalRevenue / 1000000).toFixed(2)}M
            </span>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h5 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-400" />
          Cost Breakdown
        </h5>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Package Adopters:</span>
            <span className="text-slate-100 font-medium">
              LKR {(strategy.packageAdopterCosts / 1000000).toFixed(2)}M
            </span>
          </div>
          <div className="flex justify-between pl-4 text-xs">
            <span className="text-slate-500">- Swap Costs:</span>
            <span className="text-slate-300">
              LKR {(strategy.swapCost / 1000000).toFixed(2)}M
            </span>
          </div>
          <div className="flex justify-between pl-4 text-xs">
            <span className="text-slate-500">- Home Charge:</span>
            <span className="text-slate-300">
              LKR {(strategy.homeChargeCost / 1000000).toFixed(2)}M
            </span>
          </div>
          {strategy.includeBikeLease && (
            <div className="flex justify-between pl-4 text-xs">
              <span className="text-slate-500">- Bike Costs:</span>
              <span className="text-purple-400">
                LKR {(strategy.bikeLeaseCost / 1000000).toFixed(2)}M
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">Non-Adopters (PAYG):</span>
            <span className="text-slate-100 font-medium">
              LKR {(strategy.nonAdopterCosts / 1000000).toFixed(2)}M
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-700 font-bold">
            <span className="text-slate-200">Total Costs:</span>
            <span className="text-red-400">
              LKR {(strategy.totalCost / 1000000).toFixed(2)}M
            </span>
          </div>
        </div>
      </div>

      {/* Per Customer Metrics */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h5 className="font-semibold text-slate-200 mb-3">
          Per Customer Metrics
        </h5>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Revenue:</span>
            <span className="text-slate-100 font-medium">
              LKR {Math.round(strategy.revenuePerCustomer).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Cost:</span>
            <span className="text-slate-100 font-medium">
              LKR {Math.round(strategy.costPerCustomer).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-700 font-bold">
            <span className="text-slate-200">Profit:</span>
            <span
              style={{
                color: strategy.profitPerCustomer > 0 ? "#10b981" : "#ef4444",
              }}
            >
              LKR {Math.round(strategy.profitPerCustomer).toLocaleString()}
            </span>
          </div>
          <div className="mt-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded">
            <div className="text-xs text-slate-400 mb-1">vs Baseline</div>
            <div className="text-sm font-bold text-cyan-400">
              Baseline: LKR{" "}
              {Math.round(strategy.baseline.profitPerCustomer).toLocaleString()}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              Change:{" "}
              {strategy.profitPerCustomer > strategy.baseline.profitPerCustomer
                ? "+"
                : ""}
              LKR{" "}
              {Math.round(
                strategy.profitPerCustomer - strategy.baseline.profitPerCustomer
              ).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Satisfaction Details */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 md:col-span-2 lg:col-span-3">
        <h5 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-400" />
          Detailed Satisfaction Analysis
        </h5>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Value Proposition",
              score: strategy.satisfaction.valueScore,
              color: "#10b981",
            },
            {
              label: "Flexibility",
              score: strategy.satisfaction.flexibilityScore,
              color: "#06b6d4",
            },
            {
              label: "Affordability",
              score: strategy.satisfaction.affordabilityScore,
              color: "#f59e0b",
            },
            {
              label: "Convenience",
              score: strategy.satisfaction.convenienceScore,
              color: "#a855f7",
            },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-xs text-slate-400 mb-2">{item.label}</div>
              <div
                className="text-3xl font-bold mb-2"
                style={{ color: item.color }}
              >
                {item.score}%
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${item.score}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-200">
                Sweet Spot Score
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Balance of satisfaction ({strategy.satisfaction.overall}%) and
                profitability ({strategy.profitMargin.toFixed(1)}%)
              </div>
            </div>
            <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {strategy.satisfaction.sweetSpotScore}
            </div>
          </div>
        </div>
      </div>

      {/* Package Details */}
      {strategy.includeBikeLease && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/30 md:col-span-2 lg:col-span-3">
          <h5 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Bike className="w-4 h-4 text-purple-400" />
            Bike Lease Package Details
          </h5>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <div>
              <div className="text-xs text-slate-400 mb-1">Down Payment</div>
              <div className="text-lg font-bold text-slate-100">
                LKR {strategy.bikeDownPayment.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Monthly Payment</div>
              <div className="text-lg font-bold text-slate-100">
                LKR {strategy.monthlyLeasePayment.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Lease Duration</div>
              <div className="text-lg font-bold text-slate-100">
                {strategy.leaseDurationMonths} months
              </div>
            </div>
            {strategy.freeSwapsDuration > 0 && (
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  Free Swaps Period
                </div>
                <div className="text-lg font-bold text-green-400">
                  {strategy.freeSwapsDuration} months
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-400 mb-1">Cost per Bike</div>
              <div className="text-lg font-bold text-red-400">
                LKR {strategy.costPerBike.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

// Empty State Component
const EmptyState = ({ onNavigateToBuilder }) => (
  <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700 rounded-lg p-12 text-center">
    <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
    <h3 className="text-xl font-semibold text-slate-300 mb-2">
      No Strategies Created Yet
    </h3>
    <p className="text-slate-400 mb-6">
      Create your first package strategy in the Builder tab to see analysis and
      comparisons
    </p>
    <button
      onClick={onNavigateToBuilder}
      className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg"
    >
      Go to Builder
    </button>
  </div>
);

export default StrategyBuilderUI;
