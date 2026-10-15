import React, { useState, useRef, useEffect } from "react";
import { assignIconsToCategories, getStatusIcon } from "@/utils/iconUtils";
import { getSemanticColor, getColorsFromRecord } from "@/utils/colorUtils";
import { MapPin, Menu, X, Loader2, Settings } from "lucide-react";
import { da } from "date-fns/locale";

// Map configuration interface
interface MapConfig {
  // Map provider settings
  mapProvider?:
    | "openstreetmap"
    | "cartodb_dark"
    | "cartodb_light"
    | "satellite";

  // Initial view settings
  center?: { lat: number; lng: number };
  zoom?: number;

  // UI settings
  showZoomControl?: boolean;
  collapsibleUI?: boolean;

  // Field mappings
  latitudeField?: string;
  longitudeField?: string;
  sizeField?: string;
  colorField?: string;
  nameField?: string;
  categoryField?: string;

  // Pinging effect fields
  pingSizeField?: string; // Field that determines ping size
  pingSpeedField?: string; // Field that determines ping speed

  // Styling
  markerSize?: number;
  colorScheme?: "default" | "traffic" | "battery" | "performance";

  // Data filtering
  timeFilter?: string;
  statusFilter?: string[];
}

// Data point interface
interface DataPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: "station" | "scooter" | "vehicle" | "point";
  status: "active" | "inactive" | "safe" | "warning" | "danger";
  [key: string]: any; // Allow additional properties
}

// Map providers configuration
const mapProviders = {
  openstreetmap: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    style: "light",
  },
  cartodb_dark: {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    style: "dark",
  },
  cartodb_light: {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    style: "light",
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri",
    style: "satellite",
  },
};

// Color schemes
const colorSchemes = {
  default: {
    active: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    inactive: "#6B7280",
    safe: "#10B981",
  },
  traffic: {
    active: "#22C55E",
    warning: "#EAB308",
    danger: "#DC2626",
    inactive: "#64748B",
    safe: "#22C55E",
  },
  battery: {
    active: "#06D6A0",
    warning: "#FFD23F",
    danger: "#EE6C4D",
    inactive: "#8E8E93",
    safe: "#06D6A0",
  },
  performance: {
    active: "#3B82F6",
    warning: "#F97316",
    danger: "#E11D48",
    inactive: "#71717A",
    safe: "#3B82F6",
  },
};

// Sample data - in real usage, this would be passed as props
const sampleData: DataPoint[] = [
  {
    id: "ST01",
    name: "Miriswaththa Station",
    latitude: 7.123456,
    longitude: 80.123456,
    type: "station",
    status: "active",
    revenue: 4120,
    utilization_rate: 85,
    battery_level: 85,
    area: "Gampaha",
    ping_intensity: 0.8, // Higher values = larger ping
    activity_level: 0.9, // Higher values = faster ping
  },
  {
    id: "ST02",
    name: "Seeduwa Hub",
    latitude: 7.148497,
    longitude: 79.873276,
    type: "vehicle",
    status: "pending",
    revenue: 3980,
    utilization_rate: 78,
    battery_level: 78,
    area: "Gampaha",
    ping_intensity: 0.6,
    activity_level: 0.5,
  },
  {
    id: "SC01",
    name: "Scooter Alpha",
    latitude: 7.162689,
    longitude: 79.971171,
    type: "customer",
    status: "safe",
    battery_level: 92,
    range: 45,
    area: "Gampaha",
    ping_intensity: 0.1,
    activity_level: 0.8,
  },
  {
    id: "SC02",
    name: "Scooter Beta",
    latitude: 7.182404,
    longitude: 80.007613,
    type: "scooter",
    status: "warning",
    battery_level: 35,
    range: 15,
    area: "Gampaha",
    ping_intensity: 0.7,
    activity_level: 0.7,
  },
  {
    id: "SC03",
    name: "Scooter Gamma",
    latitude: 7.202445,
    longitude: 80.027625,
    type: "scooter",
    status: "danger",
    battery_level: 12,
    range: 3,
    area: "Gampaha",
    ping_intensity: 1.0,
    activity_level: 1.0,
  },
];

interface CustomizableMapProps {
  data?: DataPoint[];
  config?: MapConfig;
  onDataPointClick?: (point: DataPoint) => void;
  onConfigChange?: (config: MapConfig) => void;
  className?: string;
}

