"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Filter } from "lucide-react"

interface BatchSelectorProps {
  selectedBatch: string
  onBatchChange: (batch: string) => void
}

export default function BatchSelector({ selectedBatch, onBatchChange }: BatchSelectorProps) {
  const batches = [
    { id: "all", label: "All Batches", devices: 24 },
    { id: "batch-2024-q4", label: "Q4 2024 Batch", devices: 12 },
    { id: "batch-2025-q1", label: "Q1 2025 Batch", devices: 8 },
    { id: "batch-pilot", label: "Pilot Program", devices: 4 },
  ]

  return (
    <Card className="bg-slate-800/50 border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-100">Select Analysis Period</span>
        </div>
        <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-700 bg-transparent">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {batches.map((batch) => (
          <Button
            key={batch.id}
            variant="outline"
            onClick={() => onBatchChange(batch.id)}
            className={`text-sm ${
              selectedBatch === batch.id
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                : "border-slate-600 text-slate-400 hover:bg-slate-700/50"
            }`}
          >
            {batch.label} ({batch.devices})
          </Button>
        ))}
      </div>
    </Card>
  )
}
