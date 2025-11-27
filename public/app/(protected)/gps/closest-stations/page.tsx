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
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Route, Search, Compass } from "lucide-react";
import CartoMap from "@/components/maps/carto-map";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

import DashboardLayout from "@/components/dashboard-layout";

interface ClosestStationData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  available: number;
  capacity: number;
}

export default function ClosestStationsPage() {
  const [activeTab, setActiveTab] = useState("closest");
  const [currentLat, setCurrentLat] = useState("6.696449");
  const [currentLng, setCurrentLng] = useState("79.985743");
  const [destinationLat, setDestinationLat] = useState("6.701234");
  const [destinationLng, setDestinationLng] = useState("79.990123");
  const [stageName, setStageName] = useState("production");
  const [isLoading, setIsLoading] = useState(false);
  const [stationData, setStationData] = useState<ClosestStationData[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleClosestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would be an actual API call
      // const response = await fetch('/api/closest-station', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ stageName }),
      // });
      // const data = await response.json();

      // For demo purposes, we'll simulate a response
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Sample response data
      const data = {
        status: "success",
        data: [
          {
            id: "ST001",
            name: "Central Hub",
            lat: 6.698123,
            lng: 79.986789,
            distance: 0.8,
            available: 8,
            capacity: 15,
          },
          {
            id: "ST003",
            name: "Main Street",
            lat: 6.699234,
            lng: 79.987123,
            distance: 1.2,
            available: 5,
            capacity: 8,
          },
          {
            id: "ST002",
            name: "City Center",
            lat: 6.697456,
            lng: 79.985678,
            distance: 1.5,
            available: 3,
            capacity: 10,
          },
        ],
      };

      if (data.status === "success") {
        setStationData(data.data);
      } else {
        setError(data.detail || "Failed to find closest stations");
      }
    } catch (err) {
      setError("An error occurred while finding closest stations");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would be an actual API call
      // const response = await fetch('/api/closest-station-with-direction', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     currentLat: parseFloat(currentLat),
      //     currentLng: parseFloat(currentLng),
      //     destinationLat: parseFloat(destinationLat),
      //     destinationLng: parseFloat(destinationLng),
      //     stageName
      //   }),
      // });
      // const data = await response.json();

      // For demo purposes, we'll simulate a response
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Sample response data - similar structure but with stations along the route
      const data = {
        status: "success",
        data: [
          {
            id: "ST001",
            name: "Central Hub",
            lat: 6.698123,
            lng: 79.986789,
            distance: 0.8,
            available: 8,
            capacity: 15,
          },
          {
            id: "ST004",
            name: "North Plaza",
            lat: 6.699345,
            lng: 79.988456,
            distance: 1.0,
            available: 6,
            capacity: 12,
          },
          {
            id: "ST005",
            name: "Tech Park",
            lat: 6.700123,
            lng: 79.989567,
            distance: 1.3,
            available: 12,
            capacity: 20,
          },
        ],
      };

      if (data.status === "success") {
        setStationData(data.data);
      } else {
        setError(data.detail || "Failed to find stations with direction");
      }
    } catch (err) {
      setError("An error occurred while finding stations with direction");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLat(position.coords.latitude.toString());
          setCurrentLng(position.coords.longitude.toString());
        },
        (error) => {
          console.error("Error getting location:", error);
          setError(
            "Could not get your current location. Please enter manually."
          );
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
    }
  };

  // Prepare map data from station data
  const mapMarkers = [];

  // Add current location marker
  if (currentLat && currentLng) {
    mapMarkers.push({
      position: [
        Number.parseFloat(currentLat),
        Number.parseFloat(currentLng),
      ] as [number, number],
      popup: "<strong>Current Location</strong>",
      color: "#3b82f6", // blue
      icon: "location",
    });
  }

  // Add destination marker if in direction mode
  if (activeTab === "direction" && destinationLat && destinationLng) {
    mapMarkers.push({
      position: [
        Number.parseFloat(destinationLat),
        Number.parseFloat(destinationLng),
      ] as [number, number],
      popup: "<strong>Destination</strong>",
      color: "#ef4444", // red
      icon: "location",
    });
  }

  // Add station markers
  if (stationData) {
    stationData.forEach((station) => {
      mapMarkers.push({
        position: [station.lat, station.lng] as [number, number],
        popup: `<strong>${station.name}</strong><br>Distance: ${station.distance} km<br>Available: ${station.available}/${station.capacity}`,
        color: getAvailabilityColor(station.available, station.capacity),
        icon: "charging",
      });
    });
  }

  // Create route if in direction mode
  const mapRoutes = [];
  if (
    activeTab === "direction" &&
    currentLat &&
    currentLng &&
    destinationLat &&
    destinationLng
  ) {
    const routePoints = [
      [Number.parseFloat(currentLat), Number.parseFloat(currentLng)] as [
        number,
        number
      ],
    ];

    // Add stations as waypoints if available
    if (stationData) {
      stationData.forEach((station) => {
        routePoints.push([station.lat, station.lng] as [number, number]);
      });
    }

    routePoints.push([
      Number.parseFloat(destinationLat),
      Number.parseFloat(destinationLng),
    ] as [number, number]);

    mapRoutes.push({
      path: routePoints,
      color: "#3b82f6", // blue
      dashArray: "5, 10",
    });
  }

  const mapCenter =
    currentLat && currentLng
      ? [Number.parseFloat(currentLat), Number.parseFloat(currentLng)]
      : [6.696449, 79.985743];

  function getAvailabilityColor(available: number, capacity: number): string {
    const percentage = (available / capacity) * 100;
    if (percentage > 50) return "#10b981"; // green
    if (percentage > 20) return "#f59e0b"; // amber
    return "#ef4444"; // red
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Closest Charging Stations
          </h1>
          <p className="text-slate-400">
            Find nearby charging stations based on your location or route
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Station Search Form */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-slate-100">Find Stations</CardTitle>
            <CardDescription className="text-slate-400">
              Search for charging stations near you or along your route
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 mb-4 bg-slate-800/50 p-1">
                <TabsTrigger
                  value="closest"
                  className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                >
                  Closest Stations
                </TabsTrigger>
                <TabsTrigger
                  value="direction"
                  className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                >
                  With Direction
                </TabsTrigger>
              </TabsList>

              <TabsContent value="closest" className="space-y-6">
                <form onSubmit={handleClosestSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300 flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-cyan-500" />
                        Your Location
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="currentLat"
                            className="text-xs text-slate-400"
                          >
                            Latitude
                          </Label>
                          <Input
                            id="currentLat"
                            placeholder="Latitude"
                            value={currentLat}
                            onChange={(e) => setCurrentLat(e.target.value)}
                            className="bg-slate-800/50 border-slate-700 text-slate-300"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="currentLng"
                            className="text-xs text-slate-400"
                          >
                            Longitude
                          </Label>
                          <Input
                            id="currentLng"
                            placeholder="Longitude"
                            value={currentLng}
                            onChange={(e) => setCurrentLng(e.target.value)}
                            className="bg-slate-800/50 border-slate-700 text-slate-300"
                            required
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full mt-1 border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
                        onClick={getCurrentLocation}
                      >
                        <Navigation className="mr-2 h-4 w-4" />
                        Use Current Location
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="stageName"
                        className="text-slate-300 flex items-center"
                      >
                        <Compass className="h-4 w-4 mr-2 text-cyan-500" />
                        Environment
                      </Label>
                      <Select value={stageName} onValueChange={setStageName}>
                        <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="development">
                            Development
                          </SelectItem>
                          <SelectItem value="staging">Staging</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                        </SelectContent>
                      </Select>
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
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Find Closest Stations
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="direction" className="space-y-6">
                <form onSubmit={handleDirectionSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300 flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-cyan-500" />
                        Your Location
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="currentLat"
                            className="text-xs text-slate-400"
                          >
                            Latitude
                          </Label>
                          <Input
                            id="currentLat"
                            placeholder="Latitude"
                            value={currentLat}
                            onChange={(e) => setCurrentLat(e.target.value)}
                            className="bg-slate-800/50 border-slate-700 text-slate-300"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="currentLng"
                            className="text-xs text-slate-400"
                          >
                            Longitude
                          </Label>
                          <Input
                            id="currentLng"
                            placeholder="Longitude"
                            value={currentLng}
                            onChange={(e) => setCurrentLng(e.target.value)}
                            className="bg-slate-800/50 border-slate-700 text-slate-300"
                            required
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full mt-1 border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
                        onClick={getCurrentLocation}
                      >
                        <Navigation className="mr-2 h-4 w-4" />
                        Use Current Location
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300 flex items-center">
                        <Route className="h-4 w-4 mr-2 text-cyan-500" />
                        Destination
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="destinationLat"
                            className="text-xs text-slate-400"
                          >
                            Latitude
                          </Label>
                          <Input
                            id="destinationLat"
                            placeholder="Latitude"
                            value={destinationLat}
                            onChange={(e) => setDestinationLat(e.target.value)}
                            className="bg-slate-800/50 border-slate-700 text-slate-300"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="destinationLng"
                            className="text-xs text-slate-400"
                          >
                            Longitude
                          </Label>
                          <Input
                            id="destinationLng"
                            placeholder="Longitude"
                            value={destinationLng}
                            onChange={(e) => setDestinationLng(e.target.value)}
                            className="bg-slate-800/50 border-slate-700 text-slate-300"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="stageName"
                        className="text-slate-300 flex items-center"
                      >
                        <Compass className="h-4 w-4 mr-2 text-cyan-500" />
                        Environment
                      </Label>
                      <Select value={stageName} onValueChange={setStageName}>
                        <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="development">
                            Development
                          </SelectItem>
                          <SelectItem value="staging">Staging</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                        </SelectContent>
                      </Select>
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
                        Searching...
                      </>
                    ) : (
                      <>
                        <Route className="mr-2 h-4 w-4" />
                        Find Stations on Route
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          </CardContent>
        </Card>

        {/* Map and Station Details */}
        <div className="lg:col-span-2 space-y-6">
          <CartoMap
            center={mapCenter as [number, number]}
            zoom={14}
            markers={mapMarkers}
            routes={mapRoutes}
            height="400px"
          />

          {stationData && (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Nearest Charging Stations
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {activeTab === "closest"
                    ? "Stations closest to your location"
                    : "Stations along your route"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stationData.map((station, index) => (
                    <div
                      key={station.id}
                      className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center mr-3"
                            style={{
                              backgroundColor: `${getAvailabilityColor(
                                station.available,
                                station.capacity
                              )}30`,
                              color: getAvailabilityColor(
                                station.available,
                                station.capacity
                              ),
                              borderColor: `${getAvailabilityColor(
                                station.available,
                                station.capacity
                              )}50`,
                              border: "1px solid",
                            }}
                          >
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-md font-medium text-slate-200">
                              {station.name}
                            </h3>
                            <p className="text-xs text-slate-400">
                              ID: {station.id}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-slate-800/50 text-slate-300 border-slate-600/50">
                          {station.distance} km away
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">
                            Location
                          </p>
                          <p className="text-sm text-slate-300">
                            {station.lat.toFixed(6)}, {station.lng.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">
                            Availability
                          </p>
                          <p className="text-sm text-slate-300">
                            {station.available} of {station.capacity} slots
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Availability</span>
                          <span
                            style={{
                              color: getAvailabilityColor(
                                station.available,
                                station.capacity
                              ),
                            }}
                          >
                            {Math.round(
                              (station.available / station.capacity) * 100
                            )}
                            %
                          </span>
                        </div>
                        <Progress
                          value={(station.available / station.capacity) * 100}
                          className="h-1.5 bg-slate-700"
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${
                                (station.available / station.capacity) * 100
                              }%`,
                              backgroundColor: getAvailabilityColor(
                                station.available,
                                station.capacity
                              ),
                            }}
                          />
                        </Progress>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
                          onClick={() => {
                            // In a real app, this would navigate to directions
                            window.open(
                              `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`,
                              "_blank"
                            );
                          }}
                        >
                          <Navigation className="mr-2 h-4 w-4" />
                          Get Directions
                        </Button>
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
  );
}
