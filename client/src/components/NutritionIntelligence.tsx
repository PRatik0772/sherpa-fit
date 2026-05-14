import { useState, useEffect } from "react";
import { Apple, Search, TrendingUp, Shield, ChevronDown, ChevronUp, Loader2, Leaf, Database, Star, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface NutritionOverview {
  foodNutritionDb: { totalFoods: number; avgCalories: string; avgNutrientDensity: string };
  openFoodFactsDb: { totalProducts: number; withGrade: number; avgEnergy: number; uniqueBrands: number };
  topCategories: { category: string; count: number }[];
  totalDataPoints: number;
}

interface GradeData {
  grade: string;
  count: number;
  avgEnergy: number;
  avgFat: string;
  avgSugar: string;
  avgProtein: string;
  avgFiber: string;
}

interface NutritionStats {
  totalFoods: number;
  avgCalories: string;
  avgProtein: string;
  avgCarbs: string;
  avgFat: string;
  avgFiber: string;
  avgNutritionDensity: string;
  highProteinCount: number;
  lowCalCount: number;
  highFiberCount: number;
  topProtein: { food: string; protein: number; calories: number }[];
  topNutrientDense: { food: string; nutritionDensity: number; calories: number }[];
  lowestCalorie: { food: string; calories: number; protein: number }[];
}

export function NutritionIntelligence() {
  const [overview, setOverview] = useState<NutritionOverview | null>(null);
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [stats, setStats] = useState<NutritionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/nutrition/overview").then(r => r.json()),
      fetch("/api/products/grades").then(r => r.json()),
      fetch("/api/nutrition/stats").then(r => r.json()),
    ]).then(([o, g, s]) => {
      setOverview(o);
      setGrades(g.grades || []);
      setStats(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const [foods, products] = await Promise.all([
        fetch(`/api/nutrition/search?q=${encodeURIComponent(searchQuery)}&limit=5`).then(r => r.json()),
        fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=5`).then(r => r.json()),
      ]);
      setSearchResults([
        ...foods.map((f: any) => ({ ...f, source: "nutrition_db" })),
        ...products.map((p: any) => ({ ...p, source: "product_db" })),
      ]);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  if (loading) {
    return (
      <div className="glass-card p-4 rounded-2xl flex items-center justify-center gap-2 py-6">
        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        <span className="text-gray-400 text-xs">Loading nutrition databases...</span>
      </div>
    );
  }

  if (!overview || !stats) return null;

  const gradeColors: Record<string, string> = {
    a: "bg-[#1e3a5f]", b: "bg-green-500", c: "bg-yellow-500", d: "bg-orange-500", e: "bg-red-500",
  };
  const totalGraded = grades.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Apple className="text-amber-400" size={16} />
          <h3 className="text-sm font-bold text-gray-900" data-testid="text-nutrition-intelligence-title">Nutrition Intelligence</h3>
          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{overview.totalDataPoints.toLocaleString()} items</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          data-testid="button-toggle-nutrition"
        >
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card p-3 rounded-xl" data-testid="card-food-db">
          <div className="flex items-center gap-1.5 mb-1">
            <Database size={12} className="text-amber-400" />
            <span className="text-[10px] text-gray-500 uppercase">Food Database</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{overview.foodNutritionDb.totalFoods.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">35 nutrients per food</p>
        </div>

        <div className="glass-card p-3 rounded-xl" data-testid="card-product-db">
          <div className="flex items-center gap-1.5 mb-1">
            <Leaf size={12} className="text-green-400" />
            <span className="text-[10px] text-gray-500 uppercase">Product Database</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{(overview.openFoodFactsDb.totalProducts / 1000).toFixed(0)}K</p>
          <p className="text-[10px] text-gray-500">{overview.openFoodFactsDb.uniqueBrands.toLocaleString()} brands</p>
        </div>

        <div className="glass-card p-3 rounded-xl" data-testid="card-high-protein">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={12} className="text-blue-400" />
            <span className="text-[10px] text-gray-500 uppercase">High Protein</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{stats.highProteinCount}</p>
          <p className="text-[10px] text-gray-500">foods &gt; 20g protein</p>
        </div>

        <div className="glass-card p-3 rounded-xl" data-testid="card-low-cal">
          <div className="flex items-center gap-1.5 mb-1">
            <Star size={12} className="text-violet-400" />
            <span className="text-[10px] text-gray-500 uppercase">Low Calorie</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{stats.lowCalCount}</p>
          <p className="text-[10px] text-gray-500">foods &lt; 100 cal</p>
        </div>
      </div>

      <div className="glass-card p-3 rounded-xl" data-testid="card-nutri-score">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-gray-500 uppercase">Nutri-Score Distribution</p>
          <span className="text-[10px] text-gray-500">{overview.openFoodFactsDb.withGrade.toLocaleString()} graded</span>
        </div>
        <div className="flex gap-1 h-6 rounded-lg overflow-hidden">
          {grades.map(g => (
            <div
              key={g.grade}
              className={cn("flex items-center justify-center transition-all", gradeColors[g.grade] || "bg-gray-300")}
              style={{ width: `${(g.count / totalGraded) * 100}%` }}
              title={`Grade ${g.grade.toUpperCase()}: ${g.count.toLocaleString()} products`}
            >
              <span className="text-[9px] font-bold text-white">{g.grade.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          {grades.map(g => (
            <div key={g.grade} className="text-center flex-1">
              <p className="text-[9px] text-gray-500">{(g.count / 1000).toFixed(1)}K</p>
            </div>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="glass-card p-3 rounded-xl" data-testid="card-food-search">
            <p className="text-[10px] text-gray-500 uppercase mb-2">Search Food Database</p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search foods or products..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-amber-500/50 focus:outline-none"
                  data-testid="input-food-search"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || searchQuery.length < 2}
                className="px-3 bg-amber-500/20 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-500/30 disabled:opacity-40"
                data-testid="button-search-food"
              >
                {searching ? <Loader2 size={12} className="animate-spin" /> : "Search"}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                {searchResults.map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-900 truncate">{item.food || item.productName}</p>
                      <div className="flex gap-2 mt-0.5">
                        {item.source === "nutrition_db" ? (
                          <>
                            <span className="text-[9px] text-amber-600">{item.caloricValue} cal</span>
                            <span className="text-[9px] text-blue-600">P{item.protein}g</span>
                            <span className="text-[9px] text-green-600">C{item.carbohydrates}g</span>
                            <span className="text-[9px] text-orange-600">F{item.fat}g</span>
                          </>
                        ) : (
                          <>
                            <span className="text-[9px] text-amber-600">{item.energy100g ? Math.round(item.energy100g / 4.184) : "?"} cal</span>
                            <span className="text-[9px] text-blue-600">P{item.proteins100g || "?"}g</span>
                            {item.nutritionGrade && (
                              <span className={cn("text-[9px] font-bold",
                                item.nutritionGrade === "a" ? "text-[#1e3a5f]" :
                                item.nutritionGrade === "b" ? "text-green-600" :
                                item.nutritionGrade === "c" ? "text-yellow-600" :
                                item.nutritionGrade === "d" ? "text-orange-600" : "text-red-600"
                              )}>Grade {item.nutritionGrade.toUpperCase()}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full",
                      item.source === "nutrition_db" ? "bg-amber-500/20 text-amber-600" : "bg-green-500/20 text-green-600"
                    )}>
                      {item.source === "nutrition_db" ? "Food DB" : "Product"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card p-3 rounded-xl" data-testid="card-top-protein">
            <p className="text-[10px] text-gray-500 uppercase mb-2">Top High-Protein Foods</p>
            <div className="space-y-1.5">
              {stats.topProtein.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-4">{i + 1}.</span>
                  <span className="text-[11px] text-gray-900 flex-1 truncate">{f.food}</span>
                  <span className="text-[10px] text-blue-600 font-medium">{f.protein}g</span>
                  <span className="text-[9px] text-gray-500">{f.calories} cal</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-3 rounded-xl" data-testid="card-nutrient-dense">
            <p className="text-[10px] text-gray-500 uppercase mb-2">Most Nutrient-Dense Foods</p>
            <div className="space-y-1.5">
              {stats.topNutrientDense.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-4">{i + 1}.</span>
                  <span className="text-[11px] text-gray-900 flex-1 truncate">{f.food}</span>
                  <span className="text-[10px] text-amber-600 font-medium">{f.nutritionDensity}</span>
                  <span className="text-[9px] text-gray-500">{f.calories} cal</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-3 rounded-xl" data-testid="card-grade-details">
            <p className="text-[10px] text-gray-500 uppercase mb-2">Nutri-Score Grade Analysis</p>
            <div className="space-y-2">
              {grades.map(g => (
                <div key={g.grade} className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white", gradeColors[g.grade])}>
                    {g.grade.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-gray-900">{g.count.toLocaleString()} products</span>
                      <span className="text-[10px] text-gray-500">Avg {Math.round(g.avgEnergy / 4.184)} cal</span>
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-[9px] text-gray-400">Fat {g.avgFat}g</span>
                      <span className="text-[9px] text-gray-400">Sugar {g.avgSugar}g</span>
                      <span className="text-[9px] text-gray-400">Protein {g.avgProtein}g</span>
                      <span className="text-[9px] text-gray-400">Fiber {g.avgFiber}g</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-3 rounded-xl" data-testid="card-top-categories">
            <p className="text-[10px] text-gray-500 uppercase mb-2">Top Product Categories</p>
            <div className="space-y-1.5">
              {overview.topCategories.slice(0, 8).map((c, i) => {
                const label = c.category.replace("en:", "").replace(/-/g, " ");
                const maxCount = overview.topCategories[0]?.count || 1;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-700 flex-1 capitalize truncate">{label}</span>
                    <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-green-500/60 to-green-400" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 w-8 text-right">{c.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-3 rounded-xl" data-testid="card-db-summary">
            <p className="text-[10px] text-gray-500 uppercase mb-2">Database Summary</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-sm font-bold text-amber-600">{overview.totalDataPoints.toLocaleString()}</p>
                <p className="text-[9px] text-gray-500">Total Items</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-green-600">{overview.openFoodFactsDb.uniqueBrands.toLocaleString()}</p>
                <p className="text-[9px] text-gray-500">Brands</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-blue-600">35</p>
                <p className="text-[9px] text-gray-500">Nutrients</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
