"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Battery,
  Zap,
  Navigation,
  Users,
  AlertCircle,
  Filter,
  Eye,
  EyeOff,
  Play,
  Pause,
} from "lucide-react";

export default function RealtimeMapModule() {
  const [mapView, setMapView] = useState("overview");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showGeofences, setShowGeofences] = useState(false);
  const [liveTracking, setLiveTracking] = useState(true);
  const [selectedScooter, setSelectedScooter] = useState(null);

  const [scooterData, setScooterData] = useState([]);
  const [stationData, setStationData] = useState([]);
  const [geofenceData, setGeofenceData] = useState([]);

  // Generate mock location data
  useEffect(() => {
    const generateScooterData = () => {
      const scooters = [];
      const regions = [
        {
          name: "Downtown",
          centerLat: 40.7589,
          centerLng: -73.9851,
          radius: 0.02,
        },
        {
          name: "University District",
          centerLat: 40.7505,
          centerLng: -73.9934,
          radius: 0.015,
        },
        {
          name: "Business Park",
          centerLat: 40.7614,
          centerLng: -73.9776,
          radius: 0.018,
        },
      ];

      for (let i = 0; i < 2847; i++) {
        const region = regions[Math.floor(Math.random() * regions.length)];
        const lat = region.centerLat + (Math.random() - 0.5) * region.radius;
        const lng = region.centerLng + (Math.random() - 0.5) * region.radius;

        scooters.push({
          id: `SCT-${i + 1}`,
          lat,
          lng,
          battery: Math.floor(Math.random() * 100),
          status:
            Math.random() > 0.85
              ? "in-use"
              : Math.random() > 0.7
              ? "charging"
              : "available",
          speed: Math.random() > 0.85 ? Math.floor(Math.random() * 25) : 0,
          region: region.name,
          lastUpdate: new Date(
            Date.now() - Math.random() * 300000
          ).toISOString(),
        });
      }
      return scooters;
    };

    const generateStationData = () => {
      const stations = [];
      const stationLocations = [
        { lat: 40.7589, lng: -73.9851, name: "Downtown Hub" },
        { lat: 40.7505, lng: -73.9934, name: "University Station" },
        { lat: 40.7614, lng: -73.9776, name: "Business Center" },
        { lat: 40.7549, lng: -73.984, name: "Metro Plaza" },
        { lat: 40.758, lng: -73.9855, name: "City Square" },
      ];

      stationLocations.forEach((location, index) => {
        for (let i = 0; i < 31; i++) {
          const offsetLat = location.lat + (Math.random() - 0.5) * 0.01;
          const offsetLng = location.lng + (Math.random() - 0.5) * 0.01;

          stations.push({
            id: `ST-${index * 31 + i + 1}`,
            name: `${location.name} ${i + 1}`,
            lat: offsetLat,
            lng: offsetLng,
            status: Math.random() > 0.05 ? "online" : "offline",
            utilization: Math.floor(Math.random() * 100),
            batterySlots: 12,
            availableSlots: Math.floor(Math.random() * 12),
            swapsToday: Math.floor(Math.random() * 50),
            region: location.name.split(" ")[0],
          });
        }
      });
      return stations;
    };

    const generateGeofenceData = () => {
      return [
        {
          id: "GF-1",
          name: "Downtown Core",
          type: "high-demand",
          centerLat: 40.7589,
          centerLng: -73.9851,
          radius: 0.008,
          scooterCount: 1247,
          alerts: 2,
        },
        {
          id: "GF-2",
          name: "University Campus",
          type: "restricted",
          centerLat: 40.7505,
          centerLng: -73.9934,
          radius: 0.006,
          scooterCount: 892,
          alerts: 0,
        },
        {
          id: "GF-3",
          name: "Business District",
          type: "premium",
          centerLat: 40.7614,
          centerLng: -73.9776,
          radius: 0.007,
          scooterCount: 708,
          alerts: 1,
        },
      ];
    };

    setScooterData(generateScooterData());
    setStationData(generateStationData());
    setGeofenceData(generateGeofenceData());
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    if (!liveTracking) return;

    const interval = setInterval(() => {
      setScooterData((prev) =>
        prev.map((scooter) => ({
          ...scooter,
          lat: scooter.lat + (Math.random() - 0.5) * 0.0001,
          lng: scooter.lng + (Math.random() - 0.5) * 0.0001,
          battery: Math.max(
            0,
            Math.min(100, scooter.battery + (Math.random() - 0.5) * 2)
          ),
          speed:
            scooter.status === "in-use"
              ? Math.max(
                  0,
                  Math.min(25, scooter.speed + (Math.random() - 0.5) * 3)
                )
              : 0,
          lastUpdate: new Date().toISOString(),
        }))
      );

      setStationData((prev) =>
        prev.map((station) => ({
          ...station,
          utilization: Math.max(
            0,
            Math.min(100, station.utilization + (Math.random() - 0.5) * 5)
          ),
          availableSlots: Math.max(
            0,
            Math.min(
              station.batterySlots,
              station.availableSlots + (Math.random() > 0.5 ? 1 : -1)
            )
          ),
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [liveTracking]);

  const filteredScooters =
    selectedRegion === "all"
      ? scooterData
      : scooterData.filter((scooter) => scooter.region === selectedRegion);

  const filteredStations =
    selectedRegion === "all"
      ? stationData
      : stationData.filter((station) => station.region === selectedRegion);

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "in-use":
        return "bg-blue-500";
      case "charging":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getBatteryColor = (battery) => {
    if (battery > 60) return "text-green-500";
    if (battery > 30) return "text-yellow-500";
    return "text-red-500";
  };

  const getGeofenceColor = (type) => {
    switch (type) {
      case "high-demand":
        return "border-blue-500 bg-blue-500/10";
      case "restricted":
        return "border-red-500 bg-red-500/10";
      case "premium":
        return "border-purple-500 bg-purple-500/10";
      default:
        return "border-gray-500 bg-gray-500/10";
    }
  };

  const regions = ["all", "Downtown", "University District", "Business Park"];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Controls */}
      <div className="w-80 bg-white shadow-lg p-6 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Fleet Control
          </h2>

          {/* Live Tracking Toggle */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Live Tracking</span>
            <button
              onClick={() => setLiveTracking(!liveTracking)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                liveTracking
                  ? "bg-green-500 text-white"
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              {liveTracking ? <Play size={16} /> : <Pause size={16} />}
              {liveTracking ? "ON" : "OFF"}
            </button>
          </div>

          {/* Region Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter size={16} className="inline mr-2" />
              Region Filter
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region === "all" ? "All Regions" : region}
                </option>
              ))}
            </select>
          </div>

          {/* View Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Heatmap Overlay</span>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`p-2 rounded-md transition-colors ${
                  showHeatmap
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {showHeatmap ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Geofences</span>
              <button
                onClick={() => setShowGeofences(!showGeofences)}
                className={`p-2 rounded-md transition-colors ${
                  showGeofences
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {showGeofences ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Fleet Stats */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Fleet Overview
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">Available Scooters</span>
              <span className="text-lg font-bold text-green-600">
                {
                  filteredScooters.filter((s) => s.status === "available")
                    .length
                }
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">In Use</span>
              <span className="text-lg font-bold text-blue-600">
                {filteredScooters.filter((s) => s.status === "in-use").length}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm font-medium">Charging</span>
              <span className="text-lg font-bold text-yellow-600">
                {filteredScooters.filter((s) => s.status === "charging").length}
              </span>
            </div>
          </div>
        </div>

        {/* Station Stats */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Charging Stations
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm">Online Stations</span>
              <span className="font-bold text-green-600">
                {filteredStations.filter((s) => s.status === "online").length}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm">Available Slots</span>
              <span className="font-bold text-blue-600">
                {filteredStations.reduce((sum, s) => sum + s.availableSlots, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Geofence Alerts */}
        {showGeofences && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Geofence Alerts
            </h3>
            <div className="space-y-2">
              {geofenceData.map((geofence) => (
                <div key={geofence.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm">{geofence.name}</span>
                    {geofence.alerts > 0 && (
                      <span className="flex items-center text-red-500 text-xs">
                        <AlertCircle size={12} className="mr-1" />
                        {geofence.alerts}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    {geofence.scooterCount} scooters • {geofence.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin size={64} className="mx-auto text-blue-500 mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Interactive Map View
            </h3>
            <p className="text-gray-600 mb-4">
              Showing {filteredScooters.length} scooters and{" "}
              {filteredStations.length} stations
              {selectedRegion !== "all" && ` in ${selectedRegion}`}
            </p>

            {/* Map would render here - showing overlay info */}
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">Real-time Updates</span>
                <div
                  className={`w-3 h-3 rounded-full ${
                    liveTracking ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  }`}
                />
              </div>

              <div className="space-y-2 text-sm text-left">
                <div className="flex justify-between">
                  <span>Heatmap:</span>
                  <span>{showHeatmap ? "Enabled" : "Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Geofences:</span>
                  <span>{showGeofences ? "Visible" : "Hidden"}</span>
                </div>
                <div className="flex justify-between">
                  <span>View Mode:</span>
                  <span className="capitalize">{mapView}</span>
                </div>
              </div>
            </div>

            {selectedScooter && (
              <div className="mt-4 bg-white rounded-lg shadow-lg p-4 max-w-sm mx-auto">
                <h4 className="font-bold mb-2">
                  Selected Scooter: {selectedScooter.id}
                </h4>
                <div className="text-sm text-left space-y-1">
                  <div className="flex justify-between">
                    <span>Battery:</span>
                    <span className={getBatteryColor(selectedScooter.battery)}>
                      {selectedScooter.battery}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="capitalize">{selectedScooter.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Speed:</span>
                    <span>{selectedScooter.speed} mph</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 space-y-2">
          <button className="bg-white shadow-lg rounded-lg p-3 hover:bg-gray-50 transition-colors">
            <Navigation size={20} className="text-gray-700" />
          </button>
          <button className="bg-white shadow-lg rounded-lg p-3 hover:bg-gray-50 transition-colors">
            <Users size={20} className="text-gray-700" />
          </button>
          <button className="bg-white shadow-lg rounded-lg p-3 hover:bg-gray-50 transition-colors">
            <Zap size={20} className="text-gray-700" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Available (
                {
                  filteredScooters.filter((s) => s.status === "available")
                    .length
                }
                )
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                In Use (
                {filteredScooters.filter((s) => s.status === "in-use").length})
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                Charging (
                {filteredScooters.filter((s) => s.status === "charging").length}
                )
              </span>
            </div>
            <div className="text-gray-600">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
