import React, { useState, useRef, useEffect } from "react";
import { MapPin, Menu, X, Loader2 } from "lucide-react";

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

// Color palettes for distinct value assignment
const colorPalettes = {
  default: [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#06B6D4",
    "#EC4899",
    "#84CC16",
    "#F97316",
    "#6366F1",
    "#14B8A6",
    "#F43F5E",
    "#22C55E",
    "#A855F7",
    "#0EA5E9",
    "#EAB308",
    "#DC2626",
    "#059669",
    "#7C3AED",
    "#0891B2",
  ],
  traffic: [
    "#22C55E",
    "#EAB308",
    "#DC2626",
    "#64748B",
    "#06B6D4",
    "#8B5CF6",
    "#EC4899",
    "#F97316",
    "#6366F1",
    "#14B8A6",
    "#F43F5E",
    "#84CC16",
    "#A855F7",
    "#0EA5E9",
    "#F59E0B",
    "#10B981",
    "#EF4444",
    "#3B82F6",
    "#7C3AED",
    "#0891B2",
  ],
  battery: [
    "#06D6A0",
    "#FFD23F",
    "#EE6C4D",
    "#8E8E93",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#84CC16",
    "#F97316",
    "#6366F1",
    "#14B8A6",
    "#F43F5E",
    "#22C55E",
    "#A855F7",
    "#0EA5E9",
    "#EAB308",
    "#DC2626",
    "#059669",
    "#7C3AED",
    "#0891B2",
  ],
  performance: [
    "#3B82F6",
    "#F97316",
    "#E11D48",
    "#71717A",
    "#10B981",
    "#8B5CF6",
    "#06B6D4",
    "#EC4899",
    "#84CC16",
    "#6366F1",
    "#14B8A6",
    "#F43F5E",
    "#22C55E",
    "#A855F7",
    "#0EA5E9",
    "#EAB308",
    "#DC2626",
    "#059669",
    "#7C3AED",
    "#0891B2",
  ],
};

// Simplified map configuration interface
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

  // Field mappings
  latitudeField?: string;
  longitudeField?: string;
  nameField?: string;

  // Color configuration - passed from parent
  colorField?: string;
  colorScheme?: "default" | "traffic" | "battery" | "performance";
}

// Data point interface
interface DataPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
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

interface CustomizableMapProps {
  data?: DataPoint[];
  config?: MapConfig;
  onDataPointClick?: (point: DataPoint) => void;
  className?: string;
}

