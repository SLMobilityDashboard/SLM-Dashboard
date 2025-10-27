import { DecisionMetrics } from "./types";
import ScoreCard from "./ScoreCard";
import { Activity, Gauge, Shield, Timer } from "lucide-react";

interface ScoreCardsProps {
  decisionMetrics: DecisionMetrics;
}

const ScoreCards = ({ decisionMetrics }: ScoreCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ScoreCard
        label="Health Score"
        score={decisionMetrics.healthScore}
        icon={Activity}
        color="text-green-400"
        subtitle="Capacity & SOH"
      />
      <ScoreCard
        label="Performance Score"
        score={decisionMetrics.performanceScore}
        icon={Gauge}
        color="text-blue-400"
        subtitle="Efficiency & Power"
      />
      <ScoreCard
        label="Safety Score"
        score={decisionMetrics.safetyScore}
        icon={Shield}
        color="text-purple-400"
        subtitle="Thermal & Balance"
      />
      <ScoreCard
        label="Longevity Score"
        score={decisionMetrics.longevityScore}
        icon={Timer}
        color="text-cyan-400"
        subtitle="Age & Usage"
      />
    </div>
  );
};

export default ScoreCards;
