import React from "react";
import { MapPin, Clock, Navigation, TrendingUp, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BatterySwappingStation } from "./types";
import { MaintenanceAlert } from "./MaintenanceAlert";
import { SwapStatsCard } from "./SwapStatsCard";
import { VendorInfoCard } from "./VendorInfoCard";

interface BSSCardProps {
  station: BatterySwappingStation;
}

const BSSCard: React.FC<BSSCardProps> = ({ station }) => {
  const statusColors = {
    ACTIVE: "bg-green-500/10 border-green-500/20 text-green-400",
    INACTIVE: "bg-red-500/10 border-red-500/20 text-red-400",
    MAINTENANCE: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    INITIALIZING: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    CONFIGURING: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    DELETED: "bg-gray-500/10 border-gray-500/20 text-gray-400",
    UNKNOWN: "bg-slate-500/10 border-slate-500/20 text-slate-400",
  };

  const statusColor = statusColors[station.STATUS as keyof typeof statusColors] || statusColors.UNKNOWN;

  return (
    <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all group">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
                {station.STATION_NAME || station.STATION_ID}
              </h3>
              {/* <p className="text-sm text-slate-400">ID: {station.STATION_ID}</p> */}
              {station.TOTAL_SWAPS !== undefined && station.TOTAL_SWAPS > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 text-blue-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-medium">{station.TOTAL_SWAPS.toLocaleString()} total</span>
                  </div>
                  {station.SWAPS_SINCE_MAINTENANCE !== undefined && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Wrench className="w-3 h-3" />
                      <span className="font-medium">{station.SWAPS_SINCE_MAINTENANCE} sint.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                {station.STATUS}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Vendor</p>
              <p className="text-sm text-slate-300">
                {station.VENDOR_COMPANY_NAME || station.VENDOR_ID || "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Model</p>
              <p className="text-sm text-slate-300">{station.STATION_MODEL || "N/A"}</p>
            </div>
          </div>

          {station.LOCATION_NAME && (
            <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-300 font-medium">{station.LOCATION_NAME}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {station.LOCATION_CODE && (
                    <div>
                      <p className="text-slate-500">Location Code</p>
                      <p className="text-slate-300 font-mono">{station.LOCATION_CODE}</p>
                    </div>
                  )}
                  {station.CITY_ID && (
                    <div>
                      <p className="text-slate-500">City</p>
                      <p className="text-slate-300">{station.CITY_ID}</p>
                    </div>
                  )}
                </div>
                
                {(station.LATITUDE || station.LONGITUDE) && (
                  <div className="flex items-center gap-2 text-xs pt-2 border-t border-slate-700/50">
                    <Navigation className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-400 font-mono">
                      {station.LATITUDE?.toFixed(6)}, {station.LONGITUDE?.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {station.SERIAL_NO && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Serial Number</p>
              <p className="text-sm text-slate-300 font-mono">{station.SERIAL_NO}</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                {station.BSS_PLANTED_DATE
                  ? new Date(station.BSS_PLANTED_DATE).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
            {station.APPROVED_STATUS && (
              <div className={`px-2 py-1 rounded ${
                station.APPROVED_STATUS === "APPROVED"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}>
                {station.APPROVED_STATUS}
              </div>
            )}
          </div>

          {/* Swap Statistics */}
          {(station.TOTAL_SWAPS !== undefined && station.TOTAL_SWAPS > 0) && (
            <SwapStatsCard station={station} />
          )}

          {/* Maintenance Alert */}
          <MaintenanceAlert station={station} />

          {/* Vendor Details Section */}
          <VendorInfoCard station={station} />
        </div>
      </CardContent>
    </Card>
  );
};

export default BSSCard;