"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  MapPin,
  Zap,
  Battery,
  Shield,
  Route,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Map,
  Navigation,
  TrendingUp,
  Loader2,
  Bell,
  Clock,
  Gauge,
  Sparkles,
  Cpu,
  BarChart3,
  Target,
} from "lucide-react";
import CartoMapComponent from "./CartoMapComponent";

interface Alert {
  timestamp: string;
  alert_type: string;
  alert_level: string;
  title: string;
  message: string;
  recommended_action: string;
  station_info?: any;
  distance_to_boundary_km?: number;
  battery_at_boundary_percent?: number;
  time_to_boundary_minutes?: number;
}

interface Station {
  name: string;
  location: [number, number];
  direct_distance_km: number;
  path_distance_km?: number;
  final_battery_percent: number;
  battery_efficient: boolean;
  hops_required: number;
  reachability_method: string;
  path_coordinates?: [number, number][];
}

interface CoverageResponse {
  success: boolean;
  message: string;
  coverage_status: {
    in_direct_coverage: boolean;
    in_combined_coverage: boolean;
    distance_to_direct_boundary_km: number;
    distance_to_combined_boundary_km: number;
    coverage_level: string;
  };
  alerts: {
    total_alerts: number;
    alerts_by_level: Record<string, number>;
    highest_severity: string;
    alerts_list: Alert[];
  };
  dashboard_summary: {
    status: string;
    battery_status: string;
    critical_alerts: number;
    warning_alerts: number;
    reachable_stations_count: number;
    nearest_station: any;
    immediate_action_required: boolean;
  };
  travel_metrics: {
    speed_kmh: number | null;
    direction_degrees: number | null;
    battery_drain_rate_per_km: number | null;
    is_stationary: boolean | null;
    heading_degrees?: number | null;
    heading_direction?: string;
  };
  current_location: {
    location: [number, number];
    battery_percent: number;
    usable_battery_percent: number;
    max_direct_range_km: number;
    point_of_no_return_km: number;
  };
  coverage_areas: any;
  reachable_stations: {
    count: number;
    stations: Station[];
  };
  unreachable_stations: {
    count: number;
    stations: Station[];
  };
  reachability_stats: {
    direct_reachable: number;
    multi_hop_reachable: number;
    average_hops: number;
    average_final_battery: number;
    reachability_percentage: number;
  };
  timestamp: string;
  analysis_time_seconds: number;
}

