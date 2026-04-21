"use client";

import { useRef, useEffect, useState } from "react";
import { CustomerSwapData, SEGMENT_COLORS } from "@/hooks/useSwapAnalytics";
import type { Segment } from "@/hooks/useSwapAnalytics";

interface Props {
  customers: CustomerSwapData[];
  loading: boolean;
}

const SEGMENT_ORDER: Segment[] = ["Champion", "Rising", "Steady", "Cooling", "At risk", "New"];
const DEFAULT_Y_MIN = -100;
const DEFAULT_Y_MAX = 120;
const SCROLL_STEP = 100; 

export function SwapScatterChart({ customers, loading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const [hidden, setHidden] = useState<Set<Segment>>(new Set());
  const [yMin, setYMin] = useState(DEFAULT_Y_MIN);
  const [yMax, setYMax] = useState(DEFAULT_Y_MAX);

  // Compute true data bounds once
  const dataYMin = customers.length
    ? Math.floor(Math.min(...customers.map((c) => c.trend)) / 10) * 10 - 10
    : DEFAULT_Y_MIN;
  const dataYMax = customers.length
    ? Math.ceil(Math.max(...customers.map((c) => c.trend)) / 10) * 10 + 10
    : DEFAULT_Y_MAX;

  const canScrollUp = yMax < dataYMax;
  const canScrollDown = yMin > dataYMin;

  function scrollUp() {
    setYMin((v) => Math.min(v + SCROLL_STEP, dataYMax - (DEFAULT_Y_MAX - DEFAULT_Y_MIN)));
    setYMax((v) => Math.min(v + SCROLL_STEP, dataYMax));
  }

  function scrollDown() {
    setYMin((v) => Math.max(v - SCROLL_STEP, dataYMin));
    setYMax((v) => Math.max(v - SCROLL_STEP, dataYMin + (DEFAULT_Y_MAX - DEFAULT_Y_MIN)));
  }

  function resetView() {
    setYMin(DEFAULT_Y_MIN);
    setYMax(DEFAULT_Y_MAX);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    import("chart.js").then(({ Chart, registerables }) => {
      if (cancelled) return;
      Chart.register(...registerables);

      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      const canvas = canvasRef.current;
      if (!canvas || !customers.length) return;

      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
      const tickColor = isDark ? "#888" : "#999";
      const labelColor = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.22)";

      const allScores = customers.map((c) => c.score);
      const xMin = Math.max(-5, Math.floor(Math.min(...allScores) / 10) * 10 - 5);
      const xMax = Math.min(105, Math.ceil(Math.max(...allScores) / 10) * 10 + 10);

      // Count outliers outside the current window
      const outliersAbove = customers.filter((c) => c.trend > yMax).length;
      const outliersBelow = customers.filter((c) => c.trend < yMin).length;

      const datasets = SEGMENT_ORDER.map((seg) => ({
        label: seg,
        data: customers
          .filter((c) => c.segment === seg)
          .map((c) => ({
            x: c.score,
            y: c.trend,
            r: Math.max(5, Math.min(16, c.total / 12)),
            customerName: c.customerName,
            customerId: c.customerId,
            total: c.total,
            segment: seg,
            isOutlier: c.trend > yMax || c.trend < yMin,
          })),
        backgroundColor: SEGMENT_COLORS[seg] + "28",
        borderColor: SEGMENT_COLORS[seg],
        borderWidth: 1.5,
        hidden: hidden.has(seg),
        clip: true, // clip bubbles outside the y window
      }));

      chartRef.current = new Chart(canvas, {
        type: "bubble",
        data: { datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 16, right: 20, bottom: 8, left: 8 } },
          scales: {
            x: {
              min: xMin,
              max: xMax,
              title: {
                display: true,
                text: "Health score",
                color: tickColor,
                font: { size: 12 },
                padding: { top: 8 },
              },
              grid: { color: gridColor },
              ticks: { color: tickColor, font: { size: 11 }, maxTicksLimit: 10 },
              border: { color: gridColor },
            },
            y: {
              min: yMin,
              max: yMax,
              title: {
                display: true,
                text: "Swap trend (%)",
                color: tickColor,
                font: { size: 12 },
                padding: { bottom: 8 },
              },
              grid: { color: gridColor },
              ticks: {
                color: tickColor,
                font: { size: 11 },
                maxTicksLimit: 8,
                callback: (v: any) => (v > 0 ? "+" : "") + v + "%",
              },
              border: { color: gridColor },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? "#1e1e1e" : "#fff",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
              borderWidth: 1,
              titleColor: isDark ? "#e5e5e5" : "#111",
              bodyColor: isDark ? "#aaa" : "#555",
              padding: 10,
              callbacks: {
                title: (items: any[]) => items[0]?.raw?.customerName ?? "",
                label: (ctx: any) => {
                  const d = ctx.raw;
                  return [
                    `Segment: ${d.segment}`,
                    `Score: ${d.x}   Trend: ${d.y > 0 ? "+" : ""}${d.y}%`,
                    `Total swaps: ${d.total}`,
                  ];
                },
              },
            },
          },
        },
        plugins: [
          {
            id: "zoneLines",
            beforeDraw(chart: any) {
              const { ctx, chartArea: a, scales: { x, y } } = chart;

              ctx.save();
              ctx.strokeStyle = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.13)";
              ctx.lineWidth = 1;
              ctx.setLineDash([5, 5]);

              const y0 = y.getPixelForValue(0);
              if (y0 >= a.top && y0 <= a.bottom) {
                ctx.beginPath();
                ctx.moveTo(a.left, y0);
                ctx.lineTo(a.right, y0);
                ctx.stroke();
              }

              const x75 = x.getPixelForValue(75);
              if (x75 >= a.left && x75 <= a.right) {
                ctx.beginPath();
                ctx.moveTo(x75, a.top);
                ctx.lineTo(x75, a.bottom);
                ctx.stroke();
              }

              ctx.restore();

              ctx.save();
              ctx.font = "10px sans-serif";
              ctx.fillStyle = labelColor;

              if (x75 >= a.left && x75 <= a.right) {
                ctx.textAlign = "left";
                ctx.fillText("Champion zone →", x75 + 6, a.top + 14);
              }

              const y0Visible = y0 >= a.top && y0 <= a.bottom;
              if (y0Visible) {
                ctx.textAlign = "left";
                ctx.fillText("↑ growing", a.right - 70, y0 - 7);
                ctx.fillText("↓ declining", a.right - 70, y0 + 16);
              }

              ctx.restore();

              // Outlier indicator arrows at top/bottom edges
              ctx.save();
              ctx.font = "bold 11px sans-serif";

              if (outliersAbove > 0) {
                ctx.fillStyle = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
                ctx.textAlign = "center";
                ctx.fillText(
                  `▲ ${outliersAbove} customer${outliersAbove > 1 ? "s" : ""} above view`,
                  a.left + (a.right - a.left) / 2,
                  a.top + 14
                );
              }

              if (outliersBelow > 0) {
                ctx.fillStyle = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
                ctx.textAlign = "center";
                ctx.fillText(
                  `▼ ${outliersBelow} customer${outliersBelow > 1 ? "s" : ""} below view`,
                  a.left + (a.right - a.left) / 2,
                  a.bottom - 6
                );
              }

              ctx.restore();
            },
          },
        ],
      });
    });

    return () => {
      cancelled = true;
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [customers, hidden, yMin, yMax]);

  function toggleSegment(seg: Segment) {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(seg) ? next.delete(seg) : next.add(seg);
      return next;
    });
  }

  if (loading && !customers.length) {
    return (
      <div className="h-[420px] flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!customers.length) {
    return (
      <div className="h-[420px] flex items-center justify-center text-sm text-muted-foreground">
        No customer data available.
      </div>
    );
  }

  const isScrolled = yMin !== DEFAULT_Y_MIN || yMax !== DEFAULT_Y_MAX;

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {SEGMENT_ORDER.map((seg) => {
          const count = customers.filter((c) => c.segment === seg).length;
          const isHidden = hidden.has(seg);
          return (
            <button
              key={seg}
              onClick={() => toggleSegment(seg)}
              style={{
                color: isHidden ? undefined : SEGMENT_COLORS[seg],
                borderColor: isHidden ? "var(--border)" : SEGMENT_COLORS[seg],
                opacity: isHidden ? 0.45 : 1,
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-opacity"
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isHidden ? "currentColor" : SEGMENT_COLORS[seg],
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {seg}
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Chart + scroll controls */}
      <div className="flex gap-2 items-stretch">

        {/* Scroll controls — vertical on the left */}
        <div className="flex flex-col items-center justify-between gap-1 py-1">
          <button
            onClick={scrollUp}
            disabled={!canScrollUp}
            title="Scroll up to see higher trend outliers"
            className="p-1.5 rounded border text-xs disabled:opacity-25 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            ▲
          </button>

          <div className="flex flex-col items-center gap-1">
            {/* Mini progress indicator */}
            <div
              className="relative bg-muted rounded-full overflow-hidden"
              style={{ width: 4, height: 80 }}
              title={`Viewing ${yMin}% to ${yMax}% of ${dataYMin}% to ${dataYMax}%`}
            >
              <div
                className="absolute rounded-full bg-foreground/30"
                style={{
                  width: "100%",
                  top: `${((dataYMax - yMax) / (dataYMax - dataYMin)) * 100}%`,
                  height: `${((yMax - yMin) / (dataYMax - dataYMin)) * 100}%`,
                }}
              />
            </div>

            {isScrolled && (
              <button
                onClick={resetView}
                title="Reset to default view"
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                ↺
              </button>
            )}
          </div>

          <button
            onClick={scrollDown}
            disabled={!canScrollDown}
            title="Scroll down to see lower trend outliers"
            className="p-1.5 rounded border text-xs disabled:opacity-25 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            ▼
          </button>
        </div>

        {/* Chart canvas */}
        <div style={{ position: "relative", width: "100%", height: 400 }}>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Scatter plot of customers by health score and swap trend, colored by segment"
          />
        </div>
      </div>

      {/* Range indicator + axis note */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          X = health score &nbsp;·&nbsp; Y = swap trend % vs first 3 months &nbsp;·&nbsp; Dot size = total swaps
        </p>
        <p className="text-xs text-muted-foreground">
          Viewing{" "}
          <span className="font-medium text-foreground">
            {yMin > 0 ? "+" : ""}{yMin}%
          </span>{" "}
          to{" "}
          <span className="font-medium text-foreground">
            {yMax > 0 ? "+" : ""}{yMax}%
          </span>
          {isScrolled && (
            <span className="text-muted-foreground">
              {" "}(data range: {dataYMin > 0 ? "+" : ""}{dataYMin}% to +{dataYMax}%)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}