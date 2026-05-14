import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useStore, authFetch } from "@/lib/store";
import { triggerHaptic } from "@/lib/capacitor";
import { useToast } from "@/hooks/use-toast";
import { Scale, X, Check, TrendingDown, TrendingUp, Minus, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_OPTIONS = ["This wk", "Last wk", "2 wk ago", "3 wk ago"];

function getWeekSlice(weekHistory: any[], weekIndex: number) {
  const total = weekHistory.length;
  const end = total - weekIndex * 7;
  const start = Math.max(end - 7, 0);
  if (end <= 0) return [];
  return weekHistory.slice(start, end);
}

function calcAvg(arr: any[], key: string) {
  if (!arr.length) return 0;
  return arr.reduce((s: number, d: any) => s + (d[key] || 0), 0) / arr.length;
}

function calcSum(arr: any[], key: string) {
  return arr.reduce((s: number, d: any) => s + (d[key] || 0), 0);
}

function getTrendForPeriod(weekHistory: any[], days: number, key: string) {
  const total = weekHistory.length;
  if (total < days) return { value: 0, direction: "none" as const };
  const recent = weekHistory.slice(-days);
  const prior = weekHistory.slice(Math.max(total - days * 2, 0), total - days);
  if (!prior.length) return { value: 0, direction: "none" as const };
  const recentAvg = calcAvg(recent, key);
  const priorAvg = calcAvg(prior, key);
  const diff = recentAvg - priorAvg;
  return {
    value: Math.round(Math.abs(diff) * 10) / 10,
    direction: diff > 5 ? ("increase" as const) : diff < -5 ? ("decrease" as const) : ("none" as const),
  };
}

export default function Analytics() {
  const store = useStore();
  const { toast } = useToast();
  const [plan, setPlan] = useState<any>(null);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [showLogWeight, setShowLogWeight] = useState(false);
  const [logWeightVal, setLogWeightVal] = useState("");
  const [logWeightDate, setLogWeightDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [logWeightLoading, setLogWeightLoading] = useState(false);
  const [weightPeriod, setWeightPeriod] = useState<7 | 30 | 90>(30);
  const weightInputRef = useRef<HTMLInputElement>(null);

  const loadPlan = useCallback(async () => {
    if (!store.userId) return;
    try {
      const res = await authFetch(`/api/plan/latest/${store.userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.status === "ready" && data.planJson) setPlan(data.planJson);
      }
    } catch {}
  }, [store.userId]);

  const loadWeightLogs = useCallback(async () => {
    try {
      const res = await authFetch("/api/weight-logs?days=90");
      if (res.ok) setWeightLogs(await res.json());
    } catch {}
  }, []);

  const handleLogWeight = async () => {
    const val = parseFloat(logWeightVal);
    if (!val || val <= 0 || val > 300) return;
    setLogWeightLoading(true);
    try {
      const res = await authFetch("/api/weight-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: val, date: logWeightDate }),
      });
      if (res.ok) {
        triggerHaptic("success");
        setShowLogWeight(false);
        setLogWeightVal("");
        await loadWeightLogs();
        await store.reloadAll();
      } else {
        toast({ title: "Could not save weight", description: "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not save weight", description: "Check your connection and try again.", variant: "destructive" });
    }
    setLogWeightLoading(false);
  };

  useEffect(() => { loadPlan(); store.reloadAll(); loadWeightLogs(); }, [loadPlan, loadWeightLogs]);

  const weekHistory = store.weekHistory || [];
  const currentWeek = useMemo(() => getWeekSlice(weekHistory, selectedWeek), [weekHistory, selectedWeek]);
  const prevWeek = useMemo(() => getWeekSlice(weekHistory, selectedWeek + 1), [weekHistory, selectedWeek]);

  const avgCalories = Math.round(calcAvg(currentWeek, "totalCalories"));
  const prevAvgCalories = Math.round(calcAvg(prevWeek, "totalCalories"));
  const calChange = prevAvgCalories > 0 ? Math.round(((avgCalories - prevAvgCalories) / prevAvgCalories) * 100) : 0;

  const workoutLogsByDay = useMemo(() => {
    const map: Record<number, number> = {};
    (store.workoutLogs || []).forEach((w: any) => {
      if (w.loggedAt) {
        const d = new Date(w.loggedAt);
        const dayOfWeek = d.getDay();
        map[dayOfWeek] = (map[dayOfWeek] || 0) + (w.caloriesBurned || 0);
      }
    });
    return map;
  }, [store.workoutLogs]);

  const weekBurned = useMemo(() => {
    return currentWeek.reduce((sum: number, _d: any, i: number) => sum + (workoutLogsByDay[i] || 0), 0);
  }, [currentWeek, workoutLogsByDay]);
  const weekConsumed = useMemo(() => calcSum(currentWeek, "totalCalories"), [currentWeek]);
  const energy = weekConsumed - weekBurned;

  // Always derive from weightLogs state (refreshed on each new log) — never stale
  // Use canonical `date` text field for sorting (not loggedAt) so backdated entries sort correctly
  const weight = useMemo(() => {
    if (weightLogs.length > 0) {
      const sorted = [...weightLogs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      return sorted[0].weightKg || 0;
    }
    return store.user?.weight || 0;
  }, [weightLogs, store.user?.weight]);
  const heightM = (store.user?.height || 170) / 100;
  const bmi = heightM > 0 && weight > 0 ? Math.round((weight / (heightM * heightM)) * 10) / 10 : 0;

  const bmiCategory = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
  const bmiBadgeColor = bmi < 18.5 ? "bg-blue-100 text-blue-700" : bmi < 25 ? "bg-green-100 text-green-700" : bmi < 30 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  const bmiPosition = Math.min(Math.max(((bmi - 10) / 35) * 100, 0), 100);

  const maxStackedHeight = 160;

  const expenditurePeriods = [3, 7, 14, 30, 90];
  const weightPeriods: number[] = [3, 7, 14, 30, 90];

  return (
    <div className="min-h-screen bg-[#f8f8fa] pb-24" data-testid="analytics-page">
      <div className="bg-white px-5 pt-6 pb-5">
        <h1 className="text-2xl font-bold font-display text-slate-900" data-testid="stats-title">Stats</h1>
        <p className="text-[13px] font-body text-slate-400 mt-0.5" data-testid="stats-subtitle">Your progress at a glance</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/60" data-testid="daily-avg-calories-card">
          <p className="text-sm font-body text-slate-500 mb-1">Daily Average Calories</p>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold font-display text-slate-900" data-testid="avg-calories-value">{avgCalories}</span>
            <span className="text-lg font-body text-slate-400">cals</span>
            {calChange !== 0 && (
              <span className={`text-sm font-medium flex items-center gap-0.5 ${calChange > 0 ? "text-green-500" : "text-red-500"}`} data-testid="cal-change-indicator">
                {calChange > 0 ? "↗" : "↘"} {Math.abs(calChange)}%
              </span>
            )}
          </div>

          <div className="mt-5 flex items-end gap-1.5 justify-between" style={{ height: maxStackedHeight }} data-testid="macro-stacked-chart">
            {DAYS.map((day, i) => {
              const d = currentWeek[i];
              const protein = d?.totalProtein || 0;
              const carbs = d?.totalCarbs || 0;
              const fat = d?.totalFat || 0;
              const total = protein + carbs + fat;
              const maxMacro = Math.max(...currentWeek.map((w: any) => (w?.totalProtein || 0) + (w?.totalCarbs || 0) + (w?.totalFat || 0)), 1);
              const scale = total > 0 ? (total / maxMacro) * (maxStackedHeight - 20) : 4;
              const pH = total > 0 ? (protein / total) * scale : 0;
              const cH = total > 0 ? (carbs / total) * scale : 0;
              const fH = total > 0 ? (fat / total) * scale : 0;

              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="w-full flex flex-col items-center">
                    <div className="w-5 rounded-t-sm" style={{ height: pH, backgroundColor: "#E8655A" }} />
                    <div className="w-5" style={{ height: cH, backgroundColor: "#B8956A" }} />
                    <div className="w-5 rounded-b-sm" style={{ height: fH, backgroundColor: "#5B8FB9" }} />
                  </div>
                  <span className="text-[10px] font-body text-slate-400 mt-1.5">{day}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-3 justify-center">
            <span className="flex items-center gap-1 text-[11px] font-body text-slate-500"><span className="w-2 h-2 rounded-full bg-[#E8655A] inline-block" />Protein</span>
            <span className="flex items-center gap-1 text-[11px] font-body text-slate-500"><span className="w-2 h-2 rounded-full bg-[#B8956A] inline-block" />Carbs</span>
            <span className="flex items-center gap-1 text-[11px] font-body text-slate-500"><span className="w-2 h-2 rounded-full bg-[#5B8FB9] inline-block" />Fats</span>
          </div>

          <div className="flex gap-2 mt-4" data-testid="week-selector">
            {WEEK_OPTIONS.map((label, i) => (
              <button
                key={i}
                onClick={() => { setSelectedWeek(i); triggerHaptic("light"); }}
                className={`flex-1 py-1.5 px-2 rounded-full text-[11px] font-medium font-body transition-colors ${
                  selectedWeek === i ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                }`}
                data-testid={`week-btn-${i}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/60" data-testid="weekly-energy-card">
          <h2 className="text-base font-semibold font-display text-slate-900 mb-4">Weekly Energy</h2>
          <div className="flex justify-between mb-5">
            <div className="text-center">
              <p className="text-2xl font-bold font-display text-slate-900" data-testid="burned-value">{weekBurned}</p>
              <p className="text-[11px] font-body text-slate-400">Burned cal</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-display text-slate-900" data-testid="consumed-value">{weekConsumed}</p>
              <p className="text-[11px] font-body text-slate-400">Consumed cal</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold font-display ${energy < 0 ? "text-red-500" : "text-green-500"}`} data-testid="energy-value">{energy}</p>
              <p className="text-[11px] font-body text-slate-400">Energy</p>
            </div>
          </div>

          <div className="flex items-end gap-1.5 justify-between" style={{ height: 120 }} data-testid="energy-chart">
            {DAYS.map((day, i) => {
              const d = currentWeek[i];
              const consumed = d?.totalCalories || 0;
              const burned = workoutLogsByDay[i] || 0;
              const maxVal = Math.max(...currentWeek.map((w: any, j: number) => Math.max(w?.totalCalories || 0, workoutLogsByDay[j] || 0)), 1);
              const cH = maxVal > 0 ? (consumed / maxVal) * 90 : 4;
              const bH = maxVal > 0 ? (burned / maxVal) * 90 : 4;

              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="flex gap-0.5 items-end">
                    <div className="w-2.5 rounded-t-sm bg-orange-400" style={{ height: bH }} />
                    <div className="w-2.5 rounded-t-sm bg-green-400" style={{ height: cH }} />
                  </div>
                  <span className="text-[10px] font-body text-slate-400 mt-1.5">{day}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-3 justify-center">
            <span className="flex items-center gap-1 text-[11px] font-body text-slate-500"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Burned</span>
            <span className="flex items-center gap-1 text-[11px] font-body text-slate-500"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Consumed</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/60" data-testid="expenditure-changes-card">
          <h2 className="text-base font-semibold font-display text-slate-900 mb-4">Expenditure Changes</h2>
          <div className="space-y-0">
            {expenditurePeriods.map((days) => {
              const trend = getTrendForPeriod(weekHistory, days, "totalCalories");
              return (
                <div key={days} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0" data-testid={`expenditure-row-${days}`}>
                  <span className="text-sm font-body text-slate-600 w-16">{days} day</span>
                  <div className="flex-1 mx-3 h-5 flex items-center">
                    <svg width="40" height="16" viewBox="0 0 40 16">
                      <polyline
                        points={trend.direction === "decrease" ? "2,4 12,6 22,10 38,14" : trend.direction === "increase" ? "2,14 12,10 22,6 38,2" : "2,8 38,8"}
                        fill="none"
                        stroke="#E8655A"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-display font-semibold text-slate-700 w-24 text-right">
                    {trend.direction === "decrease" ? "-" : trend.direction === "increase" ? "+" : ""}{trend.value} cal
                  </span>
                  <span className={`text-xs font-body ml-2 w-24 text-right ${
                    trend.direction === "decrease" ? "text-red-500" : trend.direction === "increase" ? "text-green-500" : "text-slate-400"
                  }`}>
                    {trend.direction === "decrease" ? "↘ Decrease" : trend.direction === "increase" ? "↗ Increase" : "→ No change"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/60" data-testid="bmi-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold font-display text-slate-900">Your BMI</h2>
            <div className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center">
              <span className="text-[10px] text-slate-400 font-body">i</span>
            </div>
          </div>

          <p className="text-4xl font-bold font-display text-slate-900" data-testid="bmi-value">{bmi || "--"}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-body text-slate-500">Your weight is</span>
            <span className={`text-xs font-medium font-body px-2.5 py-0.5 rounded-full ${bmiBadgeColor}`} data-testid="bmi-category">{bmiCategory}</span>
          </div>

          <div className="mt-5 relative" data-testid="bmi-gradient-bar">
            <div className="h-3 rounded-full overflow-hidden" style={{
              background: "linear-gradient(to right, #3B82F6 0%, #3B82F6 18%, #22C55E 18%, #22C55E 42%, #EAB308 42%, #EAB308 65%, #F97316 65%, #F97316 80%, #EF4444 80%, #EF4444 100%)"
            }} />
            {bmi > 0 && (
              <div
                className="absolute -top-0.5 w-4 h-4 bg-white border-2 border-slate-900 rounded-full shadow-sm"
                style={{ left: `calc(${bmiPosition}% - 8px)`, top: "-2px" }}
                data-testid="bmi-marker"
              />
            )}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
            <span className="flex items-center gap-1 text-[10px] font-body text-slate-500"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Underweight &lt;18.5</span>
            <span className="flex items-center gap-1 text-[10px] font-body text-slate-500"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Healthy 18.5-24.9</span>
            <span className="flex items-center gap-1 text-[10px] font-body text-slate-500"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Overweight 25.0-29.9</span>
            <span className="flex items-center gap-1 text-[10px] font-body text-slate-500"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Obese &gt;30.0</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/60 mb-6" data-testid="weight-changes-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold font-display text-slate-900">Weight Tracking</h2>
            <button
              onClick={() => { setShowLogWeight(true); setLogWeightDate(new Date().toISOString().split("T")[0]); setTimeout(() => weightInputRef.current?.focus(), 100); triggerHaptic("light"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-[12px] font-semibold font-body active:opacity-80 transition"
              data-testid="button-log-weight"
            >
              <Scale size={12} />
              Log Weight
            </button>
          </div>

          {weightLogs.length > 0 ? (() => {
            // Sort/filter by canonical `date` text field (YYYY-MM-DD) so backdated entries are correct
            const allSorted = [...weightLogs].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - weightPeriod);
            const cutoffStr = cutoffDate.toISOString().split("T")[0];
            const sorted = allSorted.filter(l => (l.date || "") >= cutoffStr);
            const displaySorted = sorted.length > 0 ? sorted : allSorted;
            const latest = allSorted[allSorted.length - 1];
            const latestW = latest.weightKg;
            const target = store.user?.targetWeight;

            const getChangeForDays = (days: number) => {
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - days);
              const cutoffDStr = cutoff.toISOString().split("T")[0];
              const before = allSorted.filter(l => (l.date || "") <= cutoffDStr);
              if (!before.length) return null;
              const oldest = before[before.length - 1].weightKg;
              return Math.round((latestW - oldest) * 10) / 10;
            };

            const periodChange = displaySorted.length > 1
              ? Math.round((latestW - displaySorted[0].weightKg) * 10) / 10
              : null;

            return (
              <div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-bold font-display text-slate-900" data-testid="text-latest-weight">{latestW}</span>
                  <span className="text-lg text-slate-400 font-normal">kg</span>
                  {target && <span className="text-[12px] text-slate-400 font-body ml-2">→ {target} kg goal</span>}
                  {periodChange !== null && (
                    <span className={`text-[13px] font-semibold ml-auto flex items-center gap-0.5 ${periodChange < 0 ? "text-green-600" : periodChange > 0 ? "text-red-500" : "text-slate-400"}`}>
                      {periodChange < 0 ? <TrendingDown size={13} /> : periodChange > 0 ? <TrendingUp size={13} /> : <Minus size={13} />}
                      {periodChange > 0 ? "+" : ""}{periodChange} kg
                    </span>
                  )}
                </div>

                <div className="flex gap-1.5 mb-3" data-testid="weight-period-selector">
                  {([7, 30, 90] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => { setWeightPeriod(p); triggerHaptic("light"); }}
                      className={`px-3 py-1 rounded-full text-[12px] font-semibold font-body transition-colors ${weightPeriod === p ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}
                      data-testid={`weight-period-${p}`}
                    >
                      {p}d
                    </button>
                  ))}
                </div>

                {displaySorted.length > 1 && (() => {
                  const chartData = displaySorted.map(l => ({
                    date: l.date
                      ? new Date(l.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : new Date(l.loggedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    weight: l.weightKg,
                  }));
                  return (
                    <div className="mt-1 mb-4 rounded-xl bg-blue-50 px-2 pt-3 pb-1" data-testid="weight-chart">
                      <ResponsiveContainer width="100%" height={90}>
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#93c5fd" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9, fill: "#93c5fd" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #dbeafe", background: "#fff" }}
                            formatter={(v: any) => [`${v} kg`, "Weight"]}
                          />
                          {target && (
                            <ReferenceLine y={target} stroke="#f97316" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `Goal ${target}kg`, position: "right", fontSize: 9, fill: "#f97316" }} />
                          )}
                          <Line type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: "#2563eb" }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                      <p className="text-[10px] text-blue-400 font-body text-right mt-0.5 pr-2">{displaySorted.length} readings</p>
                    </div>
                  );
                })()}

                <div className="space-y-0" data-testid="weight-periods">
                  {([7, 30, 90, -1] as const).map((days) => {
                    const label = days === -1 ? "All Time" : `${days}d`;
                    const change = days === -1
                      ? (allSorted.length > 1 ? Math.round((latestW - allSorted[0].weightKg) * 10) / 10 : null)
                      : getChangeForDays(days);
                    const isLoss = change !== null && change < 0;
                    const isGain = change !== null && change > 0;
                    return (
                      <div key={days} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0" data-testid={`weight-row-${days === -1 ? "all" : days}`}>
                        <span className="text-sm font-body text-slate-500 w-16">{label}</span>
                        <div className="flex-1 flex items-center justify-end gap-2">
                          {change !== null ? (
                            <>
                              <span className={`text-sm font-semibold font-display ${isLoss ? "text-green-600" : isGain ? "text-red-500" : "text-slate-500"}`}>
                                {isGain ? "+" : ""}{change} kg
                              </span>
                              {isLoss ? <TrendingDown size={14} className="text-green-500" /> : isGain ? <TrendingUp size={14} className="text-red-500" /> : <Minus size={14} className="text-slate-400" />}
                            </>
                          ) : (
                            <span className="text-[12px] text-slate-300 font-body">No data</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div className="py-8 text-center">
              <Scale size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-600 text-sm font-semibold font-display mb-1">No weight logs yet</p>
              <p className="text-slate-400 text-[13px] font-body">Tap "Log Weight" above to start tracking your progress</p>
            </div>
          )}
        </div>
      </div>

      {showLogWeight && (
        <div className="fixed inset-0 z-50 flex items-end" data-testid="log-weight-modal">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLogWeight(false)} />
          <div className="relative w-full bg-white rounded-t-3xl p-6 pb-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold font-display text-slate-900">Log Today's Weight</h3>
              <button onClick={() => setShowLogWeight(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" data-testid="button-close-log-weight">
                <X size={16} className="text-slate-600" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <input
                ref={weightInputRef}
                type="number"
                step="0.1"
                min="20"
                max="300"
                placeholder={String(store.user?.weight || "70")}
                value={logWeightVal}
                onChange={e => setLogWeightVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogWeight()}
                className="flex-1 px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-3xl font-bold font-display text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                data-testid="input-weight-value"
              />
              <span className="text-xl font-body text-slate-400">kg</span>
            </div>
            <div className="mb-6">
              <label className="text-[12px] text-slate-500 font-body mb-1.5 block">Date</label>
              <input
                type="date"
                value={logWeightDate}
                onChange={e => setLogWeightDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-[14px] font-body text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-weight-date"
              />
            </div>
            <button
              onClick={handleLogWeight}
              disabled={logWeightLoading || !logWeightVal}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-[16px] font-display disabled:opacity-50 active:opacity-80 transition flex items-center justify-center gap-2"
              data-testid="button-confirm-log-weight"
            >
              {logWeightLoading ? (
                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={18} />
                  Save Weight
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
