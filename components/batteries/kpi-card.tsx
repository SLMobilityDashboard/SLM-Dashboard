import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ============================================================================
// TYPES
// ============================================================================

interface BatteryKPIs {
  TOTAL_BMS: number;
  CRITICAL_BMS: number;
  WARNING_BMS: number;
  HEALTHY_BMS: number;
  AVG_HEALTH_SCORE: number;
  TOTAL_ANOMALIES: number;
  TOTAL_DISTANCE: number;
  AVG_CYCLES: number;
  AVG_DISTANCE_PER_CYCLE: number;
}

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  description: string;
  color: string;
  loading?: boolean;
}

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

const KPICard = ({
  icon: Icon,
  label,
  value,
  description,
  color,
  loading = false,
}: KPICardProps) => (
  <Card className="bg-slate-900/50 border-slate-700/50">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-300">
        {label}
      </CardTitle>
      <Icon className={`h-4 w-4 ${color}`} />
    </CardHeader>

    <CardContent>
      {loading ? (
        <div className="h-8 w-20 bg-slate-800 rounded animate-pulse" />
      ) : (
        <div className="text-2xl font-bold text-slate-100">{value}</div>
      )}
      <p className="text-xs text-slate-400 mt-1">{description}</p>
    </CardContent>
  </Card>
);

export default KPICard;
