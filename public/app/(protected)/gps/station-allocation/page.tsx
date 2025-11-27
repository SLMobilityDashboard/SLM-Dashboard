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

  const handleDensitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Build the Snowflake stored procedure call
      const query = `
        CALL REPORT_DB.GPS_DASHBOARD.CLUSTER_CHARGING_STATIONS(
          eps => ${eps},
          min_samples => ${minSamples},
          top_n => ${topN},
          zoom_level => ${zoomLevel},
          stage_name => '@CLUSTERING_ALGOS',
          start_time => '2024-08-01 00:00:00',
          end_time => '2025-07-31 23:59:59',
          area => ${area ? `'${area}'` : "NULL"},
          province => ${province ? `'${province}'` : "NULL"},
          district => ${district ? `'${district}'` : "NULL"}
        );
      `;

      // Call your Snowflake API
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: query}),
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
