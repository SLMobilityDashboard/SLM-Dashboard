"use client";

import React, { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DateRangePickerProps {
  value?: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date } | undefined) => void;
  disabled?: boolean;
}

const DateRangePicker = ({
  value,
  onChange,
  disabled,
}: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>(
    value || {}
  );
  const [currentMonth, setCurrentMonth] = useState(value?.from || new Date());

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isInRange = (date: Date) => {
    if (!tempRange.from || !tempRange.to) return false;
    return date >= tempRange.from && date <= tempRange.to;
  };

  const handleDayClick = (day: number, monthOffset: number = 0) => {
    const clickedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + monthOffset,
      day
    );

    if (!tempRange.from || (tempRange.from && tempRange.to)) {
      setTempRange({ from: clickedDate, to: undefined });
    } else if (clickedDate < tempRange.from) {
      setTempRange({ from: clickedDate, to: tempRange.from });
    } else {
      setTempRange({ from: tempRange.from, to: clickedDate });
    }
  };

  const handleApply = () => {
    if (tempRange.from && tempRange.to) {
      onChange({ from: tempRange.from, to: tempRange.to });
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setTempRange({});
    onChange(undefined);
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const renderCalendar = (monthOffset: number = 0) => {
    const displayMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + monthOffset
    );
    const { daysInMonth, startingDayOfWeek, year, month } =
      getDaysInMonth(displayMonth);

    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const isSelected =
        (tempRange.from && isSameDay(currentDate, tempRange.from)) ||
        (tempRange.to && isSameDay(currentDate, tempRange.to));
      const inRange = isInRange(currentDate);
      const isToday = isSameDay(currentDate, new Date());

      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day)}
          className={`
            aspect-square rounded-lg text-sm font-medium transition-all
            ${
              isSelected
                ? "bg-cyan-500 text-white shadow-lg scale-105"
                : inRange
                ? "bg-cyan-500/20 text-cyan-300"
                : isToday
                ? "bg-slate-700 text-cyan-400 border border-cyan-500/50"
                : "text-slate-300 hover:bg-slate-700/50"
            }
          `}
        >
          {day}
        </button>
      );
    }

    return (
      <div className="space-y-3">
        <div className="text-center font-semibold text-slate-200">
          {monthNames[month]} {year}
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-slate-500 mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
            <div key={day} className="text-center font-medium">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    );
  };

  const formatDateRange = () => {
    if (!value?.from || !value?.to) return "Select date range";

    const formatDate = (date: Date) => {
      return `${monthNames[date.getMonth()].slice(
        0,
        3
      )} ${date.getDate()}, ${date.getFullYear()}`;
    };

    return `${formatDate(value.from)} - ${formatDate(value.to)}`;
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-2.5 rounded-lg
          bg-slate-800/50 border border-slate-600/50 text-slate-300
          hover:bg-slate-800 hover:border-slate-500/50 transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOpen ? "border-cyan-500/50 ring-2 ring-cyan-500/20" : ""}
        `}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <span className={value?.from && value?.to ? "" : "text-slate-500"}>
            {formatDateRange()}
          </span>
        </div>
        {value?.from && value?.to && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Calendar Panel */}
          <div className="absolute z-50 mt-2 p-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl min-w-max">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-slate-400" />
              </button>

              <div className="text-sm text-slate-400 font-medium">
                Select date range
              </div>

              <button
                onClick={nextMonth}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Two Month View */}
            <div className="grid grid-cols-1 gap-6">
              {renderCalendar(0)}
              {/* {renderCalendar(1)} */}
            </div>

            {/* Selection Info & Actions */}
            <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
              {/* Selected Range Display */}
              <div className="text-sm text-slate-400 text-center">
                {tempRange.from && tempRange.to ? (
                  <span className="text-cyan-400">
                    {tempRange.from.toLocaleDateString()} -{" "}
                    {tempRange.to.toLocaleDateString()}
                  </span>
                ) : tempRange.from ? (
                  <span className="text-amber-400">Select end date</span>
                ) : (
                  <span>Select start date</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTempRange(value || {});
                    setIsOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClear}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium"
                  disabled={!tempRange.from && !tempRange.to}
                >
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  disabled={!tempRange.from || !tempRange.to}
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors text-sm font-medium disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DateRangePicker;
