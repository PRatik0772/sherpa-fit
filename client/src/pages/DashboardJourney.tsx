import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useStore, authFetch } from "@/lib/store";
import { Utensils, Dumbbell, Droplets, ShoppingCart, ChevronDown, ChevronRight, Clock, Flame, Check, RefreshCw, AlertCircle, X, Play, Pencil, CheckCircle2, PersonStanding, Footprints, Trophy, Loader2, Plus, Trash2 } from "lucide-react";


import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "@/lib/capacitor";
import { useToast } from "@/hooks/use-toast";

function ExpandableSection({ title, icon, children, defaultOpen = false, testId }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-testid={testId}>
      <button className="flex items-center gap-2 w-full text-left py-2" onClick={() => { triggerHaptic('light'); setOpen(v => !v); }} data-testid={testId ? `${testId}-toggle` : undefined}>
        {icon}
        <span className="text-sm font-semibold text-slate-700 flex-1 font-display">{title}</span>
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>
      {open && <div className="pl-6 pb-2">{children}</div>}
    </div>
  );
}

function MiniRing({ value, target, color, size = 32 }: { value: number; target: number; color: string; size?: number }) {
  const progress = Math.min(value / (target || 1), 1);
  const sw = 3;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - progress * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}20`} strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease-out" }} />
    </svg>
  );
}

function EditMealSheet({ meal, onClose, onSave }: {
  meal: any; onClose: () => void;
  onSave: (data: { title: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }) => void;
}) {
  const [title, setTitle] = useState(meal.title || "");
  const [calories, setCalories] = useState(String(meal.calories || 0));
  const [protein, setProtein] = useState(String(meal.protein_g || 0));
  const [carbs, setCarbs] = useState(String(meal.carbs_g || 0));
  const [fat, setFat] = useState(String(meal.fat_g || 0));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-t-3xl p-5 pb-8 w-full max-w-md space-y-3 max-h-[85vh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 font-display">Edit Meal</h3>
          <button onClick={() => { triggerHaptic('light'); onClose(); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" data-testid="button-close-edit-meal">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block font-body">Meal Name</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-body" data-testid="input-meal-title" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block font-body">Calories</label>
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-body" data-testid="input-meal-calories" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block font-body">Protein (g)</label>
            <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-body" data-testid="input-meal-protein" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block font-body">Carbs (g)</label>
            <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-body" data-testid="input-meal-carbs" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block font-body">Fat (g)</label>
            <input type="number" value={fat} onChange={(e) => setFat(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-body" data-testid="input-meal-fat" />
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic('medium');
            onSave({ title, calories: parseInt(calories) || 0, protein_g: parseInt(protein) || 0, carbs_g: parseInt(carbs) || 0, fat_g: parseInt(fat) || 0 });
            triggerHaptic("success");
          }}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-200 active:scale-[0.98] transition font-display"
          data-testid="button-save-meal-edit"
        >
          Save Changes
        </button>
      </motion.div>
    </motion.div>
  );
}

function WorkoutCompleteSheet({ totalCalories, onClose }: { totalCalories: number; onClose: () => void }) {
  const shakeOptions = [
    { name: "Whey Protein Shake", protein: 25, calories: 130, when: "Within 30 min post-workout" },
    { name: "Banana + Peanut Butter Smoothie", protein: 15, calories: 280, when: "Great for muscle recovery" },
    { name: "Greek Yogurt + Berries", protein: 20, calories: 180, when: "Light & refreshing option" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-t-3xl p-5 pb-8 w-full max-w-md max-h-[85vh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, delay: 0.2 }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-200"
          >
            <Trophy size={28} className="text-white" />
          </motion.div>
          <h3 className="text-xl font-bold text-slate-900 font-display">Workout Complete!</h3>
          <p className="text-sm text-slate-500 font-body mt-1">Great job finishing your session</p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-2xl p-4 mb-4 text-center border border-blue-100">
          <p className="text-xs text-slate-500 font-body uppercase tracking-wider mb-1">Total Calories Burned</p>
          <p className="text-3xl font-bold text-blue-600 font-display">{totalCalories}</p>
          <p className="text-xs text-slate-400 font-body">kcal</p>
        </div>

        <div className="mb-2">
          <div className="flex items-center gap-2 mb-3">
            <Utensils size={18} className="text-orange-500" />
            <h4 className="text-sm font-bold text-slate-900 font-display">Recommended Recovery Fuel</h4>
          </div>
          <div className="space-y-2">
            {shakeOptions.map((shake, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100" data-testid={`shake-option-${i}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800 font-display">{shake.name}</p>
                  <span className="text-xs text-blue-600 font-semibold font-display">{shake.calories} kcal</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500 font-body">{shake.protein}g protein</span>
                  <span className="text-xs text-orange-500 font-body">{shake.when}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => { triggerHaptic('light'); onClose(); }}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-sm shadow-lg shadow-orange-200 active:scale-[0.98] transition font-display mt-3"
          data-testid="button-close-workout-complete"
        >
          Done
        </button>
      </motion.div>
    </motion.div>
  );
}

