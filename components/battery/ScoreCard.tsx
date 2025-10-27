import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface ScoreCardProps {
  label: string;
  score: number;
  icon: LucideIcon;
  color: string;
  subtitle?: string;
}

const ScoreCard = ({
  label,
  score,
  icon: Icon,
  color,
  subtitle,
}: ScoreCardProps) => (
  <Card className="bg-slate-900/50 border-slate-700/50">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${color}`} />
          <div>
            <span className="text-slate-300 font-medium block">{label}</span>
            {subtitle && (
              <span className="text-slate-500 text-xs">{subtitle}</span>
            )}
          </div>
        </div>
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
      </div>
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color.replace("text-", "bg-")}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </CardContent>
  </Card>
);

export default ScoreCard;
