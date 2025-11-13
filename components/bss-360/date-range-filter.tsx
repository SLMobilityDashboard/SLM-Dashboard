"use client";

import type React from "react";

import { Calendar } from "lucide-react";
import { useState } from "react";

interface DateRangeFilterProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
}

export default function DateRangeFilter({
  onDateRangeChange,
}: DateRangeFilterProps) {
  const today = new Date();
  const defaultStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 7
  );
  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(today);

  const presets = [
    { label: "Last 7 Days", days: 7 },
    { label: "Last 30 Days", days: 30 },
    { label: "Last 90 Days", days: 90 },
    { label: "Last 6 Months", days: 180 },
    { label: "Year to Date", days: null },
  ];

  const handlePreset = (days: number | null) => {
    const end = new Date();
    let start = new Date();

    if (days === null) {
      start = new Date(end.getFullYear(), 0, 1);
    } else {
      start = new Date(end);
      start.setDate(end.getDate() - days);
    }

    setStartDate(start);
    setEndDate(end);
    onDateRangeChange(start, end);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = new Date(e.target.value);
    setStartDate(newStart);
    onDateRangeChange(newStart, endDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = new Date(e.target.value);
    setEndDate(newEnd);
    onDateRangeChange(startDate, newEnd);
  };

  const formatDate = (date: Date) => date.toISOString().split("T")[0];
  const daysDiff = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-cyan-400" />
        <label className="block text-sm font-medium text-slate-300">
          Analysis Period
        </label>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset.days)}
            className="px-3 py-1 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 transition-all"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={formatDate(startDate)}
            onChange={handleStartDateChange}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-2">End Date</label>
          <input
            type="date"
            value={formatDate(endDate)}
            onChange={handleEndDateChange}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300">
          <span className="font-medium text-cyan-400">{daysDiff}</span> days
        </div>
      </div>
    </div>
  );
}
