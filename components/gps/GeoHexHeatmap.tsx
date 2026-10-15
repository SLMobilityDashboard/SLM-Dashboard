import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Layers,
  Menu,
  X,
  MapPin,
  Loader2,
  Settings,
  Activity,
  BarChart3,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

// d3 color scale imports
import { scaleSequential } from "d3-scale";
import {
  interpolateYlOrRd,
  interpolateViridis,
  interpolatePlasma,
  interpolateTurbo,
  interpolateCividis,
} from "d3-scale-chromatic";

// Import your aggregation library
import {
  aggregateByRegion,
  makeLegendLabel,
  AggregationKey,
  getRegionNameFromFeature,
} from "@/lib/geo-aggregation";

/* =========================
   Types
========================= */
interface DataPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: string;
  area?: string;
  district?: string;
  province?: string;
  region?: string;
  // Individual station fields
  utilization_rate?: number;
  ping_speed?: number;
  status?: string;
  battery_count?: number;
  daily_swaps?: number;
  revenue?: number;
  // Aggregated data fields
  point_count?: number;
  avg_utilization?: number;
  total_revenue?: number;
  max_utilization?: number;
  min_utilization?: number;
  unique_stations?: number;
  // Metric for choropleth coloring
  metric_value?: number;
  [key: string]: any;
}

type SelectByKey = "area" | "district" | "province";
type PaletteKey = "YlOrRd" | "Viridis" | "Plasma" | "Turbo" | "Cividis";

interface ChoroplethProps {
  data?: DataPoint[];
  geojsonData?: any;
  config?: {
    opacity?: number;
    showPoints?: boolean;
    showBorders?: boolean;
    Aggregation?: AggregationKey;
    AggregationField?: string;
    selectBy?: SelectByKey;
    regionProperty?: string;
    mapProvider?:
      | "openstreetmap"
      | "cartodb_dark"
      | "cartodb_light"
      | "satellite";
    palette?: PaletteKey;
    // New config for data mode
    dataMode?: "aggregated" | "individual" | "auto";
  };
  className?: string;
  onRegionClick?: (region: any, data: DataPoint[]) => void;
  onDataPointClick?: (point: DataPoint) => void;
}

/* =========================
   Palettes
========================= */
const PALETTES: Record<
  PaletteKey,
  { label: string; interpolator: (t: number) => string; stops?: number[] }
> = {
  YlOrRd: { label: "YlOrRd (Heatmap)", interpolator: interpolateYlOrRd },
  Viridis: { label: "Viridis", interpolator: interpolateViridis },
  Plasma: { label: "Plasma", interpolator: interpolatePlasma },
  Turbo: { label: "Turbo", interpolator: interpolateTurbo },
  Cividis: { label: "Cividis", interpolator: interpolateCividis },
};

function cssGradientFromInterpolator(
  interpolator: (t: number) => string,
  stops: number[] = [0, 0.25, 0.5, 0.75, 1]
) {
  const segments = stops
    .map((s) => `${interpolator(s)} ${s * 100}%`)
    .join(", ");
  return `linear-gradient(to right, ${segments})`;
}

/* =========================
   Enhanced Loading Component
========================= */
const EnhancedLoader: React.FC<{
  phase: "leaflet" | "geojson" | "rendering" | "parent" | "transitioning";
  progress?: number;
}> = ({ phase, progress }) => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const phaseMessages = {
    leaflet: "Initializing map engine",
    geojson: "Loading geographic boundaries",
    rendering: "Rendering choropleth layers",
    parent: "Processing data updates",
    transitioning: "Applying configuration changes",
  };

  const phaseIcons = {
    leaflet: <Activity className="h-6 w-6" />,
    geojson: <MapPin className="h-6 w-6" />,
    rendering: <Layers className="h-6 w-6" />,
    parent: <Settings className="h-6 w-6" />,
    transitioning: <Settings className="h-6 w-6" />,
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
          {phase === "leaflet" &&
            "Setting up interactive map components and controls"}
          {phase === "geojson" &&
            "Fetching and parsing geographic boundary data"}
          {phase === "rendering" &&
            "Calculating colors and drawing map regions"}
          {phase === "parent" && "Synchronizing with updated configuration"}
          {phase === "transitioning" && "Smoothly applying visual changes"}
        </div>
      </div>
    </div>
  );
};

