import { Card, CardContent } from "@/components/ui/card";
import { BatteryDetail } from "./types";
import {
  Battery,
  Gauge,
  Package,
  RefreshCw,
  CircuitBoard,
  ThermometerSun,
} from "lucide-react";

interface KeyMetricsDashboardProps {
  battery: BatteryDetail;
}

const KeyMetricsDashboard = ({ battery }: KeyMetricsDashboardProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-4 w-4 text-cyan-400" />
            <p className="text-slate-400 text-xs">State of Health</p>
          </div>
          <p className="text-2xl font-bold text-slate-100">{battery.batSOH}%</p>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-cyan-500"
              style={{ width: `${battery.batSOH}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Battery className="h-4 w-4 text-green-400" />
            <p className="text-slate-400 text-xs">State of Charge</p>
          </div>
          <p className="text-2xl font-bold text-slate-100">{battery.batSOC}%</p>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-green-500"
              style={{ width: `${battery.batSOC}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-400" />
            <p className="text-slate-400 text-xs">Capacity</p>
          </div>
          <p className="text-2xl font-bold text-slate-100">
            {battery.currentCapacity.toFixed(1)}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            of {battery.nominalCapacity}Ah
          </p>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-4 w-4 text-purple-400" />
            <p className="text-slate-400 text-xs">Cycle Count</p>
          </div>
          <p className="text-2xl font-bold text-slate-100">
            {battery.batCycleCount}
          </p>
          <p className="text-slate-500 text-xs mt-1">of ~600 expected</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CircuitBoard className="h-4 w-4 text-yellow-400" />
            <p className="text-slate-400 text-xs">Cell Balance</p>
          </div>
          <p className="text-2xl font-bold text-slate-100">
            {battery.cellImbalance}
          </p>
          <p
            className={`text-xs mt-1 ${
              battery.cellImbalance > 100 ? "text-red-400" : "text-slate-500"
            }`}
          >
            {battery.cellImbalance > 100 ? "High imbalance" : "mV delta"}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ThermometerSun className="h-4 w-4 text-orange-400" />
            <p className="text-slate-400 text-xs">Temperature</p>
          </div>
          <p className="text-2xl font-bold text-slate-100">
            {battery.batTemp.toFixed(1)}°C
          </p>
          <p
            className={`text-xs mt-1 ${
              battery.batTemp > 40 ? "text-red-400" : "text-slate-500"
            }`}
          >
            {battery.batTemp > 40 ? "High temp" : "Normal"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyMetricsDashboard;
