"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, BarChart3, LineChart, PieChart, FileText, TrendingUp } from "lucide-react"
import type { CanvasElement } from "../types/professional-types"

interface VisualizationShelfProps {
  onElementAdd: (element: CanvasElement) => void
}

const visualizations = [
  { type: "table", name: "Table", icon: Table, description: "Display data in rows and columns" },
  {
    type: "chart",
    name: "Bar Chart",
    icon: BarChart3,
    description: "Compare values across categories",
    chartType: "bar",
  },
  { type: "chart", name: "Line Chart", icon: LineChart, description: "Show trends over time", chartType: "line" },
  { type: "chart", name: "Pie Chart", icon: PieChart, description: "Show proportions of a whole", chartType: "pie" },
  { type: "text", name: "Text", icon: FileText, description: "Add text content and insights" },
  { type: "kpi", name: "KPI", icon: TrendingUp, description: "Display key performance indicators" },
]

export function VisualizationShelf({ onElementAdd }: VisualizationShelfProps) {
  const handleAddVisualization = (viz: (typeof visualizations)[0]) => {
    const newElement: CanvasElement = {
      id: `element-${Date.now()}`,
      type: viz.type as any,
      position: { x: 50, y: 50 },
      size: { width: 400, height: 300 },
      config: {
        title: `New ${viz.name}`,
        ...(viz.chartType && { chartType: viz.chartType }),
        fields: {
          rows: [],
          columns: [],
          values: [],
          filters: [],
        },
      },
    }

    onElementAdd(newElement)
  }

  return (
    <div className="p-3">
      <h3 className="text-sm font-medium mb-3 text-foreground">Visualizations</h3>
      <ScrollArea className="h-96">
        <div className="space-y-2">
          {visualizations.map((viz) => {
            const Icon = viz.icon
            return (
              <Button
                key={`${viz.type}-${viz.chartType || "default"}`}
                variant="ghost"
                className="w-full justify-start h-auto p-3 text-left"
                onClick={() => handleAddVisualization(viz)}
              >
                <div className="flex items-start gap-3 w-full">
                  <Icon className="h-5 w-5 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-foreground">{viz.name}</div>
                    <div className="text-xs text-muted-foreground">{viz.description}</div>
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
