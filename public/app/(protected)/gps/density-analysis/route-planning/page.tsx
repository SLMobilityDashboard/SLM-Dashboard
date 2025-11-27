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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { MapPin, CornerDownRight, Battery, Route, Zap } from "lucide-react";
import CartoMap from "@/components/maps/carto-map";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import DashboardLayout from "@/components/dashboard-layout";

interface RouteSummary {
  location: string; // e.g. "(6.9271, 79.8612)"
  category: "Source" | "Destination" | "Visiting_Charging_Station";
  battery_on_arrival_percent: number;
  battery_on_departure_percent: number;
  next_stop_distance_km: number;
  station_name?: string;
}

interface RouteData {
  success: boolean;
  distance_km: number;
  message: string;
  planned_charging_stops_count: number;
  route_summary: RouteSummary[];
  export_message?: string;
  llm_description?: string;
  llm_charging_strategy?: string;
}

// Frontend route data structure for map display
interface ProcessedRouteData {
  route: Array<{ lat: number; lng: number; name: string }>;
  batteryUsage: number;
  distance: number;
  estimatedTime: number;
  chargingStops: Array<{
    name: string;
    lat: number;
    lng: number;
    chargingTime: number;
    batteryAdded: number;
  }>;
}

export default function RoutePlanningPage() {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [battery, setBattery] = useState(80);
  const [efficiency, setEfficiency] = useState(70);
  const [isLoading, setIsLoading] = useState(false);
  const [routeData, setRouteData] = useState<ProcessedRouteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper function to parse location string "(lat, lng)" to coordinates
  const parseLocation = (locationStr: string): { lat: number; lng: number } => {
    const match = locationStr.match(/\(([^,]+),\s*([^)]+)\)/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
      };
    }
    throw new Error(`Invalid location format: ${locationStr}`);
  };

  // Helper function to get location name
  const getLocationName = (summary: RouteSummary): string => {
    if (summary.category === "Source") return "Starting Point";
    if (summary.category === "Destination") return "Destination";
    return summary.station_name || "Charging Station";
  };

  // Transform API response to frontend format
  const transformRouteData = (apiData: RouteData): ProcessedRouteData => {
    const route = apiData.route_summary.map((summary) => {
      const coords = parseLocation(summary.location);
      return {
        lat: coords.lat,
        lng: coords.lng,
        name: getLocationName(summary),
      };
    });

    const chargingStops = apiData.route_summary
      .filter((summary) => summary.category === "Visiting_Charging_Station")
      .map((summary) => {
        const coords = parseLocation(summary.location);
        const batteryAdded =
          summary.battery_on_departure_percent -
          summary.battery_on_arrival_percent;
        return {
          name: summary.station_name || "Charging Station",
          lat: coords.lat,
          lng: coords.lng,
          chargingTime: 30, // Estimate - you might want to add this to your API response
          batteryAdded: Math.round(batteryAdded),
        };
      });

    const startBattery =
      apiData.route_summary[0]?.battery_on_arrival_percent || battery;
    const endBattery =
      apiData.route_summary[apiData.route_summary.length - 1]
        ?.battery_on_arrival_percent || 0;
    const batteryUsage = Math.round(startBattery - endBattery);

    return {
      route,
      batteryUsage: Math.max(0, batteryUsage), // Ensure positive value
      distance: apiData.distance_km,
      estimatedTime: Math.round(apiData.distance_km * 1.2), // Rough estimate: 1.2 min per km
      chargingStops,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Planning route from", source, "to", destination);
    setIsLoading(true);
    setError(null);

    try {
      console.log("Sending request to API...");

      setRouteData({
        route: [
          { lat: 6.9271, lng: 79.8612, name: "Starting Point" },
          { lat: 6.9147, lng: 79.9735, name: "Charging Station 1" },
          { lat: 6.9275, lng: 79.857, name: "Destination" },
        ],
        batteryUsage: 45,
        distance: 25,
        estimatedTime: 30,
        chargingStops: [
          {
            name: "Charging Station 1",
            lat: 6.9147,
            lng: 79.9735,
            chargingTime: 30,
            batteryAdded: 40,
          },
        ],
      });

      // const response = await fetch("http://localhost:8000/ev-route-plan", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     // Add CORS headers if needed
      //     "Access-Control-Allow-Origin": "*",
      //   },
      //   body: JSON.stringify({
      //     source,
      //     destination,
      //     battery,
      //     efficiency,
      //   }),
      // });

      // console.log("Response status:", response.status);

      // if (!response.ok) {
      //   throw new Error(`API request failed with status ${response.status}`);
      // }

      // const data: RouteData = await response.json();
      // console.log("API Response:", data);

      // if (data.success) {
      //   const processedData = transformRouteData(data);
      //   setRouteData(processedData);
      //   console.log("Processed route data:", processedData);
      // } else {
      //   setError(data.message || "Failed to plan route");
      // }
    } catch (err) {
      console.error("Error planning route:", err);
      if (err instanceof Error) {
        if (err.message.includes("Failed to fetch")) {
          setError(
            "Cannot connect to the route planning service. Please ensure the backend is running and CORS is configured."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("An unexpected error occurred while planning the route");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare map data from route data
  const mapMarkers = routeData
    ? [
        // Start marker
        {
          position: [routeData.route[0].lat, routeData.route[0].lng] as [
            number,
            number
          ],
          popup: `<strong>Start:</strong> ${routeData.route[0].name}`,
          color: "#10b981", // green
        },
        // End marker
        {
          position: [
            routeData.route[routeData.route.length - 1].lat,
            routeData.route[routeData.route.length - 1].lng,
          ] as [number, number],
          popup: `<strong>Destination:</strong> ${
            routeData.route[routeData.route.length - 1].name
          }`,
          color: "#ef4444", // red
        },
        // Charging stops
        ...routeData.chargingStops.map((stop) => ({
          position: [stop.lat, stop.lng] as [number, number],
          popup: `<strong>${stop.name}</strong><br>Charging time: ${stop.chargingTime} min<br>Battery added: ${stop.batteryAdded}%`,
          icon: "charging",
          color: "#f59e0b", // amber
        })),
      ]
    : [];

  const mapRoutes = routeData
    ? [
        {
          path: routeData.route.map(
            (point) => [point.lat, point.lng] as [number, number]
          ),
          color: "#06b6d4", // cyan
          weight: 4,
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
    : [6.696449, 79.985743];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            EV Route Planning
          </h1>
          <p className="text-slate-400">
            Plan optimal routes for electric vehicles with charging stops
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Planning Form */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-slate-100">Plan Your Route</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your journey details to calculate the optimal route
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
                    id="source"
                    placeholder="Enter starting location"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-slate-300"
                    required
                  />
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
                    id="destination"
                    placeholder="Enter destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-slate-300"
                    required
                  />
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
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    Planning Route...
                  </>
                ) : (
                  <>
                    <Route className="mr-2 h-4 w-4" />
                    Plan Route
                  </>
                )}
              </Button>

              {error && (
                <div className="p-3 rounded-md bg-red-900/20 border border-red-500/30">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
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

          {routeData && (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">Route Details</CardTitle>
                <CardDescription className="text-slate-400">
                  Summary of your planned journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-sm mb-1">Distance</div>
                    <div className="text-xl font-bold text-cyan-400">
                      {routeData.distance} km
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-sm mb-1">
                      Estimated Time
                    </div>
                    <div className="text-xl font-bold text-cyan-400">
                      {routeData.estimatedTime} min
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-sm mb-1">
                      Battery Usage
                    </div>
                    <div className="text-xl font-bold text-cyan-400">
                      {routeData.batteryUsage}%
                    </div>
                  </div>
                </div>

                <Separator className="my-4 bg-slate-700/50" />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-200">
                    Route Waypoints
                  </h3>
                  <div className="space-y-2">
                    {routeData.route.map((point, index) => (
                      <div
                        key={index}
                        className="flex items-center p-2 rounded-md bg-slate-800/30 border border-slate-700/30"
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                            index === 0
                              ? "bg-green-900/30 text-green-400 border border-green-500/50"
                              : index === routeData.route.length - 1
                              ? "bg-red-900/30 text-red-400 border border-red-500/50"
                              : routeData.chargingStops.some(
                                  (stop) =>
                                    stop.lat === point.lat &&
                                    stop.lng === point.lng
                                )
                              ? "bg-amber-900/30 text-amber-400 border border-amber-500/50"
                              : "bg-slate-800 text-slate-400 border border-slate-600/50"
                          }`}
                        >
                          {index === 0 ? (
                            <MapPin className="h-4 w-4" />
                          ) : index === routeData.route.length - 1 ? (
                            <CornerDownRight className="h-4 w-4" />
                          ) : routeData.chargingStops.some(
                              (stop) =>
                                stop.lat === point.lat && stop.lng === point.lng
                            ) ? (
                            <Battery className="h-4 w-4" />
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
                        {routeData.chargingStops.some(
                          (stop) =>
                            stop.lat === point.lat && stop.lng === point.lng
                        ) && (
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
                        Charging Stops
                      </h3>
                      <div className="space-y-2">
                        {routeData.chargingStops.map((stop, index) => (
                          <div
                            key={index}
                            className="p-3 rounded-md bg-amber-900/10 border border-amber-500/30"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-md font-medium text-amber-400">
                                {stop.name}
                              </div>
                              <Badge className="bg-amber-900/30 text-amber-400 border-amber-500/50">
                                {stop.chargingTime} min
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="text-slate-400">
                                Battery Added:
                              </div>
                              <div className="text-amber-400">
                                {stop.batteryAdded}%
                              </div>
                              <div className="text-slate-400">Location:</div>
                              <div className="text-slate-300">
                                {stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
