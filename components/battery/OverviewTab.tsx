import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BatteryDetail } from "../../app/(protected)/batteries/[batteryID]/types";
import { getStatusColor } from "./../../app/(protected)/batteries/[batteryID]/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Percent, ThermometerSun } from "lucide-react";

interface OverviewTabProps {
  battery: BatteryDetail;
}

const OverviewTab = ({ battery }: OverviewTabProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100">
              Battery Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">BMS ID</span>
              <span className="text-slate-200 font-medium">
                {battery.bmsId}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Manufacturer</span>
              <span className="text-slate-200 font-medium">
                {battery.batteryManufacturer}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Model</span>
              <span className="text-slate-200 font-medium">
                {battery.batteryModel}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Manufacture Date</span>
              <span className="text-slate-200 font-medium">
                {battery.manufactureDate.toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">First Usage Date</span>
              <span className="text-slate-200 font-medium">
                {battery.firstUsageDate.toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Age</span>
              <span className="text-slate-200 font-medium">
                {battery.ageInDays} days
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Status</span>
              <Badge className={getStatusColor(battery.status)}>
                {battery.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100">
              Current Measurements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Pack Voltage</span>
              <span className="text-slate-200 font-medium">
                {battery.batVolt.toFixed(2)}V
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Current</span>
              <span className="text-slate-200 font-medium">
                {battery.batCurrent.toFixed(2)}A
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Temperature</span>
              <span className="text-slate-200 font-medium">
                {battery.batTemp.toFixed(1)}°C
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Internal Resistance</span>
              <span className="text-slate-200 font-medium">
                {battery.internalResistance.toFixed(1)}mΩ
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Coulombic Efficiency</span>
              <span className="text-slate-200 font-medium">
                {battery.coulombicEfficiency.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Total Charge</span>
              <span className="text-slate-200 font-medium">
                {battery.totalChargeAh.toFixed(0)}Ah
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Total Discharge</span>
              <span className="text-slate-200 font-medium">
                {battery.totalDischargeAh.toFixed(0)}Ah
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SOC and Temperature Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Percent className="h-5 w-5 text-green-400" />
              State of Charge Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={battery.stateOfChargeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="range"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8" }}
                  label={{
                    value: "Hours",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#94a3b8",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Bar dataKey="hours" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <ThermometerSun className="h-5 w-5 text-orange-400" />
              Temperature Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={battery.temperatureDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="range"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8" }}
                  label={{
                    value: "Hours",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#94a3b8",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Bar dataKey="hours" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Analysis</p>
              <p className="text-slate-200 text-sm">
                {battery.temperatureDistribution[3].percentage > 15
                  ? "Elevated temperature exposure detected. Consider improving cooling."
                  : "Temperature distribution is within optimal range."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewTab;
