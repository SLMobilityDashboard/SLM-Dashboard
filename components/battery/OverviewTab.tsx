import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

interface BatteryAnalyticsData {
  bmsId: string;
  batteryId: string;
  serialNo: string;
  vendorName: string;
  vendorCountry: string;
  batteryTypeName: string;
  batteryCapacity: string;
  manufactureDate: string;
  tboxId: string;
  batVolt: number;
  batCurrent: number;
  batTemp: number;
  batSOH: number;
  batCycleCount: number;
  batteryError: string;
  lastTelemetryTime: string;
  lastPulseTime: string;
  totalDistanceTraveled: number;
  avgDistancePerCycle: number;
  dataIngestionTime: string;
  bssSingleVol: string;
  bssVoltageTimestamp: string;
  telemetryStatus: string;
  telemetryAgeHours: number;
  dataSource: string;
  status: string;
}

interface OverviewTabProps {
  bmsId: string;
  batteryData: BatteryAnalyticsData;
}

const OverviewTab = ({ bmsId, batteryData }: OverviewTabProps) => {
  const [cellVoltages, setCellVoltages] = useState<CellVoltage[]>([]);

  useEffect(() => {
    // Parse cell voltages from bssSingleVol field
    if (batteryData?.bssSingleVol) {
      try {
        const voltagesArray = JSON.parse(batteryData.bssSingleVol);
        const parsedCellVoltages: CellVoltage[] = voltagesArray.map(
          (voltage: number, index: number) => {
            let status: "OK" | "Warning" | "Critical" = "OK";

            // Define voltage thresholds
            if (voltage < 2.6 || voltage > 4.25) {
              status = "Critical";
            } else if (voltage < 2.8 || voltage > 4.1) {
              status = "Warning";
            }

            return {
              cell: index + 1,
              voltage: voltage,
              status: status,
            };
          }
        );
        setCellVoltages(parsedCellVoltages);
      } catch (parseError) {
        console.error("Error parsing cell voltages:", parseError);
        setCellVoltages([]);
      }
    }
  }, [batteryData]);

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

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || "";
    if (
      statusLower.includes("active") ||
      statusLower.includes("good") ||
      statusLower === "online"
    ) {
      return "border-green-500/20 text-green-400 bg-green-500/10";
    }
    if (statusLower.includes("warning") || statusLower === "stale") {
      return "border-yellow-500/20 text-yellow-400 bg-yellow-500/10";
    }
    if (statusLower === "offline") {
      return "border-red-500/20 text-red-400 bg-red-500/10";
    }
    return "border-slate-500/20 text-slate-400 bg-slate-500/10";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "—";
    }
  };

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "—";
    }
  };

  const calculateAge = (manufactureDate: string | null) => {
    if (!manufactureDate) return 0;
    try {
      const mfgDate = new Date(manufactureDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - mfgDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  };

  const getTelemetryMessage = (status: string, ageHours: number) => {
    if (status === "OFFLINE" || ageHours > 72) {
      return `No signal for ${Math.floor(ageHours / 24)} days`;
    }
    if (status === "STALE" || ageHours > 24) {
      return `Signal delayed by ${ageHours} hours`;
    }
    return "Connected";
  };

  const batteryAge = calculateAge(batteryData.manufactureDate);
  const telemetryMessage = getTelemetryMessage(
    batteryData.telemetryStatus,
    batteryData.telemetryAgeHours
  );

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
            <Badge
              variant="outline"
              className={getStatusColor(batteryData.status)}
            >
              {batteryData.telemetryStatus === "ONLINE" && (
                <CheckCircle className="w-3 h-3 mr-1" />
              )}
              {batteryData.telemetryStatus === "STALE" && (
                <AlertTriangle className="w-3 h-3 mr-1" />
              )}
              {batteryData.telemetryStatus === "OFFLINE" && (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              {batteryData.telemetryStatus || "Unknown"}
            </Badge>
          </div>
          <CardDescription className="text-slate-400">
            Real-time battery monitoring and health metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Primary Identifiers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Battery BMS ID
                </div>
                <div className="font-mono text-lg text-slate-100">
                  {batteryData.bmsId}
                </div>
              </div>
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Battery ID
                </div>
                <div className="font-mono text-lg text-slate-100">
                  {batteryData.batteryId || "—"}
                </div>
              </div>
              <Battery className="w-5 h-5 text-cyan-400" />
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
            <div
              className={`flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border ${
                batteryData.telemetryStatus === "ONLINE"
                  ? "border-green-500/20"
                  : batteryData.telemetryStatus === "STALE"
                  ? "border-amber-500/20"
                  : "border-red-500/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <Signal
                  className={`w-5 h-5 ${
                    batteryData.telemetryStatus === "ONLINE"
                      ? "text-green-400"
                      : batteryData.telemetryStatus === "STALE"
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}
                />
                <div>
                  <div className="text-sm font-medium text-slate-400">
                    Signal Status
                  </div>
                  <div className="text-slate-100">{telemetryMessage}</div>
                </div>
              </div>
              {batteryData.telemetryStatus === "ONLINE" ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : batteryData.telemetryStatus === "STALE" ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div>
                  <div className="text-sm font-medium text-slate-400">
                    Last Telemetry
                  </div>
                  <div className="text-slate-100 text-sm">
                    {formatDate(batteryData.lastTelemetryTime)}
                  </div>
                </div>
                <Database className="w-5 h-5 text-cyan-400" />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div>
                  <div className="text-sm font-medium text-slate-400">
                    Last Pulse
                  </div>
                  <div className="text-slate-100 text-sm">
                    {formatDate(batteryData.lastPulseTime)}
                  </div>
                </div>
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-400 mb-1">
                    Telemetry Age
                  </div>
                  <div className="text-slate-100">
                    {batteryData.telemetryAgeHours} hours (
                    {Math.floor(batteryData.telemetryAgeHours / 24)} days)
                  </div>
                </div>
                <Clock
                  className={`w-5 h-5 ${
                    batteryData.telemetryAgeHours < 24
                      ? "text-green-400"
                      : batteryData.telemetryAgeHours < 72
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cell Voltages Card */}
      {cellVoltages.length > 0 && (
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
                {formatDate(batteryData.bssVoltageTimestamp)}
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
                      Cell {cell.cell}: {cell.voltage.toFixed(3)}V -{" "}
                      {cell.status}
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
                <span className="text-sm text-slate-400">
                  Normal (2.8V-4.1V)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded border-2"
                  style={{
                    backgroundColor: "#f59e0b20",
                    borderColor: "#f59e0b60",
                  }}
                ></div>
                <span className="text-sm text-slate-400">
                  Warning (2.6V-2.8V or 4.1V-4.25V)
                </span>
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
      )}

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
                {batteryData.totalDistanceTraveled?.toFixed(1) || 0} km
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg">
              <div className="text-sm text-slate-400 mb-2">Total Cycles</div>
              <div className="text-2xl font-bold text-blue-400">
                {batteryData.batCycleCount || 0}
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
              <div className="text-sm text-slate-400 mb-2">Avg per Cycle</div>
              <div className="text-2xl font-bold text-green-400">
                {batteryData.avgDistancePerCycle?.toFixed(1) || 0} km
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-lg">
              <div className="text-sm text-slate-400 mb-2">State of Health</div>
              <div className="text-2xl font-bold text-orange-400">
                {batteryData.batSOH || 0}%
              </div>
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
                  {batteryData.vendorName || "—"}
                </div>
              </div>
              <Package className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Model / Type
                </div>
                <div className="text-slate-100 font-medium">
                  {batteryData.batteryTypeName || "—"}
                </div>
              </div>
              <Battery className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Capacity
                </div>
                <div className="text-slate-100 font-medium">
                  {batteryData.batteryCapacity || "—"}
                </div>
              </div>
              <Zap className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Serial Number
                </div>
                <div className="text-slate-100 font-medium font-mono text-sm">
                  {batteryData.serialNo || "—"}
                </div>
              </div>
              <Info className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Manufacture Date
                </div>
                <div className="text-slate-100 font-medium">
                  {formatShortDate(batteryData.manufactureDate)}
                </div>
              </div>
              <Calendar className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Battery Age
                </div>
                <div className="text-slate-100 font-medium">
                  {batteryAge} days ({(batteryAge / 365).toFixed(1)} years)
                </div>
              </div>
              <Clock className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Country of Origin
                </div>
                <div className="text-slate-100 font-medium">
                  {batteryData.vendorCountry || "—"}
                </div>
              </div>
              <MapPin className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <div className="text-sm font-medium text-slate-400 mb-1">
                  Last known location
                </div>
                <div className="text-slate-100 font-medium font-mono text-sm">
                  {batteryData.tboxId || "—"}
                </div>
              </div>
              <Database className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
