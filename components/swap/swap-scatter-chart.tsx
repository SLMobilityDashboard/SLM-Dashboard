"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { CustomerSwapData, SEGMENT_COLORS } from "@/hooks/useSwapAnalytics";
import type { Segment } from "@/hooks/useSwapAnalytics";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  customers: CustomerSwapData[];
  loading:   boolean;
  /** Called whenever the user clicks a dot or a quadrant cell.
   *  Pass null to clear the filter. */
  onFilter:  (ids: string[] | null) => void;
}

interface TooltipData {
  customer: CustomerSwapData;
  px: number;
  py: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEGMENTS: Segment[] = [
  "Champion", "Rising", "Re-engaged", "Steady", "Cooling", "At risk", "New",
];

// Signed-log: compresses fat tails while keeping zero at zero and sign intact.
// log(1+|x|) grows slowly for large |x|, so +500% and +50% are both visible.
function signedLog(x: number): number {
  return Math.sign(x) * Math.log1p(Math.abs(x));
}

// Deterministic per-customer jitter so dots don't jump on re-render
function jitter(seed: string, axis: "x" | "y", range: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  if (axis === "y") h = Math.imul(1664525, h) + 1013904223 | 0;
  return ((h >>> 0) / 0xffffffff - 0.5) * range;
}

// ─── Beeswarm canvas ─────────────────────────────────────────────────────────

interface BeeswarmProps {
  customers:   CustomerSwapData[];
  selectedIds: Set<string> | null;
  onDotClick:  (c: CustomerSwapData) => void;
  onClearClick:() => void;
}

function BeeswarmCanvas({ customers, selectedIds, onDotClick, onClearClick }: BeeswarmProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const hitRef     = useRef<{ cx: number; cy: number; r: number; customer: CustomerSwapData }[]>([]);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const rafRef     = useRef<number>(0);

  // Column X positions for each segment
  const SEG_COUNT  = SEGMENTS.length;
  const PADDING_L  = 12;
  const PADDING_R  = 12;
  const PADDING_T  = 32;
  const PADDING_B  = 40;

  // Canvas logical size (will scale to container via CSS)
  const CW = 560;
  const CH = 400;
  const plotW = CW - PADDING_L - PADDING_R;
  const plotH = CH - PADDING_T - PADDING_B;
  const colW  = plotW / SEG_COUNT;

  function segX(segIndex: number) {
    return PADDING_L + colW * segIndex + colW / 2;
  }

  // Y: health score 0–100 mapped to plotH, with a small symlog-compressed trend
  // encoded as colour. Health score is the primary vertical axis.
  function scoreToY(score: number) {
    return PADDING_T + (1 - score / 100) * plotH;
  }

  // Dot size: sqrt of total swaps, range 3.5–11
  const maxTotal = useMemo(
    () => Math.max(...customers.map((c) => c.total), 1),
    [customers]
  );
  function dotR(total: number) {
    return 3.5 + Math.sqrt(total / maxTotal) * 7.5;
  }

  // Trend → colour interpolation (red = declining, green = growing, grey = flat)
  function trendColor(trend: number, alpha = 1): string {
    // Map signed-log trend to [-1, 1]
    const logT  = signedLog(trend);
    const maxLog = signedLog(100);
    const t = Math.max(-1, Math.min(1, logT / maxLog));
    if (t >= 0) {
      // green ramp
      const r = Math.round(59  + (1 - t) * (180 - 59));
      const g = Math.round(109 + (1 - t) * (200 - 109));
      const b = Math.round(17  + (1 - t) * (180 - 17));
      return `rgba(${r},${g},${b},${alpha})`;
    } else {
      // red ramp
      const abs = -t;
      const r = Math.round(163 + abs * (220 - 163));
      const g = Math.round(45  + abs * (20  - 45));
      const b = Math.round(45  + abs * (20  - 45));
      return `rgba(${r},${g},${b},${alpha})`;
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = CW * dpr;
    canvas.height = CH * dpr;
    ctx.scale(dpr, dpr);

    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const bg      = "transparent";
    const gridCol = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const textCol = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.40)";
    const axisCol = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";

    ctx.clearRect(0, 0, CW, CH);

    // ── Score grid lines ──────────────────────────────────────────────────
    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.fillStyle = textCol;
    ctx.textAlign = "right";
    [0, 25, 50, 75, 100].forEach((score) => {
      const y = scoreToY(score);
      ctx.strokeStyle = score === 75 ? (isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.16)") : gridCol;
      ctx.lineWidth   = score === 75 ? 1 : 0.5;
      ctx.setLineDash(score === 75 ? [5, 4] : []);
      ctx.beginPath();
      ctx.moveTo(PADDING_L, y);
      ctx.lineTo(CW - PADDING_R, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(String(score), PADDING_L - 2, y + 4);
    });

    // Champion zone shading
    const y75 = scoreToY(75);
    ctx.fillStyle = isDark ? "rgba(59,109,17,0.06)" : "rgba(59,109,17,0.05)";
    const champX1 = segX(SEGMENTS.indexOf("Champion")) - colW / 2;
    ctx.fillRect(champX1, PADDING_T, colW, y75 - PADDING_T);

    // ── Column labels ─────────────────────────────────────────────────────
    ctx.font      = "11px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    SEGMENTS.forEach((seg, i) => {
      const x     = segX(i);
      const count = customers.filter((c) => c.segment === seg).length;
      ctx.fillStyle = SEGMENT_COLORS[seg];
      ctx.fillText(seg, x, PADDING_T - 14);
      ctx.fillStyle = textCol;
      ctx.fillText(`(${count})`, x, PADDING_T - 3);

      // Column separator
      if (i < SEG_COUNT - 1) {
        ctx.strokeStyle = axisCol;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x + colW / 2, PADDING_T);
        ctx.lineTo(x + colW / 2, CH - PADDING_B);
        ctx.stroke();
      }
    });

