"use client"

import type React from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Hash, MapPin, Map, Calendar, DollarSign, Clock, Battery, Tag, TrendingUp } from "lucide-react"
import type { DataField } from "../types/professional-types"

interface DataSource {
  id: string
  name: string
  type: string
  fields: DataField[]
}

interface FieldsPanelProps {
  dataSource: DataSource
  onFieldDragStart: (field: DataField) => void
  onFieldDragEnd: () => void
}

const getFieldIcon = (iconName: string) => {
  const icons = {
    hash: Hash,
    "map-pin": MapPin,
    map: Map,
    calendar: Calendar,
    "dollar-sign": DollarSign,
    clock: Clock,
    battery: Battery,
    tag: Tag,
    "trending-up": TrendingUp,
  }
  return icons[iconName as keyof typeof icons] || Hash
}

export function FieldsPanel({ dataSource, onFieldDragStart, onFieldDragEnd }: FieldsPanelProps) {
  const dimensions = dataSource.fields.filter((field) => field.type === "dimension")
  const measures = dataSource.fields.filter((field) => field.type === "measure")

  const handleDragStart = (e: React.DragEvent, field: DataField) => {
    e.dataTransfer.setData("application/json", JSON.stringify(field))
    e.dataTransfer.effectAllowed = "copy"
    onFieldDragStart(field)
  }

  const renderField = (field: DataField) => {
    const Icon = getFieldIcon(field.icon)
    return (
      <div
        key={field.id}
        draggable
        onDragStart={(e) => handleDragStart(e, field)}
        onDragEnd={onFieldDragEnd}
        className="flex items-center gap-2 p-2 rounded cursor-grab active:cursor-grabbing hover:bg-muted/50 border border-transparent hover:border-border transition-colors"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm flex-1 text-foreground">{field.name}</span>
        <Badge variant={field.type === "dimension" ? "secondary" : "outline"} className="text-xs">
          {field.type === "dimension" ? "Dim" : "Mea"}
        </Badge>
      </div>
    )
  }

  return (
    <div className="p-3 flex-1">
      <h3 className="text-sm font-medium mb-3 text-foreground">Fields - {dataSource.name}</h3>
      <ScrollArea className="h-96">
        <div className="space-y-4">
          {dimensions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Dimensions</h4>
              <div className="space-y-1">{dimensions.map(renderField)}</div>
            </div>
          )}

          {measures.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Measures</h4>
              <div className="space-y-1">{measures.map(renderField)}</div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default FieldsPanel
