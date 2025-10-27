import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BatteryDetail } from "../../app/(protected)/batteries/[batteryID]/types";
import { getSeverityColor } from "../../app/(protected)/batteries/[batteryID]/utils";
import {
  ComposedChart,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { RefreshCw, Calendar, FileText, CheckCircle } from "lucide-react";

interface LifecycleUsageTabProps {
  battery: BatteryDetail;
}

const LifecycleUsageTab = ({ battery }: LifecycleUsageTabProps) => {
  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-400" />
            Cycle Count Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={battery.cycleHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis
                tick={{ fill: "#94a3b8" }}
                label={{
                  value: "Cycles",
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
              <Area
                type="monotone"
                dataKey="cycles"
                fill="#3b82f6"
                stroke="#3b82f6"
                fillOpacity={0.3}
                name="Total Cycles"
              />
              <Line
                type="monotone"
                dataKey="deepCycles"
                stroke="#ef4444"
                strokeWidth={2}
                name="Deep Cycles"
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Total Cycles</p>
              <p className="text-xl font-bold text-slate-100">
                {battery.batCycleCount}
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Deep Cycles</p>
              <p className="text-xl font-bold text-slate-100">
                {battery.deepDischargeCount}
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Shallow Cycles</p>
              <p className="text-xl font-bold text-slate-100">
                {battery.shallowCycleCount}
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Fast Charges</p>
              <p className="text-xl font-bold text-slate-100">
                {battery.fastChargeCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-400" />
              Battery Age & Lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded">
                <p className="text-slate-400 text-sm mb-2">Battery Age</p>
                <p className="text-2xl font-bold text-slate-100">
                  {battery.ageInDays} days
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  {Math.floor(battery.ageInDays / 30)} months since first use
                </p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded">
                <p className="text-slate-400 text-sm mb-2">Cycles per Day</p>
                <p className="text-2xl font-bold text-slate-100">
                  {(battery.batCycleCount / battery.ageInDays).toFixed(2)}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Average usage rate
                </p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded">
                <p className="text-slate-400 text-sm mb-2">Expected Lifespan</p>
                <p className="text-2xl font-bold text-slate-100">
                  {Math.floor(
                    600 / (battery.batCycleCount / battery.ageInDays)
                  )}{" "}
                  days
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Based on 600 cycle limit
                </p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded">
                <p className="text-slate-400 text-sm mb-2">
                  Lifecycle Progress
                </p>
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{
                      width: `${(battery.batCycleCount / 600) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  {((battery.batCycleCount / 600) * 100).toFixed(1)}% of
                  expected lifecycle
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-400" />
              Error History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {battery.errorHistory.length > 0 ? (
              <div className="space-y-3">
                {battery.errorHistory.map((error, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-800/50 rounded border-l-4 border-orange-500"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        className={getSeverityColor(error.severity)}
                        variant="outline"
                      >
                        {error.severity}
                      </Badge>
                      <span className="text-slate-400 text-xs">
                        {error.date}
                      </span>
                    </div>
                    <p className="text-slate-200 text-sm">{error.error}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-medium">
                    No Error History
                  </span>
                </div>
                <p className="text-slate-300 text-sm mt-2">
                  Battery has operated without errors
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100">Usage Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/50 rounded text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-2">
                {battery.batCycleCount}
              </div>
              <p className="text-slate-400 text-sm">Total Cycles</p>
              <p className="text-slate-500 text-xs mt-1">
                {((battery.batCycleCount / 600) * 100).toFixed(1)}% of lifecycle
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {battery.fastChargeCount}
              </div>
              <p className="text-slate-400 text-sm">Fast Charges</p>
              <p className="text-slate-500 text-xs mt-1">
                {(
                  (battery.fastChargeCount / battery.batCycleCount) *
                  100
                ).toFixed(1)}
                % of charges
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {battery.deepDischargeCount}
              </div>
              <p className="text-slate-400 text-sm">Deep Discharges</p>
              <p className="text-slate-500 text-xs mt-1">
                {(
                  (battery.deepDischargeCount / battery.batCycleCount) *
                  100
                ).toFixed(1)}
                % of cycles
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {battery.thermalEvents}
              </div>
              <p className="text-slate-400 text-sm">Thermal Events</p>
              <p className="text-slate-500 text-xs mt-1">
                {battery.overTempEvents} over-temp
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LifecycleUsageTab;