function getYouTubeSearchUrl(exerciseName: string, mode?: string) {
  const modeLabel = mode === "bodyweight" ? "bodyweight at home" : mode === "cardio" ? "cardio" : "";
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + " " + modeLabel + " exercise form tutorial")}`;
}

function getWorkoutModeNote(mode: string): string {
  switch (mode) {
    case "gym": return "Use machines & free weights. Focus on progressive overload.";
    case "bodyweight": return "No equipment needed. Use body resistance and control tempo.";
    case "cardio": return "Keep heart rate elevated. Shorter rest between sets.";
    default: return "";
  }
}

const bodyweightAlternatives: Record<string, { name: string; detail: string }> = {
  "bench press": { name: "Push-Ups", detail: "3 sets of 15-20 reps · Incline/decline variations for chest focus" },
  "incline bench press": { name: "Decline Push-Ups", detail: "3 sets of 12-15 reps · Feet elevated on chair/bench" },
  "dumbbell bench press": { name: "Wide Push-Ups", detail: "3 sets of 15 reps · Wider hand placement for chest" },
  "chest press": { name: "Diamond Push-Ups", detail: "3 sets of 12-15 reps · Hands close together under chest" },
  "barbell squat": { name: "Bodyweight Squats", detail: "3 sets of 20 reps · Slow tempo for resistance" },
  "squat": { name: "Pistol Squat Progression", detail: "3 sets of 8-10 per leg · Use wall for balance" },
  "leg press": { name: "Bulgarian Split Squats", detail: "3 sets of 12 per leg · Rear foot elevated" },
  "deadlift": { name: "Single-Leg RDL", detail: "3 sets of 10 per leg · Bodyweight hinge pattern" },
  "romanian deadlift": { name: "Glute Bridge", detail: "3 sets of 15 reps · Single-leg progression" },
  "lat pulldown": { name: "Pull-Up / Chin-Up", detail: "3 sets of 8-12 reps · Use band for assistance if needed" },
  "pull-ups": { name: "Pull-Ups", detail: "3 sets of max reps · Negative reps if needed" },
  "barbell row": { name: "Inverted Rows", detail: "3 sets of 12-15 reps · Use table or bar at hip height" },
  "bent over row": { name: "Inverted Rows", detail: "3 sets of 12-15 reps · Underhand grip variation" },
  "overhead press": { name: "Pike Push-Ups", detail: "3 sets of 10-12 reps · Feet elevated for more challenge" },
  "shoulder press": { name: "Handstand Push-Up Progression", detail: "3 sets of 8-10 reps · Wall-supported" },
  "lateral raise": { name: "Arm Circles", detail: "3 sets of 20 per direction · Slow tempo with holds" },
  "bicep curl": { name: "Chin-Up Hold", detail: "3 sets of 15-20s · Isometric hold at top" },
  "tricep pushdown": { name: "Tricep Dips", detail: "3 sets of 12-15 reps · Use chair or bench" },
  "tricep extension": { name: "Diamond Push-Ups", detail: "3 sets of 12 reps · Focus on tricep lockout" },
  "cable fly": { name: "Wide Push-Ups", detail: "3 sets of 15 reps · Slow eccentric for chest stretch" },
  "leg curl": { name: "Nordic Curl Negatives", detail: "3 sets of 5-8 reps · Slow lowering phase" },
  "leg extension": { name: "Wall Sit", detail: "3 sets of 30-45s · Single-leg progression" },
  "calf raise": { name: "Single-Leg Calf Raises", detail: "3 sets of 15 per leg · On step edge" },
  "lunges": { name: "Walking Lunges", detail: "3 sets of 12 per leg · Bodyweight" },
  "hip thrust": { name: "Glute Bridge March", detail: "3 sets of 12 per leg · Alternating single-leg" },
  "plank": { name: "Plank", detail: "3 sets of 45-60s · Add side plank variations" },
  "crunch": { name: "Bicycle Crunches", detail: "3 sets of 20 reps · Slow and controlled" },
};

const cardioAlternatives: Record<string, { name: string; detail: string }> = {
  "bench press": { name: "Burpee Push-Ups", detail: "4 sets of 10 · 20s rest between sets" },
  "incline bench press": { name: "Mountain Climber Push-Ups", detail: "4 sets of 8 · Alternate push-up and climbers" },
  "dumbbell bench press": { name: "Plyo Push-Ups", detail: "4 sets of 8 · Explosive push off ground" },
  "barbell squat": { name: "Jump Squats", detail: "4 sets of 15 · Explosive up, controlled down" },
  "squat": { name: "Squat Jumps", detail: "4 sets of 15 · 15s rest, keep heart rate up" },
  "leg press": { name: "Box Jumps / Step-Ups", detail: "4 sets of 12 · Alternate legs rapidly" },
  "deadlift": { name: "Kettlebell Swings (or Broad Jumps)", detail: "4 sets of 15 · Explosive hip hinge" },
  "lat pulldown": { name: "Renegade Rows (or Battle Ropes)", detail: "4 sets of 30s · Fast alternating pulls" },
  "barbell row": { name: "Rowing Intervals", detail: "4 sets of 250m · Max effort with 30s rest" },
  "overhead press": { name: "Thruster (Squat to Press)", detail: "4 sets of 12 · Light weight, fast tempo" },
  "shoulder press": { name: "Push Press Intervals", detail: "4 sets of 12 · Explosive drive from legs" },
  "bicep curl": { name: "Battle Rope Curls", detail: "4 sets of 30s · Alternating waves" },
  "tricep pushdown": { name: "Burpees", detail: "4 sets of 10 · Full extension at top" },
  "lunges": { name: "Jump Lunges", detail: "4 sets of 10 per leg · Explosive alternating" },
  "leg curl": { name: "Sprint Intervals", detail: "4 sets of 20s sprint / 40s walk" },
  "calf raise": { name: "High Knees", detail: "4 sets of 30s · Fast pace" },
  "plank": { name: "Mountain Climbers", detail: "4 sets of 30s · Fast tempo, core engaged" },
  "crunch": { name: "Bicycle Sprints", detail: "4 sets of 30s · Fast alternating" },
  "hip thrust": { name: "Squat Thrust", detail: "4 sets of 12 · Explosive hip extension" },
};

function adaptExerciseForMode(step: { name: string; detail: string }, mode: string): { name: string; detail: string } {
  if (mode === "gym") return step;
  const key = step.name.toLowerCase().trim();
  const map = mode === "bodyweight" ? bodyweightAlternatives : cardioAlternatives;
  if (map[key]) return map[key];
  for (const [pattern, alt] of Object.entries(map)) {
    if (key.includes(pattern) || pattern.includes(key)) return alt;
  }
  if (mode === "bodyweight") {
    return { name: step.name + " (Bodyweight)", detail: step.detail + " · Adapt without equipment, use slow tempo" };
  }
  return { name: step.name + " (HIIT)", detail: step.detail + " · Superset with 30s jumping jacks between sets" };
}

export default function DashboardJourney() {
  const { userId, reloadMeals, logExercise } = useStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [plan, setPlan] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed" | "none">("loading");
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeTab, setActiveTab] = useState<"meals" | "workout" | "water" | "grocery">("meals");
  const [waterChecked, setWaterChecked] = useState<Set<number>>(new Set());
  const [regenerating, setRegenerating] = useState(false);

  const [mealsLogged, setMealsLogged] = useState<Set<string>>(new Set());
  const [mealsLogging, setMealsLogging] = useState<Set<string>>(new Set());
  const [editingMeal, setEditingMeal] = useState<any>(null);
  const [mealEdits, setMealEdits] = useState<Record<string, any>>({});

  const [groceryDbItems, setGroceryDbItems] = useState<any[]>([]);
  const [newGroceryItem, setNewGroceryItem] = useState("");
  const [addingGrocery, setAddingGrocery] = useState(false);
  const [planIdForGrocery, setPlanIdForGrocery] = useState<string | null>(null);

  const [weeklyMeals, setWeeklyMeals] = useState<any[]>([]);
  const [weeklyMealsLogged, setWeeklyMealsLogged] = useState<Set<string>>(new Set());
  const [weeklyMealsLogging, setWeeklyMealsLogging] = useState<Set<string>>(new Set());

  const [exercisesChecked, setExercisesChecked] = useState<Set<string>>(new Set());
  const [workoutMode, setWorkoutMode] = useState<"gym" | "bodyweight" | "cardio">("gym");
  const [showWorkoutComplete, setShowWorkoutComplete] = useState(false);
  const [workoutLogged, setWorkoutLogged] = useState(false);
  const [todayDayIndex, setTodayDayIndex] = useState(0);

  const todayKey = new Date().toISOString().split("T")[0];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`sherpa_meals_logged_${todayKey}`);
      if (saved) setMealsLogged(new Set(JSON.parse(saved) as string[]));
      const savedExercises = localStorage.getItem(`sherpa_exercises_checked_${todayKey}`);
      if (savedExercises) setExercisesChecked(new Set(JSON.parse(savedExercises) as string[]));
      const savedEdits = localStorage.getItem(`sherpa_meal_edits`);
      if (savedEdits) setMealEdits(JSON.parse(savedEdits));
      const savedMode = localStorage.getItem(`sherpa_workout_mode`);
      if (savedMode) setWorkoutMode(savedMode as any);
      const savedWkLogged = localStorage.getItem(`sherpa_workout_logged_${todayKey}`);
      if (savedWkLogged) setWorkoutLogged(true);
    } catch {}
  }, [todayKey]);

  const persistMealsLogged = (set: Set<string>) => {
    localStorage.setItem(`sherpa_meals_logged_${todayKey}`, JSON.stringify([...set]));
  };
  const persistExercisesChecked = (set: Set<string>) => {
    localStorage.setItem(`sherpa_exercises_checked_${todayKey}`, JSON.stringify([...set]));
  };

  const fetchGroceryItems = useCallback(async (planId: string) => {
    try {
      const res = await authFetch(`/api/grocery?planId=${planId}`);
      if (res.ok) setGroceryDbItems(await res.json());
    } catch {}
  }, []);

  const toggleGroceryItem = async (id: string, currentChecked: boolean) => {
    setGroceryDbItems(prev => prev.map(it => it.id === id ? { ...it, checked: !currentChecked } : it));
    try {
      const res = await authFetch(`/api/grocery/${id}/toggle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: !currentChecked }),
      });
      if (!res.ok) throw new Error("toggle failed");
    } catch {
      setGroceryDbItems(prev => prev.map(it => it.id === id ? { ...it, checked: currentChecked } : it));
    }
    triggerHaptic("light");
  };

  const handleAddGroceryItem = async () => {
    const trimmed = newGroceryItem.trim();
    if (!trimmed) return;
    setAddingGrocery(true);
    try {
      const res = await authFetch("/api/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: trimmed, category: "Custom", planId: planIdForGrocery }),
      });
      if (res.ok) {
        const row = await res.json();
        setGroceryDbItems(prev => [...prev, row]);
        setNewGroceryItem("");
        triggerHaptic("success");
      }
    } catch {
      toast({ title: "Couldn't add item", description: "Please try again.", variant: "destructive" });
    }
    setAddingGrocery(false);
  };

  const handleDeleteGroceryItem = async (id: string) => {
    setGroceryDbItems(prev => prev.filter(it => it.id !== id));
    try {
      const res = await authFetch(`/api/grocery/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      triggerHaptic("light");
    } catch {
      if (planIdForGrocery) fetchGroceryItems(planIdForGrocery);
    }
  };

  const fetchPlan = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await authFetch(`/api/plan/latest/${userId}`);
      if (res.status === 404) { setStatus("none"); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.status === "ready" && data.planJson) {
        setPlan(data);
        setStatus("ready");
        const dayIndex = new Date().getDay() % (data.planJson.timeline?.length || 1);
        setSelectedDay(dayIndex);
        setTodayDayIndex(dayIndex);
        // Seed grocery items from plan — server marks grocerySeeded=true after first seed
        // so deletions remain durable across devices
        if (data.id) {
          setPlanIdForGrocery(data.id);
          if (data.planJson.grocery_list?.length > 0) {
            const flatItems: { item: string; category: string }[] = [];
            (data.planJson.grocery_list || []).forEach((cat: any) => {
              if (typeof cat === "object" && cat.category && Array.isArray(cat.items)) {
                cat.items.forEach((it: string) => flatItems.push({ item: it, category: cat.category }));
              } else if (typeof cat === "string") {
                flatItems.push({ item: cat, category: "Other" });
              }
            });
            authFetch("/api/grocery/seed", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ planId: data.id, items: flatItems }),
            }).then(r => { if (r.ok) fetchGroceryItems(data.id); }).catch(() => {});
          } else {
            fetchGroceryItems(data.id);
          }
        }
      } else if (data.status === "failed") {
        setStatus("failed");
      } else {
        setStatus("none");
      }
    } catch {
      setStatus("failed");
    }
  }, [userId, fetchGroceryItems]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const fetchWeeklyMeals = useCallback(async (dayOfWeek: number) => {
    if (!userId) return;
    try {
      const res = await authFetch(`/api/weekly-meals/${userId}?day=${dayOfWeek}`);
      if (res.ok) {
        const data = await res.json();
        setWeeklyMeals(data || []);
        try {
          const saved = localStorage.getItem(`sherpa_weekly_meals_logged_${todayKey}`);
          if (saved) setWeeklyMealsLogged(new Set(JSON.parse(saved) as string[]));
        } catch {}
      } else {
        setWeeklyMeals([]);
      }
    } catch {
      setWeeklyMeals([]);
    }
  }, [userId, todayKey]);

  useEffect(() => {
    if (status === "ready" && plan?.planJson?.timeline) {
      const dayOfWeek = (new Date().getDay() + selectedDay - todayDayIndex + 7) % 7;
      fetchWeeklyMeals(dayOfWeek);
    }
  }, [selectedDay, status, fetchWeeklyMeals, todayDayIndex]);

  const logWeeklyMeal = async (meal: any) => {
    if (!userId) return;
    const wKey = `wm_${meal.id}`;
    if (weeklyMealsLogged.has(wKey)) return;
    setWeeklyMealsLogging(prev => new Set(prev).add(wKey));
    try {
      const res = await authFetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: meal.name,
          calories: meal.calories || 0,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fat: meal.fat || 0,
          fiber: 0, sugar: 0, sodium: 0,
          ingredients: "",
        }),
      });
      if (res.ok) {
        const newSet = new Set(weeklyMealsLogged).add(wKey);
        setWeeklyMealsLogged(newSet);
        localStorage.setItem(`sherpa_weekly_meals_logged_${todayKey}`, JSON.stringify(Array.from(newSet)));
        triggerHaptic("success");
        toast({ title: `${meal.mealType?.charAt(0).toUpperCase() + meal.mealType?.slice(1)} logged!`, description: `${meal.name} - ${meal.calories} kcal` });
        reloadMeals();
      }
    } catch {
      toast({ title: "Error", description: "Failed to log meal", variant: "destructive" });
    } finally {
      setWeeklyMealsLogging(prev => { const n = new Set(prev); n.delete(wKey); return n; });
    }
  };

  const logMealAsEaten = async (meal: any, dayIndex: number, mealIndex: number) => {
    if (!userId) return;
    const mealKey = `d${dayIndex}_m${mealIndex}`;
    const edited = mealEdits[mealKey];
    const mealData = edited || meal;

    setMealsLogging(prev => new Set(prev).add(mealKey));
    try {
      const res = await authFetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: mealData.title || mealData.name || "Meal",
          calories: mealData.calories || 0,
          protein: mealData.protein_g || 0,
          carbs: mealData.carbs_g || 0,
          fat: mealData.fat_g || 0,
          fiber: 0, sugar: 0, sodium: 0,
          ingredients: Array.isArray(meal.ingredients) ? meal.ingredients.join(", ") : "",
        }),
      });
      if (res.ok) {
        const newSet = new Set(mealsLogged).add(mealKey);
        setMealsLogged(newSet);
        persistMealsLogged(newSet);
        triggerHaptic("success");
        toast({ title: `${meal.type?.charAt(0).toUpperCase() + meal.type?.slice(1)} logged!`, description: `${mealData.title} - ${mealData.calories} kcal` });
        reloadMeals();
      }
    } catch {
      toast({ title: "Error", description: "Failed to log meal", variant: "destructive" });
    } finally {
      setMealsLogging(prev => { const n = new Set(prev); n.delete(mealKey); return n; });
    }
  };

  const handleSaveMealEdit = (dayIndex: number, mealIndex: number, data: any) => {
    const key = `d${dayIndex}_m${mealIndex}`;
    const newEdits = { ...mealEdits, [key]: data };
    setMealEdits(newEdits);
    localStorage.setItem(`sherpa_meal_edits`, JSON.stringify(newEdits));
    setEditingMeal(null);
    triggerHaptic("success");
    toast({ title: "Meal updated", description: "Your edits will be used when you log this meal" });
  };

  const exercisesLoggedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`sherpa_exercises_logged_${todayKey}`);
      if (saved) exercisesLoggedRef.current = new Set(JSON.parse(saved) as string[]);
    } catch {}
  }, [todayKey]);

  const logSingleExercise = async (exerciseName: string, workout: any, stepIndex: number) => {
    if (!userId) return;
    const logKey = `d${selectedDay}_e${stepIndex}`;
    if (exercisesLoggedRef.current.has(logKey)) return;
    const totalSteps = (workout.steps || []).length || 1;
    const perExerciseCalories = Math.round((workout.calories_burn_est || 0) / totalSteps);
    const perExerciseDuration = Math.round((workout.duration_min || 0) / totalSteps);
    try {
      await logExercise({
        exerciseName,
        caloriesBurned: perExerciseCalories,
        duration: perExerciseDuration,
        intensity: "moderate",
        setsCompleted: 1,
      });
      exercisesLoggedRef.current.add(logKey);
      localStorage.setItem(`sherpa_exercises_logged_${todayKey}`, JSON.stringify([...exercisesLoggedRef.current]));
      toast({ title: "Exercise logged!", description: `${exerciseName} · ${perExerciseCalories} kcal burned` });
    } catch {}
  };

  const logWorkoutComplete = async (workout: any) => {
    if (!userId || workoutLogged) return;
    setWorkoutLogged(true);
    localStorage.setItem(`sherpa_workout_logged_${todayKey}`, "true");
    setShowWorkoutComplete(true);
    triggerHaptic("success");
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const handleRegenerate = async () => {
    if (!userId || regenerating) return;
    setRegenerating(true);
    try {
      const res = await authFetch("/api/plan/generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.planId) navigate(`/plan-creating/${data.planId}`);
    } catch { setRegenerating(false); }
  };

  if (status === "none" || status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-5 text-center" data-testid="plan-empty">
        <AlertCircle size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2 font-display">{status === "failed" ? "Plan Generation Failed" : "No Plan Yet"}</h2>
        <p className="text-sm text-slate-400 mb-4 font-body">{status === "failed" ? "Generation failed. Try again." : "Complete your profile to generate your plan."}</p>
        <div className="flex gap-3">
          <a href="/onboarding" className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm font-display" data-testid="link-start-onboarding">
            {status === "failed" ? "Edit Profile" : "Get Started"}
          </a>
          {status === "failed" && (
            <button onClick={() => { triggerHaptic('medium'); handleRegenerate(); }} disabled={regenerating}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center gap-2 font-display"
              data-testid="button-regenerate">
              {regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Regenerate Plan
            </button>
          )}
        </div>
      </div>
    );
  }

  const pj = plan.planJson;
  const meta = pj.meta || {};
  const timeline = pj.timeline || [];
  const currentDay = timeline[selectedDay] || timeline[0];
  const groceryList = pj.grocery_list || [];

  const tabs = [
    { id: "meals" as const, label: "Meals", icon: <Utensils size={14} /> },
    { id: "workout" as const, label: "Workout", icon: <Dumbbell size={14} /> },
    { id: "water" as const, label: "Water", icon: <Droplets size={14} /> },
    { id: "grocery" as const, label: "Grocery", icon: <ShoppingCart size={14} /> },
  ];

  const mealTypeColors: Record<string, { bg: string; text: string; icon: string }> = {
    breakfast: { bg: "bg-amber-50", text: "text-amber-600", icon: "text-amber-500" },
    lunch: { bg: "bg-green-50", text: "text-green-600", icon: "text-green-500" },
    snack: { bg: "bg-violet-50", text: "text-violet-600", icon: "text-violet-500" },
    dinner: { bg: "bg-blue-50", text: "text-blue-600", icon: "text-blue-500" },
  };

  const isToday = selectedDay === todayDayIndex;

  const workoutSteps = currentDay?.workout?.steps || [];
  const allExercisesCompleted = workoutSteps.length > 0 && workoutSteps.every((_: any, i: number) => exercisesChecked.has(`d${selectedDay}_e${i}`));

  const workoutModes = [
    { id: "gym" as const, label: "Gym", icon: <Dumbbell size={14} /> },
    { id: "bodyweight" as const, label: "Bodyweight", icon: <PersonStanding size={14} /> },
    { id: "cardio" as const, label: "Cardio", icon: <Footprints size={14} /> },
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-4" data-testid="journey-page">
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 px-5 pb-5 rounded-b-3xl safe-pad-top" style={{ paddingTop: "max(env(safe-area-inset-top, 20px), 20px)" }}>
        <h1 className="text-xl font-bold text-white font-display pt-2" data-testid="plan-title">{meta.plan_name || "Your Plan"}</h1>
        <p className="text-xs text-orange-200 mt-0.5 font-body">{meta.daily_calories_target} kcal/day · P:{meta.macros?.protein_g}g C:{meta.macros?.carbs_g}g F:{meta.macros?.fat_g}g</p>

        {timeline.length > 1 && (
          <div className="mt-3 overflow-x-auto scrollbar-hide" data-testid="day-selector">
            <div className="flex gap-2 w-max">
              {timeline.map((day: any, i: number) => {
                const focusLabel = day.workout?.title || day.workout?.focus || day.focus || "";
                const shortFocus = focusLabel.length > 18 ? focusLabel.slice(0, 16) + "…" : focusLabel;
                return (
                  <button key={day.day} onClick={() => { triggerHaptic('selection'); setSelectedDay(i); }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all font-display flex flex-col items-center gap-0.5 min-w-[72px] ${
                      selectedDay === i ? "bg-white text-orange-700 shadow-md" : "bg-orange-600/50 text-orange-200 border border-orange-500/30"
                    }`} data-testid={`day-pill-${day.day}`}>
                    <span className="flex items-center gap-1">
                      Day {day.day}
                      {i === todayDayIndex && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold leading-none">TODAY</span>}
                    </span>
                    {shortFocus && (
                      <span className={`text-[9px] font-normal truncate max-w-[80px] ${
                        selectedDay === i ? "text-orange-500" : "text-orange-300/80"
                      }`}>{shortFocus}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 px-5 mt-4 mb-4" data-testid="plan-tabs">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => { triggerHaptic('selection'); setActiveTab(tab.id); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all font-display ${
              activeTab === tab.id ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-100"
            }`} data-testid={`tab-${tab.id}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {!isToday && (
        <div className="mx-5 mb-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2" data-testid="preview-banner">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-body">
            <span className="font-semibold">Preview mode</span> — You can view and edit meals for Day {currentDay?.day}, but logging is only available for today.
          </p>
        </div>
      )}

      {activeTab === "meals" && currentDay && (
        <div className="px-5 space-y-3">
          {(currentDay.meals || []).map((meal: any, i: number) => {
            const colors = mealTypeColors[meal.type] || mealTypeColors.dinner;
            const mealKey = `d${selectedDay}_m${i}`;
            const isLogged = mealsLogged.has(mealKey);
            const isLogging = mealsLogging.has(mealKey);
            const edited = mealEdits[mealKey];
            const displayMeal = edited ? { ...meal, ...edited } : meal;
            const totalMacros = (displayMeal.protein_g || 0) + (displayMeal.carbs_g || 0) + (displayMeal.fat_g || 0);

            return (
              <motion.div
                key={i}
                layout
                className={`bg-white rounded-2xl overflow-hidden border shadow-sm transition-all ${
                  isLogged ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100/80"
                }`}
                data-testid={`meal-card-${i}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                        {isLogged ? <Check size={14} className="text-emerald-500" /> : <Utensils size={14} className={colors.icon} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${isLogged ? "text-emerald-600" : colors.text}`}>{meal.type}</span>
                        <h4 className={`text-sm font-bold font-display truncate ${isLogged ? "text-slate-400 line-through" : "text-slate-900"}`}>{displayMeal.title}</h4>
                        {edited && <span className="text-[9px] text-blue-500 font-body">edited</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {!isLogged && (
                        <button
                          onClick={() => { setEditingMeal({ ...meal, dayIndex: selectedDay, mealIndex: i }); triggerHaptic("light"); }}
                          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
                          data-testid={`button-edit-meal-${i}`}
                        >
                          <Pencil size={13} className="text-slate-500" />
                        </button>
                      )}
                      {isToday && (
                        <button
                          onClick={() => {
                            triggerHaptic('medium');
                            if (!isLogged && !isLogging) logMealAsEaten(displayMeal, selectedDay, i);
                          }}
                          disabled={isLogged || isLogging}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isLogged
                              ? "bg-emerald-500 shadow-lg shadow-emerald-200"
                              : isLogging
                                ? "bg-blue-100"
                                : "bg-blue-600 shadow-lg shadow-blue-200 active:scale-90"
                          }`}
                          data-testid={`button-log-meal-${i}`}
                        >
                          {isLogging ? (
                            <Loader2 size={14} className="text-blue-600 animate-spin" />
                          ) : isLogged ? (
                            <Check size={18} className="text-white" />
                          ) : (
                            <Check size={18} className="text-white" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5">
                      <MiniRing value={displayMeal.protein_g || 0} target={totalMacros || 1} color="#2563eb" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-body">Protein</p>
                        <p className="text-xs font-semibold text-slate-700 font-display">{displayMeal.protein_g}g</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MiniRing value={displayMeal.carbs_g || 0} target={totalMacros || 1} color="#f97316" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-body">Carbs</p>
                        <p className="text-xs font-semibold text-slate-700 font-display">{displayMeal.carbs_g}g</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MiniRing value={displayMeal.fat_g || 0} target={totalMacros || 1} color="#eab308" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-body">Fat</p>
                        <p className="text-xs font-semibold text-slate-700 font-display">{displayMeal.fat_g}g</p>
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <span className="text-lg font-bold text-blue-600 font-display">{displayMeal.calories}</span>
                      <span className="text-[10px] text-slate-400 block font-body">kcal</span>
                    </div>
                  </div>
                </div>

                {meal.ingredients && (
                  <div className="px-4 border-t border-slate-50">
                    <ExpandableSection title="Ingredients" testId={`ingredients-${i}`}>
                      <ul className="space-y-1">
                        {(Array.isArray(meal.ingredients) ? meal.ingredients : []).map((ing: any, j: number) => (
                          <li key={j} className="text-xs text-slate-600 font-body">{typeof ing === "string" ? ing : ing.name}</li>
                        ))}
                      </ul>
                    </ExpandableSection>
                  </div>
                )}
                {meal.instructions && (
                  <div className="px-4 border-t border-slate-50">
                    <ExpandableSection title="Instructions" testId={`instructions-${i}`}>
                      <p className="text-xs text-slate-600 font-body">{typeof meal.instructions === "string" ? meal.instructions : (meal.instructions || []).join(". ")}</p>
                    </ExpandableSection>
                  </div>
                )}

                {isLogged && (
                  <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span className="text-xs text-emerald-600 font-semibold font-body">Logged as eaten today</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {weeklyMeals.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Utensils size={14} className="text-violet-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 font-display">Your Planned Meals</h3>
                <span className="text-[10px] text-slate-400 font-body ml-auto">from Weekly Planner</span>
              </div>
              <div className="space-y-2.5">
                {weeklyMeals.map((wm: any) => {
                  const wKey = `wm_${wm.id}`;
                  const isLogged = weeklyMealsLogged.has(wKey);
                  const isLogging = weeklyMealsLogging.has(wKey);
                  const typeColors = mealTypeColors[wm.mealType] || mealTypeColors.dinner;
                  return (
                    <div key={wm.id} className={`bg-white rounded-2xl p-4 border shadow-sm ${isLogged ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100/80"}`}
                      data-testid={`weekly-meal-${wm.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-lg ${typeColors.bg} flex items-center justify-center flex-shrink-0`}>
                            {isLogged ? <Check size={14} className="text-emerald-500" /> : <Utensils size={14} className={typeColors.icon} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isLogged ? "text-emerald-600" : typeColors.text}`}>{wm.mealType}</span>
                            <h4 className={`text-sm font-bold font-display truncate ${isLogged ? "text-slate-400 line-through" : "text-slate-900"}`}>{wm.name}</h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <div className="text-right">
                            <span className="text-lg font-bold text-blue-600 font-display">{wm.calories}</span>
                            <span className="text-[10px] text-slate-400 block font-body">kcal</span>
                          </div>
                          {isToday && (
                            <button
                              onClick={() => { if (!isLogged && !isLogging) logWeeklyMeal(wm); }}
                              disabled={isLogged || isLogging}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isLogged ? "bg-emerald-500 shadow-lg shadow-emerald-200" : isLogging ? "bg-blue-100" : "bg-blue-600 shadow-lg shadow-blue-200 active:scale-90"
                              }`}
                              data-testid={`button-log-weekly-meal-${wm.id}`}
                            >
                              {isLogging ? <Loader2 size={14} className="text-blue-600 animate-spin" /> : <Check size={18} className="text-white" />}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1.5">
                          <MiniRing value={wm.protein || 0} target={(wm.protein || 0) + (wm.carbs || 0) + (wm.fat || 0) || 1} color="#2563eb" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-body">Protein</p>
                            <p className="text-xs font-semibold text-slate-700 font-display">{wm.protein}g</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MiniRing value={wm.carbs || 0} target={(wm.protein || 0) + (wm.carbs || 0) + (wm.fat || 0) || 1} color="#f97316" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-body">Carbs</p>
                            <p className="text-xs font-semibold text-slate-700 font-display">{wm.carbs}g</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MiniRing value={wm.fat || 0} target={(wm.protein || 0) + (wm.carbs || 0) + (wm.fat || 0) || 1} color="#eab308" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-body">Fat</p>
                            <p className="text-xs font-semibold text-slate-700 font-display">{wm.fat}g</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "workout" && currentDay?.workout && (
        <div className="px-5">
          <div className="flex gap-1.5 mb-4" data-testid="workout-mode-toggle">
            {workoutModes.map(mode => (
              <button
                key={mode.id}
                onClick={() => {
                  setWorkoutMode(mode.id);
                  localStorage.setItem("sherpa_workout_mode", mode.id);
                  triggerHaptic("light");
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all font-display ${
                  workoutMode === mode.id
                    ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                    : "bg-white text-slate-500 border border-slate-100"
                }`}
                data-testid={`workout-mode-${mode.id}`}
              >
                {mode.icon}{mode.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100/80 shadow-sm" data-testid="workout-detail">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                {workoutMode === "gym" ? <Dumbbell size={18} className="text-white" /> :
                 workoutMode === "cardio" ? <Footprints size={18} className="text-white" /> :
                 <Dumbbell size={18} className="text-white" />}
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-slate-900 font-display">{currentDay.workout.title}</h4>
                <div className="flex gap-4 text-xs text-slate-500 mt-0.5 font-body">
                  <span className="flex items-center gap-1"><Clock size={12} /> {currentDay.workout.duration_min} min</span>
                  <span className="flex items-center gap-1"><Flame size={12} /> ~{currentDay.workout.calories_burn_est} kcal</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-body uppercase">{workoutMode}</span>
                <p className="text-xs font-semibold text-orange-600 font-display">
                  {workoutSteps.filter((_: any, i: number) => exercisesChecked.has(`d${selectedDay}_e${i}`)).length}/{workoutSteps.length}
                </p>
              </div>
            </div>

            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
              <p className="text-[11px] text-slate-500 font-body">{getWorkoutModeNote(workoutMode)}</p>
            </div>

            {workoutSteps.length > 0 && (
              <div className="px-4 pt-2 pb-1">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(workoutSteps.filter((_: any, i: number) => exercisesChecked.has(`d${selectedDay}_e${i}`)).length / workoutSteps.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            <div className="p-4 space-y-2">
              {workoutSteps.map((step: any, i: number) => {
                const exKey = `d${selectedDay}_e${i}`;
                const isChecked = exercisesChecked.has(exKey);
                const adapted = adaptExerciseForMode(step, workoutMode);
                return (
                  <motion.div
                    key={`${i}-${workoutMode}`}
                    layout
                    className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                      isChecked ? "bg-emerald-50 border border-emerald-100" : "bg-slate-50"
                    }`}
                    data-testid={`exercise-${i}`}
                  >
                    {isToday ? (
                      <button
                        onClick={() => {
                          const newSet = new Set(exercisesChecked);
                          if (isChecked) newSet.delete(exKey); else newSet.add(exKey);
                          setExercisesChecked(newSet);
                          persistExercisesChecked(newSet);
                          triggerHaptic(isChecked ? "light" : "medium");

                          if (!isChecked) {
                            logSingleExercise(adapted.name, currentDay.workout, i);
                          }

                          const allDone = workoutSteps.every((_: any, j: number) =>
                            j === i ? !isChecked : newSet.has(`d${selectedDay}_e${j}`)
                          );
                          if (allDone && !workoutLogged) {
                            logWorkoutComplete(currentDay.workout);
                          }
                        }}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          isChecked
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-slate-300 bg-white"
                        }`}
                        data-testid={`checkbox-exercise-${i}`}
                      >
                        {isChecked && <Check size={14} className="text-white" />}
                      </button>
                    ) : (
                      <div className="w-7 h-7 rounded-full border-2 border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-400">{i + 1}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold font-display ${isChecked ? "text-emerald-700 line-through" : "text-slate-800"}`}>{adapted.name}</p>
                      <p className="text-xs text-slate-500 font-body">{adapted.detail}</p>
                      {workoutMode !== "gym" && (
                        <p className="text-[10px] text-blue-500 font-body mt-0.5">
                          Original: {step.name}
                        </p>
                      )}
                    </div>
                    <a
                      href={getYouTubeSearchUrl(adapted.name, workoutMode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 active:scale-90 transition"
                      data-testid={`button-video-${i}`}
                    >
                      <Play size={14} className="text-red-500 ml-0.5" />
                    </a>
                  </motion.div>
                );
              })}
            </div>

            {allExercisesCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-4 mb-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={18} className="text-orange-500" />
                  <span className="text-sm font-bold text-slate-900 font-display">Session Complete!</span>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-body">Calories Burned</p>
                    <p className="text-lg font-bold text-blue-600 font-display">~{currentDay.workout.calories_burn_est} kcal</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-body">Duration</p>
                    <p className="text-lg font-bold text-orange-500 font-display">{currentDay.workout.duration_min} min</p>
                  </div>
                </div>
                <button
                  onClick={() => { triggerHaptic('success'); setShowWorkoutComplete(true); }}
                  className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-semibold font-display shadow-lg shadow-orange-200 active:scale-[0.98] transition"
                  data-testid="button-view-recovery"
                >
                  View Recovery Recommendations
                </button>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {activeTab === "water" && currentDay?.water_schedule && (
        <div className="px-5">
          <div className="bg-white rounded-2xl p-4 border border-slate-100/80 shadow-sm" data-testid="water-schedule">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                <Droplets size={16} className="text-cyan-500" />
              </div>
              <h4 className="text-base font-bold text-slate-900 flex-1 font-display">Water Schedule</h4>
              <span className="text-xs text-slate-400 font-body">{meta.water_target_ml} ml target</span>
            </div>
            <div className="h-2 w-full bg-cyan-50 rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all"
                style={{ width: `${Math.min(100, (waterChecked.size / (currentDay.water_schedule.length || 1)) * 100)}%` }} />
            </div>
            <div className="space-y-1.5">
              {currentDay.water_schedule.map((entry: any, i: number) => (
                <button key={i} onClick={() => { triggerHaptic('light'); setWaterChecked(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; }); }}
                  className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl text-xs transition font-body ${
                    waterChecked.has(i) ? "bg-cyan-50 text-cyan-700" : "bg-slate-50 text-slate-600"
                  }`} data-testid={`water-entry-${i}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${waterChecked.has(i) ? "border-cyan-500 bg-cyan-500" : "border-slate-300"}`}>
                    {waterChecked.has(i) && <Check size={12} className="text-white" />}
                  </div>
                  <span className="font-medium">{entry.time}</span>
                  <span className="ml-auto text-slate-400">{entry.amount_ml} ml</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "grocery" && (
        <div className="px-5 space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-100/80 shadow-sm" data-testid="grocery-list">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <ShoppingCart size={16} className="text-green-500" />
              </div>
              <h4 className="text-base font-bold text-slate-900 font-display flex-1">Shopping List</h4>
              {groceryDbItems.filter(it => it.checked).length > 0 && (
                <span className="text-xs text-green-600 font-semibold font-body">
                  {groceryDbItems.filter(it => it.checked).length}/{groceryDbItems.length} bought
                </span>
              )}
            </div>

            {groceryDbItems.length > 0 && (
              <div className="h-1.5 w-full bg-green-50 rounded-full overflow-hidden mb-3 mt-2">
                <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-500 transition-all"
                  style={{ width: `${Math.min(100, (groceryDbItems.filter(it => it.checked).length / groceryDbItems.length) * 100)}%` }} />
              </div>
            )}

            <div className="flex gap-2 mt-3 mb-2">
              <input
                type="text"
                value={newGroceryItem}
                onChange={e => setNewGroceryItem(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddGroceryItem()}
                placeholder="Add item..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-body text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-slate-50"
                data-testid="input-new-grocery-item"
              />
              <button
                onClick={handleAddGroceryItem}
                disabled={!newGroceryItem.trim() || addingGrocery}
                className="w-9 h-9 rounded-xl bg-green-500 text-white flex items-center justify-center active:opacity-80 transition disabled:opacity-40"
                data-testid="button-add-grocery-item"
              >
                {addingGrocery ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
              </button>
            </div>

            {groceryDbItems.length === 0 ? (
              <p className="text-[13px] text-slate-400 font-body text-center py-4">Shopping list will appear when your plan loads</p>
            ) : (() => {
              const categories: Record<string, any[]> = {};
              groceryDbItems.forEach(it => {
                const cat = it.category || "Other";
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(it);
              });
              return Object.entries(categories).map(([cat, items], ci) => (
                <div key={ci} className="mb-3" data-testid={`grocery-category-${ci}`}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-display">{cat}</p>
                  <div className="space-y-1">
                    {items.map((it: any, j: number) => (
                      <div
                        key={it.id}
                        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition ${it.checked ? "bg-green-50" : "bg-slate-50"}`}
                        data-testid={`grocery-item-${ci}-${j}`}
                      >
                        <button
                          onClick={() => toggleGroceryItem(it.id, it.checked)}
                          className="flex items-center gap-2.5 flex-1 text-left text-sm font-body"
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                            it.checked ? "border-green-500 bg-green-500" : "border-slate-300"
                          }`}>
                            {it.checked && <Check size={12} className="text-white" />}
                          </div>
                          <span className={`${it.checked ? "line-through opacity-60 text-green-700" : "text-slate-700"}`}>{it.item}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteGroceryItem(it.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition flex-shrink-0"
                          data-testid={`button-delete-grocery-${ci}-${j}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>

          {pj.milestones && pj.milestones.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-100/80 shadow-sm" data-testid="milestones">
              <h4 className="text-base font-bold text-slate-900 mb-3 font-display">Milestones</h4>
              <div className="space-y-2">
                {pj.milestones.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-orange-50 rounded-xl" data-testid={`milestone-${i}`}>
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 font-display">W{m.week}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 font-display">{m.target_kg}kg target</p>
                      <p className="text-xs text-slate-500 font-body">{m.focus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {editingMeal && (
          <EditMealSheet
            meal={editingMeal}
            onClose={() => setEditingMeal(null)}
            onSave={(data) => handleSaveMealEdit(editingMeal.dayIndex, editingMeal.mealIndex, data)}
          />
        )}
        {showWorkoutComplete && (
          <WorkoutCompleteSheet
            totalCalories={currentDay?.workout?.calories_burn_est || 0}
            onClose={() => setShowWorkoutComplete(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
