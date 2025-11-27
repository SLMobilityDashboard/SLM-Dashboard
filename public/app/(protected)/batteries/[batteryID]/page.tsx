"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Battery,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Activity,
  Gauge,
  ThermometerSun,
  Clock,
  MapPin,
  ArrowLeft,
  Calendar,
  Wrench,
} from "lucide-react";
import Link from "next/link";

// Types
interface BatteryDetails {
  BATTERY_ID: string;
  BATTERY_TYPE: string;
  VEHICLE_ID?: string;
  STATUS: string;
  HEALTH_PERCENTAGE: number;
  CHARGE_LEVEL: number;
  TEMPERATURE: number;
  CYCLE_COUNT: number;
  VOLTAGE: number;
  CURRENT: number;
  CAPACITY_MAH: number;
  MANUFACTURE_DATE: Date;
  LAST_SWAP_DATE?: Date;
  LOCATION?: string;
  STATION_ID?: string;
  SERIAL_NUMBER: string;
  MANUFACTURER: string;
  WARRANTY_EXPIRY: Date;
}

interface BatterySession {
  SESSION_ID: string;
  START_TIME: Date;
  END_TIME?: Date;
  SESSION_TYPE: "CHARGING" | "DISCHARGING" | "SWAP";
  START_CHARGE: number;
  END_CHARGE?: number;
  DURATION_MINUTES?: number;
  STATION_ID?: string;
  VEHICLE_ID?: string;
}

interface MaintenanceRecord {
  MAINTENANCE_ID: string;
  DATE: Date;
  TYPE: string;
  DESCRIPTION: string;
  TECHNICIAN: string;
  STATUS: string;
  COST?: number;
}

// Component: Loading State
const LoadingState = () => (
  <div className="min-h-screen p-6">
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-slate-300">Loading battery details...</span>
        </div>
      </div>
    </div>
  </div>
);

