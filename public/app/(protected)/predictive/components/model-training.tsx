"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Pause, Square, Settings, TrendingUp, Clock, Target } from "lucide-react"

export default function ModelTraining() {
  const [isTraining, setIsTraining] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentEpoch, setCurrentEpoch] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [loss, setLoss] = useState(1.0)

  // Simulate training progress
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isTraining) {
      interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = Math.min(prev + Math.random() * 2, 100)
          setCurrentEpoch(Math.floor(newProgress / 2))
          setAccuracy(Math.min(0.95, 0.6 + (newProgress / 100) * 0.35))
          setLoss(Math.max(0.05, 1.0 - (newProgress / 100) * 0.95))

          if (newProgress >= 100) {
            setIsTraining(false)
          }

          return newProgress
        })
      }, 500)
    }

    return () => clearInterval(interval)
  }, [isTraining])

  const trainingModels = [
    {
      name: "Revenue Forecasting v2.1",
      status: "Training",
      progress: 67,
      accuracy: 0.892,
      eta: "12 min",
      type: "LSTM",
      dataset: "24M records",
    },
    {
      name: "Demand Prediction v1.3",
      status: "Queued",
      progress: 0,
      accuracy: 0,
      eta: "45 min",
      type: "Random Forest",
      dataset: "18M records",
    },
    {
      name: "Churn Analysis v3.0",
      status: "Completed",
      progress: 100,
      accuracy: 0.945,
      eta: "0 min",
      type: "XGBoost",
      dataset: "5.2M records",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Training":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30"
      case "Queued":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30"
      case "Completed":
        return "bg-green-500/10 text-green-400 border-green-500/30"
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30"
    }
  }

  return (
    <div className="space-y-6">
      {/* Training Queue */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-100">Training Queue</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                1 Training
              </Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                1 Queued
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trainingModels.map((model, index) => (
              <div key={index} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-slate-200">{model.name}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-slate-400">{model.type}</span>
                      <span className="text-xs text-slate-400">{model.dataset}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className={getStatusColor(model.status)}>
                      {model.status}
                    </Badge>
                    {model.status === "Training" && (
                      <Button size="sm" variant="ghost" className="text-slate-400">
                        <Pause className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-slate-300">{model.progress}%</span>
                  </div>
                  <Progress value={model.progress} className="h-2 bg-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${model.progress}%` }}
                    />
                  </Progress>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Accuracy: {(model.accuracy * 100).toFixed(1)}%</span>
                    <span>ETA: {model.eta}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Training Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Controls */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">Training Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setIsTraining(!isTraining)}
                className={isTraining ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              >
                {isTraining ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Training
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Training
                  </>
                )}
              </Button>

              <Button variant="outline" className="border-slate-700 bg-transparent">
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>

              <Button variant="outline" className="border-slate-700 bg-transparent">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Training Progress</span>
                  <span className="text-sm text-slate-300">{progress.toFixed(1)}%</span>
                </div>
                <Progress value={progress} className="h-3 bg-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </Progress>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Current Epoch</div>
                  <div className="text-lg font-mono text-cyan-400">{currentEpoch}/50</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Accuracy</div>
                  <div className="text-lg font-mono text-green-400">{(accuracy * 100).toFixed(1)}%</div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">Loss</div>
                <div className="text-lg font-mono text-purple-400">{loss.toFixed(4)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hyperparameters */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">Hyperparameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Learning Rate</label>
                <div className="bg-slate-800/50 rounded px-3 py-2 text-sm text-slate-300">0.001</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Batch Size</label>
                <div className="bg-slate-800/50 rounded px-3 py-2 text-sm text-slate-300">32</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Epochs</label>
                <div className="bg-slate-800/50 rounded px-3 py-2 text-sm text-slate-300">50</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Optimizer</label>
                <div className="bg-slate-800/50 rounded px-3 py-2 text-sm text-slate-300">Adam</div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-700">
              <h4 className="text-sm font-medium text-slate-300">Model Architecture</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Input Layer</span>
                  <span className="text-slate-300">128 neurons</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Hidden Layers</span>
                  <span className="text-slate-300">3 × 64 neurons</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Output Layer</span>
                  <span className="text-slate-300">1 neuron</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Activation</span>
                  <span className="text-slate-300">ReLU</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Metrics */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Real-time Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="performance" className="space-y-4">
            <TabsList className="bg-slate-800/50 p-1">
              <TabsTrigger value="performance" className="data-[state=active]:bg-slate-700">
                Performance
              </TabsTrigger>
              <TabsTrigger value="resources" className="data-[state=active]:bg-slate-700">
                Resources
              </TabsTrigger>
              <TabsTrigger value="logs" className="data-[state=active]:bg-slate-700">
                Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-slate-400">Validation Accuracy</span>
                  </div>
                  <div className="text-2xl font-mono text-green-400">{(accuracy * 100).toFixed(2)}%</div>
                  <div className="text-xs text-slate-500 mt-1">+2.3% from last epoch</div>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-slate-400">Training Loss</span>
                  </div>
                  <div className="text-2xl font-mono text-purple-400">{loss.toFixed(4)}</div>
                  <div className="text-xs text-slate-500 mt-1">-0.0023 from last epoch</div>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-slate-400">Time per Epoch</span>
                  </div>
                  <div className="text-2xl font-mono text-cyan-400">2.4s</div>
                  <div className="text-xs text-slate-500 mt-1">Avg over last 10 epochs</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">GPU Utilization</span>
                    <span className="text-sm text-slate-300">87%</span>
                  </div>
                  <Progress value={87} className="h-2 bg-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full"
                      style={{ width: "87%" }}
                    />
                  </Progress>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Memory Usage</span>
                    <span className="text-sm text-slate-300">12.4 GB</span>
                  </div>
                  <Progress value={62} className="h-2 bg-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      style={{ width: "62%" }}
                    />
                  </Progress>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <div className="bg-slate-800/30 rounded-lg p-4 h-64 overflow-y-auto">
                <div className="space-y-1 font-mono text-xs">
                  <div className="text-slate-400">[2024-01-15 14:32:15] Starting training epoch 23/50</div>
                  <div className="text-green-400">[2024-01-15 14:32:17] Epoch 23 - Loss: 0.0847, Accuracy: 0.892</div>
                  <div className="text-slate-400">[2024-01-15 14:32:17] Validation accuracy improved by 0.003</div>
                  <div className="text-slate-400">[2024-01-15 14:32:18] Starting training epoch 24/50</div>
                  <div className="text-green-400">[2024-01-15 14:32:20] Epoch 24 - Loss: 0.0824, Accuracy: 0.895</div>
                  <div className="text-cyan-400">[2024-01-15 14:32:20] New best model saved</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
