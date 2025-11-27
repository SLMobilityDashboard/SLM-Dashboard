"use client";

import type React from "react";

import { forwardRef, useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, Settings } from "lucide-react";
import { CanvasTable } from "./canvas-table";
import { CanvasChart } from "./canvas-chart";
import { CanvasText } from "./canvas-text";
import { CanvasKPI } from "./canvas-kpi";
import type { CanvasElement, DataField } from "../types/professional-types";

interface ReportCanvasProps {
  elements: CanvasElement[];
  selectedElement: string | null;
  onElementSelect: (id: string | null) => void;
  onElementUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  onElementDelete: (id: string) => void;
  onElementAdd: (element: CanvasElement) => void;
  draggedField: DataField | null;
  data?: any[]; // Pass data directly as prop
}

export const ReportCanvas = forwardRef<HTMLDivElement, ReportCanvasProps>(
  (
    {
      elements,
      selectedElement,
      onElementSelect,
      onElementUpdate,
      onElementDelete,
      onElementAdd,
      draggedField,
      data = [],
    },
    ref
  ) => {
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const fieldData = e.dataTransfer.getData("application/json");
        if (fieldData) {
          const field: DataField = JSON.parse(fieldData);
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          // Create a new table element with the dropped field
          const newElement: CanvasElement = {
            id: `element-${Date.now()}`,
            type: "table",
            position: { x: Math.max(0, x - 100), y: Math.max(0, y - 50) },
            size: { width: 300, height: 200 },
            config: {
              title: `${field.name} Data`,
              fields: {
                rows: field.type === "dimension" ? [field] : [],
                columns: [],
                values: field.type === "measure" ? [field] : [],
                filters: [],
              },
              // Store the data directly in the element config
              data: data,
            },
          };

          onElementAdd(newElement);
        }
      },
      [onElementAdd, data]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragOver(false);
      }
    }, []);

    const handleElementMove = useCallback(
      (id: string, position: { x: number; y: number }) => {
        onElementUpdate(id, { position });
      },
      [onElementUpdate]
    );

    const handleElementResize = useCallback(
      (id: string, size: { width: number; height: number }) => {
        onElementUpdate(id, { size });
      },
      [onElementUpdate]
    );

    const renderElement = (element: CanvasElement) => {
      const isSelected = selectedElement === element.id;

      return (
        <div
          key={element.id}
          className={`absolute cursor-move ${
            isSelected ? "ring-2 ring-blue-500" : ""
          }`}
          style={{
            left: element.position.x,
            top: element.position.y,
            width: element.size.width,
            height: element.size.height,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onElementSelect(element.id);
          }}
        >
          <Card className="h-full bg-white shadow-sm border hover:shadow-md transition-shadow">
            <div className="h-full flex flex-col">
              {/* Element Header */}
              <div className="flex items-center justify-between p-2 border-b border bg-muted/50">
                <span className="text-xs font-medium truncate">
                  {element.config.title}
                </span>
                {isSelected && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onElementDelete(element.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Element Content */}
              <div className="flex-1 p-2 overflow-hidden">
                {element.type === "table" && (
                  <CanvasTable
                    element={element}
                    // data={element.config.data || data}
                  />
                )}
                {element.type === "chart" && (
                  <CanvasChart
                    element={element}
                    // data={element.config.data || data}
                  />
                )}
                {element.type === "text" && <CanvasText element={element} />}
                {element.type === "kpi" && (
                  <CanvasKPI
                    element={element}
                    // data={element.config.data || data}
                  />
                )}
              </div>
            </div>
          </Card>

          {/* Resize Handles */}
          {isSelected && (
            <>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize" />
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-blue-500 cursor-s-resize" />
              <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-3 bg-blue-500 cursor-e-resize" />
            </>
          )}
        </div>
      );
    };

    return (
      <div className="flex-1 p-4">
        <div
          ref={ref}
          className={`relative w-full h-full bg-white border-2 border-dashed transition-colors ${
            dragOver ? "border-primary bg-primary/10" : "border"
          }`}
          style={{
            minHeight: "800px",
            backgroundImage:
              "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => onElementSelect(null)}
        >
          {elements.map(renderElement)}

          {elements.length === 0 && !dragOver && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-lg mb-2">
                  Drop fields here to create visualizations
                </div>
                <div className="text-sm">
                  Drag dimensions and measures from the left panel
                </div>
              </div>
            </div>
          )}

          {dragOver && (
            <div className="absolute inset-0 flex items-center justify-center text-primary bg-primary/10 bg-opacity-50">
              <div className="text-center">
                <div className="text-lg font-medium">
                  Drop to create visualization
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ReportCanvas.displayName = "ReportCanvas";