export default function CoverageAreaDashboard() {
  const [currentLocation, setCurrentLocation] = useState("6.9271,79.8612");
  const [currentLocationDisplay, setCurrentLocationDisplay] = useState("");
  const [battery, setBattery] = useState(80);
  const [efficiency, setEfficiency] = useState(70);
  const [safetyMargin, setSafetyMargin] = useState(35);
  const [maxHops, setMaxHops] = useState(10);
  const [heading, setHeading] = useState(90);
  const [isLoading, setIsLoading] = useState(false);
  const [coverageData, setCoverageData] = useState<CoverageResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const locationInputRef = useRef<HTMLInputElement>(null);
  const locationAutocompleteRef =
    useRef<google.maps.places.Autocomplete | null>(null);

  const getCompassDirection = (degrees: number) => {
    const directions = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  useEffect(() => {
    handleAnalyze();
  }, []);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!window.google || !window.google.maps) {
      console.error("Google Maps API not loaded");
      return;
    }

    // Initialize location autocomplete
    if (locationInputRef.current && !locationAutocompleteRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(
        locationInputRef.current,
        {
          fields: ["formatted_address", "geometry", "name"],
          componentRestrictions: { country: ["lk"] },
        }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const placeName =
            place.name || place.formatted_address || "Selected Location";

          setCurrentLocation(`${lat.toFixed(6)},${lng.toFixed(6)}`);
          setCurrentLocationDisplay(placeName);
        }
      });

      locationAutocompleteRef.current = autocomplete;
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!currentLocation.trim()) {
      setError("Please enter your current location");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/coverage-area-optimized",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_location: currentLocation.trim(),
            battery,
            efficiency: efficiency / 100,
            safety_margin: safetyMargin / 100,
            max_hops: maxHops,
            current_heading_degrees: heading,
            resolution: 50,
            include_combined_polygon: true,
          }),
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log("Coverage data with alerts:", data);
      setCoverageData(data);
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, battery, efficiency, safetyMargin, maxHops, heading]);

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentLocationDisplay(value);
    setCurrentLocation(value);
  };

  const handleCompassClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    setHeading(Math.round(angle));
  };

  const mapCenter = useMemo(() => {
    if (
      coverageData?.current_location?.location &&
      Array.isArray(coverageData.current_location.location) &&
      coverageData.current_location.location.length === 2
    ) {
      return coverageData.current_location.location;
    }
    return [6.9271, 79.8612];
  }, [coverageData]);

  const mapMarkers = useMemo(() => {
    if (!coverageData) return [];

    const markers = [];

    // Current location marker
    if (
      coverageData?.current_location?.location &&
      Array.isArray(coverageData.current_location.location) &&
      coverageData.current_location.location.length === 2
    ) {
      const batteryPercent =
        coverageData.current_location?.battery_percent ?? 0;
      const coverageLevel =
        coverageData.coverage_status?.coverage_level ?? "Unknown";
      const headingDirection =
        coverageData.travel_metrics?.heading_direction ?? null;
      const headingDegrees =
        coverageData.travel_metrics?.heading_degrees ?? null;
      const immediateAction =
        coverageData.dashboard_summary?.immediate_action_required ?? false;

      markers.push({
        position: coverageData.current_location.location,
        popup: `<strong>Your Location</strong><br>Battery: ${batteryPercent}%<br>Status: ${coverageLevel}${
          headingDirection && headingDegrees !== null
            ? `<br>Heading: ${headingDirection} (${headingDegrees}°)`
            : ""
        }`,
        color: immediateAction ? "#ef4444" : "#10b981",
        icon: "location",
        heading: headingDegrees,
      });
    }

    // Reachable stations
    if (
      coverageData?.reachable_stations?.stations &&
      Array.isArray(coverageData.reachable_stations.stations)
    ) {
      coverageData.reachable_stations.stations.forEach((station) => {
        if (
          station &&
          station.location &&
          Array.isArray(station.location) &&
          station.location.length === 2
        ) {
          markers.push({
            position: station.location,
            popup: `<strong>${
              station.name ?? "Unknown Station"
            }</strong><br>Distance: ${(station.direct_distance_km ?? 0).toFixed(
              1
            )} km<br>Battery: ${(station.final_battery_percent ?? 0).toFixed(
              1
            )}%<br>${
              station.battery_efficient ? "✓ Efficient" : "⚠ Intensive"
            }`,
            color: station.battery_efficient ? "#10b981" : "#f59e0b",
            icon: "charging",
          });
        }
      });
    }

    // Unreachable stations
    if (
      coverageData?.unreachable_stations?.stations &&
      Array.isArray(coverageData.unreachable_stations.stations)
    ) {
      coverageData.unreachable_stations.stations.forEach((station) => {
        if (
          station &&
          station.location &&
          Array.isArray(station.location) &&
          station.location.length === 2
        ) {
          markers.push({
            position: station.location,
            popup: `<strong>🚫 ${
              station.name ?? "Unknown Station"
            }</strong><br>Distance: ${(station.direct_distance_km ?? 0).toFixed(
              1
            )} km<br><em>Beyond reach</em>`,
            color: "#ef4444",
            icon: "charging",
          });
        }
      });
    }

    return markers;
  }, [coverageData]);

  const mapRoutes = useMemo(() => {
    if (!coverageData) return [];

    const routes = [];

    if (
      coverageData?.reachable_stations?.stations &&
      Array.isArray(coverageData.reachable_stations.stations)
    ) {
      coverageData.reachable_stations.stations.forEach((station) => {
        if (
          station &&
          station.path_coordinates &&
          Array.isArray(station.path_coordinates) &&
          station.path_coordinates.length > 1
        ) {
          routes.push({
            path: station.path_coordinates,
            color: station.battery_efficient ? "#10b981" : "#f59e0b",
            weight: 2,
            opacity: 0.6,
            dashArray: station.hops_required > 0 ? "3,3" : "",
          });
        }
      });
    }

    return routes;
  }, [coverageData]);

  const mapCoveragePolygons = useMemo(() => {
    if (!coverageData) return [];

    const polygons = [];

    // Direct coverage
    if (
      coverageData.coverage_areas?.direct_coverage &&
      Array.isArray(coverageData.coverage_areas.direct_coverage) &&
      coverageData.coverage_areas.direct_coverage.length > 0
    ) {
      polygons.push({
        coordinates: coverageData.coverage_areas.direct_coverage,
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.15,
        weight: 2,
        opacity: 0.7,
        dashArray: "5,5",
        popup: "Direct Coverage Area",
      });
    }

    // Network coverage
    if (
      coverageData.coverage_areas?.overall_network_coverage?.networks &&
      Array.isArray(
        coverageData.coverage_areas.overall_network_coverage.networks
      )
    ) {
      const colors = [
        { color: "#f59e0b", fillColor: "#f59e0b" },
        { color: "#f97316", fillColor: "#f97316" },
        { color: "#eab308", fillColor: "#eab308" },
        { color: "#d97706", fillColor: "#d97706" },
        { color: "#fbbf24", fillColor: "#fbbf24" },
      ];

      coverageData.coverage_areas.overall_network_coverage.networks.forEach(
        (network, index) => {
          if (
            network &&
            network.coverage_polygon &&
            Array.isArray(network.coverage_polygon) &&
            network.coverage_polygon.length > 0
          ) {
            const colorSet = colors[index % colors.length];

            polygons.push({
              coordinates: [
                ...network.coverage_polygon,
                network.coverage_polygon[0],
              ],
              color: colorSet.color,
              fillColor: colorSet.fillColor,
              fillOpacity: 0,
              weight: 2,
              opacity: 0.7,
              dashArray: "8,4",
              popup: `<strong>Network ${
                network.network_id ?? "N/A"
              }</strong><br/>
                      Stations: ${network.station_count ?? 0}<br/>
                      Coverage: ${network.coverage_area_km2 ?? 0} km²<br/>
                      ${
                        network.is_connected_to_other_networks
                          ? "✓ Connected Network"
                          : "⚠ Isolated Network"
                      }`,
            });
          }
        }
      );
    }

    // Combined coverage
    if (
      coverageData.coverage_areas?.combined_coverage_polygon &&
      Array.isArray(coverageData.coverage_areas.combined_coverage_polygon) &&
      coverageData.coverage_areas.combined_coverage_polygon.length > 0
    ) {
      polygons.push({
        coordinates: [
          ...coverageData.coverage_areas.combined_coverage_polygon,
          coverageData.coverage_areas.combined_coverage_polygon[0],
        ],
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
        weight: 0,
        opacity: 0.8,
      });
    }

    return polygons;
  }, [coverageData]);

  const getAlertColor = (level: string) => {
    switch (level) {
      case "emergency":
        return "bg-red-900/30 text-red-400 border-red-500/50";
      case "critical":
        return "bg-orange-900/30 text-orange-400 border-orange-500/50";
      case "warning":
        return "bg-amber-900/30 text-amber-400 border-amber-500/50";
      default:
        return "bg-blue-900/30 text-blue-400 border-blue-500/50";
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case "emergency":
      case "critical":
        return <AlertTriangle className="h-5 w-5" />;
      case "warning":
        return <Bell className="h-5 w-5" />;
      default:
        return <CheckCircle2 className="h-5 w-5" />;
    }
  };

  const getCoverageStatusColor = (status: string) => {
    if (status.includes("SAFE")) return "text-green-400";
    if (status.includes("EXTENDED")) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center">
              <Navigation className="h-6 w-6 mr-2 text-cyan-500" />
              EV Safety Monitor with Alerts
              <Badge className="ml-3 bg-cyan-900/30 text-cyan-400 border-cyan-500/50">
                <Sparkles className="h-3 w-3 mr-1" />
                Real-time
              </Badge>
            </h1>
            <p className="text-slate-400">
              Battery-aware coverage analysis with intelligent alert system
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Location & Battery
              </CardTitle>
              <CardDescription className="text-slate-400">
                Search for your location or enter coordinates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="location"
                  className="text-slate-300 flex items-center"
                >
                  <MapPin className="h-4 w-4 mr-2 text-cyan-500" />
                  Current Location
                </Label>
                <Input
                  ref={locationInputRef}
                  id="location"
                  placeholder="Search location or enter coordinates"
                  value={currentLocationDisplay}
                  onChange={handleLocationChange}
                  className="bg-slate-800/50 border-slate-700 text-slate-300"
                />
                <p className="text-xs text-slate-500">
                  Try: "Colombo" or "6.9271,79.8612"
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center justify-between">
                  <div className="flex items-center">
                    <Battery className="h-4 w-4 mr-2 text-cyan-500" />
                    Battery Level
                  </div>
                  <span className="text-cyan-400">{battery}%</span>
                </Label>
                <Slider
                  min={10}
                  max={100}
                  step={1}
                  value={[battery]}
                  onValueChange={(v) => setBattery(v[0])}
                  className="py-4"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-slate-300 flex items-center justify-between">
                  <div className="flex items-center">
                    <Navigation className="h-4 w-4 mr-2 text-cyan-500" />
                    Travel Direction
                  </div>
                  <span className="text-cyan-400 font-mono">
                    {heading}° {getCompassDirection(heading)}
                  </span>
                </Label>

                <div className="relative w-full aspect-square max-w-[220px] my-5 mx-auto">
                  <div
                    className="absolute inset-0 rounded-full border-4 border-cyan-500/30 bg-gradient-to-br from-slate-800/80 to-slate-900/80 cursor-pointer hover:border-cyan-400/50 transition-all shadow-lg shadow-cyan-500/10"
                    onClick={handleCompassClick}
                  >
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                      <div
                        key={deg}
                        className="absolute top-1/2 left-1/2 w-0.5 h-1/2 origin-top"
                        style={{
                          transform: `translate(-50%, 0) rotate(${deg}deg)`,
                        }}
                      >
                        <div
                          className={`w-full ${
                            deg % 90 === 0
                              ? "h-6 bg-cyan-400"
                              : "h-3 bg-cyan-400/40"
                          }`}
                        ></div>
                      </div>
                    ))}

                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-sm font-bold text-cyan-400">
                      N
                    </div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-bold text-cyan-400/60">
                      S
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold text-cyan-400/60">
                      E
                    </div>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-bold text-cyan-400/60">
                      W
                    </div>

                    <div
                      className="absolute top-1/2 left-1/2 w-1 h-[45%] bg-gradient-to-t from-cyan-400 to-cyan-300 origin-bottom shadow-lg shadow-cyan-400/50 transition-transform duration-200"
                      style={{
                        transform: `translate(-50%, -100%) rotate(${heading}deg)`,
                      }}
                    >
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-cyan-300 drop-shadow-lg"></div>
                    </div>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 border-2 border-slate-900"></div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAnalyze}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Navigation className="mr-2 h-4 w-4" />
                    Analyze Safety Status
                  </>
                )}
              </Button>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">Coverage Map</CardTitle>
              </CardHeader>
              <CardContent>
                <CartoMapComponent
                  center={mapCenter}
                  zoom={8}
                  height="450px"
                  markers={mapMarkers}
                  routes={mapRoutes}
                  coveragePolygons={mapCoveragePolygons}
                  interactive={true}
                />

                {coverageData && (
                  <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
                    <div className="p-2 rounded bg-green-900/10 border border-green-500/30">
                      <div className="flex items-center mb-1">
                        <div className="w-3 h-0.5 bg-green-400 mr-2 border-dashed"></div>
                        <span className="text-green-400 font-medium">
                          Direct Range
                        </span>
                      </div>
                      <div className="text-slate-400">No charging needed</div>
                    </div>
                    <div className="p-2 rounded bg-blue-900/10 border border-blue-500/30">
                      <div className="flex items-center mb-1">
                        <div className="w-3 h-0.5 bg-blue-400 mr-2"></div>
                        <span className="text-blue-400 font-medium">
                          Extended Range
                        </span>
                      </div>
                      <div className="text-slate-400">With charging stops</div>
                    </div>
                    <div className="p-2 rounded bg-orange-900/10 border border-orange-500/30">
                      <div className="flex items-center mb-1">
                        <Sparkles className="w-3 h-3 text-orange-400 mr-2" />
                        <span className="text-orange-400 font-medium">
                          Network Coverage
                        </span>
                      </div>
                      <div className="text-slate-400">
                        Based on charging infrastructure
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {coverageData &&
          coverageData.alerts &&
          coverageData.alerts.total_alerts > 0 && (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center justify-between">
                  <div className="flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-cyan-400" />
                    Active Alerts ({coverageData.alerts.total_alerts})
                  </div>
                  <Badge
                    className={getAlertColor(
                      coverageData.alerts.highest_severity || "info"
                    )}
                  >
                    {(
                      coverageData.alerts.highest_severity || "info"
                    ).toUpperCase()}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {coverageData.dashboard_summary?.immediate_action_required
                    ? "⚠️ Immediate action required"
                    : "Monitor these conditions during your journey"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {coverageData.alerts.alerts_list &&
                  Array.isArray(coverageData.alerts.alerts_list) &&
                  coverageData.alerts.alerts_list.map((alert, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getAlertColor(
                        alert.alert_level || "info"
                      )}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center flex-1">
                          {getAlertIcon(alert.alert_level || "info")}
                          <div className="ml-3 flex-1">
                            <div className="font-medium text-base">
                              {alert.title || "Alert"}
                            </div>
                            <div className="text-sm opacity-90 mt-1">
                              {alert.message || "No message"}
                            </div>
                          </div>
                        </div>
                        <Badge
                          className={`${getAlertColor(
                            alert.alert_level || "info"
                          )} text-xs ml-3`}
                        >
                          {(alert.alert_level || "info").toUpperCase()}
                        </Badge>
                      </div>

                      {alert.recommended_action && (
                        <div className="mt-3 p-3 rounded bg-slate-900/50 border border-slate-700/30">
                          <div className="flex items-start">
                            <TrendingUp className="h-4 w-4 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="text-sm flex-1">
                              <span className="text-slate-400 font-medium">
                                Recommended Action:
                              </span>
                              <span className="text-slate-300 ml-2">
                                {alert.recommended_action}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {(alert.distance_to_boundary_km ||
                        alert.station_info ||
                        alert.time_to_boundary_minutes ||
                        alert.battery_at_boundary_percent) && (
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          {alert.distance_to_boundary_km !== undefined &&
                            alert.distance_to_boundary_km !== null && (
                              <div className="flex items-center">
                                <Map className="h-4 w-4 text-slate-400 mr-2" />
                                <span className="text-slate-400">
                                  Distance:
                                </span>
                                <span className="text-slate-300 ml-2 font-medium">
                                  {alert.distance_to_boundary_km.toFixed(1)} km
                                </span>
                              </div>
                            )}
                          {alert.time_to_boundary_minutes !== undefined &&
                            alert.time_to_boundary_minutes !== null && (
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-slate-400 mr-2" />
                                <span className="text-slate-400">Time:</span>
                                <span className="text-slate-300 ml-2 font-medium">
                                  {alert.time_to_boundary_minutes.toFixed(0)}{" "}
                                  min
                                </span>
                              </div>
                            )}
                          {alert.battery_at_boundary_percent !== undefined &&
                            alert.battery_at_boundary_percent !== null && (
                              <div className="flex items-center">
                                <Battery className="h-4 w-4 text-slate-400 mr-2" />
                                <span className="text-slate-400">
                                  Battery at boundary:
                                </span>
                                <span className="text-slate-300 ml-2 font-medium">
                                  {alert.battery_at_boundary_percent.toFixed(1)}
                                  %
                                </span>
                              </div>
                            )}
                          {alert.station_info && (
                            <div className="col-span-2 flex items-center">
                              <Zap className="h-4 w-4 text-slate-400 mr-2" />
                              <span className="text-slate-400">Station:</span>
                              <span className="text-slate-300 ml-2 font-medium">
                                {alert.station_info.name || "Unknown"} (
                                {(
                                  alert.station_info.distance_km ||
                                  alert.station_info.direct_distance_km ||
                                  0
                                ).toFixed(1)}{" "}
                                km)
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {alert.timestamp && (
                        <div className="mt-2 flex items-center text-xs text-slate-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

        {coverageData && (
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-400" />
                Coverage Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-lg bg-green-900/20 border border-green-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <Battery className="h-5 w-5 text-green-400" />
                    <Badge className="bg-green-900/30 text-green-400 border-green-500/50 text-xs">
                      USABLE
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {(
                      coverageData.current_location?.usable_battery_percent ?? 0
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-xs text-slate-400">Usable Battery</div>
                </div>

                <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <Route className="h-5 w-5 text-blue-400" />
                    <Badge className="bg-blue-900/30 text-blue-400 border-blue-500/50 text-xs">
                      MAX
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {(
                      coverageData.current_location?.max_direct_range_km ?? 0
                    ).toFixed(1)}{" "}
                    km
                  </div>
                  <div className="text-xs text-slate-400">Direct Range</div>
                </div>

                <div className="p-4 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                    <Badge className="bg-cyan-900/30 text-cyan-400 border-cyan-500/50 text-xs">
                      REACH
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-cyan-400 mb-1">
                    {coverageData.reachable_stations?.count ?? 0}
                  </div>
                  <div className="text-xs text-slate-400">Stations</div>
                </div>

                <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 text-purple-400" />
                    <Badge className="bg-purple-900/30 text-purple-400 border-purple-500/50 text-xs">
                      COV
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-purple-400 mb-1">
                    {(
                      coverageData.reachability_stats
                        ?.reachability_percentage ?? 0
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-xs text-slate-400">Coverage</div>
                </div>

                <div
                  className={`p-4 rounded-lg border ${
                    coverageData.coverage_status?.coverage_level?.includes(
                      "SAFE"
                    )
                      ? "bg-green-900/20 border-green-500/30"
                      : coverageData.coverage_status?.coverage_level?.includes(
                          "EXTENDED"
                        )
                      ? "bg-amber-900/20 border-amber-500/30"
                      : "bg-red-900/20 border-red-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Shield
                      className={`h-5 w-5 ${getCoverageStatusColor(
                        coverageData.coverage_status?.coverage_level || ""
                      )}`}
                    />
                    <Badge
                      className={`text-xs ${
                        coverageData.coverage_status?.coverage_level?.includes(
                          "SAFE"
                        )
                          ? "bg-green-900/30 text-green-400 border-green-500/50"
                          : coverageData.coverage_status?.coverage_level?.includes(
                              "EXTENDED"
                            )
                          ? "bg-amber-900/30 text-amber-400 border-amber-500/50"
                          : "bg-red-900/30 text-red-400 border-red-500/50"
                      }`}
                    >
                      STATUS
                    </Badge>
                  </div>
                  <div
                    className={`text-lg font-bold mb-1 ${getCoverageStatusColor(
                      coverageData.coverage_status?.coverage_level || ""
                    )}`}
                  >
                    {coverageData.coverage_status?.coverage_level
                      ? coverageData.coverage_status.coverage_level.split(
                          " - "
                        )[0]
                      : "Unknown"}
                  </div>
                  <div className="text-xs text-slate-400">Current State</div>
                </div>
              </div>

              {coverageData.travel_metrics?.speed_kmh !== null &&
                coverageData.travel_metrics?.speed_kmh !== undefined && (
                  <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
                    <div className="flex items-center mb-3">
                      <Gauge className="h-5 w-5 text-cyan-400 mr-2" />
                      <span className="text-sm font-medium text-cyan-400">
                        Travel Metrics
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Battery Drain:</span>
                        <span className="text-slate-300 font-medium">
                          {coverageData.travel_metrics
                            .battery_drain_rate_per_km !== null &&
                          coverageData.travel_metrics
                            .battery_drain_rate_per_km !== undefined
                            ? coverageData.travel_metrics.battery_drain_rate_per_km.toFixed(
                                2
                              )
                            : "N/A"}{" "}
                          %/km
                        </span>
                      </div>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {coverageData &&
          coverageData.reachable_stations &&
          coverageData.reachable_stations.count > 0 && (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-400" />
                  Reachable Charging Stations
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Stations within your range with battery efficiency analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {coverageData.reachable_stations.stations &&
                    Array.isArray(coverageData.reachable_stations.stations) &&
                    coverageData.reachable_stations.stations.map(
                      (station, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${
                            station.battery_efficient
                              ? "bg-green-900/10 border-green-500/30"
                              : "bg-amber-900/10 border-amber-500/30"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Zap
                                className={`h-5 w-5 mr-3 ${
                                  station.battery_efficient
                                    ? "text-green-400"
                                    : "text-amber-400"
                                }`}
                              />
                              <div>
                                <div
                                  className={`text-lg font-medium ${
                                    station.battery_efficient
                                      ? "text-green-400"
                                      : "text-amber-400"
                                  }`}
                                >
                                  {station.name || "Unknown Station"}
                                </div>
                                <div className="text-sm text-slate-400">
                                  {station.location &&
                                  Array.isArray(station.location) &&
                                  station.location.length === 2
                                    ? `${station.location[0].toFixed(
                                        4
                                      )}, ${station.location[1].toFixed(4)}`
                                    : "Location unavailable"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-slate-300">
                                {(station.direct_distance_km ?? 0).toFixed(1)}{" "}
                                km
                              </div>
                              <div className="text-xs text-slate-400">
                                {(station.hops_required ?? 0) > 0
                                  ? `${station.hops_required} hops`
                                  : "Direct"}
                                {station.path_distance_km &&
                                  station.path_distance_km !==
                                    station.direct_distance_km &&
                                  ` • Path: ${station.path_distance_km.toFixed(
                                    1
                                  )} km`}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <Badge
                              className={`${
                                station.battery_efficient
                                  ? "bg-green-900/30 text-green-400 border-green-500/50"
                                  : "bg-amber-900/30 text-amber-400 border-amber-500/50"
                              }`}
                            >
                              {station.battery_efficient
                                ? "✓ Efficient Route"
                                : "⚠ Battery Intensive"}
                            </Badge>
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center">
                                <Battery className="h-4 w-4 text-slate-400 mr-1" />
                                <span className="text-slate-300">
                                  {(station.final_battery_percent ?? 0).toFixed(
                                    1
                                  )}
                                  % remaining
                                </span>
                              </div>
                              <div className="text-slate-400">
                                {station.reachability_method || "Unknown"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                </div>

                {coverageData.reachable_stations.count > 10 && (
                  <div className="mt-4 text-center">
                    <Badge className="bg-slate-800/50 text-slate-400 border-slate-600">
                      Showing{" "}
                      {Math.min(
                        10,
                        coverageData.reachable_stations.stations?.length ?? 0
                      )}{" "}
                      of {coverageData.reachable_stations.count} reachable
                      stations
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {coverageData && (
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <Route className="h-5 w-5 mr-2 text-blue-400" />
                Multi-Hop Reachability Analysis
              </CardTitle>
              <CardDescription className="text-slate-400">
                Distribution of stations by charging stops required
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {coverageData.reachability_stats?.direct_reachable ?? 0}
                  </div>
                  <div className="text-sm text-slate-400 mb-2">
                    Direct Access
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-green-400 h-2 rounded-full"
                      style={{
                        width: `${
                          coverageData.reachable_stations?.count > 0
                            ? ((coverageData.reachability_stats
                                ?.direct_reachable ?? 0) /
                                coverageData.reachable_stations.count) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {coverageData.reachability_stats?.multi_hop_reachable ?? 0}
                  </div>
                  <div className="text-sm text-slate-400 mb-2">Multi-Hop</div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-400 h-2 rounded-full"
                      style={{
                        width: `${
                          coverageData.reachable_stations?.count > 0
                            ? ((coverageData.reachability_stats
                                ?.multi_hop_reachable ?? 0) /
                                coverageData.reachable_stations.count) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">
                    {coverageData.reachability_stats?.average_hops !==
                      undefined &&
                    coverageData.reachability_stats?.average_hops !== null
                      ? coverageData.reachability_stats.average_hops.toFixed(2)
                      : "N/A"}
                  </div>
                  <div className="text-sm text-slate-400 mb-2">
                    Average Hops
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Avg battery:{" "}
                    {coverageData.reachability_stats?.average_final_battery !==
                      undefined &&
                    coverageData.reachability_stats?.average_final_battery !==
                      null
                      ? coverageData.reachability_stats.average_final_battery.toFixed(
                          1
                        )
                      : "N/A"}
                    %
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {coverageData &&
          coverageData.unreachable_stations &&
          coverageData.unreachable_stations.count > 0 && (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center">
                  <XCircle className="h-5 w-5 mr-2 text-red-400" />
                  Unreachable Stations
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {coverageData.unreachable_stations.count} stations beyond your
                  current range
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  {coverageData.unreachable_stations.stations &&
                    Array.isArray(coverageData.unreachable_stations.stations) &&
                    coverageData.unreachable_stations.stations.map(
                      (station, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg bg-red-900/10 border border-red-500/30"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
                              <div>
                                <div className="text-lg font-medium text-red-400">
                                  {station.name || "Unknown Station"}
                                </div>
                                <div className="text-sm text-slate-400">
                                  {station.location &&
                                  Array.isArray(station.location) &&
                                  station.location.length === 2
                                    ? `${station.location[0].toFixed(
                                        4
                                      )}, ${station.location[1].toFixed(4)}`
                                    : "Location unavailable"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-slate-300">
                                {(station.direct_distance_km ?? 0).toFixed(1)}{" "}
                                km
                              </div>
                              <div className="text-sm text-red-400">
                                Beyond {maxHops}-hop reach
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-300 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-cyan-400" />
                    Recommendations
                  </h4>
                  <div className="space-y-2">
                    {[
                      "Consider charging at nearby stations to extend your range",
                      `Increase max hops beyond ${maxHops} for longer route planning`,
                      "Plan intermediate charging stops for distant destinations",
                      "Monitor battery efficiency settings for optimal range calculation",
                    ].map((rec, index) => (
                      <div
                        key={index}
                        className="flex items-start p-3 rounded-md bg-slate-800/30 border border-slate-700/30"
                      >
                        <div className="h-5 w-5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <span className="text-xs font-medium">
                            {index + 1}
                          </span>
                        </div>
                        <div className="text-sm text-slate-300">{rec}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        {coverageData && (
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <Cpu className="h-5 w-5 mr-2 text-cyan-400" />
                Analysis Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex justify-between items-center p-3 rounded-md bg-slate-800/50 border border-slate-700/30">
                  <span className="text-slate-400">Analysis Time:</span>
                  <span className="text-slate-300 font-medium">
                    {(coverageData.analysis_time_seconds ?? 0).toFixed(3)}s
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-md bg-slate-800/50 border border-slate-700/30">
                  <span className="text-slate-400">Stations Analyzed:</span>
                  <span className="text-slate-300 font-medium">
                    {(coverageData.reachable_stations?.count ?? 0) +
                      (coverageData.unreachable_stations?.count ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-md bg-green-800/30 border border-green-600/30">
                  <span className="text-green-400">Alert System:</span>
                  <Badge className="bg-green-900/30 text-green-400 border-green-500/50 text-xs">
                    ✓ Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
