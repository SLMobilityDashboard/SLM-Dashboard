"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { CanvasElement } from "../types/professional-types"

interface CanvasKPIProps {
  element: CanvasElement
}

export function CanvasKPI({ element }: CanvasKPIProps) {
  const { value = "$0", change = "0%", trend = "neutral", description = "KPI" } = element.config

  return (
    <div className="h-full flex flex-col justify-center p-2">
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="flex items-center gap-2 mb-2">
        {trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
        {trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
        {trend === "neutral" && <Minus className="h-4 w-4 text-gray-500" />}
        <span
          className={`text-sm font-medium ${
            trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-gray-500"
          }`}
        >
          {change}
        </span>
      </div>
      <div className="text-xs text-gray-600">{description}</div>
    </div>
  )
}
