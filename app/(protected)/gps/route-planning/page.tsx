"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  CornerDownRight,
  Battery,
  Route,
  Zap,
  Navigation,
  TrendingUp,
  TrendingDown,
  Gauge,
  MapIcon,
  Clock,
  Target,
  BarChart3,
  Car,
  Thermometer,
} from "lucide-react";
import CartoMap from "@/components/maps/carto-map";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface RouteSummary {
  location: string;
  category: "Source" | "Destination" | "Visiting_Charging_Station";
  battery_on_arrival_percent: number;
  battery_on_departure_percent: number;
  next_stop_distance_km: number;
  station_name?: string;
  selection_strategy?: string;
  visiting_flag?: string;
  progress_towards_destination_km?: number;
  battery_utilization_percent?: number;
  efficiency_breakdown?: {
    base_efficiency_km_per_percent: number;
    elevation_factor: number;
    weather_factor: number;
    traffic_factor: number;
    combined_efficiency_km_per_percent: number;
    efficiency_change_percent: number;
  };
  terrain_analysis?: any;
  weather_conditions?: any;
  traffic_conditions?: any;
}

interface RouteData {
  success: boolean;
  distance_km: number;
  message: string;
  planned_charging_stops_count: number;
  route_summary: RouteSummary[];
  unique_stations_visited?: number;
  google_api_calls_used?: number;
  cache_hit_rate?: string;
  distance_source?: string;
  algorithm_used?: string;
  efficiency_system?: {
    base_efficiency_km_per_percent: number;
    average_dynamic_efficiency_km_per_percent: number;
    efficiency_variance_percent: number;
    factors_included: string[];
    cache_status: any;
  };
  average_battery_utilization_percent?: number;
  estimated_arrival_battery_percent?: number;
  strategy_summary?: {
    first_station_strategy: string;
    final_station_strategy: string;
    middle_station_strategy: string;
    stations_by_strategy: any;
  };
  optimization_goals?: string[];
  llm_description?: string;
  llm_charging_strategy?: string;
}

interface Waypoint {
  id: string;
  address: string;
  lat: number;
  lng: number;
}

interface GoogleRouteData {
  distance: string;
  duration: string;
  polyline: string;
  optimizedOrder: number[];
  stepByStepDirections?: {
    instruction: string;
    distance: number;
    duration: string;
    maneuver: string;
  }[];
}

interface ProcessedRouteData {
  route: { lat: number; lng: number; name: string; category: string }[];
  batteryUsage: number;
  distance: number;
  estimatedTime: number;
  chargingStops: {
    name: string;
    lat: number;
    lng: number;
    chargingTime: number;
    batteryAdded: number;
    batteryOnArrival: number;
    batteryOnDeparture: number;
  }[];
  googleRoute?: GoogleRouteData;
  optimizedPolyline?: string;
  originalApiData?: RouteData;
}

