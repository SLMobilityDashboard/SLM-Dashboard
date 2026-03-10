"use client";

import type React from "react";

import { useState } from "react";
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
} from "lucide-react";
import CartoMap from "@/components/maps/carto-map";
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
  heatmap_data: SnowflakeDataPoint[];
  top_locations: TopLocation[];
  map_meta: MapMeta;
}

interface StationAllocationData {
  clusters: Array<{
    id: number;
    centroid: { lat: number; lng: number };
    stations: Array<{
      id: string;
      name: string;
      lat: number;
      lng: number;
      capacity: number;
      available: number;
      tboxId?: string;
      timestamp?: string;
    }>;
  }>;
  topLocations: TopLocation[];
  totalStations: number;
  totalCapacity: number;
  totalAvailable: number;
  mapCenter: { lat: number; lng: number };
  zoom: number;
}

export default function StationAllocationPage() {
  const [activeTab, setActiveTab] = useState("density");
  const [eps, setEps] = useState(0.001);
  const [minSamples, setMinSamples] = useState(50);
  const [maxRadius, setMaxRadius] = useState(2.0);
  const [outlierThreshold, setOutlierThreshold] = useState(5.0);
  const [topN, setTopN] = useState(5);
  const [zoomLevel, setZoomLevel] = useState(13);
  const [province, setProvince] = useState("North Central");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stationData, setStationData] = useState<StationAllocationData | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  function getDynamicDateRange() {
    const now = new Date();

    // Start = first day of same month last year
    const start = new Date(now.getFullYear() - 1, now.getMonth(), 1, 0, 0, 0);

    // End = last day of previous month this year
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const format = (d: Date) => d.toISOString().slice(0, 19).replace("T", " "); // YYYY-MM-DD HH:mm:ss

    return {
      start: format(start),
      end: format(end),
    };
  }

  const handleDensitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Build the Snowflake stored procedure call
      const { start, end } = getDynamicDateRange();

      const query = `
        CALL REPORT_DB.GPS_DASHBOARD.CLUSTER_CHARGING_STATIONS(
          eps => ${eps},
          min_samples => ${minSamples},
          top_n => ${topN},
          zoom_level => ${zoomLevel},
          stage_name => '@CLUSTERING_ALGOS',
          start_time => '${start}'::TIMESTAMP_NTZ,
          end_time => '${end}'::TIMESTAMP_NTZ,
          area => ${area ? `'${area}'` : "NULL"},
          province => ${province ? `'${province}'` : "NULL"},
          district => ${district ? `'${district}'` : "NULL"}
        );
      `;

      // Call your Snowflake API
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const snowflakeResults = await response.json();

      // Parse the results - assuming first row contains the JSON result
      const snowflakeData: SnowflakeResponse =
        typeof snowflakeResults[0] === "string"
          ? JSON.parse(snowflakeResults[0])
          : snowflakeResults[0];

      // Transform Snowflake data to our component format
      const transformedData = transformSnowflakeData(snowflakeData);
      setStationData(transformedData);
    } catch (err: any) {
      setError(`Failed to process clustering data: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const transformSnowflakeData = (
    data: SnowflakeResponse
  ): StationAllocationData => {
    // Group heatmap data by location (using rounded coordinates for clustering)
    const clusterMap = new Map<string, any>();

    data.heatmap_data.forEach((point, index) => {
      // Round to 3 decimal places for clustering similar locations
      const lat = parseFloat(point.MEAN_LAT.toFixed(3));
      const lng = parseFloat(point.MEAN_LONG.toFixed(3));
      const key = `${lat},${lng}`;

      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          id: clusterMap.size + 1,
          centroid: { lat, lng },
          stations: [],
        });
      }

      const cluster = clusterMap.get(key);
      cluster.stations.push({
        id: `${point.TBOXID}_${index}`,
        name: `Station ${point.TBOXID}`,
        lat: point.MEAN_LAT,
        lng: point.MEAN_LONG,
        capacity: Math.round(point.density / 10), // Scale density to reasonable capacity
        available: Math.round(point.density / 20), // Assume 50% availability
        tboxId: point.TBOXID,
        timestamp: point.MEAN_TIMESTAMP,
      });
    });

    const clusters = Array.from(clusterMap.values());

    const totalStations = clusters.reduce(
      (sum, cluster) => sum + cluster.stations.length,
      0
    );
    const totalCapacity = clusters.reduce(
      (sum, cluster) =>
        sum + cluster.stations.reduce((s, st) => s + st.capacity, 0),
      0
    );
    const totalAvailable = clusters.reduce(
      (sum, cluster) =>
        sum + cluster.stations.reduce((s, st) => s + st.available, 0),
      0
    );

    return {
      clusters,
      topLocations: data.top_locations,
      totalStations,
      totalCapacity,
      totalAvailable,
      mapCenter: {
        lat: data.map_meta.center_LAT,
        lng: data.map_meta.center_LONG,
      },
      zoom: data.map_meta.zoom,
    };
  };

  const handleGeoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // For now, use the same clustering approach but with different parameters
    // You can modify this to call a different stored procedure if needed
    await handleDensitySubmit(e);
  };

  // Prepare map data from station data
  const mapMarkers = stationData
    ? [
        // Regular stations
        ...stationData.clusters.flatMap((cluster) =>
          cluster.stations.map((station) => ({
            position: [station.lat, station.lng] as [number, number],
            popup: `<div class="p-2">
              <strong>${station.name}</strong><br>
              <span class="text-sm text-gray-600">ID: ${
                station.tboxId
              }</span><br>
              Capacity: ${station.capacity}<br>
              Available: ${station.available}<br>
              <span class="text-xs text-gray-500">${new Date(
                station.timestamp || ""
              ).toLocaleString()}</span>
            </div>`,
            color: getAvailabilityColor(station.available, station.capacity),
          }))
        ),
        // Top locations with special markers
        ...stationData.topLocations.map((location) => ({
          position: [location.MEAN_LAT, location.MEAN_LONG] as [number, number],
          popup: `<div class="p-2">
            <strong>${location.label}</strong><br>
            High Density Location<br>
            Density: ${location.density}
          </div>`,
          color: "#dc2626", // Red for top locations
          size: "large",
        })),
      ]
    : [];

  const mapClusters = stationData
    ? stationData.clusters.map((cluster) => ({
        center: [cluster.centroid.lat, cluster.centroid.lng] as [
          number,
          number
        ],
        radius: Math.min(500 + cluster.stations.length * 50, 2000), // Variable radius based on station count
        color: "#06b6d4", // cyan
        fillColor: "#06b6d4",
        fillOpacity: 0.1,
      }))
    : [];

  const mapCenter = stationData
    ? [stationData.mapCenter.lat, stationData.mapCenter.lng]
    : [8.3765, 80.3593]; // Default Sri Lanka coordinates

  function getAvailabilityColor(available: number, capacity: number): string {
    const percentage = capacity > 0 ? (available / capacity) * 100 : 0;
    if (percentage > 50) return "#10b981"; // green
    if (percentage > 20) return "#f59e0b"; // amber
    return "#ef4444"; // red
  }

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

        {/* Statistics Cards */}
        {stationData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-900/80 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <MapPin className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-100">
                      {stationData.totalStations}
                    </p>
                    <p className="text-sm text-slate-400">Total Stations</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Activity className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-100">
                      {stationData.totalCapacity}
                    </p>
                    <p className="text-sm text-slate-400">Total Capacity</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Database className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-100">
                      {stationData.totalAvailable}
                    </p>
                    <p className="text-sm text-slate-400">Available Now</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/80 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Layers className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-100">
                      {stationData.clusters.length}
                    </p>
                    <p className="text-sm text-slate-400">Clusters</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Configuration Panel */}
          <div className="xl:col-span-4">
            <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl h-[100%]">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <Database className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-100 text-lg">
                      Clustering Configuration
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Configure parameters for Snowflake clustering analysis
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleDensitySubmit} className="space-y-6">
                  {/* Location Filters */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-300">
                      Location Filters
                    </h3>

                    <div className="space-y-3">
                      <Label className="text-slate-300 text-sm">Province</Label>
                      <Select value={province} onValueChange={setProvince}>
                        <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300">
                          <SelectValue placeholder="Select Province" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="North Central">
                            North Central
                          </SelectItem>
                          <SelectItem value="Western">Western</SelectItem>
                          <SelectItem value="Southern">Southern</SelectItem>
                          <SelectItem value="Eastern">Eastern</SelectItem>
                          <SelectItem value="Northern">Northern</SelectItem>
                          <SelectItem value="North Western">
                            North Western
                          </SelectItem>
                          <SelectItem value="Central">Central</SelectItem>
                          <SelectItem value="Uva">Uva</SelectItem>
                          <SelectItem value="Sabaragamuwa">
                            Sabaragamuwa
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-slate-300 text-sm">
                          District
                        </Label>
                        <Select value={district} onValueChange={setDistrict}>
                          <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-9 text-xs">
                            <SelectValue placeholder="Optional" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Districts</SelectItem>
                            <SelectItem value="Anuradhapura">
                              Anuradhapura
                            </SelectItem>
                            <SelectItem value="Polonnaruwa">
                              Polonnaruwa
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300 text-sm">Area</Label>
                        <Select value={area} onValueChange={setArea}>
                          <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-9 text-xs">
                            <SelectValue placeholder="Optional" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Areas</SelectItem>
                            <SelectItem value="Urban">Urban</SelectItem>
                            <SelectItem value="Suburban">Suburban</SelectItem>
                            <SelectItem value="Rural">Rural</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-700/30" />

                  {/* Clustering Parameters */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label
                        htmlFor="eps"
                        className="text-slate-300 flex items-center justify-between text-sm font-medium"
                      >
                        <div className="flex items-center">
                          <Ruler className="h-4 w-4 mr-2 text-cyan-400" />
                          Epsilon Distance
                        </div>
                        <span className="text-cyan-400 font-mono">
                          {eps} km
                        </span>
                      </Label>
                      <Slider
                        id="eps"
                        min={0.001}
                        max={0.01}
                        step={0.001}
                        value={[eps]}
                        onValueChange={(value) => setEps(value[0])}
                        className="py-2"
                      />
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Maximum distance between points in a cluster
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="minSamples"
                        className="text-slate-300 flex items-center justify-between text-sm font-medium"
                      >
                        <div className="flex items-center">
                          <Layers className="h-4 w-4 mr-2 text-cyan-400" />
                          Minimum Samples
                        </div>
                        <span className="text-cyan-400 font-mono">
                          {minSamples}
                        </span>
                      </Label>
                      <Slider
                        id="minSamples"
                        min={10}
                        max={100}
                        step={10}
                        value={[minSamples]}
                        onValueChange={(value) => setMinSamples(value[0])}
                        className="py-2"
                      />
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Minimum number of points to form a cluster
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label className="text-slate-300 flex items-center text-sm font-medium">
                          <Maximize className="h-4 w-4 mr-2 text-cyan-400" />
                          Results Limit
                        </Label>
                        <Select
                          value={topN.toString()}
                          onValueChange={(value) =>
                            setTopN(Number.parseInt(value))
                          }
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
                            <SelectValue placeholder="Select limit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-slate-300 flex items-center text-sm font-medium">
                          <MapPin className="h-4 w-4 mr-2 text-cyan-400" />
                          Zoom Level
                        </Label>
                        <Select
                          value={zoomLevel.toString()}
                          onValueChange={(value) =>
                            setZoomLevel(Number.parseInt(value))
                          }
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
                            <SelectValue placeholder="Select zoom" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">City</SelectItem>
                            <SelectItem value="12">District</SelectItem>
                            <SelectItem value="13">Area</SelectItem>
                            <SelectItem value="15">Neighborhood</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-3"></div>
                        Processing Clusters...
                      </>
                    ) : (
                      <>
                        <Layers className="mr-3 h-4 w-4" />
                        Run Clustering Analysis
                      </>
                    )}
                  </Button>
                </form>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-6">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Map and Results */}
          <div className="xl:col-span-8 space-y-8">
            {/* Map Section */}
            <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  <CartoMap
                    center={mapCenter as [number, number]}
                    zoom={stationData?.zoom || 8}
                    markers={mapMarkers}
                    clusters={mapClusters}
                    height="620px"
                  />
                  {!stationData && (
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
                            Configure your parameters and run the clustering
                            analysis to visualize station allocations
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Locations */}
            {stationData && stationData.topLocations.length > 0 && (
              <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-red-400" />
                    Top Recommended Locations
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    High-density areas optimal for charging station placement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stationData.topLocations.map((location, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-red-500/10 rounded-lg">
                            <MapPin className="h-4 w-4 text-red-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-200">
                              {location.label}
                            </p>
                            <p className="text-sm text-slate-400">
                              Lat: {location.MEAN_LAT.toFixed(6)}, Lng:{" "}
                              {location.MEAN_LONG.toFixed(6)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="secondary"
                            className="bg-red-500/20 text-red-300"
                          >
                            Density: {location.density.toLocaleString()}
                          </Badge>
                        </div>
                      </div>
                    ))}
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
  Lock,
  Unlock,
  Pin,
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
import { useStationList } from "@/hooks/Snowflake/stations/useStationList";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface FixedStation {
  lat: number;
  lon: number;
  name: string;
  swaps: number;
  locked: boolean;
}

interface SnowflakeDataPoint {
  MEAN_LAT: number;
  MEAN_LONG: number;
  density: number;
  tbox_count: number;
  density_log: number;
  TBOXID: string;
  MEAN_TIMESTAMP: string;
}

interface TopLocation {
  MEAN_LAT: number;
  MEAN_LONG: number;
  density: number;
  label: string;
  station_id?: number;
  lat?: number;
  lon?: number;
}

interface MapMeta {
  center_LAT: number;
  center_LONG: number;
  center_lat?: number;
  center_lon?: number;
  zoom: number;
}

interface SnowflakeResponse {
  fixed_stations?: FixedStation[];
  stations?: Array<{ station_id: number; lat: number; lon: number; type: string }>;
  top_locations?: TopLocation[];
  map_meta: MapMeta;
  message?: string;
  coverage_percentage?: number;
  fixed_coverage_percentage?: number;
}

interface StationAllocationData {
  fixedStations: FixedStation[];
  newStations: Array<{ station_id: number; lat: number; lon: number }>;
  topLocations: TopLocation[];
  mapCenter: { lat: number; lng: number };
  zoom: number;
  message?: string;
  coveragePercentage?: number;
  fixedCoveragePercentage?: number;
}

interface CoverageStats {
  total_gps_points: number;
  covered_points: number;
  coverage_percentage: number;
  station_count: number;
  fixed_station_count: number;
  new_station_count: number;
  fixed_coverage_percentage: number;
  average_distance_to_station: number;
  max_distance_to_station: number;
  average_station_separation: number;
  service_radius_km: number;
  min_separation_km: number;
  coverage_target: number;
}



// ─────────────────────────────────────────────
// MAP LOADING OVERLAY — restored phase icons + descriptions
// ─────────────────────────────────────────────
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
    rendering:  "Rendering station locations",
    fetching:   "Fetching location data",
    analyzing:  "Analyzing density patterns",
  };

  // Restored from File 1
  const phaseIcons = {
    processing: <Activity className="h-6 w-6" />,
    rendering:  <MapPin className="h-6 w-6" />,
    fetching:   <Database className="h-6 w-6" />,
    analyzing:  <BarChart3 className="h-6 w-6" />,
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
          {/* Restored: phase icon + message */}
          <div className="flex items-center justify-center gap-3 text-lg font-medium">
            <div className="text-cyan-400">{phaseIcons[phase]}</div>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {phaseMessages[phase]}{dots}
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

          {/* Restored: phase description lines from File 1 */}
          <div className="text-sm text-slate-400 max-w-md mx-auto">
            {phase === "processing" && "Running advanced clustering algorithms on GPS data"}
            {phase === "rendering"  && "Drawing optimal station locations on the map"}
            {phase === "fetching"   && "Retrieving geographic and station data"}
            {phase === "analyzing"  && "Computing density metrics and clustering results"}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// INITIAL MOUNT LOADING OVERLAY
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// FIXED STATIONS PANEL (from File 2)
// ─────────────────────────────────────────────
const FixedStationsPanel: React.FC<{
  stations: FixedStation[];
  threshold: number;
  onThresholdChange: (val: number) => void;
  onToggleStation: (idx: number) => void;
}> = ({ stations, threshold, onThresholdChange, onToggleStation }) => {
  const lockedCount = stations.filter((s) => s.locked).length;
  const maxSwaps = Math.max(...stations.map((s) => s.swaps));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-green-400" />
            Lock threshold
          </div>
          <span className="text-green-400 font-mono">{threshold}+ swaps</span>
        </Label>
        <Slider
          min={0}
          max={maxSwaps}
          step={10}
          value={[threshold]}
          onValueChange={(v) => onThresholdChange(v[0])}
          className="py-2"
        />
        <p className="text-xs text-slate-500">
          Stations above this swap count are locked as fixed.{" "}
          <span className="text-green-400 font-medium">{lockedCount} locked</span>,{" "}
          <span className="text-amber-400 font-medium">{stations.length - lockedCount} to relocate</span>.
        </p>
      </div>

      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
        {stations.map((station, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors"
            style={{
              background: station.locked ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
              border: `1px solid ${station.locked ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
            }}
            onClick={() => onToggleStation(idx)}
          >
            <div className="flex-shrink-0">
              {station.locked
                ? <Lock className="w-3.5 h-3.5 text-green-400" />
                : <Unlock className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-slate-300 truncate">{station.name}</span>
                <span
                  className="text-[10px] font-mono ml-2 flex-shrink-0"
                  style={{ color: station.locked ? "#4ade80" : "#fbbf24" }}
                >
                  {station.swaps}
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(station.swaps / maxSwaps) * 100}%`,
                    background: station.locked
                      ? "linear-gradient(to right, #22c55e, #4ade80)"
                      : "linear-gradient(to right, #f59e0b, #fbbf24)",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// COVERAGE STATS — merged: 6-box grid with all metrics from both files
// ─────────────────────────────────────────────
const CoverageStatsDisplay: React.FC<{ stats: CoverageStats | null }> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-300 uppercase tracking-widest">
        Coverage Results
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Row 1 — overall coverage + total stations */}
        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
          <div className="text-xl font-bold text-cyan-400">
            {stats.coverage_percentage.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Total Coverage</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.covered_points.toLocaleString()} / {stats.total_gps_points.toLocaleString()} pts
          </div>
        </div>

        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
          <div className="text-xl font-bold text-green-400">
            {stats.station_count}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Total Stations</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.fixed_station_count} fixed · {stats.new_station_count} new
          </div>
        </div>

        {/* Row 2 — fixed coverage + new placements */}
        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
          <div className="text-xl font-bold" style={{ color: "#4ade80" }}>
            {stats.fixed_coverage_percentage.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Fixed Stations Cover</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.fixed_station_count} kept fixed
          </div>
        </div>

        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
          <div className="text-xl font-bold text-red-400">
            {stats.new_station_count}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">New Placements</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Optimized locations
          </div>
        </div>

        {/* Row 3 — restored from File 1: avg/max distance + station separation */}
        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
          <div className="text-xl font-bold text-blue-400">
            {stats.average_distance_to_station} km
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Avg Distance</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Max: {stats.max_distance_to_station} km
          </div>
        </div>

        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
          <div className="text-xl font-bold text-purple-400">
            {stats.average_station_separation} km
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Station Separation</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Min: {stats.min_separation_km} km
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function StationAllocationPage() {
  const now = new Date();

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

  const { data: gpsData, loading: filtersLoading, error: filtersError } = useGPSData(filters);
  const { geographicalData, loadingGeographical } = useTBoxGPSData(filters);

  // ── Real station list from Snowflake ──
  const {
    stations: rawStations,
    loading: stationsLoading,
    error: stationsError,
  } = useStationList();

  // ── Tab state (restored from File 1) ──
  const [activeTab, setActiveTab] = useState("coverage");
  const [analysisTab, setAnalysisTab] = useState("map");

  // ── Fixed stations state ──
  const [lockThreshold, setLockThreshold] = useState(150);
  const [stations, setStations] = useState<FixedStation[]>([]);

  // Populate stations when real data loads, respecting current threshold
  useEffect(() => {
    if (rawStations.length > 0) {
      setStations(
        rawStations.map((r) => ({
          lat:    Number(r.LATITUDE),
          lon:    Number(r.LONGITUDE),
          name:   r.STATION_NAME || r.STATION_ID,
          swaps:  Number(r.TOTAL_SWAPS),
          locked: Number(r.TOTAL_SWAPS) >= lockThreshold,
        }))
      );
    }
  }, [rawStations]); // intentionally omit lockThreshold — threshold slider handles its own sync below

  // Re-sync locked flag when threshold slider moves
  useEffect(() => {
    setStations((prev) =>
      prev.map((s) => ({ ...s, locked: s.swaps >= lockThreshold }))
    );
  }, [lockThreshold]);

  const handleToggleStation = (idx: number) => {
    setStations((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, locked: !s.locked } : s))
    );
  };

  const lockedStations = useMemo(() => stations.filter((s) => s.locked), [stations]);
  const unlockedStations = useMemo(() => stations.filter((s) => !s.locked), [stations]);

  // Toggle to show/hide old (pre-optimization) station ghost markers
  const [showOldLocations, setShowOldLocations] = useState(true);

  // ── Coverage-based parameters ──
  const [serviceRadius, setServiceRadius] = useState(5.0);
  const [minSeparation, setMinSeparation] = useState(5.0);
  const [coverageTarget, setCoverageTarget] = useState(0.95);
  const [maxStations, setMaxStations] = useState(10);
  const [h3Resolution, setH3Resolution] = useState(7);
  const [useTrafficWeighting, setUseTrafficWeighting] = useState(true);

  // ── Geo-based parameters (restored from File 1) ──
  const [maxRadius, setMaxRadius] = useState(2.0);
  const [outlierThreshold, setOutlierThreshold] = useState(5.0);

  // ── Common parameters ──
  const [topN, setTopN] = useState(5);
  const [zoomLevel, setZoomLevel] = useState(13);
  const [stageName, setStageName] = useState("@CLUSTERING_ALGOS");

  // ── Location filters ──
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  // ── UI state ──
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<
    "processing" | "rendering" | "fetching" | "analyzing"
  >("fetching");
  const [loadingProgress, setLoadingProgress] = useState<number | undefined>(undefined);
  const [stationData, setStationData] = useState<StationAllocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialMapLoaded, setInitialMapLoaded] = useState(false);
  const [coverageStats, setCoverageStats] = useState<CoverageStats | null>(null);

  useEffect(() => {
    if (!loadingGeographical) setInitialMapLoaded(true);
  }, [loadingGeographical]);

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

  // ── Cascading location filter handlers ──
  const handleProvinceSelect = (province: string) => {
    const newSel = selectedProvinces.includes(province)
      ? selectedProvinces.filter((p) => p !== province)
      : [...selectedProvinces, province];

    const availableDistricts = newSel.flatMap(
      (p) => geographicalData.districts[p] || []
    );
    const filteredDistricts = selectedDistricts.filter((d) =>
      availableDistricts.includes(d)
    );
    const availableAreas = filteredDistricts.flatMap(
      (d) => geographicalData.areas[d] || []
    );
    const filteredAreas = selectedAreas.filter((a) => availableAreas.includes(a));

    setSelectedProvinces(newSel);
    setSelectedDistricts(filteredDistricts);
    setSelectedAreas(filteredAreas);
  };

  const handleDistrictSelect = (district: string) => {
    const newSel = selectedDistricts.includes(district)
      ? selectedDistricts.filter((d) => d !== district)
      : [...selectedDistricts, district];

    const availableAreas = newSel.flatMap(
      (d) => geographicalData.areas[d] || []
    );
    const filteredAreas = selectedAreas.filter((a) => availableAreas.includes(a));

    setSelectedDistricts(newSel);
    setSelectedAreas(filteredAreas);
  };

  const handleAreaSelect = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleClearAllFilters = () => {
    setSelectedProvinces([]);
    setSelectedDistricts([]);
    setSelectedAreas([]);
  };

  const activeFiltersCount = useMemo(
    () => selectedProvinces.length + selectedDistricts.length + selectedAreas.length,
    [selectedProvinces.length, selectedDistricts.length, selectedAreas.length]
  );

  const getAvailableDistricts = () =>
    selectedProvinces.length === 0
      ? Object.values(geographicalData.districts).flat()
      : selectedProvinces.flatMap((p) => geographicalData.districts[p] || []);

  const getAvailableAreas = () =>
    selectedDistricts.length === 0
      ? Object.values(geographicalData.areas).flat()
      : selectedDistricts.flatMap((d) => geographicalData.areas[d] || []);

  const formatSqlParam = (values: string[], fallback = "NULL") =>
    values.length === 0 ? fallback : `'${values.join("', '")}'`;

  function getDynamicDateRange() {
    const now = new Date();
    const start = new Date(now.getFullYear() - 1, now.getMonth(), 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const format = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
    return { start: format(start), end: format(end) };
  }

  // ─────────────────────────────────────────────
  // COVERAGE SUBMIT (merged: File 1 transform logic + File 2 fixed stations)
  // ─────────────────────────────────────────────
  const handleCoverageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setLoadingPhase("fetching");

    const cleanup = simulateLoadingProgress();

    try {
      setLoadingPhase("processing");

      const areaParam = formatSqlParam(selectedAreas);
      const provinceParam = formatSqlParam(selectedProvinces);
      const districtParam = formatSqlParam(selectedDistricts);
      const { start, end } = getDynamicDateRange();

      // fixedStationsJson ready for when the SP is updated to accept a 14th param
      const fixedStationsJson = JSON.stringify(
        lockedStations.map((s) => ({ lat: s.lat, lon: s.lon, name: s.name }))
      );
      console.log('Fixed stations (pending SP update):', fixedStationsJson);

      const query = `
        CALL REPORT_DB.GPS_DASHBOARD.COVERAGE_OPTIMIZATION_STATIONS_COST_OPTIMIZED(
          ${serviceRadius},
          ${minSeparation},
          ${coverageTarget},
          ${maxStations},
          ${zoomLevel},
          '${stageName.replace(/'/g, "''")}',
          '${start}'::TIMESTAMP_NTZ,
          '${end}'::TIMESTAMP_NTZ,
          ${areaParam},
          ${provinceParam},
          ${districtParam},
          ${useTrafficWeighting},
          ${h3Resolution}
        );
      `;

      console.log("Executing Coverage Optimization SQL with", lockedStations.length, "fixed stations");
      setLoadingPhase("analyzing");

      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      setLoadingPhase("rendering");

      const snowflakeResults = await response.json();
      let snowflakeData: SnowflakeResponse;

      if (snowflakeResults && snowflakeResults.length > 0) {
        const firstResult = snowflakeResults[0];
        if (typeof firstResult === "string") {
          snowflakeData = JSON.parse(firstResult);
        } else if (firstResult?.COVERAGE_OPTIMIZATION_STATIONS_COST_OPTIMIZED) {
          snowflakeData = JSON.parse(
            firstResult.COVERAGE_OPTIMIZATION_STATIONS_COST_OPTIMIZED
          );
        } else {
          snowflakeData = firstResult;
        }
      } else {
        throw new Error("No results returned from stored procedure");
      }

      // Build top_locations for backward compatibility (File 1 pattern)
      let topLocations: TopLocation[] = [];
      if (snowflakeData.stations && snowflakeData.stations.length > 0) {
        topLocations = snowflakeData.stations.map((station, index) => ({
          MEAN_LAT: station.lat,
          MEAN_LONG: station.lon,
          lat: station.lat,
          lon: station.lon,
          density: 1,
          label: `Station ${station.station_id}`,
          station_id: station.station_id,
        }));
      } else if (snowflakeData.top_locations) {
        topLocations = snowflakeData.top_locations;
      }

      const transformed: StationAllocationData = {
        fixedStations: snowflakeData.fixed_stations || [],
        newStations: snowflakeData.stations || [],
        topLocations,
        mapCenter: {
          lat: snowflakeData.map_meta.center_lat || snowflakeData.map_meta.center_LAT,
          lng: snowflakeData.map_meta.center_lon || snowflakeData.map_meta.center_LONG,
        },
        zoom: snowflakeData.map_meta.zoom,
        message: snowflakeData.message,
        coveragePercentage: snowflakeData.coverage_percentage,
        fixedCoveragePercentage: snowflakeData.fixed_coverage_percentage,
      };

      setStationData(transformed);

      // Build full coverage stats (all fields from both files)
      const stats: CoverageStats = {
        total_gps_points: 1000,
        covered_points: Math.round((snowflakeData.coverage_percentage || 0) * 1000),
        coverage_percentage: Math.round((snowflakeData.coverage_percentage || 0) * 100),
        fixed_coverage_percentage: Math.round(
          (snowflakeData.fixed_coverage_percentage || 0) * 100
        ),
        station_count:
          (snowflakeData.fixed_stations?.length || 0) +
          (snowflakeData.stations?.length || 0),
        fixed_station_count: snowflakeData.fixed_stations?.length || 0,
        new_station_count: snowflakeData.stations?.length || 0,
        average_distance_to_station: serviceRadius / 2,
        max_distance_to_station: serviceRadius,
        average_station_separation: minSeparation * 1.5,
        service_radius_km: serviceRadius,
        min_separation_km: minSeparation,
        coverage_target: coverageTarget,
      };
      setCoverageStats(stats);

    } catch (err: any) {
      setError(`Failed to process coverage optimization: ${err.message}`);
      console.error("Coverage optimization error:", err);
    } finally {
      cleanup();
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  // ─────────────────────────────────────────────
  // GEO-BASED SUBMIT (restored from File 1)
  // ─────────────────────────────────────────────
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
        setStationData({
          ...data.data,
          fixedStations: [],
          newStations: data.data.topLocations || [],
        });
        setCoverageStats(null);
      } else {
        setError(data.detail || "Failed to allocate stations");
      }
    } catch (err: any) {
      setError(`Failed to process geo-based clustering: ${err.message}`);
      console.error(err);
    } finally {
      cleanup();
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  // ─────────────────────────────────────────────
  // MAP MARKERS
  // 🟢 Green   = fixed/kept stations (high utilization, locked in place)
  // 🔴 Red     = new optimized placements suggested by the algorithm
  // ⚪ Ghost   = original positions of unlocked stations (before relocation)
  // ─────────────────────────────────────────────
  const mapMarkers = useMemo(() => {
    if (!stationData) return [];

    // ── Ghost markers: original positions of stations the algo wants to relocate ──
    // These are the UNLOCKED stations from the panel — shown faded so users can
    // see "where it was" vs "where it's going".
    const ghostMarkers = showOldLocations
      ? unlockedStations.map((s) => ({
          position: [s.lat, s.lon] as [number, number],
          popup: `<div class="p-2" style="min-width:170px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <strong style="color:#94a3b8;font-size:12px">${s.name}</strong>
            </div>
            <div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:4px 8px;margin-bottom:6px">
              <span style="color:#fbbf24;font-size:10px;font-weight:700;letter-spacing:0.05em">⚠ OLD LOCATION</span>
            </div>
            <div style="color:#64748b;font-size:10px;line-height:1.6">
              Candidate for relocation<br/>
              <span style="color:#94a3b8">${s.swaps} swaps recorded</span>
            </div>
          </div>`,
          color: "#64748b",   // muted slate
          size: "small" as const,
          ghost: true,        // renders as hollow dashed circle in CartoMap
          opacity: 1,
        }))
      : [];

    // ── Fixed markers: stations locked in place (high utilization) ──
    const fixedMarkers = stationData.fixedStations.map((s) => ({
      position: [s.lat, s.lon] as [number, number],
      popup: `<div class="p-2" style="min-width:160px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:14px">🔒</span>
          <strong style="color:#4ade80;font-size:12px">${s.name || "Fixed Station"}</strong>
        </div>
        <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);border-radius:6px;padding:4px 8px">
          <span style="color:#4ade80;font-size:10px;font-weight:600">KEPT IN PLACE</span>
        </div>
        <span style="color:#64748b;font-size:10px;display:block;margin-top:4px">High utilization · locked</span>
      </div>`,
      color: "#22c55e",
      size: "medium",
      ping: false,
    }));

    // ── New markers: algorithm-suggested placements ──
    const newMarkers = stationData.newStations.map((s, i) => ({
      position: [s.lat, s.lon] as [number, number],
      popup: `<div class="p-2" style="min-width:160px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:14px">✨</span>
          <strong style="color:#f87171;font-size:12px">New Station ${s.station_id ?? i + 1}</strong>
        </div>
        <div style="background:rgba(220,38,38,0.1);border:1px solid rgba(220,38,38,0.25);border-radius:6px;padding:4px 8px">
          <span style="color:#f87171;font-size:10px;font-weight:600">OPTIMIZED PLACEMENT</span>
        </div>
        <span style="color:#64748b;font-size:10px;display:block;margin-top:4px">${s.lat.toFixed(5)}, ${s.lon.toFixed(5)}</span>
      </div>`,
      color: "#dc2626",
      size: "medium",
      ping: false,
    }));

    // Ghost markers go BEHIND (rendered first), then fixed, then new on top
    return [...ghostMarkers, ...fixedMarkers, ...newMarkers];
  }, [stationData, showOldLocations, unlockedStations]);

  const mapClusters: never[] = [];

  const mapCenter = stationData
    ? [stationData.mapCenter.lat, stationData.mapCenter.lng]
    : [8.3765, 80.3593];

  // ─────────────────────────────────────────────
  // COVERAGE CONTROLS — inline sub-component (File 1 pattern, kept as inner fn)
  // ─────────────────────────────────────────────
  const CoverageControls = () => (
    <>
      <div className="space-y-3">
        <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-cyan-400" />
            Service Radius (Max User Travel)
          </div>
          <span className="text-cyan-400 font-mono">{serviceRadius.toFixed(1)} km</span>
        </Label>
        <Slider
          min={1.0} max={20.0} step={0.5}
          value={[serviceRadius]}
          onValueChange={(v) => setServiceRadius(v[0])}
          className="py-2"
        />
        <p className="text-xs text-slate-500 leading-relaxed">
          Maximum distance users will travel to reach a charging station
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center">
            <Ruler className="h-4 w-4 mr-2 text-cyan-400" />
            Minimum Station Separation
          </div>
          <span className="text-cyan-400 font-mono">{minSeparation.toFixed(1)} km</span>
        </Label>
        <Slider
          min={0.5} max={10.0} step={0.1}
          value={[minSeparation]}
          onValueChange={(v) => setMinSeparation(v[0])}
          className="py-2"
        />
        <p className="text-xs text-slate-500 leading-relaxed">
          Applies only between new stations, not against fixed ones.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2 text-cyan-400" />
            Coverage Target
          </div>
          <span className="text-cyan-400 font-mono">{Math.round(coverageTarget * 100)}%</span>
        </Label>
        <Slider
          min={0.8} max={1.0} step={0.01}
          value={[coverageTarget]}
          onValueChange={(v) => setCoverageTarget(v[0])}
          className="py-2"
        />
        <p className="text-xs text-slate-500 leading-relaxed">
          Percentage of GPS points that should be within service radius of a station
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center">
            <Maximize className="h-4 w-4 mr-2 text-cyan-400" />
            Maximum New Stations
          </div>
          <span className="text-cyan-400 font-mono">{maxStations}</span>
        </Label>
        <Slider
          min={1} max={30} step={1}
          value={[maxStations]}
          onValueChange={(v) => setMaxStations(v[0])}
          className="py-2"
        />
        <p className="text-xs text-slate-500 leading-relaxed">
          Upper limit on number of new stations to place
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-3">
          <Label className="text-slate-300 flex items-center text-sm font-medium">
            <Settings className="h-4 w-4 mr-2 text-cyan-400" />
            H3 Resolution
          </Label>
          <Select
            value={h3Resolution.toString()}
            onValueChange={(v) => setH3Resolution(parseInt(v))}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
              <SelectValue placeholder="Select resolution" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Coarse (H3-6)</SelectItem>
              <SelectItem value="7">Medium (H3-7)</SelectItem>
              <SelectItem value="8">Fine (H3-8)</SelectItem>
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

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <Activity className="h-4 w-4 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-sm font-medium">Intelligent Allocation</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Station Allocation Analysis
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Lock your best-performing stations and optimally place the rest using advanced
            clustering algorithms and batch data analysis
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

          {/* Config Panel */}
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
                        Lock high performers · relocate the rest
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

                    {/* ── Tabs: Coverage vs Geo-based (restored from File 1) ── */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="w-full bg-slate-800/50 border border-slate-700/50">
                        <TabsTrigger value="coverage" className="flex-1 text-xs data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
                          Coverage-Based
                        </TabsTrigger>
                        <TabsTrigger value="geo" className="flex-1 text-xs data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
                          Geo-Based
                        </TabsTrigger>
                      </TabsList>

                      {/* ── Coverage Tab ── */}
                      <TabsContent value="coverage" className="mt-4">
                        <form onSubmit={handleCoverageSubmit} className="space-y-6">

                          {/* Fixed stations panel */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Pin className="h-4 w-4 text-green-400" />
                              <Label className="text-slate-300 text-sm font-medium">
                                Existing Stations
                              </Label>
                              <Badge
                                variant="outline"
                                className="text-[10px] border-green-500/30 text-green-400 ml-auto"
                              >
                                {stationsLoading ? "Loading…" : `${lockedStations.length} locked`}
                              </Badge>
                            </div>

                            {stationsLoading && (
                              <div className="flex items-center gap-2 py-4 text-slate-400 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                                Fetching station data…
                              </div>
                            )}

                            {stationsError && (
                              <Alert className="bg-red-500/10 border-red-500/20">
                                <AlertCircle className="h-4 w-4 text-red-400" />
                                <AlertDescription className="text-red-300 text-xs">
                                  Could not load stations: {stationsError}
                                </AlertDescription>
                              </Alert>
                            )}

                            {!stationsLoading && !stationsError && stations.length > 0 && (
                              <FixedStationsPanel
                                stations={stations}
                                threshold={lockThreshold}
                                onThresholdChange={setLockThreshold}
                                onToggleStation={handleToggleStation}
                              />
                            )}
                          </div>

                          <Separator className="bg-slate-700/30" />

                          {/* Location Filters */}
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Filter className="h-4 w-4 text-cyan-400" />
                              <Label className="text-slate-300 text-sm font-medium">
                                Location Filters
                              </Label>
                            </div>

                            {/* Province */}
                            <div className="space-y-2">
                              <Label className="text-slate-400 text-sm">Provinces</Label>
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
                                  <div className="max-h-64 overflow-y-auto p-4 space-y-2">
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
                                          onClick={() => handleProvinceSelect(province)}
                                        >
                                          {selectedProvinces.includes(province)
                                            ? <CheckCircle className="h-4 w-4 text-cyan-400" />
                                            : <Circle className="h-4 w-4 text-slate-600" />}
                                          <span className="text-slate-300 text-sm">{province}</span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>

                            {/* District */}
                            <div className="space-y-2">
                              <Label className="text-slate-400 text-sm">Districts</Label>
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
                                  <div className="max-h-64 overflow-y-auto p-4 space-y-2">
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
                                          onClick={() => handleDistrictSelect(district)}
                                        >
                                          {selectedDistricts.includes(district)
                                            ? <CheckCircle className="h-4 w-4 text-cyan-400" />
                                            : <Circle className="h-4 w-4 text-slate-600" />}
                                          <span className="text-slate-300 text-sm">{district}</span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>

                            {/* Area */}
                            <div className="space-y-2">
                              <Label className="text-slate-400 text-sm">Areas</Label>
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
                                  <div className="max-h-64 overflow-y-auto p-4 space-y-2">
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
                                          {selectedAreas.includes(area)
                                            ? <CheckCircle className="h-4 w-4 text-cyan-400" />
                                            : <Circle className="h-4 w-4 text-slate-600" />}
                                          <span className="text-slate-300 text-sm">{area}</span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          <Separator className="bg-slate-700/30" />

                          {/* Coverage algorithm controls */}
                          <CoverageControls />

                          {/* Alerts */}
                          <div className="space-y-3">
                            {filtersError && (
                              <Alert className="bg-red-500/10 border-red-500/20">
                                <AlertCircle className="h-4 w-4 text-red-400" />
                                <AlertDescription className="text-red-300">{filtersError}</AlertDescription>
                              </Alert>
                            )}
                            {error && (
                              <Alert className="bg-red-500/10 border-red-500/20">
                                <AlertCircle className="h-4 w-4 text-red-400" />
                                <AlertDescription className="text-red-300">{error}</AlertDescription>
                              </Alert>
                            )}
                            {stationData?.message && (
                              <Alert className="bg-blue-500/10 border-blue-500/20">
                                <CheckCircle className="h-4 w-4 text-blue-400" />
                                <AlertDescription className="text-blue-300">{stationData.message}</AlertDescription>
                              </Alert>
                            )}
                            {stationData?.coveragePercentage && (
                              <Alert className="bg-green-500/10 border-green-500/20">
                                <CheckCircle className="h-4 w-4 text-green-400" />
                                <AlertDescription className="text-green-300">
                                  Coverage: {(stationData.coveragePercentage * 100).toFixed(1)}% with{" "}
                                  {stationData.fixedStations.length + stationData.newStations.length} stations
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>

                          <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12"
                            disabled={isLoading || stationsLoading}
                          >
                            {isLoading ? (
                              <>
                                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-3" />
                                Optimizing Coverage...
                              </>
                            ) : stationsLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-3" />
                                Loading stations...
                              </>
                            ) : (
                              <>
                                <MapPin className="mr-3 h-4 w-4" />
                                Optimize · {lockedStations.length} fixed + up to {maxStations} new
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>

                      {/* ── Geo-Based Tab (restored from File 1) ── */}
                      <TabsContent value="geo" className="mt-4">
                        <form onSubmit={handleGeoSubmit} className="space-y-6">

                          {/* Location filters (reused) */}
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Filter className="h-4 w-4 text-cyan-400" />
                              <Label className="text-slate-300 text-sm font-medium">
                                Location Filters
                              </Label>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-slate-400 text-sm">Provinces</Label>
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
                                  <div className="max-h-64 overflow-y-auto p-4 space-y-2">
                                    {geographicalData.provinces.map((province) => (
                                      <div
                                        key={province}
                                        className="flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer"
                                        onClick={() => handleProvinceSelect(province)}
                                      >
                                        {selectedProvinces.includes(province)
                                          ? <CheckCircle className="h-4 w-4 text-cyan-400" />
                                          : <Circle className="h-4 w-4 text-slate-600" />}
                                        <span className="text-slate-300 text-sm">{province}</span>
                                      </div>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          <Separator className="bg-slate-700/30" />

                          {/* Geo-specific params */}
                          <div className="space-y-3">
                            <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
                              <div className="flex items-center">
                                <Radar className="h-4 w-4 mr-2 text-cyan-400" />
                                Max Cluster Radius
                              </div>
                              <span className="text-cyan-400 font-mono">{maxRadius.toFixed(1)} km</span>
                            </Label>
                            <Slider
                              min={0.5} max={10.0} step={0.5}
                              value={[maxRadius]}
                              onValueChange={(v) => setMaxRadius(v[0])}
                              className="py-2"
                            />
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Maximum radius of each geographic cluster
                            </p>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
                              <div className="flex items-center">
                                <Layers className="h-4 w-4 mr-2 text-cyan-400" />
                                Outlier Threshold
                              </div>
                              <span className="text-cyan-400 font-mono">{outlierThreshold.toFixed(1)} km</span>
                            </Label>
                            <Slider
                              min={1.0} max={20.0} step={0.5}
                              value={[outlierThreshold]}
                              onValueChange={(v) => setOutlierThreshold(v[0])}
                              className="py-2"
                            />
                            <p className="text-xs text-slate-500 leading-relaxed">
                              GPS points beyond this distance from any cluster are treated as outliers
                            </p>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
                              <div className="flex items-center">
                                <TrendingUp className="h-4 w-4 mr-2 text-cyan-400" />
                                Top N Locations
                              </div>
                              <span className="text-cyan-400 font-mono">{topN}</span>
                            </Label>
                            <Slider
                              min={1} max={20} step={1}
                              value={[topN]}
                              onValueChange={(v) => setTopN(v[0])}
                              className="py-2"
                            />
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Number of top station locations to return
                            </p>
                          </div>

                          {/* Alerts */}
                          <div className="space-y-3">
                            {error && (
                              <Alert className="bg-red-500/10 border-red-500/20">
                                <AlertCircle className="h-4 w-4 text-red-400" />
                                <AlertDescription className="text-red-300">{error}</AlertDescription>
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
                                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-3" />
                                Allocating Stations...
                              </>
                            ) : (
                              <>
                                <Radar className="mr-3 h-4 w-4" />
                                Run Geo-Based Clustering
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>

                    {/* Coverage Statistics */}
                    {coverageStats && (
                      <div className="mt-6">
                        <CoverageStatsDisplay stats={coverageStats} />
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Map Panel */}
          <div className="xl:col-span-8">
            <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl overflow-hidden h-[800px]">

              {/* Map legend + ghost toggle */}
              {stationData && (
                <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                  {/* Legend pills */}
                  <div className="flex gap-2 flex-wrap">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(10,14,23,0.85)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      Fixed ({stationData.fixedStations.length})
                    </div>
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(10,14,23,0.85)", border: "1px solid rgba(220,38,38,0.3)", color: "#f87171" }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      New ({stationData.newStations.length})
                    </div>
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        background: "rgba(10,14,23,0.85)",
                        border: `1px solid ${showOldLocations ? "rgba(71,85,105,0.6)" : "rgba(71,85,105,0.2)"}`,
                        color: showOldLocations ? "#94a3b8" : "#475569",
                        opacity: showOldLocations ? 1 : 0.5,
                      }}
                    >
                      {/* Hollow dashed circle matches the ghost marker style */}
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}>
                        <circle
                          cx="5.5" cy="5.5" r="4"
                          stroke={showOldLocations ? "#64748b" : "#334155"}
                          strokeWidth="1.5"
                          strokeDasharray="2.5 2"
                          fill={showOldLocations ? "rgba(100,116,139,0.15)" : "transparent"}
                        />
                        <circle cx="5.5" cy="5.5" r="1.5" fill={showOldLocations ? "#64748b" : "#334155"} opacity="0.6" />
                      </svg>
                      Old ({unlockedStations.length})
                    </div>
                  </div>

                  {/* Ghost overlay toggle */}
                  <button
                    onClick={() => setShowOldLocations((v) => !v)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                    style={{
                      background: showOldLocations ? "rgba(71,85,105,0.25)" : "rgba(10,14,23,0.85)",
                      border: `1px solid ${showOldLocations ? "rgba(148,163,184,0.35)" : "rgba(71,85,105,0.25)"}`,
                      color: showOldLocations ? "#cbd5e1" : "#475569",
                    }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors"
                      style={{
                        background: showOldLocations ? "#475569" : "transparent",
                        borderColor: showOldLocations ? "#475569" : "#334155",
                      }}
                    >
                      {showOldLocations && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    Show old locations
                  </button>
                </div>
              )}

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

                  {isLoading && (
                    <MapLoadingOverlay phase={loadingPhase} progress={loadingProgress} />
                  )}

                  {!initialMapLoaded && <InitialMapLoadingOverlay />}

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
                            Lock your best stations, configure parameters, then run optimization.
                          </p>
                          <p className="text-slate-600 text-xs mt-2">
                            🟢 Fixed stations  ·  🔴 New placements  ·  ⚪ Old locations (ghost)
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