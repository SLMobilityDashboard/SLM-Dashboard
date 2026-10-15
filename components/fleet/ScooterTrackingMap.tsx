"use client";

import React, { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Circle,
  Popup,
} from "react-leaflet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Loader2,
  MapPin,
  Zap,
  Clock,
  Navigation,
  Filter,
  Eye,
  EyeOff,
  Calendar,
  Route,
  Play,
  Pause,
  RotateCcw,
  Activity,
} from "lucide-react";

// Custom Leaflet Icons
const createCustomIcon = (color, iconSvg, size = [24, 24]) => {
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: ${size[0]}px;
        height: ${size[1]}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ${iconSvg}
      </div>
    `,
    className: "custom-div-icon",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2],
  });
};

// Start point icon (green)
const startIcon = createCustomIcon(
  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  `<svg width="12" height="12" fill="white" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z"/>
  </svg>`
);

// End point icon (red)
const endIcon = createCustomIcon(
  "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  `<svg width="12" height="12" fill="white" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12"/>
  </svg>`
);

// Current position icon (blue, larger)
const currentIcon = createCustomIcon(
  "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  `<svg width="14" height="14" fill="white" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>`,
  [32, 32]
);

const addLeafletCustomStyles = () => {
  const styleId = "leaflet-custom-styles-scooter-tracking";
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.innerHTML = `
    .custom-div-icon {
      background: transparent !important;
      border: none !important;
    }
    
    .leaflet-popup-content-wrapper {
      background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
      color: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.1);
    }
    
    .leaflet-popup-content {
      margin: 16px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .leaflet-popup-tip {
      background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
      border: 1px solid rgba(255,255,255,0.1);
    }
    
    .leaflet-popup-close-button {
      color: white !important;
      font-size: 16px !important;
      font-weight: bold !important;
      padding: 6px !important;
      top: 4px !important;
      right: 4px !important;
    }
    
    .leaflet-popup-close-button:hover {
      background: rgba(255,255,255,0.1) !important;
      border-radius: 50%;
    }
    
    .tracking-info {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }
    
    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    
    .info-label {
      opacity: 0.7;
      min-width: 50px;
    }
    
    .info-value {
      font-weight: 600;
      color: #60a5fa;
    }
    
    .time-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 12px;
      font-size: 11px;
      color: #93c5fd;
      margin-top: 8px;
    }
  `;
  document.head.appendChild(style);
};

// Hardcoded GPS tracking data
const trackingData = [
  // Scooter 1
  {
    longDir: "E",
    long: 79.985743,
    lat: 6.696449166666667,
    ctime: 1738601954,
    latDir: "N",
    tboxId: "06347782-5fae-4e42-bdfb-b32aa6a633d7",
    tbox_id: "06347782-5fae-4e42-bdfb-b32aa6a633d7",
    timestamp: "2025-02-03 22:29:14+05:30",
  },
  {
    longDir: "E",
    long: 79.98676700000001,
    lat: 6.698796000000001,
    ctime: 1738601985,
    latDir: "N",
    tboxId: "06347782-5fae-4e42-bdfb-b32aa6a633d7",
    tbox_id: "06347782-5fae-4e42-bdfb-b32aa6a633d7",
    timestamp: "2025-02-03 22:29:45+05:30",
  },
  {
    longDir: "E",
    long: 79.987891,
    lat: 6.701143,
    ctime: 1738602016,
    latDir: "N",
    tboxId: "06347782-5fae-4e42-bdfb-b32aa6a633d7",
    tbox_id: "06347782-5fae-4e42-bdfb-b32aa6a633d7",
    timestamp: "2025-02-03 22:30:16+05:30",
  },
  {
    longDir: "E",
    long: 79.989015,
    lat: 6.70349,
    ctime: 1738602047,
    latDir: "N",
    tboxId: "06347782-5fae-4e42-bdfb-b32aa6a633d7",
    tbox_id: "06347782-5fae-4e42-bdfb-b32aa6a633d7",
    timestamp: "2025-02-03 22:30:47+05:30",
  },
  {
    longDir: "E",
    long: 79.990139,
    lat: 6.705837,
    ctime: 1738602078,
    latDir: "N",
    tboxId: "06347782-5fae-4e42-bdfb-b32aa6a633d7",
    tbox_id: "06347782-5fae-4e42-bdfb-b32aa6a633d7",
    timestamp: "2025-02-03 22:31:18+05:30",
  },

  // Scooter 2
  {
    longDir: "E",
    long: 79.975123,
    lat: 6.710234,
    ctime: 1738601920,
    latDir: "N",
    tboxId: "bc123456-7890-1234-5678-9abcdef12345",
    tbox_id: "bc123456-7890-1234-5678-9abcdef12345",
    timestamp: "2025-02-03 22:28:40+05:30",
  },
  {
    longDir: "E",
    long: 79.976247,
    lat: 6.712581,
    ctime: 1738601951,
    latDir: "N",
    tboxId: "bc123456-7890-1234-5678-9abcdef12345",
    tbox_id: "bc123456-7890-1234-5678-9abcdef12345",
    timestamp: "2025-02-03 22:29:11+05:30",
  },
  {
    longDir: "E",
    long: 79.977371,
    lat: 6.714928,
    ctime: 1738601982,
    latDir: "N",
    tboxId: "bc123456-7890-1234-5678-9abcdef12345",
    tbox_id: "bc123456-7890-1234-5678-9abcdef12345",
    timestamp: "2025-02-03 22:29:42+05:30",
  },
  {
    longDir: "E",
    long: 79.978495,
    lat: 6.717275,
    ctime: 1738602013,
    latDir: "N",
    tboxId: "bc123456-7890-1234-5678-9abcdef12345",
    tbox_id: "bc123456-7890-1234-5678-9abcdef12345",
    timestamp: "2025-02-03 22:30:13+05:30",
  },
  {
    longDir: "E",
    long: 79.979619,
    lat: 6.719622,
    ctime: 1738602044,
    latDir: "N",
    tboxId: "bc123456-7890-1234-5678-9abcdef12345",
    tbox_id: "bc123456-7890-1234-5678-9abcdef12345",
    timestamp: "2025-02-03 22:30:44+05:30",
  },

  // Scooter 3
  {
    longDir: "E",
    long: 79.995,
    lat: 6.685,
    ctime: 1738601800,
    latDir: "N",
    tboxId: "def78901-2345-6789-0123-456789abcdef",
    tbox_id: "def78901-2345-6789-0123-456789abcdef",
    timestamp: "2025-02-03 22:26:40+05:30",
  },
  {
    longDir: "E",
    long: 79.996124,
    lat: 6.687347,
    ctime: 1738601831,
    latDir: "N",
    tboxId: "def78901-2345-6789-0123-456789abcdef",
    tbox_id: "def78901-2345-6789-0123-456789abcdef",
    timestamp: "2025-02-03 22:27:11+05:30",
  },
  {
    longDir: "E",
    long: 79.997248,
    lat: 6.689694,
    ctime: 1738601862,
    latDir: "N",
    tboxId: "def78901-2345-6789-0123-456789abcdef",
    tbox_id: "def78901-2345-6789-0123-456789abcdef",
    timestamp: "2025-02-03 22:27:42+05:30",
  },
  {
    longDir: "E",
    long: 79.998372,
    lat: 6.692041,
    ctime: 1738601893,
    latDir: "N",
    tboxId: "def78901-2345-6789-0123-456789abcdef",
    tbox_id: "def78901-2345-6789-0123-456789abcdef",
    timestamp: "2025-02-03 22:28:13+05:30",
  },
  {
    longDir: "E",
    long: 79.999496,
    lat: 6.694388,
    ctime: 1738601924,
    latDir: "N",
    tboxId: "def78901-2345-6789-0123-456789abcdef",
    tbox_id: "def78901-2345-6789-0123-456789abcdef",
    timestamp: "2025-02-03 22:28:44+05:30",
  },

  // Additional points for other scooters
  {
    longDir: "E",
    long: 79.96,
    lat: 6.72,
    ctime: 1738601700,
    latDir: "N",
    tboxId: "abc12345-6789-0123-4567-89abcdef0123",
    tbox_id: "abc12345-6789-0123-4567-89abcdef0123",
    timestamp: "2025-02-03 22:25:00+05:30",
  },
  {
    longDir: "E",
    long: 79.9615,
    lat: 6.7225,
    ctime: 1738601760,
    latDir: "N",
    tboxId: "abc12345-6789-0123-4567-89abcdef0123",
    tbox_id: "abc12345-6789-0123-4567-89abcdef0123",
    timestamp: "2025-02-03 22:26:00+05:30",
  },
  {
    longDir: "E",
    long: 79.963,
    lat: 6.725,
    ctime: 1738601820,
    latDir: "N",
    tboxId: "abc12345-6789-0123-4567-89abcdef0123",
    tbox_id: "abc12345-6789-0123-4567-89abcdef0123",
    timestamp: "2025-02-03 22:27:00+05:30",
  },
  {
    longDir: "E",
    long: 79.9645,
    lat: 6.7275,
    ctime: 1738601880,
    latDir: "N",
    tboxId: "abc12345-6789-0123-4567-89abcdef0123",
    tbox_id: "abc12345-6789-0123-4567-89abcdef0123",
    timestamp: "2025-02-03 22:28:00+05:30",
  },
  {
    longDir: "E",
    long: 79.966,
    lat: 6.73,
    ctime: 1738601940,
    latDir: "N",
    tboxId: "abc12345-6789-0123-4567-89abcdef0123",
    tbox_id: "abc12345-6789-0123-4567-89abcdef0123",
    timestamp: "2025-02-03 22:29:00+05:30",
  },
];

const ScooterTrackingMap = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    paths: true,
    startPoints: true,
    endPoints: true,
    currentPositions: true,
  });
  const [scooterFilters, setScooterFilters] = useState({});
  const [timeRange, setTimeRange] = useState({ start: null, end: null });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(null);

  useEffect(() => {
    addLeafletCustomStyles();

    // Initialize scooter filters
    const uniqueScooters = [
      ...new Set(trackingData.map((point) => point.tbox_id)),
    ];
    const initialScooterFilters = {};
    uniqueScooters.forEach((scooterId) => {
      initialScooterFilters[scooterId] = true;
    });
    setScooterFilters(initialScooterFilters);

    // Set time range
    const times = trackingData.map((point) => point.ctime);
    setTimeRange({
      start: Math.min(...times),
      end: Math.max(...times),
    });

    setTimeout(() => setIsLoading(false), 500);
  }, []);

  const toggleFilter = (filterType) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: !prev[filterType],
    }));
  };

  const toggleScooterFilter = (scooterId) => {
    setScooterFilters((prev) => ({
      ...prev,
      [scooterId]: !prev[scooterId],
    }));
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getScooterPaths = () => {
    const paths = {};
    const filteredData = trackingData.filter(
      (point) =>
        scooterFilters[point.tbox_id] &&
        (!currentTime || point.ctime <= currentTime)
    );

    filteredData.forEach((point) => {
      if (!paths[point.tbox_id]) {
        paths[point.tbox_id] = [];
      }
      paths[point.tbox_id].push([point.lat, point.long]);
    });

    return paths;
  };

  const getScooterColor = (scooterId) => {
    const colors = [
      "#3b82f6",
      "#ef4444",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#06b6d4",
    ];
    const index = Object.keys(scooterFilters).indexOf(scooterId);
    return colors[index % colors.length];
  };

  const getScooterPoints = () => {
    const points = {};
    const filteredData = trackingData.filter(
      (point) =>
        scooterFilters[point.tbox_id] &&
        (!currentTime || point.ctime <= currentTime)
    );

    filteredData.forEach((point) => {
      if (!points[point.tbox_id]) {
        points[point.tbox_id] = [];
      }
      points[point.tbox_id].push(point);
    });

    return points;
  };

  const uniqueScooters = [
    ...new Set(trackingData.map((point) => point.tbox_id)),
  ];
  const paths = getScooterPaths();
  const points = getScooterPoints();

  return (
    <div className="w-full space-y-4">
      {/* Stats and Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Active Scooters
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {Object.values(scooterFilters).filter(Boolean).length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">GPS Points</p>
                <p className="text-2xl font-bold text-green-700">
                  {trackingData.length}
                </p>
              </div>
              <MapPin className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">
                  Total Distance
                </p>
                <p className="text-2xl font-bold text-purple-700">15.2km</p>
              </div>
              <Route className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Time Span</p>
                <p className="text-2xl font-bold text-orange-700">4m 26s</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Filter Panel */}
        <Card className="lg:col-span-1 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg text-gray-800">
                Filters & Controls
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Map Elements */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-600">
                Map Elements
              </h4>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Paths
                  </span>
                </div>
                <button
                  onClick={() => toggleFilter("paths")}
                  className={`p-1 rounded-full transition-colors ${
                    filters.paths
                      ? "text-blue-600 hover:bg-blue-100"
                      : "text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {filters.paths ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Start Points
                  </span>
                </div>
                <button
                  onClick={() => toggleFilter("startPoints")}
                  className={`p-1 rounded-full transition-colors ${
                    filters.startPoints
                      ? "text-green-600 hover:bg-green-100"
                      : "text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {filters.startPoints ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Pause className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-gray-700">
                    End Points
                  </span>
                </div>
                <button
                  onClick={() => toggleFilter("endPoints")}
                  className={`p-1 rounded-full transition-colors ${
                    filters.endPoints
                      ? "text-red-600 hover:bg-red-100"
                      : "text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {filters.endPoints ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Scooter Filters */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-600">
                Scooters ({uniqueScooters.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {uniqueScooters.map((scooterId, index) => (
                  <div
                    key={scooterId}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border-slate-700/50 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getScooterColor(scooterId) }}
                      ></div>
                      <span className="text-xs font-medium text-gray-700">
                        Scooter {index + 1}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleScooterFilter(scooterId)}
                      className={`p-1 rounded-full transition-colors ${
                        scooterFilters[scooterId]
                          ? "text-indigo-600 hover:bg-indigo-100"
                          : "text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {scooterFilters[scooterId] ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const allOn = {};
                    uniqueScooters.forEach((id) => (allOn[id] = true));
                    setScooterFilters(allOn);
                    setFilters({
                      paths: true,
                      startPoints: true,
                      endPoints: true,
                      currentPositions: true,
                    });
                  }}
                  className="flex-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Show All
                </button>
                <button
                  onClick={() => {
                    const allOff = {};
                    uniqueScooters.forEach((id) => (allOff[id] = false));
                    setScooterFilters(allOff);
                  }}
                  className="flex-1 px-2 py-1 text-xs font-medium text-gray-600 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Hide All
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Map */}
        <Card className="lg:col-span-3 bg-gradient-to-br from-slate-50 to-gray-100 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <Navigation className="w-6 h-6" />
              <div>
                <CardTitle className="text-xl">
                  GPS Tracking Visualization
                </CardTitle>
                <CardDescription className="text-indigo-100 mt-1">
                  Real-time scooter movement paths and location history
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[600px] relative z-0 p-0">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-full bg-gray-900 rounded-b-lg">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mb-4" />
                <p className="text-gray-300 animate-pulse">
                  Loading GPS tracking data...
                </p>
              </div>
            ) : (
              <div className="h-full rounded-b-lg overflow-hidden">
                <MapContainer
                  center={[6.7, 79.98]}
                  zoom={13}
                  style={{ height: "100%", width: "100%", zIndex: 0 }}
                >
                  <TileLayer
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                  />

                  {/* Render paths for each scooter */}
                  {filters.paths &&
                    Object.entries(paths).map(
                      ([scooterId, pathPoints]) =>
                        pathPoints.length > 1 && (
                          <Polyline
                            key={scooterId}
                            positions={pathPoints}
                            pathOptions={{
                              color: getScooterColor(scooterId),
                              weight: 3,
                              opacity: 0.8,
                              dashArray: "5, 10",
                            }}
                          />
                        )
                    )}

                  {/* Render start and end points */}
                  {Object.entries(points).map(([scooterId, scooterPoints]) => {
                    if (scooterPoints.length === 0) return null;

                    const firstPoint = scooterPoints[0];
                    const lastPoint = scooterPoints[scooterPoints.length - 1];
                    const scooterIndex = uniqueScooters.indexOf(scooterId) + 1;

                    return (
                      <React.Fragment key={scooterId}>
                        {/* Start Point */}
                        {filters.startPoints && (
                          <Marker
                            position={[firstPoint.lat, firstPoint.long]}
                            icon={startIcon}
                          >
                            <Popup>
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Play className="w-4 h-4 text-green-400" />
                                  <strong>Journey Start</strong>
                                </div>
                                <div className="tracking-info">
                                  <div className="info-row">
                                    <Zap className="w-3 h-3" />
                                    <span className="info-label">Scooter:</span>
                                    <span className="info-value">
                                      #{scooterIndex}
                                    </span>
                                  </div>
                                  <div className="info-row">
                                    <MapPin className="w-3 h-3" />
                                    <span className="info-label">
                                      Position:
                                    </span>
                                    <span className="info-value">
                                      {firstPoint.lat.toFixed(6)},{" "}
                                      {firstPoint.long.toFixed(6)}
                                    </span>
                                  </div>
                                  <div className="info-row">
                                    <Clock className="w-3 h-3" />
                                    <span className="info-label">Time:</span>
                                    <span className="info-value">
                                      {new Date(
                                        firstPoint.ctime * 1000
                                      ).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="time-badge">
                                  <Calendar className="w-3 h-3" />
                                  {firstPoint.timestamp}
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        )}

                        {/* End Point */}
                        {filters.endPoints && (
                          <Marker
                            position={[lastPoint.lat, lastPoint.long]}
                            icon={endIcon}
                          >
                            <Popup>
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Pause className="w-4 h-4 text-red-400" />
                                  <strong>Journey End</strong>
                                </div>
                                <div className="tracking-info">
                                  <div className="info-row">
                                    <Zap className="w-3 h-3" />
                                    <span className="info-label">Scooter:</span>
                                    <span className="info-value">
                                      #{scooterIndex}
                                    </span>
                                  </div>
                                  <div className="info-row">
                                    <MapPin className="w-3 h-3" />
                                    <span className="info-label">
                                      Position:
                                    </span>
                                    <span className="info-value">
                                      {lastPoint.lat.toFixed(6)},{" "}
                                      {lastPoint.long.toFixed(6)}
                                    </span>
                                  </div>
                                  <div className="info-row">
                                    <Clock className="w-3 h-3" />
                                    <span className="info-label">Time:</span>
                                    <span className="info-value">
                                      {new Date(
                                        lastPoint.ctime * 1000
                                      ).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <div className="info-row">
                                    <Route className="w-3 h-3" />
                                    <span className="info-label">Points:</span>
                                    <span className="info-value">
                                      {scooterPoints.length}
                                    </span>
                                  </div>
                                </div>
                                <div className="time-badge">
                                  <Calendar className="w-3 h-3" />
                                  {lastPoint.timestamp}
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        )}

                        {/* Current Position (Latest Point) */}
                        {filters.currentPositions && (
                          <Marker
                            position={[lastPoint.lat, lastPoint.long]}
                            icon={currentIcon}
                          >
                            <Popup>
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Navigation className="w-4 h-4 text-blue-400" />
                                  <strong>Current Position</strong>
                                </div>
                                <div className="tracking-info">
                                  <div className="info-row">
                                    <Zap className="w-3 h-3" />
                                    <span className="info-label">Scooter:</span>
                                    <span className="info-value">
                                      #{scooterIndex}
                                    </span>
                                  </div>
                                  <div className="info-row">
                                    <MapPin className="w-3 h-3" />
                                    <span className="info-label">
                                      Coordinates:
                                    </span>
                                    <span className="info-value">
                                      {lastPoint.lat.toFixed(6)},{" "}
                                      {lastPoint.long.toFixed(6)}
                                    </span>
                                  </div>
                                  <div className="info-row">
                                    <Clock className="w-3 h-3" />
                                    <span className="info-label">
                                      Last Update:
                                    </span>
                                    <span className="info-value">
                                      {new Date(
                                        lastPoint.ctime * 1000
                                      ).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <div className="info-row">
                                    <Activity className="w-3 h-3" />
                                    <span className="info-label">Status:</span>
                                    <span className="info-value">Active</span>
                                  </div>
                                </div>
                                <div className="time-badge">
                                  <Calendar className="w-3 h-3" />
                                  Last seen: {lastPoint.timestamp}
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        )}

                        {/* Accuracy circles for each point */}
                        {scooterPoints.map((point, index) => (
                          <Circle
                            key={`${scooterId}-circle-${index}`}
                            center={[point.lat, point.long]}
                            radius={20}
                            pathOptions={{
                              color: getScooterColor(scooterId),
                              fillColor: getScooterColor(scooterId),
                              fillOpacity: 0.1,
                              weight: 1,
                              opacity: 0.3,
                            }}
                          />
                        ))}
                      </React.Fragment>
                    );
                  })}
                </MapContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Info Panel */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="w-5 h-5 text-indigo-600" />
            Live Tracking Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white">
                Tracking Statistics
              </h4>
              <div className="space-y-1 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Total Scooters:</span>
                  <span className="font-medium">{uniqueScooters.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Tracking:</span>
                  <span className="font-medium text-green-600">
                    {Object.values(scooterFilters).filter(Boolean).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GPS Data Points:</span>
                  <span className="font-medium">{trackingData.length}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white">Time Range</h4>
              <div className="space-y-1 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Start Time:</span>
                  <span className="font-medium">
                    {timeRange.start
                      ? new Date(timeRange.start * 1000).toLocaleTimeString()
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>End Time:</span>
                  <span className="font-medium">
                    {timeRange.end
                      ? new Date(timeRange.end * 1000).toLocaleTimeString()
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">
                    {timeRange.start && timeRange.end
                      ? `${Math.round(
                          (timeRange.end - timeRange.start) / 60
                        )}m ${(timeRange.end - timeRange.start) % 60}s`
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white">Map Legend</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <Play className="w-2 h-2 text-white" />
                  </div>
                  <span className="text-gray-700">Journey Start</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <Pause className="w-2 h-2 text-white" />
                  </div>
                  <span className="text-gray-700">Journey End</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Navigation className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-gray-700">Current Position</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScooterTrackingMap;
