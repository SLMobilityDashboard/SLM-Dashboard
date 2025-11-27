"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Layers,
  Radar,
  Ruler,
  Maximize,
  Activity,
  Database,
  BarChart3,
  TrendingUp,
  Clock,
  AlertCircle,
  Loader2,
  Settings,
  CheckCircle,
  Circle,
  ChevronDown,
  X,
  Filter,
} from "lucide-react";
import CartoMap from "@/components/gps/carto-map";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useGPSData, GPSFilters } from "@/hooks/Snowflake/gps/useGPSData";
import { useTBoxGPSData } from "@/hooks/Snowflake/gps/useTBoxGPSData";

interface SnowflakeDataPoint {
  MEAN_LAT: number;
  MEAN_LONG: number;
  density: number;
  density_log: number;
  TBOXID: string;
  MEAN_TIMESTAMP: string;
}

interface TopLocation {
  MEAN_LAT: number;
  MEAN_LONG: number;
  density: number;
  label: string;
}

interface MapMeta {
  center_LAT: number;
  center_LONG: number;
  zoom: number;
}

interface SnowflakeResponse {
  top_locations: TopLocation[];
  map_meta: MapMeta;
}

interface StationAllocationData {
  topLocations: TopLocation[];
  mapCenter: { lat: number; lng: number };
  zoom: number;
}

interface CoverageStats {
  total_gps_points: number;
  covered_points: number;
  coverage_percentage: number;
  station_count: number;
  average_distance_to_station: number;
  max_distance_to_station: number;
  average_station_separation: number;
  service_radius_km: number;
  min_separation_km: number;
  coverage_target: number;
}

/* =========================
   Enhanced Loading Component for Map
========================= */
const MapLoadingOverlay: React.FC<{
  phase: "processing" | "rendering" | "fetching" | "analyzing";
  progress?: number;
}> = ({ phase, progress }) => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const phaseMessages = {
    processing: "Processing clustering algorithm",
    rendering: "Rendering station locations",
    fetching: "Fetching location data",
    analyzing: "Analyzing density patterns",
  };

  const phaseIcons = {
    processing: <Activity className="h-6 w-6" />,
    rendering: <MapPin className="h-6 w-6" />,
    fetching: <Database className="h-6 w-6" />,
    analyzing: <BarChart3 className="h-6 w-6" />,
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-md z-[1002]">
      <div className="text-center text-slate-300 p-8">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-full p-4 inline-flex items-center justify-center">
            <div className="text-cyan-400 animate-spin">
              <Loader2 className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 text-lg font-medium">
            <div className="text-cyan-400">{phaseIcons[phase]}</div>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {phaseMessages[phase]}
              {dots}
            </span>
          </div>

          {progress !== undefined && (
            <div className="w-64 mx-auto">
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-2">
                {Math.round(progress)}% complete
              </div>
            </div>
          )}

          <div className="text-sm text-slate-400 max-w-md mx-auto">
            {phase === "processing" &&
              "Running advanced clustering algorithms on GPS data"}
            {phase === "rendering" &&
              "Drawing optimal station locations on the map"}
            {phase === "fetching" && "Retrieving geographic and station data"}
            {phase === "analyzing" &&
              "Computing density metrics and clustering results"}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Initial Mount Loading Overlay
========================= */
const InitialMapLoadingOverlay: React.FC = () => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-[1001]">
      <div className="text-center space-y-4">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-full p-4 inline-flex items-center justify-center">
            <div className="text-cyan-400 animate-spin">
              <Activity className="h-8 w-8" />
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium text-slate-300 mb-2">
            Station Allocation System
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Configure clustering parameters and run analysis to visualize
            optimal charging station locations{dots}
          </p>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Coverage Statistics Display
========================= */
const CoverageStatsDisplay: React.FC<{ stats: CoverageStats | null }> = ({
  stats,
}) => {
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-slate-300 mb-4">
        Coverage Analysis
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="text-2xl font-bold text-cyan-400">
            {stats.coverage_percentage}%
          </div>
          <div className="text-sm text-slate-400">GPS Points Covered</div>
          <div className="text-xs text-slate-500 mt-1">
            {stats.covered_points.toLocaleString()} /{" "}
            {stats.total_gps_points.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">
            {stats.station_count}
          </div>
          <div className="text-sm text-slate-400">Stations Placed</div>
        </div>

        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="text-xl font-bold text-blue-400">
            {stats.average_distance_to_station} km
          </div>
          <div className="text-sm text-slate-400">Avg Distance</div>
          <div className="text-xs text-slate-500 mt-1">
            Max: {stats.max_distance_to_station} km
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="text-xl font-bold text-purple-400">
            {stats.average_station_separation} km
          </div>
          <div className="text-sm text-slate-400">Station Separation</div>
          <div className="text-xs text-slate-500 mt-1">
            Min: {stats.min_separation_km} km
          </div>
        </div>
      </div>
    </div>
  );
};

export default function StationAllocationPage() {
  const now = new Date();

  // Initialize filters with default date range
  const [filters] = useState<GPSFilters>({
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

  // Use the GPS data hook
  const {
    data: gpsData,
    loading: filtersLoading,
    error: filtersError,
  } = useGPSData(filters);

  // Get geographical data
  const { geographicalData, loadingGeographical } = useTBoxGPSData(filters);

  const [activeTab, setActiveTab] = useState("coverage");
  const [analysisTab, setAnalysisTab] = useState("map");

  // Coverage-based parameters
  const [serviceRadius, setServiceRadius] = useState(5.0);
  const [minSeparation, setMinSeparation] = useState(3.0);
  const [coverageTarget, setCoverageTarget] = useState(0.95);
  const [maxStations, setMaxStations] = useState(200);
  const [gridSize, setGridSize] = useState(0.01);
  const [useTrafficWeighting, setUseTrafficWeighting] = useState(true);

  // Geo-based parameters
  const [maxRadius, setMaxRadius] = useState(2.0);
  const [outlierThreshold, setOutlierThreshold] = useState(5.0);

  // Common parameters
  const [topN, setTopN] = useState(5);
  const [zoomLevel, setZoomLevel] = useState(13);
  const [stageName, setStageName] = useState("@CLUSTERING_ALGOS");

  // Location filters
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<
    "processing" | "rendering" | "fetching" | "analyzing"
  >("fetching");
  const [loadingProgress, setLoadingProgress] = useState<number | undefined>(
    undefined
  );
  const [stationData, setStationData] = useState<StationAllocationData | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [initialMapLoaded, setInitialMapLoaded] = useState(false);
  const [coverageStats, setCoverageStats] = useState<CoverageStats | null>(
    null
  );

  useEffect(() => {
    // Set initial map loaded after geographical data loads
    if (!loadingGeographical) {
      setInitialMapLoaded(true);
    }
  }, [loadingGeographical]);

  const transformSnowflakeData = (
    data: SnowflakeResponse
  ): StationAllocationData => {
    return {
      topLocations: data.top_locations,
      mapCenter: {
        lat: data.map_meta.center_LAT,
        lng: data.map_meta.center_LONG,
      },
      zoom: data.map_meta.zoom,
    };
  };

  const transformCoverageData = (data: any) => {
    return {
      topLocations: data.top_locations,
      mapCenter: {
        lat: data.map_meta.center_LAT,
        lng: data.map_meta.center_LONG,
      },
      zoom: data.map_meta.zoom,
      message: data.message,
      coverageStats: data.coverage_stats,
    };
  };

  const simulateLoadingProgress = () => {
    setLoadingProgress(0);
    let progress = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => setLoadingProgress(undefined), 500);
      }
      setLoadingProgress(Math.min(progress, 100));
    }, 200);

    return () => clearInterval(interval);
  };

  // Cascading filter handlers
  const handleProvinceSelect = (province: string) => {
    const newSelection = selectedProvinces.includes(province)
      ? selectedProvinces.filter((p) => p !== province)
      : [...selectedProvinces, province];

    let filteredDistricts: string[] = [];
    let filteredAreas: string[] = [];

    if (newSelection.length > 0) {
      const availableDistricts = newSelection.reduce((acc, prov) => {
        return [...acc, ...(geographicalData.districts[prov] || [])];
      }, [] as string[]);

      filteredDistricts = selectedDistricts.filter((d) =>
        availableDistricts.includes(d)
      );

      if (filteredDistricts.length > 0) {
        const availableAreas = filteredDistricts.reduce((acc, district) => {
          return [...acc, ...(geographicalData.areas[district] || [])];
        }, [] as string[]);

        filteredAreas = selectedAreas.filter((a) => availableAreas.includes(a));
      }
    }

    setSelectedProvinces(newSelection);
    setSelectedDistricts(filteredDistricts);
    setSelectedAreas(filteredAreas);
  };

  const handleDistrictSelect = (district: string) => {
    const newSelection = selectedDistricts.includes(district)
      ? selectedDistricts.filter((d) => d !== district)
      : [...selectedDistricts, district];

    let filteredAreas: string[] = [];

    if (newSelection.length > 0) {
      const availableAreas = newSelection.reduce((acc, dist) => {
        return [...acc, ...(geographicalData.areas[dist] || [])];
      }, [] as string[]);

      filteredAreas = selectedAreas.filter((a) => availableAreas.includes(a));
    }

    setSelectedDistricts(newSelection);
    setSelectedAreas(filteredAreas);
  };

  function toSqlStringParam(value: string | null | undefined) {
    if (!value || value.toUpperCase() === "NULL") {
      return "CAST(NULL AS VARCHAR)";
    }
    return `'${value.replace(/'/g, "''")}'`;
  }

  const handleAreaSelect = (area: string) => {
    const newSelection = selectedAreas.includes(area)
      ? selectedAreas.filter((a) => a !== area)
      : [...selectedAreas, area];

    setSelectedAreas(newSelection);
  };

  const handleClearAllFilters = () => {
    setSelectedProvinces([]);
    setSelectedDistricts([]);
    setSelectedAreas([]);
  };

  const activeFiltersCount = useMemo(() => {
    return (
      selectedProvinces.length + selectedDistricts.length + selectedAreas.length
    );
  }, [
    selectedProvinces.length,
    selectedDistricts.length,
    selectedAreas.length,
  ]);

  // Helper functions for available options
  const getAvailableDistricts = () => {
    if (selectedProvinces.length === 0) {
      return Object.values(geographicalData.districts).flat();
    }
    return selectedProvinces.reduce((acc, province) => {
      const districts = geographicalData.districts[province] || [];
      return [...acc, ...districts];
    }, [] as string[]);
  };

  const getAvailableAreas = () => {
    if (selectedDistricts.length === 0) {
      return Object.values(geographicalData.areas).flat();
    }
    return selectedDistricts.reduce((acc, district) => {
      const areas = geographicalData.areas[district] || [];
      return [...acc, ...areas];
    }, [] as string[]);
  };

  const handleCoverageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setLoadingPhase("fetching");

    const cleanup = simulateLoadingProgress();

    try {
      setLoadingPhase("processing");

      // Prepare location filter parameters
      const provinceParam =
        selectedProvinces.length > 0
          ? `'${selectedProvinces.join("', '")}'`
          : "NULL";
      const districtParam =
        selectedDistricts.length > 0
          ? `'${selectedDistricts.join("', '")}'`
          : "NULL";
      const areaParam =
        selectedAreas.length > 0 ? `'${selectedAreas.join("', '")}'` : "NULL";

      // Build the SQL query with correct parameter names and formatting
      const query = `
        CALL REPORT_DB.GPS_DASHBOARD.COVERAGE_OPTIMIZATION_STATIONS(
          ${serviceRadius},
          ${minSeparation},
          ${coverageTarget},
          ${maxStations},
          ${zoomLevel},
          '${stageName}',
          '2024-08-01 00:00:00'::TIMESTAMP_NTZ,
          '2025-07-31 23:59:59'::TIMESTAMP_NTZ,
          ${areaParam},
          ${provinceParam},
          ${districtParam},
          ${gridSize},
          ${useTrafficWeighting}
        );
      `;

      //       const query = `
      //   CALL REPORT_DB.GPS_DASHBOARD.COVERAGE_OPTIMIZATION_STATIONS_COST_OPTIMIZED(
      //     ${serviceRadius},
      //     ${minSeparation},
      //     ${coverageTarget},
      //     ${maxStations},
      //     ${zoomLevel},
      //     '${stageName.replace(/'/g, "''")}',
      //     '2024-08-01 00:00:00'::TIMESTAMP_NTZ,
      //     '2025-07-31 23:59:59'::TIMESTAMP_NTZ,
      //     ${toSqlStringParam(areaParam)},
      //     ${toSqlStringParam(provinceParam)},
      //     ${toSqlStringParam(districtParam)},
      //     ${gridSize},
      //     ${useTrafficWeighting}
      //   );
      // `;

      console.log("Executing Coverage Optimization SQL:", query);
      setLoadingPhase("analyzing");

      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setLoadingPhase("rendering");

      const snowflakeResults = await response.json();
      console.log("Coverage optimization results:", snowflakeResults);

      // Handle the nested JSON structure from Snowflake
      let snowflakeData;
      if (
        snowflakeResults[0] &&
        snowflakeResults[0].COVERAGE_OPTIMIZATION_STATIONS
      ) {
        snowflakeData = JSON.parse(
          snowflakeResults[0].COVERAGE_OPTIMIZATION_STATIONS
        );
      } else if (typeof snowflakeResults[0] === "string") {
        snowflakeData = JSON.parse(snowflakeResults[0]);
      } else {
        snowflakeData = snowflakeResults[0];
      }

      const transformedData = transformCoverageData(snowflakeData);
      console.log("Transformed coverage data:", transformedData);
      setStationData(transformedData);
      setCoverageStats(snowflakeData.coverage_stats);
    } catch (err: any) {
      setError(`Failed to process coverage optimization: ${err.message}`);
      console.error(err);
    } finally {
      cleanup();
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };

  const handleGeoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setLoadingPhase("fetching");

    const cleanup = simulateLoadingProgress();

    try {
      setLoadingPhase("processing");

      const response = await fetch("/api/GeoBased-station-allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxRadius,
          outlierThreshold,
          topN,
          zoomLevel,
          stageName,
          provinces: selectedProvinces.length > 0 ? selectedProvinces : null,
          districts: selectedDistricts.length > 0 ? selectedDistricts : null,
          areas: selectedAreas.length > 0 ? selectedAreas : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setLoadingPhase("analyzing");

      const data = await response.json();

      setLoadingPhase("rendering");

      if (data.status === "success") {
        setStationData(data.data);
        setCoverageStats(null); // Clear coverage stats for geo-based results
      } else {
        setError(data.detail || "Failed to allocate stations");
      }
    } catch (err: any) {
      setError(`Failed to process geo-based clustering: ${err.message}`);
      console.error(err);
    } finally {
      cleanup();
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };

  // Coverage Controls Component
  const CoverageControls = () => (
    <>
      {/* Service Radius Control */}
      <div className="space-y-3">
        <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-cyan-400" />
            Service Radius (Max User Travel)
          </div>
          <span className="text-cyan-400 font-mono">
            {serviceRadius.toFixed(1)} km
          </span>
        </Label>
        <Slider
          min={1.0}
          max={20.0}
          step={0.5}
          value={[serviceRadius]}
          onValueChange={(value) => setServiceRadius(value[0])}
          className="py-2"
        />
        <p className="text-xs text-slate-500 leading-relaxed">
          Maximum distance users will travel to reach a charging station
        </p>
      </div>

      {/* Minimum Separation Control */}
      <div className="space-y-3">
        <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center">
            <Ruler className="h-4 w-4 mr-2 text-cyan-400" />
            Minimum Station Separation
          </div>
          <span className="text-cyan-400 font-mono">
            {minSeparation.toFixed(1)} km
          </span>
        </Label>
        <Slider
          min={0.5}
          max={10.0}
          step={0.1}
          value={[minSeparation]}
          onValueChange={(value) => setMinSeparation(value[0])}
          className="py-2"
        />
        <p className="text-xs text-slate-500 leading-relaxed">
          Minimum distance between charging stations to avoid oversaturation
        </p>
      </div>

      {/* Coverage Target Control */}
      <div className="space-y-3">
        <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2 text-cyan-400" />
            Coverage Target
          </div>
          <span className="text-cyan-400 font-mono">
            {Math.round(coverageTarget * 100)}%
          </span>
        </Label>
        <Slider
          min={0.8}
          max={1.0}
          step={0.01}
          value={[coverageTarget]}
          onValueChange={(value) => setCoverageTarget(value[0])}
          className="py-2"
        />
        <p className="text-xs text-slate-500 leading-relaxed">
          Percentage of GPS points that should be within service radius of a
          station
        </p>
      </div>

      {/* Max Stations Control */}
      <div className="space-y-3">
        <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center">
            <Maximize className="h-4 w-4 mr-2 text-cyan-400" />
            Maximum Stations
          </div>
          <span className="text-cyan-400 font-mono">{maxStations}</span>
        </Label>
        <Slider
          min={10}
          max={500}
          step={10}
          value={[maxStations]}
          onValueChange={(value) => setMaxStations(value[0])}
          className="py-2"
        />
        <p className="text-xs text-slate-500 leading-relaxed">
          Upper limit on number of stations to prevent oversaturation
        </p>
      </div>

      {/* Advanced Options */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-3">
          <Label className="text-slate-300 flex items-center text-sm font-medium">
            <Settings className="h-4 w-4 mr-2 text-cyan-400" />
            Grid Resolution
          </Label>
          <Select
            value={gridSize.toString()}
            onValueChange={(value) => setGridSize(parseFloat(value))}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
              <SelectValue placeholder="Select resolution" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.005">Fine (0.5km)</SelectItem>
              <SelectItem value="0.01">Medium (1km)</SelectItem>
              <SelectItem value="0.02">Coarse (2km)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="traffic-weighting"
            checked={useTrafficWeighting}
            onChange={(e) => setUseTrafficWeighting(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-cyan-500"
          />
          <Label htmlFor="traffic-weighting" className="text-slate-300 text-sm">
            Use traffic weighting
          </Label>
        </div>
      </div>
    </>
  );

  // Prepare map data
  const mapMarkers = stationData
    ? [
        ...stationData.topLocations.map((location) => ({
          position: [location.MEAN_LAT, location.MEAN_LONG] as [number, number],
          popup: `<div class="p-2">
            <strong>${location.label}</strong><br>
            High Density Location<br>
            Density: ${location.density}<br>
            Latitude: ${location.MEAN_LAT}<br>
            Longitude: ${location.MEAN_LONG}
          </div>`,
          color: "#dc2626",
          size: "medium",
          ping: false,
        })),
      ]
    : [];

  const mapClusters = [];

  const mapCenter = stationData
    ? [stationData.mapCenter.lat, stationData.mapCenter.lng]
    : [8.3765, 80.3593];

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <Activity className="h-4 w-4 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-sm font-medium">
              Intelligent Allocation
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Station Allocation Analysis
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Optimize charging station placement using advanced clustering
            algorithms and batch data analysis
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
                      <Database className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-100 text-lg">
                        Algorithm Configuration
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Fine-tune clustering parameters for optimal results
                      </CardDescription>
                    </div>
                  </div>
                  {filtersLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>
                {activeFiltersCount > 0 && (
                  <Button
                    onClick={handleClearAllFilters}
                    variant="ghost"
                    size="sm"
                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 mt-2"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters ({activeFiltersCount})
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-6">
                    <form onSubmit={handleCoverageSubmit} className="space-y-6">
                      {/* Location Filters */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Filter className="h-4 w-4 text-cyan-400" />
                          <Label className="text-slate-300 text-sm font-medium">
                            Location Filters
                          </Label>
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
                                  {selectedProvinces.length === 0
                                    ? "All Provinces"
                                    : `${selectedProvinces.length} Province(s)`}
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
                                      {selectedProvinces.includes(province) ? (
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
                                disabled={loadingGeographical}
                              >
                                <span>
                                  {selectedDistricts.length === 0
                                    ? "All Districts"
                                    : `${selectedDistricts.length} District(s)`}
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
                                  getAvailableDistricts().map((district) => (
                                    <div
                                      key={district}
                                      className="flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer"
                                      onClick={() =>
                                        handleDistrictSelect(district)
                                      }
                                    >
                                      {selectedDistricts.includes(district) ? (
                                        <CheckCircle className="h-4 w-4 text-cyan-400" />
                                      ) : (
                                        <Circle className="h-4 w-4 text-slate-600" />
                                      )}
                                      <span className="text-slate-300 text-sm">
                                        {district}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Area Selection */}
                        <div className="space-y-2">
                          <Label className="text-slate-400 text-sm">
                            Areas
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-between bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-800"
                                disabled={loadingGeographical}
                              >
                                <span>
                                  {selectedAreas.length === 0
                                    ? "All Areas"
                                    : `${selectedAreas.length} Area(s)`}
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
                                      {selectedAreas.includes(area) ? (
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
                      </div>

                      <Separator className="bg-slate-700/30" />

                      {/* Coverage-based Parameters */}
                      <CoverageControls />
                      {/* Status Messages */}
                      <div className="space-y-3">
                        {filtersError && (
                          <Alert className="bg-red-500/10 border-red-500/20">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <AlertDescription className="text-red-300">
                              {filtersError}
                            </AlertDescription>
                          </Alert>
                        )}

                        {error && (
                          <Alert className="bg-red-500/10 border-red-500/20">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <AlertDescription className="text-red-300">
                              {error}
                            </AlertDescription>
                          </Alert>
                        )}

                        {coverageStats && (
                          <Alert className="bg-blue-500/10 border-blue-500/20">
                            <CheckCircle className="h-4 w-4 text-blue-400" />
                            <AlertDescription className="text-blue-300">
                              Coverage Stats: {coverageStats.covered_points} of{" "}
                              {coverageStats.total_gps_points} points covered (
                              {Math.round(
                                (coverageStats.covered_points /
                                  coverageStats.total_gps_points) *
                                  100
                              )}
                              %)
                            </AlertDescription>
                          </Alert>
                        )}

                        {stationData && (
                          <Alert className="bg-blue-500/10 border-blue-500/20">
                            <CheckCircle className="h-4 w-4 text-blue-400" />
                            <AlertDescription className="text-blue-300">
                              Found {stationData.topLocations.length} optimal
                              station locations
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-3"></div>
                            Optimizing Coverage...
                          </>
                        ) : (
                          <>
                            <MapPin className="mr-3 h-4 w-4" />
                            Optimize Station Coverage
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Map and Results Section */}
          <div className="xl:col-span-8 space-y-6">
            <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl overflow-hidden h-[800px]">
              <CardContent className="p-0 relative h-full">
                <div className="relative h-full">
                  <CartoMap
                    center={mapCenter as [number, number]}
                    zoom={stationData?.zoom || 8}
                    markers={mapMarkers}
                    clusters={mapClusters}
                    eps={serviceRadius}
                    clusterSeparation={minSeparation}
                    height="800px"
                  />

                  {/* Enhanced Loading Overlay for Map Only */}
                  {isLoading && (
                    <MapLoadingOverlay
                      phase={loadingPhase}
                      progress={loadingProgress}
                    />
                  )}

                  {/* Initial Mount Loading Overlay */}
                  {!initialMapLoaded && <InitialMapLoadingOverlay />}

                  {/* No Data State */}
                  {!stationData && !isLoading && initialMapLoaded && (
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="p-4 bg-slate-800/50 rounded-full mx-auto w-fit">
                          <MapPin className="h-8 w-8 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-slate-300 mb-2">
                            No Clustering Results Yet
                          </h3>
                          <p className="text-slate-500 text-sm max-w-md">
                            Configure your parameters and run a clustering
                            algorithm to visualize station allocations on the
                            map
                          </p>
                          {activeFiltersCount > 0 && (
                            <div className="mt-3">
                              <Badge variant="outline" className="text-xs">
                                {activeFiltersCount} filter(s) applied
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