    // ── Y axis label ─────────────────────────────────────────────────────
    ctx.save();
    ctx.font      = "10px 'DM Sans', sans-serif";
    ctx.fillStyle = textCol;
    ctx.textAlign = "center";
    ctx.fillText("health score →", PADDING_L + 20, CH - 6);
    ctx.restore();

    // ── Dots ──────────────────────────────────────────────────────────────
    hitRef.current = [];

    // Sort: render selected on top
    const sorted = [...customers].sort((a, b) => {
      const aS = selectedIds?.has(a.customerId) ? 1 : 0;
      const bS = selectedIds?.has(b.customerId) ? 1 : 0;
      return aS - bS;
    });

    sorted.forEach((c) => {
      const si  = SEGMENTS.indexOf(c.segment);
      if (si < 0) return;
      const cx  = segX(si) + jitter(c.customerId + "x", "x", colW * 0.55);
      const cy  = scoreToY(c.score) + jitter(c.customerId + "y", "y", 6);
      const r   = dotR(c.total);
      const sel = selectedIds === null || selectedIds.has(c.customerId);
      const alpha = sel ? 0.88 : 0.15;

      hitRef.current.push({ cx, cy, r: r + 3, customer: c });

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle   = trendColor(c.trend, alpha);
      ctx.strokeStyle = sel
        ? trendColor(c.trend, Math.min(1, alpha + 0.3))
        : "transparent";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();

      // Ring for selected dot
      if (selectedIds?.has(c.customerId)) {
        ctx.beginPath();
        ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = trendColor(c.trend, 0.6);
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }
    });
  }, [customers, selectedIds, maxTotal]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // ── Mouse interaction ─────────────────────────────────────────────────────
  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect  = canvasRef.current!.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = getCanvasPos(e);
    const hit = hitRef.current.find(
      (h) => Math.hypot(h.cx - x, h.cy - y) <= h.r
    );
    if (hit) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const scaleX = rect.width / CW;
      const scaleY = rect.height / CH;
      setTooltip({
        customer: hit.customer,
        px: hit.cx * scaleX,
        py: hit.cy * scaleY,
      });
      canvasRef.current!.style.cursor = "pointer";
    } else {
      setTooltip(null);
      canvasRef.current!.style.cursor = "default";
    }
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = getCanvasPos(e);
    const hit = hitRef.current.find(
      (h) => Math.hypot(h.cx - x, h.cy - y) <= h.r
    );
    if (hit) {
      onDotClick(hit.customer);
    } else {
      onClearClick();
    }
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: CH, display: "block" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        onClick={handleClick}
        aria-label="Beeswarm chart of customers grouped by segment. Y axis = health score. Dot colour = trend direction."
      />

      {/* Trend colour legend */}
      <div style={{
        position:   "absolute",
        bottom:     PADDING_B - 2,
        right:      PADDING_R + 4,
        display:    "flex",
        alignItems: "center",
        gap:        6,
        fontSize:   10,
        opacity:    0.55,
      }}>
        <span style={{ color: "#A32D2D" }}>● declining</span>
        <span style={{ color: "#888" }}>● flat</span>
        <span style={{ color: "#3B6D11" }}>● growing</span>
        <span style={{ marginLeft: 8 }}>colour = trend</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position:    "absolute",
          left:        tooltip.px + 12,
          top:         tooltip.py - 10,
          background:  "var(--color-background-primary)",
          border:      "1px solid var(--color-border-secondary)",
          borderRadius: 8,
          padding:     "8px 12px",
          fontSize:    12,
          lineHeight:  1.65,
          pointerEvents:"none",
          zIndex:      10,
          maxWidth:    220,
          boxShadow:   "0 4px 16px rgba(0,0,0,0.10)",
          whiteSpace:  "nowrap",
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
            {tooltip.customer.customerName}
          </div>
          <div style={{ color: SEGMENT_COLORS[tooltip.customer.segment] }}>
            {tooltip.customer.segment}
          </div>
          <div>Score: <b>{tooltip.customer.score}</b></div>
          <div>
            Trend:{" "}
            <b style={{ color: trendColorStr(tooltip.customer.trend) }}>
              {tooltip.customer.trend > 0 ? "+" : ""}{tooltip.customer.trend}%/mo
            </b>
            {tooltip.customer.trendConfidence === "low" && (
              <span style={{ opacity: 0.55 }}> ⚠</span>
            )}
          </div>
          <div>Consistency: {tooltip.customer.consistency}%</div>
          <div>Total swaps: {tooltip.customer.total}</div>
          <div style={{ marginTop: 4, opacity: 0.5, fontSize: 11 }}>
            Click to filter table
          </div>
        </div>
      )}
    </div>
  );
}

