export const getStatusColor = (status: string) => {
  switch (status) {
    case "online":
      return "text-green-400 bg-green-500/10 border-green-500/20";
    case "offline":
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    case "stale":
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    case "error":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
};

export const getCellStatusColor = (status: string) => {
  switch (status) {
    case "normal":
      return "bg-green-500";
    case "warning":
      return "bg-yellow-500";
    case "critical":
      return "bg-red-500";
    default:
      return "bg-slate-500";
  }
};

export const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "text-red-400 bg-red-500/10";
    case "high":
      return "text-orange-400 bg-orange-500/10";
    case "medium":
      return "text-yellow-400 bg-yellow-500/10";
    case "low":
      return "text-blue-400 bg-blue-500/10";
    default:
      return "text-slate-400 bg-slate-500/10";
  }
};

export const getRecommendationColor = (rec: string) => {
  switch (rec) {
    case "excellent":
      return "text-green-400 bg-green-500/10 border-green-500/20";
    case "good":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "monitor":
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    case "service_soon":
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    case "replace":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    case "immediate_action":
      return "text-red-500 bg-red-500/20 border-red-500/30";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
};

export const getRecommendationLabel = (rec: string) => {
  switch (rec) {
    case "excellent":
      return "Excellent Condition";
    case "good":
      return "Good Condition";
    case "monitor":
      return "Monitor Closely";
    case "service_soon":
      return "Service Soon";
    case "replace":
      return "Replace Recommended";
    case "immediate_action":
      return "Immediate Action Required";
    default:
      return "Unknown";
  }
};

export const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case "none":
      return "text-green-400 bg-green-500/10";
    case "low":
      return "text-blue-400 bg-blue-500/10";
    case "medium":
      return "text-yellow-400 bg-yellow-500/10";
    case "high":
      return "text-orange-400 bg-orange-500/10";
    case "critical":
      return "text-red-400 bg-red-500/10";
    default:
      return "text-slate-400 bg-slate-500/10";
  }
};

export const formatNumber = (num: number) =>
  new Intl.NumberFormat("en-US").format(Math.floor(num));