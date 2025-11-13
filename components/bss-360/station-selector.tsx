"use client";

const STATIONS = [
  { id: "BSS-001", name: "Station 1", location: "Zone A", status: "Online" },
  { id: "BSS-002", name: "Station 2", location: "Zone A", status: "Online" },
  { id: "BSS-003", name: "Station 3", location: "Zone B", status: "Online" },
  { id: "BSS-004", name: "Station 4", location: "Zone B", status: "Warning" },
  { id: "BSS-005", name: "Station 5", location: "Zone C", status: "Online" },
];

interface StationSelectorProps {
  selectedStation: string;
  onStationChange: (stationId: string) => void;
}

export default function StationSelector({
  selectedStation,
  onStationChange,
}: StationSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">
        Select Station
      </label>
      <div className="flex flex-wrap gap-2">
        {STATIONS.map((station) => (
          <button
            key={station.id}
            onClick={() => onStationChange(station.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
              selectedStation === station.id
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                : "bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{station.name}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  station.status === "Online" ? "bg-green-400" : "bg-yellow-400"
                }`}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