// Plain string version for tooltip (no canvas context)
function trendColorStr(trend: number): string {
  if (trend > 10)  return "#3B6D11";
  if (trend < -10) return "#A32D2D";
  return "#888780";
}

// ─── Action matrix ────────────────────────────────────────────────────────────

interface MatrixProps {
  customers:   CustomerSwapData[];
  selectedIds: Set<string> | null;
  onQuadrant:  (ids: string[]) => void;
  onClear:     () => void;
}

const QUADRANTS = [
  {
    key:   "watch",
    label: "Watch closely",
    desc:  "High score, falling",
    scoreMin: 50, scoreMax: 100,
    trendMin: -Infinity, trendMax: -5,
    bg:    "rgba(133,79,11,0.08)",
    accent:"#854F0B",
    icon:  "⚠",
  },
  {
    key:   "champion",
    label: "Protect & reward",
    desc:  "High score, growing",
    scoreMin: 50, scoreMax: 100,
    trendMin: 5, trendMax: Infinity,
    bg:    "rgba(59,109,17,0.08)",
    accent:"#3B6D11",
    icon:  "★",
  },
  {
    key:   "atrisk",
    label: "Act now",
    desc:  "Low score, falling",
    scoreMin: 0, scoreMax: 50,
    trendMin: -Infinity, trendMax: -5,
    bg:    "rgba(163,45,45,0.09)",
    accent:"#A32D2D",
    icon:  "↓",
  },
  {
    key:   "invest",
    label: "Invest & nurture",
    desc:  "Low score, growing",
    scoreMin: 0, scoreMax: 50,
    trendMin: 5, trendMax: Infinity,
    bg:    "rgba(24,95,165,0.08)",
    accent:"#185FA5",
    icon:  "↑",
  },
] as const;

