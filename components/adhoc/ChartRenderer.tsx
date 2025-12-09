"use client";

const config = {
  xAxis: "category",
  yAxis: "value",
  colorBy: "name",
};

const chartDataSample = [
  { name: "Product A", value: 30, category: "Electronics" },
  { name: "Product B", value: 45, category: "Groceries" },
  { name: "Product C", value: 60, category: "Electronics" },
  { name: "Product D", value: 20, category: "Clothing" },
  { name: "Product E", value: 50, category: "Groceries" },
  { name: "Product F", value: 70, category: "Clothing" },
  { name: "Product G", value: 90, category: "Electronics" },
  { name: "Product H", value: 80, category: "Groceries" },
  { name: "Product I", value: 100, category: "Clothing" },
];

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BarChartComponent from "./BarChartComponent";
import LineChartComponent from "./LineChartComponent";
import AreaChartComponent from "./AreaChartComponent";
import PieChartComponent from "./PieChartComponent";
import KPIComponent from "./KPIComponent";
import ScatterChartComponent from "./ScatterChartComponent";
import TreemapChartComponent from "./TreemapChartComponent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Treemap,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  BarChart3,
  LineChartIcon,
  PieChartIcon,
  TableIcon,
  Download,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  TrendingUp,
  Activity,
  MapPin,
  Layers,
  Grid3X3,
  Target,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";
import CustomizableMap from "./canvas-map";
import { sub } from "date-fns";
import RadialBarChartComponent from "./RadialBarChartComponent";
import Heatmap from "./Heatmap";
import GeoChoroplethMap from "./geo-choropleth-map";

// Mock Map Component (since MapChart import is not available)
const DynamicMap = ({ data, config }: any) => (
  <div className="h-[400px] bg-slate-900/50 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <MapPin className="h-12 w-12 mx-auto mb-4 text-slate-400" />
      <p className="text-slate-400">Map visualization would render here</p>
      <p className="text-sm text-slate-500 mt-2">
        {data.length} data points configured
      </p>
    </div>
  </div>
);

interface ChartRendererProps {
  data: any[][];
  columns: string[];
  query: string;
  // Prompt: string;
  onBack?: () => void;
}

type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "area"
  | "scatter"
  | "table"
  | "kpi"
  | "map"
  | "treemap"
  | "radialbar"
  | "heatmap"
  | "choropleth";

interface ChartConfig {
  type: ChartType;
  xAxis?: string;
  yAxis?: string;
  colorBy?: string;
  column?: string;
  subCategory?: string;
  sizeBy?: string;
  latField?: string;
  longField?: string;
  pingSpeedField?: string;
  // Choropleth specific fields
  selectBy?: "area" | "district" | "province";
  regionProperty?: string;
  mapProvider?:
    | "openstreetmap"
    | "cartodb_dark"
    | "cartodb_light"
    | "satellite";
  palette?: "YlOrRd" | "Viridis" | "Plasma" | "Turbo" | "Cividis";
  dataMode?: "aggregated" | "individual" | "auto";
  title?: string;
  showLegend: boolean;
  showGrid: boolean;
  showTooltip: boolean;
  colorScheme: string;
  aggregation: "sum" | "avg" | "count" | "max" | "min";
}

const CHART_TYPES = [
  {
    id: "table",
    name: "Data Table",
    icon: TableIcon,
    description: "Raw data view",
  },
  {
    id: "bar",
    name: "Bar Chart",
    icon: BarChart3,
    description: "Compare categories",
  },
  {
    id: "line",
    name: "Line Chart",
    icon: LineChartIcon,
    description: "Show trends",
  },
  {
    id: "area",
    name: "Area Chart",
    icon: Activity,
    description: "Filled line chart",
  },
  {
    id: "pie",
    name: "Pie Chart",
    icon: PieChartIcon,
    description: "Show proportions",
  },
  {
    id: "scatter",
    name: "Scatter Plot",
    icon: Target,
    description: "Show relationships",
  },
  { id: "kpi", name: "KPI Cards", icon: Zap, description: "Key metrics" },
  // {
  //   id: "map",
  //   name: "Geographic Map",
  //   icon: MapPin,
  //   description: "Interactive map visualization",
  // },
  {
    id: "treemap",
    name: "Treemap",
    icon: Grid3X3,
    description: "Hierarchical data",
  },
  {
    id: "radialbar",
    name: "Radial Bar",
    icon: TrendingUp,
    description: "Circular progress",
  },
  { id: "heatmap", name: "Heatmap", icon: Layers, description: "Data density" },
  // {
  //   id: "choropleth",
  //   name: "Choropleth Map",
  //   icon: MapPin,
  //   description: "Regional data visualization",
  // },
];

const COLOR_SCHEMES = {
  default: [
    "#0EA5E9",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#84CC16",
  ],
  ocean: ["#0891B2", "#0284C7", "#2563EB", "#7C3AED", "#DB2777", "#DC2626"],
  forest: ["#059669", "#0D9488", "#0891B2", "#3B82F6", "#6366F1", "#8B5CF6"],
  sunset: ["#F59E0B", "#F97316", "#EF4444", "#EC4899", "#D946EF", "#A855F7"],
  monochrome: [
    "#1F2937",
    "#374151",
    "#4B5563",
    "#6B7280",
    "#9CA3AF",
    "#D1D5DB",
  ],
};

