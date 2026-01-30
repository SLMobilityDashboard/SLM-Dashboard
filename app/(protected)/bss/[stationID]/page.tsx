
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Battery, 
  MapPin, 
  Clock, 
  Navigation, 
  TrendingUp, 
  Wrench,
  ArrowLeft,
  Activity,
  Zap,
  Calendar,
  Building2,
  Package,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Mock data - replace with actual API call
const fetchStationData = async (stationId: string) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    STATION_ID: stationId,
    STATION_NAME: "Downtown Station Alpha",
    STATUS: "ACTIVE",
    VENDOR_COMPANY_NAME: "EnergyTech Solutions",
    VENDOR_ID: "VEN-001",
    STATION_MODEL: "BSS-2000X",
    LOCATION_NAME: "Central Business District",
    LOCATION_CODE: "CBD-01",
    CITY_ID: "NYC",
    LATITUDE: 40.7589,
    LONGITUDE: -73.9851,
    TOTAL_SWAPS: 12543,
    SWAPS_SINCE_MAINTENANCE: 342,
    AVG_SWAP_TIME: 3.2,
    LAST_SWAP_DATE: "2026-01-13T10:30:00",
    SERIAL_NO: "BSS2000X-2024-001",
    BSS_PLANTED_DATE: "2024-06-15",
    APPROVED_STATUS: "APPROVED",
    MAINTENANCE_DUE: "2026-02-01",
    BATTERY_SLOTS: 20,
    AVAILABLE_BATTERIES: 18,
  };
};

const StationDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const stationId = params.stationID as string;
  
  const [station, setStation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStation = async () => {
      try {
        const data = await fetchStationData(stationId);
        setStation(data);
      } catch (error) {
        console.error("Failed to load station:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStation();
  }, [stationId]);

  const statusColors = {
    ACTIVE: "bg-green-500/10 border-green-500/20 text-green-400",
    INACTIVE: "bg-red-500/10 border-red-500/20 text-red-400",
    MAINTENANCE: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    INITIALIZING: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    CONFIGURING: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    DELETED: "bg-gray-500/10 border-gray-500/20 text-gray-400",
    UNKNOWN: "bg-slate-500/10 border-slate-500/20 text-slate-400",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-48 bg-slate-800 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-900/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto text-center">
          <Battery className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Station Not Found</h2>
          <p className="text-slate-400 mb-6">The station you're looking for doesn't exist.</p>
          <Button onClick={() => router.push("/bss")} className="bg-cyan-500 hover:bg-cyan-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stations
          </Button>
        </div>
      </div>
    );
  }

  const statusColor = statusColors[station.STATUS as keyof typeof statusColors] || statusColors.UNKNOWN;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push("/bss")}
            className="bg-slate-900/50 border-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-100">
              {station.STATION_NAME}
            </h1>
            <p className="text-slate-400 mt-1">{station.STATION_ID}</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium border ${statusColor}`}>
            {station.STATUS}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Total Swaps
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">
                {station.TOTAL_SWAPS?.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1">All time swaps</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Since Maintenance
              </CardTitle>
              <Wrench className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">
                {station.SWAPS_SINCE_MAINTENANCE}
              </div>
              <p className="text-xs text-slate-400 mt-1">Swaps since last service</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Available Batteries
              </CardTitle>
              <Battery className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">
                {station.AVAILABLE_BATTERIES}/{station.BATTERY_SLOTS}
              </div>
              <p className="text-xs text-slate-400 mt-1">Ready for swap</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Avg Swap Time
              </CardTitle>
              <Zap className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">
                {station.AVG_SWAP_TIME} min
              </div>
              <p className="text-xs text-slate-400 mt-1">Average duration</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Station Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Location Information */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                  Location Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
                  <p className="text-lg font-semibold text-slate-100 mb-4">
                    {station.LOCATION_NAME}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Location Code</p>
                      <p className="text-sm text-slate-300 font-mono">{station.LOCATION_CODE}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">City</p>
                      <p className="text-sm text-slate-300">{station.CITY_ID}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 text-sm">
                      <Navigation className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-400 font-mono">
                        {station.LATITUDE?.toFixed(6)}, {station.LONGITUDE?.toFixed(6)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Station Details */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  Station Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Station Model</p>
                      <p className="text-sm text-slate-300 font-medium">{station.STATION_MODEL}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Serial Number</p>
                      <p className="text-sm text-slate-300 font-mono">{station.SERIAL_NO}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Approved Status</p>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        station.APPROVED_STATUS === "APPROVED"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {station.APPROVED_STATUS}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Planted Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <p className="text-sm text-slate-300">
                          {new Date(station.BSS_PLANTED_DATE).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Last Swap</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <p className="text-sm text-slate-300">
                          {new Date(station.LAST_SWAP_DATE).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Maintenance Due</p>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <p className="text-sm text-slate-300">
                          {new Date(station.MAINTENANCE_DUE).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Vendor Info */}
          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  Vendor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Company Name</p>
                  <p className="text-sm text-slate-300 font-medium">{station.VENDOR_COMPANY_NAME}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Vendor ID</p>
                  <p className="text-sm text-slate-300 font-mono">{station.VENDOR_ID}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-cyan-400" />
                  Battery Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Total Slots</span>
                    <span className="text-lg font-bold text-slate-100">{station.BATTERY_SLOTS}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Available</span>
                    <span className="text-lg font-bold text-green-400">{station.AVAILABLE_BATTERIES}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">In Use</span>
                    <span className="text-lg font-bold text-amber-400">
                      {station.BATTERY_SLOTS - station.AVAILABLE_BATTERIES}
                    </span>
                  </div>
                  <div className="pt-4 border-t border-slate-700/50">
                    <div className="w-full bg-slate-800 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-cyan-500 h-3 rounded-full transition-all"
                        style={{ width: `${(station.AVAILABLE_BATTERIES / station.BATTERY_SLOTS) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-center">
                      {((station.AVAILABLE_BATTERIES / station.BATTERY_SLOTS) * 100).toFixed(0)}% Available
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationDetailPage;