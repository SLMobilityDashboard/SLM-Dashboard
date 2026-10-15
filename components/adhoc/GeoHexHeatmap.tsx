import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Layers,
  Menu,
  X,
  MapPin,
  Loader2,
  Settings,
  Activity,
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
import { Separator } from "@radix-ui/react-select";

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
  district?: string; // ADM2
  province?: string; // ADM1
  region?: string; // legacy (province-equivalent)
  utilization_rate?: number;
  ping_speed?: number;
  status?: string;
  battery_count?: number;
  daily_swaps?: number;
  revenue?: number;
  [key: string]: any; // Allow any numeric field for aggregation
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
   Component
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

  // Use local opacity if not controlled by parent, otherwise use parent's
  const effectiveOpacity =
    config.opacity !== undefined ? config.opacity : localOpacity;
  const parentShowPoints = config.showPoints ?? false;
  const parentShowBorders = config.showBorders ?? true;
  const parentSelectBy: SelectByKey = config.selectBy ?? "province";
  const parentAggregation: AggregationKey = config.Aggregation ?? "count";
  const parentAggregationField = config.AggregationField ?? "";

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

  // Parent changes → show loading (including selectBy)
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

  const stations = useMemo(() => data || [], [data]);

  /* =========================
     GeoJSON source per selectBy
  ========================= */
  const getGeoUrlForLevel = (level: SelectByKey) => {
    if (geojsonData) return null; // user provided
    if (level === "district") return "/srilanka_districts.geojson"; // ADM2
    if (level === "province") return "/srilanka_provinces.geojson"; // ADM1
    return "/srilanka.geojson"; // ADM3 (areas)
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

  // Discover region property options (kept simple internally)
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
     Aggregation using your library
  ========================= */
  const { regionMap, domain } = useMemo(() => {
    if (!geoData) return { regionMap: new Map(), domain: { min: 0, max: 1 } };

    return aggregateByRegion({
      geoData,
      stations,
      selectBy: parentSelectBy,
      regionProperty,
      aggregation: parentAggregation,
      aggregationField: parentAggregationField,
    });
  }, [
    geoData,
    stations,
    parentSelectBy,
    regionProperty,
    parentAggregation,
    parentAggregationField,
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
     Points layer
  ========================= */
  const clearPoints = () => {
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

    stations.forEach((station) => {
      const statusColors: Record<string, string> = {
        active: "#10b981",
        warning: "#f59e0b",
        maintenance: "#ef4444",
      };

      const marker = L.circleMarker([station.latitude, station.longitude], {
        radius: 4,
        fillColor: statusColors[station.status || ""] || "#10B981",
        color: "#ffffff",
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.8,
      }).addTo(mapInstance.current);

      const popupContent = `
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
              parentAggregationField
                ? `<div>${parentAggregationField}: ${
                    station[parentAggregationField] ?? "N/A"
                  }</div>`
                : ""
            }
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { className: "custom-popup" });
      marker.on("click", () => onDataPointClick?.(station));
      pointsLayer.current.push(marker);
    });
  };

  useEffect(() => {
    if (!mapInstance.current || !leaflet) return;
    clearPoints();
    if (parentShowPoints) addPoints();
  }, [parentShowPoints, stations, leaflet]);

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
              layer: e.target,
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
    effectiveOpacity, // This is now properly included in dependencies
    regionMap,
    getColor,
    onRegionClick,
    parentSelectBy,
    domain,
    parentAggregation,
    parentAggregationField,
  ]);

  /* =========================
     Stats
  ========================= */
  const stats = useMemo(() => {
    const metrics = Array.from(regionMap.values()).map((r) => r.metric);
    const counts = Array.from(regionMap.values()).map((r) => r.count);
    const activeMetrics = metrics.filter((m) => m > domain.min);

    return {
      total: stations.length,
      max: domain.max,
      min: domain.min,
      avg:
        activeMetrics.length > 0
          ? activeMetrics.reduce((sum, m) => sum + m, 0) / activeMetrics.length
          : 0,
      totalRegions: counts.filter((c) => c > 0).length,
    };
  }, [regionMap, stations, domain]);

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
              {makeLegendLabel(parentAggregation, parentAggregationField)}
            </span>
          </div>

          <div className="text-xs text-muted-foreground mt-1">
            {stats.totalRegions} {parentSelectBy} polygons • {stations.length}{" "}
            points
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

              {/* <div className="space-y-3">
                <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
                  <div className="flex items-center">
                    <Settings className="h-4 w-4 mr-2 text-cyan-400" />
                    Fill Opacity
                  </div>
                  <span className="text-cyan-400 font-mono">
                    {Math.round(effectiveOpacity * 100)}%
                  </span>
                </Label>

                <Slider
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={[effectiveOpacity]}
                  onValueChange={(values) => {
                    setLocalOpacity(values[0]);
                  }}
                  className="py-2"
                  disabled={config.opacity !== undefined}
                />

                <p className="text-xs text-slate-500">
                  {config.opacity !== undefined
                    ? "Opacity controlled by parent component"
                    : "Controls polygon fill transparency"}
                </p>
              </div> */}

              <div className="text-xs text-slate-400 bg-slate-700/50 rounded p-2">
                Showing {stats.totalRegions} {parentSelectBy}s with data
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
            <p className="text-xs text-slate-300 mt-1">
              {hoveredRegion.info.count} station
              {hoveredRegion.info.count !== 1 ? "s" : ""}
            </p>
            {parentAggregation !== "count" && (
              <p className="text-xs text-slate-300 mt-1">
                {makeLegendLabel(parentAggregation, parentAggregationField)}:{" "}
                {hoveredRegion.info.metric.toFixed(2)}
              </p>
            )}

            {hoveredRegion.info.stations.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Stations:</p>
                <ul className="text-xs text-slate-300 space-y-1">
                  {hoveredRegion.info.stations.slice(0, 3).map((station) => (
                    <li key={station.id} className="break-words">
                      • {station.name}
                    </li>
                  ))}
                  {hoveredRegion.info.stations.length > 3 && (
                    <li className="text-slate-500">
                      +{hoveredRegion.info.stations.length - 3} more...
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick stat cards (useful cards) */}
      <div className="absolute bottom-4 right-4 z-[999] flex gap-2">
        <Card className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs">
          <div className="text-[10px] text-muted-foreground">
            Total stations
          </div>
          <div className="text-sm font-medium">{stats.total}</div>
        </Card>
        <Card className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs">
          <div className="text-[10px] text-muted-foreground">
            Regions w/ data
          </div>
          <div className="text-sm font-medium">{stats.totalRegions}</div>
        </Card>
        <Card className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs">
          <div className="text-[10px] text-muted-foreground">Total Regions</div>
          <div className="text-sm font-medium">{geoData?.features?.length}</div>
        </Card>
        <Card className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 text-slate-300 px-3 py-2 rounded-md text-xs">
          <div className="text-[10px] text-muted-foreground">
            Max / Avg per region
          </div>
          <div className="text-sm font-medium">
            {stats.max} / {stats.avg.toFixed(1)}
          </div>
        </Card>
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
      `}</style>
    </div>
  );
};

export default GeoChoroplethMap;
