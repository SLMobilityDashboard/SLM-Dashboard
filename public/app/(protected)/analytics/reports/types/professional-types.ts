import type React from "react"

export interface DataField {
  id: string
  name: string
  type: "dimension" | "measure"
  dataType: "string" | "number" | "date" | "boolean"
  icon: string
}

export interface DataSource {
  id: string
  name: string
  type: "table" | "view" | "query"
  fields: DataField[]
}

export interface CanvasElement {
  id: string
  type: "table" | "chart" | "text" | "kpi" | "image"
  position: { x: number; y: number }
  size: { width: number; height: number }
  config: {
    title?: string
    chartType?: "bar" | "line" | "pie" | "area" | "scatter"
    fields?: {
      rows?: DataField[]
      columns?: DataField[]
      values?: DataField[]
      filters?: DataField[]
    }
    content?: string
    value?: string
    [key: string]: any
  }
  style?: {
    backgroundColor?: string
    borderColor?: string
    fontSize?: number
    fontWeight?: string
    textAlign?: "left" | "center" | "right"
  }
}

export interface ReportElement {
  id: string
  name: string
  type: "table" | "chart" | "text" | "kpi"
  icon: React.ComponentType<{ className?: string }>
  description: string
}

export interface VisualizationConfig {
  rows: DataField[]
  columns: DataField[]
  values: DataField[]
  filters: DataField[]
}
