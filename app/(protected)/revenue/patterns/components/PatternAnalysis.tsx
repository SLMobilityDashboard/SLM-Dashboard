import React from "react";

// ============================================================================
// COMPONENT 3: BEHAVIOR PATTERNS & SCATTER PLOTS
// ============================================================================
export const PatternAnalysis = ({
  scatterData,
  customerSegments,
  getCustomerSegment,
}) => {
  const {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ComposedChart,
    Bar,
    Line,
    Legend,
  } = require("recharts");

  // Add safety check for customerSegments
  if (!customerSegments || customerSegments.length === 0) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <p className="text-muted-foreground">Loading pattern analysis...</p>
      </div>
    );
  }

  // Add safety check for scatterData
  if (!scatterData || scatterData.length === 0) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <p className="text-muted-foreground">
          No data available for pattern analysis.
        </p>
      </div>
    );
  }

  const getSegmentColor = (segment) => {
    const colors = {
      "Power Riders": "hsl(var(--chart-1))",
      "Steady Riders": "hsl(var(--chart-2))",
      "Casual Commuters": "hsl(var(--chart-3))",
      "Home Energizers": "hsl(var(--chart-4))",
    };
    return colors[segment] || "hsl(var(--chart-5))";
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="font-bold mb-2">{data.name}</p>
          {data.tboxId && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">TBOX ID:</span>
              <span className="font-medium">{data.tboxId}</span>
            </div>
          )}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Segment:</span>
              <span className="font-medium">{data.segment}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Avg Swaps:</span>
              <span className="font-medium">
                {data.avgSwaps?.toFixed(2)}/week
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Weekly Revenue:</span>
              <span className="font-medium">
                LKR {data.avgRevenue?.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Home Charges:</span>
              <span className="font-medium">
                {data.avgHomeCharges?.toFixed(2)}/week
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Distance:</span>
              <span className="font-medium">
                {data.avgDistance?.toFixed(2)} km/week
              </span>
            </div>
            {data.revenuePerSwap > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Revenue/Swap:</span>
                <span className="font-medium">
                  LKR {data.revenuePerSwap?.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const segmentChartData = customerSegments.map((seg) => ({
    name: seg.name,
    customers: seg.count,
    revenue: Math.round(seg.totalRevenue),
    avgSwaps: seg.avgSwaps.toFixed(1),
    color: seg.color,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">
            Customer Behavior Patterns
          </h3>
          <p className="text-sm text-muted-foreground">
            Analyze correlations between different customer metrics
          </p>
        </div>
        <div className="p-6 pt-0">
          <div className="grid gap-6">
            <div>
              <h4 className="text-sm font-medium mb-3">
                Swaps vs Total Revenue
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ bottom: 20, left: 20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="avgSwaps"
                    name="Avg Swaps"
                    className="text-xs"
                    type="number"
                    domain={[0, "dataMax + 1"]}
                    label={{
                      value: "Avg Swaps per Week",
                      position: "insideBottom",
                      offset: -10,
                    }}
                    tickFormatter={(value) => value.toFixed(0)}
                  />
                  <YAxis
                    dataKey="avgRevenue"
                    name="Avg Revenue"
                    className="text-xs"
                    type="number"
                    label={{
                      value: "Total Weekly Revenue (LKR)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                    tickFormatter={(value) => Math.round(value)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getSegmentColor(entry.segment)}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Swaps vs Distance</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ bottom: 20, left: 20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="avgSwaps"
                    name="Swaps"
                    className="text-xs"
                    type="number"
                    label={{
                      value: "Avg Swaps per Week",
                      position: "insideBottom",
                      offset: -10,
                    }}
                    tickFormatter={(value) => value.toFixed(0)}
                  />
                  <YAxis
                    dataKey="avgDistance"
                    name="Distance"
                    className="text-xs"
                    type="number"
                    domain={[0, "dataMax + 10"]}
                    label={{
                      value: "Distance (km/week)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                    tickFormatter={(value) => Math.round(value)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getSegmentColor(entry.segment)}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">
                Home Charges vs Swaps
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ bottom: 20, left: 20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="avgSwaps"
                    name="Swaps"
                    className="text-xs"
                    type="number"
                    label={{
                      value: "Avg Swaps per Week",
                      position: "insideBottom",
                      offset: -10,
                    }}
                    tickFormatter={(value) => value.toFixed(0)}
                  />
                  <YAxis
                    dataKey="avgHomeCharges"
                    name="Home Charges"
                    className="text-xs"
                    type="number"
                    domain={[0, "dataMax + 1"]}
                    label={{
                      value: "Home Charges per Week",
                      angle: -90,
                      position: "insideLeft",
                    }}
                    tickFormatter={(value) => value.toFixed(0)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getSegmentColor(entry.segment)}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">
                Revenue vs Distance Analysis
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ bottom: 20, left: 20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="avgRevenue"
                    name="Revenue"
                    className="text-xs"
                    type="number"
                    domain={[0, "dataMax + 100"]}
                    label={{
                      value: "Avg Revenue per Week (LKR)",
                      position: "insideBottom",
                      offset: -10,
                    }}
                    tickFormatter={(value) => Math.round(value)}
                  />
                  <YAxis
                    dataKey="avgDistance"
                    name="Distance"
                    className="text-xs"
                    type="number"
                    label={{
                      value: "Distance (km/week)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                    tickFormatter={(value) => Math.round(value)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getSegmentColor(entry.segment)}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg border">
            <h4 className="font-semibold mb-3">Segment Legend</h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: "hsl(var(--chart-1))" }}
                ></div>
                <span className="text-sm">Power Riders (5+ swaps)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: "hsl(var(--chart-2))" }}
                ></div>
                <span className="text-sm">Steady Riders (2-5 swaps)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: "hsl(var(--chart-3))" }}
                ></div>
                <span className="text-sm">Casual Commuters (&lt;2 swaps)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: "hsl(var(--chart-4))" }}
                ></div>
                <span className="text-sm">Home Energizers</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">
              Segment Distribution
            </h3>
          </div>
          <div className="p-6 pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={segmentChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  className="text-xs"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="customers"
                  fill="hsl(var(--primary))"
                  name="Customers"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  name="Revenue"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">
              Key Insights
            </h3>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-3">
              {customerSegments.map((seg) => (
                <div key={seg.name} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{seg.name}</span>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: seg.color }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">
                        Customers
                      </div>
                      <div className="font-bold">{seg.count}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">
                        Avg Swaps
                      </div>
                      <div className="font-bold">{seg.avgSwaps.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">
                        Avg Rev
                      </div>
                      <div className="font-bold">
                        {Math.round(seg.avgRevenue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
