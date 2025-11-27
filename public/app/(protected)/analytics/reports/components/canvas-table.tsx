"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CanvasElement } from "../types/professional-types";

interface CanvasTableProps {
  element: CanvasElement;
}

// Mock data for demonstration
const mockData = [
  { area: "Downtown", station: "Central Hub", revenue: 1250, swaps: 45 },
  { area: "University", station: "Main Gate", revenue: 980, swaps: 38 },
  { area: "Business", station: "Corporate Plaza", revenue: 1450, swaps: 52 },
  { area: "Residential", station: "Maple Heights", revenue: 750, swaps: 28 },
  { area: "Tourist", station: "Museum Quarter", revenue: 1100, swaps: 41 },
];

export function CanvasTable({ element }: CanvasTableProps) {
  const fields = element.config.fields;
  const rowFields = fields?.rows || [];
  const valueFields = fields?.values || [];

  if (rowFields.length === 0 && valueFields.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Drop fields to configure table
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <Table>
        <TableHeader>
          <TableRow>
            {rowFields.map((field) => (
              <TableHead key={field.id} className="text-xs">
                {field.name}
              </TableHead>
            ))}
            {valueFields.map((field) => (
              <TableHead key={field.id} className="text-xs text-right">
                {field.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockData.slice(0, 5).map((row, index) => (
            <TableRow key={index}>
              {rowFields.map((field) => (
                <TableCell key={field.id} className="text-xs">
                  {field.id === "area"
                    ? row.area
                    : field.id === "station_name"
                    ? row.station
                    : field.id === "station_id"
                    ? `ST-${index + 1}`
                    : "N/A"}
                </TableCell>
              ))}
              {valueFields.map((field) => (
                <TableCell key={field.id} className="text-xs text-right">
                  {field.id === "revenue"
                    ? `$${row.revenue}`
                    : field.id === "swap_duration"
                    ? `${row.swaps}`
                    : field.id === "capacity"
                    ? Math.floor(Math.random() * 50) + 20
                    : Math.floor(Math.random() * 100)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
