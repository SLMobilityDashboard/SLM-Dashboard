"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  MapPin,
  Layers,
  Radar,
  Map,
  Settings,
  Maximize,
  Activity,
  Folders,
  Battery,
  Zap,
  Info,
  TrendingUp,
  Database,
} from "lucide-react";
import CustomizableMap from "@/components/gps/canvas-map";
import GeoChoroplethMap from "@/components/gps/GeoHexHeatmap";
import { GPSFilters } from "@/components/gps/gps-filters";

interface GPSData {
  stations: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    type?: string;
    area?: string;
    utilization_rate?: number;
    ping_speed?: number;
    status?: string;
    battery_count?: number;
    daily_swaps?: number;
    revenue?: number;
  }>;
  totalPoints: number;
  activeStations: number;
  averageUtilization: number;
}

interface GPSFilters {
  quickTime: string;
  dateRange?: { from: Date; to: Date };
  aggregation: string;
  selectedAreas: string[];
  selectedTypes: string[];
  selectedStatus: string[];
}

type HeatLevel = "area" | "district" | "province";
type HeatProvider =
  | "openstreetmap"
  | "cartodb_dark"
  | "cartodb_light"
  | "satellite";
type HeatPalette = "YlOrRd" | "Viridis" | "Plasma" | "Turbo" | "Cividis";

