"use client";

import React, { useState, useMemo } from "react";
import {
  MapPin,
  Battery,
  Users,
  Clock,
  Zap,
  AlertTriangle,
  BarChart3,
  Map,
  Activity,
} from "lucide-react";
import CartoMap from "@/components/maps/carto-map"; // Import the CartoMap component
import { BSSFilters } from "@/components/charging/bss-filters"; // Import the BSS filters component

// Custom components to match the dashboard style
const Card = ({ children, className }) => (
  <div className={`rounded-lg ${className}`}>{children}</div>
);

const CardContent = ({ children, className }) => (
  <div className={className}>{children}</div>
);

const Select = ({ value, onValueChange, children }) => (
  <div className="relative">{children}</div>
);

const SelectTrigger = ({ children, className }) => (
  <div className={`px-3 py-2 rounded-md cursor-pointer ${className}`}>
    {children}
  </div>
);

const SelectValue = ({ placeholder }) => <span>{placeholder}</span>;

const SelectContent = ({ children, className }) => (
  <div
    className={`absolute top-full left-0 right-0 mt-1 rounded-md ${className}`}
  >
    {children}
  </div>
);

const SelectItem = ({ children, value, className }) => (
  <div className={`px-3 py-2 cursor-pointer ${className}`}>{children}</div>
);

// Mock data generator for BSS stations
const generateStationData = () => {
  const stations = [
    {
      id: "BSS_001",
      name: "Downtown Hub",
      lat: 40.7589,
      lng: -73.9851,
      zone: "Manhattan",
    },
    {
      id: "BSS_002",
      name: "Tech District",
      lat: 40.7614,
      lng: -73.9776,
      zone: "Manhattan",
    },
    {
      id: "BSS_003",
      name: "Brooklyn Center",
      lat: 40.6892,
      lng: -73.9442,
      zone: "Brooklyn",
    },
    {
      id: "BSS_004",
      name: "Queens Plaza",
      lat: 40.7505,
      lng: -73.937,
      zone: "Queens",
    },
    {
      id: "BSS_005",
      name: "Bronx Terminal",
      lat: 40.8176,
      lng: -73.9482,
      zone: "Bronx",
    },
    {
      id: "BSS_006",
      name: "Financial District",
      lat: 40.7074,
      lng: -74.0113,
      zone: "Manhattan",
    },
    {
      id: "BSS_007",
      name: "Williamsburg",
      lat: 40.7081,
      lng: -73.9571,
      zone: "Brooklyn",
    },
    {
      id: "BSS_008",
      name: "Astoria Hub",
      lat: 40.7794,
      lng: -73.9198,
      zone: "Queens",
    },
  ];

  return stations.map((station) => ({
    ...station,
    status:
      Math.random() > 0.8
        ? "maintenance"
        : Math.random() > 0.1
        ? "operational"
        : "offline",
    batteryLevel: Math.floor(Math.random() * 100),
    dailySwaps: Math.floor(Math.random() * 80) + 20,
    queueLength: Math.floor(Math.random() * 8),
    lastMaintenance: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
    ),
    utilization: Math.floor(Math.random() * 40) + 60,
  }));
};

