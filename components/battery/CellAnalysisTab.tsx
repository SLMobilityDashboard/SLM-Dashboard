import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BatteryDetail } from "../../app/(protected)/batteries/[batteryID]/types";
import { getCellStatusColor } from "../../app/(protected)/batteries/[batteryID]/utils";
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
import { CircuitBoard, Waves } from "lucide-react";

interface CellAnalysisTabProps {
  battery: BatteryDetail;
}

const CellAnalysisTab = ({ battery }: CellAnalysisTabProps) => {
  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <CircuitBoard className="h-5 w-5 text-cyan-400" />
            Individual Cell Voltages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            {battery.cellVoltages.map((cell) => (
              <div
                key={cell.cellId}
                className="p-3 bg-slate-800/50 rounded border border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs">
                    Cell {cell.cellId}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${getCellStatusColor(
                      cell.status
                    )}`}
                  />
                </div>
                <p className="text-slate-100 font-bold text-lg">
                  {cell.voltage.toFixed(3)}V
                </p>
                <p
                  className={`text-xs mt-1 ${
                    Math.abs(cell.deviation) > 50
                      ? "text-orange-400"
                      : "text-slate-500"
                  }`}
                >
                  {cell.deviation > 0 ? "+" : ""}
                  {cell.deviation}mV
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-sm mb-2">
                Maximum Cell Voltage
              </p>
              <p className="text-2xl font-bold text-slate-100">
                {battery.maxCellVoltage.toFixed(3)}V
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-sm mb-2">
                Minimum Cell Voltage
              </p>
              <p className="text-2xl font-bold text-slate-100">
                {battery.minCellVoltage.toFixed(3)}V
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-sm mb-2">Cell Imbalance</p>
              <p
                className={`text-2xl font-bold ${
                  battery.cellImbalance > 100
                    ? "text-red-400"
                    : "text-slate-100"
                }`}
              >
                {battery.cellImbalance}mV
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Waves className="h-5 w-5 text-blue-400" />
            Cell Balance History (30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={battery.cellBalanceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis
                tick={{ fill: "#94a3b8" }}
                label={{
                  value: "Imbalance (mV)",
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
                dataKey="imbalance"
                stroke="#3b82f6"
                name="Avg Imbalance"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="maxDev"
                stroke="#ef4444"
                name="Max Deviation"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 p-3 bg-slate-800/50 rounded">
            <p className="text-slate-400 text-xs mb-1">Trend Analysis</p>
            <p className="text-slate-200 text-sm">
              {battery.cellBalanceHistory[battery.cellBalanceHistory.length - 1]
                .imbalance > battery.cellBalanceHistory[0].imbalance
                ? "Cell imbalance is increasing. Balancing procedure recommended."
                : "Cell balance is stable or improving."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CellAnalysisTab;
