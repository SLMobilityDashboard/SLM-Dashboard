"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AlertsOverview from "@/components/alerts-overview";
import ScooterTrackingMap from "@/components/fleet/ScooterTrackingMap";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            Fleet tracking
          </h2>
          <p className="text-slate-400">
            Fleet tracking and real-time monitoring
          </p>
        </div>
      </div>
      <ScooterTrackingMap />
    </div>
  );
}
