"use client";

import CustomizableMap from "@/components/gps/canvas-map";
import { useTBoxGPSData } from "@/hooks/Snowflake/gps/useTBoxGPSData";
import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  MapPin,
  Layers,
  Map,
  Activity,
  Database,
  Loader2,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Clock,
  Calendar as CalendarIcon,
  ChevronDown,
  X,
  CheckCircle,
  Circle,
  MapIcon,
  Building2,
  Navigation,
} from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

interface TBoxGPSFilters {
  quickTime: string;
  dateRange?: { from: Date; to: Date };
  selectedTboxes: number[];
  selectedProvinces: string[];
  selectedDistricts: string[];
  selectedAreas: string[];
  shouldFetchData?: boolean;
}

// Mock data and functions for demo
const getDefaultDateRange = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fromDate = new Date(currentYear - 1, currentMonth, 1);
  const toDate = new Date(currentYear, currentMonth, 0);
  return { from: fromDate, to: toDate };
};

const quickTimeOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_90_days", label: "Last 90 Days" },
  { value: "last_year", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

export default function TBoxUsagePatternPage() {
  const [filters, setFilters] = useState<TBoxGPSFilters>({
    quickTime: "last_year",
    dateRange: getDefaultDateRange(),
    selectedTboxes: [],
    selectedProvinces: [],
    selectedDistricts: [],
    selectedAreas: [],
    shouldFetchData: false,
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: filters.dateRange?.from,
    to: filters.dateRange?.to,
  });

  // Color configuration state - moved from map to parent
  const [colorField, setColorField] = useState<string>("none");

  // Fetch TBox GPS data and available TBoxes
  const {
    data: tboxData,
    loading,
    error,
    refetch,
    availableTboxes,
    loadingTboxes,
    geographicalData,
    loadingGeographical,
  } = useTBoxGPSData(filters);

  // Use real data from hook
  const currentData = tboxData;
  const currentAvailableTboxes =
    availableTboxes.length > 0 ? availableTboxes : [];

  // Get available districts based on selected provinces (only show districts from selected provinces)
  const getAvailableDistricts = () => {
    if (filters.selectedProvinces.length === 0) {
      return []; // Don't show any districts if no provinces are selected
    }
    return filters.selectedProvinces.reduce((acc, province) => {
      const districts = geographicalData.districts[province] || [];
      return [...acc, ...districts];
    }, [] as string[]);
  };

  // Get available areas based on selected districts (only show areas from selected districts)
  const getAvailableAreas = () => {
    if (filters.selectedDistricts.length === 0) {
      return []; // Don't show any areas if no districts are selected
    }
    return filters.selectedDistricts.reduce((acc, district) => {
      const areas = geographicalData.areas[district] || [];
      return [...acc, ...areas];
    }, [] as string[]);
  };

  // Get available color field options from data
  const getColorFieldOptions = () => {
    if (!currentData || currentData.tboxes.length === 0) {
      return [{ value: "none", label: "None (Default)" }];
    }

    const options = [{ value: "none", label: "None (Default)" }];
    const samplePoint = currentData.tboxes[0];
    const excludeFields = new Set([
      "id",
      "name",
      "latitude",
      "longitude",
      "lat",
      "lng",
      "timestamp",
    ]);

    Object.keys(samplePoint).forEach((key) => {
      if (!excludeFields.has(key)) {
        const label = key
          .replace(/_/g, " ")
          .replace(/([A-Z])/g, " $1")
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim();
        options.push({ value: key, label });
      }
    });

    return options;
  };

  const colorFieldOptions = getColorFieldOptions();

  const handleQuickTimeChange = (value: string) => {
    const newFilters = {
      ...filters,
      quickTime: value,
      selectedTboxes: [],
      shouldFetchData: false,
    };

    if (value !== "custom") {
      newFilters.dateRange = undefined;
      setDateRange(undefined);
    }

    setFilters(newFilters);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);

    if (range?.from && range?.to) {
      setFilters({
        ...filters,
        quickTime: "custom",
        dateRange: { from: range.from, to: range.to },
        selectedTboxes: [],
        shouldFetchData: false,
      });
    }
  };

  const handleTBoxSelect = (tboxId: number) => {
    const newSelection = filters.selectedTboxes.includes(tboxId)
      ? filters.selectedTboxes.filter((id) => id !== tboxId)
      : [...filters.selectedTboxes, tboxId];

    setFilters({
      ...filters,
      selectedTboxes: newSelection,
      shouldFetchData: false,
    });
  };

  const handleRemoveTBox = (tboxId: number) => {
    setFilters({
      ...filters,
      selectedTboxes: filters.selectedTboxes.filter((id) => id !== tboxId),
      shouldFetchData: false,
    });
  };

  const handleSelectAllTBoxes = () => {
    if (filters.selectedTboxes.length === currentAvailableTboxes.length) {
      setFilters({
        ...filters,
        selectedTboxes: [],
        shouldFetchData: false,
      });
    } else {
      const tboxesToSelect = currentAvailableTboxes.slice(0, 50);
      setFilters({
        ...filters,
        selectedTboxes: tboxesToSelect,
        shouldFetchData: false,
      });
    }
  };

  // Geographical filter handlers
  const handleProvinceSelect = (province: string) => {
    const newSelection = filters.selectedProvinces.includes(province)
      ? filters.selectedProvinces.filter((p) => p !== province)
      : [...filters.selectedProvinces, province];

    // When provinces change, clear districts and areas that are no longer valid
    let filteredDistricts: string[] = [];
    let filteredAreas: string[] = [];

    if (newSelection.length > 0) {
      // Only keep districts that belong to the selected provinces
      const availableDistricts = newSelection.reduce((acc, prov) => {
        return [...acc, ...(geographicalData.districts[prov] || [])];
      }, [] as string[]);

      filteredDistricts = filters.selectedDistricts.filter((d) =>
        availableDistricts.includes(d)
      );

      // Only keep areas that belong to the remaining valid districts
      if (filteredDistricts.length > 0) {
        const availableAreas = filteredDistricts.reduce((acc, district) => {
          return [...acc, ...(geographicalData.areas[district] || [])];
        }, [] as string[]);

        filteredAreas = filters.selectedAreas.filter((a) =>
          availableAreas.includes(a)
        );
      }
    }

    setFilters({
      ...filters,
      selectedProvinces: newSelection,
      selectedDistricts: filteredDistricts,
      selectedAreas: filteredAreas,
      selectedTboxes: [],
      shouldFetchData: false,
    });
  };

  const handleDistrictSelect = (district: string) => {
    const newSelection = filters.selectedDistricts.includes(district)
      ? filters.selectedDistricts.filter((d) => d !== district)
      : [...filters.selectedDistricts, district];

    // When districts change, clear areas that are no longer valid
    let filteredAreas: string[] = [];

    if (newSelection.length > 0) {
      // Only keep areas that belong to the selected districts
      const availableAreas = newSelection.reduce((acc, dist) => {
        return [...acc, ...(geographicalData.areas[dist] || [])];
      }, [] as string[]);

      filteredAreas = filters.selectedAreas.filter((a) =>
        availableAreas.includes(a)
      );
    }

    setFilters({
      ...filters,
      selectedDistricts: newSelection,
      selectedAreas: filteredAreas,
      selectedTboxes: [],
      shouldFetchData: false,
    });
  };

  const handleAreaSelect = (area: string) => {
    const newSelection = filters.selectedAreas.includes(area)
      ? filters.selectedAreas.filter((a) => a !== area)
      : [...filters.selectedAreas, area];

    setFilters({
      ...filters,
      selectedAreas: newSelection,
      selectedTboxes: [],
      shouldFetchData: false,
    });
  };

  const handleRemoveGeographicalFilter = (
    type: "province" | "district" | "area",
    value: string
  ) => {
    switch (type) {
      case "province":
        handleProvinceSelect(value);
        break;
      case "district":
        handleDistrictSelect(value);
        break;
      case "area":
        handleAreaSelect(value);
        break;
    }
  };

  const handleClearAllGeographicalFilters = () => {
    setFilters({
      ...filters,
      selectedProvinces: [],
      selectedDistricts: [],
      selectedAreas: [],
      selectedTboxes: [],
      shouldFetchData: false,
    });
  };

  const handleApplyFilters = () => {
    // Remove the requirement for selected TBoxes - allow fetching with no TBoxes selected
    setFilters({
      ...filters,
      shouldFetchData: true,
    });
  };

  const mapConfig = useMemo(() => {
    return {
      center: { lat: 7.8731, lng: 80.7718 },
      zoom: 8,
      latitudeField: "latitude",
      longitudeField: "longitude",
      nameField: "name",
      mapProvider: "cartodb_dark" as const,
      colorField: colorField,
      colorScheme: "default" as const,
    };
  }, [colorField]);

  const isDateRangeSet =
    filters.dateRange && filters.dateRange.from && filters.dateRange.to;

  const totalGeographicalFilters =
    filters.selectedProvinces.length +
    filters.selectedDistricts.length +
    filters.selectedAreas.length;

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <TrendingUp className="h-4 w-4 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-sm font-medium">
              TBox GPS Analytics
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            TBox Movement Patterns
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Track TBox GPS locations and movement patterns over time with
            real-time visualization
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="bg-red-900/20 border-red-500/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error loading TBox GPS data</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters({ ...filters, shouldFetchData: true })
                }
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        {isDateRangeSet || filters.quickTime !== "custom" ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Configuration Panel */}
            <div className="xl:col-span-4 max-w-[800px]">
              <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl h-[800px] flex flex-col">
                <CardHeader className="pb-4 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                      <Map className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-100 text-lg">
                        Configuration
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Configure TBox GPS visualization
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col min-h-0 relative">
                  {/* Scrollable content area */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 pr-2 space-y-6 pb-6">
                    {/* Time Range Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-cyan-400" />
                        <Label className="text-slate-300 font-medium">
                          Time Range
                        </Label>
                      </div>

                      <Select
                        value={filters.quickTime}
                        onValueChange={handleQuickTimeChange}
                      >
                        <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300">
                          <SelectValue placeholder="Select time range" />
                        </SelectTrigger>
                        <SelectContent>
                          {quickTimeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {filters.quickTime === "custom" && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-800"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange?.from ? (
                                dateRange.to ? (
                                  <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(dateRange.from, "LLL dd, y")
                                )
                              ) : (
                                <span>Pick a date range</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={dateRange?.from}
                              selected={dateRange}
                              onSelect={handleDateRangeChange}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    <Separator className="bg-slate-700/30" />

                    {/* Geographical Filters Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MapIcon className="h-4 w-4 text-cyan-400" />
                          <Label className="text-slate-300 font-medium">
                            Geographical Filters
                          </Label>
                          {totalGeographicalFilters > 0 && (
                            <Badge
                              variant="secondary"
                              className="bg-cyan-500/20 text-cyan-300 text-xs"
                            >
                              {totalGeographicalFilters}
                            </Badge>
                          )}
                        </div>
                        {totalGeographicalFilters > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAllGeographicalFilters}
                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 px-2"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>

                      {/* Province Selection */}
                      <div className="space-y-2">
                        <Label className="text-slate-400 text-sm">
                          Provinces
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-800"
                            >
                              <span>
                                {filters.selectedProvinces.length === 0
                                  ? "All Provinces"
                                  : `${filters.selectedProvinces.length} Province(s)`}
                              </span>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 p-4 space-y-2">
                              {loadingGeographical ? (
                                <div className="text-center py-4 text-slate-400 text-sm">
                                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                  Loading provinces...
                                </div>
                              ) : geographicalData.provinces.length === 0 ? (
                                <div className="text-center py-4 text-slate-400 text-sm">
                                  No provinces available
                                </div>
                              ) : (
                                geographicalData.provinces.map((province) => (
                                  <div
                                    key={province}
                                    className="flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer"
                                    onClick={() =>
                                      handleProvinceSelect(province)
                                    }
                                  >
                                    {filters.selectedProvinces.includes(
                                      province
                                    ) ? (
                                      <CheckCircle className="h-4 w-4 text-cyan-400" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-slate-600" />
                                    )}
                                    <span className="text-slate-300 text-sm">
                                      {province}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* District Selection */}
                      <div className="space-y-2">
                        <Label className="text-slate-400 text-sm">
                          Districts
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-800"
                            >
                              <span>
                                {filters.selectedDistricts.length === 0
                                  ? "All Districts"
                                  : `${filters.selectedDistricts.length} District(s)`}
                              </span>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 p-4 space-y-2">
                              {loadingGeographical ? (
                                <div className="text-center py-4 text-slate-400 text-sm">
                                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                  Loading districts...
                                </div>
                              ) : getAvailableDistricts().length === 0 ? (
                                <div className="text-center py-4 text-slate-400 text-sm">
                                  No districts available
                                </div>
                              ) : (
                                getAvailableDistricts().map(
                                  (district, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer"
                                      onClick={() =>
                                        handleDistrictSelect(district)
                                      }
                                    >
                                      {filters.selectedDistricts.includes(
                                        district
                                      ) ? (
                                        <CheckCircle className="h-4 w-4 text-cyan-400" />
                                      ) : (
                                        <Circle className="h-4 w-4 text-slate-600" />
                                      )}
                                      <span className="text-slate-300 text-sm">
                                        {district}
                                      </span>
                                    </div>
                                  )
                                )
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Area Selection */}
                      <div className="space-y-2">
                        <Label className="text-slate-400 text-sm">Areas</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-800"
                            >
                              <span>
                                {filters.selectedAreas.length === 0
                                  ? "All Areas"
                                  : `${filters.selectedAreas.length} Area(s)`}
                              </span>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 p-4 space-y-2">
                              {loadingGeographical ? (
                                <div className="text-center py-4 text-slate-400 text-sm">
                                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                  Loading areas...
                                </div>
                              ) : getAvailableAreas().length === 0 ? (
                                <div className="text-center py-4 text-slate-400 text-sm">
                                  No areas available
                                </div>
                              ) : (
                                getAvailableAreas().map((area) => (
                                  <div
                                    key={area}
                                    className="flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer"
                                    onClick={() => handleAreaSelect(area)}
                                  >
                                    {filters.selectedAreas.includes(area) ? (
                                      <CheckCircle className="h-4 w-4 text-cyan-400" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-slate-600" />
                                    )}
                                    <span className="text-slate-300 text-sm">
                                      {area}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Selected Geographical Filters Display */}
                      {totalGeographicalFilters > 0 && (
                        <div className="space-y-2">
                          <Label className="text-slate-400 text-xs">
                            Active Filters ({totalGeographicalFilters})
                          </Label>
                          <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
                            <div className="flex flex-wrap gap-1 p-1">
                              {filters.selectedProvinces.map((province) => (
                                <Badge
                                  key={`province-${province}`}
                                  variant="secondary"
                                  className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 cursor-pointer text-xs px-2 py-1"
                                  onClick={() =>
                                    handleRemoveGeographicalFilter(
                                      "province",
                                      province
                                    )
                                  }
                                >
                                  <Building2 className="h-3 w-3 mr-1" />
                                  {province}
                                  <X className="h-3 w-3 ml-1" />
                                </Badge>
                              ))}
                              {filters.selectedDistricts.map((district) => (
                                <Badge
                                  key={`district-${district}`}
                                  variant="secondary"
                                  className="bg-green-500/20 text-green-300 hover:bg-green-500/30 cursor-pointer text-xs px-2 py-1"
                                  onClick={() =>
                                    handleRemoveGeographicalFilter(
                                      "district",
                                      district
                                    )
                                  }
                                >
                                  <Navigation className="h-3 w-3 mr-1" />
                                  {district}
                                  <X className="h-3 w-3 ml-1" />
                                </Badge>
                              ))}
                              {filters.selectedAreas.map((area) => (
                                <Badge
                                  key={`area-${area}`}
                                  variant="secondary"
                                  className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 cursor-pointer text-xs px-2 py-1"
                                  onClick={() =>
                                    handleRemoveGeographicalFilter("area", area)
                                  }
                                >
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {area}
                                  <X className="h-3 w-3 ml-1" />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator className="bg-slate-700/30" />

                    {/* TBox Selection Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4 text-cyan-400" />
                          <Label className="text-slate-300 font-medium">
                            TBox Selection (Optional)
                          </Label>
                          {filters.selectedTboxes.length > 0 && (
                            <Badge
                              variant="secondary"
                              className="bg-cyan-500/20 text-cyan-300 text-xs"
                            >
                              {filters.selectedTboxes.length}
                            </Badge>
                          )}
                        </div>
                        {currentAvailableTboxes.length > 0 &&
                          !loadingTboxes && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSelectAllTBoxes}
                              className="text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-6 px-2"
                            >
                              {filters.selectedTboxes.length ===
                              currentAvailableTboxes.length
                                ? "Deselect All"
                                : "Select All"}
                            </Button>
                          )}
                      </div>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-800"
                            disabled={
                              loadingTboxes ||
                              currentAvailableTboxes.length === 0
                            }
                          >
                            <span>
                              {loadingTboxes
                                ? "Loading TBoxes..."
                                : currentAvailableTboxes.length === 0
                                ? "No TBoxes available"
                                : filters.selectedTboxes.length === 0
                                ? "Select TBoxes (Optional)"
                                : `${filters.selectedTboxes.length} TBox(es) selected`}
                            </span>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 p-4 space-y-2">
                            {currentAvailableTboxes.length === 0 ? (
                              <div className="text-center py-4 text-slate-400 text-sm">
                                {loadingTboxes
                                  ? "Loading available TBoxes..."
                                  : "No TBoxes found for selected time range"}
                              </div>
                            ) : (
                              currentAvailableTboxes.map((tboxId) => (
                                <div
                                  key={tboxId}
                                  className="flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer"
                                  onClick={() => handleTBoxSelect(tboxId)}
                                >
                                  {filters.selectedTboxes.includes(tboxId) ? (
                                    <CheckCircle className="h-4 w-4 text-cyan-400" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-slate-600" />
                                  )}
                                  <span className="text-slate-300">
                                    TBox-{tboxId}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Selected TBoxes Display */}
                      {filters.selectedTboxes.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-slate-400 text-xs">
                            Selected TBoxes ({filters.selectedTboxes.length})
                          </Label>
                          <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
                            <div className="flex flex-wrap gap-1 p-1">
                              {filters.selectedTboxes.map((tboxId) => (
                                <Badge
                                  key={tboxId}
                                  variant="secondary"
                                  className="bg-slate-700/50 text-slate-300 hover:bg-slate-700 cursor-pointer text-xs px-2 py-1"
                                  onClick={() => handleRemoveTBox(tboxId)}
                                >
                                  TBox-{tboxId}
                                  <X className="h-3 w-3 ml-1" />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator className="bg-slate-700/30" />

                    {/* Color Configuration Section */}
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label className="text-slate-300 text-sm font-medium flex items-center">
                          <Layers className="h-4 w-4 mr-2 text-cyan-400" />
                          Color By Field
                        </Label>
                        <Select
                          value={colorField}
                          onValueChange={setColorField}
                          disabled={loading}
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
                            <SelectValue placeholder="Select color field" />
                          </SelectTrigger>
                          <SelectContent>
                            {colorFieldOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Fixed bottom section - only visible when scrolled to bottom */}
                  <div className="pt-4 space-y-4 border-t border-slate-700/30 bg-slate-900/95 backdrop-blur-sm">
                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2">
                      {loadingGeographical && (
                        <Badge
                          variant="outline"
                          className="bg-orange-500/10 border-orange-500/30 text-orange-400"
                        >
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Loading Geography
                        </Badge>
                      )}
                      {loadingTboxes && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 border-amber-500/30 text-amber-400"
                        >
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Loading TBoxes
                        </Badge>
                      )}
                      {loading && (
                        <Badge
                          variant="outline"
                          className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                        >
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Loading Data
                        </Badge>
                      )}
                      {currentData && !loading && (
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 border-green-500/30 text-green-400"
                        >
                          <Database className="h-3 w-3 mr-1" />
                          {`${currentData.totalTBoxes.toLocaleString()} of GPS points`}
                        </Badge>
                      )}
                      {currentAvailableTboxes.length > 0 && !loadingTboxes && (
                        <Badge
                          variant="outline"
                          className="bg-blue-500/10 border-blue-500/30 text-blue-400"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {currentAvailableTboxes.length} TBoxes
                        </Badge>
                      )}
                      {totalGeographicalFilters > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-purple-500/10 border-purple-500/30 text-purple-400"
                        >
                          <MapIcon className="h-3 w-3 mr-1" />
                          {totalGeographicalFilters} Geo Filters
                        </Badge>
                      )}
                    </div>

                    {/* Apply Button - always show when date range is set */}
                    <Button
                      onClick={handleApplyFilters}
                      disabled={loading}
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading Data...
                        </>
                      ) : filters.selectedTboxes.length === 0 ? (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Load All TBox Locations (Max 1000)
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 mr-2" />
                          Load Selected TBox Locations
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Map Visualization Panel */}
            <div className="xl:col-span-8">
              <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl h-[800px] flex flex-col">
                <CardHeader className="pb-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-cyan-500/10 rounded-lg">
                        <MapPin className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div>
                        <CardTitle className="text-slate-100 text-lg">
                          TBox Locations
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Visualize TBox GPS coordinates
                          {filters.selectedTboxes.length > 0 ? (
                            <span className="text-cyan-400 ml-2">
                              • {filters.selectedTboxes.length} selected TBoxes
                            </span>
                          ) : (
                            <span className="text-amber-400 ml-2">
                              • All available TBoxes (max 1000 points)
                            </span>
                          )}
                          {colorField !== "none" && (
                            <span className="text-cyan-400 ml-2">
                              • Colored by {colorField}
                            </span>
                          )}
                          {totalGeographicalFilters > 0 && (
                            <span className="text-purple-400 ml-2">
                              • {totalGeographicalFilters} geographical
                              filter(s) applied
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFilters({ ...filters, shouldFetchData: true })
                      }
                      disabled={loading}
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-2 ${
                          loading ? "animate-spin" : ""
                        }`}
                      />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col min-h-0">
                  {/* Loading State */}
                  {loading && (
                    <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                      <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
                      <p className="text-slate-400">Loading map data...</p>
                    </div>
                  )}

                  {/* No Data State */}
                  {!loading &&
                    (!currentData || currentData.tboxes.length === 0) && (
                      <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                        <MapPin className="h-12 w-12 text-slate-600" />
                        <p className="text-slate-400 text-center">
                          No GPS data found for the selected filters and time
                          range.
                          <br />
                          Try adjusting your time range or geographical filters.
                        </p>
                      </div>
                    )}

                  {/* Map and Stats Layout */}
                  {!loading && currentData && currentData.tboxes.length > 0 && (
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Map Container - Takes most space */}
                      <div className="flex-1 rounded-lg overflow-hidden border border-slate-700/50 min-h-0">
                        <CustomizableMap
                          data={currentData.tboxes}
                          config={mapConfig}
                          className="w-full h-full min-h-[250px]"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[900px]">
            <div className="text-center space-y-4">
              <MapPin className="h-12 w-12 text-slate-600 mx-auto" />
              <h2 className="text-xl font-semibold text-slate-300">
                Select a time range to view data
              </h2>
              <p className="text-slate-500">
                Use the configuration panel to set your filters
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
