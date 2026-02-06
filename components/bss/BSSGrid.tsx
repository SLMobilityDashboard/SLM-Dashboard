import React from "react";
import { Battery, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BatterySwappingStation } from "./types";
import { MapPin, Clock, Navigation, TrendingUp, Wrench } from "lucide-react";
import { MaintenanceAlert } from "./MaintenanceAlert";
import { SwapStatsCard } from "./SwapStatsCard";
import { VendorInfoCard } from "./VendorInfoCard";
import { useRouter } from "next/navigation";

interface BSSCardProps {
  station: BatterySwappingStation;
}

const BSSCard: React.FC<BSSCardProps> = ({ station }) => {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/bss/${station.STATION_ID}`);
  };

  // Helper function to safely format coordinates
  const formatCoordinate = (coord: number | string | null | undefined): string => {
    if (coord === null || coord === undefined) return 'N/A';
    const num = typeof coord === 'string' ? parseFloat(coord) : coord;
    return isNaN(num) ? 'N/A' : num.toFixed(6);
  };

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
    <Card 
      className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all group cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <h3 className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors truncate">
                {station.STATION_NAME || station.STATION_ID}
              </h3>
              <p className="text-sm text-slate-400">
                {station.STATION_ID}
              </p>
              {station.TOTAL_SWAPS !== undefined && station.TOTAL_SWAPS > 0 && (
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-1 text-blue-400">
                    <TrendingUp className="w-3 h-3 flex-shrink-0" />
                    <span className="font-medium">{station.TOTAL_SWAPS.toLocaleString()} total</span>
                  </div>
                  {station.SWAPS_SINCE_MAINTENANCE !== undefined && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Wrench className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium">{station.SWAPS_SINCE_MAINTENANCE} since maintenance</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              <div className={`px-2 py-1 -mx-3  rounded-full text-xs font-medium border whitespace-nowrap ${statusColor}`}>
                {station.STATUS}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Vendor</p>
              <p className="text-sm text-slate-300 truncate">
                {station.VENDOR_COMPANY_NAME || station.VENDOR_ID || "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Model</p>
              <p className="text-sm text-slate-300 truncate">{station.STATION_MODEL || "N/A"}</p>
            </div>
          </div>

          {station.LOCATION_NAME && (
            <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 font-medium truncate">{station.LOCATION_NAME}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {station.LOCATION_CODE && (
                    <div className="min-w-0">
                      <p className="text-slate-500">Location Code</p>
                      <p className="text-slate-300 font-mono truncate">{station.LOCATION_CODE}</p>
                    </div>
                  )}
                  {station.CITY_ID && (
                    <div className="min-w-0">
                      <p className="text-slate-500">City</p>
                      <p className="text-slate-300 truncate">{station.CITY_ID}</p>
                    </div>
                  )}
                </div>
                
                {(station.LATITUDE || station.LONGITUDE) && (
                  <div className="flex items-center gap-2 text-xs pt-2 border-t border-slate-700/50">
                    <Navigation className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-400 font-mono text-xs truncate">
                      {formatCoordinate(station.LATITUDE)}, {formatCoordinate(station.LONGITUDE)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Swap Statistics */}
          {(station.TOTAL_SWAPS !== undefined && station.TOTAL_SWAPS > 0) && (
            <SwapStatsCard station={station} />
          )}

          {/* Maintenance Alert */}
          <MaintenanceAlert station={station} />

          {/* Vendor Details Section */}
          <VendorInfoCard station={station} />

          {station.SERIAL_NO && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Serial Number</p>
              <p className="text-sm text-slate-300 font-mono truncate">{station.SERIAL_NO}</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {station.BSS_PLANTED_DATE
                  ? new Date(station.BSS_PLANTED_DATE).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
            {station.APPROVED_STATUS && (
              <div className={`px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${
                station.APPROVED_STATUS === "APPROVED"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}>
                {station.APPROVED_STATUS}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


interface BSSGridProps {
  stations: BatterySwappingStation[];
  currentPage: number;
  totalPages: number;
  totalStations: number;
  onPageChange: (page: number) => void;
}

const BSSGrid: React.FC<BSSGridProps> = ({
  stations,
  currentPage,
  totalPages,
  totalStations,
  onPageChange,
}) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-slate-100">
        Stations ({totalStations.toLocaleString()})
      </h2>
    </div>

    {stations.length === 0 ? (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-12 text-center">
          <Battery className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No stations found matching your filters</p>
        </CardContent>
      </Card>
    ) : (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stations.map((station) => (
            <BSSCard key={station.STATION_ID} station={station} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-slate-900/50 border-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className={
                      currentPage === pageNum
                        ? "bg-cyan-500 text-white"
                        : "bg-slate-900/50 border-slate-700"
                    }
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="bg-slate-900/50 border-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </>
    )}
  </div>
);

export default BSSGrid;