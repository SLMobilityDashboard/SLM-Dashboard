"use client";

import React, { useEffect, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
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
  AlertTriangle,
  CheckCircle,
  Battery,
  BatteryLow,
  Navigation,
  Shield,
  AlertCircle,
  Layers,
  Menu,
  X,
  Settings,
  Activity,
  BarChart3,
  TrendingUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

// Modern color palette with consistent gradients
const colors = {
  primary: {
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    solid: "#6366f1",
    light: "#a5b4fc",
  },
  success: {
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    solid: "#10b981",
    light: "#34d399",
  },
  warning: {
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    solid: "#f59e0b",
    light: "#fbbf24",
  },
  danger: {
    gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    solid: "#ef4444",
    light: "#f87171",
  },
  surface: {
    primary: "rgba(15, 23, 42, 0.8)",
    secondary: "rgba(30, 41, 59, 0.6)",
    accent: "rgba(51, 65, 85, 0.4)",
  },
};

// Map providers
const mapProviders = {
  openstreetmap: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    borderColor: "#1f2937",
    regionBaseColor: "#ffffff",
  },
  cartodb_dark: {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    borderColor: "#facc15",
    regionBaseColor: "#1e293b",
  },
  cartodb_light: {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    borderColor: "#111827",
    regionBaseColor: "#f8fafc",
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri",
    borderColor: "#00E5FF",
    regionBaseColor: "#000000",
  },
};

// Enhanced Loading Component
const EnhancedLoader = ({ phase = "initializing", progress }) => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const phaseMessages = {
    initializing: "Initializing smart monitoring system",
    loading: "Loading fleet data",
    rendering: "Rendering scooter positions",
    calculating: "Calculating danger zones",
    ready: "System ready",
  };

  const phaseIcons = {
    initializing: <Activity className="h-6 w-6" />,
    loading: <Zap className="h-6 w-6" />,
    rendering: <MapPin className="h-6 w-6" />,
    calculating: <BarChart3 className="h-6 w-6" />,
    ready: <Shield className="h-6 w-6" />,
  };

  return (
    <div className="text-center text-muted-foreground p-8">
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
          Real-time fleet monitoring with intelligent danger zone detection
        </div>
      </div>
    </div>
  );
};

// Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, label, icon }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon && <div className="text-slate-400">{icon}</div>}
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${
          checked ? "bg-cyan-500" : "bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
};

// Enhanced custom icon creation with consistent styling
const createCustomIcon = (
  gradient,
  iconSvg,
  size = [36, 36],
  pulseColor = null
) => {
  const pulseAnimation = pulseColor
    ? `
    <div style="
      position: absolute;
      top: -4px;
      left: -4px;
      width: ${size[0] + 8}px;
      height: ${size[1] + 8}px;
      border-radius: 50%;
      background: ${pulseColor};
      opacity: 0.3;
      animation: pulse 2s infinite;
    "></div>
  `
    : "";

  return L.divIcon({
    html: `
      <div class="icon-container">
        ${pulseAnimation}
        <div style="
          background: ${gradient};
          width: ${size[0]}px;
          height: ${size[1]}px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          position: relative;
          z-index: 1;
          transition: all 0.3s ease;
        ">
          ${iconSvg}
        </div>
      </div>
    `,
    className: "custom-div-icon",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2],
  });
};

// Station Icon with enhanced styling
const stationIcon = createCustomIcon(
  colors.primary.gradient,
  `<svg width="20" height="20" fill="white" viewBox="0 0 24 24">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`,
  [40, 40]
);

// Enhanced scooter icons with status-based styling
const safeScooterIcon = createCustomIcon(
  colors.success.gradient,
  `<svg width="18" height="18" fill="white" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>`,
  [32, 32]
);

const warningScooterIcon = createCustomIcon(
  colors.warning.gradient,
  `<svg width="18" height="18" fill="white" viewBox="0 0 24 24">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>`,
  [32, 32],
  colors.warning.solid
);

const dangerScooterIcon = createCustomIcon(
  colors.danger.gradient,
  `<svg width="18" height="18" fill="white" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
  </svg>`,
  [32, 32],
  colors.danger.solid
);

const addLeafletCustomStyles = () => {
  const styleId = "leaflet-custom-styles-enhanced-scooter-map";
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.innerHTML = `
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.1); opacity: 0.1; }
      100% { transform: scale(1); opacity: 0.3; }
    }
    
    .custom-div-icon {
      background: transparent !important;
      border: none !important;
    }
    
    .icon-container:hover .custom-div-icon > div {
      transform: scale(1.1);
      box-shadow: 0 12px 40px rgba(0,0,0,0.6);
    }
    
    .leaflet-popup-content-wrapper {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);
      color: white;
      border-radius: 16px;
      box-shadow: 0 20px 64px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(20px);
      min-width: 280px;
    }
    
    .leaflet-popup-content {
      margin: 20px 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .leaflet-popup-tip {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);
      border: 1px solid rgba(255,255,255,0.1);
    }
    
    .leaflet-popup-close-button {
      color: rgba(255,255,255,0.8) !important;
      font-size: 20px !important;
      font-weight: bold !important;
      padding: 12px !important;
      top: 8px !important;
      right: 8px !important;
      border-radius: 8px !important;
      transition: all 0.2s ease !important;
    }
    
    .leaflet-popup-close-button:hover {
      background: rgba(255,255,255,0.1) !important;
      color: white !important;
      transform: scale(1.1);
    }
    
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 12px;
      margin-top: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    
    .status-safe {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .status-warning {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    
    .status-danger {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    .battery-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 12px 0;
      padding: 10px 14px;
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
    }
    
    .info-grid {
      display: grid;
      gap: 12px;
      margin-top: 16px;
    }
    
    .info-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .info-item:last-child {
      border-bottom: none;
    }
    
    .info-label {
      opacity: 0.7;
      min-width: 70px;
      font-weight: 500;
    }
    
    .info-value {
      font-weight: 600;
      color: #a5b4fc;
    }
    
    .popup-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .popup-title {
      font-size: 16px;
      font-weight: 700;
      color: white;
    }
  `;
  document.head.appendChild(style);
};

const stations = [
  { id: "ST01", name: "Miriswaththa", lat: 7.123456, lng: 80.123456 },
  { id: "ST02", name: "Seeduwa", lat: 7.148497, lng: 79.873276 },
  { id: "ST03", name: "Minuwangoda", lat: 7.182689, lng: 79.961171 },
  { id: "ST04", name: "Divulapitiya", lat: 7.222404, lng: 80.017613 },
  { id: "ST05", name: "Katunayake", lat: 7.222445, lng: 80.017625 },
  { id: "ST06", name: "Udugampola", lat: 7.120498, lng: 79.983923 },
  { id: "ST07", name: "Kadawatha", lat: 7.006685, lng: 79.958184 },
  { id: "ST08", name: "Kochchikade", lat: 7.274298, lng: 79.862597 },
  { id: "ST09", name: "Paliyagoda", lat: 6.960975, lng: 79.880949 },
  { id: "ST10", name: "Boralesgamuwa", lat: 6.837024, lng: 79.903572 },
  { id: "ST11", name: "Thalawathugoda", lat: 6.877865, lng: 79.939505 },
  { id: "ST12", name: "Moratuwa", lat: 6.787022, lng: 79.884759 },
  { id: "ST13", name: "Borella", lat: 6.915059, lng: 79.881394 },
  { id: "ST14", name: "Padukka", lat: 6.847305, lng: 80.102153 },
  { id: "ST15", name: "Beruwala", lat: 7.222348, lng: 80.017553 },
  { id: "ST16", name: "Bandaragama", lat: 6.714853, lng: 79.989208 },
  { id: "ST17", name: "Maggona", lat: 7.222444, lng: 80.017606 },
  { id: "ST18", name: "Panadura", lat: 6.713372, lng: 79.906452 },
];