export default function RoutePlanningPage() {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [sourceDisplay, setSourceDisplay] = useState("");
  const [destinationDisplay, setDestinationDisplay] = useState("");
  const [battery, setBattery] = useState(80);
  const [efficiency, setEfficiency] = useState(70);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routeData, setRouteData] = useState<ProcessedRouteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const sourceAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(
    null
  );
  const destinationAutocompleteRef =
    useRef<google.maps.places.Autocomplete | null>(null);

  const [DEFAULT_CHARGING_STATIONS, setStations] = useState<
    { lat: number; lon: number; name: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/stations")
      .then((res) => res.json())
      .then((data) => setStations(data))
      .catch((err) => console.error(err));
  }, []);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!window.google || !window.google.maps) {
      console.error("Google Maps API not loaded");
      return;
    }

    // Initialize source autocomplete
    if (sourceInputRef.current && !sourceAutocompleteRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(
        sourceInputRef.current,
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

          setSource(`${lat.toFixed(6)},${lng.toFixed(6)}`);
          setSourceDisplay(placeName);
        }
      });

      sourceAutocompleteRef.current = autocomplete;
    }

    // Initialize destination autocomplete
    if (destinationInputRef.current && !destinationAutocompleteRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(
        destinationInputRef.current,
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

          setDestination(`${lat.toFixed(6)},${lng.toFixed(6)}`);
          setDestinationDisplay(placeName);
        }
      });

      destinationAutocompleteRef.current = autocomplete;
    }
  }, []);

  const parseLocation = (locationStr: string): { lat: number; lng: number } => {
    const cleaned = locationStr.replace(/[()]/g, "");
    const [lat, lng] = cleaned.split(",").map((s) => parseFloat(s.trim()));
    return { lat, lng };
  };

  const getLocationName = (lat: number, lng: number): string => {
    const locations: { [key: string]: string } = {
      "6.9271,79.8612": "Colombo",
      "6.960975,79.880949": "Paliyagoda",
      "7.4863,80.3623": "Kandy",
    };

    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    return locations[key] || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  const decodePolyline = (encoded: string): [number, number][] => {
    const points: [number, number][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push([lat / 1e5, lng / 1e5]);
    }

    return points;
  };

  const coordsToAddress = async (lat: number, lng: number): Promise<string> => {
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
  };

  const getOptimalRoute = async (
    origin: { lat: number; lng: number; name: string },
    destination: { lat: number; lng: number; name: string },
    waypoints: { lat: number; lng: number; name: string }[]
  ): Promise<GoogleRouteData | null> => {
    try {
      setIsOptimizing(true);

      const formattedOrigin: Waypoint = {
        id: "origin",
        address: await coordsToAddress(origin.lat, origin.lng),
        lat: origin.lat,
        lng: origin.lng,
      };

      const formattedDestination: Waypoint = {
        id: "destination",
        address: await coordsToAddress(destination.lat, destination.lng),
        lat: destination.lat,
        lng: destination.lng,
      };

      const formattedWaypoints: Waypoint[] = await Promise.all(
        waypoints.map(async (wp, index) => ({
          id: `waypoint_${index}`,
          address: await coordsToAddress(wp.lat, wp.lng),
          lat: wp.lat,
          lng: wp.lng,
        }))
      );

      const response = await fetch("/api/compute-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: formattedOrigin,
          destination: formattedDestination,
          waypoints: formattedWaypoints,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Route optimization failed with status ${response.status}`
        );
      }

      const json = await response.json();

      if (!json.routes || json.routes.length === 0) {
        throw new Error("No routes returned from optimization API");
      }

      const route = json.routes[0];
      const optimizedOrder: number[] =
        route.optimizedIntermediateWaypointIndex || [];

      const durationInSeconds = route.duration
        ? parseFloat(route.duration.replace("s", ""))
        : route.staticDuration
        ? parseFloat(route.staticDuration.replace("s", ""))
        : 0;

      const googleRouteData: GoogleRouteData = {
        distance: `${(route.distanceMeters / 1000).toFixed(1)} km`,
        duration: `${Math.round(durationInSeconds / 60)} mins`,
        polyline: route.polyline.encodedPolyline,
        optimizedOrder,
        stepByStepDirections: route.stepByStepDirections || [],
      };

      return googleRouteData;
    } catch (error) {
      console.error("Error getting optimal route:", error);
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  };

  const processRouteData = async (
    apiData: RouteData
  ): Promise<ProcessedRouteData> => {
    const route = apiData.route_summary.map((item) => {
      const coords = parseLocation(item.location);
      return {
        lat: coords.lat,
        lng: coords.lng,
        name: item.station_name || getLocationName(coords.lat, coords.lng),
        category: item.category,
      };
    });

    const chargingStops = apiData.route_summary
      .filter((item) => item.category === "Visiting_Charging_Station")
      .map((item) => {
        const coords = parseLocation(item.location);
        return {
          name: item.station_name || "Charging Station",
          lat: coords.lat,
          lng: coords.lng,
          chargingTime: Math.round(
            (item.battery_on_departure_percent -
              item.battery_on_arrival_percent) *
              0.8
          ),
          batteryAdded:
            item.battery_on_departure_percent - item.battery_on_arrival_percent,
          batteryOnArrival: item.battery_on_arrival_percent,
          batteryOnDeparture: item.battery_on_departure_percent,
        };
      });

    const sourceItem = apiData.route_summary.find(
      (item) => item.category === "Source"
    );
    const destinationItem = apiData.route_summary.find(
      (item) => item.category === "Destination"
    );
    const batteryUsage =
      sourceItem && destinationItem
        ? sourceItem.battery_on_departure_percent -
          destinationItem.battery_on_arrival_percent
        : 0;

    let googleRoute: GoogleRouteData | undefined;
    let optimizedPolyline: string | undefined;

    if (route.length >= 2) {
      try {
        const origin = route.find((r) => r.category === "Source");
        const destination = route.find((r) => r.category === "Destination");
        const waypoints = route.filter(
          (r) => r.category === "Visiting_Charging_Station"
        );

        if (origin && destination) {
          googleRoute = await getOptimalRoute(origin, destination, waypoints);
          if (googleRoute) {
            optimizedPolyline = googleRoute.polyline;
          }
        }
      } catch (error) {
        console.error("Failed to get optimal route:", error);
      }
    }

    return {
      route,
      batteryUsage: Math.round(batteryUsage),
      distance: apiData.distance_km,
      estimatedTime: Math.round(apiData.distance_km * 1.2),
      chargingStops,
      googleRoute,
      optimizedPolyline,
      originalApiData: apiData,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!source.trim() || !destination.trim()) {
      setError("Please enter both source and destination");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/ev-route-plan", {
        // const response = await fetch("http://127.0.0.1:8080/ev-route-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: source.trim(),
          destination: destination.trim(),
          battery: battery,
          efficiency: efficiency / 100,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const apiResponse: RouteData = await response.json();

      if (!apiResponse.success) {
        throw new Error(apiResponse.message || "Route planning failed");
      }

      const processedData = await processRouteData(apiResponse);
      setRouteData(processedData);
    } catch (err) {
      console.error("Error planning route:", err);
      setRouteData(null);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while planning the route"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSourceDisplay(value);
    setSource(value);
  };

  const handleDestinationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDestinationDisplay(value);
    setDestination(value);
  };

  const startJourney = () => {
    if (!routeData || !routeData.googleRoute) {
      if (!routeData) return;

      const origin = routeData.route.find((r) => r.category === "Source");
      if (!origin) return;

      let url = `https://www.google.com/maps/dir/${origin.lat},${origin.lng}`;

      routeData.chargingStops.forEach((stop) => {
        url += `/${stop.lat},${stop.lng}`;
      });

      const destination = routeData.route.find(
        (r) => r.category === "Destination"
      );
      if (destination) {
        url += `/${destination.lat},${destination.lng}`;
      }

      window.open(url, "_blank");
      return;
    }

    const origin = routeData.route.find((r) => r.category === "Source");
    const destination = routeData.route.find(
      (r) => r.category === "Destination"
    );

    if (!origin) return;

    const orderedWaypoints =
      routeData.googleRoute.optimizedOrder.length > 0
        ? routeData.googleRoute.optimizedOrder.map(
            (i) => routeData.chargingStops[i]
          )
        : routeData.chargingStops;

    let url = `https://www.google.com/maps/dir/${origin.lat},${origin.lng}`;

    orderedWaypoints.forEach((wp) => {
      url += `/${wp.lat},${wp.lng}`;
    });

    if (destination) {
      url += `/${destination.lat},${destination.lng}`;
    }

    window.open(url, "_blank");
  };

  const mapMarkers = routeData
    ? [
        {
          position: [routeData.route[0].lat, routeData.route[0].lng] as [
            number,
            number
          ],
          popup: `<strong>Start:</strong> ${routeData.route[0].name}`,
          color: "#10b981",
        },
        {
          position: [
            routeData.route[routeData.route.length - 1].lat,
            routeData.route[routeData.route.length - 1].lng,
          ] as [number, number],
          popup: `<strong>Destination:</strong> ${
            routeData.route[routeData.route.length - 1].name
          }`,
          color: "#3b82f6",
        },
        ...routeData.chargingStops.map((stop) => ({
          position: [stop.lat, stop.lng] as [number, number],
          popup: `<strong>⚡ ${stop.name}</strong><br>Arrive with: ${stop.batteryOnArrival}%<br>Depart with: ${stop.batteryOnDeparture}%<br>Battery added: ${stop.batteryAdded}%<br><em>Active charging stop</em>`,
          icon: "lightning",
          color: "#f59e0b",
        })),
        ...DEFAULT_CHARGING_STATIONS.filter(
          (station) =>
            !routeData.chargingStops.some(
              (visitedStop) =>
                Math.abs(visitedStop.lat - station.lat) < 0.001 &&
                Math.abs(visitedStop.lng - station.lon) < 0.001
            )
        ).map((station) => ({
          position: [station.lat, station.lon] as [number, number],
          popup: `<strong>🔋 ${station.name}</strong><br><em>Available charging station</em>`,
          icon: "charging",
          color: "#64748b",
        })),
      ]
    : [
        ...DEFAULT_CHARGING_STATIONS.map((station) => ({
          position: [station.lat, station.lon] as [number, number],
          popup: `<strong>🔋 ${station.name}</strong><br><em>Available charging station</em>`,
          icon: "charging",
          color: "#64748b",
        })),
      ];

  const mapRoutes = routeData
    ? routeData.optimizedPolyline
      ? [
          {
            path: decodePolyline(routeData.optimizedPolyline),
            color: "#06b6d4",
            weight: 4,
          },
        ]
      : [
          {
            path: routeData.route.map(
              (point) => [point.lat, point.lng] as [number, number]
            ),
            color: "#94a3b8",
            weight: 3,
          },
        ]
    : [];

  const mapCenter = routeData
    ? [
        (routeData.route[0].lat +
          routeData.route[routeData.route.length - 1].lat) /
          2,
        (routeData.route[0].lng +
          routeData.route[routeData.route.length - 1].lng) /
          2,
      ]
    : [6.9271, 79.8612];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            EV Route Planning
          </h1>
          <p className="text-slate-400">
            Plan optimal routes for electric vehicles with charging stops and
            Google Maps integration
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-slate-100">Plan Your Route</CardTitle>
            <CardDescription className="text-slate-400">
              Search for locations using Google Places or enter coordinates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="source"
                    className="text-slate-300 flex items-center"
                  >
                    <MapPin className="h-4 w-4 mr-2 text-cyan-500" />
                    Starting Point
                  </Label>
                  <Input
                    ref={sourceInputRef}
                    id="source"
                    placeholder="Search location or enter coordinates"
                    value={sourceDisplay}
                    onChange={handleSourceChange}
                    className="bg-slate-800/50 border-slate-700 text-slate-300"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Try: "Colombo" or "6.9271,79.8612"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="destination"
                    className="text-slate-300 flex items-center"
                  >
                    <CornerDownRight className="h-4 w-4 mr-2 text-cyan-500" />
                    Destination
                  </Label>
                  <Input
                    ref={destinationInputRef}
                    id="destination"
                    placeholder="Search location or enter coordinates"
                    value={destinationDisplay}
                    onChange={handleDestinationChange}
                    className="bg-slate-800/50 border-slate-700 text-slate-300"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Try: "Kandy" or "7.4863,80.3623"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="battery"
                    className="text-slate-300 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Battery className="h-4 w-4 mr-2 text-cyan-500" />
                      Current Battery Level
                    </div>
                    <span className="text-cyan-400">{battery}%</span>
                  </Label>
                  <Slider
                    id="battery"
                    min={0}
                    max={100}
                    step={1}
                    value={[battery]}
                    onValueChange={(value) => setBattery(value[0])}
                    className="py-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="efficiency"
                    className="text-slate-300 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Zap className="h-4 w-4 mr-2 text-cyan-500" />
                      Vehicle Efficiency
                    </div>
                    <span className="text-cyan-400">{efficiency}%</span>
                  </Label>
                  <Slider
                    id="efficiency"
                    min={50}
                    max={100}
                    step={1}
                    value={[efficiency]}
                    onValueChange={(value) => setEfficiency(value[0])}
                    className="py-4"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                disabled={isLoading || isOptimizing}
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    Planning Route...
                  </>
                ) : isOptimizing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    Optimizing with Google Maps...
                  </>
                ) : (
                  <>
                    <Route className="mr-2 h-4 w-4" />
                    Plan Optimal Route
                  </>
                )}
              </Button>

              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </form>
          </CardContent>
        </Card>

        {/* Map and Route Details */}
        <div className="lg:col-span-2 space-y-6">
          <CartoMap
            center={mapCenter as [number, number]}
            zoom={10}
            markers={mapMarkers}
            routes={mapRoutes}
            height="510px"
          />
        </div>
      </div>

      {routeData && routeData.googleRoute && (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <Navigation className="h-5 w-5 mr-2 text-cyan-400" />
              Google Maps Optimized Route
            </CardTitle>
            <CardDescription className="text-slate-400">
              Real-time optimized route with accurate directions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Badge className="bg-cyan-900/30 text-cyan-400 border-cyan-500/50">
                  Distance: {routeData.googleRoute.distance}
                </Badge>
                <Badge className="bg-cyan-900/30 text-cyan-400 border-cyan-500/50">
                  Duration: {routeData.googleRoute.duration}
                </Badge>
              </div>
              <Button
                onClick={startJourney}
                className="bg-green-600 hover:bg-green-700"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Start Navigation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Data Display Section */}
      {routeData && routeData.originalApiData && (
        <>
          {/* Algorithm & Optimization Overview */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-400" />
                Route Optimization Summary
              </CardTitle>
              <CardDescription className="text-slate-400">
                Advanced AI-powered route planning with dynamic efficiency
                analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-green-900/20 border border-green-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 text-green-400" />
                    <Badge className="bg-green-900/30 text-green-400 border-green-500/50 text-xs">
                      SUCCESS
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {routeData.originalApiData.estimated_arrival_battery_percent?.toFixed(
                      1
                    ) || "N/A"}
                    %
                  </div>
                  <div className="text-xs text-slate-400">Arrival Battery</div>
                </div>

                <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <MapIcon className="h-5 w-5 text-blue-400" />
                    <Badge className="bg-blue-900/30 text-blue-400 border-blue-500/50 text-xs">
                      {routeData.originalApiData.distance_source?.includes(
                        "cached"
                      )
                        ? "CACHED"
                        : "LIVE"}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {routeData.originalApiData.distance_km.toFixed(1)} km
                  </div>
                  <div className="text-xs text-slate-400">Total Distance</div>
                </div>

                <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <Zap className="h-5 w-5 text-amber-400" />
                    <Badge className="bg-amber-900/30 text-amber-400 border-amber-500/50 text-xs">
                      OPTIMAL
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-amber-400 mb-1">
                    {routeData.originalApiData.planned_charging_stops_count}
                  </div>
                  <div className="text-xs text-slate-400">Charging Stops</div>
                </div>

                <div className="p-4 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <Gauge className="h-5 w-5 text-cyan-400" />
                    <Badge className="bg-cyan-900/30 text-cyan-400 border-cyan-500/50 text-xs">
                      {routeData.originalApiData.cache_hit_rate}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-cyan-400 mb-1">
                    {routeData.originalApiData.average_battery_utilization_percent?.toFixed(
                      1
                    ) || "N/A"}
                    %
                  </div>
                  <div className="text-xs text-slate-400">
                    Avg Battery Usage
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-purple-900/10 border border-purple-500/20">
                  <div className="flex items-center mb-2">
                    <BarChart3 className="h-4 w-4 text-purple-400 mr-2" />
                    <span className="text-sm font-medium text-purple-400">
                      Algorithm Used
                    </span>
                  </div>
                  <div className="text-slate-300 text-sm">
                    {routeData.originalApiData.algorithm_used}
                  </div>
                </div>

                {routeData.originalApiData.message && (
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-600/50">
                    <div className="flex items-center mb-2">
                      <Car className="h-4 w-4 text-slate-400 mr-2" />
                      <span className="text-sm font-medium text-slate-400">
                        Optimization Message
                      </span>
                    </div>
                    <div className="text-slate-300 text-sm">
                      {routeData.originalApiData.message}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Efficiency System Details */}
          {routeData.originalApiData.efficiency_system && (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center">
                  <Gauge className="h-5 w-5 mr-2 text-green-400" />
                  Dynamic Efficiency System
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Real-time efficiency calculations with environmental factors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-green-900/20 border border-green-500/30 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {routeData.originalApiData.efficiency_system.base_efficiency_km_per_percent.toFixed(
                        2
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Base Efficiency (km/%)
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {routeData.originalApiData.efficiency_system.average_dynamic_efficiency_km_per_percent.toFixed(
                        2
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Dynamic Avg (km/%)
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-500/30 text-center">
                    <div className="text-2xl font-bold text-amber-400 mb-1">
                      {routeData.originalApiData.efficiency_system.efficiency_variance_percent.toFixed(
                        1
                      )}
                      %
                    </div>
                    <div className="text-xs text-slate-400">Variance</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
                      <Thermometer className="h-4 w-4 mr-2 text-cyan-400" />
                      Environmental Factors Included
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {routeData.originalApiData.efficiency_system.factors_included.map(
                        (factor, index) => (
                          <Badge
                            key={index}
                            className="bg-cyan-900/30 text-cyan-400 border-cyan-500/50"
                          >
                            {factor
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>

                  {routeData.originalApiData.efficiency_system.cache_status && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-3">
                        Cache Status
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Object.entries(
                          routeData.originalApiData.efficiency_system
                            .cache_status
                        ).map(([key, value]) => (
                          <div
                            key={key}
                            className="p-3 rounded-lg bg-slate-800/50 border border-slate-600/50"
                          >
                            <div className="text-xs text-slate-400 mb-1">
                              {key
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </div>
                            <div className="text-sm text-slate-300">
                              {value as string}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Route Breakdown */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <Route className="h-5 w-5 mr-2 text-blue-400" />
                Detailed Route Analysis
              </CardTitle>
              <CardDescription className="text-slate-400">
                Step-by-step breakdown with efficiency analysis for each segment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routeData.originalApiData.route_summary.map(
                  (segment, index) => {
                    const coords = parseLocation(segment.location);
                    const isChargingStop =
                      segment.category === "Visiting_Charging_Station";
                    const isSource = segment.category === "Source";
                    const isDestination = segment.category === "Destination";

                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          isSource
                            ? "bg-green-900/10 border-green-500/30"
                            : isDestination
                            ? "bg-blue-900/10 border-blue-500/30"
                            : isChargingStop
                            ? "bg-amber-900/10 border-amber-500/30"
                            : "bg-slate-800/30 border-slate-600/30"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center mr-4 ${
                                isSource
                                  ? "bg-green-900/30 text-green-400 border border-green-500/50"
                                  : isDestination
                                  ? "bg-blue-900/30 text-blue-400 border border-blue-500/50"
                                  : isChargingStop
                                  ? "bg-amber-900/30 text-amber-400 border border-amber-500/50"
                                  : "bg-slate-800 text-slate-400 border border-slate-600/50"
                              }`}
                            >
                              {isSource ? (
                                <MapPin className="h-5 w-5" />
                              ) : isDestination ? (
                                <CornerDownRight className="h-5 w-5" />
                              ) : isChargingStop ? (
                                <Zap className="h-5 w-5" />
                              ) : (
                                <span className="text-sm font-bold">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="text-lg font-medium text-slate-200">
                                {segment.station_name ||
                                  getLocationName(coords.lat, coords.lng)}
                              </div>
                              <div className="text-sm text-slate-400">
                                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                              </div>
                              {segment.selection_strategy && (
                                <div className="text-xs text-slate-500 mt-1">
                                  Strategy: {segment.selection_strategy}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end space-y-2">
                            <Badge
                              className={
                                isSource
                                  ? "bg-green-900/30 text-green-400 border-green-500/50"
                                  : isDestination
                                  ? "bg-blue-900/30 text-blue-400 border-blue-500/50"
                                  : isChargingStop
                                  ? "bg-amber-900/30 text-amber-400 border-amber-500/50"
                                  : "bg-slate-800/30 text-slate-400 border-slate-600/50"
                              }
                            >
                              {segment.category.replace(/_/g, " ")}
                            </Badge>

                            {segment.next_stop_distance_km > 0 && (
                              <Badge className="bg-slate-800/30 text-slate-400 border-slate-600/50 text-xs">
                                Next: {segment.next_stop_distance_km.toFixed(1)}{" "}
                                km
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-slate-300">
                              {segment.battery_on_arrival_percent.toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-500">
                              Arrival Battery
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-lg font-bold text-slate-300">
                              {segment.battery_on_departure_percent.toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-500">
                              Departure Battery
                            </div>
                          </div>

                          {segment.battery_utilization_percent !==
                            undefined && (
                            <div className="text-center">
                              <div className="text-lg font-bold text-amber-400">
                                {segment.battery_utilization_percent.toFixed(1)}
                                %
                              </div>
                              <div className="text-xs text-slate-500">
                                Battery Usage
                              </div>
                            </div>
                          )}

                          {segment.progress_towards_destination_km !==
                            undefined &&
                            segment.progress_towards_destination_km > 0 && (
                              <div className="text-center">
                                <div className="text-lg font-bold text-cyan-400">
                                  {segment.progress_towards_destination_km.toFixed(
                                    1
                                  )}{" "}
                                  km
                                </div>
                                <div className="text-xs text-slate-500">
                                  Progress Made
                                </div>
                              </div>
                            )}
                        </div>

                        {segment.efficiency_breakdown && (
                          <div className="mt-4 p-3 rounded-md bg-slate-800/50 border border-slate-700/50">
                            <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
                              <TrendingUp className="h-4 w-4 mr-2 text-green-400" />
                              Efficiency Breakdown
                            </h5>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                              <div className="text-center">
                                <div className="font-medium text-slate-300">
                                  {segment.efficiency_breakdown.base_efficiency_km_per_percent.toFixed(
                                    3
                                  )}
                                </div>
                                <div className="text-slate-500">
                                  Base (km/%)
                                </div>
                              </div>

                              <div className="text-center">
                                <div
                                  className={`font-medium ${
                                    segment.efficiency_breakdown
                                      .elevation_factor < 1
                                      ? "text-red-400"
                                      : "text-green-400"
                                  }`}
                                >
                                  {segment.efficiency_breakdown.elevation_factor.toFixed(
                                    3
                                  )}
                                </div>
                                <div className="text-slate-500">Elevation</div>
                              </div>

                              <div className="text-center">
                                <div
                                  className={`font-medium ${
                                    segment.efficiency_breakdown
                                      .weather_factor < 1
                                      ? "text-red-400"
                                      : "text-green-400"
                                  }`}
                                >
                                  {segment.efficiency_breakdown.weather_factor.toFixed(
                                    3
                                  )}
                                </div>
                                <div className="text-slate-500">Weather</div>
                              </div>

                              <div className="text-center">
                                <div
                                  className={`font-medium ${
                                    segment.efficiency_breakdown
                                      .traffic_factor < 1
                                      ? "text-red-400"
                                      : "text-green-400"
                                  }`}
                                >
                                  {segment.efficiency_breakdown.traffic_factor.toFixed(
                                    3
                                  )}
                                </div>
                                <div className="text-slate-500">Traffic</div>
                              </div>

                              <div className="text-center">
                                <div className="font-medium text-cyan-400">
                                  {segment.efficiency_breakdown.combined_efficiency_km_per_percent.toFixed(
                                    3
                                  )}
                                </div>
                                <div className="text-slate-500">Combined</div>
                              </div>

                              <div className="text-center">
                                <div
                                  className={`font-medium flex items-center justify-center ${
                                    segment.efficiency_breakdown
                                      .efficiency_change_percent < 0
                                      ? "text-red-400"
                                      : "text-green-400"
                                  }`}
                                >
                                  {segment.efficiency_breakdown
                                    .efficiency_change_percent < 0 ? (
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                  ) : (
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                  )}
                                  {segment.efficiency_breakdown.efficiency_change_percent.toFixed(
                                    1
                                  )}
                                  %
                                </div>
                                <div className="text-slate-500">Change</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>

          {/* Strategy Summary */}
          {routeData.originalApiData.strategy_summary && (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center">
                  <Target className="h-5 w-5 mr-2 text-purple-400" />
                  Optimization Strategy
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Strategic approach used for station selection and route
                  optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
                      <div className="text-sm font-medium text-purple-400 mb-2">
                        First Station Strategy
                      </div>
                      <div className="text-sm text-slate-300">
                        {
                          routeData.originalApiData.strategy_summary
                            .first_station_strategy
                        }
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
                      <div className="text-sm font-medium text-blue-400 mb-2">
                        Final Station Strategy
                      </div>
                      <div className="text-sm text-slate-300">
                        {
                          routeData.originalApiData.strategy_summary
                            .final_station_strategy
                        }
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-green-900/20 border border-green-500/30">
                      <div className="text-sm font-medium text-green-400 mb-2">
                        Middle Station Strategy
                      </div>
                      <div className="text-sm text-slate-300">
                        {
                          routeData.originalApiData.strategy_summary
                            .middle_station_strategy
                        }
                      </div>
                    </div>
                  </div>

                  {routeData.originalApiData.optimization_goals && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
                        <Target className="h-4 w-4 mr-2 text-cyan-400" />
                        Optimization Goals
                      </h4>
                      <div className="space-y-2">
                        {routeData.originalApiData.optimization_goals.map(
                          (goal, index) => (
                            <div
                              key={index}
                              className="flex items-start p-3 rounded-md bg-slate-800/30 border border-slate-700/30"
                            >
                              <div className="h-5 w-5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                                <span className="text-xs font-medium">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="text-sm text-slate-300">
                                {goal}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* API Performance Metrics */}
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-green-400" />
                API Performance & Caching
              </CardTitle>
              <CardDescription className="text-slate-400">
                System performance metrics and data source information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-green-900/20 border border-green-500/30 text-center">
                  <Clock className="h-6 w-6 text-green-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-green-400 mb-1">
                    {routeData.originalApiData.cache_hit_rate || "N/A"}
                  </div>
                  <div className="text-xs text-slate-400">Cache Hit Rate</div>
                </div>

                <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30 text-center">
                  <MapIcon className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-blue-400 mb-1">
                    {routeData.originalApiData.google_api_calls_used || 0}
                  </div>
                  <div className="text-xs text-slate-400">Google API Calls</div>
                </div>

                <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30 text-center">
                  <Zap className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-purple-400 mb-1">
                    {routeData.originalApiData.unique_stations_visited || 0}
                  </div>
                  <div className="text-xs text-slate-400">Unique Stations</div>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-600/50 text-center">
                  <BarChart3 className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-slate-400 mb-1">
                    V3
                  </div>
                  <div className="text-xs text-slate-400">
                    Algorithm Version
                  </div>
                </div>
              </div>

              {routeData.originalApiData.distance_source && (
                <div className="mt-4 p-3 rounded-md bg-slate-800/50 border border-slate-700/50">
                  <div className="text-sm font-medium text-slate-300 mb-1">
                    Data Source
                  </div>
                  <div className="text-sm text-slate-400">
                    {routeData.originalApiData.distance_source}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Original Route Waypoints Section */}
      {routeData && (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-200">
                  Route Waypoints
                </h3>
                {routeData.googleRoute && (
                  <Badge className="bg-green-900/30 text-green-400 border-green-500/50">
                    Google Maps Optimized
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {routeData.route.map((point, index) => (
                  <div
                    key={index}
                    className="flex items-center p-2 rounded-md bg-slate-800/30 border border-slate-700/30"
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                        point.category === "Source"
                          ? "bg-green-900/30 text-green-400 border border-green-500/50"
                          : point.category === "Destination"
                          ? "bg-blue-900/30 text-blue-400 border border-blue-500/50"
                          : point.category === "Visiting_Charging_Station"
                          ? "bg-amber-900/30 text-amber-400 border border-amber-500/50"
                          : "bg-slate-800 text-slate-400 border border-slate-600/50"
                      }`}
                    >
                      {point.category === "Source" ? (
                        <MapPin className="h-4 w-4" />
                      ) : point.category === "Destination" ? (
                        <CornerDownRight className="h-4 w-4" />
                      ) : point.category === "Visiting_Charging_Station" ? (
                        <Zap className="h-4 w-4" />
                      ) : (
                        <span className="text-xs">{index}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-300">
                        {point.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                      </div>
                    </div>
                    {point.category === "Visiting_Charging_Station" && (
                      <Badge className="bg-amber-900/30 text-amber-400 border-amber-500/50">
                        Charging Stop
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {routeData.chargingStops.length > 0 && (
              <>
                <Separator className="my-4 bg-slate-700/50" />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-200">
                    Charging Stops Details
                  </h3>
                  <div className="space-y-3">
                    {routeData.chargingStops.map((stop, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-md bg-amber-900/10 border border-amber-500/30"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Zap className="h-5 w-5 text-amber-400 mr-2" />
                            <div className="text-lg font-medium text-amber-400">
                              {stop.name}
                            </div>
                          </div>
                          <Badge className="bg-amber-900/30 text-amber-400 border-amber-500/50">
                            +{stop.batteryAdded}% Battery gain
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-slate-400 mb-1">
                              Arrive with:
                            </div>
                            <div className="text-slate-300 font-medium">
                              {stop.batteryOnArrival}%
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">
                              Depart with:
                            </div>
                            <div className="text-slate-300 font-medium">
                              {stop.batteryOnDeparture}%
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">
                              Charging time:
                            </div>
                            <div className="text-slate-300 font-medium">
                              {stop.chargingTime} mins
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">Location:</div>
                            <div className="text-slate-300 font-medium text-xs">
                              {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {routeData.googleRoute && (
              <>
                <Separator className="my-4 bg-slate-700/50" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-200 flex items-center">
                      <Navigation className="h-5 w-5 mr-2 text-cyan-400" />
                      Google Maps Route Details
                    </h3>
                    <Button
                      onClick={startJourney}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Start Navigation
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
                      <div className="flex items-center mb-2">
                        <Route className="h-4 w-4 text-cyan-400 mr-2" />
                        <span className="text-sm font-medium text-cyan-400">
                          Total Distance
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-cyan-300">
                        {routeData.googleRoute.distance}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
                      <div className="flex items-center mb-2">
                        <Clock className="h-4 w-4 text-blue-400 mr-2" />
                        <span className="text-sm font-medium text-blue-400">
                          Estimated Duration
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-blue-300">
                        {routeData.googleRoute.duration}
                      </div>
                    </div>
                  </div>

                  {routeData.googleRoute.optimizedOrder &&
                    routeData.googleRoute.optimizedOrder.length > 0 && (
                      <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
                        <div className="flex items-center mb-3">
                          <Target className="h-4 w-4 text-purple-400 mr-2" />
                          <span className="text-sm font-medium text-purple-400">
                            Optimized Waypoint Order
                          </span>
                        </div>
                        <div className="text-sm text-slate-300">
                          Google Maps has optimized the charging stop order for
                          the most efficient route.
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {routeData.googleRoute.optimizedOrder.map(
                            (index, i) => (
                              <Badge
                                key={i}
                                className="bg-purple-900/30 text-purple-400 border-purple-500/50"
                              >
                                Stop {i + 1}:{" "}
                                {routeData.chargingStops[index]?.name ||
                                  `Waypoint ${index + 1}`}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {routeData.googleRoute.stepByStepDirections &&
                    routeData.googleRoute.stepByStepDirections.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-slate-300 flex items-center">
                          <MapIcon className="h-4 w-4 mr-2 text-green-400" />
                          Turn-by-Turn Directions (Sample)
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {routeData.googleRoute.stepByStepDirections
                            .slice(0, 5)
                            .map((step, index) => (
                              <div
                                key={index}
                                className="p-3 rounded-md bg-slate-800/50 border border-slate-700/30"
                              >
                                <div className="flex items-start">
                                  <div className="h-6 w-6 rounded-full bg-green-900/30 text-green-400 border border-green-500/50 flex items-center justify-center mr-3 flex-shrink-0 text-xs font-medium">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm text-slate-300 mb-1">
                                      {step.instruction}
                                    </div>
                                    <div className="flex items-center text-xs text-slate-500 space-x-4">
                                      <span>{step.distance.toFixed(1)} km</span>
                                      <span>{step.duration}</span>
                                      {step.maneuver && (
                                        <Badge className="bg-slate-800/30 text-slate-400 border-slate-600/50 text-xs">
                                          {step.maneuver}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          {routeData.googleRoute.stepByStepDirections.length >
                            5 && (
                            <div className="text-center p-2">
                              <Badge className="bg-slate-800/30 text-slate-400 border-slate-600/50">
                                +
                                {routeData.googleRoute.stepByStepDirections
                                  .length - 5}{" "}
                                more steps
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </>
            )}

            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-lg font-medium text-slate-200">
                    Route Summary
                  </div>
                  <div className="text-sm text-slate-400">
                    Total distance: {routeData.distance.toFixed(1)} km • Battery
                    usage: {routeData.batteryUsage}% • Charging stops:{" "}
                    {routeData.chargingStops.length}
                  </div>
                </div>
                {!routeData.googleRoute && (
                  <Button
                    onClick={startJourney}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Open in Maps
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
