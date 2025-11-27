"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Database } from "lucide-react"
import type { DataField } from "../types/professional-types"

interface DataSource {
  id: string
  name: string
  type: string
  fields: DataField[]
}

interface DataSourcePanelProps {
  dataSources: DataSource[]
  selectedDataSource: DataSource
  onDataSourceSelect: (dataSource: DataSource) => void
}

export function DataSourcePanel({ dataSources, selectedDataSource, onDataSourceSelect }: DataSourcePanelProps) {
  return (
    <div className="p-3">
      <h3 className="text-sm font-medium mb-3 text-foreground">Data Sources</h3>
      <ScrollArea className="h-32">
        <div className="space-y-2">
          {dataSources.map((dataSource) => (
            <div
              key={dataSource.id}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                selectedDataSource.id === dataSource.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50 border border-transparent"
              }`}
              onClick={() => onDataSourceSelect(dataSource)}
            >
              <Database className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{dataSource.name}</div>
                <div className="text-xs text-muted-foreground">{dataSource.fields.length} fields</div>
              </div>
              <Badge variant="outline" className="text-xs">
                {dataSource.type}
              </Badge>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export default DataSourcePanel
