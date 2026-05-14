import { useState, useRef, useEffect, useCallback } from "react";
import { useStore, authFetch } from "@/lib/store";
import { Flame, Droplets, Footprints, Plus, ChevronRight, Loader2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import MealDetailModal from "@/components/MealDetailModal";

function useAnimatedValue(target: number, duration = 800) {
  const [display, setDisplay] = useState(target);
  const currentRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = currentRef.current;
    const to = target;
    if (Math.abs(from - to) < 0.1) {
      currentRef.current = to;
      setDisplay(to);
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const startTime = performance.now();
    const startVal = from;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (to - startVal) * eased;
      currentRef.current = current;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function PageIndicator({ current, total, onDotClick }: { current: number; total: number; onDotClick: (index: number) => void }) {
  return (
    <div className="flex justify-center gap-1.5 mt-4">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          onClick={() => onDotClick(i)}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
            i === current ? "w-6 bg-[#1e3a5f]" : "w-1.5 bg-gray-300"
          )}
        />
      ))}
    </div>
  );
}

function MacroRing({ label, value, total, color, emoji, size = 90 }: { label: string; value: number; total: number; color: string; emoji: string; size?: number }) {
  const animatedValue = useAnimatedValue(value, 900);
  const pct = Math.min(100, total > 0 ? (animatedValue / total) * 100 : 0);
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center" data-testid={`macro-ring-${label.toLowerCase()}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm">{emoji}</span>
          <span className="text-sm font-bold text-gray-900">{Math.round(animatedValue)}g</span>
        </div>
      </div>
      <span className="text-[10px] text-gray-500 font-medium mt-1">{label}</span>
      <span className="text-[9px] text-gray-400">of {total}g</span>
    </div>
  );
}

function CalorieHero({ calories, target }: { calories: number; target: number }) {
  const animatedCalories = useAnimatedValue(calories, 1000);
  const pct = Math.min(100, (animatedCalories / target) * 100);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center py-2" data-testid="calorie-hero">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="royalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#2a4a6f" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="70" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="80" cy="80" r="70" fill="none"
            stroke="url(#royalGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl">🔥</span>
          <span className="text-3xl font-bold text-gray-900 mt-1">{Math.round(animatedCalories)}</span>
          <span className="text-xs text-gray-400 font-medium">/ {target} kcal</span>
        </div>
      </div>
    </div>
  );
}