// Component: Error State
const ErrorState = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => (
  <div className="min-h-screen p-6">
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-center h-64">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-red-400 font-medium mb-2">
              Error Loading Data
            </h3>
            <p className="text-slate-400 text-sm mb-4">{error}</p>
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

// Component: Battery Overview
const BatteryOverview = ({ battery }: { battery: BatteryDetails }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "charging":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "in_use":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "maintenance":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "faulty":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return "text-green-400";
    if (health >= 60) return "text-yellow-400";
    if (health >= 40) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Basic Info */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Battery className="w-5 h-5 text-green-400" />
            Battery Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-slate-400 text-sm">Battery ID</p>
            <p className="text-slate-200 font-mono">{battery.BATTERY_ID}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Serial Number</p>
            <p className="text-slate-200 font-mono">{battery.SERIAL_NUMBER}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Type</p>
            <p className="text-slate-200">{battery.BATTERY_TYPE}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Manufacturer</p>
            <p className="text-slate-200">{battery.MANUFACTURER}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Status</p>
            <Badge className={getStatusColor(battery.STATUS)}>
              {battery.STATUS.replace("_", " ")}
            </Badge>
          </div>
          {battery.VEHICLE_ID && (
            <div>
              <p className="text-slate-400 text-sm">Current Vehicle</p>
              <p className="text-slate-200 font-mono">{battery.VEHICLE_ID}</p>
            </div>
          )}
          {battery.LOCATION && (
            <div>
              <p className="text-slate-400 text-sm">Location</p>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <p className="text-slate-200">{battery.LOCATION}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health & Performance */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-cyan-400" />
            Health & Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-slate-400 text-sm">Health Percentage</p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    battery.HEALTH_PERCENTAGE >= 80
                      ? "bg-green-500"
                      : battery.HEALTH_PERCENTAGE >= 60
                      ? "bg-yellow-500"
                      : battery.HEALTH_PERCENTAGE >= 40
                      ? "bg-orange-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${battery.HEALTH_PERCENTAGE}%` }}
                />
              </div>
              <span
                className={`font-medium ${getHealthColor(
                  battery.HEALTH_PERCENTAGE
                )}`}
              >
                {battery.HEALTH_PERCENTAGE}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Current Charge</p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-400"
                  style={{ width: `${battery.CHARGE_LEVEL}%` }}
                />
              </div>
              <span className="text-green-400 font-medium">
                {battery.CHARGE_LEVEL}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Temperature</p>
            <div className="flex items-center gap-1">
              <ThermometerSun className="w-4 h-4 text-red-400" />
              <p className="text-slate-200">{battery.TEMPERATURE}°C</p>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Cycle Count</p>
            <p className="text-slate-200">
              {battery.CYCLE_COUNT.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Voltage</p>
            <p className="text-slate-200">{battery.VOLTAGE.toFixed(2)}V</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Current</p>
            <p className="text-slate-200">{battery.CURRENT.toFixed(2)}A</p>
          </div>
        </CardContent>
      </Card>

      {/* Specifications */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Specifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-slate-400 text-sm">Capacity</p>
            <p className="text-slate-200">
              {battery.CAPACITY_MAH.toLocaleString()} mAh
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Manufacture Date</p>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <p className="text-slate-200">
                {battery.MANUFACTURE_DATE.toLocaleDateString()}
              </p>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Warranty Expiry</p>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <p className="text-slate-200">
                {battery.WARRANTY_EXPIRY.toLocaleDateString()}
              </p>
            </div>
          </div>
          {battery.LAST_SWAP_DATE && (
            <div>
              <p className="text-slate-400 text-sm">Last Swap</p>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <p className="text-slate-200">
                  {battery.LAST_SWAP_DATE.toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Component: Battery Sessions
const BatterySessions = ({ sessions }: { sessions: BatterySession[] }) => {
  const getSessionTypeColor = (type: string) => {
    switch (type) {
      case "CHARGING":
        return "text-green-400 bg-green-500/10";
      case "DISCHARGING":
        return "text-red-400 bg-red-500/10";
      case "SWAP":
        return "text-blue-400 bg-blue-500/10";
      default:
        return "text-slate-400 bg-slate-500/10";
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Recent Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Session ID
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Start Time
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Duration
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Charge Change
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Location
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.SESSION_ID}
                  className="border-b border-slate-800 hover:bg-slate-800/30"
                >
                  <td className="py-3 px-4 text-slate-200 font-mono text-sm">
                    {session.SESSION_ID}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getSessionTypeColor(
                        session.SESSION_TYPE
                      )}`}
                    >
                      {session.SESSION_TYPE}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {session.START_TIME.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {session.DURATION_MINUTES
                      ? `${session.DURATION_MINUTES}min`
                      : "Ongoing"}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {session.START_CHARGE}% → {session.END_CHARGE || "..."}%
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {session.STATION_ID || "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Component: Maintenance Records
const MaintenanceRecords = ({ records }: { records: MaintenanceRecord[] }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-400 bg-green-500/10";
      case "pending":
        return "text-yellow-400 bg-yellow-500/10";
      case "in_progress":
        return "text-blue-400 bg-blue-500/10";
      default:
        return "text-slate-400 bg-slate-500/10";
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-400" />
          Maintenance History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record.MAINTENANCE_ID}
              className="border border-slate-700 rounded-lg p-4 hover:bg-slate-800/30"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-slate-200 font-medium">{record.TYPE}</h4>
                  <p className="text-slate-400 text-sm">
                    {record.DATE.toLocaleDateString()}
                  </p>
                </div>
                <Badge className={getStatusColor(record.STATUS)}>
                  {record.STATUS.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-slate-300 text-sm mb-2">
                {record.DESCRIPTION}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Technician: {record.TECHNICIAN}</span>
                {record.COST && (
                  <span>Cost: ${record.COST.toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const BatteryDetailsPage = () => {
  const params = useParams();
  const batteryId = params.batteryId as string;

  const [battery, setBattery] = useState<BatteryDetails | null>(null);
  const [sessions, setSessions] = useState<BatterySession[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<
    MaintenanceRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock data for now - replace with actual API call
      const mockBattery: BatteryDetails = {
        BATTERY_ID: batteryId,
        BATTERY_TYPE: "Lithium-Ion",
        VEHICLE_ID: Math.random() > 0.5 ? "VEH-0001" : undefined,
        STATUS: ["available", "charging", "in_use", "maintenance"][
          Math.floor(Math.random() * 4)
        ],
        HEALTH_PERCENTAGE: Math.floor(Math.random() * 40) + 60,
        CHARGE_LEVEL: Math.floor(Math.random() * 100),
        TEMPERATURE: Math.floor(Math.random() * 20) + 25,
        CYCLE_COUNT: Math.floor(Math.random() * 500) + 100,
        VOLTAGE: 48 + Math.random() * 4,
        CURRENT: Math.random() * 10,
        CAPACITY_MAH: 5000,
        MANUFACTURE_DATE: new Date(2023, 0, 1),
        LAST_SWAP_DATE: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ),
        LOCATION: "Station A",
        STATION_ID: "ST-001",
        SERIAL_NUMBER: "SN-123456",
        MANUFACTURER: "BatteryTech Inc.",
        WARRANTY_EXPIRY: new Date(2026, 0, 1),
      };

      const mockSessions: BatterySession[] = Array.from(
        { length: 10 },
        (_, i) => ({
          SESSION_ID: `SES-${String(i + 1).padStart(4, "0")}`,
          START_TIME: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          END_TIME: new Date(
            Date.now() -
              i * 24 * 60 * 60 * 1000 +
              Math.random() * 2 * 60 * 60 * 1000
          ),
          SESSION_TYPE: ["CHARGING", "DISCHARGING", "SWAP"][
            Math.floor(Math.random() * 3)
          ] as any,
          START_CHARGE: Math.floor(Math.random() * 50),
          END_CHARGE: Math.floor(Math.random() * 50) + 50,
          DURATION_MINUTES: Math.floor(Math.random() * 120) + 30,
          STATION_ID: `ST-${String(Math.floor(Math.random() * 3) + 1).padStart(
            3,
            "0"
          )}`,
          VEHICLE_ID:
            Math.random() > 0.5
              ? `VEH-${String(Math.floor(Math.random() * 10) + 1).padStart(
                  4,
                  "0"
                )}`
              : undefined,
        })
      );

      const mockMaintenanceRecords: MaintenanceRecord[] = Array.from(
        { length: 5 },
        (_, i) => ({
          MAINTENANCE_ID: `MAINT-${String(i + 1).padStart(4, "0")}`,
          DATE: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
          TYPE: [
            "Routine Check",
            "Battery Replacement",
            "Calibration",
            "Repair",
          ][i % 4],
          DESCRIPTION: `Maintenance activity ${i + 1} description`,
          TECHNICIAN: `Tech-${String.fromCharCode(65 + (i % 5))}`,
          STATUS: ["completed", "pending", "in_progress"][i % 3],
          COST: Math.floor(Math.random() * 500) + 100,
        })
      );

      setBattery(mockBattery);
      setSessions(mockSessions);
      setMaintenanceRecords(mockMaintenanceRecords);
    } catch (err) {
      setError("Failed to fetch battery details");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [batteryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!battery)
    return <ErrorState error="Battery not found" onRetry={fetchData} />;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/batteries">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Batteries
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-100">
                Battery {battery.BATTERY_ID}
              </h1>
              <p className="text-slate-400">
                {battery.BATTERY_TYPE} • {battery.MANUFACTURER}
              </p>
            </div>
          </div>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <BatteryOverview battery={battery} />
          </TabsContent>

          <TabsContent value="sessions">
            <BatterySessions sessions={sessions} />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceRecords records={maintenanceRecords} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BatteryDetailsPage;