export default function UsagePatternPage() {
  const [filters, setFilters] = useState<GPSFilters>({
    quickTime: "last_year",
    dateRange: { from: new Date("2024-01-01"), to: new Date("2024-12-31") },
    aggregation: "monthly",
    selectedAreas: [],
    selectedTypes: [],
    selectedStatus: [],
  });

  // Map configuration state - making most fields optional
  const [sizeField, setSizeField] = useState<string>("none");
  const [colorField, setColorField] = useState<string>("none");
  const [pingSpeedField, setPingSpeedField] = useState<string>("none");
  const [categoryField, setCategoryField] = useState<string>("none");
  const [showLegend, setShowLegend] = useState(true);
  const [zoom, setZoom] = useState(8);
  const [markerOpacity, setMarkerOpacity] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"points" | "heatmap">("points");

  // NEW: Aggregation configuration state
  const [aggregation, setAggregation] = useState<string>("none");
  const [aggregationField, setAggregationField] = useState<string>("");

  // NEW: Heatmap configuration state (parent-controlled)
  const [heatSelectBy, setHeatSelectBy] = useState<HeatLevel>("province");
  const [heatShowBorders, setHeatShowBorders] = useState<boolean>(true);
  const [heatShowPoints, setHeatShowPoints] = useState<boolean>(false);
  const [heatOpacity, setHeatOpacity] = useState<number>(0.7);
  const [heatMapProvider, setHeatMapProvider] =
    useState<HeatProvider>("cartodb_dark");
  const [heatPalette, setHeatPalette] = useState<HeatPalette>("YlOrRd");

  // Sample GPS data with optional fields
  const [gpsData] = useState<GPSData>({
    stations: [
      {
        id: "GPS001",
        name: "Station Alpha",
        latitude: 7.123456,
        longitude: 80.123456,
        type: "Battery Swap",
        area: "Ampara",
        utilization_rate: 75,
        ping_speed: 100,
        status: "active",
        battery_count: 25,
        daily_swaps: 45,
        revenue: 1200,
      },
      {
        id: "GPS002",
        name: "Station Beta",
        latitude: 6.987654,
        longitude: 79.876543,
        type: "Battery Swap",
        area: "Colombo",
        utilization_rate: 90,
        ping_speed: 85,
        status: "warning",
        battery_count: 30,
        daily_swaps: 60,
        revenue: 1800,
      },
      {
        id: "GPS003",
        name: "Station Gamma",
        latitude: 6.932,
        longitude: 79.847778,
        type: "Charging Station",
        area: "Colombo",
        utilization_rate: 65,
        ping_speed: 120,
        status: "active",
        battery_count: 20,
        daily_swaps: 35,
        revenue: 950,
      },
      {
        id: "GPS004",
        name: "Station Delta",
        latitude: 7.291418,
        longitude: 80.636696,
        type: "Battery Swap",
        area: "Kandy",
        utilization_rate: 80,
        status: "active",
      },
      {
        id: "GPS005",
        name: "Station Echo",
        latitude: 6.037778,
        longitude: 80.217222,
        status: "maintenance",
      },
      {
        id: "GPS006",
        name: "Station Foxtrot",
        latitude: 9.661498,
        longitude: 80.025696,
        type: "Battery Swap",
        area: "Jaffna",
        utilization_rate: 70,
        ping_speed: 90,
        status: "active",
        battery_count: 22,
        daily_swaps: 40,
        revenue: 1100,
      },
    ],
    totalStations: 6,
    activeStations: 5,
    averageUtilization: 72.5,
  });

  const heatData = [
    {
      id: "LK001",
      name: "Station Colombo Fort",
      latitude: 6.9271,
      longitude: 79.8612,
      area: "Colombo",
      district: "Colombo",
      province: "Western Province",
    },
    {
      id: "LK002",
      name: "Station Negombo",
      latitude: 7.2083,
      longitude: 79.8358,
      area: "Negombo",
      district: "Gampaha",
      province: "Western Province",
    },
    {
      id: "LK003",
      name: "Station Kelaniya",
      latitude: 6.9553,
      longitude: 79.9219,
      area: "Kelaniya",
      district: "Gampaha",
      province: "Western Province",
    },
    {
      id: "LK004",
      name: "Station Kalutara",
      latitude: 6.5831,
      longitude: 79.9608,
      area: "Kalutara",
      district: "Kalutara",
      province: "Western Province",
    },
    {
      id: "LK021",
      name: "Station Dehiwala",
      latitude: 6.8528,
      longitude: 79.8651,
      area: "Dehiwala",
      district: "Colombo",
      province: "Western Province",
    },
    {
      id: "LK022",
      name: "Station Wattala",
      latitude: 6.9735,
      longitude: 79.8897,
      area: "Wattala",
      district: "Gampaha",
      province: "Western Province",
    },
    {
      id: "LK023",
      name: "Station Moratuwa",
      latitude: 6.7733,
      longitude: 79.8836,
      area: "Moratuwa",
      district: "Colombo",
      province: "Western Province",
    },
    {
      id: "LK024",
      name: "Station Ragama",
      latitude: 7.0273,
      longitude: 79.9183,
      area: "Ragama",
      district: "Gampaha",
      province: "Western Province",
    },

    // Central Province
    {
      id: "LK005",
      name: "Station Kandy City",
      latitude: 7.2906,
      longitude: 80.6337,
      area: "Gangawata Korale",
      district: "Kandy",
      province: "Central Province",
    },
    {
      id: "LK006",
      name: "Station Matale",
      latitude: 7.4675,
      longitude: 80.6234,
      area: "Matale",
      district: "Matale",
      province: "Central Province",
    },
    {
      id: "LK007",
      name: "Nuwara Eliya",
      latitude: 6.9497,
      longitude: 80.7891,
      area: "Nuwara Eliya",
      district: "Nuwara Eliya",
      province: "Central Province",
    },
    {
      id: "LK025",
      name: "Station Peradeniya",
      latitude: 7.2624,
      longitude: 80.5982,
      area: "Peradeniya",
      district: "Kandy",
      province: "Central Province",
    },
    {
      id: "LK026",
      name: "Station Dambulla",
      latitude: 7.8554,
      longitude: 80.6512,
      area: "Dambulla",
      district: "Matale",
      province: "Central Province",
    },

    // Southern Province
    {
      id: "LK008",
      name: "Station Galle Fort",
      latitude: 6.0346,
      longitude: 80.217,
      area: "Galle",
      district: "Galle",
      province: "Southern Province",
    },
    {
      id: "LK009",
      name: "Station Matara",
      latitude: 5.9485,
      longitude: 80.5353,
      area: "Matara",
      district: "Matara",
      province: "Southern Province",
    },
    {
      id: "LK027",
      name: "Station Weligama",
      latitude: 5.9668,
      longitude: 80.4292,
      area: "Weligama",
      district: "Matara",
      province: "Southern Province",
    },
    {
      id: "LK028",
      name: "Station Tangalle",
      latitude: 6.0244,
      longitude: 80.7916,
      area: "Tangalle",
      district: "Hambantota",
      province: "Southern Province",
    },
    {
      id: "LK029",
      name: "Station Hambantota Town",
      latitude: 6.1241,
      longitude: 81.1185,
      area: "Hambantota Town",
      district: "Hambantota",
      province: "Southern Province",
    },

    // Northern Province
    {
      id: "LK010",
      name: "Station Jaffna",
      latitude: 9.6615,
      longitude: 80.0255,
      area: "Jaffna",
      district: "Jaffna",
      province: "Northern Province",
    },
    {
      id: "LK030",
      name: "Station Chavakachcheri",
      latitude: 9.658,
      longitude: 80.159,
      area: "Chavakachcheri",
      district: "Jaffna",
      province: "Northern Province",
    },
    {
      id: "LK031",
      name: "Station Kilinochchi",
      latitude: 9.395,
      longitude: 80.398,
      area: "Kilinochchi",
      district: "Kilinochchi",
      province: "Northern Province",
    },
    {
      id: "LK032",
      name: "Station Mannar",
      latitude: 8.977,
      longitude: 79.911,
      area: "Mannar",
      district: "Mannar",
      province: "Northern Province",
    },

    // Eastern Province
    {
      id: "LK011",
      name: "Station Batticaloa",
      latitude: 7.712,
      longitude: 81.6784,
      area: "Manmunai North",
      district: "Batticaloa",
      province: "Eastern Province",
    },
    {
      id: "LK012",
      name: "Station Trincomalee",
      latitude: 8.5874,
      longitude: 81.2152,
      area: "Town & Gravets",
      district: "Trincomalee",
      province: "Eastern Province",
    },
    {
      id: "LK018",
      name: "Station Eravur",
      latitude: 7.733,
      longitude: 81.628,
      area: "Eravur",
      district: "Batticaloa",
      province: "Eastern Province",
    },
    {
      id: "LK019",
      name: "Station Kinniya",
      latitude: 8.433,
      longitude: 81.183,
      area: "Kinniya",
      district: "Trincomalee",
      province: "Eastern Province",
    },
    {
      id: "LK020",
      name: "Station Ampara",
      latitude: 7.283,
      longitude: 81.682,
      area: "Ampara",
      district: "Ampara",
      province: "Eastern Province",
    },

    // North Western Province
    {
      id: "LK013",
      name: "Station Kurunegala",
      latitude: 7.4863,
      longitude: 80.3647,
      area: "Kurunegala",
      district: "Kurunegala",
      province: "North Western Province",
    },
    {
      id: "LK033",
      name: "Station Kuliyapitiya",
      latitude: 7.473,
      longitude: 80.042,
      area: "Kuliyapitiya",
      district: "Kurunegala",
      province: "North Western Province",
    },
    {
      id: "LK034",
      name: "Station Puttalam",
      latitude: 8.036,
      longitude: 79.828,
      area: "Puttalam",
      district: "Puttalam",
      province: "North Western Province",
    },

    // North Central Province
    {
      id: "LK014",
      name: "Station Anuradhapura",
      latitude: 8.3114,
      longitude: 80.4037,
      area: "Nuwaragam Palatha East",
      district: "Anuradhapura",
      province: "North Central Province",
    },
    {
      id: "LK035",
      name: "Station Polonnaruwa",
      latitude: 7.939,
      longitude: 81.002,
      area: "Polonnaruwa Town",
      district: "Polonnaruwa",
      province: "North Central Province",
    },
    {
      id: "LK036",
      name: "Station Mihintale",
      latitude: 8.35,
      longitude: 80.515,
      area: "Mihintale",
      district: "Anuradhapura",
      province: "North Central Province",
    },

    // Uva Province
    {
      id: "LK015",
      name: "Station Badulla",
      latitude: 6.9934,
      longitude: 81.055,
      area: "Badulla",
      district: "Badulla",
      province: "Uva Province",
    },
    {
      id: "LK037",
      name: "Station Bandarawela",
      latitude: 6.828,
      longitude: 80.987,
      area: "Bandarawela",
      district: "Badulla",
      province: "Uva Province",
    },
    {
      id: "LK038",
      name: "Station Monaragala",
      latitude: 6.873,
      longitude: 81.349,
      area: "Monaragala",
      district: "Monaragala",
      province: "Uva Province",
    },

    // Sabaragamuwa Province
    {
      id: "LK016",
      name: "Station Ratnapura",
      latitude: 6.6828,
      longitude: 80.3992,
      area: "Ratnapura",
      district: "Ratnapura",
      province: "Sabaragamuwa Province",
    },
    {
      id: "LK017",
      name: "Station Kegalle",
      latitude: 7.2513,
      longitude: 80.3464,
      area: "Kegalle",
      district: "Kegalle",
      province: "Sabaragamuwa Province",
    },
    {
      id: "LK039",
      name: "Station Balangoda",
      latitude: 6.662,
      longitude: 80.698,
      area: "Balangoda",
      district: "Ratnapura",
      province: "Sabaragamuwa Province",
    },
    {
      id: "LK040",
      name: "Station Mawanella",
      latitude: 7.252,
      longitude: 80.439,
      area: "Mawanella",
      district: "Kegalle",
      province: "Sabaragamuwa Province",
    },

    // Additional filler points (to reach 50)
    {
      id: "LK041",
      name: "Station Hikkaduwa",
      latitude: 6.14,
      longitude: 80.101,
      area: "Hikkaduwa",
      district: "Galle",
      province: "Southern Province",
    },
    {
      id: "LK042",
      name: "Station Arugam Bay",
      latitude: 6.837,
      longitude: 81.83,
      area: "Arugam Bay",
      district: "Ampara",
      province: "Eastern Province",
    },
    {
      id: "LK043",
      name: "Station Hatton",
      latitude: 6.898,
      longitude: 80.599,
      area: "Hatton",
      district: "Nuwara Eliya",
      province: "Central Province",
    },
    {
      id: "LK044",
      name: "Station Avissawella",
      latitude: 6.951,
      longitude: 80.204,
      area: "Avissawella",
      district: "Colombo",
      province: "Western Province",
    },
    {
      id: "LK045",
      name: "Station Chilaw",
      latitude: 7.575,
      longitude: 79.795,
      area: "Chilaw",
      district: "Puttalam",
      province: "North Western Province",
    },
    {
      id: "LK046",
      name: "Station Medirigiriya",
      latitude: 7.984,
      longitude: 80.951,
      area: "Medirigiriya",
      district: "Polonnaruwa",
      province: "North Central Province",
    },
    {
      id: "LK047",
      name: "Station Wellawaya",
      latitude: 6.733,
      longitude: 81.1,
      area: "Wellawaya",
      district: "Monaragala",
      province: "Uva Province",
    },
    {
      id: "LK048",
      name: "Station Ruwanwella",
      latitude: 7.031,
      longitude: 80.315,
      area: "Ruwanwella",
      district: "Kegalle",
      province: "Sabaragamuwa Province",
    },
    {
      id: "LK049",
      name: "Station Vavuniya",
      latitude: 8.756,
      longitude: 80.498,
      area: "Vavuniya",
      district: "Vavuniya",
      province: "Northern Province",
    },
    {
      id: "LK050",
      name: "Station Mullaitivu",
      latitude: 9.267,
      longitude: 80.815,
      area: "Mullaitivu",
      district: "Mullaitivu",
      province: "Northern Province",
    },
  ];

  // inside your component, before return
  const isConfigLocked = gpsData.stations.length > 100;

  // Dynamically generate field options based on numeric fields in stations
  const fieldOptions = useMemo(() => {
    if (!heatData || heatData.length === 0) {
      return [{ value: "none", label: "None (Optional)" }];
    }

    // Get first station's keys and filter only numeric fields
    const numericFields = Object.keys(heatData[0]).filter((key) => {
      const value = heatData[0][key as keyof (typeof heatData)[0]];
      return typeof value === "number";
    });

    return [
      { value: "none", label: "None (Optional)" },
      ...numericFields.map((field) => ({
        value: field,
        label: field
          .replace(/_/g, " ") // optional: replace underscores with spaces
          .replace(/\b\w/g, (c) => c.toUpperCase()), // optional: capitalize
      })),
    ];
  }, [gpsData]);

  const colorFieldOptions = [
    { value: "none", label: "None (Optional)" },
    { value: "area", label: "Area" },
    { value: "type", label: "Station Type" },
    { value: "status", label: "Status" },
  ];

  // Aggregation options
  const aggregationOptions = [
    { value: "none", label: "No Aggregation" },
    { value: "count", label: "Count" },
    { value: "sum", label: "Sum" },
    { value: "average", label: "Average" },
    { value: "min", label: "Minimum" },
    { value: "max", label: "Maximum" },
  ];

  // Fixed heatmap configuration with proper memoization
  const heatmapConfig = useMemo(() => {
    const config: any = {
      // Map center for Sri Lanka
      center: { lat: 7.8731, lng: 80.7718 },
      zoom: 8,
      mapProvider: heatMapProvider,
      showZoomControl: true,
      collapsibleUI: true,
      markerSize: 32,
      colorScheme: heatPalette,
      opacity: heatOpacity,
      showLegend: true,
      showBorders: heatShowBorders,
      showPoints: heatShowPoints,
      selectBy: heatSelectBy,
      latitudeField: "latitude",
      longitudeField: "longitude",
      nameField: "name",
    };

    // Add aggregation config if selected
    if (aggregation !== "none") {
      config.Aggregation = aggregation;
      if (aggregationField !== "none") {
        config.AggregationField = aggregationField;
      }
    }

    return config;
  }, [
    heatSelectBy,
    heatShowBorders,
    heatShowPoints,
    heatOpacity,
    heatMapProvider,
    heatPalette,
    aggregation,
    aggregationField,
  ]);

  // Memoized map configuration that updates when state changes
  const mapConfig = useMemo(() => {
    const config: any = {
      // Map center for Sri Lanka
      center: { lat: 7.8731, lng: 80.7718 },
      zoom: 8,

      // Basic required fields
      latitudeField: "latitude",
      longitudeField: "longitude",
      nameField: "name",

      // Map styling
      mapProvider: "cartodb_dark",
      showZoomControl: true,
      collapsibleUI: true,
      markerSize: 32,
      colorScheme: "default",

      // Always pass opacity to the map
      markerOpacity: markerOpacity,

      // Show legend if enabled and relevant fields are selected
      showLegend:
        showLegend && (colorField !== "none" || categoryField !== "none"),
    };

    // Only add optional fields if they're selected (not "none")
    if (sizeField !== "none") {
      config.pingSizeField = sizeField;
    }

    if (colorField !== "none") {
      config.colorField = colorField;
    }

    if (pingSpeedField !== "none") {
      config.pingSpeedField = pingSpeedField;
    }

    if (categoryField !== "none") {
      config.categoryField = categoryField;
    }

    // Add aggregation config if selected
    if (aggregation !== "none") {
      config.Aggregation = aggregation;
      if (aggregationField !== "none") {
        config.AggregationField = aggregationField;
      }
    }

    return config;
  }, [
    sizeField,
    colorField,
    pingSpeedField,
    categoryField,
    zoom,
    markerOpacity,
    showLegend,
    aggregation,
    aggregationField,
  ]);

  const getStatusColor = (status?: string): string => {
    if (!status) return "#6b7280"; // Default gray for missing status

    switch (status) {
      case "active":
        return "#10b981"; // green
      case "warning":
        return "#f59e0b"; // amber
      case "maintenance":
        return "#ef4444"; // red
      default:
        return "#6b7280"; // gray
    }
  };

  const getTypeIcon = (type?: string) => {
    if (!type) return <MapPin className="h-4 w-4" />; // Default icon

    switch (type) {
      case "Battery Swap":
        return <Battery className="h-4 w-4" />;
      case "Charging Station":
        return <Zap className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const isDateRangeSet =
    filters.dateRange && filters.dateRange.from && filters.dateRange.to;

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <TrendingUp className="h-4 w-4 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-sm font-medium">
              Usage Analytics
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Usage Pattern Overview
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Monitor station locations and performance metrics with advanced
            visualization and pattern analysis
          </p>
        </div>
        {/* Filters Section */}
        <GPSFilters filters={filters} />

        {/* Main Content */}
        {isDateRangeSet ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Configuration Panel */}
            <div className="xl:col-span-4">
              <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl h-[100%]">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                      <Map className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-100 text-lg">
                        Advanced Map Configuration
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Customize GPS visualization parameters
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full my-4"
                      >
                        <TabsList className="grid grid-cols-2 mb-6 bg-slate-800/50 p-1 rounded-xl">
                          <TabsTrigger
                            value="points"
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
                          >
                            <Layers className="h-4 w-4 mr-2" />
                            Points
                          </TabsTrigger>
                          <TabsTrigger
                            value="heatmap"
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-200"
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            Choropleth-map
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>

                      {activeTab === "points" && (
                        <>
                          {gpsData.stations.length > 0 &&
                            (gpsData.stations[0].latitude === undefined ||
                              gpsData.stations[0].longitude === undefined) && (
                              <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                                <div className="flex items-center text-cyan-400 text-sm font-medium mb-1">
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Mandatory Fields
                                </div>
                                <p className="text-xs text-slate-500">
                                  Latitude and Longitude are required. All other
                                  fields are optional.
                                </p>
                              </div>
                            )}

                          {/* Color Field - Optional */}
                          <div className="space-y-3">
                            <Label
                              htmlFor="color-field"
                              className="text-slate-300 flex items-center justify-between text-sm font-medium"
                            >
                              <div className="flex items-center">
                                <Layers className="h-4 w-4 mr-2 text-cyan-400" />
                                Color Coding
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-slate-700/50 text-slate-400"
                              >
                                Optional
                              </Badge>
                            </Label>
                            <Select
                              value={colorField}
                              onValueChange={setColorField}
                            >
                              <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
                                <SelectValue placeholder="Default color" />
                              </SelectTrigger>
                              <SelectContent>
                                {colorFieldOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Color markers based on selected field
                            </p>
                          </div>

                          <Separator className="bg-slate-700/30" />

                          {/* Category field - Optional */}
                          <div className="space-y-3">
                            <Label
                              htmlFor="category-field"
                              className="text-slate-300 flex items-center justify-between text-sm font-medium"
                            >
                              <div className="flex items-center">
                                <Folders className="h-4 w-4 mr-2 text-cyan-400" />
                                Icon Category
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-slate-700/50 text-slate-400"
                              >
                                Optional
                              </Badge>
                            </Label>
                            <Select
                              disabled={isConfigLocked}
                              value={categoryField}
                              onValueChange={setCategoryField}
                            >
                              <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
                                <SelectValue placeholder="Default icons" />
                              </SelectTrigger>
                              <SelectContent>
                                {colorFieldOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Categorize icons based on field values
                            </p>
                          </div>

                          <Separator className="bg-slate-700/30" />

                          {/* Ping Size Field - Optional */}
                          <div className="space-y-3">
                            <Label
                              htmlFor="size-field"
                              className="text-slate-300 flex items-center justify-between text-sm font-medium"
                            >
                              <div className="flex items-center">
                                <Maximize className="h-4 w-4 mr-2 text-cyan-400" />
                                Ping Radius Field
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-slate-700/50 text-slate-400"
                              >
                                Optional
                              </Badge>
                            </Label>
                            <Select
                              value={sizeField}
                              onValueChange={setSizeField}
                              disabled={isConfigLocked}
                            >
                              <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
                                <SelectValue placeholder="None selected" />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Scale ping radius based on field values
                            </p>
                          </div>

                          <Separator className="bg-slate-700/30" />

                          {/* Ping Speed Field - Optional */}
                          <div className="space-y-3">
                            <Label
                              htmlFor="ping-field"
                              className="text-slate-300 flex items-center justify-between text-sm font-medium"
                            >
                              <div className="flex items-center">
                                <Activity className="h-4 w-4 mr-2 text-cyan-400" />
                                Ping Frequency Field
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-slate-700/50 text-slate-400"
                              >
                                Optional
                              </Badge>
                            </Label>
                            <Select
                              disabled={isConfigLocked}
                              value={pingSpeedField}
                              onValueChange={setPingSpeedField}
                            >
                              <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
                                <SelectValue placeholder="None selected" />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Control ping animation frequency
                            </p>
                          </div>

                          <Separator className="bg-slate-700/30" />

                          {/* Marker Opacity */}
                          <div className="space-y-3">
                            <Label
                              htmlFor="marker-opacity"
                              className="text-slate-300 flex items-center justify-between text-sm font-medium"
                            >
                              <div className="flex items-center">
                                <Settings className="h-4 w-4 mr-2 text-cyan-400" />
                                Marker Opacity
                              </div>
                              <span className="text-cyan-400 font-mono">
                                {Math.round(markerOpacity * 100)}%
                              </span>
                            </Label>
                            <Slider
                              id="marker-opacity"
                              min={0.1}
                              max={1}
                              step={0.1}
                              value={[markerOpacity]}
                              onValueChange={(value) =>
                                setMarkerOpacity(value[0])
                              }
                              className="py-2"
                            />
                          </div>
                        </>
                      )}
                      {activeTab === "heatmap" && (
                        <div className="space-y-6">
                          {/* Admin Level */}
                          <div className="space-y-3">
                            <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
                              <div className="flex items-center">
                                <Layers className="h-4 w-4 mr-2 text-cyan-400" />
                                Admin Level
                              </div>
                            </Label>
                            <Select
                              value={heatSelectBy}
                              onValueChange={(v) =>
                                setHeatSelectBy(v as HeatLevel)
                              }
                            >
                              <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 h-10">
                                <SelectValue placeholder="Province" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="province">
                                  Province
                                </SelectItem>
                                <SelectItem value="district">
                                  District
                                </SelectItem>
                                <SelectItem value="area">Area</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Choose the administrative level for the
                              choropleth.
                            </p>
                          </div>

                          <Separator className="bg-slate-700/30" />

                          {/* Borders & Points */}
                          <div className="w-full">
                            <div className="space-y-2">
                              <Label className="text-slate-300 text-sm font-medium">
                                Show Borders
                              </Label>
                              <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                                <span className="text-xs text-slate-400">
                                  Outlines
                                </span>
                                <Switch
                                  checked={heatShowBorders}
                                  onCheckedChange={setHeatShowBorders}
                                />
                              </div>
                            </div>
                            <div className="h-6" />
                            <div className="space-y-2">
                              <Label className="text-slate-300 text-sm font-medium">
                                Show Points
                              </Label>
                              <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                                <span className="text-xs text-slate-400">
                                  GPS coordinates
                                </span>
                                <Switch
                                  checked={heatShowPoints}
                                  onCheckedChange={setHeatShowPoints}
                                />
                              </div>
                            </div>
                          </div>
                          <Separator className="bg-slate-700/30" />

                          {/* Fill Opacity */}
                          <div className="space-y-3">
                            <Label className="text-slate-300 flex items-center justify-between text-sm font-medium">
                              <div className="flex items-center">
                                <Settings className="h-4 w-4 mr-2 text-cyan-400" />
                                Fill Opacity
                              </div>
                              <span className="text-cyan-400 font-mono">
                                {Math.round(heatOpacity * 100)}%
                              </span>
                            </Label>
                            <Slider
                              min={0.1}
                              max={1}
                              step={0.05}
                              value={[heatOpacity]}
                              onValueChange={(v) => setHeatOpacity(v[0])}
                              className="py-2"
                            />
                            <p className="text-xs text-slate-500">
                              Controls polygon fill transparency.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Map and Station Details */}
            <div className="xl:col-span-8 space-y-6">
              {/* Map Display */}
              <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl overflow-hidden">
                <CardContent className="p-0">
                  <div style={{ height: "800px", width: "100%" }}>
                    {activeTab === "points" && (
                      <CustomizableMap
                        data={gpsData.stations}
                        config={mapConfig}
                        onDataPointClick={(point) => {
                          console.log("Clicked point:", point);
                        }}
                        onConfigChange={(newConfig) => {
                          console.log("Config changed:", newConfig);
                        }}
                        className="h-full w-full"
                      />
                    )}
                    {activeTab === "heatmap" && (
                      <div className="flex items-center justify-center h-full">
                        <GeoChoroplethMap
                          data={heatData}
                          config={heatmapConfig}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-xl shadow-2xl">
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-full mx-auto w-fit">
                  <TrendingUp className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-slate-300 mb-2">
                    Select Date Range to View GPS Data
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Please choose a valid date range from the filters above to
                    display station locations and metrics.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