function WeekHistoryChart({ weekHistory, calorieTarget }: { weekHistory: any[]; calorieTarget: number }) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayData = weekHistory.find((w: any) => w.date === dateStr);
    last7.push({
      date: dateStr,
      dayName: dayNames[d.getDay()],
      isToday: i === 0,
      calories: dayData?.totalCalories || 0,
      protein: dayData?.totalProtein || 0,
      carbs: dayData?.totalCarbs || 0,
      fat: dayData?.totalFat || 0,
      mealCount: dayData?.mealCount || 0,
    });
  }

  const maxCal = Math.max(calorieTarget, ...last7.map(d => d.calories));

  return (
    <div className="glass-card p-4 rounded-2xl" data-testid="week-history">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-gray-900">Week History</h3>
        <span className="text-[10px] text-gray-400 font-medium">Last 7 days</span>
      </div>
      <div className="flex items-end justify-between gap-1.5 h-28">
        {last7.map((day, i) => {
          const heightPct = maxCal > 0 ? Math.min(100, (day.calories / maxCal) * 100) : 0;
          const isOver = day.calories > calorieTarget;
          return (
            <div key={i} className="flex flex-col items-center flex-1 gap-1">
              <span className="text-[9px] text-gray-500 font-medium">{day.calories > 0 ? day.calories : ''}</span>
              <div className="w-full flex items-end" style={{ height: '80px' }}>
                <div
                  className={cn(
                    "w-full rounded-t-lg transition-all duration-500",
                    day.isToday
                      ? "bg-gradient-to-t from-[#1e3a5f] to-[#2a5a8f]"
                      : isOver
                        ? "bg-gradient-to-t from-[#c41e3a] to-[#e05a6f]"
                        : day.calories > 0
                          ? "bg-gradient-to-t from-[#8fbc8f] to-[#a8d4a8]"
                          : "bg-gray-100"
                  )}
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                day.isToday ? "text-[#1e3a5f]" : "text-gray-400"
              )}>{day.dayName}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#8fbc8f]" />
          <span className="text-[9px] text-gray-400">Under target</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#c41e3a]" />
          <span className="text-[9px] text-gray-400">Over target</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#1e3a5f]" />
          <span className="text-[9px] text-gray-400">Today</span>
        </div>
      </div>
    </div>
  );
}

function MicroCard({ emoji, label, value, total, color }: { emoji: string; label: string; value: number; total: number; color: string }) {
  const animatedValue = useAnimatedValue(value, 900);
  const pct = Math.min(100, (animatedValue / total) * 100);
  return (
    <div className="glass-card p-4 rounded-2xl" data-testid={`micro-${label.toLowerCase()}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{emoji}</span>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{Math.round(animatedValue)}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">of {total}</div>
      <div className="mt-3 h-3 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
    </div>
  );
}

function Page1({ calories, target, protein, carbs, fat, user, meals, weekHistory, planData }: any) {
  const proteinTarget = user?.proteinTarget || 160;
  const carbsTarget = user?.carbsTarget || 220;
  const fatTarget = user?.fatTarget || 70;
  const [selectedMeal, setSelectedMeal] = useState<any>(null);

  return (
    <div className="space-y-4 px-5">
      <CalorieHero calories={calories} target={target} />

      <div className="flex justify-around items-center glass-card p-4 rounded-2xl">
        <MacroRing emoji="🥩" label="Protein" value={protein} total={proteinTarget} color="#7c3aed" />
        <MacroRing emoji="🍞" label="Carbs" value={carbs} total={carbsTarget} color="#ea580c" />
        <MacroRing emoji="🧈" label="Fat" value={fat} total={fatTarget} color="#d97706" />
      </div>

      <WeekHistoryChart weekHistory={weekHistory} calorieTarget={target} />

      <div className="mt-2">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-gray-900">Recently uploaded</h3>
          <Link href="/meal-history">
            <span className="text-xs text-[#1e3a5f] font-medium cursor-pointer" data-testid="link-view-all-meals">View All</span>
          </Link>
        </div>
        <div className="space-y-2">
          {meals.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">No meals logged today</p>
          )}
          {meals.map((meal: any) => (
            <div
              key={meal.id}
              className="glass-card p-3 rounded-xl flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              data-testid={`meal-${meal.id}`}
              onClick={() => setSelectedMeal(meal)}
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                {meal.image ? (
                  <img src={meal.image} alt={meal.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">🍽️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-medium text-sm truncate">{meal.name}</p>
                <p className="text-gray-400 text-xs">{meal.calories} kcal • {meal.time}</p>
              </div>
              <ChevronRight className="text-[#1e3a5f]/60 flex-shrink-0" size={16} />
            </div>
          ))}
        </div>
      </div>

      {selectedMeal && <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />}

      <div className="mt-2 space-y-3">
        <Link href="/wod">
          <div className="rounded-2xl active:scale-[0.98] transition-transform cursor-pointer bg-gradient-to-r from-[#c41e3a] to-[#1e3a5f] p-4 shadow-lg" data-testid="link-wod">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-xl">🔥</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Today's Challenge</p>
                <p className="text-sm font-bold text-white">Workout of the Day</p>
                <p className="text-[10px] text-white/70 mt-0.5">Tap to see exercises with video demos</p>
              </div>
              <ChevronRight size={16} className="text-white/50" />
            </div>
          </div>
        </Link>
        <Link href="/my-plan">
          <div className="glass-card p-4 rounded-2xl active:scale-95 transition-transform cursor-pointer bg-gradient-to-r from-[#1e3a5f]/5 to-[#8fbc8f]/5 border border-[#1e3a5f]/10" data-testid="link-my-plan">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
                <span className="text-lg">🎯</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#1e3a5f]">My AI Plan</p>
                <p className="text-[10px] text-gray-400">Personalized meals, workouts & schedule</p>
              </div>
              <ChevronRight size={16} className="text-[#1e3a5f]/40" />
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-4">
        <h3 className="text-base font-bold text-gray-900 mb-3">Explore</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/workouts">
            <div className="glass-card p-4 rounded-2xl active:scale-95 transition-transform cursor-pointer" data-testid="link-workouts">
              <span className="text-2xl mb-2 block">💪</span>
              <p className="text-sm font-semibold text-gray-900">Workouts</p>
              <p className="text-[10px] text-gray-400">Exercise library</p>
            </div>
          </Link>
          <Link href="/meals">
            <div className="glass-card p-4 rounded-2xl active:scale-95 transition-transform cursor-pointer" data-testid="link-meals">
              <span className="text-2xl mb-2 block">🍱</span>
              <p className="text-sm font-semibold text-gray-900">Meal Plans</p>
              <p className="text-[10px] text-gray-400">Your daily plan</p>
            </div>
          </Link>
          <Link href="/chat">
            <div className="glass-card p-4 rounded-2xl active:scale-95 transition-transform cursor-pointer" data-testid="link-chat">
              <span className="text-2xl mb-2 block">🤖</span>
              <p className="text-sm font-semibold text-gray-900">AI Chat</p>
              <p className="text-[10px] text-gray-400">Log meals by text</p>
            </div>
          </Link>
          <Link href="/scan">
            <div className="glass-card p-4 rounded-2xl active:scale-95 transition-transform cursor-pointer" data-testid="link-scan">
              <span className="text-2xl mb-2 block">📸</span>
              <p className="text-sm font-semibold text-gray-900">Food Scanner</p>
              <p className="text-[10px] text-gray-400">Scan to log</p>
            </div>
          </Link>
        </div>
      </div>

      {planData?.activity_types_detected && planData.activity_types_detected.length > 0 && (
        <div className="mt-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Your Activities</h3>
          <div className="space-y-2">
            {planData.activity_types_detected.map((activity: any, idx: number) => {
              const activityIcons: Record<string, string> = {
                boxing: "🥊",
                swimming: "🏊",
                running: "🏃",
                cycling: "🚴",
                strength_training: "🏋️",
                yoga: "🧘",
                walking: "🚶",
                bodyweight: "💪",
                other: "⚡",
              };
              const activityColors: Record<string, string> = {
                boxing: "from-red-500/10 to-orange-500/10 border-red-200",
                swimming: "from-cyan-500/10 to-blue-500/10 border-cyan-200",
                running: "from-green-500/10 to-emerald-500/10 border-green-200",
                cycling: "from-orange-500/10 to-amber-500/10 border-orange-200",
                strength_training: "from-red-500/10 to-rose-500/10 border-red-200",
                yoga: "from-purple-500/10 to-violet-500/10 border-purple-200",
                walking: "from-lime-500/10 to-green-500/10 border-lime-200",
                bodyweight: "from-indigo-500/10 to-blue-500/10 border-indigo-200",
              };
              return (
                <Link href="/my-plan" key={idx}>
                  <div className={cn(
                    "glass-card p-4 rounded-2xl active:scale-[0.98] transition-transform cursor-pointer bg-gradient-to-r border",
                    activityColors[activity.type] || "from-gray-500/10 to-gray-500/10 border-gray-200"
                  )} data-testid={`activity-card-${activity.type}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{activityIcons[activity.type] || "⚡"}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 capitalize">{activity.type.replace(/_/g, " ")}</p>
                        <p className="text-[10px] text-gray-400">
                          {activity.tracking_mode === "structured" ? "Detailed tracking" : "Simple logging"} · {(activity.metrics || []).length} metrics
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {planData?.journey?.milestones && planData.journey.milestones.length > 0 && (
        <div className="mt-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Milestones</h3>
          <div className="space-y-2">
            {planData.journey.milestones.slice(0, 3).map((milestone: any, idx: number) => (
              <div key={idx} className="glass-card p-3 rounded-xl flex items-center gap-3" data-testid={`milestone-${idx}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8f] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">D{milestone.target_day}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{milestone.title}</p>
                  <p className="text-[10px] text-gray-400 truncate">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Page2({ user, fiber, sugar, sodium }: { user: any; fiber: number; sugar: number; sodium: number }) {
  const fiberTarget = 38;
  const sugarTarget = 71;
  const sodiumTarget = 2300;

  return (
    <div className="space-y-4 px-5">
      <div className="grid grid-cols-3 gap-3">
        <MicroCard emoji="🥬" label="Fiber" value={Math.round(fiber)} total={fiberTarget} color="#22C55E" />
        <MicroCard emoji="🍬" label="Sugar" value={Math.round(sugar)} total={sugarTarget} color="#EC4899" />
        <MicroCard emoji="🧂" label="Sodium" value={Math.round(sodium)} total={sodiumTarget} color="#6366F1" />
      </div>

      <div className="glass-card p-5 rounded-2xl" data-testid="health-score-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center">
            <span className="text-lg">💚</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Health Score</h3>
            <p className="text-xs text-gray-400">N/A</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          Your health score is calculated based on your daily nutrition intake. 
          Log more meals to see your personalized score and recommendations.
        </p>
      </div>

      <div className="glass-card p-5 rounded-2xl">
        <h3 className="font-bold text-gray-900 mb-2">Nutrition Breakdown</h3>
        <p className="text-sm text-gray-500">
          Track fiber, sugar, and sodium to maintain a balanced diet. 
          These micronutrients are just as important as your macros.
        </p>
      </div>
    </div>
  );
}

function Page3({ water, addWater, caloriesBurned, healthData }: { water: number; addWater: (amount?: number) => void; caloriesBurned: number; healthData: any }) {
  const [sliderVal, setSliderVal] = useState(250);
  const waterTarget = 2500;
  const waterPct = Math.min(100, (water / waterTarget) * 100);
  const stepsPct = healthData.stepsGoal > 0 ? Math.min(100, (healthData.steps / healthData.stepsGoal) * 100) : 0;
  const quickAmounts = [100, 250, 500];

  return (
    <div className="space-y-4 px-5">
      <Link href="/health">
        <div className="glass-card p-5 rounded-2xl active:scale-[0.98] transition-transform cursor-pointer" data-testid="steps-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Footprints size={20} className="text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Steps</h3>
                <p className="text-xs text-gray-400">Tap for insights</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">{healthData.steps.toLocaleString()}</span>
            <span className="text-sm text-gray-400">/ {healthData.stepsGoal.toLocaleString()}</span>
          </div>
          <div className="mt-3 h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700" style={{ width: `${stepsPct}%` }} />
          </div>
          {healthData.caloriesBurnedFromSteps > 0 && (
            <p className="text-[10px] text-gray-400 mt-2">{healthData.caloriesBurnedFromSteps} cal burned from steps · {healthData.activeMinutes} active min</p>
          )}
        </div>
      </Link>

      <div className="glass-card p-5 rounded-2xl" data-testid="calories-burned-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
            <Flame size={20} className="text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Calories burned</h3>
            <p className="text-xs text-gray-400">From all activities</p>
          </div>
        </div>
        <span className="text-3xl font-bold text-gray-900">{caloriesBurned + healthData.caloriesBurnedFromSteps}</span>
        <span className="text-sm text-gray-400 ml-1">cal</span>
        {caloriesBurned > 0 && healthData.caloriesBurnedFromSteps > 0 && (
          <p className="text-[10px] text-gray-400 mt-1">{caloriesBurned} workouts + {healthData.caloriesBurnedFromSteps} steps</p>
        )}
      </div>

      <div className="glass-card p-5 rounded-2xl relative overflow-hidden" data-testid="water-card">
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-200/40 to-cyan-100/10 transition-all duration-700"
          style={{ height: `${waterPct}%` }}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center">
                <Droplets size={20} className="text-cyan-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Water</h3>
                <p className="text-xs text-gray-400">Stay hydrated</p>
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-bold text-gray-900">{water}</span>
            <span className="text-sm text-gray-400">/ {waterTarget} ml</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-500" style={{ width: `${waterPct}%` }} />
          </div>

          <div className="flex gap-2 mb-3">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                data-testid={`button-water-quick-${amt}`}
                onClick={() => addWater(amt)}
                className="flex-1 py-2 bg-cyan-50 text-cyan-700 rounded-lg text-xs font-semibold active:scale-95 transition-transform border border-cyan-100"
              >
                +{amt}ml
              </button>
            ))}
          </div>

          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">Custom amount</span>
              <span className="text-xs font-bold text-[#1e3a5f]">{sliderVal} ml</span>
            </div>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={sliderVal}
              onChange={(e) => setSliderVal(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1e3a5f]"
              data-testid="slider-water"
            />
            <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
              <span>10ml</span>
              <span>1000ml</span>
            </div>
          </div>

          <button
            onClick={() => addWater(sliderVal)}
            className="w-full py-3 bg-[#1e3a5f] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            data-testid="button-log-water-custom"
          >
            <Plus size={16} />
            Log {sliderVal}ml
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { calories, target, protein, carbs, fat, water, meals, addWater, user, loading, caloriesBurned, weekHistory, healthData, loadHealthData } = useStore();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(0);
  const [planData, setPlanData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalPages = 3;

  const fiber = meals.reduce((sum, m) => sum + (m.fiber || 0), 0);
  const sugar = meals.reduce((sum, m) => sum + (m.sugar || 0), 0);
  const sodium = meals.reduce((sum, m) => sum + (m.sodium || 0), 0);

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  useEffect(() => {
    if (!user?.id) return;
    const loadPlan = async () => {
      try {
        const res = await authFetch(`/api/plan/latest/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === "ready" && data.planJson) {
            setPlanData(data.planJson);
          }
        }
      } catch {}
    };
    loadPlan();
  }, [user?.id]);

  const handleWaterClick = (amount?: number) => {
    addWater(amount);
    toast({
      title: "Hydration Recorded",
      description: `Added ${amount || 250}ml of water. Keep it up!`,
      duration: 2000,
    });
  };

  const handleDotClick = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ left: index * container.clientWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const page = Math.round(container.scrollLeft / container.clientWidth);
        setCurrentPage(page);
      }, 50);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  const now = new Date();
  const greeting = getGreeting();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="animate-in fade-in duration-500">
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-lg font-bold text-gray-900">{greeting}, {user?.name || 'there'} 👋</h2>
        <p className="text-sm text-gray-400 mt-0.5">{dateStr}</p>
      </div>

      <PageIndicator current={currentPage} total={totalPages} onDotClick={handleDotClick} />

      <div className="swipe-container mt-2 pb-6" ref={containerRef}>
        <div className="swipe-track">
          <div className="swipe-page">
            <Page1 calories={calories} target={target} protein={protein} carbs={carbs} fat={fat} user={user} meals={meals} weekHistory={weekHistory} planData={planData} />
          </div>
          <div className="swipe-page">
            <Page2 user={user} fiber={fiber} sugar={sugar} sodium={sodium} />
          </div>
          <div className="swipe-page">
            <Page3 water={water} addWater={handleWaterClick} caloriesBurned={caloriesBurned} healthData={healthData} />
          </div>
        </div>
      </div>
    </div>
  );
}
