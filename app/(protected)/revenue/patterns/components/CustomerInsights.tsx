import React, { useState, useMemo } from "react";

// ============================================================================
// COMPONENT 4: CUSTOMER INSIGHTS & PREDICTIONS (Enhanced with Sorting & Filtering)
// ============================================================================
export const CustomerInsights = ({ predictions }) => {
  const {
    Target,
    ArrowUp,
    ArrowDown,
    Search,
    Filter,
    X,
    Download,
  } = require("lucide-react");

  // State for sorting
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  // State for filters
  const [filters, setFilters] = useState({
    name: "",
    segment: "all",
    churnRisk: "all",
    currentSwaps: { min: "", max: "" },
    currentRevenue: { min: "", max: "" },
    potentialRevenue: { min: "", max: "" },
    recommendedPackage: "",
  });

  // State for showing filter panel
  const [showFilters, setShowFilters] = useState(false);

  const getSegmentColor = (segment) => {
    const colors = {
      "Power Riders": "#10b981",
      "Steady Riders": "#06b6d4",
      "Casual Commuters": "#f59e0b",
      "Home Energizers": "#a855f7",
    };
    return colors[segment] || "#64748b";
  };

  const Badge = ({
    children,
    variant = "default",
    className = "",
    style = {},
  }) => {
    const variants = {
      default: "bg-cyan-600 text-white hover:bg-cyan-700",
      secondary: "bg-slate-700 text-slate-100 hover:bg-slate-600",
      destructive: "bg-red-600 text-white hover:bg-red-700",
      outline:
        "text-slate-100 border border-slate-600 bg-slate-800 hover:bg-slate-700",
      success: "bg-green-600 text-white hover:bg-green-700",
    };
    return (
      <div
        style={style}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`}
      >
        {children}
      </div>
    );
  };

  // Get unique values for filters
  const uniqueSegments = useMemo(() => {
    return [...new Set(predictions.map((p) => p.segment))];
  }, [predictions]);

  const uniquePackages = useMemo(() => {
    return [...new Set(predictions.map((p) => p.recommendedPackage))];
  }, [predictions]);

  // Sorting function
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Get sort indicator
  const getSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <div className="w-4 h-4" />; // Empty space
    }
    return sortConfig.direction === "ascending" ? (
      <ArrowUp className="w-4 h-4 text-cyan-400" />
    ) : (
      <ArrowDown className="w-4 h-4 text-cyan-400" />
    );
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filteredData = [...predictions];

    // Apply filters
    if (filters.name) {
      filteredData = filteredData.filter((item) =>
        item.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.segment !== "all") {
      filteredData = filteredData.filter(
        (item) => item.segment === filters.segment
      );
    }

    if (filters.churnRisk !== "all") {
      filteredData = filteredData.filter((item) => {
        if (filters.churnRisk === "high") return item.churnRisk > 0.6;
        if (filters.churnRisk === "medium")
          return item.churnRisk > 0.3 && item.churnRisk <= 0.6;
        if (filters.churnRisk === "low") return item.churnRisk <= 0.3;
        return true;
      });
    }

    if (filters.currentSwaps.min !== "") {
      filteredData = filteredData.filter(
        (item) => item.currentSwaps >= parseFloat(filters.currentSwaps.min)
      );
    }
    if (filters.currentSwaps.max !== "") {
      filteredData = filteredData.filter(
        (item) => item.currentSwaps <= parseFloat(filters.currentSwaps.max)
      );
    }

    if (filters.currentRevenue.min !== "") {
      filteredData = filteredData.filter(
        (item) => item.currentRevenue >= parseFloat(filters.currentRevenue.min)
      );
    }
    if (filters.currentRevenue.max !== "") {
      filteredData = filteredData.filter(
        (item) => item.currentRevenue <= parseFloat(filters.currentRevenue.max)
      );
    }

    if (filters.potentialRevenue.min !== "") {
      filteredData = filteredData.filter(
        (item) =>
          item.potentialRevenue >= parseFloat(filters.potentialRevenue.min)
      );
    }
    if (filters.potentialRevenue.max !== "") {
      filteredData = filteredData.filter(
        (item) =>
          item.potentialRevenue <= parseFloat(filters.potentialRevenue.max)
      );
    }

    if (filters.recommendedPackage) {
      filteredData = filteredData.filter((item) =>
        item.recommendedPackage
          .toLowerCase()
          .includes(filters.recommendedPackage.toLowerCase())
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle nested properties
        if (
          sortConfig.key === "churnRisk" ||
          sortConfig.key === "currentSwaps" ||
          sortConfig.key === "currentRevenue" ||
          sortConfig.key === "potentialRevenue"
        ) {
          aValue = parseFloat(aValue);
          bValue = parseFloat(bValue);
        }

        if (aValue < bValue) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredData;
  }, [predictions, sortConfig, filters]);

  // Reset filters
  const resetFilters = () => {
    setFilters({
      name: "",
      segment: "all",
      churnRisk: "all",
      currentSwaps: { min: "", max: "" },
      currentRevenue: { min: "", max: "" },
      potentialRevenue: { min: "", max: "" },
      recommendedPackage: "",
    });
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      filters.name !== "" ||
      filters.segment !== "all" ||
      filters.churnRisk !== "all" ||
      filters.currentSwaps.min !== "" ||
      filters.currentSwaps.max !== "" ||
      filters.currentRevenue.min !== "" ||
      filters.currentRevenue.max !== "" ||
      filters.potentialRevenue.min !== "" ||
      filters.potentialRevenue.max !== "" ||
      filters.recommendedPackage !== ""
    );
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Customer",
      "Segment",
      "Current Swaps",
      "Churn Risk %",
      "Current Revenue",
      "Potential Revenue",
      "Recommended Package",
    ];
    const csvData = filteredAndSortedData.map((pred) => [
      pred.name,
      pred.segment,
      pred.currentSwaps.toFixed(1),
      Math.round(pred.churnRisk * 100),
      Math.round(pred.currentRevenue),
      Math.round(pred.potentialRevenue),
      pred.recommendedPackage,
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `customer_insights_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
  };

  if (predictions.length === 0) return null;

  return (
    <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700 rounded-lg text-slate-100">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-semibold flex items-center gap-2">
              <Target className="w-6 h-6 text-cyan-400" />
              Customer Insights & Recommendations
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Churn risk analysis and revenue optimization opportunities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                showFilters || hasActiveFilters()
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters() && (
                <span className="ml-1 px-1.5 py-0.5 bg-white text-cyan-600 rounded-full text-xs font-bold">
                  {
                    Object.values(filters).filter(
                      (v) =>
                        v !== "" &&
                        v !== "all" &&
                        (typeof v !== "object" || v.min !== "" || v.max !== "")
                    ).length
                  }
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Statistics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Total Customers</div>
            <div className="text-xl font-bold text-slate-100">
              {filteredAndSortedData.length}
            </div>
            <div className="text-xs text-slate-500">
              of {predictions.length}
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">High Churn Risk</div>
            <div className="text-xl font-bold text-red-400">
              {filteredAndSortedData.filter((p) => p.churnRisk > 0.6).length}
            </div>
            <div className="text-xs text-slate-500">customers</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">
              Avg Current Revenue
            </div>
            <div className="text-xl font-bold text-slate-100">
              LKR{" "}
              {Math.round(
                filteredAndSortedData.reduce(
                  (sum, p) => sum + p.currentRevenue,
                  0
                ) / filteredAndSortedData.length || 0
              )}
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">
              Avg Potential Revenue
            </div>
            <div className="text-xl font-bold text-green-400">
              LKR{" "}
              {Math.round(
                filteredAndSortedData.reduce(
                  (sum, p) => sum + p.potentialRevenue,
                  0
                ) / filteredAndSortedData.length || 0
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-6 bg-slate-800/30 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-100">Filter Options</h4>
            {hasActiveFilters() && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
              >
                <X className="w-3 h-3" />
                Reset All
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Customer Name Filter */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-2 block">
                Customer Name
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={filters.name}
                  onChange={(e) =>
                    setFilters({ ...filters, name: e.target.value })
                  }
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Segment Filter */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-2 block">
                Segment
              </label>
              <select
                value={filters.segment}
                onChange={(e) =>
                  setFilters({ ...filters, segment: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
              >
                <option value="all">All Segments</option>
                {uniqueSegments.map((segment) => (
                  <option key={segment} value={segment}>
                    {segment}
                  </option>
                ))}
              </select>
            </div>

            {/* Churn Risk Filter */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-2 block">
                Churn Risk Level
              </label>
              <select
                value={filters.churnRisk}
                onChange={(e) =>
                  setFilters({ ...filters, churnRisk: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
              >
                <option value="all">All Levels</option>
                <option value="high">High (&gt;60%)</option>
                <option value="medium">Medium (30-60%)</option>
                <option value="low">Low (&lt;30%)</option>
              </select>
            </div>

            {/* Current Swaps Range */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-2 block">
                Current Swaps Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.currentSwaps.min}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      currentSwaps: {
                        ...filters.currentSwaps,
                        min: e.target.value,
                      },
                    })
                  }
                  placeholder="Min"
                  className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={filters.currentSwaps.max}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      currentSwaps: {
                        ...filters.currentSwaps,
                        max: e.target.value,
                      },
                    })
                  }
                  placeholder="Max"
                  className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Current Revenue Range */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-2 block">
                Current Revenue Range (LKR)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.currentRevenue.min}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      currentRevenue: {
                        ...filters.currentRevenue,
                        min: e.target.value,
                      },
                    })
                  }
                  placeholder="Min"
                  className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={filters.currentRevenue.max}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      currentRevenue: {
                        ...filters.currentRevenue,
                        max: e.target.value,
                      },
                    })
                  }
                  placeholder="Max"
                  className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Potential Revenue Range */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-2 block">
                Potential Revenue Range (LKR)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.potentialRevenue.min}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      potentialRevenue: {
                        ...filters.potentialRevenue,
                        min: e.target.value,
                      },
                    })
                  }
                  placeholder="Min"
                  className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={filters.potentialRevenue.max}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      potentialRevenue: {
                        ...filters.potentialRevenue,
                        max: e.target.value,
                      },
                    })
                  }
                  placeholder="Max"
                  className="w-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Recommended Package Filter */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-slate-300 mb-2 block">
                Recommended Package
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={filters.recommendedPackage}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      recommendedPackage: e.target.value,
                    })
                  }
                  placeholder="Search package..."
                  className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="p-6 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-700">
                <th
                  onClick={() => requestSort("name")}
                  className="text-left py-3 px-4 text-sm font-medium text-slate-300 cursor-pointer hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center gap-2">
                    Customer
                    {getSortIndicator("name")}
                  </div>
                </th>
                <th
                  onClick={() => requestSort("segment")}
                  className="text-left py-3 px-4 text-sm font-medium text-slate-300 cursor-pointer hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center gap-2">
                    Segment
                    {getSortIndicator("segment")}
                  </div>
                </th>
                <th
                  onClick={() => requestSort("currentSwaps")}
                  className="text-left py-3 px-4 text-sm font-medium text-slate-300 cursor-pointer hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center gap-2">
                    Current Swaps
                    {getSortIndicator("currentSwaps")}
                  </div>
                </th>
                <th
                  onClick={() => requestSort("churnRisk")}
                  className="text-left py-3 px-4 text-sm font-medium text-slate-300 cursor-pointer hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center gap-2">
                    Churn Risk
                    {getSortIndicator("churnRisk")}
                  </div>
                </th>
                <th
                  onClick={() => requestSort("currentRevenue")}
                  className="text-right py-3 px-4 text-sm font-medium text-slate-300 cursor-pointer hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center justify-end gap-2">
                    Current Revenue
                    {getSortIndicator("currentRevenue")}
                  </div>
                </th>
                <th
                  onClick={() => requestSort("potentialRevenue")}
                  className="text-right py-3 px-4 text-sm font-medium text-slate-300 cursor-pointer hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center justify-end gap-2">
                    Potential Revenue
                    {getSortIndicator("potentialRevenue")}
                  </div>
                </th>
                <th
                  onClick={() => requestSort("recommendedPackage")}
                  className="text-left py-3 px-4 text-sm font-medium text-slate-300 cursor-pointer hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center gap-2">
                    Recommended Package
                    {getSortIndicator("recommendedPackage")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((pred, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition"
                  >
                    <td className="py-3 pl-4 pr-0 text-sm font-medium text-slate-100">
                      {pred.name}
                    </td>
                    <td className="py-3 px-4 w-16">
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: `${getSegmentColor(pred.segment)}20`,
                          color: getSegmentColor(pred.segment),
                          borderColor: getSegmentColor(pred.segment),
                        }}
                      >
                        {pred.segment}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-300">
                      {pred.currentSwaps.toFixed(1)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          pred.churnRisk > 0.6
                            ? "destructive"
                            : pred.churnRisk > 0.3
                            ? "secondary"
                            : "success"
                        }
                        className="text-xs"
                      >
                        {Math.round(pred.churnRisk * 100)}%
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-slate-300">
                      LKR {Math.round(pred.currentRevenue).toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-sm font-bold text-green-400">
                      LKR {Math.round(pred.potentialRevenue).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-cyan-400">
                      {pred.recommendedPackage}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-12 h-12 text-slate-600" />
                      <div className="text-slate-400">
                        No customers match your filters
                      </div>
                      <button
                        onClick={resetFilters}
                        className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Results Summary */}
        {filteredAndSortedData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-sm text-slate-400">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-200">
                {filteredAndSortedData.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-200">
                {predictions.length}
              </span>{" "}
              customers
            </div>
            {hasActiveFilters() && (
              <button
                onClick={resetFilters}
                className="text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerInsights;
