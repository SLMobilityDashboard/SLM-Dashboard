"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AlertsOverview from "@/components/alerts-overview";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            Alert Analytics
          </h2>
          <p className="text-slate-400">
            Real-time monitoring of system alerts and anomalies
          </p>
        </div>
      </div>
      <AlertsOverview />
    </div>
  );
}
