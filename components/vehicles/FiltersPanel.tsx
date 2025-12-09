// Filters Panel Component with Apply Button
const FiltersPanel: React.FC<{
  filters: BatteryFilters;
  onFiltersChange: (filters: BatteryFilters) => void;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ filters, onFiltersChange, isOpen, onToggle }) => {
  // Calculate default dates (last 7 days)
  const getDefaultEndDate = () => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  };

  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split("T")[0];
  };

  // Local state for pending filter changes
  const [pendingFilters, setPendingFilters] = useState<BatteryFilters>(filters);
  const [startDate, setStartDate] = useState<string>(
    filters.startTimestamp
      ? new Date(filters.startTimestamp * 1000).toISOString().split("T")[0]
      : getDefaultStartDate()
  );
  const [endDate, setEndDate] = useState<string>(
    filters.endTimestamp
      ? new Date(filters.endTimestamp * 1000).toISOString().split("T")[0]
      : getDefaultEndDate()
  );
  const [dateRangeError, setDateRangeError] = useState<string>("");

  // Check if there are unapplied changes
  const hasUnappliedChanges =
    JSON.stringify(pendingFilters) !== JSON.stringify(filters);

  const calculateDaysDifference = (start: string, end: string): number => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
  };

  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    setDateRangeError("");

    const start = new Date(newStartDate);
    const maxEnd = new Date(start);
    maxEnd.setDate(maxEnd.getDate() + 7);
    const currentEnd = new Date(endDate);
    const daysDiff = calculateDaysDifference(newStartDate, endDate);

    if (daysDiff > 7) {
      const adjustedEnd = maxEnd.toISOString().split("T")[0];
      setEndDate(adjustedEnd);
      setDateRangeError("End date adjusted to maintain 7-day maximum range");
      updatePendingTimeRange(newStartDate, adjustedEnd);
    } else if (currentEnd < start) {
      setEndDate(newStartDate);
      updatePendingTimeRange(newStartDate, newStartDate);
    } else {
      updatePendingTimeRange(newStartDate, endDate);
    }
  };

  const handleEndDateChange = (newEndDate: string) => {
    setDateRangeError("");
    const start = new Date(startDate);
    const end = new Date(newEndDate);
    const maxEnd = new Date(start);
    maxEnd.setDate(maxEnd.getDate() + 7);
    const daysDiff = calculateDaysDifference(startDate, newEndDate);

    if (daysDiff > 7) {
      const adjustedEnd = maxEnd.toISOString().split("T")[0];
      setEndDate(adjustedEnd);
      setDateRangeError("Maximum date range is 7 days");
      updatePendingTimeRange(startDate, adjustedEnd);
      return;
    }

    if (end < start) {
      setEndDate(startDate);
      setDateRangeError("End date cannot be before start date");
      updatePendingTimeRange(startDate, startDate);
      return;
    }

    setEndDate(newEndDate);
    updatePendingTimeRange(startDate, newEndDate);
  };

  const updatePendingTimeRange = (start: string, end: string) => {
    const startTime = new Date(start + "T00:00:00").getTime() / 1000;
    const endTime = new Date(end + "T23:59:59").getTime() / 1000;
    const hours = Math.ceil((endTime - startTime) / 3600);

    setPendingFilters({
      ...pendingFilters,
      timeRange: hours,
      startTimestamp: startTime,
      endTimestamp: endTime,
    });
  };

  const getMaxEndDate = () => {
    const start = new Date(startDate);
    const maxEnd = new Date(start);
    maxEnd.setDate(maxEnd.getDate() + 7);
    const today = new Date();
    return maxEnd < today
      ? maxEnd.toISOString().split("T")[0]
      : today.toISOString().split("T")[0];
  };

  const handleReset = () => {
    const defaultStart = getDefaultStartDate();
    const defaultEnd = getDefaultEndDate();
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setDateRangeError("");

    const startTime = new Date(defaultStart + "T00:00:00").getTime() / 1000;
    const endTime = new Date(defaultEnd + "T23:59:59").getTime() / 1000;

    setPendingFilters({
      timeRange: 168,
      startTimestamp: startTime,
      endTimestamp: endTime,
      includeIdleData: false,
    });
  };

  const handleApply = () => {
    onFiltersChange(pendingFilters);
    onToggle();
  };

  const handleCancel = () => {
    // Reset to current applied filters
    setPendingFilters(filters);
    if (filters.startTimestamp) {
      setStartDate(
        new Date(filters.startTimestamp * 1000).toISOString().split("T")[0]
      );
    }
    if (filters.endTimestamp) {
      setEndDate(
        new Date(filters.endTimestamp * 1000).toISOString().split("T")[0]
      );
    }
    setDateRangeError("");
    onToggle();
  };

  const daysDifference = calculateDaysDifference(startDate, endDate);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg"
      >
        <Filter className="w-4 h-4" />
        Filters
        {(filters.startTimestamp || filters.endTimestamp) && (
          <span className="bg-purple-500 text-white text-xs font-medium px-2 py-1 rounded-full">
            {calculateDaysDifference(
              new Date(filters.startTimestamp! * 1000)
                .toISOString()
                .split("T")[0],
              new Date(filters.endTimestamp! * 1000).toISOString().split("T")[0]
            )}
            d
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-2xl z-50 min-w-80">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-400" />
              Data Filters
            </h4>
            <button
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Date Range Filter */}
            <div className="pb-4 border-b border-slate-700">
              <label className="block text-sm text-slate-300 mb-2 font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Date Range (Max 7 days)
              </label>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    max={getDefaultEndDate()}
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    min={startDate}
                    max={getMaxEndDate()}
                    className="w-full bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Selected Range:</span>
                  <span
                    className={`font-medium ${
                      daysDifference === 7 ? "text-purple-400" : "text-blue-400"
                    }`}
                  >
                    {daysDifference} day{daysDifference !== 1 ? "s" : ""}
                  </span>
                </div>

                {dateRangeError && (
                  <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded px-2 py-1">
                    {dateRangeError}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={handleReset}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded transition-colors text-sm font-medium"
              >
                Reset
              </button>
              <button
                onClick={handleApply}
                disabled={!hasUnappliedChanges}
                className={`flex-1 px-3 py-2 rounded transition-colors text-sm font-medium ${
                  hasUnappliedChanges
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-slate-600 text-slate-400 cursor-not-allowed"
                }`}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
