import { useState, useMemo } from "react";
import {
  MapPin,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  DollarSign,
  Users,
  AlertCircle,
} from "lucide-react";

// ============================================================================
// STATION ANALYSIS COMPONENT
// ============================================================================
export const StationAnalysis = ({ stationAnalysis, getCustomerSegment }) => {
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("opportunity"); // opportunity, revenue, customers

  const getSegmentColor = (segment) => {
    const colors = {
      "Power Riders": "#10b981",
      "Steady Riders": "#06b6d4",
      "Casual Commuters": "#f59e0b",
      "Home Energizers": "#a855f7",
    };
    return colors[segment] || "#64748b";
  };

  // Calculate strategic metrics for each station
  const enrichedStations = useMemo(() => {
    return stationAnalysis.map((station) => {
      const powerRiders = station.customers.filter(
        (c) => c.segment === "Power Riders"
      );
      const casualCommuters = station.customers.filter(
        (c) => c.segment === "Casual Commuters"
      );
      const steadyRiders = station.customers.filter(
        (c) => c.segment === "Steady Riders"
      );

      const powerRiderRevenue = powerRiders.reduce(
        (sum, c) => sum + c.revenue,
        0
      );
      const casualRevenue = casualCommuters.reduce(
        (sum, c) => sum + c.revenue,
        0
      );

      // Opportunity Score: High casual commuters + low power riders = good discount opportunity
      const opportunityScore =
        casualCommuters.length * 2 + (station.avgSwapsPerCustomer < 4 ? 10 : 0);

      // Revenue Concentration: % of revenue from top 20% customers
      const sortedByRevenue = [...station.customers].sort(
        (a, b) => b.revenue - a.revenue
      );
      const top20Count = Math.ceil(station.customers.length * 0.2);
      const top20Revenue = sortedByRevenue
        .slice(0, top20Count)
        .reduce((sum, c) => sum + c.revenue, 0);
      const revenueConcentration = (top20Revenue / station.totalRevenue) * 100;

      // Growth potential: stations with high casual users who could be converted
      const growthPotential =
        casualCommuters.length > 2 && station.avgSwapsPerCustomer < 5;

      // Loyalty risk: high concentration + few power riders
      const loyaltyRisk = revenueConcentration > 60 && powerRiders.length < 3;

      return {
        ...station,
        powerRiders,
        casualCommuters,
        steadyRiders,
        powerRiderRevenue,
        casualRevenue,
        opportunityScore,
        revenueConcentration,
        growthPotential,
        loyaltyRisk,
      };
    });
  }, [stationAnalysis]);

  // Sort stations based on selected strategy
  const sortedStations = useMemo(() => {
    const filtered = enrichedStations.filter((station) =>
      station.stationName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "opportunity":
          return b.opportunityScore - a.opportunityScore;
        case "revenue":
          return b.totalRevenue - a.totalRevenue;
        case "customers":
          return b.customerCount - a.customerCount;
        case "concentration":
          return b.revenueConcentration - a.revenueConcentration;
        default:
          return b.opportunityScore - a.opportunityScore;
      }
    });
  }, [enrichedStations, searchTerm, sortBy]);

  // Strategic recommendations
  const getStationStrategy = (station) => {
    if (station.growthPotential && station.casualCommuters.length >= 3) {
      return {
        type: "Growth Opportunity",
        color: "text-green-600",
        bgColor: "bg-green-50",
        icon: TrendingUp,
        action: `Offer 15-20% swap discount to convert ${station.casualCommuters.length} casual users`,
        impact: `Potential +Rs.${Math.round(
          station.casualRevenue * 0.4
        )}/week revenue`,
      };
    }

    if (station.loyaltyRisk) {
      return {
        type: "Loyalty Risk",
        color: "text-red-600",
        bgColor: "bg-red-50",
        icon: AlertCircle,
        action: "Diversify customer base - revenue too concentrated",
        impact: `${station.revenueConcentration.toFixed(0)}% from top 20%`,
      };
    }

    if (station.powerRiders.length >= 5 && station.avgSwapsPerCustomer > 6) {
      return {
        type: "Premium Station",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        icon: Zap,
        action: "Maintain premium service - high-value customers",
        impact: `Rs.${Math.round(
          station.powerRiderRevenue
        )}/week from power riders`,
      };
    }

    if (station.avgSwapsPerCustomer < 3 && station.customerCount > 5) {
      return {
        type: "Underutilized",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        icon: Target,
        action: "Launch frequency incentive program",
        impact: "Could 2x usage with right incentives",
      };
    }

    return {
      type: "Stable Station",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      icon: Users,
      action: "Monitor and maintain current performance",
      impact: "Operating at expected levels",
    };
  };

  const filteredStations = sortedStations.slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Strategic Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-secondary/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Growth Opportunities</span>
          </div>
          <p className="text-2xl font-bold">
            {enrichedStations.filter((s) => s.growthPotential).length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Stations ready for discounts
          </p>
        </div>

        <div className="rounded-lg border bg-secondary/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Premium Stations</span>
          </div>
          <p className="text-2xl font-bold">
            {enrichedStations.filter((s) => s.powerRiders.length >= 5).length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            High power rider concentration
          </p>
        </div>

        <div className="rounded-lg border bg-secondary/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Loyalty Risk</span>
          </div>
          <p className="text-2xl font-bold">
            {enrichedStations.filter((s) => s.loyaltyRisk).length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Over-dependent on few customers
          </p>
        </div>

        <div className="rounded-lg border bg-secondary/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Underutilized</span>
          </div>
          <p className="text-2xl font-bold">
            {
              enrichedStations.filter(
                (s) => s.avgSwapsPerCustomer < 3 && s.customerCount > 5
              ).length
            }
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Low usage, high potential
          </p>
        </div>
      </div>

      {/* Station List */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Strategic Station Analysis
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Data-driven recommendations for revenue optimization
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="opportunity">Sort: Best Opportunities</option>
                <option value="revenue">Sort: Highest Revenue</option>
                <option value="customers">Sort: Most Customers</option>
                <option value="concentration">Sort: Revenue Risk</option>
              </select>
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
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStations.map((station, idx) => {
              const strategy = getStationStrategy(station);
              const StrategyIcon = strategy.icon;

              return (
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
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-secondary border`}
                      >
                        <StrategyIcon className="w-3 h-3" />
                        {strategy.type}
                      </div>
                    </div>
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Revenue:</span>
                      <span className="font-semibold">
                        Rs.{Math.round(station.totalRevenue)}/wk
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Customers:</span>
                      <span className="font-semibold">
                        {station.powerRiders.length}P /{" "}
                        {station.casualCommuters.length}C
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Concentration:
                      </span>
                      <span className="font-semibold">
                        {station.revenueConcentration.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-xs p-2 rounded bg-secondary/50 border">
                    <p className="font-semibold mb-1">💡 {strategy.action}</p>
                    <p className="text-muted-foreground">{strategy.impact}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Station View */}
      {selectedStation && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedStation.stationName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Strategic analysis and recommendations
                </p>
              </div>
              <button
                onClick={() => setSelectedStation(null)}
                className="p-2 hover:bg-secondary rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold">
                  Rs.{Math.round(selectedStation.totalRevenue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">per week</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Customer Mix
                </p>
                <p className="text-2xl font-bold">
                  {selectedStation.customerCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedStation.powerRiders.length}P /{" "}
                  {selectedStation.steadyRiders.length}S /{" "}
                  {selectedStation.casualCommuters.length}C
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Revenue Concentration
                </p>
                <p
                  className={`text-2xl font-bold ${
                    selectedStation.revenueConcentration > 60
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {selectedStation.revenueConcentration.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  from top 20%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Avg Usage</p>
                <p className="text-2xl font-bold">
                  {selectedStation.avgSwapsPerCustomer.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  swaps/customer/week
                </p>
              </div>
            </div>

            {/* Strategic Recommendation */}
            {(() => {
              const strategy = getStationStrategy(selectedStation);
              const StrategyIcon = strategy.icon;
              return (
                <div className="p-4 rounded-lg mb-6 bg-secondary/50 border">
                  <div className="flex items-start gap-3">
                    <StrategyIcon className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-2">
                        Recommended Action: {strategy.type}
                      </h4>
                      <p className="text-sm mb-2 text-muted-foreground">
                        {strategy.action}
                      </p>
                      <p className="text-sm font-semibold">
                        Expected Impact: {strategy.impact}
                      </p>

                      {selectedStation.growthPotential && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-semibold mb-1">
                            Implementation Plan:
                          </p>
                          <ul className="text-xs space-y-1 text-muted-foreground">
                            <li>
                              • Week 1-2: Offer 20% discount on swaps to casual
                              commuters
                            </li>
                            <li>
                              • Week 3-4: Track conversion rate and usage
                              patterns
                            </li>
                            <li>
                              • Week 5+: Adjust to 15% for sustained growth
                            </li>
                            <li>
                              • Target: Convert{" "}
                              {selectedStation.casualCommuters.length} casual →
                              steady riders
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Customer Breakdown */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">
                Customer Breakdown ({selectedStation.customerCount} total)
              </h4>

              {/* Segment Summary */}
              <div className="grid gap-3 md:grid-cols-3 mb-4">
                <div className="p-3 rounded-lg bg-secondary/50 border">
                  <p className="text-xs font-semibold mb-1">Power Riders</p>
                  <p className="text-xl font-bold">
                    {selectedStation.powerRiders.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rs.{Math.round(selectedStation.powerRiderRevenue)}/wk
                    revenue
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border">
                  <p className="text-xs font-semibold mb-1">Steady Riders</p>
                  <p className="text-xl font-bold">
                    {selectedStation.steadyRiders.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rs.
                    {Math.round(
                      selectedStation.steadyRiders.reduce(
                        (sum, c) => sum + c.revenue,
                        0
                      )
                    )}
                    /wk revenue
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border">
                  <p className="text-xs font-semibold mb-1">Casual Commuters</p>
                  <p className="text-xl font-bold">
                    {selectedStation.casualCommuters.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rs.{Math.round(selectedStation.casualRevenue)}/wk revenue
                  </p>
                </div>
              </div>

              {/* Customer List */}
              <div className="space-y-2">
                {selectedStation.customers
                  .sort((a, b) => b.revenue - a.revenue)
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
                            {customer.swaps.toFixed(1)} swaps/week • Rs
                            {customer.revenue.toFixed(0)} revenue
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                        {customer.segment === "Casual Commuters" && (
                          <span className="text-xs text-orange-600 font-semibold">
                            🎯 Target
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