export default function CustomizableMap({
  data,
  config = {},
  onDataPointClick,
  onConfigChange,
  className = "",
}: CustomizableMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leaflet, setLeaflet] = useState<any>(null);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [uiCollapsed, setUiCollapsed] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<MapConfig>({
    mapProvider: "cartodb_dark",
    zoom: 11,
    showZoomControl: true,
    collapsibleUI: true,
    markerSize: 32,
    colorScheme: "default",
    categoryField: "type",
    pingSizeField: "ping_intensity", // Default field for ping size
    pingSpeedField: "activity_level", // Fixed: was "Battery Level"
    ...config,
  });

  // Load Leaflet
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        setLeaflet(L);
      } catch (error) {
        console.error("Failed to load Leaflet:", error);
        setIsLoading(false);
      }
    };
    loadLeaflet();
  }, []);

  data = data || sampleData;

  const getPointColor = (point: DataPoint) => {
    const schemeName = currentConfig.colorScheme || "default";
    const scheme = colorSchemes[schemeName];

    const statusKey = point.status?.toLowerCase?.() || "unknown";

    // First try to use color from the scheme
    if (scheme && scheme[statusKey as keyof typeof scheme]) {
      return scheme[statusKey as keyof typeof scheme];
    }

    // Fallback to semantic color mapping
    return getSemanticColor(statusKey);
  };

  const createPopupContent = (point: Record<string, any>) => {
    const colorField = currentConfig.colorField || "status";
    const statusValue = point[colorField] ?? "Unknown";
    const statusColor = getPointColor(point);

    const rows: string[] = [];

    for (const [key, value] of Object.entries(point)) {
      if (key === "name" || key === colorField) continue;
      if (value === null || value === undefined || value === "") continue;

      const label = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      let displayValue: string;

      // Handle various types
      if (typeof value === "boolean") {
        displayValue = value ? "Yes" : "No";
      } else if (typeof value === "number") {
        displayValue = value.toLocaleString();
      } else if (Array.isArray(value)) {
        displayValue = value.join(", ");
      } else if (typeof value === "object") {
        displayValue = JSON.stringify(value);
      } else {
        displayValue = value.toString();
      }

      rows.push(`
      <div style="margin-bottom: 6px;">
        <span style="color: #94a3b8;">${label}:</span>
        <span style="font-weight: 500; margin-left: 8px;">${displayValue}</span>
      </div>
    `);
    }

    // Optional: location field
    const location =
      point.latitude && point.longitude
        ? `
      <div style="margin-bottom: 6px;">
        <span style="color: #94a3b8;">Location:</span>
        <span style="font-weight: 500; margin-left: 8px;">${point.latitude.toFixed(
          4
        )}, ${point.longitude.toFixed(4)}</span>
      </div>
    `
        : "";

    return `
    <div style="color: white; font-family: system-ui, sans-serif; min-width: 200px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);">
        <div style="font-weight: 600; font-size: 16px;">${
          point.name || "Unknown"
        }</div>
        <div style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase;">
          ${statusValue}
        </div>
      </div>
      <div style="font-size: 13px; line-height: 1.5;">
        ${location}
        ${rows.join("")}
      </div>
    </div>
  `;
  };

  // Initialize and update map
  useEffect(() => {
    if (!leaflet || !mapRef.current) return;

    const L = leaflet.default || leaflet;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: currentConfig.showZoomControl,
        dragging: true,
        scrollWheelZoom: true,
      });

      // Add custom styles once
      const style = document.createElement("style");
      style.innerHTML = `
        .custom-marker-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
          position: relative;
        }
        .custom-marker-icon:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        
        /* Pinging effect styles */
        .ping-container {
          position: absolute;
          top: 50%;
          left: 50%;
          pointer-events: none;
        }
        
        .ping-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid;
          opacity: 0;
          transform: translate(-50%, -50%);
          animation: ping-animation 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        @keyframes ping-animation {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
          }
          75%, 100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
        
        .custom-popup {
          background-color: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(100, 116, 139, 0.5);
          border-radius: 12px;
          color: white;
          font-family: system-ui, sans-serif;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background-color: transparent;
          border: none;
          box-shadow: none;
          border-radius: 12px;
          padding: 16px;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
          color: white;
        }
        .custom-popup .leaflet-popup-tip {
          background-color: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(100, 116, 139, 0.5);
        }
        .custom-popup a.leaflet-popup-close-button {
          color: rgba(255, 255, 255, 0.7);
          font-size: 18px;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .custom-popup a.leaflet-popup-close-button:hover {
          color: white;
          background-color: rgba(255, 255, 255, 0.1);
        }
      `;
      document.head.appendChild(style);
    }

    // Set view on map center and zoom
    mapInstance.current.setView(
      [currentConfig.center?.lat || 7.15, currentConfig.center?.lng || 79.95],
      currentConfig.zoom || 11
    );

    // Remove existing tile layers
    mapInstance.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapInstance.current.removeLayer(layer);
      }
    });

    const provider = mapProviders[currentConfig.mapProvider || "openstreetmap"];
    const tileOptions: any = {
      attribution: provider.attribution,
      maxZoom: 19,
    };

    if (provider.url.includes("{s}")) {
      tileOptions.subdomains = "abcd";
    }

    L.tileLayer(provider.url, tileOptions).addTo(mapInstance.current);

    // Remove existing markers
    mapInstance.current.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        mapInstance.current.removeLayer(layer);
      }
    });

    // Get unique categories and assign icons using improved algorithm
    const categoryField = currentConfig.categoryField;
    const uniqueCategories = Array.from(
      new Set(data.map((p) => p[categoryField] || "marker"))
    );

    // Available Lucide icons that work with the CDN
    const availableIcons = [
      "map-pin",
      "car",
      "bike",
      "truck",
      "bus",
      "battery",
      "battery-low",
      "battery-full",
      "zap",
      "plug",
      "check-circle",
      "alert-triangle",
      "alert-circle",
      "x-circle",
      "alert-octagon",
      "navigation",
      "home",
      "building",
      "radio",
      "wrench",
      "settings",
      "wifi",
      "wifi-off",
      "info",
      "globe",
      "clock",
    ];

    const categoryToIconMap = assignIconsToCategories(
      uniqueCategories,
      availableIcons
    );

    // EFFICIENT NORMALIZATION: Calculate max values once for the entire dataset
    const pingSizeField = currentConfig.pingSizeField;
    const pingSpeedField = currentConfig.pingSpeedField;

    const pingSizeValues = data
      .map((p) => p[pingSizeField])
      .filter((v) => typeof v === "number") as number[];

    const pingSpeedValues = data
      .map((p) => p[pingSpeedField])
      .filter((v) => typeof v === "number") as number[];

    const maxPingSize = Math.max(...pingSizeValues, 1); // Use 1 as fallback to avoid division by 0
    const maxPingSpeed = Math.max(...pingSpeedValues, 1);

    // Efficient function that uses pre-calculated max values
    const getPingValues = (point: DataPoint) => {
      const pointPingSize =
        typeof point[pingSizeField] === "number" ? point[pingSizeField] : 0;
      const pointPingSpeed =
        typeof point[pingSpeedField] === "number" ? point[pingSpeedField] : 0;

      // Normalize by dividing by the maximum (0-1 range)
      const normalizedPingSize = Math.max(
        0,
        Math.min(1, pointPingSize / maxPingSize)
      );
      const normalizedPingSpeed = Math.max(
        0,
        Math.min(1, pointPingSpeed / maxPingSpeed)
      );

      return {
        size: normalizedPingSize,
        speed: normalizedPingSpeed,
        actualSize: pointPingSize,
        actualSpeed: pointPingSpeed,
      };
    };

    data.forEach((point) => {
      const color = getPointColor(point);
      const category = point[categoryField] || "unknown";
      const iconKey = categoryToIconMap[category] || "map-pin";
      const pingValues = getPingValues(point);

      // console.log("Ping values for", point.name, pingValues);

      // Smart rotation based on category type
      let rotation = 0;
      if (category === "scooter" || iconKey === "bike") rotation = 25;
      else if (category === "vehicle" || iconKey === "car") rotation = 90;
      else if (category === "truck") rotation = 90;

      // Base marker size (can be dynamic or default)
      const baseSize = currentConfig.markerSize || 32;

      // 🔧 Size control
      // Adjust min/max multiplier to scale down pings visually
      const minPingMultiplier = 0.4; // Previously 1.5
      const maxPingMultiplier = 2.0; // Previously 4.0

      // Clamp and ease the size value
      const rawSize = Math.max(0, Math.min(1, pingValues.size));
      const pingMultiplier =
        minPingMultiplier + rawSize * (maxPingMultiplier - minPingMultiplier);
      const calculatedPingSize = baseSize * pingMultiplier;

      // 🔧 Speed control
      // Clamp and ease the speed to avoid too-fast animations
      const rawSpeed = Math.max(0, Math.min(1, pingValues.speed));
      const adjustedSpeed = Math.pow(rawSpeed, 2); // Slower on high values

      // Animation duration range (tweaked to be visually better)
      const minDuration = 1.5; // Slower max speed
      const maxDuration = 5.0; // Slower min speed

      const animationDuration =
        maxDuration - adjustedSpeed * (maxDuration - minDuration);

      // 🔁 Build ping rings
      const pingRings = `
  <div class="ping-container">
    <div class="ping-ring" style="
      width: ${calculatedPingSize}px;
      height: ${calculatedPingSize}px;
      border-color: ${color};
      animation-duration: ${animationDuration}s;
    "></div>
    <div class="ping-ring" style="
      width: ${calculatedPingSize}px;
      height: ${calculatedPingSize}px;
      border-color: ${color};
      animation-duration: ${animationDuration}s;
      animation-delay: ${animationDuration * 0.33}s;
    "></div>
    <div class="ping-ring" style="
      width: ${calculatedPingSize}px;
      height: ${calculatedPingSize}px;
      border-color: ${color};
      animation-duration: ${animationDuration}s;
      animation-delay: ${animationDuration * 0.66}s;
    "></div>
  </div>
`;

      const iconHtml = `
        <div
          class="custom-marker-icon"
          style="
            width: ${baseSize}px;
            height: ${baseSize}px;
            background-color: ${color};
            transform: rotate(${rotation}deg);
            position: relative;
            z-index: 1000;
          "
        >
          <div style="
            width: 60%;
            height: 60%;
            background-image: url('https://cdn.jsdelivr.net/npm/lucide-static@0.408.0/icons/${iconKey}.svg');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            filter: invert(1);
            transform: rotate(${-rotation}deg);
            position: absolute;
            top: 50%;
            left: 50%;
            margin-top: -${baseSize * 0.3}px;
            margin-left: -${baseSize * 0.3}px;
          "></div>
        </div>
        ${pingRings}
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: [baseSize, baseSize],
        iconAnchor: [baseSize / 2, baseSize / 2],
      });

      const marker = L.marker([point.latitude, point.longitude], { icon })
        .addTo(mapInstance.current)
        .on("click", () => {
          setSelectedPoint(point.id);
          if (onDataPointClick) onDataPointClick(point);
        });

      marker.bindPopup(createPopupContent(point), {
        className: "custom-popup",
        closeButton: true,
      });
    });

    setIsLoading(false);
  }, [leaflet, data, currentConfig, onDataPointClick]);

  // Update configuration
  const updateConfig = (newConfig: Partial<MapConfig>) => {
    const updatedConfig = { ...currentConfig, ...newConfig };
    setCurrentConfig(updatedConfig);
    onConfigChange?.(updatedConfig);
  };

  return (
    <div
      className={`h-full w-full relative bg-slate-900/50 rounded-lg overflow-hidden ${className}`}
    >
      {/* Map Provider Badge */}
      <div className="absolute top-2 left-2 z-[999]">
        <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs font-medium">
          {mapProviders[currentConfig.mapProvider]?.name} (Z:{" "}
          {currentConfig.zoom})
        </div>
      </div>

      {/* Settings Toggle Button */}
      <div className="absolute top-2 right-2 z-[999]">
        <button
          onClick={() => setUiCollapsed(!uiCollapsed)}
          className="bg-slate-800/90 hover:bg-slate-800/95 backdrop-blur-sm border border-slate-700 text-slate-300 hover:text-white rounded-lg p-2 transition-all duration-200"
        >
          {uiCollapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Collapsible UI Panel */}
      {!uiCollapsed && currentConfig.collapsibleUI && (
        <div className="absolute top-12 right-2 space-y-3 z-[998] max-w-xs">
          {/* Quick Config Panel */}
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
            <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Quick Settings
            </div>

            <div className="space-y-3">
              {/* Map Provider */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Map Style
                </label>
                <select
                  value={currentConfig.mapProvider}
                  onChange={(e) =>
                    updateConfig({ mapProvider: e.target.value })
                  }
                  className="w-full text-xs bg-slate-800 border border-slate-600 text-white rounded px-2 py-1 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="openstreetmap">OpenStreetMap</option>
                  <option value="cartodb_light">Light</option>
                  <option value="cartodb_dark">Dark</option>
                  <option value="satellite">Satellite</option>
                </select>
              </div>

              {/* Color Scheme */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Color Scheme
                </label>
                <select
                  value={currentConfig.colorScheme}
                  onChange={(e) =>
                    updateConfig({ colorScheme: e.target.value })
                  }
                  className="w-full text-xs bg-slate-800 border border-slate-600 text-white rounded px-2 py-1 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="default">Default</option>
                  <option value="traffic">Traffic</option>
                  <option value="battery">Battery</option>
                  <option value="performance">Performance</option>
                </select>
              </div>

              {/* Marker Size */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Marker Size
                </label>
                <input
                  type="range"
                  min="20"
                  max="50"
                  value={currentConfig.markerSize}
                  onChange={(e) =>
                    updateConfig({ markerSize: parseInt(e.target.value) })
                  }
                  className="w-full accent-cyan-400"
                />
                <div className="text-xs text-slate-400 text-center mt-1">
                  {currentConfig.markerSize}px
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="h-full w-full relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-[1001]">
            <div className="flex flex-col items-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm">Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="h-full w-full" />
      </div>

      {/* No Data State */}
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-[1002]">
          <div className="text-center text-gray-500 p-6">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div className="text-lg font-medium mb-2">No Data Available</div>
            <div className="text-sm">Add data points to display on the map</div>
          </div>
        </div>
      )}
    </div>
  );
}
