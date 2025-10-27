import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BatteryDetail } from "./types";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Activity, Zap } from "lucide-react";

interface PerformanceTabProps {
  battery: BatteryDetail;
}

const PerformanceTab = ({ battery }: PerformanceTabProps) => {
  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-400" />
            Coulombic & Energy Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={battery.efficiencyHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis
                domain={[90, 100]}
                tick={{ fill: "#94a3b8" }}
                label={{
                  value: "Efficiency (%)",
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
              <Legend />
              <Line
                type="monotone"
                dataKey="coulombic"
                stroke="#10b981"
                name="Coulombic Efficiency"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="energy"
                stroke="#3b82f6"
                name="Energy Efficiency"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-sm mb-2">
                Current Coulombic Efficiency
              </p>
              <p
                className={`text-2xl font-bold ${
                  battery.coulombicEfficiency < 95
                    ? "text-orange-400"
                    : "text-slate-100"
                }`}
              >
                {battery.coulombicEfficiency.toFixed(2)}%
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {battery.coulombicEfficiency >= 98
                  ? "Excellent"
                  : battery.coulombicEfficiency >= 95
                  ? "Good"
                  : "Needs attention"}
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-sm mb-2">Energy Efficiency</p>
              <p className="text-2xl font-bold text-slate-100">
                {
                  battery.efficiencyHistory[
                    battery.efficiencyHistory.length - 1
                  ].energy
                }
                %
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Round-trip efficiency
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Voltage & Current Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={battery.voltageHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "#94a3b8" }}
                  label={{
                    value: "Voltage (V)",
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
                    value: "Current (A)",
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
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="voltage"
                  stroke="#eab308"
                  name="Voltage"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="current"
                  stroke="#06b6d4"
                  name="Current"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100">
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Current Charge Rate</span>
                <span className="text-slate-200 font-medium">
                  {battery.chargeRate}C
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Current Discharge Rate</span>
                <span className="text-slate-200 font-medium">
                  {battery.dischargeRate}C
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Max Charge Rate</span>
                <span className="text-slate-200 font-medium">
                  {battery.maxChargeRate}C
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Max Discharge Rate</span>
                <span className="text-slate-200 font-medium">
                  {battery.maxDischargeRate}C
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Total Energy Charged</span>
                <span className="text-slate-200 font-medium">
                  {battery.totalChargeAh.toFixed(0)}Ah
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Total Energy Discharged</span>
                <span className="text-slate-200 font-medium">
                  {battery.totalDischargeAh.toFixed(0)}Ah
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceTab;
