import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Percent,
  ThermometerSun,
  MapPin,
  AlertTriangle,
  Info,
  Activity,
  Signal,
  Database,
  Battery,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Package,
} from "lucide-react";

interface CellVoltage {
  cell: number;
  voltage: number;
  status: "OK" | "Warning" | "Critical";
}

interface BatteryDetail {
  bmsId: string;
  batteryManufacturer: string;
  batteryModel: string;
  manufactureDate: Date;
  firstUsageDate: Date;
  ageInDays: number;
  status: string;
  stateOfChargeDistribution: Array<{
    range: string;
    hours: number;
    percentage: number;
  }>;
  temperatureDistribution: Array<{
    range: string;
    hours: number;
    percentage: number;
  }>;
}

interface OverviewTabProps {
  battery: BatteryDetail;
  cellVoltages?: CellVoltage[];
  lastLocation?: string;
  health?: number;
  warnings?: number;
  info?: number;
  totalDistance?: number;
  totalCycles?: number;
  avgPerCycle?: number;
  soh?: number;
  lastSignal?: string;
  telemetryAge?: string;
  lastUpdate?: string;
}

const OverviewTab = ({
  battery,
  cellVoltages = Array.from({ length: 20 }, (_, i) => ({
    cell: i + 1,
    voltage: 3.33,
    status: "OK" as const,
  })),
  lastLocation = "Kurunagala Station-Cabinet-2",
  health = 86,
  warnings = 1,
  info = 1,
  totalDistance = 44,
  totalCycles = 15,
  avgPerCycle = 3.0,
  soh = 95,
  lastSignal = "No signal for 3 days",
  telemetryAge = "4 days old",
  lastUpdate = "6/19/2025, 12:59:37 AM",
}: OverviewTabProps) => {
  // Calculate cell voltage stats
  const voltages = cellVoltages.map((c) => c.voltage);
  const minVoltage = voltages.length > 0 ? Math.min(...voltages) : 0;
  const maxVoltage = voltages.length > 0 ? Math.max(...voltages) : 0;
  const avgVoltage =
    voltages.length > 0
      ? voltages.reduce((a, b) => a + b, 0) / voltages.length
      : 0;
  const spreadVoltage = maxVoltage - minVoltage;

  const getCellColor = (status: string) => {
    switch (status) {
      case "Critical":
        return "#ef4444";
      case "Warning":
        return "#f59e0b";
      default:
        return "#10b981";
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return "text-green-400";
    if (health >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("active") || statusLower.includes("good")) {
      return "border-green-500/20 text-green-400 bg-green-500/10";
    }
    if (statusLower.includes("warning")) {
      return "border-yellow-500/20 text-yellow-400 bg-yellow-500/10";
    }
    return "border-slate-500/20 text-slate-400 bg-slate-500/10";
  };

  return (
    <div className="space-y-6">
      {/* Battery Header Card */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className="w-5 h-5 text-cyan-400" />
              <CardTitle className="text-lg text-slate-100">
                Battery Overview
              </CardTitle>
            </div>
            <Badge variant="outline" className={getStatusColor(battery.status)}>
              <CheckCircle className="w-3 h-3 mr-1" />
              {battery.status}
            </Badge>
          </div>
          <CardDescription className="text-slate-400">
            Real-time battery monitoring and health metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Primary Identifiers */}
          <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <div>
              <div className="text-sm font-medium text-slate-400 mb-1">
                Battery BMS ID
              </div>
              <div className="font-mono text-lg text-slate-100">
                {battery.bmsId}
              </div>
            </div>
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-700/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Health Score</p>
                <p className={`text-3xl font-bold ${getHealthColor(health)}`}>
                  {health}
                </p>
              </div>
              <Activity className={`h-8 w-8 ${getHealthColor(health)}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">State of Health</p>
                <p className="text-3xl font-bold text-blue-400">{soh}%</p>
              </div>
              <Percent className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/20 to-amber-800/10 border-amber-700/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Warnings</p>
                <p className="text-3xl font-bold text-amber-400">{warnings}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 border-cyan-700/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Info</p>
                <p className="text-3xl font-bold text-cyan-400">{info}</p>
              </div>
              <Info className="h-8 w-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location & Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Location Card */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              <CardTitle className="text-lg text-slate-100">
                Last Known Location
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg">
              <div className="text-slate-100 font-medium mb-1">
                {lastLocation}
              </div>
              <div className="text-sm text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last updated: {lastUpdate}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connectivity Status Card */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Signal className="w-5 h-5 text-orange-400" />
              <CardTitle className="text-lg text-slate-100">
                Connectivity Status
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-3">
                  <Signal className="w-5 h-5 text-red-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-400">
                      Signal Status
                    </div>
                    <div className="text-slate-100">{lastSignal}</div>
                  </div>
                </div>
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-400">
                      Telemetry Data
                    </div>
                    <div className="text-slate-100">{telemetryAge}</div>
                  </div>
                </div>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cell Voltages Card */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <CardTitle className="text-lg text-slate-100">
                Cell Voltages ({cellVoltages.length} cells)
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              <Clock className="w-3 h-3 mr-1" />
              {lastUpdate}
            </Badge>
          </div>
          <CardDescription className="text-slate-400">
            Individual cell voltage monitoring and balance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Voltage Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="text-sm text-slate-400 mb-1">Min Voltage</div>
              <div className="text-lg font-semibold text-slate-100">
                {minVoltage.toFixed(3)}V
              </div>
            </div>
            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="text-sm text-slate-400 mb-1">Max Voltage</div>
              <div className="text-lg font-semibold text-slate-100">
                {maxVoltage.toFixed(3)}V
              </div>
            </div>
            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="text-sm text-slate-400 mb-1">Avg Voltage</div>
              <div className="text-lg font-semibold text-slate-100">
                {avgVoltage.toFixed(3)}V
              </div>
            </div>
            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="text-sm text-slate-400 mb-1">Spread</div>
              <div className="text-lg font-semibold text-slate-100">
                {spreadVoltage.toFixed(3)}V
              </div>
            </div>
          </div>

          {/* Cell Visualization */}
          <div className="mb-4">
            <div className="text-sm font-medium text-slate-400 mb-3">
              Cell Status Visualization
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2">
              {cellVoltages.map((cell) => (
                <div key={cell.cell} className="relative group">
                  <div
                    className="h-20 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105 cursor-pointer border-2"
                    style={{
                      backgroundColor: getCellColor(cell.status) + "20",
                      borderColor: getCellColor(cell.status) + "60",
                    }}
                  >
                    <span className="text-xs text-slate-400 mb-1">
                      Cell {cell.cell}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: getCellColor(cell.status) }}
                    >
                      {cell.voltage.toFixed(3)}V
                    </span>
                    <span
                      className="text-xs mt-1"
                      style={{ color: getCellColor(cell.status) }}
                    >
                      {cell.status}
                    </span>
                  </div>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Cell {cell.cell}: {cell.voltage.toFixed(3)}V - {cell.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-6 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border-2"
                style={{
                  backgroundColor: "#10b98120",
                  borderColor: "#10b98160",
                }}
              ></div>
              <span className="text-sm text-slate-400">Normal</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border-2"
                style={{
                  backgroundColor: "#f59e0b20",
                  borderColor: "#f59e0b60",
                }}
              ></div>
              <span className="text-sm text-slate-400">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border-2"
                style={{
                  backgroundColor: "#ef444420",
                  borderColor: "#ef444460",
                }}
              ></div>
              <span className="text-sm text-slate-400">
                Critical (&lt;2.6V or &gt;4.25V)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Metrics Card */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <CardTitle className="text-lg text-slate-100">
              Usage Metrics
            </CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            Battery usage statistics and performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
              <div className="text-sm text-slate-400 mb-2">Total Distance</div>
              <div className="text-2xl font-bold text-purple-400">
                {totalDistance} km
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg">
              <div className="text-sm text-slate-400 mb-2">Total Cycles</div>
              <div className="text-2xl font-bold text-blue-400">
                {totalCycles}
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
              <div className="text-sm text-slate-400 mb-2">Avg per Cycle</div>
              <div className="text-2xl font-bold text-green-400">
                {avgPerCycle.toFixed(1)} km
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-lg">
              <div className="text-sm text-slate-400 mb-2">State of Health</div>
              <div className="text-2xl font-bold text-orange-400">{soh}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Battery Specifications Card */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            <CardTitle className="text-lg text-slate-100">
              Battery Specifications
            </CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            Technical specifications and manufacturing details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Manufacturer
                </div>
                <div className="text-slate-100 font-medium">
                  {battery.batteryManufacturer}
                </div>
              </div>
              <Package className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Model
                </div>
                <div className="text-slate-100 font-medium">
                  {battery.batteryModel}
                </div>
              </div>
              <Battery className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Manufacture Date
                </div>
                <div className="text-slate-100 font-medium">
                  {battery.manufactureDate
                    ? new Date(battery.manufactureDate).toLocaleDateString()
                    : "—"}
                </div>
              </div>
              <Calendar className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  First Usage Date
                </div>
                <div className="text-slate-100 font-medium">
                  {battery.firstUsageDate
                    ? new Date(battery.firstUsageDate).toLocaleDateString()
                    : "—"}
                </div>
              </div>
              <Clock className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 md:col-span-2">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Battery Age
                </div>
                <div className="text-slate-100 font-medium">
                  {battery.ageInDays} days
                </div>
              </div>
              <Activity className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
