"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  TrendingUp,
  Battery,
  AlertTriangle,
  RefreshCw,
  Clock,
  Gauge,
  Building2,
  ArrowLeft,
  Calendar,
  Wrench,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

// Types
interface StationDetails {
  STATION_ID: string;
  STATION_NAME: string;
  LOCATION: string;
  ADDRESS: string;
  LATITUDE: number;
  LONGITUDE: number;
  STATUS: string;
  TOTAL_SLOTS: number;
  AVAILABLE_SLOTS: number;
  OCCUPIED_SLOTS: number;
  MAINTENANCE_SLOTS: number;
  TOTAL_SWAPS_TODAY: number;
  TOTAL_SWAPS_MONTHLY: number;
  AVERAGE_SWAP_TIME: number;
  REVENUE_TODAY: number;
  REVENUE_MONTHLY: number;
  LAST_MAINTENANCE?: Date;
  REGION: string;
  OPERATOR: string;
  INSTALLATION_DATE: Date;
  CAPACITY_KW: number;
  OPERATING_HOURS: string;
}

interface SwapSession {
  SESSION_ID: string;
  TIMESTAMP: Date;
  VEHICLE_ID: string;
  BATTERY_OUT_ID: string;
  BATTERY_IN_ID: string;
  SWAP_DURATION: number;
  CUSTOMER_ID: string;
  REVENUE: number;
  STATUS: string;
}

interface SlotStatus {
  SLOT_ID: string;
  SLOT_NUMBER: number;
  STATUS: string;
  BATTERY_ID?: string;
  CHARGE_LEVEL?: number;
  LAST_UPDATED: Date;
}

interface MaintenanceRecord {
  MAINTENANCE_ID: string;
  DATE: Date;
  TYPE: string;
  DESCRIPTION: string;
  TECHNICIAN: string;
  STATUS: string;
  COST?: number;
  DURATION_HOURS?: number;
}