function ActionMatrix({ customers, selectedIds, onQuadrant, onClear }: MatrixProps) {
  const quadrantCustomers = useMemo(() =>
    QUADRANTS.map((q) =>
      customers.filter(
        (c) =>
          c.score >= q.scoreMin && c.score < q.scoreMax &&
          c.trend > q.trendMin  && c.trend <= q.trendMax
      )
    ),
    [customers]
  );

  // Flat customers that aren't in any quadrant (trend between -5 and +5)
  const flatCount = useMemo(
    () => customers.filter((c) => c.trend >= -5 && c.trend <= 5).length,
    [customers]
  );

  const activeQuadrantKey = useMemo(() => {
    if (!selectedIds) return null;
    for (let i = 0; i < QUADRANTS.length; i++) {
      const ids = quadrantCustomers[i].map((c) => c.customerId);
      if (ids.length > 0 && ids.every((id) => selectedIds.has(id)) && ids.length === selectedIds.size) {
        return QUADRANTS[i].key;
      }
    }
    return null;
  }, [selectedIds, quadrantCustomers]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", opacity: 0.45, textTransform: "uppercase" }}>
        Action matrix
      </div>
      <div style={{ fontSize: 11, opacity: 0.4, marginTop: -4, marginBottom: 4 }}>
        score vs trend direction
      </div>

      {/* 2×2 grid */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows:    "1fr 1fr",
        gap:                 8,
        flex:                1,
      }}>
        {/* Order: watch (top-left), champion (top-right), atrisk (bottom-left), invest (bottom-right) */}
        {QUADRANTS.map((q, i) => {
          const custs   = quadrantCustomers[i];
          const isActive = activeQuadrantKey === q.key;
          const hasSelection = selectedIds !== null;

          return (
            <button
              key={q.key}
              onClick={() => {
                if (custs.length === 0) return;
                if (isActive) { onClear(); return; }
                onQuadrant(custs.map((c) => c.customerId));
              }}
              style={{
                background:   isActive ? q.bg.replace("0.08", "0.16").replace("0.09", "0.17") : q.bg,
                border:       `1.5px solid ${isActive ? q.accent : "transparent"}`,
                borderRadius: 10,
                padding:      "12px 14px",
                textAlign:    "left",
                cursor:       custs.length > 0 ? "pointer" : "default",
                opacity:      hasSelection && !isActive ? 0.55 : 1,
                transition:   "all 0.15s",
                display:      "flex",
                flexDirection:"column",
                gap:          4,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 18, lineHeight: 1, color: q.accent }}>{q.icon}</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: q.accent, lineHeight: 1 }}>
                  {custs.length}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: q.accent, marginTop: 2 }}>
                {q.label}
              </div>
              <div style={{ fontSize: 11, opacity: 0.55 }}>
                {q.desc}
              </div>

              {/* Top 3 segments in this quadrant */}
              {custs.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                  {getTopSegments(custs).map(({ seg, n }) => (
                    <span
                      key={seg}
                      style={{
                        fontSize:     10,
                        padding:      "1px 6px",
                        borderRadius: 10,
                        background:   SEGMENT_COLORS[seg] + "22",
                        color:        SEGMENT_COLORS[seg],
                        fontWeight:   500,
                      }}
                    >
                      {seg} {n}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Flat band note */}
      <div style={{
        fontSize:   11,
        opacity:    0.40,
        textAlign:  "center",
        padding:    "4px 0",
      }}>
        {flatCount} customer{flatCount !== 1 ? "s" : ""} in flat band (trend −5% to +5%)
      </div>

      {/* Clear filter */}
      {selectedIds !== null && (
        <button
          onClick={onClear}
          style={{
            fontSize:     11,
            padding:      "5px 0",
            borderRadius: 6,
            border:       "1px solid var(--color-border-secondary)",
            background:   "transparent",
            cursor:       "pointer",
            opacity:      0.6,
          }}
        >
          ✕ Clear filter ({selectedIds.size} selected)
        </button>
      )}

      {/* Size legend */}
      <div style={{
        fontSize:   10,
        opacity:    0.35,
        display:    "flex",
        gap:        10,
        paddingTop: 2,
      }}>
        <span>● small dot = few swaps</span>
        <span>● large dot = many swaps</span>
      </div>
    </div>
  );
}

function getTopSegments(custs: CustomerSwapData[]): { seg: Segment; n: number }[] {
  const counts: Partial<Record<Segment, number>> = {};
  for (const c of custs) counts[c.segment] = (counts[c.segment] ?? 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3)
    .map(([seg, n]) => ({ seg: seg as Segment, n: n as number }));
}

// ─── Root component ───────────────────────────────────────────────────────────

export function SwapSegmentChart({ customers, loading, onFilter }: Props) {
  // null = no filter; Set = filtered customer IDs
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);

  function handleDotClick(c: CustomerSwapData) {
    // Clicking the same dot again clears
    if (selectedIds?.size === 1 && selectedIds.has(c.customerId)) {
      setSelectedIds(null);
      onFilter(null);
    } else {
      const s = new Set([c.customerId]);
      setSelectedIds(s);
      onFilter([c.customerId]);
    }
  }

  function handleQuadrant(ids: string[]) {
    const s = new Set(ids);
    setSelectedIds(s);
    onFilter(ids);
  }

  function handleClear() {
    setSelectedIds(null);
    onFilter(null);
  }

  if (loading && !customers.length) {
    return (
      <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4, fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  if (!customers.length) {
    return (
      <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4, fontSize: 13 }}>
        No customer data for the selected range.
      </div>
    );
  }

  return (
    <div style={{
      display:             "grid",
      gridTemplateColumns: "1fr 280px",
      gap:                 20,
      alignItems:          "stretch",
    }}>
      {/* ── Left: beeswarm ─────────────────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", opacity: 0.45, textTransform: "uppercase", marginBottom: 4 }}>
          Customer segment map
        </div>
        <div style={{ fontSize: 11, opacity: 0.40, marginBottom: 10 }}>
          Each dot = one customer · Y = health score · colour = trend · size = total swaps
        </div>
        <BeeswarmCanvas
          customers={customers}
          selectedIds={selectedIds}
          onDotClick={handleDotClick}
          onClearClick={handleClear}
        />
      </div>

      {/* ── Right: action matrix ────────────────────────────────────────── */}
      <ActionMatrix
        customers={customers}
        selectedIds={selectedIds}
        onQuadrant={handleQuadrant}
        onClear={handleClear}
      />
    </div>
  );
}