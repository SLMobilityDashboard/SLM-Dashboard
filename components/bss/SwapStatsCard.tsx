import React from "react";
import { TrendingUp, Clock } from "lucide-react";
import { BatterySwappingStation } from "./types";

interface SwapStatsCardProps {
  station: BatterySwappingStation;
}

export const SwapStatsCard: React.FC<SwapStatsCardProps> = ({ station }) => {
  const totalSwaps = station.TOTAL_SWAPS || 0;
  const swapsSinceMaintenance = station.SWAPS_SINCE_MAINTENANCE || 0;
  
  const swapProgress = Math.min((swapsSinceMaintenance / 100) * 100, 100);

  const progressColor = swapProgress >= 100 
    ? "bg-red-400" 
    : swapProgress >= 80 
    ? "bg-amber-400" 
    : "bg-green-400";

  return (
    <div className="mt-4 p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg space-y-3">
      <div className="flex items-center gap-2 text-slate-300 font-medium">
        <TrendingUp className="w-4 h-4 text-blue-400" />
        <span>Swap Statistics</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Total Swaps</p>
          <p className="text-2xl font-bold text-blue-400">{totalSwaps.toLocaleString()}</p>
        </div>
        
        <div>
          <p className="text-xs text-slate-500 mb-1">Since Maintenance</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-300">
              {swapsSinceMaintenance}
            </p>
            <p className="text-xs text-slate-500">/ 100</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Progress to next maintenance</span>
          <span>{Math.round(swapProgress)}%</span>
        </div>
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div 
            className={`h-full ${progressColor} transition-all duration-500`}
            style={{ width: `${swapProgress}%` }}
          />
        </div>
      </div>

      {station.LAST_SWAP_DATE && (
        <div className="pt-2 border-t border-slate-700/50 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Last swap: {station.LAST_SWAP_DATE.toLocaleDateString()} {station.LAST_SWAP_DATE.toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

