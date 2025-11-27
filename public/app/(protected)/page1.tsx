"use client";

import type React from "react";
import DashboardOverview from "@/components/dashboard-overview";
import { AlertCircle, Check, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

// Sample data - in a real app, this would come from your API
export const SAMPLE_SCOOTERS = [
  { id: "06347782-5fae-4e42-bdfb-b32aa6a633d7", name: "Scooter A" },
  { id: "4db8e093-a366-437b-bb9b-55b017cf9f53", name: "Scooter B" },
  { id: "c5a9f8d2-3e7b-4f1c-9d8e-6b5a2c3d1e0f", name: "Scooter C" },
];

// Sample telemetry data
export const SAMPLE_TELEMETRY = {
  "06347782-5fae-4e42-bdfb-b32aa6a633d7": {
    gps: {
      lat: 6.696449,
      long: 79.985743,
      latDir: "N",
      longDir: "E",
      timestamp: "2025-02-03 22:29:14+05:30",
    },
    battery: {
      percent: 78,
      voltage: 48.2,
      current: 2.3,
      temp: 32,
      soh: 95,
      cycleCount: 124,
    },
    motor: { rpm: 1200, temp: 45 },
    status: { brake: 0, sideStand: 0, throttle: 15, gear: 1 },
    errors: { battery: false, inverter: false, mems: false },
  },
  "4db8e093-a366-437b-bb9b-55b017cf9f53": {
    gps: {
      lat: 6.698123,
      long: 79.982567,
      latDir: "N",
      longDir: "E",
      timestamp: "2025-02-03 22:30:22+05:30",
    },
    battery: {
      percent: 42,
      voltage: 46.8,
      current: 5.7,
      temp: 38,
      soh: 92,
      cycleCount: 156,
    },
    motor: { rpm: 2400, temp: 52 },
    status: { brake: 1, sideStand: 0, throttle: 0, gear: 0 },
    errors: { battery: false, inverter: false, mems: false },
  },
  "c5a9f8d2-3e7b-4f1c-9d8e-6b5a2c3d1e0f": {
    gps: {
      lat: 6.694567,
      long: 79.988912,
      latDir: "N",
      longDir: "E",
      timestamp: "2025-02-03 22:28:45+05:30",
    },
    battery: {
      percent: 65,
      voltage: 47.5,
      current: 3.8,
      temp: 35,
      soh: 97,
      cycleCount: 89,
    },
    motor: { rpm: 1800, temp: 48 },
    status: { brake: 0, sideStand: 0, throttle: 25, gear: 2 },
    errors: { battery: false, inverter: false, mems: false },
  },
};

// Historical data for charts
export const HISTORICAL_DATA = {
  battery: [
    { time: "09:00", value: 95 },
    { time: "10:00", value: 90 },
    { time: "11:00", value: 85 },
    { time: "12:00", value: 80 },
    { time: "13:00", value: 75 },
    { time: "14:00", value: 70 },
    { time: "15:00", value: 65 },
    { time: "16:00", value: 60 },
    { time: "17:00", value: 55 },
    { time: "18:00", value: 50 },
    { time: "19:00", value: 45 },
    { time: "20:00", value: 40 },
    { time: "21:00", value: 35 },
    { time: "22:00", value: 30 },
  ],
  speed: [
    { time: "09:00", value: 0 },
    { time: "10:00", value: 15 },
    { time: "11:00", value: 25 },
    { time: "12:00", value: 20 },
    { time: "13:00", value: 30 },
    { time: "14:00", value: 35 },
    { time: "15:00", value: 25 },
    { time: "16:00", value: 15 },
    { time: "17:00", value: 20 },
    { time: "18:00", value: 25 },
    { time: "19:00", value: 30 },
    { time: "20:00", value: 20 },
    { time: "21:00", value: 10 },
    { time: "22:00", value: 0 },
  ],
  temperature: [
    { time: "09:00", value: 25 },
    { time: "10:00", value: 28 },
    { time: "11:00", value: 32 },
    { time: "12:00", value: 35 },
    { time: "13:00", value: 38 },
    { time: "14:00", value: 40 },
    { time: "15:00", value: 42 },
    { time: "16:00", value: 40 },
    { time: "17:00", value: 38 },
    { time: "18:00", value: 35 },
    { time: "19:00", value: 32 },
    { time: "20:00", value: 30 },
    { time: "21:00", value: 28 },
    { time: "22:00", value: 26 },
  ],
};

// Sample API response data for analytics section
export const SAMPLE_API_DATA = {
  evRoutePlan: {
    status: "success",
    data: {
      route: [
        { lat: 6.696449, lng: 79.985743, name: "Start Point" },
        { lat: 6.697123, lng: 79.986567, name: "Junction A" },
        { lat: 6.698234, lng: 79.987123, name: "Junction B" },
        { lat: 6.699345, lng: 79.988456, name: "Charging Station 1" },
        { lat: 6.700123, lng: 79.989567, name: "Junction C" },
        { lat: 6.701234, lng: 79.990123, name: "End Point" },
      ],
      batteryUsage: 35, // percentage
      distance: 8.5, // km
      estimatedTime: 25, // minutes
      chargingStops: [
        {
          name: "Charging Station 1",
          lat: 6.699345,
          lng: 79.988456,
          chargingTime: 15, // minutes
          batteryAdded: 30, // percentage
        },
      ],
    },
  },
  stationAllocation: {
    status: "success",
    data: {
      clusters: [
        {
          id: 1,
          centroid: { lat: 6.698123, lng: 79.986789 },
          stations: [
            {
              id: "ST001",
              name: "Central Hub",
              lat: 6.698123,
              lng: 79.986789,
              capacity: 15,
              available: 8,
            },
            {
              id: "ST002",
              name: "City Center",
              lat: 6.697456,
              lng: 79.985678,
              capacity: 10,
              available: 3,
            },
            {
              id: "ST003",
              name: "Main Street",
              lat: 6.699234,
              lng: 79.987123,
              capacity: 8,
              available: 5,
            },
          ],
        },
        {
          id: 2,
          centroid: { lat: 6.702345, lng: 79.992345 },
          stations: [
            {
              id: "ST004",
              name: "North Plaza",
              lat: 6.702345,
              lng: 79.992345,
              capacity: 12,
              available: 6,
            },
            {
              id: "ST005",
              name: "Tech Park",
              lat: 6.703456,
              lng: 79.993456,
              capacity: 20,
              available: 12,
            },
          ],
        },
        {
          id: 3,
          centroid: { lat: 6.694567, lng: 79.982345 },
          stations: [
            {
              id: "ST006",
              name: "South Market",
              lat: 6.694567,
              lng: 79.982345,
              capacity: 10,
              available: 2,
            },
            {
              id: "ST007",
              name: "Beach Road",
              lat: 6.693456,
              lng: 79.981234,
              capacity: 8,
              available: 4,
            },
          ],
        },
      ],
      totalStations: 7,
      totalCapacity: 83,
      totalAvailable: 40,
    },
  },
  closestStations: {
    status: "success",
    data: [
      {
        id: "ST001",
        name: "Central Hub",
        lat: 6.698123,
        lng: 79.986789,
        distance: 0.8, // km
        available: 8,
        capacity: 15,
      },
      {
        id: "ST003",
        name: "Main Street",
        lat: 6.699234,
        lng: 79.987123,
        distance: 1.2, // km
        available: 5,
        capacity: 8,
      },
      {
        id: "ST002",
        name: "City Center",
        lat: 6.697456,
        lng: 79.985678,
        distance: 1.5, // km
        available: 3,
        capacity: 10,
      },
    ],
  },
};

export default function Home() {
  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <TrendingUp className="h-4 w-4 text-cyan-400 mr-2" />
            <span className="text-cyan-400 text-sm font-medium">
              Fleet Analytics
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Fleet Overview Dashboard
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Monitor your scooter fleet with real-time telemetry and performance
            metrics
          </p>
        </div>

        {/* Main Content */}
        <DashboardOverview />
      </div>
    </div>
  );
}

