import { useState, useEffect, useCallback } from "react";
import { useStore, authFetch } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Footprints, Flame, Timer, MapPin, TrendingUp, TrendingDown, Target, Zap, ChevronRight, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

type StepInsight = {
  title: string;
  description: string;
  action: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
};

function InsightCard({ insight }: { insight: StepInsight }) {
  const priorityColors = {
    high: 'border-l-[#c41e3a] bg-red-50/50',
    medium: 'border-l-[#1e3a5f] bg-blue-50/50',
    low: 'border-l-[#8fbc8f] bg-green-50/50',
  };

  return (
    <div className={`glass-card p-4 rounded-2xl border-l-4 ${priorityColors[insight.priority]}`} data-testid={`insight-${insight.title.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{insight.icon}</span>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 text-sm">{insight.title}</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{insight.description}</p>
          <div className="mt-3 flex items-center gap-2">
            <Zap size={12} className="text-[#c41e3a]" />
            <span className="text-xs font-semibold text-[#1e3a5f]">{insight.action}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, unit, subtitle }: any) {
  return (
    <div className="glass-card p-4 rounded-2xl" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
        <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-xs text-gray-400">{unit}</span>
      </div>
      {subtitle && <p className="text-[10px] text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function StepsProgressRing({ steps, goal }: { steps: number; goal: number }) {
  const pct = Math.min(100, goal > 0 ? (steps / goal) * 100 : 0);
  const size = 180;
  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="12" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={pct >= 100 ? '#22c55e' : '#1e3a5f'}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <Footprints size={24} className="text-[#1e3a5f] mb-1" />
        <span className="text-3xl font-bold text-gray-900">{steps.toLocaleString()}</span>
        <span className="text-xs text-gray-400">of {goal.toLocaleString()}</span>
        <span className="text-[10px] font-semibold mt-1" style={{ color: pct >= 100 ? '#22c55e' : pct >= 70 ? '#1e3a5f' : '#c41e3a' }}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

function WeeklyChart({ data }: { data: { date: string; steps: number; calories: number }[] }) {
  if (!data.length) return null;
  const maxSteps = Math.max(...data.map(d => d.steps), 1);

  return (
    <div className="glass-card p-5 rounded-2xl" data-testid="weekly-steps-chart">
      <h3 className="font-bold text-gray-900 mb-4">Weekly Steps Trend</h3>
      <div className="flex items-end gap-2 h-32">
        {data.map((d, i) => {
          const h = Math.max(8, (d.steps / maxSteps) * 100);
          const isGoalMet = d.steps >= 10000;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] text-gray-400 font-medium">{Math.round(d.steps / 1000)}k</span>
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${isGoalMet ? 'bg-gradient-to-t from-green-500 to-green-400' : 'bg-gradient-to-t from-[#1e3a5f] to-[#2a5a8f]'}`}
                style={{ height: `${h}%` }}
              />
              <span className="text-[9px] text-gray-400">{d.date.slice(-3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HealthData() {
  const [, setLocation] = useLocation();
  const { healthData, loadHealthData, user } = useStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<StepInsight[]>([]);
  const [correlation, setCorrelation] = useState<any>(null);
  const [goalAnalysis, setGoalAnalysis] = useState<any>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await loadHealthData();

    const results = await Promise.allSettled([
      authFetch('/api/steps/correlation'),
      authFetch('/api/steps/goal-analysis'),
    ]);

    if (results[0].status === 'fulfilled' && results[0].value.ok) {
      setCorrelation(await results[0].value.json());
    }
    if (results[1].status === 'fulfilled' && results[1].value.ok) {
      setGoalAnalysis(await results[1].value.json());
    }

    setLoading(false);
  }, [loadHealthData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const newInsights: StepInsight[] = [];
    const { steps, stepsGoal, caloriesBurnedFromSteps, activeMinutes } = healthData;
    const pct = stepsGoal > 0 ? (steps / stepsGoal) * 100 : 0;

    if (pct < 30) {
      newInsights.push({
        title: "Get Moving!",
        description: `You're at ${Math.round(pct)}% of your daily step goal. A brisk 20-minute walk can add ~2,000 steps and burn about 100 calories.`,
        action: "Take a walk now - even 10 minutes helps!",
        icon: "🚶",
        priority: 'high',
      });
    } else if (pct < 70) {
      newInsights.push({
        title: "Keep Going!",
        description: `You're ${Math.round(pct)}% there! You need ${(stepsGoal - steps).toLocaleString()} more steps. Try taking the stairs or a short walk after lunch.`,
        action: `Walk ${Math.ceil((stepsGoal - steps) / 100)} more minutes to hit your goal`,
        icon: "💪",
        priority: 'medium',
      });
    } else if (pct < 100) {
      newInsights.push({
        title: "Almost There!",
        description: `Just ${(stepsGoal - steps).toLocaleString()} steps to go! You've burned ${caloriesBurnedFromSteps} calories from walking today.`,
        action: "A quick 10-minute walk will get you there!",
        icon: "🔥",
        priority: 'low',
      });
    } else {
      newInsights.push({
        title: "Goal Achieved! 🎉",
        description: `Amazing! You've hit ${steps.toLocaleString()} steps today, burning ${caloriesBurnedFromSteps} calories. You're ${Math.round(pct - 100)}% over your goal!`,
        action: "Keep it up! Consider increasing your goal tomorrow.",
        icon: "🏆",
        priority: 'low',
      });
    }

    const corrValue = correlation?.stepsToCalories || correlation?.correlation || 0;
    if (correlation && corrValue > 0.8) {
      const calsPer1000Steps = correlation.caloriesPer1000Steps || (correlation.linearRegression?.slope ? Math.round(correlation.linearRegression.slope * 1000) : 43);
      newInsights.push({
        title: "Steps-Calorie Connection",
        description: `Your data shows a strong connection between steps and calories burned (${(corrValue * 100).toFixed(0)}% correlated). Every 1,000 steps burns ~${calsPer1000Steps} calories.`,
        action: `Add 2,000 more steps daily to burn ~${calsPer1000Steps * 2} extra calories`,
        icon: "📊",
        priority: 'medium',
      });
    }

    if (goalAnalysis) {
      const rawRate = goalAnalysis.goalCompletionRate ?? goalAnalysis.achievementRate ?? goalAnalysis.goalAchievementRate;
      const achievement = rawRate !== undefined ? (rawRate > 1 ? rawRate / 100 : rawRate) : undefined;
      if (achievement !== undefined) {
        const rate = Math.round(achievement * 100);
        if (rate < 50) {
          newInsights.push({
            title: "Consistency Opportunity",
            description: `You've met your step goal ${rate}% of the time. Setting a smaller initial goal can help build the habit, then gradually increase.`,
            action: "Try setting your goal to 7,500 steps to build momentum",
            icon: "🎯",
            priority: 'high',
          });
        } else {
          newInsights.push({
            title: "Solid Consistency!",
            description: `You meet your step goal ${rate}% of the time. That consistency is the key to long-term health improvements.`,
            action: rate > 80 ? "Consider increasing your goal to keep progressing" : "Keep pushing for 80%+ achievement rate",
            icon: "⭐",
            priority: 'low',
          });
        }
      }

      const wlData = goalAnalysis.weightLossImpact;
      if (wlData) {
        const wl = typeof wlData === 'object' ? wlData.potentialWeightLossPerMonthKg : wlData;
        newInsights.push({
          title: "Weight Impact",
          description: `At your current activity level, walking contributes to approximately ${typeof wl === 'number' ? wl.toFixed(1) : wl} kg of weight management per month.`,
          action: "Pair walking with balanced nutrition for best results",
          icon: "⚖️",
          priority: 'medium',
        });
      }
    }

    if (activeMinutes > 0 && activeMinutes < 30) {
      newInsights.push({
        title: "Active Minutes",
        description: `You have ${activeMinutes} active minutes today. WHO recommends at least 30 minutes of moderate activity daily for heart health.`,
        action: `Add ${30 - activeMinutes} more minutes of brisk walking`,
        icon: "❤️",
        priority: 'high',
      });
    }

    setInsights(newInsights);
  }, [healthData, correlation, goalAnalysis]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-32 animate-in fade-in duration-500">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100 safe-pad-top">
        <div className="flex items-center gap-3 px-5 py-4">
          <button onClick={() => setLocation("/profile")} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center" data-testid="button-back">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Health Data</h1>
            <p className="text-[10px] text-gray-400">Steps, calories & actionable insights</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-5">
        <div className="glass-card p-6 rounded-2xl flex flex-col items-center" data-testid="steps-progress">
          <StepsProgressRing steps={healthData.steps} goal={healthData.stepsGoal} />
          <p className="text-sm text-gray-500 mt-3">Today's Steps</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Flame}
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
            label="Calories"
            value={healthData.caloriesBurnedFromSteps}
            unit="cal"
            subtitle="From walking"
          />
          <StatCard
            icon={Timer}
            iconBg="bg-purple-50"
            iconColor="text-purple-500"
            label="Active"
            value={healthData.activeMinutes}
            unit="min"
            subtitle="Active time"
          />
          <StatCard
            icon={MapPin}
            iconBg="bg-cyan-50"
            iconColor="text-cyan-500"
            label="Distance"
            value={healthData.distanceKm.toFixed(1)}
            unit="km"
            subtitle="Walked today"
          />
          <StatCard
            icon={Target}
            iconBg="bg-green-50"
            iconColor="text-green-500"
            label="Goal"
            value={healthData.stepsGoal.toLocaleString()}
            unit="steps"
            subtitle="Daily target"
          />
        </div>

        <div>
          <h3 className="text-[10px] text-gray-400 uppercase font-semibold tracking-widest px-1 mb-3">Your Action Plan</h3>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </div>

        <WeeklyChart data={healthData.weeklySteps} />

        {correlation && (
          <div className="glass-card p-5 rounded-2xl" data-testid="correlation-card">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-[#1e3a5f]" />
              <h3 className="font-bold text-gray-900">Steps-Calorie Relationship</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Correlation</p>
                <p className="text-xl font-bold text-[#1e3a5f]">{((correlation.stepsToCalories || correlation.correlation || 0) * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Per 1K Steps</p>
                <p className="text-xl font-bold text-[#c41e3a]">~{correlation.caloriesPer1000Steps || (correlation.linearRegression?.slope ? Math.round(correlation.linearRegression.slope * 1000) : 43)} cal</p>
              </div>
            </div>
            {correlation.linearRegression?.equation && (
              <p className="text-xs text-gray-500 mt-3 bg-gray-50 p-2 rounded-lg font-mono">{correlation.linearRegression.equation}</p>
            )}
          </div>
        )}

        {goalAnalysis && (
          <div className="glass-card p-5 rounded-2xl" data-testid="goal-analysis-card">
            <div className="flex items-center gap-2 mb-3">
              <Target size={18} className="text-[#8fbc8f]" />
              <h3 className="font-bold text-gray-900">Goal Performance</h3>
            </div>
            <div className="space-y-3">
              {(goalAnalysis.goalCompletionRate ?? goalAnalysis.achievementRate) !== undefined && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Goal Achievement Rate</span>
                    <span className="text-sm font-bold text-[#1e3a5f]">
                      {goalAnalysis.goalCompletionRate ?? Math.round((goalAnalysis.achievementRate || 0) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1e3a5f] to-[#8fbc8f] transition-all duration-700"
                      style={{ width: `${Math.min(100, goalAnalysis.goalCompletionRate ?? Math.round((goalAnalysis.achievementRate || 0) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
              {goalAnalysis.totalDays && (
                <p className="text-xs text-gray-500">Based on {goalAnalysis.totalDays} days of tracking data</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