const scooters = [
  { id: "SC001", lat: 6.9278, lng: 79.8612, battery: 70 },
  { id: "SC002", lat: 6.935, lng: 79.85, battery: 30 },
  { id: "SC003", lat: 6.95, lng: 79.865, battery: 10 },
  { id: "SC004", lat: 7.9, lng: 80.9, battery: 100 },
  { id: "SC005", lat: 7.05, lng: 79.95, battery: 85 },
  { id: "SC006", lat: 6.842, lng: 79.8725, battery: 60 },
  { id: "SC007", lat: 6.9271, lng: 80.8612, battery: 45 },
  { id: "SC008", lat: 8.3114, lng: 80.4037, battery: 90 },
  { id: "SC009", lat: 9.6615, lng: 80.0255, battery: 20 },
  { id: "SC010", lat: 7.2906, lng: 80.6337, battery: 55 },
  { id: "SC011", lat: 6.0535, lng: 80.22, battery: 35 },
  { id: "SC012", lat: 6.4214, lng: 80.0064, battery: 75 },
  { id: "SC013", lat: 8.5784, lng: 81.233, battery: 65 },
  { id: "SC014", lat: 6.9442, lng: 81.0092, battery: 90 },
  { id: "SC015", lat: 6.9365, lng: 79.8758, battery: 40 },
  { id: "SC016", lat: 7.16, lng: 79.87, battery: 50 },
  { id: "SC017", lat: 6.711, lng: 81.2158, battery: 30 },
  { id: "SC018", lat: 8.033, lng: 80.983, battery: 85 },
  { id: "SC019", lat: 6.6685, lng: 80.1717, battery: 95 },
  { id: "SC020", lat: 7.7167, lng: 81.7, battery: 10 },
];

const getDistanceFromLatLng = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getScooterRangeMeters = (battery) => battery * 500; // 0.5 km per 1%

const getScooterStatus = (scooter, distanceToNearestStation, scooterRange) => {
  if (distanceToNearestStation > scooterRange) {
    return "danger";
  } else if (
    scooter.battery <= 25 ||
    distanceToNearestStation > scooterRange * 0.7
  ) {
    return "warning";
  }
  return "safe";
};

const getScooterIcon = (status) => {
  switch (status) {
    case "danger":
      return dangerScooterIcon;
    case "warning":
      return warningScooterIcon;
    default:
      return safeScooterIcon;
  }
};

const getBatteryIcon = (battery) => {
  if (battery <= 20) return <BatteryLow className="w-5 h-5 text-red-400" />;
  return <Battery className="w-5 h-5 text-green-400" />;
};

const getStatusIcon = (status) => {
  switch (status) {
    case "safe":
      return <Shield className="w-4 h-4 text-green-400" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    case "danger":
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    default:
      return <CheckCircle className="w-4 h-4" />;
  }
};

