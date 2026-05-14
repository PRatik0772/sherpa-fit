import { useState, useEffect, useCallback } from "react";
import { useStore, authFetch } from "@/lib/store";
import { Link } from "wouter";
import {
  ChevronDown,
  ChevronRight,
  Droplets,
  Dumbbell,
  UtensilsCrossed,
  Clock,
  Flame,
  ShoppingCart,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type PlanStatus = "generating" | "ready" | "failed" | "not_found";

interface PlanRecord {
  id: string;
  status: string;
  planJson: any;
  failureReason?: string | null;
}

function ExpandableSection({
  title,
  icon,
  children,
  defaultOpen = false,
  testId,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-testid={testId}>
      <button
        className="flex items-center gap-2 w-full text-left py-2"
        onClick={() => setOpen((v) => !v)}
        data-testid={testId ? `${testId}-toggle` : undefined}
      >
        {icon}
        <span className="text-sm font-semibold text-gray-700 flex-1">{title}</span>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>
      {open && <div className="pl-6 pb-2">{children}</div>}
    </div>
  );
}

function MealTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    breakfast: "bg-amber-100 text-amber-700",
    lunch: "bg-green-100 text-green-700",
    snack: "bg-purple-100 text-purple-700",
    dinner: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase", colors[type] || "bg-gray-100 text-gray-600")} data-testid={`badge-meal-${type}`}>
      {type}
    </span>
  );
}

function IntensityBadge({ intensity }: { intensity: string }) {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    moderate: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase", colors[intensity.toLowerCase()] || "bg-gray-100 text-gray-600")} data-testid="badge-intensity">
      {intensity}
    </span>
  );
}

function MealCard({ meal, index }: { meal: any; index: number }) {
  const mealId = meal.id || `${meal.type}-${index}`;
  const ingredientsList = meal.ingredients || [];
  const instructionsList = Array.isArray(meal.instructions) ? meal.instructions : meal.instructions ? [meal.instructions] : [];

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3" data-testid={`meal-card-${mealId}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <MealTypeBadge type={meal.type} />
            {meal.prep_time_min && (
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Clock size={10} /> {meal.prep_time_min} min
              </span>
            )}
          </div>
          <h4 className="text-base font-bold text-gray-900">{meal.title}</h4>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-[#1e3a5f]">{meal.calories}</span>
          <span className="text-[10px] text-gray-400 block">kcal</span>
        </div>
      </div>

      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7c3aed] inline-block" /> P: {meal.protein_g}g</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ea580c] inline-block" /> C: {meal.carbs_g}g</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#d97706] inline-block" /> F: {meal.fat_g}g</span>
      </div>

      {ingredientsList.length > 0 && (
        <ExpandableSection title="Ingredients" testId={`ingredients-${mealId}`}>
          <ul className="space-y-1">
            {ingredientsList.map((ing: any, i: number) => (
              <li key={i} className="text-xs text-gray-600 flex justify-between">
                <span>{typeof ing === "string" ? ing : ing.name}</span>
                {typeof ing !== "string" && ing.amount && <span className="text-gray-400">{ing.amount}</span>}
              </li>
            ))}
          </ul>
        </ExpandableSection>
      )}

      {instructionsList.length > 0 && (
        <ExpandableSection title="Instructions" testId={`instructions-${mealId}`}>
          <ol className="space-y-1.5 list-decimal list-inside">
            {instructionsList.map((step: string, i: number) => (
              <li key={i} className="text-xs text-gray-600">{step}</li>
            ))}
          </ol>
        </ExpandableSection>
      )}
    </div>
  );
}

