import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BatteryDetail } from "./types";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Zap, BarChart3 } from "lucide-react";

interface ChargingAnalysisTabProps {
  battery: BatteryDetail;
}

const ChargingAnalysisTab = ({ battery }: ChargingAnalysisTabProps) => {
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Charging Rate Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={battery.chargingRateDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ rate, percentage }) => `${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {battery.chargingRateDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {battery.chargingRateDistribution.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-800/50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <span className="text-slate-200 text-sm">{item.rate}</span>
                  </div>
                  <span className="text-slate-100 font-medium">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              Cycle Depth Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={battery.cycleDepthDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="depth"
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
                <Bar dataKey="count" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Analysis</p>
              <p className="text-slate-200 text-sm">
                {battery.deepDischargeCount > battery.batCycleCount * 0.25
                  ? "High number of deep discharge cycles detected. This accelerates aging."
                  : "Good distribution of cycle depths. Shallow cycles extend lifespan."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100">
            Recent Charging Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-2 text-slate-400 text-sm">
                    Date
                  </th>
                  <th className="text-left py-3 px-2 text-slate-400 text-sm">
                    Duration
                  </th>
                  <th className="text-left py-3 px-2 text-slate-400 text-sm">
                    Energy
                  </th>
                  <th className="text-left py-3 px-2 text-slate-400 text-sm">
                    SOC Range
                  </th>
                  <th className="text-left py-3 px-2 text-slate-400 text-sm">
                    Avg Current
                  </th>
                  <th className="text-left py-3 px-2 text-slate-400 text-sm">
                    Peak Temp
                  </th>
                  <th className="text-left py-3 px-2 text-slate-400 text-sm">
                    DoD
                  </th>
                </tr>
              </thead>
              <tbody>
                {battery.dischargingSessions
                  .slice(0, 10)
                  .map((session, index) => (
                    <tr key={index} className="border-b border-slate-800">
                      <td className="py-3 px-2 text-slate-200 text-sm">
                        {session.date}
                      </td>
                      <td className="py-3 px-2 text-slate-200 text-sm">
                        {session.dischargeDuration}h
                      </td>
                      <td className="py-3 px-2 text-slate-200 text-sm">
                        {session.energyUsed}Ah
                      </td>
                      <td className="py-3 px-2 text-slate-200 text-sm">
                        {session.startSOC}% → {session.endSOC}%
                      </td>
                      <td className="py-3 px-2 text-slate-200 text-sm">
                        {session.avgDischargeCurrent}A
                      </td>
                      <td
                        className={`py-3 px-2 text-sm ${
                          session.peakTemp > 40
                            ? "text-orange-400"
                            : "text-slate-200"
                        }`}
                      >
                        {session.peakTemp}°C
                      </td>
                      <td
                        className={`py-3 px-2 text-sm ${
                          session.depthOfDischarge > 80
                            ? "text-red-400"
                            : "text-slate-200"
                        }`}
                      >
                        {session.depthOfDischarge}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChargingAnalysisTab;
