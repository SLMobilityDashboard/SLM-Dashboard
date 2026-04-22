export const MONTHS = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

export type Segment = "Champion" | "Rising" | "Steady" | "Cooling" | "At risk" | "New";

export interface CustomerSwapData {
  id: string;
  name: string;
  phone: string;
  area: string;
  history: number[]; // 12 months of swap counts
  // Computed
  score: number;
  segment: Segment;
  total: number;
  avg3: number;       // last 3-month average
  peak: number;
  trend: number;      // % change: last 3mo vs first 3mo
  consistency: number; // % of months with >0 swaps
  cv: number;         // coefficient of variation (lower = more stable)
}

export const SEGMENT_COLORS: Record<Segment, string> = {
  Champion: "#3B6D11",
  Rising:   "#185FA5",
  Steady:   "#5F5E5A",
  Cooling:  "#854F0B",
  "At risk":"#A32D2D",
  New:      "#993556",
};

export const SEGMENT_BG: Record<Segment, string> = {
  Champion: "bg-green-100 text-green-800",
  Rising:   "bg-blue-100 text-blue-800",
  Steady:   "bg-gray-100 text-gray-700",
  Cooling:  "bg-amber-100 text-amber-800",
  "At risk":"bg-red-100 text-red-800",
  New:      "bg-pink-100 text-pink-800",
};

export const OFFERS: Record<Segment, string> = {
  Champion:  "Priority swap lane + free quarterly battery check",
  Rising:    "10% off next 15 swaps — keep the momentum",
  Steady:    "Loyalty reward: 1 free swap per 20",
  Cooling:   "Re-engagement: 3 free swaps this month",
  "At risk": "Win-back: 5 free swaps + personal call",
  New:       "Welcome pack: first 5 swaps at 50% off",
};

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type Pattern = "champion" | "rising" | "steady" | "cooling" | "atrisk" | "new";

function genHistory(pattern: Pattern): number[] {
  const base = rnd(8, 22);
  return MONTHS.map((_, i) => {
    let v = base;
    if (pattern === "rising")   v = Math.round(base * (0.5 + i * 0.055) + rnd(-2, 3));
    else if (pattern === "champion") v = Math.round(base * (1.1 + Math.sin(i * 0.5) * 0.1) + rnd(-1, 2));
    else if (pattern === "cooling")  v = Math.round(base * (1.2 - i * 0.04) + rnd(-2, 2));
    else if (pattern === "atrisk")   v = Math.round(base * (1.3 - i * 0.09) + rnd(-3, 1));
    else if (pattern === "new")      v = i < 4 ? 0 : rnd(3, 10);
    else v = base + rnd(-3, 3);
    return Math.max(0, v);
  });
}

function computeMetrics(hist: number[]) {
  const total = hist.reduce((a, b) => a + b, 0);
  const avg = total / hist.length;
  const peak = Math.max(...hist);
  const recent3 = hist.slice(-3);
  const early3 = hist.slice(0, 3).filter(v => v > 0);
  const avg3 = Math.round((recent3.reduce((a, b) => a + b, 0) / 3) * 10) / 10;
  const avgEarly = early3.length ? early3.reduce((a, b) => a + b, 0) / early3.length : 0;
  const trend = avgEarly > 0 ? Math.round(((avg3 - avgEarly) / avgEarly) * 100) : avg3 > 0 ? 100 : 0;
  const nonZero = hist.filter(v => v > 0).length;
  const consistency = Math.round((nonZero / hist.length) * 100);
  const variance = hist.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / hist.length;
  const cv = avg > 0 ? Math.sqrt(variance) / avg : 1;
  return { total, avg, peak, avg3, trend, consistency, cv };
}

function healthScore(m: ReturnType<typeof computeMetrics>): number {
  let s = 0;
  s += Math.min(30, Math.round((m.avg / 25) * 30));
  s += Math.min(25, Math.round(((m.trend + 50) / 150) * 25));
  s += Math.min(25, Math.round((m.consistency / 100) * 25));
  s += Math.min(20, Math.round(Math.max(0, 1 - m.cv) * 20));
  return Math.min(100, Math.max(0, s));
}

function classify(score: number, trend: number, consistency: number, hist: number[]): Segment {
  const hasRecent = hist.slice(-2).some(v => v > 0);
  const isNew = hist.slice(0, 4).every(v => v === 0) && hasRecent;
  if (isNew) return "New";
  if (score >= 75 && trend >= -10) return "Champion";
  if (trend >= 20 && consistency >= 60) return "Rising";
  if (trend <= -25 || (!hasRecent && consistency < 40)) return "At risk";
  if (trend <= -10 && score < 60) return "Cooling";
  return "Steady";
}

const RAW: { name: string; phone: string; area: string; pattern: Pattern }[] = [
  { name: "Kamal Perera",       phone: "+94771234501", area: "Colombo",    pattern: "champion" },
  { name: "Nimal Fernando",     phone: "+94771234502", area: "Negombo",    pattern: "rising"   },
  { name: "Saman Dissanayake",  phone: "+94771234503", area: "Kandy",      pattern: "champion" },
  { name: "Priya Jayawardena",  phone: "+94771234504", area: "Gampaha",    pattern: "steady"   },
  { name: "Ruwan Bandara",      phone: "+94771234505", area: "Colombo",    pattern: "atrisk"   },
  { name: "Amara Silva",        phone: "+94771234506", area: "Matara",     pattern: "cooling"  },
  { name: "Tharanga Kumara",    phone: "+94771234507", area: "Kurunegala", pattern: "new"      },
  { name: "Hasini Mendis",      phone: "+94771234508", area: "Negombo",    pattern: "rising"   },
  { name: "Dinesh Wijesinghe",  phone: "+94771234509", area: "Colombo",    pattern: "champion" },
  { name: "Chamari Rathnayake", phone: "+94771234510", area: "Kandy",      pattern: "rising"   },
  { name: "Buddhika Liyanage",  phone: "+94771234511", area: "Gampaha",    pattern: "atrisk"   },
  { name: "Isuru Madushan",     phone: "+94771234512", area: "Matara",     pattern: "new"      },
  { name: "Sachini Perera",     phone: "+94771234513", area: "Colombo",    pattern: "steady"   },
  { name: "Lahiru Kumara",      phone: "+94771234514", area: "Kurunegala", pattern: "cooling"  },
  { name: "Thilini Silva",      phone: "+94771234515", area: "Negombo",    pattern: "rising"   },
];

// Stable seed — generated once at module level
export const MOCK_CUSTOMERS: CustomerSwapData[] = RAW.map((r, i) => {
  const history = genHistory(r.pattern);
  const m = computeMetrics(history);
  const score = healthScore(m);
  const segment = classify(score, m.trend, m.consistency, history);
  return { id: String(i), ...r, history, score, segment, ...m };
});