"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Shield, Activity, Bell, Settings, TrendingUp, Clock, CheckCircle, Eye } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function AnomalyDetection() {
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [isMonitoring, setIsMonitoring] = useState(true)
  const [sensitivity, setSensitivity] = useState([75])
  const [alertsEnabled, setAlertsEnabled] = useState(true)

  // Generate anomaly data
  useEffect(() => {
    const generateAnomalies = () => {
      const newAnomalies = []
      const now = new Date()

      for (let i = 0; i < 50; i++) {
        const timestamp = new Date(now.getTime() - i * 30 * 60 * 1000) // 30 min intervals
        const baseValue = 100 + Math.sin(i * 0.1) * 20
        const value = baseValue + (Math.random() > 0.9 ? (Math.random() - 0.5) * 100 : (Math.random() - 0.5) * 10)
        const isAnomaly = Math.abs(value - baseValue) > 30

        newAnomalies.push({
          timestamp: timestamp.toISOString(),
          value: Math.round(value),
          expected: Math.round(baseValue),
          isAnomaly,
          severity: isAnomaly ? (Math.abs(value - baseValue) > 50 ? "high" : "medium") : "normal",
          confidence: Math.random() * 0.3 + 0.7,
        })
      }

      return newAnomalies.reverse()
    }

    setAnomalies(generateAnomalies())

    const interval = setInterval(() => {
      setAnomalies((prev) => {
        const newPoint = {
          timestamp: new Date().toISOString(),
          value: Math.round(
            100 +
              Math.sin(Date.now() * 0.001) * 20 +
              (Math.random() > 0.95 ? (Math.random() - 0.5) * 80 : (Math.random() - 0.5) * 10),
          ),
          expected: Math.round(100 + Math.sin(Date.now() * 0.001) * 20),
          isAnomaly: Math.random() > 0.95,
          severity: Math.random() > 0.5 ? "high" : "medium",
          confidence: Math.random() * 0.3 + 0.7,
        }

        return [...prev.slice(1), newPoint]
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const recentAnomalies = anomalies.filter((a) => a.isAnomaly).slice(-10)
  const totalAnomalies = anomalies.filter((a) => a.isAnomaly).length
  const highSeverityCount = anomalies.filter((a) => a.isAnomaly && a.severity === "high").length

  const anomalyTypes = [
    {
      name: "Usage Spikes",
      count: 12,
      trend: "+3",
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
    },
    {
      name: "Revenue Drops",
      count: 8,
      trend: "-2",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
    },
    {
      name: "System Errors",
      count: 5,
      trend: "+1",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
    },
    {
      name: "Performance Issues",
      count: 3,
      trend: "0",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Switch
              checked={isMonitoring}
              onCheckedChange={setIsMonitoring}
              className="data-[state=checked]:bg-green-600"
            />
            <Label className="text-slate-300">Real-time Monitoring</Label>
            <Badge
              variant="outline"
              className={
                isMonitoring
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/30"
              }
            >
              {isMonitoring ? "Active" : "Paused"}
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={alertsEnabled}
              onCheckedChange={setAlertsEnabled}
              className="data-[state=checked]:bg-cyan-600"
            />
            <Label className="text-slate-300">Alerts</Label>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label className="text-sm text-slate-400">Sensitivity:</Label>
            <div className="w-24">
              <Slider value={sensitivity} onValueChange={setSensitivity} max={100} step={1} className="w-full" />
            </div>
            <span className="text-sm text-slate-300 w-8">{sensitivity[0]}%</span>
          </div>

          <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Anomalies</p>
                <p className="text-2xl font-bold text-slate-100">{totalAnomalies}</p>
                <p className="text-xs text-slate-500 mt-1">Last 24 hours</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">High Severity</p>
                <p className="text-2xl font-bold text-slate-100">{highSeverityCount}</p>
                <p className="text-xs text-slate-500 mt-1">Requires attention</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Detection Rate</p>
                <p className="text-2xl font-bold text-slate-100">94.7%</p>
                <p className="text-xs text-slate-500 mt-1">Model accuracy</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Avg Response</p>
                <p className="text-2xl font-bold text-slate-100">2.3m</p>
                <p className="text-xs text-slate-500 mt-1">Time to alert</p>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/10">
                <Clock className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Chart */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-100 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-cyan-400" />
              Real-time Anomaly Detection
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                  <span className="text-slate-400">Normal</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-slate-400">Anomaly</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
                  <span className="text-slate-400">Expected</span>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  isMonitoring
                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                    : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                }
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full mr-1 ${isMonitoring ? "bg-green-500 animate-pulse" : "bg-slate-500"}`}
                ></div>
                {isMonitoring ? "LIVE" : "PAUSED"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={anomalies}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                  }
                />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#cbd5e1" }}
                  formatter={(value, name) => [
                    value,
                    name === "value" ? "Actual" : name === "expected" ? "Expected" : name,
                  ]}
                />

                {/* Expected line */}
                <Line
                  type="monotone"
                  dataKey="expected"
                  stroke="#64748b"
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="3 3"
                />

                {/* Actual line with anomaly highlighting */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (payload.isAnomaly) {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={payload.severity === "high" ? "#ef4444" : "#f59e0b"}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      )
                    }
                    return null
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Types and Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomaly Types */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Anomaly Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {anomalyTypes.map((type, index) => (
              <div key={index} className={`p-4 rounded-lg border ${type.borderColor} ${type.bgColor}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-200">{type.name}</h4>
                    <p className="text-sm text-slate-400 mt-1">Last 24 hours</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${type.color}`}>{type.count}</div>
                    <div className="text-xs text-slate-500">
                      {type.trend !== "0" && (type.trend.startsWith("+") ? "↑" : "↓")} {type.trend}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg flex items-center">
              <Bell className="w-5 h-5 mr-2 text-amber-400" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAnomalies.slice(0, 6).map((anomaly, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
              >
                <div
                  className={`p-1 rounded-full ${anomaly.severity === "high" ? "bg-red-500/20" : "bg-amber-500/20"}`}
                >
                  <AlertTriangle
                    className={`w-3 h-3 ${anomaly.severity === "high" ? "text-red-400" : "text-amber-400"}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-200">
                    Value spike detected: {anomaly.value} (expected: {anomaly.expected})
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(anomaly.timestamp).toLocaleTimeString()} • Confidence:{" "}
                    {(anomaly.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-200 p-1">
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-200 p-1">
                    <CheckCircle className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Anomaly Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="patterns" className="space-y-4">
            <TabsList className="bg-slate-800/50 p-1">
              <TabsTrigger value="patterns" className="data-[state=active]:bg-slate-700">
                Patterns
              </TabsTrigger>
              <TabsTrigger value="correlation" className="data-[state=active]:bg-slate-700">
                Correlation
              </TabsTrigger>
              <TabsTrigger value="impact" className="data-[state=active]:bg-slate-700">
                Impact Analysis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="patterns" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <h4 className="font-medium text-slate-200 mb-3">Time-based Patterns</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Peak anomaly hours:</span>
                      <span className="text-slate-300">2-4 AM, 6-8 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Weekday vs Weekend:</span>
                      <span className="text-slate-300">+23% on weekends</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Seasonal trend:</span>
                      <span className="text-slate-300">Higher in winter</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-4">
                  <h4 className="font-medium text-slate-200 mb-3">Severity Distribution</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">High severity:</span>
                      <span className="text-red-400">15%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Medium severity:</span>
                      <span className="text-amber-400">35%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Low severity:</span>
                      <span className="text-green-400">50%</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="correlation" className="space-y-4">
              <div className="text-center py-8 text-slate-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Correlation analysis coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="impact" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400 mb-1">$12,450</div>
                  <div className="text-sm text-slate-400">Revenue Impact</div>
                  <div className="text-xs text-slate-500 mt-1">Last 30 days</div>
                </div>
                <div className="bg-slate-800/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400 mb-1">2.3h</div>
                  <div className="text-sm text-slate-400">Avg Downtime</div>
                  <div className="text-xs text-slate-500 mt-1">Per incident</div>
                </div>
                <div className="bg-slate-800/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-400 mb-1">89%</div>
                  <div className="text-sm text-slate-400">Auto-resolved</div>
                  <div className="text-xs text-slate-500 mt-1">No manual intervention</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