// Chart Type Selection Component
const ChartTypeSelector = ({
  chartConfig,
  setChartConfig,
  suggestedCharts,
}: any) => (
  <Card className="bg-slate-800/50 border-slate-700">
    <CardHeader className="pb-4">
      <CardTitle className="text-white flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Visualization Type
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {CHART_TYPES.filter((type) =>
        suggestedCharts.includes(type.id as ChartType)
      ).map((type) => (
        <Button
          key={type.id}
          variant={chartConfig.type === type.id ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setChartConfig({
              ...chartConfig,
              type: type.id as ChartType,
            })
          }
          className={`justify-start h-auto p-3 w-full ${
            chartConfig.type === type.id
              ? "bg-cyan-600 hover:bg-cyan-700 text-white"
              : "border-slate-600 text-slate-300 hover:bg-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <type.icon className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium text-xs">{type.name}</div>
              <div className="text-xs opacity-70">{type.description}</div>
            </div>
          </div>
        </Button>
      ))}
    </CardContent>
  </Card>
);

// Field Configuration Component
const FieldConfiguration = ({
  chartConfig,
  setChartConfig,
  columns,
  numericColumns,
  categoricalColumns,
  geographicColumns,
}: any) => {
  if (chartConfig.type === "table" || chartConfig.type === "") {
    return null;
  }

  if (chartConfig.type === "choropleth") {
    // Determine if we're in aggregated mode
    const detectedDataMode = useMemo(() => {
      if (chartConfig.dataMode !== "auto") return chartConfig.dataMode;

      if (!processedData || processedData.length === 0) return "individual";

      // Check if data has aggregated fields
      const hasAggregatedFields = processedData.some(
        (point) =>
          point.point_count !== undefined ||
          point.avg_utilization !== undefined ||
          point.total_revenue !== undefined
      );

      return hasAggregatedFields ? "aggregated" : "individual";
    }, [processedData, chartConfig.dataMode]);

    // Get location columns for aggregated mode
    const locationColumns = columns.filter(
      (col) =>
        col.toLowerCase().includes("province") ||
        col.toLowerCase().includes("district") ||
        col.toLowerCase().includes("area") ||
        col.toLowerCase().includes("region") ||
        col.toLowerCase().includes("location") ||
        col.toLowerCase().includes("city")
    );

    return (
      <div className="space-y-6">
        {detectedDataMode === "individual" ? (
          // Individual mode - show lat/long fields
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Latitude Field *
              </Label>
              <Select
                value={chartConfig.latField || "none"}
                onValueChange={(value) =>
                  setChartConfig({
                    ...chartConfig,
                    latField: value === "none" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select latitude field" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem
                    value="none"
                    className="text-white hover:bg-slate-700"
                  >
                    Select latitude field
                  </SelectItem>
                  {numericColumns.map((col: string) => (
                    <SelectItem
                      key={col}
                      value={col}
                      className="text-white hover:bg-slate-700"
                    >
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Longitude Field *
              </Label>
              <Select
                value={chartConfig.longField || "none"}
                onValueChange={(value) =>
                  setChartConfig({
                    ...chartConfig,
                    longField: value === "none" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select longitude field" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem
                    value="none"
                    className="text-white hover:bg-slate-700"
                  >
                    Select longitude field
                  </SelectItem>
                  {numericColumns.map((col: string) => (
                    <SelectItem
                      key={col}
                      value={col}
                      className="text-white hover:bg-slate-700"
                    >
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          // Aggregated mode - show location and value fields
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Field *
              </Label>
              <Select
                value={chartConfig.xAxis || "none"}
                onValueChange={(value) =>
                  setChartConfig({
                    ...chartConfig,
                    xAxis: value === "none" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select location field" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem
                    value="none"
                    className="text-white hover:bg-slate-700"
                  >
                    Select location field
                  </SelectItem>
                  {[...locationColumns, ...categoricalColumns]
                    .filter((col, index, arr) => arr.indexOf(col) === index)
                    .map((col: string) => (
                      <SelectItem
                        key={col}
                        value={col}
                        className="text-white hover:bg-slate-700"
                      >
                        {col}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">
                Aggregation Value Field
              </Label>
              <Select
                value={chartConfig.yAxis || "none"}
                onValueChange={(value) =>
                  setChartConfig({
                    ...chartConfig,
                    yAxis: value === "none" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select value field" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem
                    value="none"
                    className="text-white hover:bg-slate-700"
                  >
                    Count Only
                  </SelectItem>
                  {numericColumns.map((col: string) => (
                    <SelectItem
                      key={col}
                      value={col}
                      className="text-white hover:bg-slate-700"
                    >
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">
              {detectedDataMode === "individual"
                ? "Aggregation Level"
                : "Geographic Level"}
            </Label>
            <Select
              value={chartConfig.selectBy || "province"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  selectBy: value as "area" | "district" | "province",
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="province"
                  className="text-white hover:bg-slate-700"
                >
                  Province
                </SelectItem>
                <SelectItem
                  value="district"
                  className="text-white hover:bg-slate-700"
                >
                  District
                </SelectItem>
                <SelectItem
                  value="area"
                  className="text-white hover:bg-slate-700"
                >
                  Area
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">
              {detectedDataMode === "individual"
                ? "Aggregation Type"
                : "Data Aggregation"}
            </Label>
            <Select
              value={chartConfig.aggregation || "sum"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  aggregation: value as "sum" | "avg" | "count" | "max" | "min",
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select aggregation" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="count"
                  className="text-white hover:bg-slate-700"
                >
                  Count
                </SelectItem>
                <SelectItem
                  value="sum"
                  className="text-white hover:bg-slate-700"
                >
                  Sum
                </SelectItem>
                <SelectItem
                  value="avg"
                  className="text-white hover:bg-slate-700"
                >
                  Average
                </SelectItem>
                <SelectItem
                  value="max"
                  className="text-white hover:bg-slate-700"
                >
                  Maximum
                </SelectItem>
                <SelectItem
                  value="min"
                  className="text-white hover:bg-slate-700"
                >
                  Minimum
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Data Mode</Label>
            <Select
              value={chartConfig.dataMode || "auto"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  dataMode: value as "aggregated" | "individual" | "auto",
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select data mode" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="auto"
                  className="text-white hover:bg-slate-700"
                >
                  Auto Detect
                </SelectItem>
                <SelectItem
                  value="individual"
                  className="text-white hover:bg-slate-700"
                >
                  Individual Points
                </SelectItem>
                <SelectItem
                  value="aggregated"
                  className="text-white hover:bg-slate-700"
                >
                  Aggregated Data
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Map Provider</Label>
            <Select
              value={chartConfig.mapProvider || "cartodb_dark"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  mapProvider: value as
                    | "openstreetmap"
                    | "cartodb_dark"
                    | "cartodb_light"
                    | "satellite",
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select map provider" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="cartodb_dark"
                  className="text-white hover:bg-slate-700"
                >
                  Dark Theme
                </SelectItem>
                <SelectItem
                  value="cartodb_light"
                  className="text-white hover:bg-slate-700"
                >
                  Light Theme
                </SelectItem>
                <SelectItem
                  value="openstreetmap"
                  className="text-white hover:bg-slate-700"
                >
                  OpenStreetMap
                </SelectItem>
                <SelectItem
                  value="satellite"
                  className="text-white hover:bg-slate-700"
                >
                  Satellite
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Color Palette</Label>
            <Select
              value={chartConfig.palette || "YlOrRd"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  palette: value as
                    | "YlOrRd"
                    | "Viridis"
                    | "Plasma"
                    | "Turbo"
                    | "Cividis",
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select color palette" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="YlOrRd"
                  className="text-white hover:bg-slate-700"
                >
                  YlOrRd (Heatmap)
                </SelectItem>
                <SelectItem
                  value="Viridis"
                  className="text-white hover:bg-slate-700"
                >
                  Viridis
                </SelectItem>
                <SelectItem
                  value="Plasma"
                  className="text-white hover:bg-slate-700"
                >
                  Plasma
                </SelectItem>
                <SelectItem
                  value="Turbo"
                  className="text-white hover:bg-slate-700"
                >
                  Turbo
                </SelectItem>
                <SelectItem
                  value="Cividis"
                  className="text-white hover:bg-slate-700"
                >
                  Cividis
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Mode Indicator */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-2 h-2 rounded-full ${
                detectedDataMode === "aggregated"
                  ? "bg-cyan-400"
                  : "bg-green-400"
              }`}
            />
            <span className="text-sm font-medium text-white">
              {detectedDataMode === "aggregated"
                ? "Aggregated Data Mode"
                : "Individual Points Mode"}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            {detectedDataMode === "aggregated"
              ? "Data is pre-aggregated by location. Select the location field and value field to color regions."
              : "Individual data points will be aggregated by geographic regions based on latitude/longitude coordinates."}
          </p>
        </div>
      </div>
    );
  }

  if (chartConfig.type === "map") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Latitude Field *
            </Label>
            <Select
              value={chartConfig.latField || "none"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  latField: value === "none" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select latitude field" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="none"
                  className="text-white hover:bg-slate-700"
                >
                  Select latitude field
                </SelectItem>
                {geographicColumns.map((col: string) => (
                  <SelectItem
                    key={col}
                    value={col}
                    className="text-white hover:bg-slate-700"
                  >
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Longitude Field *
            </Label>
            <Select
              value={chartConfig.longField || "none"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  longField: value === "none" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select longitude field" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="none"
                  className="text-white hover:bg-slate-700"
                >
                  Select longitude field
                </SelectItem>
                {geographicColumns.map((col: string) => (
                  <SelectItem
                    key={col}
                    value={col}
                    className="text-white hover:bg-slate-700"
                  >
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Pin Size Field</Label>
            <Select
              value={chartConfig.sizeBy || "none"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  sizeBy: value === "none" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select size field" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="none"
                  className="text-white hover:bg-slate-700"
                >
                  Default Size
                </SelectItem>
                {numericColumns.map((col: string) => (
                  <SelectItem
                    key={col}
                    value={col}
                    className="text-white hover:bg-slate-700"
                  >
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Legend/Color Field</Label>
            <Select
              value={chartConfig.colorBy || "none"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  colorBy: value === "none" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select color field" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="none"
                  className="text-white hover:bg-slate-700"
                >
                  No Legend
                </SelectItem>
                {categoricalColumns.map((col: string) => (
                  <SelectItem
                    key={col}
                    value={col}
                    className="text-white hover:bg-slate-700"
                  >
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Ping Speed Field</Label>
            <Select
              value={chartConfig.pingSpeedField || "none"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  pingSpeedField: value === "none" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select ping field" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="none"
                  className="text-white hover:bg-slate-700"
                >
                  No Ping Animation
                </SelectItem>
                {numericColumns.map((col: string) => (
                  <SelectItem
                    key={col}
                    value={col}
                    className="text-white hover:bg-slate-700"
                  >
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  // Standard chart field configuration
  if (chartConfig.type !== "kpi") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">
              {chartConfig.type === "pie" || chartConfig.type === "treemap"
                ? "Category"
                : "X-Axis"}
            </Label>
            <Select
              value={chartConfig.xAxis || "none"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  xAxis: value === "none" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="none"
                  className="text-white hover:bg-slate-700"
                >
                  Select column
                </SelectItem>
                {columns.map((col: string) => (
                  <SelectItem
                    key={col}
                    value={col}
                    className="text-white hover:bg-slate-700"
                  >
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">
              {chartConfig.type === "pie" || chartConfig.type === "treemap"
                ? "Value"
                : "Y-Axis"}
            </Label>
            <Select
              value={chartConfig.yAxis || "none"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  yAxis: value === "none" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="none"
                  className="text-white hover:bg-slate-700"
                >
                  Select column
                </SelectItem>
                {numericColumns.map((col: string) => (
                  <SelectItem
                    key={col}
                    value={col}
                    className="text-white hover:bg-slate-700"
                  >
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Options for scatter and other charts */}
        {(chartConfig.type === "scatter" ||
          chartConfig.type === "area" ||
          chartConfig.type === "bar" ||
          chartConfig.type === "line") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">
                Color By (Optional)
              </Label>
              <Select
                value={chartConfig.colorBy || "none"}
                onValueChange={(value) =>
                  setChartConfig({
                    ...chartConfig,
                    colorBy: value === "none" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem
                    value="none"
                    className="text-white hover:bg-slate-700"
                  >
                    None
                  </SelectItem>
                  {categoricalColumns.map((col: string) => (
                    <SelectItem
                      key={col}
                      value={col}
                      className="text-white hover:bg-slate-700"
                    >
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {chartConfig.type === "scatter" && (
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">
                  Size By (Optional)
                </Label>
                <Select
                  value={chartConfig.sizeBy || "none"}
                  onValueChange={(value) =>
                    setChartConfig({
                      ...chartConfig,
                      sizeBy: value === "none" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem
                      value="none"
                      className="text-white hover:bg-slate-700"
                    >
                      None
                    </SelectItem>
                    {numericColumns.map((col: string) => (
                      <SelectItem
                        key={col}
                        value={col}
                        className="text-white hover:bg-slate-700"
                      >
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {chartConfig.type === "pie" && (
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Sub-Category</Label>
            <Select
              value={chartConfig.subCategory || "none"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  subCategory: value === "none" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="none"
                  className="text-white hover:bg-slate-700"
                >
                  Select column
                </SelectItem>
                {columns.map((col) => (
                  <SelectItem
                    key={col}
                    value={col}
                    className="text-white hover:bg-slate-700"
                  >
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  }

  if (chartConfig.type === "kpi") {
    return (
      <div className="space-y-4">
        {/* Basic Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Metric Column</Label>
            <Select
              value={chartConfig.column}
              onValueChange={(value) =>
                setChartConfig({ ...chartConfig, column: value })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {columns.map((col) => (
                  <SelectItem
                    key={col}
                    value={col}
                    className="text-white hover:bg-slate-700"
                  >
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Calculation Type</Label>
            <Select
              value={chartConfig.calculationType || "sum"}
              onValueChange={(value) =>
                setChartConfig({ ...chartConfig, calculationType: value })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {[
                  "sum",
                  "avg",
                  "count",
                  "min",
                  "max",
                  "median",
                  "mode",
                  "distinct",
                  "first",
                  "last",
                  "range",
                  "std",
                  "variance",
                ].map((method) => (
                  <SelectItem
                    key={method}
                    value={method}
                    className="text-white hover:bg-slate-700"
                  >
                    {method.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Format Type</Label>
            <Select
              value={chartConfig.formatType || "auto"}
              onValueChange={(value) =>
                setChartConfig({ ...chartConfig, formatType: value })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {[
                  "auto",
                  "number",
                  "currency",
                  "percentage",
                  "date",
                  "time",
                  "duration",
                  "text",
                ].map((format) => (
                  <SelectItem
                    key={format}
                    value={format}
                    className="text-white hover:bg-slate-700"
                  >
                    {format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Second Row Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Target Value</Label>
            <input
              type="number"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded"
              value={chartConfig.target ?? ""}
              onChange={(e) =>
                setChartConfig({
                  ...chartConfig,
                  target: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Group By</Label>
            <Select
              value={chartConfig.groupBy || "none"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  groupBy: value === "none" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="none"
                  className="text-white hover:bg-slate-700"
                >
                  None
                </SelectItem>
                {columns.map((col) => (
                  <SelectItem
                    key={col}
                    value={col}
                    className="text-white hover:bg-slate-700"
                  >
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Filter By Column</Label>
            <Select
              value={chartConfig.filterBy?.column || "none"}
              onValueChange={(value) =>
                setChartConfig({
                  ...chartConfig,
                  filterBy: {
                    ...(chartConfig.filterBy || {}),
                    column: value === "none" ? undefined : value,
                  },
                })
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select filter column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem
                  value="none"
                  className="text-white hover:bg-slate-700"
                >
                  None
                </SelectItem>
                {columns.map((col) => (
                  <SelectItem
                    key={col}
                    value={col}
                    className="text-white hover:bg-slate-700"
                  >
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Currency Symbol (if currency selected) */}
        {chartConfig.formatType === "currency" && (
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Currency Symbol</Label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded"
              value={chartConfig.currencySymbol || ""}
              onChange={(e) =>
                setChartConfig({
                  ...chartConfig,
                  currencySymbol: e.target.value,
                })
              }
            />
          </div>
        )}

        {/* Filter Value (shown only if filter column is selected) */}
        {chartConfig.filterBy?.column && (
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Filter Value</Label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded"
              value={chartConfig.filterBy.value ?? ""}
              onChange={(e) =>
                setChartConfig({
                  ...chartConfig,
                  filterBy: {
                    ...chartConfig.filterBy!,
                    value: e.target.value,
                  },
                })
              }
            />
          </div>
        )}
      </div>
    );
  }
};

const ChartOptions = ({ chartConfig, setChartConfig }: any) => {
  if (
    chartConfig.type === "table" ||
    chartConfig.type === "map" ||
    chartConfig.type === "kpi" ||
    chartConfig.type === "choropleth"
  )
    return null;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Chart Options
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Color Scheme Selector */}
        <div className="space-y-2">
          <Label className="text-slate-300 text-sm">Color Scheme</Label>
          <Select
            value={chartConfig.colorScheme}
            onValueChange={(value) =>
              setChartConfig({ ...chartConfig, colorScheme: value })
            }
          >
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {Object.entries(COLOR_SCHEMES).map(([name, colors]) => (
                <SelectItem
                  key={name}
                  value={name}
                  className="text-white hover:bg-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {colors.slice(0, 4).map((color, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="capitalize">{name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Show Legend Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-slate-300 text-sm">Show Legend</Label>
          <Switch
            checked={chartConfig.showLegend}
            onCheckedChange={(checked) =>
              setChartConfig({ ...chartConfig, showLegend: checked })
            }
          />
        </div>

        {/* Show Grid Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-slate-300 text-sm">Show Grid</Label>
          <Switch
            checked={chartConfig.showGrid}
            onCheckedChange={(checked) =>
              setChartConfig({ ...chartConfig, showGrid: checked })
            }
          />
        </div>

        {/* Show Tooltip Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-slate-300 text-sm">Show Tooltip</Label>
          <Switch
            checked={chartConfig.showTooltip}
            onCheckedChange={(checked) =>
              setChartConfig({ ...chartConfig, showTooltip: checked })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default function ChartRenderer({
  data,
  columns,
  query,
  // Prompt,
  onBack,
}: ChartRendererProps) {
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: "table",
    title: "Query Results",
    showLegend: false,
    showGrid: true,
    showTooltip: true,
    colorScheme: "default",
    aggregation: "sum",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const itemsPerPage = 10;

  // Convert array data to object format
  const processedData = useMemo(() => {
    if (!data || !columns || data.length === 0) return [];

    return data.map((row, index) => {
      const obj: Record<string, any> = { _index: index };
      columns.forEach((col, colIndex) => {
        obj[col] = row[colIndex];
      });
      return obj;
    });
  }, [data, columns]);

  // Detect field types
  const fieldTypes = useMemo(() => {
    if (!processedData.length) return {};

    const types: Record<
      string,
      "numeric" | "categorical" | "date" | "geographic"
    > = {};

    columns.forEach((col) => {
      const sampleValues = processedData.slice(0, 10).map((row) => row[col]);
      const numericValues = sampleValues.filter(
        (val) => !isNaN(Number(val)) && val !== null && val !== ""
      );

      // Check for geographic data
      if (
        col.toLowerCase().includes("lat") ||
        col.toLowerCase().includes("long") ||
        col.toLowerCase().includes("longitude") ||
        col.toLowerCase().includes("latitude")
      ) {
        types[col] = "geographic";
      }
      // Check for numeric data
      else if (numericValues.length > sampleValues.length * 0.7) {
        types[col] = "numeric";
      }
      // Check for date data
      else if (sampleValues.some((val) => !isNaN(Date.parse(val)))) {
        types[col] = "date";
      }
      // Default to categorical
      else {
        types[col] = "categorical";
      }
    });

    return types;
  }, [processedData, columns]);

  const numericColumns = columns.filter((col) => fieldTypes[col] === "numeric");
  const categoricalColumns = columns.filter(
    (col) => fieldTypes[col] === "categorical"
  );
  const dateColumns = columns.filter((col) => fieldTypes[col] === "date");
  const geographicColumns = columns.filter(
    (col) => fieldTypes[col] === "geographic"
  );

  // Auto-suggest chart configuration
  const suggestedCharts = useMemo(() => {
    const suggestions: ChartType[] = ["table"];

    if (
      numericColumns.length >= 2 ||
      (numericColumns.length >= 1 &&
        (categoricalColumns.length >= 1 || dateColumns.length >= 1))
    ) {
      suggestions.push("bar", "line", "area", "pie");
    }
    if (numericColumns.length >= 2) {
      suggestions.push("scatter");
    }
    if (numericColumns.length >= 1) {
      suggestions.push("kpi", "radialbar");
    }
    if (
      true ||
      geographicColumns.length >= 2 ||
      numericColumns.some(
        (col) =>
          col.toLowerCase().includes("lat") ||
          col.toLowerCase().includes("long") ||
          col.toLowerCase().includes("longitude") ||
          col.toLowerCase().includes("latitude")
      )
    ) {
      suggestions.push("map", "choropleth");
    }
    if (categoricalColumns.length >= 1 && numericColumns.length >= 1) {
      suggestions.push("treemap", "heatmap");
    }

    return suggestions;
  }, [numericColumns, categoricalColumns, geographicColumns]);

  // Auto-initialize map fields
  useMemo(() => {
    if (
      (chartConfig.type === "map" || chartConfig.type === "choropleth") &&
      !chartConfig.latField &&
      !chartConfig.longField
    ) {
      const latFields = columns.filter(
        (col) =>
          // col.toLowerCase().includes("lat") &&
          fieldTypes[col] === "numeric"
      );
      const longFields = columns.filter(
        (col) =>
          // (col.toLowerCase().includes("long") ||
          //   col.toLowerCase().includes("long")) &&
          fieldTypes[col] === "numeric"
      );

      if (latFields.length > 0 && longFields.length > 0) {
        setChartConfig((prev) => ({
          ...prev,
          latField: latFields[0],
          longField: longFields[0],
        }));
      }
    }
  }, [chartConfig.type, columns, fieldTypes]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = processedData;

    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (fieldTypes[sortColumn] === "numeric") {
          const aNum = Number(aVal) || 0;
          const bNum = Number(bVal) || 0;
          return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
        } else {
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          if (sortDirection === "asc") {
            return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
          } else {
            return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
          }
        }
      });
    }

    return filtered;
  }, [processedData, searchTerm, sortColumn, sortDirection, fieldTypes]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Prepare chart data with aggregation - uses filtered/sorted data for all visualizations
  const chartData = useMemo(() => {
    const sourceData = filteredData; // Always use filtered/sorted data for consistency

    if (chartConfig.type === "choropleth") {
      if (!chartConfig.latField || !chartConfig.longField) return [];

      return sourceData.map((item, index) => ({
        id: `point-${index}`,
        name: item[chartConfig.xAxis || "name"] || `Point ${index + 1}`,
        latitude: Number(item[chartConfig.latField]) || 0,
        longitude: Number(item[chartConfig.longField]) || 0,
        value: chartConfig.yAxis ? Number(item[chartConfig.yAxis]) || 0 : 1,
        category: chartConfig.colorBy
          ? String(item[chartConfig.colorBy])
          : "default",
        ...item,
      }));
    }

    if (chartConfig.type === "map") {
      if (!chartConfig.latField || !chartConfig.longField) return [];

      return sourceData.map((item, index) => ({
        id: `point-${index}`,
        name: item[chartConfig.xAxis || "name"] || `Point ${index + 1}`,
        latitude: Number(item[chartConfig.latField]) || 0,
        longitude: Number(item[chartConfig.longField]) || 0,
        value: chartConfig.sizeBy
          ? Number(item[chartConfig.sizeBy]) || 0
          : Math.random() * 100,
        category: chartConfig.colorBy
          ? String(item[chartConfig.colorBy])
          : "default",
        ping_speed: chartConfig.pingSpeedField
          ? Number(item[chartConfig.pingSpeedField]) || 50
          : Math.random() * 100 + 20,
        ...item,
      }));
    }

    if (
      (chartConfig.type === "kpi" && !chartConfig.column) ||
      (chartConfig.type !== "kpi" && (!chartConfig.xAxis || !chartConfig.yAxis))
    )
      return [];

    const colors =
      COLOR_SCHEMES[chartConfig.colorScheme as keyof typeof COLOR_SCHEMES] ||
      COLOR_SCHEMES.default;

    if (chartConfig.type === "heatmap") {
      const xValues = [
        ...new Set(sourceData.map((row) => row[chartConfig.xAxis!])),
      ];
      const yValues = [
        ...new Set(sourceData.map((row) => row[chartConfig.yAxis!])),
      ];

      const heatmapData = [];
      for (let x = 0; x < xValues.length; x++) {
        for (let y = 0; y < yValues.length; y++) {
          const matchingRows = sourceData.filter(
            (row) =>
              row[chartConfig.xAxis!] === xValues[x] &&
              row[chartConfig.yAxis!] === yValues[y]
          );
          const value =
            matchingRows.length > 0
              ? matchingRows.reduce(
                  (sum, row) => sum + (Number(row[chartConfig.yAxis!]) || 0),
                  0
                ) / matchingRows.length
              : 0;

          heatmapData.push({
            x: xValues[x],
            y: yValues[y],
            value: value,
            color:
              colors[
                Math.floor(
                  (value /
                    Math.max(
                      ...sourceData.map(
                        (r) => Number(r[chartConfig.yAxis!]) || 0
                      )
                    )) *
                    colors.length
                )
              ],
          });
        }
      }
      return heatmapData;
    }

    if (chartConfig.type === "kpi" && chartConfig.column) {
      return sourceData;
    }

    // Build color map based on colorBy field
    const colorMap: Record<string, string> = {};
    if (chartConfig.colorBy) {
      const uniqueCategories = [
        ...new Set(sourceData.map((row) => row[chartConfig.colorBy!])),
      ];
      uniqueCategories.forEach((category, idx) => {
        colorMap[String(category)] = colors[idx % colors.length];
      });
    }

    // Final chart data mapping for bar/line/area/etc.
    return sourceData;
  }, [processedData, filteredData, chartConfig, numericColumns]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleDownloadCSV = () => {
    console.log("Downloading CSV...");
    if (!filteredData || filteredData.length === 0) {
      alert("No data available to export");
      return;
    }

    // Use the original columns, excluding the internal _index field
    const headers = columns.filter((col) => col !== "_index");
    const csvRows = [headers.join(",")];

    for (const row of filteredData) {
      const values = headers.map((header) => {
        const escaped = ("" + (row[header] ?? "")).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }

    // Add BOM for Excel compatibility
    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    const fileName = `chart_data_${new Date().toISOString().slice(0, 10)}.csv`;
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-200">
                {entry.name}:{" "}
                <strong>
                  {typeof entry.value === "number"
                    ? entry.value.toLocaleString()
                    : entry.value}
                </strong>
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (!chartData.length && chartConfig.type !== "table") {
      return (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Configure visualization properties to display</p>
          </div>
        </div>
      );
    }

    const colors =
      COLOR_SCHEMES[chartConfig.colorScheme as keyof typeof COLOR_SCHEMES] ||
      COLOR_SCHEMES.default;

    switch (chartConfig.type) {
      case "choropleth":
        if (!chartConfig.latField || !chartConfig.longField) {
          return (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  Configure latitude and longitude fields to display choropleth
                  map
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="h-[500px]">
            <GeoChoroplethMap
              data={chartData}
              config={{
                opacity: 0.7,
                showPoints: true,
                showBorders: true,
                selectBy: chartConfig.selectBy || "province",
                Aggregation: chartConfig.yAxis ? "sum" : "count",
                AggregationField: chartConfig.yAxis,
                mapProvider: chartConfig.mapProvider || "cartodb_dark",
                palette: chartConfig.palette || "YlOrRd",
                dataMode: chartConfig.dataMode || "auto",
              }}
              className="w-full h-full"
            />
          </div>
        );

      case "map":
        if (!chartConfig.latField || !chartConfig.longField) {
          return (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Configure latitude and longitude fields to display map</p>
              </div>
            </div>
          );
        }
        return (
          <div className="bg-red-600 h-[500px]">
            <CustomizableMap
              element={{
                id: "map-01",
                type: "map",
                position: { x: 0, y: 0 },
                size: { width: 600, height: 400 },
                config: {
                  latitudeField: { id: "latitude", name: "Latitude" },
                  longitudeField: { id: "longitude", name: "Longitude" },
                  sizeField: "utilization_rate",
                  colorField: "area",
                  pingSpeedField: { id: "ping_speed", name: "Ping Speed" },
                  showLegend: true,
                  center: { lat: 7, lng: 80 },
                  zoom: 6,
                  categoryField: "type",
                },
              }}
              dataSources={[
                {
                  id: "mapData",
                  name: "Station Points",
                  data: [
                    {
                      id: "1",
                      name: "Station Alpha",
                      latitude: 7.123456,
                      longitude: 80.123456,
                      type: "Battery Swap",
                      area: "Ampara",
                      utilization_rate: 75,
                      ping_speed: 100,
                      timestamp: "2024-07-01T08:00:00Z",
                      status: "active",
                    },
                    {
                      id: "2",
                      name: "Station Beta",
                      latitude: 6.987654,
                      longitude: 79.876543,
                      type: "Battery Swap",
                      area: "Colombo",
                      utilization_rate: 90,
                      ping_speed: 85,
                      timestamp: "2024-07-01T08:05:00Z",
                      status: "warning",
                    },
                  ],
                },
              ]}
            />
          </div>
        );

      case "bar":
        return (
          <BarChartComponent
            chartData={chartData}
            chartConfig={chartConfig}
            colors={colors}
          />
        );

      case "line":
        return (
          <LineChartComponent
            chartData={chartData}
            chartConfig={chartConfig}
            colors={colors}
            TooltipComponent={CustomTooltip}
          />
        );

      case "area":
        return (
          <AreaChartComponent
            chartData={chartData}
            chartConfig={chartConfig}
            colors={colors}
            TooltipComponent={CustomTooltip}
          />
        );

      case "scatter":
        return (
          <ScatterChartComponent
            chartData={chartData}
            chartConfig={chartConfig}
            colors={colors}
            TooltipComponent={CustomTooltip}
          />
        );

      case "pie":
        return (
          <PieChartComponent
            chartData={chartData}
            chartConfig={chartConfig}
            colors={colors}
            TooltipComponent={CustomTooltip}
          />
        );

      case "kpi":
        return <KPIComponent chartData={chartData} chartConfig={chartConfig} />;

      case "treemap":
        return (
          <TreemapChartComponent
            chartData={chartData}
            chartConfig={chartConfig}
            colors={colors}
          />
        );

      case "radialbar":
        return (
          <RadialBarChartComponent
            chartData={chartData}
            chartConfig={chartConfig}
            colors={colors}
          />
        );

      case "heatmap":
        return (
          <Heatmap
            chartData={chartData}
            chartConfig={chartConfig}
            colors={colors}
          />
        );

      case "table":
      default:
        return (
          <div className="space-y-4">
            {/* Table Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search data..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <Badge variant="outline" className="text-slate-300">
                  {filteredData.length} rows
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {/* <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 bg-transparent"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button> */}
                {/* <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 bg-transparent"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button> */}
              </div>
            </div>

            {/* Data Table */}
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <ScrollArea className="w-full">
                <div className="w-full overflow-x-auto">
                  {/* Removed min-w-[900px] wrapper here */}
                  <Table
                    className="w-full table-auto"
                    style={{ tableLayout: "auto" }}
                  >
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        {columns.map((column) => (
                          <TableHead
                            key={column}
                            className="text-slate-300 cursor-pointer hover:text-white whitespace-nowrap px-3 py-2 min-w-[120px]"
                            onClick={() => handleSort(column)}
                          >
                            <div className="flex items-center gap-2">
                              {column}
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  fieldTypes[column] === "numeric"
                                    ? "text-blue-400 border-blue-400/30"
                                    : fieldTypes[column] === "date"
                                    ? "text-green-400 border-green-400/30"
                                    : fieldTypes[column] === "geographic"
                                    ? "text-purple-400 border-purple-400/30"
                                    : "text-slate-400 border-slate-600"
                                }`}
                              >
                                {fieldTypes[column] === "numeric"
                                  ? "123"
                                  : fieldTypes[column] === "date"
                                  ? "📅"
                                  : fieldTypes[column] === "geographic"
                                  ? "🌍"
                                  : "ABC"}
                              </Badge>
                              {sortColumn === column && (
                                <span className="text-cyan-400">
                                  {sortDirection === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((row, index) => (
                        <TableRow
                          key={index}
                          className="border-slate-700 hover:bg-slate-800/50"
                        >
                          {columns.map((column) => (
                            <TableCell
                              key={column}
                              className="text-slate-300 whitespace-nowrap px-3 py-2 min-w-[120px]"
                            >
                              {fieldTypes[column] === "numeric"
                                ? Number(row[column]).toLocaleString()
                                : String(row[column] || "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredData.length)} of{" "}
                  {filteredData.length} results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="border-slate-600 text-slate-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="border-slate-600 text-slate-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  const getChartIcon = (type: ChartType) => {
    const chartType = CHART_TYPES.find((t) => t.id === type);
    return chartType ? (
      <chartType.icon className="h-4 w-4" />
    ) : (
      <BarChart3 className="h-4 w-4" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {onBack && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="text-slate-400 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <CardTitle className="text-white">Query</CardTitle>
              </div>
              {/* <p className="text-sm text-slate-400 font-mono bg-slate-900/50 p-2 rounded">
                {Prompt}
              </p> */}
              <p className="text-sm text-slate-400 font-mono bg-slate-900/50 p-2 rounded">
                {query}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                title="Dataset dimensions"
                className="text-slate-300 mt-7 ml-3 text-center p-2 whitespace-nowrap"
              >
                {processedData?.length || 0} rows × {columns?.length || 0}{" "}
                columns
              </Badge>

              {/* <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 bg-transparent"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button> */}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Chart Configuration */}
        <div className="space-y-4">
          <ChartTypeSelector
            chartConfig={chartConfig}
            setChartConfig={setChartConfig}
            suggestedCharts={suggestedCharts}
          />

          <ChartOptions
            chartConfig={chartConfig}
            setChartConfig={setChartConfig}
          />
        </div>

        {/* Main Content - Chart Display */}
        <div className="lg:col-span-3">
          {/* Chart Display */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  {getChartIcon(chartConfig.type)}
                  {chartConfig.title ||
                    `${
                      chartConfig.type.charAt(0).toUpperCase() +
                      chartConfig.type.slice(1)
                    } View`}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 bg-transparent"
                    onClick={handleDownloadCSV}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>{renderChart()}</CardContent>
          </Card>

          {/* Field Configuration Panel */}
          {chartConfig.type !== "table" && (
            <Card className="bg-slate-800/50 border-slate-700 mt-6">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {chartConfig.type === "map"
                    ? "Map Configuration"
                    : "Field Configuration"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FieldConfiguration
                  chartConfig={chartConfig}
                  setChartConfig={setChartConfig}
                  columns={columns}
                  numericColumns={numericColumns}
                  categoricalColumns={categoricalColumns}
                  geographicColumns={geographicColumns}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
