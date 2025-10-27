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
import { ThermometerSun, Flame } from "lucide-react";

interface ThermalManagementTabProps {
  battery: BatteryDetail;
}

const ThermalManagementTab = ({ battery }: ThermalManagementTabProps) => {
  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <ThermometerSun className="h-5 w-5 text-orange-400" />
            Temperature Sensors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {battery.tempSensors.map((sensor, index) => (
              <div key={index} className="p-4 bg-slate-800/50 rounded">
                <p className="text-slate-400 text-xs mb-2">{sensor.location}</p>
                <p
                  className={`text-2xl font-bold ${
                    sensor.temp > 40 ? "text-red-400" : "text-slate-100"
                  }`}
                >
                  {sensor.temp}°C
                </p>
                <p
                  className={`text-xs mt-1 ${
                    sensor.temp > 40 ? "text-red-400" : "text-slate-500"
                  }`}
                >
                  {sensor.temp > 40 ? "High temp" : "Normal"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-400" />
              Temperature History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={battery.tempHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8" }}
                  label={{
                    value: "Temperature (°C)",
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
                  dataKey="temp"
                  stroke="#f97316"
                  name="Battery Temp"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="ambient"
                  stroke="#06b6d4"
                  name="Ambient Temp"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100">Thermal Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Current Temperature</span>
                  <span
                    className={`text-2xl font-bold ${
                      battery.batTemp > 40 ? "text-red-400" : "text-slate-100"
                    }`}
                  >
                    {battery.batTemp.toFixed(1)}°C
                  </span>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Average Operating Temp</span>
                  <span className="text-xl font-bold text-slate-100">
                    {battery.avgOperatingTemp.toFixed(1)}°C
                  </span>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Max Recorded Temp</span>
                  <span
                    className={`text-xl font-bold ${
                      battery.maxRecordedTemp > 50
                        ? "text-red-400"
                        : "text-orange-400"
                    }`}
                  >
                    {battery.maxRecordedTemp.toFixed(1)}°C
                  </span>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Min Recorded Temp</span>
                  <span className="text-xl font-bold text-slate-100">
                    {battery.minRecordedTemp.toFixed(1)}°C
                  </span>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Over-Temp Events</span>
                  <span
                    className={`text-xl font-bold ${
                      battery.overTempEvents > 5
                        ? "text-red-400"
                        : "text-slate-100"
                    }`}
                  >
                    {battery.overTempEvents}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Under-Temp Events</span>
                  <span className="text-xl font-bold text-slate-100">
                    {battery.underTempEvents}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ThermalManagementTab;
