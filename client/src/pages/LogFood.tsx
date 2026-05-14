import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Search, Mic, Plus, Bookmark, BookmarkCheck, Loader2, X } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useStore, authFetch } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const popularFoods = [
  { name: "Peanut Butter", calories: 94, emoji: "🥜" },
  { name: "Avocado", calories: 130, emoji: "🥑" },
  { name: "Egg", calories: 74, emoji: "🥚" },
  { name: "Apples", calories: 72, emoji: "🍎" },
  { name: "Spinach", calories: 7, emoji: "🥬" },
  { name: "Bananas", calories: 105, emoji: "🍌" },
  { name: "Chicken Breast", calories: 165, emoji: "🍗" },
  { name: "Rice", calories: 206, emoji: "🍚" },
  { name: "Salmon", calories: 208, emoji: "🐟" },
  { name: "Greek Yogurt", calories: 100, emoji: "🥛" },
];

export default function LogFood({ initialTab }: { initialTab?: string }) {
  const [, setLocation] = useLocation();
  const { addMeal } = useStore();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(initialTab || "all");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  // savedNameToId: foodName → stable saved food ID (for badge lookup in search)
  const [savedFoodsMap, setSavedFoodsMap] = useState<Record<string, string>>({});
  const [savedFoodsLoading, setSavedFoodsLoading] = useState<Record<string, boolean>>({});
  // DB-backed saved foods list (for the Saved tab)
  const [savedFoodsList, setSavedFoodsList] = useState<any[]>([]);
  const [savedFoodsListLoading, setSavedFoodsListLoading] = useState(false);
  const [savedFoodsListError, setSavedFoodsListError] = useState(false);

  const loadSavedFoods = useCallback(async () => {
    setSavedFoodsListLoading(true);
    setSavedFoodsListError(false);
    try {
      const res = await authFetch("/api/saved-foods");
      if (!res.ok) throw new Error("Failed");
      const foods: any[] = await res.json();
      setSavedFoodsList(foods || []);
      // Key by stable server ID so unsave always uses the canonical ID, not a name collision
      const map: Record<string, string> = {};
      for (const f of (foods || [])) if (f.id && f.name) map[f.name] = String(f.id);
      setSavedFoodsMap(map);
    } catch {
      setSavedFoodsListError(true);
    }
    setSavedFoodsListLoading(false);
  }, []);

  useEffect(() => { loadSavedFoods(); }, [loadSavedFoods]);

  // Reload saved list when switching to saved tab
  useEffect(() => {
    if (tab === "saved") loadSavedFoods();
  }, [tab, loadSavedFoods]);

  const toggleSave = async (food: { name: string; calories: number; emoji?: string; protein?: number; carbs?: number; fat?: number }) => {
    const savedId = savedFoodsMap[food.name]; // stable server ID, or undefined
    const isSaved = !!savedId;
    setSavedFoodsLoading(prev => ({ ...prev, [food.name]: true }));
    try {
      if (isSaved) {
        const res = await authFetch(`/api/saved-foods/${savedId}`, { method: "DELETE" });
        if (res.ok) {
          setSavedFoodsMap(prev => { const n = { ...prev }; delete n[food.name]; return n; });
          setSavedFoodsList(prev => prev.filter(f => String(f.id) !== savedId));
          toast({ title: "Removed from saved", description: food.name, duration: 1500 });
        }
      } else {
        const res = await authFetch("/api/saved-foods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: food.name, calories: food.calories, protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0 }),
        });
        if (res.ok) {
          const saved = await res.json();
          const newId = String(saved.id);
          setSavedFoodsMap(prev => ({ ...prev, [food.name]: newId }));
          setSavedFoodsList(prev => [...prev, saved]);
          toast({ title: "Saved!", description: food.name, duration: 1500 });
        }
      }
    } catch {
      toast({ title: "Error", description: "Could not save food", variant: "destructive" });
    }
    setSavedFoodsLoading(prev => { const n = { ...prev }; delete n[food.name]; return n; });
  };

  const tabs = [
    { key: "all", label: "All" },
    { key: "my-foods", label: "My foods" },
    { key: "my-meals", label: "My meals" },
    { key: "saved", label: "Saved foods" },
  ];

  const doSearch = async (q: string) => {
    setSearching(true);
    setSearchError(false);
    try {
      const res = await authFetch(`/api/nutrition/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.slice(0, 15));
    } catch {
      setSearchResults([]);
      setSearchError(true);
      toast({ title: "Search failed", description: "Could not reach food database. Tap retry to try again.", variant: "destructive" });
    }
    setSearching(false);
  };

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(false);
      return;
    }
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const [loggingFoodId, setLoggingFoodId] = useState<string | null>(null);

  const handleAddFood = async (food: any) => {
    const foodId = food.id || food.name || food.food;
    if (loggingFoodId === foodId) return;
    setLoggingFoodId(foodId);
    try {
      await addMeal({
        name: food.name || food.food,
        calories: Math.round(food.calories || food.caloricValue || 0),
        protein: Math.round(food.protein || 0),
        carbs: Math.round(food.carbs || food.carbohydrates || 0),
        fat: Math.round(food.fat || 0),
        fiber: Math.round(food.fiber || 0),
        sugar: Math.round(food.sugar || 0),
        sodium: Math.round(food.sodium || 0),
      });
      toast({ title: "Food Added", description: `${food.name || food.food} logged successfully`, duration: 2000 });
      setLocation("/");
    } catch {
      toast({ title: "Error", description: "Failed to log food", variant: "destructive" });
    } finally {
      setLoggingFoodId(null);
    }
  };

  const displayFoods = query.trim() && searchResults.length > 0
    ? searchResults.map(f => ({ name: f.food, calories: Math.round(f.caloricValue), emoji: "🍽️", ...f }))
    : popularFoods;

  return (
    <div className="p-5 pb-40 space-y-4 animate-in fade-in duration-500" data-testid="log-food-page">
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation("/")} className="p-2 rounded-full bg-white text-gray-500 shadow-sm active:scale-95 transition-all" data-testid="button-back-food">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Log Food</h1>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a food..."
          className="w-full pl-11 pr-4 py-3.5 bg-white rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
          data-testid="input-food-search"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
              tab === t.key ? "bg-[#1e3a5f] text-white" : "bg-white text-gray-500 border border-gray-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "saved" ? (
        <div data-testid="saved-foods-tab">
          {savedFoodsListLoading ? (
            <div className="flex items-center justify-center gap-2 py-16" data-testid="saved-foods-loading">
              <Loader2 size={20} className="animate-spin text-gray-400" />
              <p className="text-sm text-gray-400">Loading saved foods…</p>
            </div>
          ) : savedFoodsListError ? (
            <div className="flex flex-col items-center py-12 gap-3" data-testid="saved-foods-error">
              <p className="text-sm text-red-500 text-center">Could not load saved foods.</p>
              <button
                onClick={loadSavedFoods}
                className="px-5 py-2 bg-gray-900 text-white text-sm rounded-xl font-medium active:scale-95 transition-transform"
                data-testid="button-retry-saved-foods"
              >
                Retry
              </button>
            </div>
          ) : savedFoodsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" data-testid="saved-foods-empty">
              <Bookmark size={48} className="text-gray-200 mb-4" />
              <h3 className="font-bold text-gray-900 mb-1">No saved foods</h3>
              <p className="text-sm text-gray-400 text-center mb-4">Save your favorite foods for quick access</p>
              <button
                onClick={() => setTab("all")}
                className="px-5 py-2.5 bg-[#1e3a5f] text-white text-sm rounded-xl font-medium active:scale-95 transition-transform"
                data-testid="button-go-search-for-saved"
              >
                Search for a food to save it
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-medium px-1 mb-1">{savedFoodsList.length} saved food{savedFoodsList.length !== 1 ? "s" : ""}</p>
              {savedFoodsList.map((food, i) => (
                <div
                  key={food.id ?? i}
                  className="w-full glass-card p-4 rounded-xl flex items-center gap-3 text-left"
                  data-testid={`saved-food-item-${food.id ?? i}`}
                >
                  <button onClick={() => handleAddFood(food)} disabled={loggingFoodId === (food.id || food.name)} className="flex-1 flex items-center gap-3 min-w-0 active:opacity-70 transition-opacity disabled:opacity-50">
                    {loggingFoodId === (food.id || food.name) ? <Loader2 size={18} className="animate-spin text-blue-500 flex-shrink-0" /> : <span className="text-xl">🔖</span>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{food.name}</p>
                      <p className="text-xs text-gray-400">
                        {food.calories} cal
                        {food.protein ? ` · ${food.protein}g P` : ""}
                        {food.carbs ? ` · ${food.carbs}g C` : ""}
                        {food.fat ? ` · ${food.fat}g F` : ""}
                      </p>
                    </div>
                    <Plus size={16} className="text-gray-300 flex-shrink-0" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSave(food); }}
                    disabled={!!savedFoodsLoading[food.name]}
                    className="ml-1 p-1.5 rounded-lg text-blue-500 hover:text-red-400 transition-colors disabled:opacity-40"
                    data-testid={`button-unsave-food-${food.id ?? i}`}
                    aria-label="Remove from saved"
                  >
                    {savedFoodsLoading[food.name]
                      ? <Loader2 size={15} className="animate-spin" />
                      : <X size={15} />
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {!query.trim() && <p className="text-xs text-gray-400 font-medium px-1 mb-1">Suggestions</p>}
          {query.trim() && searching && (
            <div className="flex items-center justify-center gap-2 py-8">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Searching foods…</p>
            </div>
          )}
          {query.trim() && searchError && !searching && (
            <div className="flex flex-col items-center py-8 gap-3" data-testid="search-error-state">
              <p className="text-sm text-red-500 text-center">Could not load results.</p>
              <button
                onClick={() => doSearch(query)}
                className="px-5 py-2 bg-gray-900 text-white text-sm rounded-xl font-medium active:scale-95 transition-transform"
                data-testid="button-retry-search"
              >
                Retry
              </button>
            </div>
          )}
          {displayFoods.map((food, i) => (
            <div
              key={i}
              className="w-full glass-card p-4 rounded-xl flex items-center gap-3 text-left"
              data-testid={`food-item-${i}`}
            >
              <button onClick={() => handleAddFood(food)} disabled={loggingFoodId === (food.id || food.name)} className="flex-1 flex items-center gap-3 min-w-0 active:opacity-70 transition-opacity disabled:opacity-50">
                {loggingFoodId === (food.id || food.name) ? <Loader2 size={18} className="animate-spin text-blue-500 flex-shrink-0" /> : <span className="text-xl">{food.emoji}</span>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{food.name}</p>
                </div>
                <span className="text-sm text-gray-400 font-medium">{food.calories} cal</span>
                <Plus size={16} className="text-gray-300" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleSave(food); }}
                disabled={!!savedFoodsLoading[food.name]}
                className="ml-1 p-1.5 rounded-lg text-gray-300 hover:text-blue-500 transition-colors disabled:opacity-40"
                data-testid={`button-save-food-${i}`}
                aria-label={savedFoodsMap[food.name] ? "Remove from saved" : "Save food"}
              >
                {savedFoodsMap[food.name]
                  ? <BookmarkCheck size={16} className="text-blue-500" />
                  : <Bookmark size={16} />
                }
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="fixed bottom-24 left-0 right-0 px-5">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            onClick={() => setLocation("/scan")}
            className="flex-1 py-3.5 bg-[#1e3a5f] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            data-testid="button-manual-add"
          >
            <Plus size={16} />
            Manual Add
          </button>
          <button
            onClick={() => setLocation("/dashboard/log?voice=1")}
            className="flex-1 py-3.5 bg-white text-gray-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-gray-200 active:scale-95 transition-transform"
            data-testid="button-voice-log"
          >
            <Mic size={16} />
            Voice Log
          </button>
        </div>
      </div>
    </div>
  );
}
