import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BatteryDetail,
  DecisionMetrics,
} from "../../app/(protected)/batteries/[batteryID]/types";
import {
  getSeverityColor,
  getRecommendationColor,
  getRecommendationLabel,
  getUrgencyColor,
} from "../../app/(protected)/batteries/[batteryID]/utils";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import {
  AlertCircle,
  FileText,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface DecisionSupportPanelProps {
  battery: BatteryDetail;
  decisionMetrics: DecisionMetrics;
}

const DecisionSupportPanel = ({
  battery,
  decisionMetrics,
}: DecisionSupportPanelProps) => {
  const radarData = [
    { metric: "Health", value: decisionMetrics.healthScore },
    { metric: "Performance", value: decisionMetrics.performanceScore },
    { metric: "Safety", value: decisionMetrics.safetyScore },
    { metric: "Longevity", value: decisionMetrics.longevityScore },
    { metric: "Efficiency", value: battery.coulombicEfficiency },
  ];

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <AlertCircle className="h-5 w-5 text-cyan-400" />
          Executive Decision Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Scores and Metrics */}
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm mb-2">
                Overall Health Score
              </p>
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold text-cyan-400">
                  {decisionMetrics.overallScore}
                </div>
                <div className="flex-1">
                  <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                      style={{ width: `${decisionMetrics.overallScore}%` }}
                    />
                  </div>
                  <p className="text-slate-500 text-xs mt-1">
                    Confidence: {decisionMetrics.confidenceLevel}%
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-400 text-sm mb-2">Recommendation</p>
                <Badge
                  className={`${getRecommendationColor(
                    decisionMetrics.recommendation
                  )} text-sm px-3 py-1`}
                >
                  {getRecommendationLabel(decisionMetrics.recommendation)}
                </Badge>
              </div>

              <div>
                <p className="text-slate-400 text-sm mb-2">
                  Replacement Urgency
                </p>
                <Badge
                  className={`${getUrgencyColor(
                    decisionMetrics.replacementUrgency
                  )} text-sm px-3 py-1`}
                >
                  {decisionMetrics.replacementUrgency.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800/50 rounded">
                <p className="text-slate-400 text-xs mb-1">Remaining Life</p>
                <p className="text-xl font-bold text-slate-100">
                  {decisionMetrics.estimatedRemainingLife} months
                </p>
                <p className="text-slate-500 text-xs">
                  {decisionMetrics.estimatedRemainingCycles} cycles
                </p>
              </div>

              <div className="p-3 bg-slate-800/50 rounded">
                <p className="text-slate-400 text-xs mb-1">Failure Risk</p>
                <p className="text-xl font-bold text-slate-100">
                  {decisionMetrics.predictedFailureRisk}%
                </p>
                <p className="text-slate-500 text-xs">Next 6 months</p>
              </div>
            </div>

            <div className="p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-2">Cost Analysis</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Replacement Cost:</span>
                  <span className="text-slate-100 font-medium">
                    ${decisionMetrics.costOfReplacement}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Delayed Replacement:</span>
                  <span className="text-orange-400 font-medium">
                    ${decisionMetrics.costOfDelayedReplacement.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-slate-700">
                  <span className="text-slate-300">Potential Loss:</span>
                  <span className="text-red-400 font-bold">
                    $
                    {(
                      decisionMetrics.costOfDelayedReplacement -
                      decisionMetrics.costOfReplacement
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Radar Chart */}
          <div>
            <p className="text-slate-400 text-sm mb-2">Performance Metrics</p>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#475569" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "#94a3b8" }}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="pt-4 border-t border-slate-700">
          <h3 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            Recommended Actions ({decisionMetrics.recommendedActions.length})
          </h3>
          <div className="space-y-2">
            {decisionMetrics.recommendedActions.map((action, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-slate-800/50 rounded"
              >
                <Badge
                  className={getSeverityColor(action.priority)}
                  variant="outline"
                >
                  {action.priority}
                </Badge>
                <div className="flex-1">
                  <p className="text-slate-200 font-medium text-sm">
                    {action.action}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    {action.expectedImpact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Factors and Strengths */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700">
          <div>
            <h3 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              Risk Factors ({decisionMetrics.riskFactors.length})
            </h3>
            {decisionMetrics.riskFactors.length > 0 ? (
              <div className="space-y-2">
                {decisionMetrics.riskFactors.map((risk, index) => (
                  <div key={index} className="p-3 bg-slate-800/50 rounded">
                    <div className="flex items-start gap-2 mb-1">
                      <Badge
                        className={getSeverityColor(risk.severity)}
                        variant="outline"
                      >
                        {risk.severity}
                      </Badge>
                      <p className="text-slate-200 text-sm font-medium flex-1">
                        {risk.factor}
                      </p>
                    </div>
                    <p className="text-slate-400 text-xs ml-2">{risk.impact}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">
                No risk factors identified
              </p>
            )}
          </div>

          <div>
            <h3 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              Strengths ({decisionMetrics.strengths.length})
            </h3>
            {decisionMetrics.strengths.length > 0 ? (
              <div className="space-y-2">
                {decisionMetrics.strengths.map((strength, index) => (
                  <div key={index} className="p-3 bg-slate-800/50 rounded">
                    <p className="text-slate-200 text-sm font-medium mb-1">
                      {strength.strength}
                    </p>
                    <p className="text-slate-400 text-xs">{strength.benefit}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No strengths identified</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DecisionSupportPanel;
