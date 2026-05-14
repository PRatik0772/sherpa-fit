import { useState, useEffect } from "react";
import { Footprints, TrendingUp, Target, Flame, Timer, BarChart3, ArrowUp, ArrowDown, Minus, Loader2, Scale, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepsAnalysis {
  totalRecords: number;
  totalSteps: number;
  totalCalories: number;
  totalDistanceKm: number;
  avgSteps: number;
  avgCalories: number;
  avgDistanceKm: number;
  avgActiveMinutes: number;
  maxSteps: number;
  minSteps: number;
  maxCalories: number;
  avgGoalPct: number;
  daysGoalMet: number;
  avgFlights: number;
}

interface Correlation {
  stepsToCalories: number;
  stepsToActiveMinutes: number;
  caloriesToActiveMinutes: number;
  linearRegression: {
    slope: number;
    intercept: number;
    equation: string;
  };
  caloriesPerStep: number;
  caloriesPer1000Steps: number;
}

interface MonthlyTrend {
  month: string;
  avgSteps: number;
  avgCalories: number;
  totalSteps: number;
  totalCalories: number;
  avgGoalPct: number;
  daysTracked: number;
  bestDay: number;
  daysGoalMet: number;
}

interface WeekdayData {
  dayOfWeek: number;
  dayName: string;
  avgSteps: number;
  avgCalories: number;
}

interface Trends {
  monthly: MonthlyTrend[];
  weekday: WeekdayData[];
  overallTrend: string;
  improvementPercent: number;
}

interface GoalAnalysis {
  totalDays: number;
  daysGoalMet: number;
  daysOver75: number;
  daysOver50: number;
  daysUnder25: number;
  avgGoalPct: number;
  avgStepsOnGoalDays: number;
  avgCaloriesOnGoalDays: number;
  avgStepsOnNonGoalDays: number;
  avgCaloriesOnNonGoalDays: number;
  goalCompletionRate: number;
  extraCaloriesOnGoalDays: number;
  weightLossImpact: {
    dailyCalorieDifference: number;
    weeklyExtraCalories: number;
    monthlyExtraCalories: number;
    potentialWeightLossPerMonthKg: number;
  };
}

export function StepsIntelligence() {
  const [analysis, setAnalysis] = useState<StepsAnalysis | null>(null);
  const [correlation, setCorrelation] = useState<Correlation | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [goalAnalysis, setGoalAnalysis] = useState<GoalAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/steps/analysis").then(r => r.json()),
      fetch("/api/steps/correlation").then(r => r.json()),
      fetch("/api/steps/trends").then(r => r.json()),
      fetch("/api/steps/goal-analysis").then(r => r.json()),
    ]).then(([a, c, t, g]) => {
      setAnalysis(a);
      setCorrelation(c);
      setTrends(t);
      setGoalAnalysis(g);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-4 rounded-2xl flex items-center justify-center gap-2 py-6">
        <Loader2 className="w-4 h-4 animate-spin text-[#1e3a5f]" />
        <span className="text-gray-400 text-xs">Analyzing 526 step records...</span>
      </div>
    );
  }

  if (!analysis || !correlation || !trends || !goalAnalysis) return null;

  const trendIcon = trends.overallTrend === "improving" ? ArrowUp : trends.overallTrend === "declining" ? ArrowDown : Minus;
  const trendColor = trends.overallTrend === "improving" ? "text-[#1e3a5f]" : trends.overallTrend === "declining" ? "text-red-500" : "text-gray-400";

  const maxMonthlySteps = Math.max(...trends.monthly.map(m => m.avgSteps));
  const maxWeekdaySteps = Math.max(...trends.weekday.map(w => w.avgSteps));
  const bestDay = trends.weekday.reduce((a, b) => a.avgSteps > b.avgSteps ? a : b);
  const worstDay = trends.weekday.reduce((a, b) => a.avgSteps < b.avgSteps ? a : b);

  const correlationStrength = (r: number) => {
    const abs = Math.abs(r);
    if (abs >= 0.9) return { label: "Very Strong", color: "text-[#1e3a5f]" };
    if (abs >= 0.7) return { label: "Strong", color: "text-green-600" };
    if (abs >= 0.5) return { label: "Moderate", color: "text-yellow-600" };
    if (abs >= 0.3) return { label: "Weak", color: "text-orange-600" };
    return { label: "Very Weak", color: "text-red-500" };
  };

  const stepsCalCorr = correlationStrength(correlation.stepsToCalories);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Footprints className="text-[#1e3a5f]" size={16} />
          <h3 className="text-sm font-bold text-gray-900" data-testid="text-steps-intelligence-title">Steps Intelligence</h3>
          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{analysis.totalRecords} days</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          data-testid="button-toggle-steps"
        >
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card p-3 rounded-xl" data-testid="card-avg-steps">
          <div className="flex items-center gap-1.5 mb-1">
            <Footprints size={12} className="text-[#1e3a5f]" />
            <span className="text-[10px] text-gray-500 uppercase">Avg Daily Steps</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{analysis.avgSteps.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-0.5">
            {(() => { const TIcon = trendIcon; return <TIcon size={10} className={trendColor} />; })()}
            <p className="text-[10px]">
              <span className={trendColor}>{Math.abs(trends.improvementPercent)}%</span>
              <span className="text-gray-500"> {trends.overallTrend}</span>
            </p>
          </div>
        </div>

        <div className="glass-card p-3 rounded-xl" data-testid="card-avg-cal-burn">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame size={12} className="text-orange-400" />
            <span className="text-[10px] text-gray-500 uppercase">Avg Cal Burn</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{analysis.avgCalories} <span className="text-xs text-gray-400">cal</span></p>
          <p className="text-[10px] text-gray-500">{correlation.caloriesPer1000Steps} per 1K steps</p>
        </div>

        <div className="glass-card p-3 rounded-xl" data-testid="card-goal-rate">
          <div className="flex items-center gap-1.5 mb-1">
            <Target size={12} className="text-gray-700" />
            <span className="text-[10px] text-gray-500 uppercase">Goal Hit Rate</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{goalAnalysis.goalCompletionRate}%</p>
          <p className="text-[10px] text-gray-500">{goalAnalysis.daysGoalMet}/{goalAnalysis.totalDays} days</p>
        </div>

        <div className="glass-card p-3 rounded-xl" data-testid="card-weight-impact">
          <div className="flex items-center gap-1.5 mb-1">
            <Scale size={12} className="text-violet-500" />
            <span className="text-[10px] text-gray-500 uppercase">Weight Impact</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{goalAnalysis.weightLossImpact.potentialWeightLossPerMonthKg} <span className="text-xs text-gray-400">kg/mo</span></p>
          <p className="text-[10px] text-gray-500">meeting daily goal</p>
        </div>
      </div>

      <div className="glass-card p-3 rounded-xl" data-testid="card-correlation">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-gray-500 uppercase">Steps → Calories Correlation</p>
          <span className={cn("text-[10px] font-medium", stepsCalCorr.color)}>{stepsCalCorr.label} (r={correlation.stepsToCalories})</span>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-[11px] text-gray-700 font-mono">{correlation.linearRegression.equation}</p>
          <p className="text-[10px] text-gray-500 mt-1">ML regression model trained on {analysis.totalRecords} data points</p>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="glass-card p-3 rounded-xl" data-testid="card-monthly-trends">
            <p className="text-[10px] text-gray-500 uppercase mb-2">Monthly Step Trends</p>
            <div className="space-y-1.5">
              {trends.monthly.map((m) => {
                const monthLabel = new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
                return (
                  <div key={m.month} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-14">{monthLabel}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#1e3a5f]/60 to-[#1e3a5f]"
                        style={{ width: `${(m.avgSteps / maxMonthlySteps) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 w-12 text-right">{m.avgSteps.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-3 rounded-xl" data-testid="card-weekday-pattern">
            <p className="text-[10px] text-gray-500 uppercase mb-2">Weekday Pattern</p>
            <div className="flex items-end gap-1.5 h-20">
              {trends.weekday.map((w) => (
                <div key={w.dayOfWeek} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gray-100 rounded-t-sm overflow-hidden flex items-end" style={{ height: '52px' }}>
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-all",
                        w.dayName === bestDay.dayName ? "bg-[#1e3a5f]" : w.dayName === worstDay.dayName ? "bg-red-400/60" : "bg-gray-400/60"
                      )}
                      style={{ height: `${(w.avgSteps / maxWeekdaySteps) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-500">{w.dayName}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <p className="text-[10px] text-gray-500">Best: <span className="text-[#1e3a5f]">{bestDay.dayName}</span> ({bestDay.avgSteps.toLocaleString()})</p>
              <p className="text-[10px] text-gray-500">Worst: <span className="text-red-500">{worstDay.dayName}</span> ({worstDay.avgSteps.toLocaleString()})</p>
            </div>
          </div>

          <div className="glass-card p-3 rounded-xl" data-testid="card-goal-deep-dive">
            <p className="text-[10px] text-gray-500 uppercase mb-2">Goal Achievement Impact</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Goal Met Days</p>
                <p className="text-sm font-bold text-[#1e3a5f]">{goalAnalysis.avgStepsOnGoalDays?.toLocaleString() || "—"} steps</p>
                <p className="text-[10px] text-gray-500">{goalAnalysis.avgCaloriesOnGoalDays || "—"} cal burned</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Goal Missed Days</p>
                <p className="text-sm font-bold text-red-500">{goalAnalysis.avgStepsOnNonGoalDays?.toLocaleString() || "—"} steps</p>
                <p className="text-[10px] text-gray-500">{goalAnalysis.avgCaloriesOnNonGoalDays || "—"} cal burned</p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-100">
              <p className="text-[10px] text-gray-400">Extra calories burned on goal days:</p>
              <p className="text-sm font-bold text-gray-700">{goalAnalysis.extraCaloriesOnGoalDays} cal/day</p>
              <p className="text-[10px] text-gray-500 mt-1">
                = {goalAnalysis.weightLossImpact.weeklyExtraCalories.toLocaleString()} cal/week
                = {goalAnalysis.weightLossImpact.potentialWeightLossPerMonthKg} kg/month potential weight loss
              </p>
            </div>
          </div>

          <div className="glass-card p-3 rounded-xl" data-testid="card-lifetime-stats">
            <p className="text-[10px] text-gray-500 uppercase mb-2">Lifetime Stats (Mar '21 – Sep '22)</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">{(analysis.totalSteps / 1000000).toFixed(1)}M</p>
                <p className="text-[9px] text-gray-500">Total Steps</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">{analysis.totalDistanceKm} km</p>
                <p className="text-[9px] text-gray-500">Distance</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">{(analysis.totalCalories / 1000).toFixed(0)}K</p>
                <p className="text-[9px] text-gray-500">Calories</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="text-center">
                <p className="text-sm font-bold text-[#1e3a5f]">{analysis.maxSteps?.toLocaleString()}</p>
                <p className="text-[9px] text-gray-500">Best Day</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-500">{analysis.avgActiveMinutes} min</p>
                <p className="text-[9px] text-gray-500">Avg Active</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
