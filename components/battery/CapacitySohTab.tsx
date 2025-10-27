import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BatteryDetail } from "./../../app/(protected)/batteries/[batteryID]/types";
import {
  ComposedChart,
  Area,
  Line,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingDown, Package, CloudLightning } from "lucide-react";

interface CapacitySohTabProps {
  battery: BatteryDetail;
}

const CapacitySohTab = ({ battery }: CapacitySohTabProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-yellow-400" />
              State of Health Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={battery.sohHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "#94a3b8" }}
                  label={{
                    value: "SOH (%)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#94a3b8",
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#94a3b8" }}
                  label={{
                    value: "Capacity (Ah)",
                    angle: 90,
                    position: "insideRight",
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
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="soh"
                  fill="#eab308"
                  stroke="#eab308"
                  fillOpacity={0.3}
                  name="SOH %"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="capacity"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  name="Capacity (Ah)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Package className="h-5 w-5 text-green-400" />
              Capacity Fade Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={battery.capacityHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="capacity"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  name="Capacity (Ah)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100">Capacity Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-sm mb-2">Nominal Capacity</p>
              <p className="text-2xl font-bold text-slate-100">
                {battery.nominalCapacity}Ah
              </p>
              <p className="text-slate-500 text-xs mt-1">Factory rated</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-sm mb-2">Current Capacity</p>
              <p className="text-2xl font-bold text-slate-100">
                {battery.currentCapacity.toFixed(2)}Ah
              </p>
              <p className="text-slate-500 text-xs mt-1">Measured</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-sm mb-2">Capacity Fade</p>
              <p
                className={`text-2xl font-bold ${
                  battery.capacityFade > 20 ? "text-red-400" : "text-slate-100"
                }`}
              >
                {battery.capacityFade.toFixed(2)}%
              </p>
              <p className="text-slate-500 text-xs mt-1">Total loss</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-sm mb-2">Fade Rate</p>
              <p className="text-2xl font-bold text-slate-100">
                {((battery.capacityFade / battery.ageInDays) * 30).toFixed(3)}%
              </p>
              <p className="text-slate-500 text-xs mt-1">Per month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <CloudLightning className="h-5 w-5 text-purple-400" />
            Internal Resistance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={battery.resistanceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis
                tick={{ fill: "#94a3b8" }}
                label={{
                  value: "Resistance (mΩ)",
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
              <Area
                type="monotone"
                dataKey="resistance"
                stroke="#a855f7"
                fill="#a855f7"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Current Resistance</p>
              <p className="text-xl font-bold text-slate-100">
                {battery.internalResistance.toFixed(1)}mΩ
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Resistance Increase</p>
              <p
                className={`text-xl font-bold ${
                  battery.resistanceIncrease > 30
                    ? "text-orange-400"
                    : "text-slate-100"
                }`}
              >
                {battery.resistanceIncrease.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Expected at EOL</p>
              <p className="text-xl font-bold text-slate-100">
                {(battery.internalResistance * 1.5).toFixed(1)}mΩ
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CapacitySohTab;
