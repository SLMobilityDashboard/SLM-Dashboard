"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Filter, X, Loader2, Info, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// INTERFACES
// ============================================================================

export interface BatteryFilterState {
  searchTerm: string;
  selectedSeverities: string[];
  scoreRange: string;
  sortBy: string;
  selectedCategories: string[];
  bmsIdSearch: string;
  tboxIdSearch: string;
  minHealthScore: string;
  maxHealthScore: string;
  onlineStatus: string;
}

interface BatteryFilterProps {
  onFiltersChange: (filters: Partial<BatteryFilterState>) => void;
  loading: boolean;
  initialFilters: BatteryFilterState;
  availableCategories?: string[];
}

// ============================================================================
// DEFAULT FILTERS (FIX)
// ============================================================================

const DEFAULT_FILTERS: BatteryFilterState = {
  searchTerm: "",
  selectedSeverities: [],
  scoreRange: "all",
  sortBy: "score-asc",
  selectedCategories: [],
  bmsIdSearch: "",
  tboxIdSearch: "",
  minHealthScore: "",
  maxHealthScore: "",
  onlineStatus: "all",
};

// ============================================================================
// COMPONENT
// ============================================================================

export const BatteryFilter: React.FC<BatteryFilterProps> = ({
  onFiltersChange,
  loading,
  initialFilters,
  availableCategories = ["signal", "health", "usage", "error"],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Applied filters (real state that triggers parent callback)
  const [appliedFilters, setAppliedFilters] = useState<BatteryFilterState>(
    initialFilters ?? DEFAULT_FILTERS
  );

  // Temporary filters (local state for editing)
  const [tempFilters, setTempFilters] = useState<BatteryFilterState>(
    initialFilters ?? DEFAULT_FILTERS
  );

  // Sync if initialFilters arrives later (FIX)
  useEffect(() => {
    if (initialFilters) {
      setAppliedFilters(initialFilters);
      setTempFilters(initialFilters);
    }
  }, [initialFilters]);

  const [originalCounts, setOriginalCounts] = useState({
    severities: 3,
    categories: availableCategories.length,
  });

  // Only notify parent when applied filters change
  useEffect(() => {
    onFiltersChange(appliedFilters);
  }, [appliedFilters, onFiltersChange]);

  const updateTempFilters = useCallback(
    (newFilters: Partial<BatteryFilterState>) => {
      setTempFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...tempFilters });
  }, [tempFilters]);

  const hasUnappliedChanges = useCallback(() => {
    return JSON.stringify(tempFilters) !== JSON.stringify(appliedFilters);
  }, [tempFilters, appliedFilters]);

  const clearAllFilters = useCallback(() => {
    setTempFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }, []);

  const handleArrayFilterChange = useCallback(
    (filterKey: keyof BatteryFilterState, value: string, checked: boolean) => {
      const currentArray = tempFilters[filterKey] as string[];
      const newArray = checked
        ? [...currentArray, value]
        : currentArray.filter((item) => item !== value);

      updateTempFilters({ [filterKey]: newArray });
    },
    [tempFilters, updateTempFilters]
  );

  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (appliedFilters.searchTerm) count++;
    if (appliedFilters.selectedSeverities.length > 0) count++;
    if (appliedFilters.scoreRange !== "all") count++;
    if (appliedFilters.selectedCategories.length > 0) count++;
    if (appliedFilters.bmsIdSearch) count++;
    if (appliedFilters.tboxIdSearch) count++;
    if (appliedFilters.minHealthScore) count++;
    if (appliedFilters.maxHealthScore) count++;
    if (appliedFilters.onlineStatus !== "all") count++;
    return count;
  }, [appliedFilters]);

  const getSeverityLabel = (severity: string) =>
    severity.charAt(0).toUpperCase() + severity.slice(1);

  const getCategoryLabel = (category: string) =>
    category.charAt(0).toUpperCase() + category.slice(1);

  const getScoreRangeLabel = (range: string) => {
    switch (range) {
      case "all":
        return "All Scores";
      case "critical":
        return "Critical (<40)";
      case "poor":
        return "Poor (40-59)";
      case "fair":
        return "Fair (60-79)";
      case "good":
        return "Good (≥80)";
      default:
        return range;
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-200">Filters</span>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary">
                {getActiveFiltersCount()} active
              </Badge>
            )}
            {hasUnappliedChanges() && (
              <Badge
                variant="outline"
                className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
              >
                Unapplied changes
              </Badge>
            )}
            {loading && (
              <div className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                <span className="text-xs text-slate-400">
                  Loading filters...
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {getActiveFiltersCount() > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Less" : "More"} Filters
            </Button>
            <Button
              size="sm"
              onClick={applyFilters}
              disabled={!hasUnappliedChanges()}
              className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50"
            >
              <Check className="h-4 w-4 mr-1" />
              Apply
            </Button>
          </div>
        </div>

        {/* Main Search */}
        <div className="space-y-2">
          <Label className="text-slate-300">Quick Search</Label>
          <Input
            value={tempFilters.searchTerm}
            onChange={(e) => updateTempFilters({ searchTerm: e.target.value })}
            placeholder="Search by BMS ID or T-Box ID..."
            className="bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500"
          />
        </div>

        {/* Main Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Anomaly Severity */}
          <div className="space-y-2">
            <Label className="text-slate-300">Anomaly Severity</Label>
            <Select
              onValueChange={(value) =>
                handleArrayFilterChange("selectedSeverities", value, true)
              }
              disabled={loading}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue
                  placeholder={
                    loading
                      ? "Loading..."
                      : tempFilters.selectedSeverities.length > 0
                      ? `${tempFilters.selectedSeverities.length} selected`
                      : "All severities"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm">Loading...</span>
                  </div>
                ) : (
                  ["critical", "warning", "info"]
                    .filter((s) => !tempFilters.selectedSeverities.includes(s))
                    .map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {getSeverityLabel(severity)}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1">
              {tempFilters.selectedSeverities.map((severity) => (
                <Badge key={severity} variant="secondary" className="text-xs">
                  {getSeverityLabel(severity)}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() =>
                      handleArrayFilterChange(
                        "selectedSeverities",
                        severity,
                        false
                      )
                    }
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Health Score Range */}
          <div className="space-y-2">
            <Label className="text-slate-300">Health Score Range</Label>
            <Select
              value={tempFilters.scoreRange}
              onValueChange={(value) =>
                updateTempFilters({ scoreRange: value })
              }
              disabled={loading}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="critical">Critical (&lt;40)</SelectItem>
                <SelectItem value="poor">Poor (40-59)</SelectItem>
                <SelectItem value="fair">Fair (60-79)</SelectItem>
                <SelectItem value="good">Good (≥80)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-slate-300">Anomaly Category</Label>
            <Select
              onValueChange={(value) =>
                handleArrayFilterChange("selectedCategories", value, true)
              }
              disabled={loading}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue
                  placeholder={
                    loading
                      ? "Loading..."
                      : tempFilters.selectedCategories.length > 0
                      ? `${tempFilters.selectedCategories.length} selected`
                      : "All categories"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm">Loading...</span>
                  </div>
                ) : (
                  availableCategories
                    .filter((c) => !tempFilters.selectedCategories.includes(c))
                    .map((category) => (
                      <SelectItem key={category} value={category}>
                        {getCategoryLabel(category)}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1">
              {tempFilters.selectedCategories.map((category) => (
                <Badge key={category} variant="secondary" className="text-xs">
                  {getCategoryLabel(category)}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() =>
                      handleArrayFilterChange(
                        "selectedCategories",
                        category,
                        false
                      )
                    }
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <Label className="text-slate-300">Sort By</Label>
            <Select
              value={tempFilters.sortBy}
              onValueChange={(value) => updateTempFilters({ sortBy: value })}
              disabled={loading}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score-asc">
                  Health Score (Low to High)
                </SelectItem>
                <SelectItem value="score-desc">
                  Health Score (High to Low)
                </SelectItem>
                <SelectItem value="anomalies-desc">Most Anomalies</SelectItem>
                <SelectItem value="critical-desc">
                  Most Critical Issues
                </SelectItem>
                <SelectItem value="cycles-desc">Most Cycles</SelectItem>
                <SelectItem value="distance-desc">Most Distance</SelectItem>
                <SelectItem value="avg-distance-desc">
                  Highest km/Cycle
                </SelectItem>
                <SelectItem value="avg-distance-asc">
                  Lowest km/Cycle
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <>
            <div className="pt-4 border-t border-slate-700/50 space-y-4">
              {/* Specific ID Searches */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">BMS ID Search</Label>
                  <Input
                    value={tempFilters.bmsIdSearch}
                    onChange={(e) =>
                      updateTempFilters({ bmsIdSearch: e.target.value })
                    }
                    placeholder="Enter BMS ID..."
                    className="bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">T-Box ID Search</Label>
                  <Input
                    value={tempFilters.tboxIdSearch}
                    onChange={(e) =>
                      updateTempFilters({ tboxIdSearch: e.target.value })
                    }
                    placeholder="Enter T-Box ID..."
                    className="bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Health Score Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Min Health Score</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={tempFilters.minHealthScore}
                    onChange={(e) =>
                      updateTempFilters({ minHealthScore: e.target.value })
                    }
                    placeholder="0"
                    className="bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Max Health Score</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={tempFilters.maxHealthScore}
                    onChange={(e) =>
                      updateTempFilters({ maxHealthScore: e.target.value })
                    }
                    placeholder="100"
                    className="bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Online Status */}
              <div className="space-y-2">
                <Label className="text-slate-300">Signal Status</Label>
                <Select
                  value={tempFilters.onlineStatus}
                  onValueChange={(value) =>
                    updateTempFilters({ onlineStatus: value })
                  }
                  disabled={loading}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="online">Online Only</SelectItem>
                    <SelectItem value="offline">Offline Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Info Section */}
            <div className="pt-4 border-t border-slate-700/50">
              <Label className="mb-3 block text-slate-300">Filter Guide</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-400">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-slate-300">
                        Critical:
                      </span>
                      <span className="ml-1">Immediate action required</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-slate-300">
                        Warning:
                      </span>
                      <span className="ml-1">Plan maintenance soon</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-slate-300">Info:</span>
                      <span className="ml-1">Monitor for trends</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p>• Use Quick Search for instant ID lookup</p>
                  <p>• Combine filters for precise targeting</p>
                  <p>• Sort by priority to find critical issues</p>
                  <p>• Health score filters help identify risk groups</p>
                </div>
              </div>
            </div>

            {/* Filter Statistics */}
            <div className="pt-4 border-t border-slate-700/50">
              <Label className="mb-3 block text-slate-300">
                Active Filter Summary
              </Label>
              <div className="text-xs text-slate-400 space-y-1">
                {appliedFilters.searchTerm && (
                  <p>
                    • Quick Search:{" "}
                    <span className="text-slate-300">
                      "{appliedFilters.searchTerm}"
                    </span>
                  </p>
                )}
                {appliedFilters.selectedSeverities.length > 0 && (
                  <p>
                    • Severities:{" "}
                    <span className="text-slate-300">
                      {appliedFilters.selectedSeverities.join(", ")}
                    </span>
                  </p>
                )}
                {appliedFilters.scoreRange !== "all" && (
                  <p>
                    • Score Range:{" "}
                    <span className="text-slate-300">
                      {getScoreRangeLabel(appliedFilters.scoreRange)}
                    </span>
                  </p>
                )}
                {appliedFilters.selectedCategories.length > 0 && (
                  <p>
                    • Categories:{" "}
                    <span className="text-slate-300">
                      {appliedFilters.selectedCategories.join(", ")}
                    </span>
                  </p>
                )}
                {appliedFilters.onlineStatus !== "all" && (
                  <p>
                    • Signal Status:{" "}
                    <span className="text-slate-300">
                      {appliedFilters.onlineStatus}
                    </span>
                  </p>
                )}
                {(appliedFilters.minHealthScore ||
                  appliedFilters.maxHealthScore) && (
                  <p>
                    • Custom Range:{" "}
                    <span className="text-slate-300">
                      {appliedFilters.minHealthScore || "0"} -{" "}
                      {appliedFilters.maxHealthScore || "100"}
                    </span>
                  </p>
                )}
                {getActiveFiltersCount() === 0 && (
                  <p className="text-slate-500 italic">
                    No filters applied - showing all batteries
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
