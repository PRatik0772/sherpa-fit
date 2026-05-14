import { ChefHat, Flame, Loader2, RefreshCw, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useStore, authFetch } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

type GeneratedMeal = {
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
  ingredients: string[];
};

type MealPlan = {
  id: string;
  name: string;
  cuisine: string;
  calories: number;
  protein: number;
  image: string | null;
  tags: string[] | null;
};

export default function MealPlans() {
  const { user, userId, addMeal } = useStore();
  const { toast } = useToast();
  const [view, setView] = useState<'daily' | 'library'>('daily');
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedMeal[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loggedMeals, setLoggedMeals] = useState<Set<number>>(new Set());

  const [filter, setFilter] = useState("All");
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [cuisines, setCuisines] = useState<string[]>(["All"]);

  const cuisinePreference = user?.cuisinePreference || 'mixed';
  const dietType = user?.dietType || 'non-veg';
  const goal = user?.motivation || 'improve health';

  const generateDailyPlan = async () => {
    if (!userId) return;
    setGenerating(true);
    try {
      const res = await authFetch('/api/meal-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          cuisinePreference,
          dietType,
          goal,
          calorieTarget: user?.dailyCalorieTarget || 2400,
          proteinTarget: user?.proteinTarget || 160,
          carbsTarget: user?.carbsTarget || 220,
          fatTarget: user?.fatTarget || 70,
        }),
      });
      if (!res.ok) {
        throw new Error('Plan generation failed');
      }
      const data = await res.json();
      if (data.meals && Array.isArray(data.meals)) {
        setGeneratedPlan(data.meals);
        setLoggedMeals(new Set());
      }
    } catch (e) {
      console.error('Failed to generate plan:', e);
      toast({ title: "Generation Failed", description: "Please try again", duration: 2000 });
    } finally {
      setGenerating(false);
    }
  };

  const logMealFromPlan = async (meal: GeneratedMeal, index: number) => {
    try {
      await addMeal({
        name: meal.name,
        calories: Math.round(meal.calories),
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      });
      setLoggedMeals(prev => new Set(prev).add(index));
      toast({ title: "Meal Logged", description: `${meal.name} added to your diary`, duration: 2000 });
    } catch {
      toast({ title: "Error", description: "Failed to log meal", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (view === 'daily' && generatedPlan.length === 0 && userId) {
      generateDailyPlan();
    }
  }, [view, userId]);

  useEffect(() => {
    if (view !== 'library') return;
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const url = filter === "All" ? '/api/meal-plans' : `/api/meal-plans?cuisine=${filter}`;
        const res = await fetch(url);
        const data = await res.json();
        setMealPlans(data || []);
        if (filter === "All" && data?.length > 0) {
          const uniqueCuisines = Array.from(new Set((data as any[]).map((m: any) => m.cuisine))) as string[];
          setCuisines(["All", ...uniqueCuisines]);
        }
      } catch {
        setMealPlans([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [filter, view]);

  const mealTypeOrder = ['breakfast', 'morning snack', 'lunch', 'afternoon snack', 'dinner', 'evening snack', 'snack'];
  const sortedPlan = [...generatedPlan].sort((a, b) => {
    const aIdx = mealTypeOrder.indexOf(a.mealType.toLowerCase());
    const bIdx = mealTypeOrder.indexOf(b.mealType.toLowerCase());
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  const totalCals = generatedPlan.reduce((s, m) => s + m.calories, 0);
  const totalProtein = generatedPlan.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = generatedPlan.reduce((s, m) => s + m.carbs, 0);
  const totalFat = generatedPlan.reduce((s, m) => s + m.fat, 0);

  const mealTypeEmoji: Record<string, string> = {
    'breakfast': '🌅',
    'morning snack': '🍎',
    'lunch': '🍛',
    'afternoon snack': '☕',
    'dinner': '🌙',
    'evening snack': '🥛',
    'snack': '🍌',
  };

  const cuisineLabel = cuisinePreference.charAt(0).toUpperCase() + cuisinePreference.slice(1);

  return (
    <div className="p-5 pb-24 space-y-5 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Meal Plans</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {view === 'daily' ? `${cuisineLabel} cuisine • ${goal}` : 'Browse meal library'}
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
          <ChefHat size={16} className="text-gray-500" />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setView('daily')}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
            view === 'daily'
              ? "bg-[#1e3a5f] text-white"
              : "bg-gray-100 text-gray-500"
          )}
          data-testid="button-daily-plan"
        >
          <Sparkles size={14} className="inline mr-1.5" />
          Your Daily Plan
        </button>
        <button
          onClick={() => setView('library')}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
            view === 'library'
              ? "bg-[#1e3a5f] text-white"
              : "bg-gray-100 text-gray-500"
          )}
          data-testid="button-library"
        >
          Library
        </button>
      </div>

      {view === 'daily' && (
        <>
          {generating ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Sparkles className="text-[#1e3a5f]" size={28} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Creating Your Plan</h3>
              <p className="text-sm text-gray-500">
                Generating {cuisineLabel} meals for your {goal} goal...
              </p>
              <Loader2 className="text-[#1e3a5f] animate-spin mt-4" size={24} />
            </div>
          ) : generatedPlan.length > 0 ? (
            <>
              <div className="glass-card p-4 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2a4a6f] text-white">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-white/70 text-xs uppercase tracking-wider">Today's Plan</p>
                    <p className="text-2xl font-bold mt-1">{totalCals} kcal</p>
                  </div>
                  <button
                    onClick={generateDailyPlan}
                    className="p-2 rounded-full bg-white/10 active:scale-90 transition-transform"
                    data-testid="button-regenerate"
                  >
                    <RefreshCw size={16} className="text-white" />
                  </button>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-white/80">🥩 {totalProtein}g P</span>
                  <span className="text-white/80">🍞 {totalCarbs}g C</span>
                  <span className="text-white/80">🧈 {totalFat}g F</span>
                </div>
              </div>

              <div className="space-y-3">
                {sortedPlan.map((meal, i) => {
                  const isLogged = loggedMeals.has(i);
                  return (
                    <div key={i} className="glass-card p-4 rounded-2xl" data-testid={`generated-meal-${i}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{mealTypeEmoji[meal.mealType.toLowerCase()] || '🍽️'}</span>
                          <div>
                            <p className="text-[10px] text-[#1e3a5f] font-semibold uppercase tracking-wider">
                              {meal.mealType}
                            </p>
                            <h4 className="text-sm font-bold text-gray-900">{meal.name}</h4>
                          </div>
                        </div>
                        <button
                          onClick={() => logMealFromPlan(meal, i)}
                          disabled={isLogged}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95",
                            isLogged
                              ? "bg-[#8fbc8f]/20 text-[#8fbc8f]"
                              : "bg-[#c41e3a] text-white"
                          )}
                          data-testid={`button-log-meal-${i}`}
                        >
                          {isLogged ? (
                            <span className="flex items-center gap-1"><Check size={12} /> Logged</span>
                          ) : (
                            'Log This'
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{meal.description}</p>
                      <div className="flex gap-3 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Flame size={10} className="text-orange-400" /> {meal.calories} kcal
                        </span>
                        <span>P: {meal.protein}g</span>
                        <span>C: {meal.carbs}g</span>
                        <span>F: {meal.fat}g</span>
                      </div>
                      {meal.ingredients && meal.ingredients.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {meal.ingredients.slice(0, 5).map((ing, j) => (
                            <span key={j} className="text-[9px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded-full border border-gray-100">
                              {ing}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">No plan generated yet</p>
              <button
                onClick={generateDailyPlan}
                className="mt-4 px-6 py-2.5 bg-[#c41e3a] text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
                data-testid="button-generate-plan"
              >
                Generate My Plan
              </button>
            </div>
          )}
        </>
      )}

      {view === 'library' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
            {cuisines.map(cuisine => (
              <button
                key={cuisine}
                onClick={() => setFilter(cuisine)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                  filter === cuisine
                    ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                    : "bg-white text-gray-500 border-gray-200"
                )}
              >
                {cuisine}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {mealPlans.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No meal plans found</p>
              )}
              {mealPlans.map((meal) => (
                <div key={meal.id} className="glass-card p-3 rounded-2xl flex gap-4 cursor-pointer group">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 relative flex-shrink-0">
                    <img src={meal.image || ''} alt={meal.name} className="w-full h-full object-cover" />
                    <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] text-white font-bold">
                      {meal.cuisine}
                    </div>
                  </div>
                  <div className="flex-1 py-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-gray-900 font-medium text-sm leading-tight">{meal.name}</h4>
                      <div className="flex gap-2 mt-2">
                        {(meal.tags || []).map(tag => (
                          <span key={tag} className="text-[9px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-full border border-gray-100">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                          <Flame size={10} className="text-orange-500" /> {meal.calories} kcal
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                          <ChefHat size={10} className="text-gray-400" /> {meal.protein}g Prot
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
