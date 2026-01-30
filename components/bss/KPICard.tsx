import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
  colorClass?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  subtitle,
  colorClass = "text-cyan-400",
}) => (
  <Card className="bg-slate-900/50 border-slate-700/50">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-300">
        {title}
      </CardTitle>
      <div className={`h-4 w-4 ${colorClass}`}>
        {icon}
      </div>
    </CardHeader>

    <CardContent>
      <div className="text-2xl font-bold text-slate-100">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

export default KPICard;