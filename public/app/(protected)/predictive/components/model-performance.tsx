"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Target, Activity, Zap, RefreshCw, Download, Settings, AlertCircle, CheckCircle } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"

export default function ModelPerformance() {
  const [selectedModel, setSelectedModel] = useState("revenue-forecast")
  const [timeRange, setTimeRange] = useState("7d")
  const [performanceData, setPerformanceData] = useState<any[]>([])

  // Generate performance data
  useEffect(() => {
    const generateData = () => {
      const data = []
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90

      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (days - i))

        data.push({
          date: date.toISOString().split("T")[0],
          accuracy: 0.85 + Math.random() * 0.1,
          precision: 0.82 + Math.random() * 0.12,
          recall: 0.88 + Math.random() * 0.08,
          f1Score: 0.85 + Math.random() * 0.1,
          latency: 120 + Math.random() * 50,
          throughput: 450 + Math.random() * 100,
        })
      }

      return data
    }

    setPerformanceData(generateData())
  }, [selectedModel, timeRange])

  const models = [
    {
      id: "revenue-forecast",
      name: "Revenue Forecasting",
      version: "v2.1",
      status: "active",
      accuracy: 94.2,
      latency: 145,
      throughput: 523,
      lastTrained: "2 days ago",
    },
    {
      id: "demand-prediction",
      name: "Demand Prediction",
      version: "v1.3",
      status: "active",
      accuracy: 91.8,
      latency: 98,
      throughput: 678,
      lastTrained: "5 days ago",
    },
    {
      id: "churn-analysis",
      name: "Churn Analysis",
      version: "v3.0",
      status: "training",
      accuracy: 89.5,
      latency: 203,
      throughput: 234,
      lastTrained: "1 hour ago",
    },
    {
      id: "price-optimization",
      name: "Price Optimization",
      version: "v1.0",
      status: "inactive",
      accuracy: 87.3,
      latency: 167,
      throughput: 345,
      lastTrained: "2 weeks ago",
    },
  ]

  const currentModel = models.find((m) => m.id === selectedModel)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-400 border-green-500/30"
      case "training":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30"
      case "inactive":
        return "bg-slate-500/10 text-slate-400 border-slate-500/30"
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30"
    }
  }

  const radarData = [
    { metric: "Accuracy", value: currentModel?.accuracy || 0, fullMark: 100 },
    { metric: "Precision", value: 92.1, fullMark: 100 },
    { metric: "Recall", value: 88.7, fullMark: 100 },
    { metric: "F1-Score", value: 90.3, fullMark: 100 },
    { metric: "Speed", value: 85.2, fullMark: 100 },
    { metric: "Stability", value: 96.8, fullMark: 100 },
  ]

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-64 bg-slate-800/50 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center space-x-2">
                    <span>{model.name}</span>
                    <Badge variant="outline" className={getStatusColor(model.status)}>
                      {model.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="border-slate-700 bg-transparent">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Model Overview */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-100">{currentModel?.name}</CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Version {currentModel?.version} • Last trained {currentModel?.lastTrained}
              </p>
            </div>
            <Badge variant="outline" className={getStatusColor(currentModel?.status || "inactive")}>
              {currentModel?.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-green-400" />
                <span className="text-sm text-slate-400">Accuracy</span>
              </div>
              <div className="text-2xl font-bold text-green-400">{currentModel?.accuracy}%</div>
              <div className="text-xs text-slate-500 mt-1">+0.3% from last week</div>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-slate-400">Latency</span>
              </div>
              <div className="text-2xl font-bold text-cyan-400">{currentModel?.latency}ms</div>
              <div className="text-xs text-slate-500 mt-1">-12ms from last week</div>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-400">Throughput</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">{currentModel?.throughput}/s</div>
              <div className="text-xs text-slate-500 mt-1">+45/s from last week</div>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-400">Uptime</span>
              </div>
              <div className="text-2xl font-bold text-amber-400">99.8%</div>
              <div className="text-xs text-slate-500 mt-1">Last 30 days</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy Trends */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                  />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0.8, 1]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#cbd5e1" }}
                    formatter={(value: number, name: string) => [
                      `${(value * 100).toFixed(1)}%`,
                      name.charAt(0).toUpperCase() + name.slice(1),
                    ]}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="precision" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="recall" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="f1Score" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center space-x-6 mt-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-slate-400">Accuracy</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                <span className="text-slate-400">Precision</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-slate-400">Recall</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-slate-400">F1-Score</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Radar */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Performance Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Radar
                    name="Performance"
                    dataKey="value"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Detailed Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="accuracy" className="space-y-4">
            <TabsList className="bg-slate-800/50 p-1">
              <TabsTrigger value="accuracy" className="data-[state=active]:bg-slate-700">
                Accuracy Metrics
              </TabsTrigger>
              <TabsTrigger value="performance" className="data-[state=active]:bg-slate-700">
                Performance
              </TabsTrigger>
              <TabsTrigger value="resource" className="data-[state=active]:bg-slate-700">
                Resource Usage
              </TabsTrigger>
              <TabsTrigger value="errors" className="data-[state=active]:bg-slate-700">
                Error Analysis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="accuracy" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    name: "Precision",
                    value: 92.1,
                    description: "True positives / (True positives + False positives)",
                  },
                  { name: "Recall", value: 88.7, description: "True positives / (True positives + False negatives)" },
                  { name: "F1-Score", value: 90.3, description: "Harmonic mean of precision and recall" },
                  { name: "AUC-ROC", value: 95.6, description: "Area under the ROC curve" },
                ].map((metric, index) => (
                  <div key={index} className="bg-slate-800/30 rounded-lg p-4">
                    <div className="text-lg font-bold text-slate-100 mb-1">{metric.value}%</div>
                    <div className="text-sm font-medium text-slate-300 mb-2">{metric.name}</div>
                    <div className="text-xs text-slate-500">{metric.description}</div>
                    <Progress value={metric.value} className="h-2 mt-3 bg-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        style={{ width: `${metric.value}%` }}
                      />
                    </Progress>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <h4 className="font-medium text-slate-200 mb-3">Latency Distribution</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">P50:</span>
                      <span className="text-slate-300">142ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">P95:</span>
                      <span className="text-slate-300">287ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">P99:</span>
                      <span className="text-slate-300">456ms</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-4">
                  <h4 className="font-medium text-slate-200 mb-3">Throughput Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Peak:</span>
                      <span className="text-slate-300">1,234/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Average:</span>
                      <span className="text-slate-300">523/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Minimum:</span>
                      <span className="text-slate-300">89/s</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-4">
                  <h4 className="font-medium text-slate-200 mb-3">Availability</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Uptime:</span>
                      <span className="text-green-400">99.8%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">MTBF:</span>
                      <span className="text-slate-300">720h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">MTTR:</span>
                      <span className="text-slate-300">12min</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="resource" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <h4 className="font-medium text-slate-200 mb-4">CPU & Memory Usage</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">CPU Usage</span>
                        <span className="text-slate-300">67%</span>
                      </div>
                      <Progress value={67} className="h-2 bg-slate-700">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full"
                          style={{ width: "67%" }}
                        />
                      </Progress>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Memory Usage</span>
                        <span className="text-slate-300">4.2 GB / 8 GB</span>
                      </div>
                      <Progress value={52.5} className="h-2 bg-slate-700">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          style={{ width: "52.5%" }}
                        />
                      </Progress>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-4">
                  <h4 className="font-medium text-slate-200 mb-4">Storage & Network</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Disk Usage</span>
                        <span className="text-slate-300">156 GB / 500 GB</span>
                      </div>
                      <Progress value={31.2} className="h-2 bg-slate-700">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                          style={{ width: "31.2%" }}
                        />
                      </Progress>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Network I/O</span>
                        <span className="text-slate-300">2.3 MB/s</span>
                      </div>
                      <Progress value={23} className="h-2 bg-slate-700">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                          style={{ width: "23%" }}
                        />
                      </Progress>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="errors" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <h4 className="font-medium text-slate-200 mb-4">Error Rates</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Prediction Errors</span>
                      <span className="text-sm text-red-400">0.8%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Timeout Errors</span>
                      <span className="text-sm text-amber-400">0.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">System Errors</span>
                      <span className="text-sm text-blue-400">0.1%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-4">
                  <h4 className="font-medium text-slate-200 mb-4">Recent Issues</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span className="text-slate-300">High latency detected</span>
                      <span className="text-slate-500">2h ago</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-slate-300">Memory leak resolved</span>
                      <span className="text-slate-500">1d ago</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <AlertCircle className="w-3 h-3 text-red-400" />
                      <span className="text-slate-300">Training data corruption</span>
                      <span className="text-slate-500">3d ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Model Comparison */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Model Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Model</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Version</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Accuracy</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Latency</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Throughput</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Last Trained</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model, index) => (
                  <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-sm text-slate-200">{model.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-400">{model.version}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={getStatusColor(model.status)}>
                        {model.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-green-400">{model.accuracy}%</td>
                    <td className="py-3 px-4 text-sm text-cyan-400">{model.latency}ms</td>
                    <td className="py-3 px-4 text-sm text-purple-400">{model.throughput}/s</td>
                    <td className="py-3 px-4 text-sm text-slate-400">{model.lastTrained}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
