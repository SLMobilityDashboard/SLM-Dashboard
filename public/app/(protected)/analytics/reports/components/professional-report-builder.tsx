"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  Upload,
  Download,
  Play,
  Database,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { DataSourcePanel } from "./data-source-panel";
import { ReportCanvas } from "./professional-canvas";
import { FieldsPanel } from "./fields-panel";
import { PropertiesPanel } from "./properties-panel";
import { VisualizationShelf } from "./visualization-shelf";
import type { DataField, CanvasElement } from "../types/professional-types";

// Mock data structure
const mockDataSources = [
  {
    id: "battery_swaps",
    name: "Battery Swaps",
    type: "table",
    fields: [
      {
        id: "swap_id",
        name: "Swap ID",
        type: "dimension",
        dataType: "string",
        icon: "hash",
      },
      {
        id: "station_id",
        name: "Station ID",
        type: "dimension",
        dataType: "string",
        icon: "map-pin",
      },
      {
        id: "area",
        name: "Area",
        type: "dimension",
        dataType: "string",
        icon: "map",
      },
      {
        id: "swap_date",
        name: "Swap Date",
        type: "dimension",
        dataType: "date",
        icon: "calendar",
      },
      {
        id: "revenue",
        name: "Revenue",
        type: "measure",
        dataType: "number",
        icon: "dollar-sign",
      },
      {
        id: "swap_duration",
        name: "Swap Duration",
        type: "measure",
        dataType: "number",
        icon: "clock",
      },
      {
        id: "battery_health",
        name: "Battery Health",
        type: "measure",
        dataType: "number",
        icon: "battery",
      },
    ],
  },
  {
    id: "stations",
    name: "Stations",
    type: "table",
    fields: [
      {
        id: "station_id",
        name: "Station ID",
        type: "dimension",
        dataType: "string",
        icon: "hash",
      },
      {
        id: "station_name",
        name: "Station Name",
        type: "dimension",
        dataType: "string",
        icon: "map-pin",
      },
      {
        id: "area",
        name: "Area",
        type: "dimension",
        dataType: "string",
        icon: "map",
      },
      {
        id: "capacity",
        name: "Capacity",
        type: "measure",
        dataType: "number",
        icon: "battery",
      },
      {
        id: "utilization_rate",
        name: "Utilization Rate",
        type: "measure",
        dataType: "number",
        icon: "trending-up",
      },
    ],
  },
  {
    id: "expenses",
    name: "Expenses",
    type: "table",
    fields: [
      {
        id: "expense_id",
        name: "Expense ID",
        type: "dimension",
        dataType: "string",
        icon: "hash",
      },
      {
        id: "expense_type",
        name: "Expense Type",
        type: "dimension",
        dataType: "string",
        icon: "tag",
      },
      {
        id: "station_id",
        name: "Station ID",
        type: "dimension",
        dataType: "string",
        icon: "map-pin",
      },
      {
        id: "expense_date",
        name: "Expense Date",
        type: "dimension",
        dataType: "date",
        icon: "calendar",
      },
      {
        id: "amount",
        name: "Amount",
        type: "measure",
        dataType: "number",
        icon: "dollar-sign",
      },
    ],
  },
];

const MyMockData = {
  battery_swaps: [
    {
      swap_id: "SWAP-001",
      station_id: "ST-001",
      area: "Downtown",
      swap_date: "2023-10-01",
      revenue: 50,
      swap_duration: 15,
      battery_health: 85,
    },
    {
      swap_id: "SWAP-002",
      station_id: "ST-002",
      area: "Uptown",
      swap_date: "2023-10-02",
      revenue: 60,
      swap_duration: 20,
      battery_health: 90,
    },
  ],
  stations: [
    {
      station_id: "ST-001",
      station_name: "Downtown Station",
      area: "Downtown",
      capacity: 10,
      utilization_rate: 75,
    },
    {
      station_id: "ST-002",
      station_name: "Uptown Station",
      area: "Uptown",
      capacity: 15,
      utilization_rate: 80,
    },
  ],
  expenses: [
    {
      expense_id: "EXP-001",
      expense_type: "Maintenance",
      station_id: "ST-001",
      expense_date: "2023-10-01",
      amount: 200,
    },
    {
      expense_id: "EXP-002",
      expense_type: "Electricity",
      station_id: "ST-002",
      expense_date: "2023-10-02",
      amount: 150,
    },
  ],
};

