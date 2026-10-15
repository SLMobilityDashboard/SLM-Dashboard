import React, { useState, useRef, useEffect } from "react";
import { MapPin, Menu, X, Loader2, Settings } from "lucide-react";

// Utility functions (inline for this example)
const assignIconsToCategories = (
  categories: string[],
  availableIcons: string[]
) => {
  const iconMap: Record<string, string> = {};
  categories.forEach((category, index) => {
    iconMap[category] = availableIcons[index % availableIcons.length];
  });
  return iconMap;
};

const getSemanticColor = (status: string) => {
  const statusColors: Record<string, string> = {
    active: "#10B981",
    inactive: "#6B7280",
    warning: "#F59E0B",
    danger: "#EF4444",
    safe: "#10B981",
    error: "#EF4444",
    success: "#10B981",
    info: "#3B82F6",
    unknown: "#6B7280",
  };
  return statusColors[status] || "#6B7280";
};

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
  markerOpacity?: number;

  // Pinging effect fields
  pingSizeField?: string;
  pingSpeedField?: string;

  // Styling
  markerSize?: number;
  colorScheme?: "default" | "traffic" | "battery" | "performance";

  // Legend settings
  showLegend?: boolean;

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
  type?: "station" | "scooter" | "vehicle" | "point";
  status?: "active" | "inactive" | "safe" | "warning" | "danger";
  [key: string]: any;
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

interface CustomizableMapProps {
  data?: DataPoint[];
  config?: MapConfig;
  onDataPointClick?: (point: DataPoint) => void;
  onConfigChange?: (config: MapConfig) => void;
  className?: string;
}

