import { useState } from "react";
import { MapPin, Search, X } from "lucide-react";

// ============================================================================
// STATION ANALYSIS COMPONENT
// ============================================================================
export const StationAnalysis = ({ stationAnalysis, getCustomerSegment }) => {
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStations = stationAnalysis.filter((station) =>
    station.stationName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSegmentColor = (segment) => {
    const colors = {
      "Power Riders": "#10b981",
      "Steady Riders": "#06b6d4",
      "Casual Commuters": "#f59e0b",
      "Home Energizers": "#a855f7",
    };
    return colors[segment] || "#64748b";
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Station Usage Analysis
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Customer preferences by swap station
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search stations..."
                className="pl-10 pr-3 py-2 border rounded-md text-sm bg-background"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStations.slice(0, 12).map((station, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedStation(station)}
                className="p-4 rounded-lg border bg-secondary/50 hover:bg-secondary cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                      {station.stationName}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Station #{idx + 1}
                    </p>
                  </div>
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customers:</span>
                    <span className="font-semibold">
                      {station.customerCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Swaps:</span>
                    <span className="font-semibold">
                      {station.avgSwapsPerCustomer.toFixed(1)}/week
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total Revenue:
                    </span>
                    <span className="font-semibold">
                      ₹{Math.round(station.totalRevenue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedStation && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedStation.stationName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Customer details for this station
                </p>
              </div>
              <button
                onClick={() => setSelectedStation(null)}
                className="p-2 hover:bg-secondary rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Total Customers
                </p>
                <p className="text-2xl font-bold">
                  {selectedStation.customerCount}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Avg Swaps/Customer
                </p>
                <p className="text-2xl font-bold">
                  {selectedStation.avgSwapsPerCustomer.toFixed(1)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold">
                  ₹{Math.round(selectedStation.totalRevenue)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm mb-3">
                Customers using this station
              </h4>
              {selectedStation.customers
                .sort((a, b) => b.swaps - a.swaps)
                .map((customer, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-semibold text-muted-foreground w-6">
                        #{idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {customer.swaps.toFixed(1)} swaps/week • ₹
                          {customer.revenue.toFixed(0)} revenue
                        </p>
                      </div>
                    </div>
                    <div
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: `${getSegmentColor(
                          customer.segment
                        )}20`,
                        color: getSegmentColor(customer.segment),
                      }}
                    >
                      {customer.segment}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
