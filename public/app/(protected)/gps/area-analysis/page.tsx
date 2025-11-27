"use client";

// Quick time options
const quickTimeOptions = [
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "last_year", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

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
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  Layers,
  Map,
  Settings,
  TrendingUp,
  Calendar,
  Database,
  Loader2,
  AlertCircle,
  CheckCircle,
  Download,
  Circle,
  AlertTriangle,
  Filter,
  X,
  MapPinned,
  Building2,
  Globe,
  ChevronDown,
} from "lucide-react";
import { useTBoxGPSData } from "@/hooks/Snowflake/gps/useTBoxGPSData";
import GeoChoroplethMap from "@/components/gps/GeoHexHeatmap";
import DatePickerWithRange from "@/components/ui/date-range-picker";
import { useGPSData, GPSFilters } from "@/hooks/Snowflake/gps/useGPSData";
import { config } from "process";

const POINTS_DISPLAY_LIMIT = 1000;

type HeatLevel = "area" | "district" | "province";
type HeatProvider =
  | "openstreetmap"
  | "cartodb_dark"
  | "cartodb_light"
  | "satellite";
type HeatPalette = "YlOrRd" | "Viridis" | "Plasma" | "Turbo" | "Cividis";

export default function UsagePatternPage() {
  const now = new Date();

  const [tempFilters, setTempFilters] = useState<GPSFilters>({
    quickTime: "last_year",
    dateRange: {
      from: new Date(now.getFullYear() - 1, now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0),
    },
    aggregation: "monthly",
    selectedAreas: [],
    selectedDistricts: [],
    selectedProvinces: [],
    selectedTboxes: [],
    adminLevel: "province",
  });

  const [filters, setFilters] = useState<GPSFilters>({
    quickTime: "last_year",
    dateRange: {
      from: new Date(now.getFullYear() - 1, now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0),
    },
    aggregation: "monthly",
    selectedAreas: [],
    selectedDistricts: [],
    selectedProvinces: [],
    selectedTboxes: [],
    adminLevel: "province",
  });

  const {
    data: gpsData,
    loading: isLoading,
    error,
    refetch,
    fetchPoints,
    pointsLoading,
    pointsError,
    availableAreas,
    availableDistricts,
    availableProvinces,
    filtersLoading,
  } = useGPSData(filters);

  const [heatSelectBy, setHeatSelectBy] = useState<HeatLevel>("province");
  const [heatShowBorders, setHeatShowBorders] = useState<boolean>(true);
  const [heatShowPoints, setHeatShowPoints] = useState<boolean>(false);
  const [heatOpacity, setHeatOpacity] = useState<number>(0.7);
  const [heatMapProvider, setHeatMapProvider] =
    useState<HeatProvider>("cartodb_dark");
  const [heatPalette, setHeatPalette] = useState<HeatPalette>("YlOrRd");
  const [pointsFetched, setPointsFetched] = useState<boolean>(false);

  const isPointsLimitExceeded = useMemo(() => {
    return gpsData && gpsData.totalPoints > POINTS_DISPLAY_LIMIT;
  }, [gpsData]);

  const { geographicalData, loadingGeographical } = useTBoxGPSData(filters);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, adminLevel: heatSelectBy }));
    setPointsFetched(false);
  }, [heatSelectBy]);

  const handlePointsToggle = async (enabled: boolean) => {
    if (enabled && isPointsLimitExceeded) {
      return;
    }

    setHeatShowPoints(enabled);

    if (enabled && !gpsData?.stations && !pointsFetched) {
      try {
        await fetchPoints();
        setPointsFetched(true);
      } catch (error) {
        console.error("Failed to fetch points:", error);
      }
    }
  };

  const handleProvinceSelect = (province: string) => {
    const newSelection = filters.selectedProvinces.includes(province)
      ? filters.selectedProvinces.filter((p) => p !== province)
      : [...filters.selectedProvinces, province];

    let filteredDistricts: string[] = [];
    let filteredAreas: string[] = [];

    if (newSelection.length > 0) {
      const availableDistricts = newSelection.reduce((acc, prov) => {
        return [...acc, ...(geographicalData.districts[prov] || [])];
      }, [] as string[]);

      filteredDistricts = filters.selectedDistricts.filter((d) =>
        availableDistricts.includes(d)
      );

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
    });
    setPointsFetched(false); // Reset points fetched flag
  };

  const handleDistrictSelect = (district: string) => {
    const newSelection = filters.selectedDistricts.includes(district)
      ? filters.selectedDistricts.filter((d) => d !== district)
      : [...filters.selectedDistricts, district];

    let filteredAreas: string[] = [];

    if (newSelection.length > 0) {
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
    });
    setPointsFetched(false); // Reset points fetched flag
  };

  const handleAreaSelect = (area: string) => {
    const newSelection = filters.selectedAreas.includes(area)
      ? filters.selectedAreas.filter((a) => a !== area)
      : [...filters.selectedAreas, area];

    setFilters({
      ...filters,
      selectedAreas: newSelection,
      selectedTboxes: [],
    });
    setPointsFetched(false); // Reset points fetched flag
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
    });
  };

  const handleTboxSelect = (tboxId: number) => {
    const newSelection = filters.selectedTboxes.includes(tboxId)
      ? filters.selectedTboxes.filter((id) => id !== tboxId)
      : [...filters.selectedTboxes, tboxId];

    setFilters({
      ...filters,
      selectedTboxes: newSelection,
    });
  };

  const handleClearAllFilters = () => {
    setFilters({
      ...filters,
      selectedProvinces: [],
      selectedDistricts: [],
      selectedAreas: [],
      selectedTboxes: [],
    });
  };

  const activeFiltersCount = useMemo(() => {
    return (
      filters.selectedProvinces.length +
      filters.selectedDistricts.length +
      filters.selectedAreas.length +
      filters.selectedTboxes.length
    );
  }, [filters]);

  const mapData = useMemo(() => {
    if (!gpsData) return [];

    if (heatShowPoints && gpsData.stations) {
      return gpsData.stations.map((station) => ({
        ...station,
        id: station.id || `station_${station.latitude}_${station.longitude}`,
        name: station.name || `Station ${station.id || "Unknown"}`,
        area: station.area,
        district: station.district,
        province: station.province || station.region,
        metric_value: station.utilization_rate || station.ping_speed || 1,
      }));
    } else if (gpsData.aggregatedData) {
      return gpsData.aggregatedData.map((region) => ({
        id: `agg_${region.region_name}`,
        name: region.region_name,
        latitude: region.avg_latitude,
        longitude: region.avg_longitude,
        area: region.region_type === "area" ? region.region_name : undefined,
        district:
          region.region_type === "district" ? region.region_name : undefined,
        province:
          region.region_type === "province" ? region.region_name : undefined,
        point_count: region.point_count,
        avg_utilization: region.avg_utilization,
        total_revenue: region.total_revenue,
        unique_stations: region.unique_stations,
        metric_value: region.point_count,
      }));
    }

    return [];
  }, [gpsData, heatShowPoints]);

  const heatmapConfig = useMemo(() => {
    return {
      center: { lat: 7.8731, lng: 80.7718 },
      zoom: 8,
      mapProvider: heatMapProvider,
      showZoomControl: true,
      collapsibleUI: true,
      opacity: heatOpacity,
      showBorders: heatShowBorders,
      showPoints: heatShowPoints,
      palette: heatPalette,
      selectBy: heatSelectBy,
      Aggregation: "count",
      AggregationField: "point_count",
      latitudeField: "latitude",
      longitudeField: "longitude",
      nameField: "name",
      dataMode: "auto",
      showLegend: true,
      markerSize: 32,
      colorScheme: heatPalette,
      regionProperty: undefined,
      appliedFilters: {
        provinces: filters.selectedProvinces,
        districts: filters.selectedDistricts,
        areas: filters.selectedAreas,
        dateRange: filters.dateRange,
        adminLevel: filters.adminLevel,
      },
    };
  }, [
    heatSelectBy,
    heatShowBorders,
    heatShowPoints,
    heatOpacity,
    heatMapProvider,
    heatPalette,
    filters.selectedProvinces,
    filters.selectedDistricts,
    filters.selectedAreas,
    filters.dateRange,
    filters.adminLevel,
  ]);

  const getAvailableDistricts = () => {
    if (filters.selectedProvinces.length === 0) {
      return [];
    }
    return filters.selectedProvinces.reduce((acc, province) => {
      const districts = geographicalData.districts[province] || [];
      return [...acc, ...districts];
    }, [] as string[]);
  };

  const getAvailableAreas = () => {
    if (filters.selectedDistricts.length === 0) {
      return [];
    }
    return filters.selectedDistricts.reduce((acc, district) => {
      const areas = geographicalData.areas[district] || [];
      return [...acc, ...areas];
    }, [] as string[]);
  };

  const handleQuickTimeChange = (value: string) => {
    setFilters((prev) => ({ ...prev, quickTime: value }));
    setPointsFetched(false);

    const now = new Date();
    let from: Date;
    let to: Date;

    switch (value) {
      case "last_7_days":
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        to = now;
        break;
      case "last_30_days":
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        to = now;
        break;
      case "last_3_months":
        from = new Date(now.getFullYear(), now.getMonth() - 3, 1); // first day 3 months ago
        to = new Date(now.getFullYear(), now.getMonth(), 0); // last day previous month
        break;
      case "last_6_months":
        from = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "last_year":
        // From: previous year, same month, first day
        from = new Date(now.getFullYear() - 1, now.getMonth(), 1);

        // To: last day of last month this year
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        return;
    }

    if (value !== "custom") {
      setFilters((prev) => ({ ...prev, dateRange: { from, to } }));
    }
  };

  const handleDateRangeChange = (
    dateRange: { from: Date; to: Date } | undefined
  ) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: dateRange || undefined,
      quickTime: dateRange ? "custom" : prev.quickTime,
    }));
    setPointsFetched(false);
  };

  const isDateRangeSet =
    filters.dateRange && filters.dateRange.from && filters.dateRange.to;

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <TrendingUp className="h-4 w-4 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-sm font-medium">
              Usage Analytics
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Usage Pattern Overview
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Monitor station locations and performance metrics with choropleth
            visualization
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Configuration Panel */}
          <div className="xl:col-span-4">
            <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl h-[800px] flex flex-col">
              <CardHeader className="pb-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                      <Map className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-100 text-lg">
                        Configuration & Filters
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Time range and location filters
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {activeFiltersCount > 0 && (
                <Button
                  onClick={handleClearAllFilters}
                  variant="ghost"
                  size="sm"
                  className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 mt-3"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear ({activeFiltersCount})
                </Button>
              )}
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-6 pb-6">
                    {/* Time Filters Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-cyan-400" />
                        <Label className="text-slate-300 text-sm font-medium">
                          Time Range
                        </Label>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-300 text-xs font-medium">
                          Quick Selection
                        </Label>
                        <Select
                          value={filters.quickTime}
                          onValueChange={handleQuickTimeChange}
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
                            <SelectValue placeholder="Select time range" />
                          </SelectTrigger>
                          <SelectContent>
                            {quickTimeOptions.map((option) => (
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

                      {filters.quickTime === "custom" && (
                        <div className="space-y-3">
                          <Label className="text-slate-300 text-xs font-medium">
                            Custom Date Range
                          </Label>
                          <DatePickerWithRange
                            date={filters.dateRange}
                            onDateChange={handleDateRangeChange}
                            className="bg-slate-800/50 border-slate-600/50"
                          />
                        </div>
                      )}
                    </div>

                    <Separator className="bg-slate-700/30" />

                    {/* Location Filters Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Filter className="h-4 w-4 text-cyan-400" />
                          <Label className="text-slate-300 text-sm font-medium">
                            Location Filters
                          </Label>
                        </div>
                        {filtersLoading && (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
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
                              disabled={loadingGeographical}
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
                              disabled={
                                filters.selectedProvinces.length === 0 ||
                                loadingGeographical
                              }
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
                              ) : filters.selectedProvinces.length === 0 ? (
                                <div className="text-center py-4 text-slate-400 text-sm">
                                  Select provinces first
                                </div>
                              ) : (
                                filters.selectedProvinces.flatMap((province) =>
                                  (
                                    geographicalData.districts[province] || []
                                  ).map((district) => (
                                    <div
                                      key={district}
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
                                  ))
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
                              disabled={
                                filters.selectedDistricts.length === 0 ||
                                loadingGeographical
                              }
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
                              ) : filters.selectedDistricts.length === 0 ? (
                                <div className="text-center py-4 text-slate-400 text-sm">
                                  Select districts first
                                </div>
                              ) : (
                                filters.selectedDistricts.flatMap((district) =>
                                  (geographicalData.areas[district] || []).map(
                                    (area) => (
                                      <div
                                        key={area}
                                        className="flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer"
                                        onClick={() => handleAreaSelect(area)}
                                      >
                                        {filters.selectedAreas.includes(
                                          area
                                        ) ? (
                                          <CheckCircle className="h-4 w-4 text-cyan-400" />
                                        ) : (
                                          <Circle className="h-4 w-4 text-slate-600" />
                                        )}
                                        <span className="text-slate-300 text-sm">
                                          {area}
                                        </span>
                                      </div>
                                    )
                                  )
                                )
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <Separator className="bg-slate-700/30" />

                    {/* Status Messages */}
                    <div className="space-y-3">
                      {isPointsLimitExceeded && (
                        <Alert className="bg-amber-500/10 border-amber-500/20">
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                          <AlertTitle className="text-amber-400">
                            Too Many Points
                          </AlertTitle>
                          <AlertDescription className="text-amber-300 space-y-2">
                            <div>
                              Dataset contains{" "}
                              <strong>{gpsData?.totalPoints}</strong> points,
                              exceeding the {POINTS_DISPLAY_LIMIT} point limit.
                            </div>
                            <div className="flex items-center gap-1 text-xs bg-amber-500/10 px-2 py-1 rounded">
                              <Filter className="h-3 w-3" />
                              <span>
                                Apply location filters to reduce point count
                              </span>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {error && (
                        <Alert
                          className={`${
                            error.includes("fallback")
                              ? "bg-amber-500/10 border-amber-500/20"
                              : "bg-red-500/10 border-red-500/20"
                          }`}
                        >
                          {error.includes("fallback") ? (
                            <AlertCircle className="h-4 w-4 text-amber-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-400" />
                          )}
                          <AlertTitle
                            className={
                              error.includes("fallback")
                                ? "text-amber-400"
                                : "text-red-400"
                            }
                          >
                            {error.includes("fallback") ? "Notice" : "Error"}
                          </AlertTitle>
                          <AlertDescription
                            className={
                              error.includes("fallback")
                                ? "text-amber-300"
                                : "text-red-300"
                            }
                          >
                            {error}
                          </AlertDescription>
                        </Alert>
                      )}

                      {pointsError && (
                        <Alert className="bg-red-500/10 border-red-500/20">
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          <AlertTitle className="text-red-400">
                            Points Error
                          </AlertTitle>
                          <AlertDescription className="text-red-300">
                            {pointsError}
                          </AlertDescription>
                        </Alert>
                      )}

                      {gpsData && !error && (
                        <Alert className="bg-green-500/10 border-green-500/20">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <AlertTitle className="text-green-400">
                            Data Loaded
                          </AlertTitle>
                          <AlertDescription className="text-green-300">
                            Successfully loaded {gpsData.totalPoints} GPS points
                            across {gpsData.totalRegions} regions
                            {activeFiltersCount > 0 && (
                              <div className="mt-1 text-xs">
                                Active filters: {activeFiltersCount}
                              </div>
                            )}
                            {gpsData.stations && (
                              <div className="mt-1">
                                Individual points: {gpsData.stations.length}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    {/* <pre>
                      <code>{JSON.stringify(heatmapConfig, null, 2)}</code>
                    </pre> */}

                    <Separator className="bg-slate-700/30" />

                    {/* Choropleth Configuration */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Settings className="h-4 w-4 text-cyan-400" />
                        <Label className="text-slate-300 text-sm font-medium">
                          Map Configuration
                        </Label>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-300 flex items-center justify-between text-xs font-medium">
                          <div className="flex items-center">
                            <Layers className="h-3 w-3 mr-2 text-cyan-400" />
                            Admin Level
                          </div>
                        </Label>
                        <Select
                          value={heatSelectBy}
                          onValueChange={(v) => setHeatSelectBy(v as HeatLevel)}
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
                            <SelectValue placeholder="Province" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="province">Province</SelectItem>
                            <SelectItem value="district">District</SelectItem>
                            <SelectItem value="area">Area</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-300 text-xs font-medium">
                          Map Style
                        </Label>
                        <Select
                          value={heatMapProvider}
                          onValueChange={(v) =>
                            setHeatMapProvider(v as HeatProvider)
                          }
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cartodb_dark">Dark</SelectItem>
                            <SelectItem value="cartodb_light">Light</SelectItem>
                            <SelectItem value="openstreetmap">
                              Street
                            </SelectItem>
                            <SelectItem value="satellite">Satellite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-300 text-xs font-medium">
                          Color Palette
                        </Label>
                        <Select
                          value={heatPalette}
                          onValueChange={(v) =>
                            setHeatPalette(v as HeatPalette)
                          }
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="YlOrRd">
                              Yellow-Orange-Red
                            </SelectItem>
                            <SelectItem value="Viridis">Viridis</SelectItem>
                            <SelectItem value="Plasma">Plasma</SelectItem>
                            <SelectItem value="Turbo">Turbo</SelectItem>
                            <SelectItem value="Cividis">Cividis</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300 text-xs font-medium">
                            Show Borders
                          </Label>
                          <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                            <span className="text-xs text-slate-400">
                              Administrative outlines
                            </span>
                            <Switch
                              checked={heatShowBorders}
                              onCheckedChange={setHeatShowBorders}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-slate-300 text-xs font-medium flex items-center gap-2">
                            Show Points
                            {isPointsLimitExceeded && (
                              <Badge
                                variant="outline"
                                className="text-xs text-amber-400 border-amber-400/50"
                              >
                                Limited
                              </Badge>
                            )}
                          </Label>
                          <div
                            className={`flex items-center justify-between border rounded-lg px-3 py-2 transition-colors ${
                              isPointsLimitExceeded
                                ? "bg-slate-800/30 border-slate-700/30 opacity-60"
                                : "bg-slate-800/50 border-slate-700/50"
                            }`}
                          >
                            <span className="text-xs text-slate-400">
                              {isPointsLimitExceeded
                                ? `${gpsData?.totalPoints} points (limit: ${POINTS_DISPLAY_LIMIT})`
                                : "Individual points"}
                              {pointsLoading && (
                                <span className="ml-2">
                                  <Loader2 className="h-3 w-3 animate-spin inline" />
                                </span>
                              )}
                            </span>
                            <Switch
                              checked={heatShowPoints}
                              onCheckedChange={handlePointsToggle}
                              disabled={pointsLoading || isPointsLimitExceeded}
                            />
                          </div>
                          {heatShowPoints &&
                            !gpsData?.stations &&
                            !pointsFetched &&
                            !isPointsLimitExceeded && (
                              <p className="text-xs text-amber-400">
                                Toggle to load individual station points
                              </p>
                            )}
                          {heatShowPoints && gpsData?.stations && (
                            <p className="text-xs text-green-400">
                              Showing {gpsData.stations.length} individual
                              points
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-300 flex items-center justify-between text-xs font-medium">
                          <span>Fill Opacity</span>
                          <span className="text-cyan-400 font-mono">
                            {Math.round(heatOpacity * 100)}%
                          </span>
                        </Label>
                        <Slider
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={[heatOpacity]}
                          onValueChange={(v) => setHeatOpacity(v[0])}
                          className="py-2"
                        />
                        <p className="text-xs text-slate-500">
                          Controls polygon fill transparency.
                        </p>
                      </div>

                      {gpsData && (
                        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                          <Label className="text-slate-300 text-xs font-medium mb-2 block">
                            Data Summary
                          </Label>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                Total Points:
                              </span>
                              <Badge
                                variant={
                                  isPointsLimitExceeded
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {gpsData.totalPoints}
                                {isPointsLimitExceeded && " ⚠️"}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                Active Regions:
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {gpsData.totalRegions}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                Active Filters:
                              </span>
                              <Badge
                                variant={
                                  activeFiltersCount > 0 ? "default" : "outline"
                                }
                                className="text-xs"
                              >
                                {activeFiltersCount}
                              </Badge>
                            </div>

                            {gpsData.stations && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">
                                  Individual Stations:
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs text-green-400 border-green-400"
                                >
                                  {gpsData.stations.length}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                <div className="pt-4 flex-shrink-0 border-t border-slate-700/30 mt-auto bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent space-y-3">
                  <Button
                    onClick={refetch}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white border-0"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading Data...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Refresh Aggregated Data
                      </>
                    )}
                  </Button>

                  {!gpsData?.stations &&
                    !heatShowPoints &&
                    !isPointsLimitExceeded && (
                      <Button
                        onClick={() => handlePointsToggle(true)}
                        disabled={pointsLoading || !gpsData}
                        variant="outline"
                        className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        {pointsLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading Points...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Load Individual Points
                          </>
                        )}
                      </Button>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map Display */}
          <div className="xl:col-span-8 space-y-6">
            {isDateRangeSet ? (
              <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl overflow-hidden h-[800px]">
                <CardContent className="p-0 h-full">
                  <div className="h-full w-full">
                    {mapData.length > 0 ? (
                      <GeoChoroplethMap
                        loading={isLoading}
                        data={mapData}
                        config={heatmapConfig}
                        onDataPointClick={(point) => {
                          console.log("Clicked data point:", point);
                        }}
                        onRegionClick={(region, stations) => {
                          console.log(
                            "Clicked region:",
                            region,
                            "with stations:",
                            stations
                          );
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-slate-800/30">
                        <div className="text-center space-y-4">
                          <div className="p-4 bg-slate-700/50 rounded-full mx-auto w-fit">
                            <Database className="h-8 w-8 text-slate-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-slate-300 mb-2">
                              No GPS Data Available
                            </h3>
                            <p className="text-sm text-slate-500 max-w-md mx-auto">
                              {isLoading
                                ? "Loading GPS data from database..."
                                : activeFiltersCount > 0
                                ? "No data found for the selected filters and date range. Try adjusting your filters."
                                : "No data found for the selected date range."}
                            </p>
                            {activeFiltersCount > 0 && !isLoading && (
                              <Button
                                onClick={handleClearAllFilters}
                                variant="outline"
                                size="sm"
                                className="mt-3 border-slate-600 text-slate-300 hover:bg-slate-800"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Clear All Filters
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl h-[800px]">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-slate-800/50 rounded-full mx-auto w-fit">
                      <TrendingUp className="h-8 w-8 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-300 mb-2">
                        Select Date Range to View Data
                      </h3>
                      <p className="text-sm text-slate-500 max-w-md mx-auto">
                        Please choose a valid date range from the configuration
                        panel to display choropleth visualization.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