const ScooterMap = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState("initializing");
  const [mapStats, setMapStats] = useState({ safe: 0, warning: 0, danger: 0 });

  // UI States
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(true);
  const [mapProvider, setMapProvider] = useState("cartodb_dark");
  const [showStations, setShowStations] = useState(true);
  const [showRangeCircles, setShowRangeCircles] = useState(false);
  const [batteryThreshold, setBatteryThreshold] = useState(25);

  useEffect(() => {
    addLeafletCustomStyles();

    // Simulate loading phases
    const loadingSequence = async () => {
      setLoadingPhase("loading");
      await new Promise((resolve) => setTimeout(resolve, 800));

      setLoadingPhase("calculating");
      // Calculate stats
      const stats = { safe: 0, warning: 0, danger: 0 };
      scooters.forEach((scooter) => {
        const distanceToNearestStation = getNearestStationDistance(scooter);
        const scooterRange = getScooterRangeMeters(scooter.battery);
        const status = getScooterStatus(
          scooter,
          distanceToNearestStation,
          scooterRange
        );
        stats[status]++;
      });
      setMapStats(stats);

      await new Promise((resolve) => setTimeout(resolve, 600));
      setLoadingPhase("rendering");
      await new Promise((resolve) => setTimeout(resolve, 400));

      setLoadingPhase("ready");
      setIsLoading(false);
    };

    loadingSequence();
  }, []);

  const getNearestStationDistance = (scooter) => {
    const distances = stations.map((station) =>
      getDistanceFromLatLng(scooter.lat, scooter.lng, station.lat, station.lng)
    );
    return Math.min(...distances);
  };

  // Calculate additional metrics
  const additionalStats = useMemo(() => {
    const averageBattery =
      scooters.reduce((sum, s) => sum + s.battery, 0) / scooters.length;
    const lowBatteryCount = scooters.filter(
      (s) => s.battery <= batteryThreshold
    ).length;
    const activeScooters = scooters.filter((s) => s.battery > 5).length;

    return {
      averageBattery: Math.round(averageBattery),
      lowBatteryCount,
      activeScooters,
      totalStations: stations.length,
    };
  }, [scooters, batteryThreshold]);

  return (
    <div className="min-h-screen bg-slate-900 relative">
      {/* Map Container with Overlays */}
      <div className="relative w-full h-screen">
        {/* Header */}
        <div className="absolute top-3 left-12 z-[1000]">
          <Card className="bg-slate-800/95 backdrop-blur-md border border-slate-700 text-slate-300 shadow-2xl">
            <CardContent className="p-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Zap className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">
                    Smart Fleet Monitor
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Real-time tracking • {scooters.length} vehicles •{" "}
                    {stations.length} stations
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex gap-2">
          {/* Stats Toggle */}
          <button
            onClick={() => setStatsVisible(!statsVisible)}
            className={`p-2 rounded-lg transition-all duration-200 shadow-lg backdrop-blur-md border ${
              statsVisible
                ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-400"
                : "bg-slate-800/90 border-slate-700 text-slate-400 hover:text-slate-300"
            }`}
          >
            {statsVisible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>

          {/* Settings Toggle */}
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`p-2 rounded-lg transition-all duration-200 shadow-lg backdrop-blur-md border ${
              settingsOpen
                ? "bg-blue-500/20 border-blue-400/30 text-blue-400"
                : "bg-slate-800/90 border-slate-700 text-slate-400 hover:text-slate-300"
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Settings Panel */}
        {settingsOpen && (
          <div className="absolute top-20 right-4 z-[998] w-80">
            <Card className="bg-slate-800/95 backdrop-blur-md border border-slate-700 shadow-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-cyan-400" />
                  <CardTitle className="text-white text-lg">
                    Fleet Controls
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Map Style */}
                <div>
                  <Label className="text-slate-300 text-sm font-medium mb-3 block">
                    Map Style
                  </Label>
                  <select
                    value={mapProvider}
                    onChange={(e) => setMapProvider(e.target.value)}
                    className="w-full text-sm bg-slate-700/50 border border-slate-600 text-white rounded-lg px-3 py-2.5 focus:border-cyan-400 focus:outline-none transition-colors backdrop-blur-sm"
                  >
                    {Object.entries(mapProviders).map(([key, provider]) => (
                      <option key={key} value={key}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Battery Threshold */}
                <div className="space-y-3">
                  <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
                    <span>Battery Alert Threshold</span>
                    <span className="text-cyan-400 font-mono bg-slate-700/50 px-2 py-1 rounded text-xs">
                      {batteryThreshold}%
                    </span>
                  </Label>
                  <div className="px-2">
                    <Slider
                      min={10}
                      max={50}
                      step={5}
                      value={[batteryThreshold]}
                      onValueChange={(values) => setBatteryThreshold(values[0])}
                      className="py-2"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 px-2">
                    <span>10%</span>
                    <span>50%</span>
                  </div>
                </div>

                <div className="h-px bg-slate-700/50" />

                {/* Display Options */}
                <div className="space-y-4">
                  <Label className="text-slate-300 text-sm font-medium block">
                    Display Options
                  </Label>
                  <div className="space-y-3">
                    <ToggleSwitch
                      checked={showStations}
                      onChange={setShowStations}
                      label="Charging Stations"
                      icon={<MapPin className="w-4 h-4" />}
                    />
                    <ToggleSwitch
                      checked={showRangeCircles}
                      onChange={setShowRangeCircles}
                      label="Range Circles"
                      icon={<Navigation className="w-4 h-4" />}
                    />
                  </div>
                </div>

                <div className="h-px bg-slate-700/50" />

                {/* Quick Stats */}
                <div className="bg-slate-700/30 rounded-lg p-3 space-y-2">
                  <Label className="text-slate-300 text-sm font-medium block mb-2">
                    Quick Stats
                  </Label>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active:</span>
                      <span className="text-cyan-400 font-medium">
                        {additionalStats.activeScooters}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg Battery:</span>
                      <span className="text-cyan-400 font-medium">
                        {additionalStats.averageBattery}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Low Battery:</span>
                      <span className="text-yellow-400 font-medium">
                        {additionalStats.lowBatteryCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Stations:</span>
                      <span className="text-green-400 font-medium">
                        {additionalStats.totalStations}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bottom Status Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-[999] pointer-events-none">
          <div className="flex justify-between items-center">
            {/* Left Side - Map Attribution */}
            <Card className="bg-slate-800/90 backdrop-blur-md border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs pointer-events-auto">
              <div className="flex items-center gap-2">
                <Layers className="w-3 h-3" />
                <span>{mapProviders[mapProvider].name}</span>
              </div>
            </Card>

            {/* Right Side - Fleet Summary */}
            <div className="flex gap-2 pointer-events-auto">
              <Card className="bg-slate-800/90 backdrop-blur-md border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Active: {additionalStats.activeScooters}</span>
                </div>
              </Card>

              <Card className="bg-slate-800/90 backdrop-blur-md border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <Battery className="w-3 h-3" />
                  <span>Avg: {additionalStats.averageBattery}%</span>
                </div>
              </Card>

              <Card className="bg-slate-800/90 backdrop-blur-md border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  <span>Low: {additionalStats.lowBatteryCount}</span>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Map */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-full bg-slate-900">
            <EnhancedLoader phase={loadingPhase} />
          </div>
        ) : (
          <div className="h-full w-full">
            <MapContainer
              center={[6.9278, 79.8612]}
              zoom={8}
              style={{ height: "100%", width: "100%", zIndex: 0 }}
            >
              <TileLayer
                url={mapProviders[mapProvider].url}
                attribution={mapProviders[mapProvider].attribution}
              />

              {/* Stations */}
              {showStations &&
                stations.map((station) => (
                  <Marker
                    key={station.id}
                    position={[station.lat, station.lng]}
                    icon={stationIcon}
                  >
                    <Popup className="custom-popup">
                      <div>
                        <div className="popup-header">
                          <MapPin className="w-5 h-5 text-blue-400" />
                          <span className="popup-title">{station.name}</span>
                        </div>
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="info-label">Station ID:</span>
                            <span className="info-value">{station.id}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Type:</span>
                            <span className="info-value">Charging Hub</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Status:</span>
                            <span className="info-value text-green-400">
                              Active
                            </span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

              {/* Scooters */}
              {scooters.map((scooter) => {
                const scooterRange = getScooterRangeMeters(scooter.battery);
                const distanceToNearestStation =
                  getNearestStationDistance(scooter);
                const status = getScooterStatus(
                  scooter,
                  distanceToNearestStation,
                  scooterRange
                );

                return (
                  <React.Fragment key={scooter.id}>
                    <Marker
                      position={[scooter.lat, scooter.lng]}
                      icon={getScooterIcon(status)}
                    >
                      <Popup className="custom-popup">
                        <div>
                          <div className="popup-header">
                            <Zap className="w-5 h-5 text-blue-400" />
                            <span className="popup-title">
                              Scooter {scooter.id}
                            </span>
                          </div>

                          <div className="battery-indicator">
                            {getBatteryIcon(scooter.battery)}
                            <span className="font-semibold">
                              Battery: {scooter.battery}%
                            </span>
                          </div>

                          <div className="info-grid">
                            <div className="info-item">
                              <Navigation className="w-4 h-4 text-blue-400" />
                              <span className="info-label">Range:</span>
                              <span className="info-value">
                                {(scooterRange / 1000).toFixed(1)} km
                              </span>
                            </div>
                            <div className="info-item">
                              <MapPin className="w-4 h-4 text-blue-400" />
                              <span className="info-label">Nearest:</span>
                              <span className="info-value">
                                {(distanceToNearestStation / 1000).toFixed(1)}{" "}
                                km
                              </span>
                            </div>
                          </div>

                          <div className={`status-badge status-${status}`}>
                            {getStatusIcon(status)}
                            {status.toUpperCase()}
                          </div>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Range Circles */}
                    {showRangeCircles && (
                      <Circle
                        center={[scooter.lat, scooter.lng]}
                        radius={scooterRange}
                        pathOptions={{
                          color:
                            status === "danger"
                              ? colors.danger.solid
                              : status === "warning"
                              ? colors.warning.solid
                              : colors.success.solid,
                          fillColor:
                            status === "danger"
                              ? colors.danger.solid
                              : status === "warning"
                              ? colors.warning.solid
                              : colors.success.solid,
                          fillOpacity: 0.1,
                          weight: 1,
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScooterMap;