/* =========================
   Main Component
========================= */
const GeoChoroplethMap: React.FC<ChoroplethProps> = ({
  data,
  geojsonData,
  config = {},
  className = "",
  onRegionClick,
  onDataPointClick,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const baseTileLayer = useRef<any>(null);
  const geoJsonLayer = useRef<any>(null);
  const pointsLayer = useRef<any[]>([]);
  const markersClusterGroup = useRef<any>(null);
  const [leaflet, setLeaflet] = useState<any>(null);

  // Loading phases
  const [isLeafletLoading, setIsLeafletLoading] = useState(true);
  const [isFetchingGeoJSON, setIsFetchingGeoJSON] = useState(false);
  const [isRenderingLayer, setIsRenderingLayer] = useState(false);
  const [isParentLoading, setIsParentLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // UI & hover
  const [uiCollapsed, setUiCollapsed] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<{
    name: string | undefined;
    info: { count: number; stations: DataPoint[]; metric: number };
  } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  // Fixed opacity state management
  const [localOpacity, setLocalOpacity] = useState(() => config.opacity ?? 0.7);

  // GeoJSON
  const [geoData, setGeoData] = useState<any>(null);

  // Extract config values
  const effectiveOpacity =
    config.opacity !== undefined ? config.opacity : localOpacity;
  const parentShowPoints = config.showPoints ?? false;
  const parentShowBorders = config.showBorders ?? true;
  const parentSelectBy: SelectByKey = config.selectBy ?? "province";
  const parentAggregation: AggregationKey = config.Aggregation ?? "count";
  const parentAggregationField = config.AggregationField ?? "";
  const dataMode = config.dataMode ?? "auto";

  // Determine data mode automatically
  const detectedDataMode = useMemo(() => {
    if (dataMode !== "auto") return dataMode;

    if (!data || data.length === 0) return "aggregated";

    // Check if data has aggregated fields
    const hasAggregatedFields = data.some(
      (point) =>
        point.point_count !== undefined ||
        point.avg_utilization !== undefined ||
        point.total_revenue !== undefined
    );

    // Check if data has individual station fields
    const hasIndividualFields = data.some(
      (point) =>
        point.tboxid !== undefined ||
        point.status !== undefined ||
        (point.utilization_rate !== undefined &&
          point.point_count === undefined)
    );

    if (hasAggregatedFields && !hasIndividualFields) return "aggregated";
    if (hasIndividualFields && !hasAggregatedFields) return "individual";

    // Mixed or individual data by default
    return "individual";
  }, [data, dataMode]);

  const stations = useMemo(() => data || [], [data]);

  // Default region properties
  const defaultRegionPropByLevel: Record<SelectByKey, string> = {
    area: "ADM3_EN",
    district: "ADM2_EN",
    province: "ADM1_EN",
  };

  const computedDefaultRegionProp = defaultRegionPropByLevel[parentSelectBy];
  const [regionProperty, setRegionProperty] = useState<string>(
    config.regionProperty || computedDefaultRegionProp
  );

  const [mapProvider, setMapProvider] = useState<
    "openstreetmap" | "cartodb_dark" | "cartodb_light" | "satellite"
  >(config.mapProvider || "cartodb_dark");

  const [paletteKey, setPaletteKey] = useState<PaletteKey>(
    config.palette || "YlOrRd"
  );

  // Sync local opacity with config changes
  useEffect(() => {
    if (config.opacity !== undefined) {
      setLocalOpacity(config.opacity);
    }
  }, [config.opacity]);

  // Track mouse movement over the map
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const mapElement = mapRef.current;
    if (mapElement) {
      mapElement.addEventListener("mousemove", handleMouseMove);
      return () => {
        mapElement.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, []);

  // Parent changes → show loading
  useEffect(() => {
    setIsParentLoading(true);
  }, [
    data,
    config.selectBy,
    parentSelectBy,
    parentAggregation,
    parentAggregationField,
  ]);

  // Transition flag when selectBy changes
  const prevSelectBy = useRef<SelectByKey>(parentSelectBy);
  useEffect(() => {
    if (prevSelectBy.current !== parentSelectBy) {
      setIsTransitioning(true);
      prevSelectBy.current = parentSelectBy;
      setRegionProperty(
        config.regionProperty || defaultRegionPropByLevel[parentSelectBy]
      );
      const t = setTimeout(() => setIsTransitioning(false), 300);
      return () => clearTimeout(t);
    }
  }, [parentSelectBy, config.regionProperty]);

  /* =========================
     GeoJSON source per selectBy
  ========================= */
  const getGeoUrlForLevel = (level: SelectByKey) => {
    if (geojsonData) return null;
    if (level === "district") return "/srilanka_districts.geojson";
    if (level === "province") return "/srilanka_provinces.geojson";
    return "/srilanka.geojson";
  };

  // Load GeoJSON
  useEffect(() => {
    let abort = false;
    const loadGeoJSON = async () => {
      setIsFetchingGeoJSON(true);
      try {
        if (geojsonData) {
          if (!abort) setGeoData(geojsonData);
          return;
        }
        const url = getGeoUrlForLevel(parentSelectBy);
        if (!url) return;
        const response = await fetch(url);
        if (!abort) {
          if (response.ok) {
            const json = await response.json();
            setGeoData(json);
          } else {
            console.warn("Could not load GeoJSON:", url);
            setGeoData(null);
          }
        }
      } catch (err) {
        if (!abort) {
          console.error("Error loading GeoJSON:", err);
          setGeoData(null);
        }
      } finally {
        if (!abort) setIsFetchingGeoJSON(false);
      }
    };
    loadGeoJSON();
    return () => {
      abort = true;
    };
  }, [geojsonData, parentSelectBy]);

  // Discover region property options
  const [regionPropertyOptions, setRegionPropertyOptions] = useState<string[]>(
    []
  );
  useEffect(() => {
    if (!geoData?.features?.length) return;
    const sampleProps = geoData.features[0]?.properties || {};
    const keys = Object.keys(sampleProps);
    const likely = keys.filter(
      (k) =>
        /^(ADM1|ADM2|ADM3).*_EN$/i.test(k) ||
        /(NAME|ADM).*(EN|_1|_2|_3)?$/i.test(k) ||
        /^NAME$/i.test(k)
    );
    const preferred =
      config.regionProperty || defaultRegionPropByLevel[parentSelectBy];
    const unique = Array.from(
      new Set([preferred, regionProperty, ...likely].filter(Boolean))
    );
    setRegionPropertyOptions(unique);
  }, [geoData, regionProperty, parentSelectBy, config.regionProperty]);

  /* =========================
     Map providers
  ========================= */
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

  /* =========================
     Load Leaflet & init map
  ========================= */
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        // Try to load MarkerCluster for better point handling
        try {
          const MarkerCluster = await import("leaflet.markercluster");
          await import("leaflet.markercluster/dist/MarkerCluster.css");
          await import("leaflet.markercluster/dist/MarkerCluster.Default.css");
        } catch {
          console.warn("MarkerCluster not available, using standard markers");
        }

        setLeaflet(L);
      } catch (error) {
        console.error("Failed to load Leaflet:", error);
      } finally {
        setIsLeafletLoading(false);
      }
    };
    loadLeaflet();
  }, []);

  useEffect(() => {
    if (!leaflet || !mapRef.current || mapInstance.current) return;
    const L = (leaflet as any).default || leaflet;
    const map = L.map(mapRef.current, {
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: true,
    });
    map.setView([7.8731, 80.7718], 7);
    mapInstance.current = map;

    const provider = mapProviders[mapProvider];
    const tileOptions: any = {
      attribution: provider.attribution,
      maxZoom: 19,
    };
    if (provider.url.includes("{s}")) tileOptions.subdomains = "abcd";
    baseTileLayer.current = L.tileLayer(provider.url, tileOptions).addTo(map);

    // Initialize cluster group if available
    if (L.markerClusterGroup) {
      markersClusterGroup.current = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
      });
      map.addLayer(markersClusterGroup.current);
    }
  }, [leaflet]);

  // Update base tile on provider change
  useEffect(() => {
    if (!leaflet || !mapInstance.current) return;
    const provider = mapProviders[mapProvider];
    const tileOptions: any = {
      attribution: provider.attribution,
      maxZoom: 19,
    };
    if (provider.url.includes("{s}")) tileOptions.subdomains = "abcd";

    if (baseTileLayer.current) {
      mapInstance.current.removeLayer(baseTileLayer.current);
      baseTileLayer.current = null;
    }
    const L = (leaflet as any).default || leaflet;
    baseTileLayer.current = L.tileLayer(provider.url, tileOptions).addTo(
      mapInstance.current
    );
  }, [mapProvider, leaflet]);

  /* =========================
     Aggregation - Handle both modes
  ========================= */
  const { regionMap, domain } = useMemo(() => {
    if (!geoData) return { regionMap: new Map(), domain: { min: 0, max: 1 } };

    if (detectedDataMode === "aggregated") {
      const regionMap = new Map();
      let minVal = Infinity;
      let maxVal = -Infinity;

      stations.forEach((station) => {
        const regionName =
          station.province || station.district || station.area || station.name;
        const metric =
          station.point_count ||
          station.avg_utilization ||
          station.total_revenue ||
          1;

        regionMap.set(regionName, {
          count: station.point_count || 1,
          stations: [station],
          metric: metric,
        });

        minVal = Math.min(minVal, metric);
        maxVal = Math.max(maxVal, metric);
      });

      // Handle single region case
      if (minVal === maxVal) {
        if (minVal === 0) {
          // If all values are 0, show minimum color
          return { regionMap, domain: { min: 0, max: 1 } };
        } else {
          // For non-zero single value, create range around it
          return {
            regionMap,
            domain: {
              min: Math.max(0, minVal * 0.5), // 50% of value as min
              max: minVal * 1.5, // 150% of value as max
            },
          };
        }
      }

      return {
        regionMap,
        domain: {
          min: minVal === Infinity ? 0 : minVal,
          max: maxVal === -Infinity ? 1 : maxVal,
        },
      };
    } else {
      // Use the existing aggregation library for individual points
      const result = aggregateByRegion({
        geoData,
        stations,
        selectBy: parentSelectBy,
        regionProperty,
        aggregation: parentAggregation,
        aggregationField: parentAggregationField,
      });

      // Handle single region case for individual data mode
      if (result.domain.min === result.domain.max) {
        if (result.domain.min === 0) {
          return { ...result, domain: { min: 0, max: 1 } };
        } else {
          return {
            ...result,
            domain: {
              min: Math.max(0, result.domain.min * 0.5),
              max: result.domain.max * 1.5,
            },
          };
        }
      }

      return result;
    }
  }, [
    geoData,
    stations,
    parentSelectBy,
    regionProperty,
    parentAggregation,
    parentAggregationField,
    detectedDataMode,
  ]);
  /* =========================
     Color scale
  ========================= */
  const { getColor } = useMemo(() => {
    const interpolator = PALETTES[paletteKey].interpolator;
    const seq = scaleSequential(interpolator).domain([domain.min, domain.max]);

    return {
      getColor: (value: number) => {
        if (value <= domain.min) return "rgba(156, 163, 175, 0.2)";
        return seq(value);
      },
    };
  }, [domain, paletteKey]);

  /* =========================
     Points layer - Optimized for different modes
  ========================= */
  const clearPoints = () => {
    if (markersClusterGroup.current) {
      markersClusterGroup.current.clearLayers();
    }

    if (mapInstance.current && pointsLayer.current) {
      pointsLayer.current.forEach((marker) => {
        mapInstance.current.removeLayer(marker);
      });
      pointsLayer.current = [];
    }
  };

  const addPoints = () => {
    if (!leaflet || !mapInstance.current) return;
    const L = (leaflet as any).default || leaflet;

    clearPoints();

    const pointsToShow =
      detectedDataMode === "aggregated" && !parentShowPoints
        ? [] // Don't show points for aggregated data unless explicitly requested
        : stations.filter(
            (station) =>
              station.latitude !== undefined &&
              station.longitude !== undefined &&
              station.latitude !== 0 &&
              station.longitude !== 0
          );

    if (pointsToShow.length === 0) return;

    const markers: any[] = [];

    pointsToShow.forEach((station) => {
      const statusColors: Record<string, string> = {
        active: "#10b981",
        warning: "#f59e0b",
        maintenance: "#ef4444",
      };

      const isAggregated = detectedDataMode === "aggregated";
      const markerColor = isAggregated
        ? "#06b6d4" // Cyan for aggregated points
        : statusColors[station.status || ""] || "#10B981";

      const markerSize = isAggregated
        ? Math.max(6, Math.min(20, (station.point_count || 1) / 5)) // Size based on point count
        : 4;

      const marker = L.circleMarker([station.latitude, station.longitude], {
        radius: markerSize,
        fillColor: markerColor,
        color: "#ffffff",
        weight: isAggregated ? 3 : 2,
        opacity: 0.9,
        fillOpacity: isAggregated ? 0.7 : 0.8,
      });

      const popupContent = isAggregated
        ? `
        <div style="color: white; font-family: system-ui, sans-serif;">
          <div style="font-weight: 600; margin-bottom: 8px;">${
            station.name
          }</div>
          <div style="font-size: 13px;">
            <div>Region Type: ${
              station.province
                ? "Province"
                : station.district
                ? "District"
                : "Area"
            }</div>
            <div>Total Points: ${station.point_count || "N/A"}</div>
            <div>Avg Utilization: ${
              station.avg_utilization?.toFixed(1) || "N/A"
            }%</div>
            <div>Total Revenue: $${
              station.total_revenue?.toLocaleString() || "N/A"
            }</div>
            <div>Unique Stations: ${station.unique_stations || "N/A"}</div>
          </div>
        </div>
      `
        : `
        <div style="color: white; font-family: system-ui, sans-serif;">
          <div style="font-weight: 600; margin-bottom: 8px;">${
            station.name
          }</div>
          <div style="font-size: 13px;">
            <div>Province: ${station.province || station.region || "N/A"}</div>
            <div>District: ${station.district || "N/A"}</div>
            <div>Area: ${station.area || "N/A"}</div>
            <div>Status: ${station.status ?? "n/a"}</div>
            <div>Type: ${station.type ?? "n/a"}</div>
            ${
              station.utilization_rate
                ? `<div>Utilization: ${station.utilization_rate.toFixed(
                    1
                  )}%</div>`
                : ""
            }
            ${
              station.revenue
                ? `<div>Revenue: $${station.revenue.toLocaleString()}</div>`
                : ""
            }
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { className: "custom-popup" });
      marker.on("click", () => onDataPointClick?.(station));

      markers.push(marker);
    });

    // Use cluster group for individual points if available and we have many points
    if (
      markersClusterGroup.current &&
      detectedDataMode === "individual" &&
      markers.length > 50
    ) {
      markersClusterGroup.current.addLayers(markers);
    } else {
      // Add markers directly to map
      markers.forEach((marker) => {
        marker.addTo(mapInstance.current);
        pointsLayer.current.push(marker);
      });
    }
  };

  useEffect(() => {
    if (!mapInstance.current || !leaflet) return;

    if (parentShowPoints || detectedDataMode === "individual") {
      addPoints();
    } else {
      clearPoints();
    }
  }, [parentShowPoints, stations, leaflet, detectedDataMode]);

  /* =========================
     GeoJSON layer + tooltip + settling
  ========================= */
  useEffect(() => {
    if (!leaflet || !mapInstance.current || !geoData) {
      return;
    }
    const L = (leaflet as any).default || leaflet;

    setIsRenderingLayer(true);

    // remove previous layer
    if (geoJsonLayer.current) {
      try {
        mapInstance.current.removeLayer(geoJsonLayer.current);
      } catch {}
      geoJsonLayer.current = null;
    }

    const provider = mapProviders[mapProvider];

    // Helper: Leaflet sticky tooltip content
    const makeTooltipHTML = (name?: string) => {
      const r = name ? regionMap.get(name) : undefined;
      const count = r?.count ?? 0;
      const metric = r?.metric ?? 0;

      // Different tooltip content for aggregated vs individual data
      if (detectedDataMode === "aggregated") {
        const station = r?.stations?.[0];
        return `
          <div class="region-tooltip-content">
            <div class="rt-title">${name || "—"}</div>
            <div class="rt-line"><strong>${
              station?.point_count || count
            }</strong> total points</div>
            ${
              station?.avg_utilization
                ? `<div class="rt-line"><strong>${station.avg_utilization.toFixed(
                    1
                  )}%</strong> avg utilization</div>`
                : ""
            }
            ${
              station?.total_revenue
                ? `<div class="rt-line"><strong>$${station.total_revenue.toLocaleString()}</strong> total revenue</div>`
                : ""
            }
          </div>
        `;
      } else {
        const top = (r?.stations ?? [])
          .slice(0, 3)
          .map((s) => s.name)
          .join(", ");

        return `
          <div class="region-tooltip-content">
            <div class="rt-title">${name || "—"}</div>
            <div class="rt-line"><strong>${count}</strong> station(s)</div>
            ${
              parentAggregation !== "count"
                ? `<div class="rt-line"><strong>${metric.toFixed(
                    2
                  )}</strong> ${makeLegendLabel(
                    parentAggregation,
                    parentAggregationField
                  )}</div>`
                : ""
            }
            ${top ? `<div class="rt-line rt-small">${top}</div>` : ""}
          </div>
        `;
      }
    };

    geoJsonLayer.current = L.geoJSON(geoData, {
      style: (feature: any) => {
        const regionName = getRegionNameFromFeature(feature, regionProperty);
        const regionInfo = regionName ? regionMap.get(regionName) : undefined;
        const metric = regionInfo ? regionInfo.metric : 0;

        return {
          fillColor: getColor(metric),
          weight: parentShowBorders ? (parentSelectBy === "area" ? 0.5 : 2) : 0,
          opacity: parentShowBorders ? 1 : 0,
          color: provider.borderColor,
          dashArray: "",
          fillOpacity: metric > domain.min ? effectiveOpacity : 0.12,
          stroke: parentShowBorders,
        };
      },
      onEachFeature: (feature, layer) => {
        const name = getRegionNameFromFeature(feature, regionProperty);
        const info = name ? regionMap.get(name) : undefined;

        layer.on({
          mouseover: (e) => {
            setHoveredRegion({
              name,
              info: info || { count: 0, stations: [], metric: 0 },
            });
            setShowTooltip(true);
          },
          mouseout: () => {
            setShowTooltip(false);
            setHoveredRegion(null);
          },
          click: () => {
            if (onRegionClick && info) onRegionClick(feature, info.stations);
          },
        });
      },
    }).addTo(mapInstance.current);

    // Fit bounds & wait for next frame to ensure UI settle
    const settle = async () => {
      try {
        const b = geoJsonLayer.current?.getBounds?.();
        if (b?.isValid && b.isValid()) {
          mapInstance.current.fitBounds(b, { padding: [20, 20] });
        }
      } catch {}
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      setIsRenderingLayer(false);
      setIsParentLoading(false);
    };
    settle();

    return () => {
      try {
        if (geoJsonLayer.current) {
          mapInstance.current.removeLayer(geoJsonLayer.current);
          geoJsonLayer.current = null;
        }
      } catch {}
    };
  }, [
    leaflet,
    geoData,
    regionProperty,
    parentShowBorders,
    mapProvider,
    effectiveOpacity,
    regionMap,
    getColor,
    onRegionClick,
    parentSelectBy,
    domain,
    parentAggregation,
    parentAggregationField,
    detectedDataMode,
  ]);

  /* =========================
     Stats - Updated for both modes
  ========================= */
  const stats = useMemo(() => {
    if (detectedDataMode === "aggregated") {
      const totalPoints = stations.reduce(
        (sum, station) => sum + (station.point_count || 1),
        0
      );
      const avgUtilization =
        stations.length > 0
          ? stations.reduce(
              (sum, station) => sum + (station.avg_utilization || 0),
              0
            ) / stations.length
          : 0;

      return {
        total: totalPoints,
        max: domain.max,
        min: domain.min,
        avg: avgUtilization,
        totalRegions: stations.length,
        dataMode: "aggregated" as const,
      };
    } else {
      const metrics = Array.from(regionMap.values()).map((r) => r.metric);
      const counts = Array.from(regionMap.values()).map((r) => r.count);
      const activeMetrics = metrics.filter((m) => m > domain.min);

      return {
        total: stations.length,
        max: domain.max,
        min: domain.min,
        avg:
          activeMetrics.length > 0
            ? activeMetrics.reduce((sum, m) => sum + m, 0) /
              activeMetrics.length
            : 0,
        totalRegions: counts.filter((c) => c > 0).length,
        dataMode: "individual" as const,
      };
    }
  }, [regionMap, stations, domain, detectedDataMode]);

  const selectByLabel: Record<SelectByKey, string> = {
    area: "Area",
    district: "District",
    province: "Province",
  };

  // Determine which loading phase we're in
  const getLoadingPhase = ():
    | "leaflet"
    | "geojson"
    | "rendering"
    | "parent"
    | "transitioning" => {
    if (isLeafletLoading) return "leaflet";
    if (isFetchingGeoJSON) return "geojson";
    if (isRenderingLayer) return "rendering";
    if (isParentLoading) return "parent";
    if (isTransitioning) return "transitioning";
    return "leaflet";
  };

  // One source of truth for loading overlay
  const showLoadingOverlay =
    isLeafletLoading ||
    isFetchingGeoJSON ||
    isRenderingLayer ||
    isParentLoading ||
    isTransitioning;

  return (
    <div
      className={`relative w-full h-[100%] bg-background overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="absolute top-3 left-12 z-[999]">
        <Card className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs font-medium">
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-primary" />
            <span className="text-foreground font-medium">
              GPS Choropleth Map
            </span>
            <span className="text-cyan-400 font-mono text-[10px] bg-slate-700 px-2 py-0.5 rounded">
              {detectedDataMode === "aggregated"
                ? "Aggregated View"
                : makeLegendLabel(parentAggregation, parentAggregationField)}
            </span>
            {detectedDataMode === "aggregated" && (
              <span className="text-amber-400 font-mono text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <BarChart3 className="h-3 w-3 inline mr-1" />
                AGG
              </span>
            )}
            {detectedDataMode === "individual" && (
              <span className="text-green-400 font-mono text-[10px] bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                <Users className="h-3 w-3 inline mr-1" />
                IND
              </span>
            )}
          </div>

          <div className="text-xs text-muted-foreground mt-1">
            {stats.totalRegions} {parentSelectBy} regions • {stats.total} total
            points
            {detectedDataMode === "aggregated" && (
              <span className="text-cyan-400"> (server-aggregated)</span>
            )}
          </div>
        </Card>
      </div>

      {/* Settings Toggle */}
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

      {/* Settings Panel */}
      {!uiCollapsed && (
        <div className="absolute top-12 right-2 z-[998] w-64">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
            <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Map Settings
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Map Style
                </label>
                <select
                  value={mapProvider}
                  onChange={(e) => setMapProvider(e.target.value as any)}
                  className="w-full text-xs bg-slate-800 border border-slate-600 text-white rounded px-2 py-1 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="openstreetmap">OpenStreetMap</option>
                  <option value="cartodb_light">Light</option>
                  <option value="cartodb_dark">Dark</option>
                  <option value="satellite">Satellite</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Color Palette
                </label>
                <select
                  value={paletteKey}
                  onChange={(e) => setPaletteKey(e.target.value as any)}
                  className="w-full text-xs bg-slate-800 border border-slate-600 text-white rounded px-2 py-1 focus:border-cyan-400 focus:outline-none"
                >
                  {Object.entries(PALETTES).map(([key, p]) => (
                    <option key={key} value={key}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <div
                  className="h-2 w-full rounded mt-2"
                  style={{
                    background: cssGradientFromInterpolator(
                      PALETTES[paletteKey].interpolator,
                      [0, 0.25, 0.5, 0.75, 1]
                    ),
                  }}
                />
                <div className="text-[10px] text-muted-foreground mt-1">
                  {domain.min.toFixed(2)} → {domain.max.toFixed(2)}
                </div>
              </div>

              <div className="h-px bg-slate-700/50" />

              <div className="text-xs text-slate-400 bg-slate-700/50 rounded p-2">
                <div className="flex items-center gap-2 mb-1">
                  {detectedDataMode === "aggregated" ? (
                    <BarChart3 className="h-3 w-3 text-cyan-400" />
                  ) : (
                    <Users className="h-3 w-3 text-green-400" />
                  )}
                  <span className="font-medium">
                    {detectedDataMode === "aggregated"
                      ? "Aggregated Mode"
                      : "Individual Mode"}
                  </span>
                </div>
                {detectedDataMode === "aggregated" ? (
                  <div>
                    Data pre-aggregated by server. Each point represents
                    multiple stations grouped by {parentSelectBy}.
                  </div>
                ) : (
                  <div>
                    Showing individual station points. Regions colored by{" "}
                    {makeLegendLabel(parentAggregation, parentAggregationField)}
                    .
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {showTooltip && hoveredRegion && (
        <div
          className="absolute z-[9999] pointer-events-none"
          style={{
            left: `${mousePosition.x + 15}px`,
            top: `${mousePosition.y + 15}px`,
          }}
        >
          <div className="inline-block w-fit max-w-[80vw] sm:max-w-[28rem] bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-md p-3 shadow-xl">
            <h3 className="text-sm font-medium text-white break-words">
              {hoveredRegion.name || "Unknown Region"}
            </h3>

            {detectedDataMode === "aggregated" ? (
              <div className="mt-1 space-y-1 text-xs text-slate-300">
                <p>
                  {hoveredRegion.info.stations[0]?.point_count ||
                    hoveredRegion.info.count}{" "}
                  total points
                </p>
              </div>
            ) : (
              <div className="mt-1 space-y-1 text-xs text-slate-300">
                <p>
                  {hoveredRegion.info.count} individual station
                  {hoveredRegion.info.count !== 1 ? "s" : ""}
                </p>
                {parentAggregation !== "count" && (
                  <p>
                    {makeLegendLabel(parentAggregation, parentAggregationField)}
                    : {hoveredRegion.info.metric.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced stat cards */}
      <div className="absolute bottom-4 right-4 z-[999] flex gap-2">
        <Card className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs">
          <div className="text-[10px] text-muted-foreground">
            {detectedDataMode === "aggregated"
              ? "Total GPS points"
              : "Individual stations"}
          </div>
          <div className="text-sm font-medium">{stats.total}</div>
        </Card>
        <Card className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs">
          <div className="text-[10px] text-muted-foreground">
            Active {parentSelectBy}s
          </div>
          <div className="text-sm font-medium">{stats.totalRegions}</div>
        </Card>
        <Card className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs">
          <div className="text-[10px] text-muted-foreground">
            Total {parentSelectBy}s
          </div>
          <div className="text-sm font-medium">
            {geoData?.features?.length || 0}
          </div>
        </Card>
        {/* <Card className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs">
          <div className="text-[10px] text-muted-foreground">
            {detectedDataMode === "aggregated"
              ? "Avg utilization"
              : `Max / Avg ${parentAggregation}`}
          </div>
          <div className="text-sm font-medium">
            {detectedDataMode === "aggregated"
              ? `${stats.avg.toFixed(1)}%`
              : `${stats.max.toFixed(1)} / ${stats.avg.toFixed(1)}`}
          </div>
        </Card> */}
      </div>

      {/* Map container */}
      <div ref={mapRef} className="absolute inset-0" />

      {/* Enhanced Loading Overlay */}
      {showLoadingOverlay && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-slate-900/85 backdrop-blur-md z-[1002]"
          aria-busy="true"
          aria-live="polite"
        >
          <EnhancedLoader phase={getLoadingPhase()} />
        </div>
      )}

      {/* No Data State */}
      {!geoData && !showLoadingOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-[1002]">
          <div className="text-center text-muted-foreground p-6">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div className="text-lg font-medium mb-2">
              Loading GeoJSON Data…
            </div>
            <div className="text-sm">
              Please ensure the GeoJSON file is available for{" "}
              {selectByLabel[parentSelectBy]} level.
            </div>
          </div>
        </div>
      )}

      {/* Transition overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 pointer-events-none bg-slate-900/20 transition-opacity duration-300 z-[1001]" />
      )}

      {/* Custom CSS for enhanced styling */}
      <style jsx>{`
        .custom-popup {
          background: rgba(30, 41, 59, 0.95) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgb(71, 85, 105) !important;
          border-radius: 8px !important;
        }

        .custom-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          color: white !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5) !important;
        }

        .custom-popup .leaflet-popup-tip {
          background: rgba(30, 41, 59, 0.95) !important;
          border: 1px solid rgb(71, 85, 105) !important;
        }

        .leaflet-cluster-anim .leaflet-marker-icon,
        .leaflet-cluster-anim .leaflet-marker-shadow {
          transition: all 0.3s ease-out !important;
        }

        .marker-cluster-small {
          background-color: rgba(6, 182, 212, 0.6) !important;
          border: 2px solid rgba(6, 182, 212, 0.8) !important;
        }

        .marker-cluster-medium {
          background-color: rgba(251, 146, 60, 0.6) !important;
          border: 2px solid rgba(251, 146, 60, 0.8) !important;
        }

        .marker-cluster-large {
          background-color: rgba(239, 68, 68, 0.6) !important;
          border: 2px solid rgba(239, 68, 68, 0.8) !important;
        }

        .marker-cluster div {
          background-color: rgba(255, 255, 255, 0.9) !important;
          color: #333 !important;
          font-weight: bold !important;
        }
      `}</style>
    </div>
  );
};

export default GeoChoroplethMap;