// Component: Loading State
const LoadingState = () => (
  <div className="min-h-screen p-6">
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-slate-300">Loading station details...</span>
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

// Component: Station Overview
const StationOverview = ({ station }: { station: StationDetails }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "maintenance":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "offline":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "limited":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  const utilizationRate =
    ((station.TOTAL_SLOTS - station.AVAILABLE_SLOTS) / station.TOTAL_SLOTS) *
    100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Basic Info */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            Station Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-slate-400 text-sm">Station ID</p>
            <p className="text-slate-200 font-mono">{station.STATION_ID}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Name</p>
            <p className="text-slate-200 font-medium">{station.STATION_NAME}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Location</p>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <p className="text-slate-200">{station.LOCATION}</p>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Address</p>
            <p className="text-slate-200 text-sm">{station.ADDRESS}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Status</p>
            <Badge className={getStatusColor(station.STATUS)}>
              {station.STATUS}
            </Badge>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Region</p>
            <p className="text-slate-200">{station.REGION}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Operator</p>
            <p className="text-slate-200">{station.OPERATOR}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Operating Hours</p>
            <p className="text-slate-200">{station.OPERATING_HOURS}</p>
          </div>
        </CardContent>
      </Card>

      {/* Capacity & Performance */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-cyan-400" />
            Capacity & Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-slate-400 text-sm">Total Slots</p>
            <p className="text-slate-200 text-2xl font-bold">
              {station.TOTAL_SLOTS}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Available Slots</p>
            <p className="text-green-400 text-xl font-bold">
              {station.AVAILABLE_SLOTS}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Occupied Slots</p>
            <p className="text-blue-400 text-xl font-bold">
              {station.OCCUPIED_SLOTS}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Maintenance Slots</p>
            <p className="text-orange-400 text-xl font-bold">
              {station.MAINTENANCE_SLOTS}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Utilization Rate</p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    utilizationRate >= 80
                      ? "bg-red-500"
                      : utilizationRate >= 60
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${utilizationRate}%` }}
                />
              </div>
              <span className="text-slate-200 font-medium">
                {utilizationRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Capacity</p>
            <p className="text-slate-200">{station.CAPACITY_KW} kW</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Average Swap Time</p>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <p className="text-slate-200">
                {station.AVERAGE_SWAP_TIME.toFixed(1)} min
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue & Usage */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Revenue & Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-slate-400 text-sm">Swaps Today</p>
            <p className="text-cyan-400 text-2xl font-bold">
              {station.TOTAL_SWAPS_TODAY.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Swaps This Month</p>
            <p className="text-blue-400 text-xl font-bold">
              {station.TOTAL_SWAPS_MONTHLY.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Revenue Today</p>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <p className="text-green-400 text-xl font-bold">
                ${station.REVENUE_TODAY.toLocaleString()}
              </p>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Revenue This Month</p>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <p className="text-green-400 text-lg font-bold">
                ${station.REVENUE_MONTHLY.toLocaleString()}
              </p>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Installation Date</p>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <p className="text-slate-200">
                {station.INSTALLATION_DATE.toLocaleDateString()}
              </p>
            </div>
          </div>
          {station.LAST_MAINTENANCE && (
            <div>
              <p className="text-slate-400 text-sm">Last Maintenance</p>
              <div className="flex items-center gap-1">
                <Wrench className="w-3 h-3 text-slate-400" />
                <p className="text-slate-200">
                  {station.LAST_MAINTENANCE.toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Component: Slot Status
const SlotStatusGrid = ({ slots }: { slots: SlotStatus[] }) => {
  const getSlotStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return "bg-green-500/20 border-green-500/40 text-green-400";
      case "occupied":
        return "bg-blue-500/20 border-blue-500/40 text-blue-400";
      case "charging":
        return "bg-yellow-500/20 border-yellow-500/40 text-yellow-400";
      case "maintenance":
        return "bg-orange-500/20 border-orange-500/40 text-orange-400";
      case "fault":
        return "bg-red-500/20 border-red-500/40 text-red-400";
      default:
        return "bg-slate-500/20 border-slate-500/40 text-slate-400";
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Battery className="w-5 h-5 text-cyan-400" />
          Slot Status Grid
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {slots.map((slot) => (
            <Card
              key={slot.SLOT_ID}
              className={`${getSlotStatusColor(slot.STATUS)} border-2`}
            >
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold mb-1">{slot.SLOT_NUMBER}</div>
                <div className="text-xs mb-2">{slot.STATUS.toUpperCase()}</div>
                {slot.BATTERY_ID && (
                  <div className="text-xs font-mono mb-1">
                    {slot.BATTERY_ID}
                  </div>
                )}
                {slot.CHARGE_LEVEL !== undefined && (
                  <div className="text-xs">{slot.CHARGE_LEVEL}% charge</div>
                )}
                <div className="text-xs text-slate-400 mt-2">
                  {slot.LAST_UPDATED.toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Component: Swap Sessions
const SwapSessions = ({ sessions }: { sessions: SwapSession[] }) => {
  const getSessionStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-400 bg-green-500/10";
      case "in_progress":
        return "text-blue-400 bg-blue-500/10";
      case "failed":
        return "text-red-400 bg-red-500/10";
      default:
        return "text-slate-400 bg-slate-500/10";
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-cyan-400" />
          Recent Swap Sessions
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
                  Timestamp
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Vehicle
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Battery Swap
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Duration
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Revenue
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-medium">
                  Status
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
                  <td className="py-3 px-4 text-slate-300">
                    {session.TIMESTAMP.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono">
                    {session.VEHICLE_ID}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div className="text-xs">
                      <div>Out: {session.BATTERY_OUT_ID}</div>
                      <div>In: {session.BATTERY_IN_ID}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {session.SWAP_DURATION.toFixed(1)}min
                  </td>
                  <td className="py-3 px-4 text-green-400">
                    ${session.REVENUE.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getSessionStatusColor(
                        session.STATUS
                      )}`}
                    >
                      {session.STATUS.replace("_", " ")}
                    </span>
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
                <div className="flex items-center gap-4">
                  {record.DURATION_HOURS && (
                    <span>Duration: {record.DURATION_HOURS}h</span>
                  )}
                  {record.COST && (
                    <span>Cost: ${record.COST.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const StationDetailsPage = () => {
  const params = useParams();
  const stationId = params.stationId as string;

  const [station, setStation] = useState<StationDetails | null>(null);
  const [slots, setSlots] = useState<SlotStatus[]>([]);
  const [sessions, setSessions] = useState<SwapSession[]>([]);
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
      const totalSlots = Math.floor(Math.random() * 20) + 10;
      const availableSlots = Math.floor(Math.random() * totalSlots);
      const occupiedSlots =
        totalSlots - availableSlots - Math.floor(Math.random() * 3);
      const maintenanceSlots = totalSlots - availableSlots - occupiedSlots;

      const mockStation: StationDetails = {
        STATION_ID: stationId,
        STATION_NAME: `Station Alpha`,
        LOCATION: "Downtown Plaza",
        ADDRESS: "123 Main Street, City Center",
        LATITUDE: 6.9 + Math.random() * 0.1,
        LONGITUDE: 79.8 + Math.random() * 0.2,
        STATUS: ["active", "maintenance", "offline", "limited"][
          Math.floor(Math.random() * 4)
        ],
        TOTAL_SLOTS: totalSlots,
        AVAILABLE_SLOTS: availableSlots,
        OCCUPIED_SLOTS: occupiedSlots,
        MAINTENANCE_SLOTS: maintenanceSlots,
        TOTAL_SWAPS_TODAY: Math.floor(Math.random() * 100) + 20,
        TOTAL_SWAPS_MONTHLY: Math.floor(Math.random() * 2000) + 500,
        AVERAGE_SWAP_TIME: Math.random() * 5 + 2,
        REVENUE_TODAY: Math.floor(Math.random() * 5000) + 1000,
        REVENUE_MONTHLY: Math.floor(Math.random() * 100000) + 20000,
        LAST_MAINTENANCE: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ),
        REGION: ["North", "South", "East", "West", "Central"][
          Math.floor(Math.random() * 5)
        ],
        OPERATOR: "SL-Mobility",
        INSTALLATION_DATE: new Date(2023, 0, 1),
        CAPACITY_KW: Math.floor(Math.random() * 500) + 100,
        OPERATING_HOURS: "24/7",
      };

      const mockSlots: SlotStatus[] = Array.from(
        { length: totalSlots },
        (_, i) => ({
          SLOT_ID: `${stationId}-SLOT-${String(i + 1).padStart(2, "0")}`,
          SLOT_NUMBER: i + 1,
          STATUS: ["available", "occupied", "charging", "maintenance", "fault"][
            Math.floor(Math.random() * 5)
          ],
          BATTERY_ID:
            Math.random() > 0.5
              ? `BAT-${String(Math.floor(Math.random() * 1000) + 1).padStart(
                  4,
                  "0"
                )}`
              : undefined,
          CHARGE_LEVEL:
            Math.random() > 0.5 ? Math.floor(Math.random() * 100) : undefined,
          LAST_UPDATED: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
        })
      );

      const mockSessions: SwapSession[] = Array.from(
        { length: 15 },
        (_, i) => ({
          SESSION_ID: `SWP-${String(i + 1).padStart(4, "0")}`,
          TIMESTAMP: new Date(Date.now() - i * 60 * 60 * 1000),
          VEHICLE_ID: `VEH-${String(
            Math.floor(Math.random() * 100) + 1
          ).padStart(4, "0")}`,
          BATTERY_OUT_ID: `BAT-${String(
            Math.floor(Math.random() * 1000) + 1
          ).padStart(4, "0")}`,
          BATTERY_IN_ID: `BAT-${String(
            Math.floor(Math.random() * 1000) + 1
          ).padStart(4, "0")}`,
          SWAP_DURATION: Math.random() * 10 + 2,
          CUSTOMER_ID: `CUST-${String(
            Math.floor(Math.random() * 500) + 1
          ).padStart(4, "0")}`,
          REVENUE: Math.random() * 50 + 10,
          STATUS: ["completed", "in_progress", "failed"][
            Math.floor(Math.random() * 3)
          ],
        })
      );

      const mockMaintenanceRecords: MaintenanceRecord[] = Array.from(
        { length: 8 },
        (_, i) => ({
          MAINTENANCE_ID: `MAINT-${String(i + 1).padStart(4, "0")}`,
          DATE: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
          TYPE: [
            "Routine Inspection",
            "Slot Repair",
            "Software Update",
            "Hardware Replacement",
          ][i % 4],
          DESCRIPTION: `Maintenance activity ${
            i + 1
          } description for station ${stationId}`,
          TECHNICIAN: `Tech-${String.fromCharCode(65 + (i % 5))}`,
          STATUS: ["completed", "pending", "in_progress"][i % 3],
          COST: Math.floor(Math.random() * 2000) + 500,
          DURATION_HOURS: Math.floor(Math.random() * 8) + 1,
        })
      );

      setStation(mockStation);
      setSlots(mockSlots);
      setSessions(mockSessions);
      setMaintenanceRecords(mockMaintenanceRecords);
    } catch (err) {
      setError("Failed to fetch station details");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!station)
    return <ErrorState error="Station not found" onRetry={fetchData} />;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/stations">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Stations
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-100">
                {station.STATION_NAME}
              </h1>
              <p className="text-slate-400">
                {station.LOCATION} • {station.OPERATOR}
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
            <TabsTrigger value="slots">Slot Status</TabsTrigger>
            <TabsTrigger value="sessions">Swap Sessions</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <StationOverview station={station} />
          </TabsContent>

          <TabsContent value="slots">
            <SlotStatusGrid slots={slots} />
          </TabsContent>

          <TabsContent value="sessions">
            <SwapSessions sessions={sessions} />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceRecords records={maintenanceRecords} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StationDetailsPage;
