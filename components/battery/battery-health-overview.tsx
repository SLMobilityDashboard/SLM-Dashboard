"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface BatteryHealthOverviewProps {
  batteryId: string
}

export function BatteryHealthOverview({ batteryId }: BatteryHealthOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-slate-100 mb-4">Health Metrics</h3>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-300">State of Health (SoH)</div>
                <div className="text-sm font-medium text-green-400">92%</div>
              </div>
              <Progress value={92} className="h-2 bg-slate-700">
                <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full"></div>
              </Progress>
              <p className="text-xs text-slate-500 mt-1">Excellent condition (90-100%)</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-300">Capacity Retention</div>
                <div className="text-sm font-medium text-green-400">94%</div>
              </div>
              <Progress value={94} className="h-2 bg-slate-700">
                <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full"></div>
              </Progress>
              <p className="text-xs text-slate-500 mt-1">Original capacity: 75 kWh, Current: 70.5 kWh</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-300">Internal Resistance</div>
                <div className="text-sm font-medium text-cyan-400">105%</div>
              </div>
              <Progress value={105} max={200} className="h-2 bg-slate-700">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
              </Progress>
              <p className="text-xs text-slate-500 mt-1">5% increase from baseline (normal aging)</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-300">Thermal Performance</div>
                <div className="text-sm font-medium text-green-400">96%</div>
              </div>
              <Progress value={96} className="h-2 bg-slate-700">
                <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full"></div>
              </Progress>
              <p className="text-xs text-slate-500 mt-1">Excellent heat dissipation characteristics</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-300">Cycle Count</div>
                <div className="text-sm font-medium text-cyan-400">342 / 2000</div>
              </div>
              <Progress value={17} className="h-2 bg-slate-700">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
              </Progress>
              <p className="text-xs text-slate-500 mt-1">17% of rated cycle life consumed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-slate-100 mb-4">Cell Balance</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-1"></div>
              <div className="col-span-1 text-center text-xs text-slate-500">Module 1</div>
              <div className="col-span-1 text-center text-xs text-slate-500">Module 2</div>
              <div className="col-span-1 text-center text-xs text-slate-500">Module 3</div>
              <div className="col-span-1 text-center text-xs text-slate-500">Module 4</div>

              <div className="col-span-1 text-xs text-slate-400">Voltage (V)</div>
              <div className="col-span-1 text-center text-xs text-green-400">3.82</div>
              <div className="col-span-1 text-center text-xs text-green-400">3.81</div>
              <div className="col-span-1 text-center text-xs text-green-400">3.83</div>
              <div className="col-span-1 text-center text-xs text-amber-400">3.79</div>

              <div className="col-span-1 text-xs text-slate-400">Temp (°C)</div>
              <div className="col-span-1 text-center text-xs text-green-400">28</div>
              <div className="col-span-1 text-center text-xs text-green-400">29</div>
              <div className="col-span-1 text-center text-xs text-green-400">27</div>
              <div className="col-span-1 text-center text-xs text-green-400">30</div>

              <div className="col-span-1 text-xs text-slate-400">IR (mΩ)</div>
              <div className="col-span-1 text-center text-xs text-green-400">24.2</div>
              <div className="col-span-1 text-center text-xs text-green-400">24.5</div>
              <div className="col-span-1 text-center text-xs text-green-400">24.1</div>
              <div className="col-span-1 text-center text-xs text-amber-400">25.8</div>
            </div>

            <div className="pt-4 border-t border-slate-700/50">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Cell Voltage Distribution</h4>

              <div className="flex items-end h-32 gap-1">
                {Array.from({ length: 24 }).map((_, i) => {
                  // Generate a random height between 90% and 100%
                  const height = 90 + Math.random() * 10
                  // Color based on height
                  let color = "bg-green-500"
                  if (height < 92) color = "bg-amber-500"
                  if (height < 90) color = "bg-red-500"

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div className={`w-full ${color} rounded-t-sm`} style={{ height: `${height}%` }}></div>
                      {(i + 1) % 6 === 0 && (
                        <div className="text-xs text-slate-500 mt-1">{Math.floor((i + 1) / 6)}</div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-2">
                <div className="text-xs text-slate-500">3.75V</div>
                <div className="text-xs text-slate-500">3.85V</div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700/50">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Recommendations</h4>
              <ul className="space-y-1">
                <li className="text-xs text-amber-400 flex items-start">
                  <span className="mr-1">•</span>
                  <span>Module 4 shows slightly higher internal resistance. Monitor for further changes.</span>
                </li>
                <li className="text-xs text-green-400 flex items-start">
                  <span className="mr-1">•</span>
                  <span>Overall cell balance is excellent. No balancing required at this time.</span>
                </li>
                <li className="text-xs text-cyan-400 flex items-start">
                  <span className="mr-1">•</span>
                  <span>Next detailed health check recommended in 3 months or 5,000 km.</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
