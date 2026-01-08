// utils/battery-utils.ts
export const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
};

export const getScoreBgColor = (score: number) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
};

export const getAnomalyColor = (type: string) => {
  switch (type) {
    case "critical":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    case "warning":
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    case "info":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
};

export const getAnomalyIcon = (type: string) => {
  switch (type) {
    case "critical":
      return "XCircle";
    case "warning":
      return "AlertTriangle";
    case "info":
      return "AlertCircle";
    default:
      return "AlertCircle";
  }
};

export const getCategoryIcon = (category: string) => {
  switch (category) {
    case "signal":
      return "Radio";
    case "health":
      return "Battery";
    case "usage":
      return "TrendingUp";
    case "error":
      return "Zap";
    default:
      return "AlertCircle";
  }
};

export const formatDuration = (hours: number) => {
  if (hours < 1) return "< 1 hour";
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
};

export const formatNumber = (num: number) =>
  new Intl.NumberFormat("en-US").format(Math.floor(num));