const StationMap = () => {
  const stationData = useMemo(() => generateStationData(), []);
  const [selectedZone, setSelectedZone] = useState("All");
  const [selectedStation, setSelectedStation] = useState(null);

  const zones = ["All", ...new Set(stationData.map((s) => s.zone))];
  const filteredStations =
    selectedZone === "All"
      ? stationData
      : stationData.filter((s) => s.zone === selectedZone);

  const getStatusColor = (status) => {
    switch (status) {
      case "operational":
        return "#10b981"; // green-500
      case "maintenance":
        return "#f59e0b"; // amber-500
      case "offline":
        return "#ef4444"; // red-500
      default:
        return "#6b7280"; // gray-500
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "operational":
        return <Zap className="w-4 h-4" />;
      case "maintenance":
        return <AlertTriangle className="w-4 h-4" />;
      case "offline":
        return <Battery className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  // Convert station data to map markers
  const mapMarkers = useMemo(() => {
    return filteredStations.map((station) => ({
      position: [station.lat, station.lng],
      color: getStatusColor(station.status),
      icon:
        station.status === "operational"
          ? "charging"
          : station.status === "maintenance"
          ? "location"
          : "scooter",
    }));
  }, [filteredStations]);

  // Calculate map center based on filtered stations
  const mapCenter = useMemo(() => {
    if (filteredStations.length === 0) return [40.7589, -73.9851];

    const avgLat =
      filteredStations.reduce((sum, station) => sum + station.lat, 0) /
      filteredStations.length;
    const avgLng =
      filteredStations.reduce((sum, station) => sum + station.lng, 0) /
      filteredStations.length;

    return [avgLat, avgLng];
  }, [filteredStations]);

  // Handle map click to select station
  const handleMapClick = (lat, lng) => {
    const clickedStation = filteredStations.reduce((closest, station) => {
      const distance = Math.sqrt(
        Math.pow(station.lat - lat, 2) + Math.pow(station.lng - lng, 2)
      );
      const closestDistance = closest
        ? Math.sqrt(
            Math.pow(closest.lat - lat, 2) + Math.pow(closest.lng - lng, 2)
          )
        : Infinity;

      return distance < closestDistance ? station : closest;
    }, null);

    if (clickedStation) {
      const distance = Math.sqrt(
        Math.pow(clickedStation.lat - lat, 2) +
          Math.pow(clickedStation.lng - lng, 2)
      );
      if (distance < 0.005) {
        setSelectedStation(clickedStation);
      }
    }
  };

  const summaryStats = useMemo(() => {
    const operational = filteredStations.filter(
      (s) => s.status === "operational"
    ).length;
    const maintenance = filteredStations.filter(
      (s) => s.status === "maintenance"
    ).length;
    const offline = filteredStations.filter(
      (s) => s.status === "offline"
    ).length;
    const totalSwaps = filteredStations.reduce(
      (sum, s) => sum + s.dailySwaps,
      0
    );
    const avgUtilization =
      filteredStations.reduce((sum, s) => sum + s.utilization, 0) /
      filteredStations.length;

    return {
      operational,
      maintenance,
      offline,
      totalSwaps,
      avgUtilization: Math.round(avgUtilization),
    };
  }, [filteredStations]);

  return (
    <div className="min-h-screen text-white">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-cyan-900/20" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative z-10 p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Station
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Network Map
              </span>
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed">
              Real-time monitoring of battery swap stations
            </p>
          </div>
        </div>

        <BSSFilters />

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            {
              icon: Zap,
              label: "Operational",
              value: summaryStats.operational,
              color: "green",
              subtitle: "Active stations",
            },
            {
              icon: AlertTriangle,
              label: "Maintenance",
              value: summaryStats.maintenance,
              color: "yellow",
              subtitle: "Under service",
            },
            {
              icon: Battery,
              label: "Offline",
              value: summaryStats.offline,
              color: "red",
              subtitle: "Not available",
            },
            {
              icon: Activity,
              label: "Daily Swaps",
              value: summaryStats.totalSwaps,
              color: "cyan",
              subtitle: "Total today",
            },
            {
              icon: BarChart3,
              label: "Avg Utilization",
              value: `${summaryStats.avgUtilization}%`,
              color: "purple",
              subtitle: "Network average",
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="group hover:-translate-y-1 transition-all duration-300"
            >
              <Card className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-white/10 backdrop-blur-sm hover:border-cyan-500/30 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 bg-gradient-to-r from-${stat.color}-500/20 to-${stat.color}-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                    >
                      <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                    </div>
                    <span className="text-sm text-gray-400">{stat.label}</span>
                  </div>
                  <div className="space-y-1">
                    <div
                      className={`text-2xl font-bold text-${stat.color}-400`}
                    >
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-500">{stat.subtitle}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Main Map and Station Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Container */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-white/10 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="p-6 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                      <Map className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-1">
                        Station Locations - {selectedZone}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        Click on stations to view details • Green: Operational •
                        Amber: Maintenance • Red: Offline
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <CartoMap
                    center={mapCenter}
                    zoom={selectedZone === "All" ? 11 : 12}
                    markers={mapMarkers}
                    height="400px"
                    onMapClick={handleMapClick}
                    interactive={true}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Station Details Panel */}
          <Card className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-white/10 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="p-6 pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                    <Activity className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-1">
                      Station Details
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {selectedStation
                        ? `${selectedStation.name} (${selectedStation.id})`
                        : "Select a station on the map"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6">
                {selectedStation ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg bg-opacity-20`}
                        style={{
                          backgroundColor:
                            getStatusColor(selectedStation.status) + "33",
                        }}
                      >
                        {getStatusIcon(selectedStation.status)}
                      </div>
                      <div>
                        <div className="text-gray-200 font-medium capitalize">
                          {selectedStation.status}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {selectedStation.zone}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm flex items-center gap-2">
                          <Battery className="w-4 h-4" />
                          Battery Level
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-cyan-400"
                              style={{
                                width: `${selectedStation.batteryLevel}%`,
                              }}
                            />
                          </div>
                          <span className="text-gray-400 text-xs">
                            {selectedStation.batteryLevel}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Daily Swaps
                        </span>
                        <span className="text-cyan-400 font-mono">
                          {selectedStation.dailySwaps}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Queue Length
                        </span>
                        <span className="text-gray-400 font-mono">
                          {selectedStation.queueLength}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">
                          Utilization
                        </span>
                        <span className="text-green-400 font-mono">
                          {selectedStation.utilization}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Last Maintenance
                        </span>
                        <span className="text-gray-400 text-xs">
                          {selectedStation.lastMaintenance.toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-700">
                      <div className="text-gray-300 text-sm mb-2">
                        Quick Actions
                      </div>
                      <div className="space-y-2">
                        <button className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white text-sm py-2 px-3 rounded-md transition-all duration-200">
                          View Analytics
                        </button>
                        <button className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-200 text-sm py-2 px-3 rounded-md transition-all duration-200">
                          Schedule Maintenance
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">
                      Click on any station marker to view detailed information
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Station List */}
        <Card className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-white/10 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="p-6 pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-1">
                    Station Status Overview
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Complete list of stations in{" "}
                    {selectedZone === "All" ? "all zones" : selectedZone}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStations.map((station) => (
                  <div
                    key={station.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:border-cyan-500 ${
                      selectedStation?.id === station.id
                        ? "bg-gray-800/50 border-cyan-500"
                        : "bg-gray-800/30 border-gray-600/50"
                    }`}
                    onClick={() => setSelectedStation(station)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-200 font-medium">
                        {station.name}
                      </div>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: getStatusColor(station.status),
                        }}
                      />
                    </div>
                    <div className="text-gray-400 text-sm mb-2">
                      {station.id} • {station.zone}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        Swaps: {station.dailySwaps}
                      </span>
                      <span className="text-gray-400">
                        Queue: {station.queueLength}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StationMap;
