import { useState, useEffect } from "react";
import { Brain, TrendingUp, Heart, Droplets, Activity, ChevronRight, Sparkles, Loader2 } from "lucide-react";

interface InsightData {
  peerStats: {
    avgCalories: number;
    avgDuration: string;
    avgFrequency: string;
    avgWater: string;
    avgBmi: string;
    avgFat: string;
    avgRestingBpm: number;
  };
  workoutBreakdown: Array<{
    workoutType: string;
    avgCalories: number;
    avgDuration: string;
    avgMaxBpm: number;
    count: number;
  }>;
  recommendations: {
    bestCalorieBurner: string;
    bestCalorieBurnerAvg: number;
    recommendedWaterIntake: string;
    recommendedFrequency: string;
    targetRestingBpm: number;
  };
  userBmi: number;
  peerAvgBmi: string;
}

interface SmartRecommendation {
  greeting: string;
  todaysPlan: string;
  expectedCalories: number;
  targetHeartRate: string;
  waterTarget: number;
  insight: string;
  tips: string[];
  dataSource?: string;
}

export function AIInsights({ userId }: { userId: string }) {
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [recommendation, setRecommendation] = useState<SmartRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [showRec, setShowRec] = useState(false);

  useEffect(() => {
    fetch(`/api/fitness/insights/${userId}`)
      .then(r => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then(data => {
        if (data?.peerStats && data?.workoutBreakdown) {
          setInsights(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  const getSmartRecommendation = async () => {
    setRecLoading(true);
    setShowRec(true);
    try {
      const res = await fetch("/api/fitness/smart-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, goal: "general fitness" }),
      });
      const data = await res.json();
      setRecommendation(data);
    } catch {
      setRecommendation(null);
    }
    setRecLoading(false);
  };

  if (loading) {
    return (
      <div className="glass-card p-4 rounded-2xl flex items-center justify-center gap-2 py-6">
        <Loader2 className="w-4 h-4 animate-spin text-gray-700" />
        <span className="text-gray-400 text-xs">Analyzing fitness data...</span>
      </div>
    );
  }

  if (!insights) return null;

  const workoutColors: Record<string, string> = {
    Cardio: "text-red-500",
    Strength: "text-blue-600",
    Yoga: "text-green-600",
    HIIT: "text-orange-500",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Brain className="text-gray-700" size={16} />
        <h3 className="text-sm font-bold text-gray-900" data-testid="text-ai-insights-title">AI Insights</h3>
        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">1,324 profiles</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card p-3 rounded-xl" data-testid="card-peer-calories">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-[#1e3a5f]" />
            <span className="text-[10px] text-gray-500 uppercase">Peer Avg Burn</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{insights.peerStats.avgCalories} <span className="text-xs text-gray-400">cal</span></p>
          <p className="text-[10px] text-gray-500">per session</p>
        </div>

        <div className="glass-card p-3 rounded-xl" data-testid="card-peer-heart-rate">
          <div className="flex items-center gap-1.5 mb-1">
            <Heart size={12} className="text-red-400" />
            <span className="text-[10px] text-gray-500 uppercase">Resting HR</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{insights.peerStats.avgRestingBpm} <span className="text-xs text-gray-400">bpm</span></p>
          <p className="text-[10px] text-gray-500">peer average</p>
        </div>

        <div className="glass-card p-3 rounded-xl" data-testid="card-peer-water">
          <div className="flex items-center gap-1.5 mb-1">
            <Droplets size={12} className="text-cyan-500" />
            <span className="text-[10px] text-gray-500 uppercase">Water Goal</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{insights.recommendations.recommendedWaterIntake} <span className="text-xs text-gray-400">L</span></p>
          <p className="text-[10px] text-gray-500">recommended</p>
        </div>

        <div className="glass-card p-3 rounded-xl" data-testid="card-best-workout">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={12} className="text-orange-500" />
            <span className="text-[10px] text-gray-500 uppercase">Best Burn</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{insights.recommendations.bestCalorieBurner}</p>
          <p className="text-[10px] text-gray-500">{insights.recommendations.bestCalorieBurnerAvg} cal avg</p>
        </div>
      </div>

      <div className="glass-card p-3 rounded-xl" data-testid="card-workout-breakdown">
        <p className="text-[10px] text-gray-500 uppercase mb-2">Workout Type Comparison</p>
        <div className="space-y-2">
          {insights.workoutBreakdown.map((w) => (
            <div key={w.workoutType} className="flex items-center gap-2">
              <span className={`text-xs font-medium w-16 ${workoutColors[w.workoutType] || "text-gray-700"}`}>{w.workoutType}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gray-400/60 to-gray-600"
                  style={{ width: `${Math.min((w.avgCalories / 1500) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-16 text-right">{w.avgCalories} cal</span>
            </div>
          ))}
        </div>
      </div>

      {!showRec && (
        <button
          onClick={getSmartRecommendation}
          className="w-full glass-card p-3 rounded-xl flex items-center justify-between hover:border-gray-300 transition-colors cursor-pointer group"
          data-testid="button-get-ai-recommendation"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-gray-700" />
            <span className="text-xs font-medium text-gray-500 group-hover:text-gray-900 transition-colors">Get AI Workout Recommendation</span>
          </div>
          <ChevronRight size={14} className="text-gray-400" />
        </button>
      )}

      {showRec && (
        <div className="glass-card p-4 rounded-xl space-y-3" data-testid="card-ai-recommendation">
          {recLoading ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-700" />
              <span className="text-gray-400 text-xs">AI is thinking...</span>
            </div>
          ) : recommendation ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-gray-700" />
                <span className="text-xs font-bold text-gray-700 uppercase">AI Coach</span>
                {recommendation.dataSource && (
                  <span className="text-[9px] text-gray-400 ml-auto">{recommendation.dataSource}</span>
                )}
              </div>
              <p className="text-sm text-gray-600">{recommendation.greeting}</p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-gray-900">{recommendation.todaysPlan}</p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center">
                    <p className="text-sm font-bold text-[#1e3a5f]">{recommendation.expectedCalories}</p>
                    <p className="text-[9px] text-gray-500">cal burn</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-red-500">{recommendation.targetHeartRate}</p>
                    <p className="text-[9px] text-gray-500">HR zone</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-cyan-500">{recommendation.waterTarget}L</p>
                    <p className="text-[9px] text-gray-500">water</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 italic">{recommendation.insight}</p>
              {recommendation.tips && recommendation.tips.length > 0 && (
                <div className="space-y-1">
                  {recommendation.tips.map((tip, i) => (
                    <p key={i} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                      <span className="text-gray-700 mt-0.5">•</span>
                      {tip}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500 text-center py-2">Could not generate recommendation</p>
          )}
        </div>
      )}
    </div>
  );
}