export default function CustomizableMap({
  data = [],
  config = {},
  onDataPointClick,
  className = "",
}: CustomizableMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leaflet, setLeaflet] = useState<any>(null);
  const [colorMapping, setColorMapping] = useState<Record<string, string>>({});

  // Define default config
  const defaultConfig = {
    mapProvider: "cartodb_dark" as const,
    zoom: 8,
    latitudeField: "latitude",
    longitudeField: "longitude",
    colorScheme: "default" as const,
    colorField: "none",
  };

  // Merge with provided config
  const finalConfig = { ...defaultConfig, ...config };

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

  // Create color mapping for distinct values
  useEffect(() => {
    if (
      !data.length ||
      !finalConfig.colorField ||
      finalConfig.colorField === "none"
    ) {
      setColorMapping({});
      return;
    }

    // Get all unique values from the color field
    const uniqueValues = Array.from(
      new Set(
        data
          .map((point) => point[finalConfig.colorField!])
          .filter(
            (value) => value !== null && value !== undefined && value !== ""
          )
      )
    ).sort(); // Sort for consistent ordering

    // Get the color palette for the selected scheme
    const palette = colorPalettes[finalConfig.colorScheme || "default"];

    // Create mapping of unique values to colors
    const newColorMapping: Record<string, string> = {};
    uniqueValues.forEach((value, index) => {
      newColorMapping[String(value)] = palette[index % palette.length];
    });

    setColorMapping(newColorMapping);
  }, [data, finalConfig.colorField, finalConfig.colorScheme]);

  const getPointColor = (point: DataPoint) => {
    // If no color field is selected, use default color
    if (!finalConfig.colorField || finalConfig.colorField === "none") {
      return colorPalettes[finalConfig.colorScheme || "default"][0];
    }

    const colorValue = point[finalConfig.colorField];

    // Handle null/undefined/empty values
    if (colorValue === null || colorValue === undefined || colorValue === "") {
      return "#6B7280"; // Gray for missing values
    }

    // Return the mapped color for this value
    return colorMapping[String(colorValue)] || "#6B7280";
  };

  const createPopupContent = (point: Record<string, any>) => {
    const colorField = finalConfig.colorField;
    const statusValue =
      colorField && colorField !== "none" && point[colorField]
        ? point[colorField]
        : null;
    const statusColor = getPointColor(point);

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
          statusValue
            ? `<div style="
    background: ${statusColor}; 
    color: white; 
    padding: 2px 8px; 
    border-radius: 12px; 
    font-size: 10px; 
    font-weight: 600; 
    text-transform: uppercase;
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
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
      });

      // Add custom styles once
      const style = document.createElement("style");
      style.innerHTML = `
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
      [finalConfig.center?.lat || 7.8731, finalConfig.center?.lng || 80.7718],
      finalConfig.zoom || 8
    );

    // Remove existing tile layers
    mapInstance.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapInstance.current.removeLayer(layer);
      }
    });

    const provider = mapProviders[finalConfig.mapProvider || "cartodb_dark"];
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

    // Create markers - using simple 8px dots for all markers
    // Helper: Convert HEX to RGBA with given alpha
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    data.forEach((point) => {
      const color = getPointColor(point);

      // Transparent color for overlapping visibility
      const transparentColor = hexToRgba(color, 0.1); // 10% opacity

      const baseSize = 8;

      const iconHtml = `
    <div
      class="simple-marker"
      style="
        width: ${baseSize}px;
        height: ${baseSize}px;
        background-color: ${transparentColor};
        border: 1px solid ${color}; /* Outline to keep it visible */
      "
    ></div>
  `;

      const icon = L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: [baseSize, baseSize],
        iconAnchor: [baseSize / 2, baseSize / 2],
      });

      const marker = L.marker([point.latitude, point.longitude], {
        icon,
        zIndexOffset: point.density ? point.density : 0, // Optional: higher density on top
      })
        .addTo(mapInstance.current)
        .on("click", () => {
          if (onDataPointClick) onDataPointClick(point);
        });

      marker.bindPopup(createPopupContent(point), {
        className: "custom-popup",
        closeButton: true,
      });
    });

    setIsLoading(false);
  }, [leaflet, data, finalConfig, onDataPointClick, colorMapping]);

  // Get unique values count for display
  const getUniqueValuesInfo = () => {
    if (!finalConfig.colorField || finalConfig.colorField === "none") {
      return "Default";
    }

    const uniqueCount = Object.keys(colorMapping).length;
    return `${finalConfig.colorField} (${uniqueCount} values)`;
  };

  return (
    <div
      className={`h-full w-full relative bg-slate-900/50 rounded-lg overflow-hidden ${className}`}
    >
      {/* Map Provider Badge */}
      <div className="absolute top-3 left-3 z-[999]">
        <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs font-medium">
          {mapProviders[finalConfig.mapProvider || "cartodb_dark"]?.name} |
          {data.length} points | Color: {getUniqueValuesInfo()}
        </div>
      </div>

      {/* Color Legend - Show when color field is selected */}
      {finalConfig.colorField &&
        finalConfig.colorField !== "none" &&
        Object.keys(colorMapping).length > 0 && (
          <div className="absolute top-3 right-3 z-[999] max-w-xs">
            <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 p-3 rounded-md text-xs">
              <div className="font-medium mb-2 text-cyan-400">
                {finalConfig.colorField
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                {Object.entries(colorMapping).map(([value, color]) => (
                  <div key={value} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{value}</span>
                  </div>
                ))}
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
