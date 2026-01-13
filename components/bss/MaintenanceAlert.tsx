import React from "react";
import { Clock, AlertCircle, Wrench } from "lucide-react";
import { BatterySwappingStation } from "./types";

interface MaintenanceAlertProps {
  station: BatterySwappingStation;
}

export const MaintenanceAlert: React.FC<MaintenanceAlertProps> = ({ station }) => {
  if (station.MAINTENANCE_STATUS === "OK" || !station.MAINTENANCE_STATUS) return null;

  const alertColors = {
    DUE_SOON: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    OVERDUE: "bg-red-500/10 border-red-500/30 text-red-400",
    OK: "",
  };

  const alertIcons = {
    DUE_SOON: <Clock className="w-4 h-4" />,
    OVERDUE: <AlertCircle className="w-4 h-4" />,
    OK: null,
  };

  const color = alertColors[station.MAINTENANCE_STATUS];
  const icon = alertIcons[station.MAINTENANCE_STATUS];

  const getReasonText = () => {
    if (station.MAINTENANCE_REASON === "BOTH") {
      return "Time & swap count exceeded";
    } else if (station.MAINTENANCE_REASON === "TIME_BASED") {
      return "30+ days since last maintenance";
    } else if (station.MAINTENANCE_REASON === "SWAP_COUNT") {
      return `${station.SWAPS_SINCE_MAINTENANCE} swaps since maintenance`;
    }
    return "";
  };

  return (
    <div className={`mt-4 p-3 rounded-lg border flex items-start gap-3 ${color}`}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">
            {station.MAINTENANCE_STATUS === "OVERDUE" 
              ? "Maintenance Overdue" 
              : "Maintenance Due Soon"}
          </p>
          <Wrench className="w-4 h-4" />
        </div>
        <p className="text-xs opacity-90">{getReasonText()}</p>
        {station.LAST_MAINTENANCE_DATE && (
          <p className="text-xs opacity-75">
            Last serviced: {station.LAST_MAINTENANCE_DATE.toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
};

