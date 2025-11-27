"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MotorOverview from "@/components/motor-overview";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            Motor Overview
          </h2>
          <p className="text-slate-400">
            Comprehensive analysis of Motor performance and health metrics
          </p>
        </div>
      </div>
      <MotorOverview />
    </div>
  );
}