// Component for nav items
function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start ${
        active
          ? "bg-slate-800/70 text-cyan-400"
          : "text-slate-400 hover:text-slate-100"
      }`}
      onClick={onClick}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

// Component for status items
function StatusItem({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const getColor = () => {
    switch (color) {
      case "cyan":
        return "from-cyan-500 to-blue-500";
      case "green":
        return "from-green-500 to-emerald-500";
      case "amber":
        return "from-amber-500 to-orange-500";
      case "red":
        return "from-red-500 to-rose-500";
      case "blue":
        return "from-blue-500 to-indigo-500";
      case "purple":
        return "from-purple-500 to-pink-500";
      default:
        return "from-cyan-500 to-blue-500";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-xs text-slate-400">{value}%</div>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getColor()} rounded-full`}
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
}

// Alert item component
function AlertItem({
  title,
  time,
  description,
  type,
}: {
  title: string;
  time: string;
  description: string;
  type: "info" | "warning" | "error" | "success" | "update";
}) {
  const getTypeStyles = () => {
    switch (type) {
      case "info":
        return {
          icon: Info,
          color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
        };
      case "warning":
        return {
          icon: AlertCircle,
          color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
        };
      case "error":
        return {
          icon: AlertCircle,
          color: "text-red-500 bg-red-500/10 border-red-500/30",
        };
      case "success":
        return {
          icon: Check,
          color: "text-green-500 bg-green-500/10 border-green-500/30",
        };
      case "update":
        return {
          icon: RefreshCw,
          color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
        };
      default:
        return {
          icon: Info,
          color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
        };
    }
  };

  const { icon: Icon, color } = getTypeStyles();

  return (
    <div className="flex items-start space-x-3">
      <div
        className={`mt-0.5 p-1 rounded-full ${color.split(" ")[1]} ${
          color.split(" ")[2]
        }`}
      >
        <Icon className={`h-3 w-3 ${color.split(" ")[0]}`} />
      </div>
      <div>
        <div className="flex items-center">
          <div className="text-sm font-medium text-slate-200">{title}</div>
          <div className="ml-2 text-xs text-slate-500">{time}</div>
        </div>
        <div className="text-xs text-slate-400">{description}</div>
      </div>
    </div>
  );
}

// Action button component
function ActionButton({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Button
      variant="outline"
      className="h-auto py-3 px-3 border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 flex flex-col items-center justify-center space-y-1 w-full"
    >
      <Icon className="h-5 w-5 text-cyan-500" />
      <span className="text-xs">{label}</span>
    </Button>
  );
}
