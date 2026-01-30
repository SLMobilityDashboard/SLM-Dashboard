import React from "react";
import { Building2, Globe } from "lucide-react";
import { BatterySwappingStation } from "./types";

interface VendorInfoCardProps {
  station: BatterySwappingStation;
}

export const VendorInfoCard: React.FC<VendorInfoCardProps> = ({ station }) => {
  if (!station.VENDOR_COMPANY_NAME) return null;

  return (
    <div className="mt-4 p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg space-y-3">
      <div className="flex items-center gap-2 text-slate-300 font-medium">
        <Building2 className="w-4 h-4 text-cyan-400" />
        <span>Vendor Details</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        {station.VENDOR_COMPANY_NAME && (
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Company</p>
              <p className="text-slate-300">{station.VENDOR_COMPANY_NAME}</p>
            </div>
          </div>
        )}
        
        {station.VENDOR_COUNTRY && (
          <div className="flex items-start gap-2">
            <Globe className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Country</p>
              <p className="text-slate-300">{station.VENDOR_COUNTRY}</p>
            </div>
          </div>
        )}
      </div>
      
      {(station.VENDOR_HAS_SWAPPING || station.VENDOR_HAS_CHARGING || station.VENDOR_HAS_BATTERY) && (
        <div className="pt-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 mb-2">Products & Services</p>
          <div className="flex flex-wrap gap-2">
            {station.VENDOR_HAS_SWAPPING === 1 && (
              <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded text-xs text-cyan-400">
                Swapping Stations
              </span>
            )}
            {station.VENDOR_HAS_CHARGING === 1 && (
              <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
                Charging Stations
              </span>
            )}
            {station.VENDOR_HAS_BATTERY === 1 && (
              <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-xs text-purple-400">
                Batteries
              </span>
            )}
            {station.VENDOR_HAS_3W_PARTS === 1 && (
              <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
                3-Wheeler Parts
              </span>
            )}
            {station.VENDOR_HAS_BIKE_PARTS === 1 && (
              <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
                Bike Parts
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};