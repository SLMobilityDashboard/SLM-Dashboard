"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, X } from "lucide-react"
import type { CanvasElement, DataField } from "../types/professional-types"
import { useState } from "react"

interface PropertiesPanelProps {
  selectedElement: CanvasElement | null
  onElementUpdate: (id: string, updates: Partial<CanvasElement>) => void
}

export function PropertiesPanel({ selectedElement, onElementUpdate }: PropertiesPanelProps) {
  const [dragOver, setDragOver] = useState<string | null>(null)

  if (!selectedElement) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-medium text-foreground">Properties</h3>
        </div>
        <div className="text-sm text-muted-foreground">Select an element to view its properties</div>
      </div>
    )
  }

  const handleTitleChange = (title: string) => {
    onElementUpdate(selectedElement.id, {
      config: { ...selectedElement.config, title },
    })
  }

  const handleChartTypeChange = (chartType: string) => {
    onElementUpdate(selectedElement.id, {
      config: { ...selectedElement.config, chartType },
    })
  }

  const handleContentChange = (content: string) => {
    onElementUpdate(selectedElement.id, {
      config: { ...selectedElement.config, content },
    })
  }

  const handleFieldDrop = (e: React.DragEvent, area: string) => {
    e.preventDefault()
    setDragOver(null)

    const fieldData = e.dataTransfer.getData("application/json")
    if (fieldData) {
      const field: DataField = JSON.parse(fieldData)
      const currentFields = selectedElement.config.fields || { rows: [], columns: [], values: [], filters: [] }

      const updatedFields = {
        ...currentFields,
        [area]: [...(currentFields[area as keyof typeof currentFields] || []), field],
      }

      onElementUpdate(selectedElement.id, {
        config: { ...selectedElement.config, fields: updatedFields },
      })
    }
  }

  const handleFieldRemove = (area: string, index: number) => {
    const currentFields = selectedElement.config.fields || { rows: [], columns: [], values: [], filters: [] }
    const updatedFields = {
      ...currentFields,
      [area]: (currentFields[area as keyof typeof currentFields] || []).filter((_, i) => i !== index),
    }

    onElementUpdate(selectedElement.id, {
      config: { ...selectedElement.config, fields: updatedFields },
    })
  }

  const renderDropZone = (area: string, label: string) => {
    const fields = selectedElement.config.fields?.[area as keyof typeof selectedElement.config.fields] || []

    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        <div
          className={`min-h-[60px] p-2 border-2 border-dashed rounded-md transition-colors ${
            dragOver === area
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(area)
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => handleFieldDrop(e, area)}
        >
          {fields.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">Drop fields here</div>
          ) : (
            <div className="space-y-1">
              {fields.map((field: DataField, index: number) => (
                <div
                  key={`${field.id}-${index}`}
                  className="flex items-center justify-between bg-muted/50 rounded px-2 py-1"
                >
                  <span className="text-xs text-foreground">{field.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleFieldRemove(area, index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4 text-foreground" />
        <h3 className="text-sm font-medium text-foreground">Properties</h3>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-foreground">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="title" className="text-xs text-foreground">
              Title
            </Label>
            <Input
              id="title"
              value={selectedElement.config.title || ""}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="width" className="text-xs text-foreground">
                Width
              </Label>
              <Input
                id="width"
                type="number"
                value={selectedElement.size.width}
                onChange={(e) =>
                  onElementUpdate(selectedElement.id, {
                    size: { ...selectedElement.size, width: Number.parseInt(e.target.value) },
                  })
                }
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="height" className="text-xs text-foreground">
                Height
              </Label>
              <Input
                id="height"
                type="number"
                value={selectedElement.size.height}
                onChange={(e) =>
                  onElementUpdate(selectedElement.id, {
                    size: { ...selectedElement.size, height: Number.parseInt(e.target.value) },
                  })
                }
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {(selectedElement.type === "chart" || selectedElement.type === "table") && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-foreground">Data Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderDropZone("rows", "Rows")}
            {renderDropZone("columns", "Columns")}
            {renderDropZone("values", "Values")}
            {renderDropZone("filters", "Filters")}
          </CardContent>
        </Card>
      )}

      {selectedElement.type === "chart" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-foreground">Chart Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="chartType" className="text-xs text-foreground">
                Chart Type
              </Label>
              <Select value={selectedElement.config.chartType || "bar"} onValueChange={handleChartTypeChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedElement.type === "text" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-foreground">Text Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="content" className="text-xs text-foreground">
                Content
              </Label>
              <Textarea
                id="content"
                value={selectedElement.config.content || ""}
                onChange={(e) => handleContentChange(e.target.value)}
                className="text-sm"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-foreground">Position</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="x" className="text-xs text-foreground">
                X Position
              </Label>
              <Input
                id="x"
                type="number"
                value={selectedElement.position.x}
                onChange={(e) =>
                  onElementUpdate(selectedElement.id, {
                    position: { ...selectedElement.position, x: Number.parseInt(e.target.value) },
                  })
                }
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="y" className="text-xs text-foreground">
                Y Position
              </Label>
              <Input
                id="y"
                type="number"
                value={selectedElement.position.y}
                onChange={(e) =>
                  onElementUpdate(selectedElement.id, {
                    position: { ...selectedElement.position, y: Number.parseInt(e.target.value) },
                  })
                }
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PropertiesPanel
