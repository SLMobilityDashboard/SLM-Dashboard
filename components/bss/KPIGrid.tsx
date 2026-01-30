import React from "react";
import {
  Battery,
  AlertTriangle,
  X,
  MapPin,
  CheckCircle,
  Building2,
  TrendingUp,
  Wrench,
} from "lucide-react";
import KPICard from "./KPICard";

interface KPIGridProps {
  kpis: {
    TOTAL_STATIONS: number;
    ACTIVE_STATIONS: number;
    TOTAL_SWAPS: number;
    STATIONS_DUE_MAINTENANCE: number;
    MAINTENANCE_STATIONS: number;
    INACTIVE_STATIONS: number;
    TOTAL_LOCATIONS: number;
    TOTAL_VENDORS: number;
  };
}

const KPIGrid: React.FC<KPIGridProps> = ({ kpis }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <div className="lg:col-span-2 grid grid-cols-2 gap-6">
      <KPICard
        title="Total Stations"
        value={kpis.TOTAL_STATIONS}
        icon={<Battery className="w-6 h-6" />}
        colorClass="text-cyan-400"
      />
      <KPICard
        title="Active Stations"
        value={kpis.ACTIVE_STATIONS}
        icon={<CheckCircle className="w-6 h-6" />}
        colorClass="text-green-400"
      />
      <KPICard
        title="Total Swaps"
        value={kpis.TOTAL_SWAPS}
        icon={<TrendingUp className="w-6 h-6" />}
        subtitle="All-time swaps"
        colorClass="text-blue-400"
      />
      <KPICard
        title="Maintenance Due"
        value={kpis.STATIONS_DUE_MAINTENANCE}
        icon={<Wrench className="w-6 h-6" />}
        subtitle="Requires attention"
        colorClass="text-orange-400"
      />
    </div>
    
    <div className="lg:col-span-2 grid grid-cols-2 gap-6">
      <KPICard
        title="Under Maintenance"
        value={kpis.MAINTENANCE_STATIONS}
        icon={<AlertTriangle className="w-6 h-6" />}
        colorClass="text-amber-400"
      />
      <KPICard
        title="Inactive Stations"
        value={kpis.INACTIVE_STATIONS}
        icon={<X className="w-6 h-6" />}
        colorClass="text-red-400"
      />
      <KPICard
        title="Unique Locations"
        value={kpis.TOTAL_LOCATIONS}
        icon={<MapPin className="w-6 h-6" />}
        colorClass="text-purple-400"
      />
      <KPICard
        title="Active Vendors"
        value={kpis.TOTAL_VENDORS}
        icon={<Building2 className="w-6 h-6" />}
        colorClass="text-indigo-400"
      />
    </div>
  </div>
);

export default KPIGrid;