function WorkoutCard({ workout }: { workout: any }) {
  if (!workout) return null;
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3" data-testid="workout-card">
      <div className="flex items-center gap-2 mb-1">
        <Dumbbell size={18} className="text-[#c41e3a]" />
        <h4 className="text-base font-bold text-gray-900 flex-1">{workout.title}</h4>
        {workout.intensity && <IntensityBadge intensity={workout.intensity} />}
      </div>

      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Clock size={12} /> {workout.duration_min} min</span>
        <span className="flex items-center gap-1"><Flame size={12} /> ~{workout.calories_burn_est} kcal</span>
      </div>

      {workout.muscles?.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="workout-muscles">
          {workout.muscles.map((m: string, i: number) => (
            <span key={i} className="text-[10px] bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full font-medium">
              {m}
            </span>
          ))}
        </div>
      )}

      {workout.steps?.length > 0 && (
        <ExpandableSection title="Exercises" icon={<Dumbbell size={14} className="text-gray-400" />} testId="workout-steps" defaultOpen>
          <div className="space-y-2">
            {workout.steps.map((step: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs" data-testid={`exercise-step-${i}`}>
                <span className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1">
                  <span className="font-semibold text-gray-800">{step.name}</span>
                  <p className="text-gray-500">{step.detail}</p>
                  {step.rest_sec > 0 && <p className="text-gray-400 text-[10px]">Rest: {step.rest_sec}s</p>}
                </div>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}
    </div>
  );
}

function WaterScheduleCard({ schedule, targetMl }: { schedule: any[]; targetMl?: number }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const totalScheduled = schedule.reduce((s, w) => s + w.amount_ml, 0);
  const totalDrank = schedule.reduce((s, w, i) => s + (checked.has(i) ? w.amount_ml : 0), 0);

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3" data-testid="water-schedule">
      <div className="flex items-center gap-2 mb-1">
        <Droplets size={18} className="text-cyan-500" />
        <h4 className="text-base font-bold text-gray-900 flex-1">Water Schedule</h4>
        <span className="text-xs text-gray-400">{totalDrank} / {targetMl || totalScheduled} ml</span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-500"
          style={{ width: `${Math.min(100, ((totalDrank) / (targetMl || totalScheduled || 1)) * 100)}%` }}
        />
      </div>
      <div className="space-y-1.5">
        {schedule.map((entry, i) => (
          <button
            key={i}
            className={cn(
              "flex items-center gap-3 w-full text-left px-3 py-2 rounded-xl transition-colors text-xs",
              checked.has(i) ? "bg-cyan-50 text-cyan-700" : "bg-gray-50 text-gray-600"
            )}
            onClick={() => toggle(i)}
            data-testid={`water-entry-${i}`}
          >
            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0", checked.has(i) ? "border-cyan-500 bg-cyan-500" : "border-gray-300")}>
              {checked.has(i) && <Check size={12} className="text-white" />}
            </div>
            <span className="font-medium">{entry.time}</span>
            <span className="ml-auto text-gray-400">{entry.amount_ml} ml</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DayNotesCard({ notes }: { notes: string[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className="glass-card rounded-2xl p-4" data-testid="day-notes">
      <h4 className="text-base font-bold text-gray-900 mb-2">Tips & Reminders</h4>
      <ul className="space-y-1.5">
        {notes.map((note, i) => (
          <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
            <span className="text-[#8fbc8f] mt-0.5">•</span>
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GroceryListView({ groceryList }: { groceryList: any[] }) {
  if (!groceryList || groceryList.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8" data-testid="grocery-empty">No grocery list available.</p>;
  }
  const isFlat = typeof groceryList[0] === "string";
  if (isFlat) {
    return (
      <div className="space-y-4 px-5" data-testid="grocery-list">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart size={16} className="text-[#8fbc8f]" />
            <h4 className="text-sm font-bold text-gray-900">Shopping List</h4>
          </div>
          <ul className="space-y-1.5">
            {groceryList.map((item: string, j: number) => (
              <li key={j} className="text-xs text-gray-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]/30" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4 px-5" data-testid="grocery-list">
      {groceryList.map((cat, i) => (
        <div key={i} className="glass-card rounded-2xl p-4" data-testid={`grocery-category-${i}`}>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart size={16} className="text-[#8fbc8f]" />
            <h4 className="text-sm font-bold text-gray-900">{cat.category}</h4>
          </div>
          <ul className="space-y-1.5">
            {cat.items.map((item: string, j: number) => (
              <li key={j} className="text-xs text-gray-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]/30" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function OverviewView({ meta, substitutions }: { meta: any; substitutions: any[] }) {
  return (
    <div className="space-y-4 px-5" data-testid="overview-view">
      <div className="glass-card rounded-2xl p-5" data-testid="plan-meta">
        <h3 className="text-2xl font-bold text-[#1e3a5f] mb-3">{meta.plan_name}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {meta.duration_days && (
          <div className="bg-[#1e3a5f]/5 rounded-xl p-3">
            <span className="text-gray-400 text-xs">Duration</span>
            <p className="font-bold text-gray-900">{meta.duration_days} days</p>
          </div>
          )}
          <div className="bg-[#c41e3a]/5 rounded-xl p-3">
            <span className="text-gray-400 text-xs">Daily Calories</span>
            <p className="font-bold text-gray-900">{meta.daily_calories_target} kcal</p>
          </div>
          <div className="bg-[#8fbc8f]/10 rounded-xl p-3">
            <span className="text-gray-400 text-xs">Water Target</span>
            <p className="font-bold text-gray-900">{meta.water_target_ml} ml</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3">
            <span className="text-gray-400 text-xs">Macros</span>
            <p className="font-bold text-gray-900 text-xs">P:{meta.macros?.protein_g}g C:{meta.macros?.carbs_g}g F:{meta.macros?.fat_g}g</p>
          </div>
        </div>
        {meta.disclaimer && (
          <p className="text-[10px] text-gray-400 mt-3 italic">{meta.disclaimer}</p>
        )}
      </div>

      {substitutions && substitutions.length > 0 && (
        <div className="glass-card rounded-2xl p-4" data-testid="substitutions">
          <h4 className="text-base font-bold text-gray-900 mb-3">Substitutions</h4>
          <div className="space-y-2">
            {substitutions.map((sub, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3" data-testid={`substitution-${i}`}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-800">{sub.original}</span>
                  <ChevronRight size={14} className="text-gray-400" />
                  <span className="font-semibold text-[#8fbc8f]">{sub.substitute}</span>
                </div>
                {sub.reason && <p className="text-[10px] text-gray-400 mt-1">{sub.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonLoading() {
  return (
    <div className="space-y-4 px-5 animate-pulse" data-testid="plan-loading">
      <div className="text-center py-6">
        <Loader2 size={32} className="animate-spin text-[#1e3a5f] mx-auto mb-3" />
        <p className="text-sm font-medium text-[#1e3a5f]">Your AI plan is being created...</p>
        <p className="text-xs text-gray-400 mt-1">This may take a minute</p>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card rounded-2xl p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function PlanView() {
  const { userId } = useStore();
  const { toast } = useToast();
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [status, setStatus] = useState<PlanStatus>("generating");
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeTab, setActiveTab] = useState<"today" | "grocery" | "overview">("today");
  const [regenerating, setRegenerating] = useState(false);

  const fetchPlan = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await authFetch(`/api/plan/latest/${userId}`);
      if (res.status === 404) {
        setStatus("not_found");
        setPlan(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch plan");
      const data = await res.json();
      setPlan(data);
      if (data.status === "ready") {
        setStatus("ready");
      } else if (data.status === "failed") {
        setStatus("failed");
      } else {
        setStatus("generating");
      }
    } catch {
      setStatus("failed");
    }
  }, [userId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  useEffect(() => {
    if (status !== "generating") return;
    const interval = setInterval(fetchPlan, 3000);
    return () => clearInterval(interval);
  }, [status, fetchPlan]);

  const handleRegenerate = async () => {
    if (!userId) return;
    setRegenerating(true);
    try {
      const res = await authFetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      setStatus("generating");
      toast({ title: "Regenerating plan", description: "Your AI plan is being recreated..." });
    } catch {
      toast({ title: "Error", description: "Failed to regenerate plan. Please try again.", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-5 text-center" data-testid="plan-no-user">
        <AlertCircle size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h2>
        <p className="text-sm text-gray-400 mb-4">Please sign in to view your plan.</p>
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-5 text-center" data-testid="plan-not-found">
        <UtensilsCrossed size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Plan Yet</h2>
        <p className="text-sm text-gray-400 mb-4">Complete onboarding to get your personalized AI plan.</p>
        <Link href="/onboarding">
          <Button className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" data-testid="link-onboarding">
            Start Onboarding
          </Button>
        </Link>
      </div>
    );
  }

  if (status === "generating") {
    return (
      <div className="animate-in fade-in duration-500 pb-6">
        <div className="px-5 pt-4 pb-3">
          <h2 className="text-2xl font-bold text-[#1e3a5f]">Your Plan</h2>
        </div>
        <SkeletonLoading />
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-5 text-center" data-testid="plan-failed">
        <AlertCircle size={48} className="text-[#c41e3a] mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Plan Generation Failed</h2>
        <p className="text-sm text-gray-400 mb-4">{plan?.failureReason || "Something went wrong while creating your plan."}</p>
        <Button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="bg-[#c41e3a] hover:bg-[#c41e3a]/90"
          data-testid="button-regenerate"
        >
          {regenerating ? <Loader2 size={16} className="animate-spin mr-2" /> : <RefreshCw size={16} className="mr-2" />}
          Regenerate Plan
        </Button>
      </div>
    );
  }

  const planJson = plan?.planJson;
  if (!planJson) return null;

  const meta = planJson.meta || {};
  const timeline = planJson.timeline || [];
  const groceryList = planJson.grocery_list || [];
  const substitutions = planJson.substitutions || [];
  const currentDay = timeline[selectedDay] || timeline[0];

  const tabs = [
    { id: "today" as const, label: "Today", icon: <UtensilsCrossed size={14} /> },
    { id: "grocery" as const, label: "Grocery List", icon: <ShoppingCart size={14} /> },
    { id: "overview" as const, label: "Overview", icon: <Flame size={14} /> },
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-6" data-testid="plan-view">
      <div className="px-5 pt-4 pb-1">
        <h2 className="text-2xl font-bold text-[#1e3a5f]" data-testid="plan-title">{meta.plan_name || "Your Plan"}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{meta.duration_days ? `${meta.duration_days} days • ` : ""}{meta.daily_calories_target} kcal/day</p>
      </div>

      <div className="flex gap-1 px-5 mt-3 mb-4" data-testid="plan-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all",
              activeTab === tab.id
                ? "bg-[#1e3a5f] text-white shadow-md"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
            data-testid={`tab-${tab.id}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "today" && (
        <div>
          {timeline.length > 1 && (
            <div className="px-5 mb-4 overflow-x-auto scrollbar-hide" data-testid="day-selector">
              <div className="flex gap-2 w-max">
                {timeline.map((day: any, i: number) => (
                  <button
                    key={day.day}
                    onClick={() => setSelectedDay(i)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                      selectedDay === i
                        ? "bg-[#c41e3a] text-white shadow-md"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    )}
                    data-testid={`day-pill-${day.day}`}
                  >
                    {day.label || `Day ${day.day}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentDay && (
            <div className="space-y-4 px-5">
              {currentDay.meals?.length > 0 && (
                <div data-testid="meals-section">
                  <div className="flex items-center gap-2 mb-3">
                    <UtensilsCrossed size={16} className="text-[#8fbc8f]" />
                    <h3 className="text-base font-bold text-gray-900">Meals</h3>
                  </div>
                  <div className="space-y-3">
                    {currentDay.meals.map((meal: any, idx: number) => (
                      <MealCard key={meal.id || `${meal.type}-${idx}`} meal={meal} index={idx} />
                    ))}
                  </div>
                </div>
              )}

              {currentDay.workout && (
                <div data-testid="workout-section">
                  <div className="flex items-center gap-2 mb-3">
                    <Dumbbell size={16} className="text-[#c41e3a]" />
                    <h3 className="text-base font-bold text-gray-900">Workout</h3>
                  </div>
                  <WorkoutCard workout={currentDay.workout} />
                </div>
              )}

              {currentDay.water_schedule?.length > 0 && (
                <WaterScheduleCard schedule={currentDay.water_schedule} targetMl={meta.water_target_ml} />
              )}

              <DayNotesCard notes={currentDay.notes} />
            </div>
          )}
        </div>
      )}

      {activeTab === "grocery" && <GroceryListView groceryList={groceryList} />}

      {activeTab === "overview" && <OverviewView meta={meta} substitutions={substitutions} />}
    </div>
  );
}