export function ProfessionalReportBuilder() {
  const [selectedDataSource, setSelectedDataSource] = useState(
    mockDataSources[0]
  );
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggedField, setDraggedField] = useState<DataField | null>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleElementAdd = useCallback((element: CanvasElement) => {
    setCanvasElements((prev) => [...prev, element]);
  }, []);

  const handleElementUpdate = useCallback(
    (id: string, updates: Partial<CanvasElement>) => {
      setCanvasElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
      );
    },
    []
  );

  const handleElementDelete = useCallback(
    (id: string) => {
      setCanvasElements((prev) => prev.filter((el) => el.id !== id));
      if (selectedElement === id) {
        setSelectedElement(null);
      }
    },
    [selectedElement]
  );

  const handleFieldDragStart = (field: DataField) => {
    setDraggedField(field);
  };

  const handleFieldDragEnd = () => {
    setDraggedField(null);
  };

  return (
    <div className="min-h-screen h-auto flex flex-col bg-background text-foreground">
      {/* Top Toolbar */}
      <div className="h-12 bg-card border-b flex items-center px-4 gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            className="text-foreground hover:bg-muted"
          >
            {leftSidebarCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground hover:bg-muted"
          >
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground hover:bg-muted"
          >
            <Upload className="h-4 w-4 mr-1" /> Open
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground hover:bg-muted"
          >
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground hover:bg-muted"
          >
            <Play className="h-4 w-4 mr-1" /> Run Query
          </Button>
        </div>

        <div className="flex-1" />
        <div className="text-sm text-muted-foreground">
          SL-Mobility Report Builder
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <div
          className={`${
            leftSidebarCollapsed ? "w-0" : "w-80"
          } bg-card border-r flex flex-col transition-all duration-300 overflow-y-auto`}
        >
          <Tabs defaultValue="data" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-2">
              <TabsTrigger value="data" className="text-xs">
                <Database className="h-3 w-3 mr-1" /> Data
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs">
                <BarChart3 className="h-3 w-3 mr-1" /> Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="flex-1 flex flex-col m-0">
              <DataSourcePanel
                dataSources={mockDataSources}
                selectedDataSource={selectedDataSource}
                onDataSourceSelect={setSelectedDataSource}
              />
              <Separator />
              <FieldsPanel
                dataSource={selectedDataSource}
                onFieldDragStart={handleFieldDragStart}
                onFieldDragEnd={handleFieldDragEnd}
              />
            </TabsContent>

            <TabsContent value="analytics" className="flex-1 m-0">
              <VisualizationShelf onElementAdd={handleElementAdd} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col bg-muted/30">
          <ReportCanvas
            ref={canvasRef}
            elements={canvasElements}
            selectedElement={selectedElement}
            onElementSelect={setSelectedElement}
            onElementUpdate={handleElementUpdate}
            onElementDelete={handleElementDelete}
            onElementAdd={handleElementAdd}
            draggedField={draggedField}
            // data={MyMockData}
          />
        </div>

        {/* Right Sidebar */}
        <div
          className={`${
            rightSidebarCollapsed ? "w-0" : "w-80"
          } bg-card border-l transition-all duration-300 overflow-y-auto`}
        >
          <div className="flex items-center justify-between p-2 border-b">
            <span className="text-sm font-medium text-foreground">
              Properties
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
              className="h-6 w-6 p-0 text-foreground hover:bg-muted"
            >
              {rightSidebarCollapsed ? (
                <Menu className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </Button>
          </div>
          <PropertiesPanel
            selectedElement={
              selectedElement
                ? canvasElements.find((el) => el.id === selectedElement)
                : null
            }
            onElementUpdate={handleElementUpdate}
          />
        </div>
      </div>
    </div>
  );
}