export default function CustomizableMap({
  data = [],
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

  // Define default config
  const defaultConfig = {
    mapProvider: "cartodb_dark" as const,
    zoom: 19,
    showZoomControl: true,
    collapsibleUI: true,
    markerSize: 32, // This is for large markers only
    colorScheme: "default" as const,
    latitudeField: "latitude",
    longitudeField: "longitude",
    markerOpacity: 1,
    showLegend: false,
  };

  // Internal state for configuration to ensure quick settings work
  const [internalConfig, setInternalConfig] = useState<MapConfig>({
    ...defaultConfig,
    ...config,
  });

  // Update internal config when parent config changes
  useEffect(() => {
    setInternalConfig({ ...defaultConfig, ...config });
  }, [config]);

  // Determine if we should use larger markers (when pinging or icons are enabled)
  const shouldUseLargeMarkers = !!(
    (internalConfig.pingSizeField && internalConfig.pingSizeField !== "none") ||
    (internalConfig.pingSpeedField &&
      internalConfig.pingSpeedField !== "none") ||
    (internalConfig.categoryField && internalConfig.categoryField !== "none")
  );

  // Get effective marker size - FIXED: Always return small size for simple markers
  const getEffectiveMarkerSize = () => {
    if (shouldUseLargeMarkers) {
      return internalConfig.markerSize || 32;
    }
    return 8; // Small dot for simple markers - reduced from 10 to 8
  };

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

  const getPointColor = (point: DataPoint) => {
    const schemeName = internalConfig.colorScheme || "default";
    const scheme = colorSchemes[schemeName];

    if (internalConfig.colorField && point[internalConfig.colorField]) {
      if (internalConfig.colorField === "none") {
        return scheme.active || "#10B981"; // Default color if no field specified
      }
      const colorValue = point[internalConfig.colorField];
      const statusKey = colorValue?.toString().toLowerCase() || "unknown";

      if (scheme && scheme[statusKey as keyof typeof scheme]) {
        return scheme[statusKey as keyof typeof scheme];
      }

      return getSemanticColor(statusKey);
    }

    return scheme.active || "#10B981";
  };

  const createPopupContent = (point: Record<string, any>) => {
    const colorField = internalConfig.colorField;
    const statusValue =
      colorField && point[colorField] ? point[colorField] : "Active";
    const statusColor = getPointColor(point);
    const opacityValue = internalConfig.markerOpacity || 1;

    const rows: string[] = [];

    for (const [key, value] of Object.entries(point)) {
      if (
        key === "name" ||
        key === "latitude" ||
        key === "longitude" ||
        key === "id"
      )
        continue;
      if (colorField && key === colorField) continue;
      if (value === null || value === undefined || value === "") continue;

      const label = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      let displayValue: string;

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

    const location = `
      <div style="margin-bottom: 6px;">
        <span style="color: #94a3b8;">Location:</span>
        <span style="font-weight: 500; margin-left: 8px;">${point.latitude.toFixed(
          4
        )}, ${point.longitude.toFixed(4)}</span>
      </div>
    `;

    return `
    <div style="color: white; font-family: system-ui, sans-serif; min-width: 200px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);">
        <div style="font-weight: 600; font-size: 16px;">${
          point.name || "Data Point"
        }</div>
        ${
          colorField
            ? `<div style="
    background: ${statusColor}; 
    color: white; 
    padding: 2px 8px; 
    border-radius: 12px; 
    font-size: 10px; 
    font-weight: 600; 
    text-transform: uppercase;
    opacity: ${opacityValue};
  ">
    ${statusValue}
  </div>`
            : ""
        }
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
        zoomControl: internalConfig.showZoomControl,
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
        
        .simple-marker {
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .simple-marker:hover {
          transform: scale(1.3);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          border-color: rgba(255, 255, 255, 0.9);
        }
        
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
      [internalConfig.center?.lat || 7.15, internalConfig.center?.lng || 79.95],
      internalConfig.zoom || 11
    );

    // Remove existing tile layers
    mapInstance.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapInstance.current.removeLayer(layer);
      }
    });

    const provider =
      mapProviders[internalConfig.mapProvider || "openstreetmap"];
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

    if (data.length === 0) {
      setIsLoading(false);
      return;
    }

    // Get unique categories for icons
    const categoryField = internalConfig.categoryField;
    let categoryToIconMap: Record<string, string> = {};

    if (
      categoryField &&
      categoryField !== "none" &&
      categoryField.trim() !== ""
    ) {
      const uniqueCategories = Array.from(
        new Set(data.map((p) => p[categoryField] || "default"))
      );

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

      categoryToIconMap = assignIconsToCategories(
        uniqueCategories,
        availableIcons
      );
    }

    // Calculate ping normalization values
    let maxPingSize = 1;
    let maxPingSpeed = 1;

    if (
      internalConfig.pingSizeField &&
      internalConfig.pingSizeField !== "none"
    ) {
      const pingSizeValues = data
        .map((p) => p[internalConfig.pingSizeField!])
        .filter((v) => typeof v === "number") as number[];
      if (pingSizeValues.length > 0) {
        maxPingSize = Math.max(...pingSizeValues, 1);
      }
    }

    if (
      internalConfig.pingSpeedField &&
      internalConfig.pingSpeedField !== "none"
    ) {
      const pingSpeedValues = data
        .map((p) => p[internalConfig.pingSpeedField!])
        .filter((v) => typeof v === "number") as number[];
      if (pingSpeedValues.length > 0) {
        maxPingSpeed = Math.max(...pingSpeedValues, 1);
      }
    }

    const getPingValues = (point: DataPoint) => {
      let normalizedPingSize = 0;
      let normalizedPingSpeed = 0;

      const hasPingSize =
        internalConfig.pingSizeField &&
        internalConfig.pingSizeField !== "none" &&
        typeof point[internalConfig.pingSizeField] === "number";
      const hasPingSpeed =
        internalConfig.pingSpeedField &&
        internalConfig.pingSpeedField !== "none" &&
        typeof point[internalConfig.pingSpeedField] === "number";

      if (hasPingSize) {
        normalizedPingSize = Math.max(
          0,
          Math.min(1, point[internalConfig.pingSizeField!] / maxPingSize)
        );
      } else if (hasPingSpeed) {
        // Default size if ping speed is present but size is not
        normalizedPingSize = 0.6;
      } else {
        normalizedPingSize = 0; // No pinging
      }

      if (hasPingSpeed) {
        normalizedPingSpeed = Math.max(
          0,
          Math.min(1, point[internalConfig.pingSpeedField!] / maxPingSpeed)
        );
      }

      return {
        size: normalizedPingSize,
        speed: normalizedPingSpeed,
      };
    };

    data.forEach((point) => {
      const color = getPointColor(point);
      const category =
        categoryField && categoryField !== "none"
          ? point[categoryField]
          : "default";
      const iconKey = categoryToIconMap[category] || "map-pin";
      const pingValues = getPingValues(point);

      let rotation = 0;
      if (category === "scooter" || iconKey === "bike") rotation = 25;
      else if (category === "vehicle" || iconKey === "car") rotation = 90;
      else if (category === "truck") rotation = 90;

      const baseSize = getEffectiveMarkerSize();
      const opacity = internalConfig.markerOpacity || 1;

      // For simple markers (no pinging/icons), use a simple dot
      if (!shouldUseLargeMarkers) {
        console.log("Creating simple marker with size:", baseSize);

        const iconHtml = `
          <div
            class="simple-marker"
            style="
              width: ${baseSize}px;
              height: ${baseSize}px;
              background-color: ${color};
              opacity: ${opacity};
            "
          ></div>
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
        return;
      }

      // Complex markers with pinging and icons
      console.log("Creating complex marker with size:", baseSize);

      let calculatedPingSize = baseSize;
      let animationDuration = 3;

      if (
        (internalConfig.pingSizeField &&
          internalConfig.pingSizeField !== "none") ||
        (internalConfig.pingSpeedField &&
          internalConfig.pingSpeedField !== "none")
      ) {
        const minPingMultiplier = 0.4;
        const maxPingMultiplier = 2.0;
        const pingMultiplier =
          minPingMultiplier +
          pingValues.size * (maxPingMultiplier - minPingMultiplier);
        calculatedPingSize = baseSize * pingMultiplier;

        const rawSpeed = Math.max(0, Math.min(1, pingValues.speed));
        const adjustedSpeed = Math.pow(rawSpeed, 2);
        const minDuration = 1.5;
        const maxDuration = 5.0;
        animationDuration =
          maxDuration - adjustedSpeed * (maxDuration - minDuration);
      }

      const pingRings =
        (internalConfig.pingSizeField &&
          internalConfig.pingSizeField !== "none") ||
        (internalConfig.pingSpeedField &&
          internalConfig.pingSpeedField !== "none")
          ? `
        <div class="ping-container">
          <div class="ping-ring" style="
            width: ${calculatedPingSize}px;
            height: ${calculatedPingSize}px;
            border-color: ${color};
            animation-duration: ${animationDuration}s;
            opacity: ${opacity * 0.8};
          "></div>
          <div class="ping-ring" style="
            width: ${calculatedPingSize}px;
            height: ${calculatedPingSize}px;
            border-color: ${color};
            animation-duration: ${animationDuration}s;
            animation-delay: ${animationDuration * 0.33}s;
            opacity: ${opacity * 0.8};
          "></div>
          <div class="ping-ring" style="
            width: ${calculatedPingSize}px;
            height: ${calculatedPingSize}px;
            border-color: ${color};
            animation-duration: ${animationDuration}s;
            animation-delay: ${animationDuration * 0.66}s;
            opacity: ${opacity * 0.8};
          "></div>
        </div>
      `
          : "";

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
            opacity: ${opacity};
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
  }, [leaflet, data, internalConfig, onDataPointClick, shouldUseLargeMarkers]);

  // Update configuration
  const updateConfig = (newConfig: Partial<MapConfig>) => {
    const updatedConfig = { ...internalConfig, ...newConfig };
    setInternalConfig(updatedConfig);
    onConfigChange?.(updatedConfig);
  };

  return (
    <div
      className={`h-full w-full relative bg-slate-900/50 rounded-lg overflow-hidden ${className}`}
    >
      {/* Map Provider Badge */}
      <div className="absolute top-3 left-12 z-[999]">
        <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs font-medium">
          {mapProviders[internalConfig.mapProvider || "openstreetmap"]?.name}{" "}
          (Z: {internalConfig.zoom}) |
          {shouldUseLargeMarkers
            ? ` Large (${getEffectiveMarkerSize()}px)`
            : ` Small (${getEffectiveMarkerSize()}px)`}
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
      {!uiCollapsed && internalConfig.collapsibleUI && (
        <div className="absolute top-12 right-2 space-y-3 z-[998] max-w-xs">
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
                  value={internalConfig.mapProvider}
                  onChange={(e) =>
                    updateConfig({ mapProvider: e.target.value as any })
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
                  value={internalConfig.colorScheme}
                  onChange={(e) =>
                    updateConfig({ colorScheme: e.target.value as any })
                  }
                  className="w-full text-xs bg-slate-800 border border-slate-600 text-white rounded px-2 py-1 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="default">Default</option>
                  <option value="traffic">Traffic</option>
                  <option value="battery">Battery</option>
                  <option value="performance">Performance</option>
                </select>
              </div>

              {/* Marker Size - only show if using large markers */}
              {shouldUseLargeMarkers && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Marker Size
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="50"
                    value={internalConfig.markerSize || 32}
                    onChange={(e) =>
                      updateConfig({ markerSize: parseInt(e.target.value) })
                    }
                    className="w-full accent-cyan-400"
                  />
                  <div className="text-xs text-slate-400 text-center mt-1">
                    {internalConfig.markerSize || 32}px
                  </div>
                </div>
              )}

              {/* Info about marker size */}
              <div className="text-xs text-slate-400 bg-slate-700/50 rounded p-2">
                {shouldUseLargeMarkers
                  ? "Large markers with icons/pinging active"
                  : "Small dot markers (8px)"}
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
      {data.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-[1002]">
          <div className="text-center text-slate-400 p-6">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div className="text-lg font-medium mb-2">No Data Available</div>
            <div className="text-sm">Add data points to display on the map</div>
          </div>
        </div>
      )}
    </div>
  );
}
