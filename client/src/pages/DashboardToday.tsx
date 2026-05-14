import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { useStore, authFetch } from "@/lib/store";
import { Link } from "wouter";
import { Flame, Droplets, Dumbbell, ChevronRight, Clock, Utensils, X, Send, MessageCircle, Trash2, Scale } from "lucide-react";
import { triggerHaptic } from "@/lib/capacitor";
import { Drawer } from "vaul";
import { useToast } from "@/hooks/use-toast";

const MACRO_ADVICE: Record<string, { title: string; emoji: string; tips: string[] }> = {
  protein: {
    title: "Protein Target Hit!",
    emoji: "🍖",
    tips: [
      "Skip extra protein snacks tonight",
      "Stay hydrated — protein needs water",
    ],
  },
  carbs: {
    title: "Carbs Target Hit!",
    emoji: "🌾",
    tips: [
      "Stick to low-carb sides for remaining meals",
      "A 15-min walk helps regulate blood sugar",
    ],
  },
  fat: {
    title: "Fat Target Hit!",
    emoji: "🫒",
    tips: [
      "Go lean for dinner — chicken, fish, or tofu",
      "Avoid fried snacks tonight",
    ],
  },
  calories: {
    title: "Calorie Target Reached!",
    emoji: "🔥",
    tips: [
      "Don't eat more unless truly hungry",
      "A light walk helps with digestion",
    ],
  },
  water: {
    title: "Hydration Goal Complete!",
    emoji: "💧",
    tips: [
      "Avoid extra caffeine late in the day",
      "Spread intake evenly tomorrow",
    ],
  },
};

function CalorieArc({ consumed, target, size = 120 }: { consumed: number; target: number; size?: number }) {
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 300); return () => clearTimeout(t); }, []);
  const progress = Math.min(consumed / (target || 1), 1);
  const sw = 10;
  const r = (size - sw) / 2;
  const startAngle = 135;
  const totalAngle = 270;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const cx = size / 2;
  const cy = size / 2;
  const endAngle = startAngle + totalAngle;

  const describeArc = (start: number, end: number) => {
    const s = toRad(start);
    const e = toRad(end);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const arcEnd = startAngle + totalAngle * (anim ? progress : 0);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <path d={describeArc(startAngle, endAngle)} fill="none" stroke="#f0f0f0" strokeWidth={sw} strokeLinecap="round" />
        {progress > 0 && (
          <path d={describeArc(startAngle, arcEnd)} fill="none" stroke="#1a1a1a" strokeWidth={sw} strokeLinecap="round"
            style={{ transition: "d 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Flame size={22} className="text-slate-800" />
      </div>
    </div>
  );
}

function MacroCard({ emoji, value, target, label, color, ringColor, onClick }: {
  emoji: string; value: number; target: number; label: string; color: string; ringColor: string; onClick?: () => void;
}) {
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 400); return () => clearTimeout(t); }, []);
  const progress = Math.min(value / (target || 1), 1);
  const size = 56;
  const sw = 4;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (anim ? progress : 0) * c;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/60 active:scale-[0.97] transition-transform cursor-pointer"
      onClick={() => { triggerHaptic('light'); onClick?.(); }}
      data-testid={`macro-card-${label.toLowerCase().split(' ')[0]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-bold text-slate-900 font-display">{value}<span className="text-slate-400 text-sm font-normal">/{target}g</span></p>
          <p className="text-[12px] text-slate-400 font-body">{label}</p>
        </div>
      </div>
      <div className="flex justify-center mt-2">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${ringColor}18`} strokeWidth={sw} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeWidth={sw}
              strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg">{emoji}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EatenLeftToggle({ showEaten, onToggle }: { showEaten: boolean; onToggle: () => void }) {
  return (
    <button onClick={() => { triggerHaptic('selection'); onToggle(); }}
      className="flex items-center bg-slate-100 rounded-full p-0.5 relative" data-testid="toggle-eaten-left">
      <div className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 font-body ${
        !showEaten ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
      }`}>Left</div>
      <div className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 font-body ${
        showEaten ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
      }`}>Eaten</div>
    </button>
  );
}

function DateStrip({ selectedDate, onSelect, weekHistory, workoutLogs }: { 
  selectedDate: Date; 
  onSelect: (d: Date) => void;
  weekHistory?: any[];
  workoutLogs?: any[];
}) {
  const dates = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      result.push(d);
    }
    return result;
  }, []);

  const activeDates = useMemo(() => {
    const set = new Set<string>();
    (weekHistory || []).forEach((d: any) => {
      if (d.date) set.add(d.date);
    });
    (workoutLogs || []).forEach((w: any) => {
      if (w.loggedAt) {
        set.add(new Date(w.loggedAt).toISOString().split('T')[0]);
      }
    });
    return set;
  }, [weekHistory, workoutLogs]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isSelected = (d: Date) => d.toDateString() === selectedDate.toDateString();

  return (
    <div className="flex items-center justify-between px-1" data-testid="date-strip">
      {dates.map((d, i) => {
        const selected = isSelected(d);
        const today = isToday(d);
        const dateStr = d.toISOString().split('T')[0];
        const hasActivity = activeDates.has(dateStr);
        const nowDate = new Date();
        nowDate.setHours(0, 0, 0, 0);
        const dNorm = new Date(d);
        dNorm.setHours(0, 0, 0, 0);
        const isPast = dNorm < nowDate && !today;
        const borderClass = isPast
          ? hasActivity 
            ? "ring-2 ring-emerald-400" 
            : "ring-2 ring-red-300"
          : "";
        return (
          <button key={i} onClick={() => { triggerHaptic('selection'); onSelect(d); }}
            className="flex flex-col items-center gap-1 py-1 min-w-[40px]"
            data-testid={`date-${d.getDate()}`}>
            <span className={`text-[11px] font-medium font-body ${selected ? "text-slate-900" : "text-slate-400"}`}>
              {dayNames[d.getDay()]}
            </span>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-semibold font-display transition-all ${
              selected ? "bg-slate-900 text-white" : today ? "ring-2 ring-slate-300 text-slate-900" : `text-slate-500 ${borderClass}`
            }`}>
              {d.getDate()}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MealDetailSheet({ meal, open, onClose, onMealUpdated, onDelete }: { meal: any; open: boolean; onClose: () => void; onMealUpdated?: (updated: any) => void; onDelete?: (id: string) => void }) {
  const [editingIngredients, setEditingIngredients] = useState(false);
  const [ingredients, setIngredients] = useState("");
  const [recalculating, setRecalculating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localMeal, setLocalMeal] = useState<any>(null);

  useEffect(() => {
    if (meal) {
      setIngredients(meal.ingredients || "");
      setLocalMeal({ ...meal });
      setEditingIngredients(false);
      setConfirmDelete(false);
    }
  }, [meal]);

  const recalculateMacros = async () => {
    if (!ingredients.trim() || !localMeal?.id || recalculating) return;
    triggerHaptic('medium');
    setRecalculating(true);
    try {
      const res = await authFetch(`/api/meals/${localMeal.id}/recalculate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: ingredients.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLocalMeal({
          ...localMeal,
          name: updated.name || localMeal.name,
          calories: updated.calories,
          protein: updated.protein,
          carbs: updated.carbs,
          fat: updated.fat,
          fiber: updated.fiber || 0,
          sugar: updated.sugar || 0,
          sodium: updated.sodium || 0,
          ingredients: updated.ingredients || ingredients,
        });
        setIngredients(updated.ingredients || ingredients);
        setEditingIngredients(false);
        triggerHaptic('success');
        onMealUpdated?.(updated);
      }
    } catch {
      triggerHaptic('error');
    } finally {
      setRecalculating(false);
    }
  };

  if (!localMeal) return null;
  const m = localMeal;

  return (
    <Drawer.Root open={open} onOpenChange={v => !v && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
        <Drawer.Content className="bg-white flex flex-col rounded-t-[24px] max-h-[85vh] fixed bottom-0 left-0 right-0 z-[101] border-t border-gray-200 shadow-2xl">
          <div className="p-5 bg-white rounded-t-[24px] flex-1 overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-5" />
            <div className="flex gap-4 mb-5">
              {m.image && (
                <img src={m.image} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" alt={m.name} />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-slate-900 font-display" data-testid="meal-detail-name">{m.name}</h2>
                <p className="text-[13px] text-slate-400 font-body mt-0.5">{m.time}</p>
              </div>
            </div>
            <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider mb-2 font-body">Nutrition</p>
            <div className="grid grid-cols-4 gap-2 mb-3" data-testid="meal-detail-macros">
              <MacroBox label="Calories" value={m.calories} unit="kcal" color="text-slate-900" />
              <MacroBox label="Protein" value={m.protein} unit="g" color="text-red-500" />
              <MacroBox label="Carbs" value={m.carbs} unit="g" color="text-orange-500" />
              <MacroBox label="Fat" value={m.fat} unit="g" color="text-yellow-600" />
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              <MacroBox label="Fiber" value={m.fiber || 0} unit="g" color="text-green-600" />
              <MacroBox label="Sugar" value={m.sugar || 0} unit="g" color="text-pink-500" />
              <MacroBox label="Sodium" value={m.sodium || 0} unit="mg" color="text-purple-500" />
            </div>

            <div className="mb-5" data-testid="meal-ingredients-section">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider font-body">Ingredients</p>
                <button onClick={() => { triggerHaptic('light'); setEditingIngredients(!editingIngredients); }}
                  className="text-[12px] text-blue-600 font-medium font-body" data-testid="button-edit-meal-ingredients">
                  {editingIngredients ? "Cancel" : "Edit"}
                </button>
              </div>
              {editingIngredients ? (
                <>
                  <textarea value={ingredients} onChange={e => setIngredients(e.target.value)} rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-body resize-none"
                    placeholder="e.g. 3 boiled eggs, 1 cup rice, 200g chicken breast, 1 cucumber" data-testid="input-meal-ingredients" />
                  <p className="text-[11px] text-slate-400 mt-1.5 mb-2 font-body">Change ingredients and tap Recalculate — AI will update all macros</p>
                  <button onClick={recalculateMacros} disabled={recalculating || !ingredients.trim()}
                    className={`w-full py-3 rounded-xl font-semibold text-[14px] transition-all font-display ${
                      recalculating ? "bg-blue-100 text-blue-400" : "bg-blue-600 text-white active:bg-blue-700"
                    }`} data-testid="button-recalculate-macros">
                    {recalculating ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        Recalculating...
                      </span>
                    ) : "Recalculate Macros"}
                  </button>
                </>
              ) : (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[13px] text-slate-600 font-body leading-relaxed">{ingredients || "No ingredients recorded — tap Edit to add"}</p>
                </div>
              )}
            </div>

            {onDelete && m.id && (
              <div className="mb-3">
                {confirmDelete ? (
                  <div className="flex gap-2">
                    <button onClick={() => { triggerHaptic('error'); onDelete(m.id); onClose(); }}
                      className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold text-[14px] active:opacity-80 transition font-display"
                      data-testid="button-confirm-delete-meal">
                      Delete
                    </button>
                    <button onClick={() => { triggerHaptic('light'); setConfirmDelete(false); }}
                      className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold text-[14px] active:opacity-80 transition font-display"
                      data-testid="button-cancel-delete-meal">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { triggerHaptic('light'); setConfirmDelete(true); }}
                    className="w-full py-3 rounded-2xl bg-red-50 text-red-500 font-semibold text-[14px] active:opacity-80 transition font-display border border-red-100"
                    data-testid="button-delete-meal">
                    Delete Entry
                  </button>
                )}
              </div>
            )}
            <button onClick={() => { triggerHaptic('light'); onClose(); }}
              className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-[15px] active:opacity-80 transition font-display"
              data-testid="button-close-meal-detail">
              Close
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function MacroBox({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
      <p className="text-[10px] text-slate-400 mb-1 font-body">{label}</p>
      <p className={`text-lg font-bold ${color} font-display`}>{value}<span className="text-[10px] text-slate-400 font-normal ml-0.5">{unit}</span></p>
    </div>
  );
}

function MacroDetailSheet({ macro, meals, weekHistory, open, onClose }: {
  macro: { name: string; emoji: string; key: string; color: string; ringColor: string; eaten: number; target: number; unit: string } | null;
  meals: any[];
  weekHistory: any[];
  open: boolean;
  onClose: () => void;
}) {
  if (!macro) return null;

  const left = Math.max(macro.target - macro.eaten, 0);
  const progress = Math.min(macro.eaten / (macro.target || 1), 1);
  const overTarget = macro.eaten > macro.target;

  const mealBreakdown = meals.filter((m: any) => (m[macro.key] || 0) > 0).map((m: any) => ({
    name: m.name,
    value: m[macro.key] || 0,
    time: m.time,
    image: m.image,
  }));

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const historyData = (weekHistory || []).slice(-7).map((d: any) => {
    const dayKey = `total${macro.key.charAt(0).toUpperCase() + macro.key.slice(1)}`;
    return {
      day: new Date(d.date).getDay(),
      value: d[dayKey] || 0,
      date: d.date,
    };
  });
  const maxHistVal = Math.max(...historyData.map(h => h.value), 1);

  return (
    <Drawer.Root open={open} onOpenChange={v => !v && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
        <Drawer.Content className="bg-white flex flex-col rounded-t-[24px] max-h-[85vh] fixed bottom-0 left-0 right-0 z-[101] border-t border-gray-200 shadow-2xl">
          <div className="p-5 bg-white rounded-t-[24px] flex-1 overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-4" />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{macro.emoji}</span>
                <h2 className="text-xl font-bold text-slate-900 font-display">{macro.name}</h2>
              </div>
              <button onClick={() => { triggerHaptic('light'); onClose(); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[32px] font-bold font-display leading-none" style={{ color: macro.ringColor }}>{macro.eaten}{macro.unit}</p>
                  <p className="text-[13px] text-slate-400 mt-1 font-body">eaten today</p>
                </div>
                <div className="text-right">
                  <p className={`text-[24px] font-bold font-display leading-none ${overTarget ? "text-red-500" : "text-slate-400"}`}>
                    {overTarget ? `+${macro.eaten - macro.target}` : left}{macro.unit}
                  </p>
                  <p className="text-[13px] text-slate-400 mt-1 font-body">{overTarget ? "over target" : "left"}</p>
                </div>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(progress * 100, 100)}%`, backgroundColor: macro.ringColor }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[11px] text-slate-400 font-body">0{macro.unit}</span>
                <span className="text-[11px] text-slate-400 font-body">{macro.target}{macro.unit}</span>
              </div>
            </div>

            {mealBreakdown.length > 0 && (
              <div className="mb-5">
                <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider mb-3 font-body">Breakdown</p>
                <div className="space-y-2">
                  {mealBreakdown.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100" data-testid={`macro-food-${i}`}>
                      {item.image ? (
                        <img src={item.image} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt={item.name} />
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${macro.ringColor}15` }}>
                          <span className="text-lg">{macro.emoji}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-slate-900 font-display truncate">{item.name}</p>
                        <p className="text-[12px] text-slate-400 font-body">{item.time}</p>
                      </div>
                      <span className="text-[15px] font-bold font-display" style={{ color: macro.ringColor }}>
                        {item.value}{macro.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mealBreakdown.length === 0 && (
              <div className="mb-5 p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <p className="text-slate-400 text-sm font-body">No {macro.name.toLowerCase()} logged yet today</p>
              </div>
            )}

            <div className="mb-4">
              <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider mb-3 font-body">Week</p>
              {historyData.length > 0 ? (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-end justify-between gap-1 h-24">
                    {historyData.map((h, i) => {
                      const barH = Math.max((h.value / maxHistVal) * 80, 4);
                      const isToday = i === historyData.length - 1;
                      return (
                        <div key={i} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-[9px] text-slate-400 font-body">{h.value > 0 ? h.value : ""}</span>
                          <div className="w-full max-w-[24px] rounded-t-md transition-all duration-500"
                            style={{ height: barH, backgroundColor: isToday ? macro.ringColor : `${macro.ringColor}40` }} />
                          <span className="text-[10px] text-slate-400 font-body">{dayNames[h.day]?.slice(0, 2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center">
                  <p className="text-[13px] text-slate-400 font-body">Log a few more days to see history</p>
                </div>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function WaterBottleWidget({ water, target, onAdd, onRemove }: { water: number; target: number; onAdd?: () => void; onRemove?: () => void }) {
  const [animating, setAnimating] = useState(false);
  const fillPercent = Math.min((water / (target || 1)) * 100, 100);
  const glasses = Math.floor(water / 250);
  const liters = (water / 1000).toFixed(1);
  const targetLiters = (target / 1000).toFixed(1);

  const handleAdd = () => {
    if (!onAdd) return;
    triggerHaptic('medium');
    setAnimating(true);
    onAdd();
    setTimeout(() => setAnimating(false), 600);
  };

  const handleRemove = () => {
    if (water <= 0 || !onRemove) return;
    triggerHaptic('light');
    onRemove();
  };

  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl p-5 border border-slate-100/60" data-testid="water-bottle-widget">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets size={18} className="text-blue-500" />
          <h3 className="text-[15px] font-bold text-slate-900 font-display">Hydration</h3>
        </div>
        <span className="text-[12px] text-slate-400 font-body">{glasses} glasses</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0" style={{ width: 56, height: 100 }}>
          <svg viewBox="0 0 56 100" width={56} height={100}>
            <defs>
              <clipPath id="bottleClip">
                <path d="M18 8 Q18 0 28 0 Q38 0 38 8 L38 15 Q46 18 46 28 L44 90 Q44 98 36 98 L20 98 Q12 98 12 90 L10 28 Q10 18 18 15 Z" />
              </clipPath>
              <linearGradient id="waterGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            </defs>
            <path d="M18 8 Q18 0 28 0 Q38 0 38 8 L38 15 Q46 18 46 28 L44 90 Q44 98 36 98 L20 98 Q12 98 12 90 L10 28 Q10 18 18 15 Z"
              fill="none" stroke="#e2e8f0" strokeWidth="2" />
            <g clipPath="url(#bottleClip)">
              <rect x="0" y={100 - fillPercent} width="56" height={fillPercent} fill="url(#waterGrad)"
                className={animating ? "transition-all duration-500 ease-out" : "transition-all duration-300"}>
                {animating && (
                  <animate attributeName="y" from={100 - fillPercent + 3} to={100 - fillPercent} dur="0.5s" />
                )}
              </rect>
              {fillPercent > 5 && (
                <ellipse cx="28" cy={100 - fillPercent} rx="26" ry="3" fill="#93c5fd" opacity="0.5">
                  {animating && (
                    <animate attributeName="ry" values="3;5;3" dur="0.6s" />
                  )}
                </ellipse>
              )}
            </g>
          </svg>
        </div>

        <div className="flex-1">
          <p className="text-[28px] font-bold text-slate-900 leading-none font-display" data-testid="text-water-amount">{liters}L</p>
          <p className="text-[12px] text-slate-400 mt-0.5 font-body">of {targetLiters}L target</p>

          <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${fillPercent}%` }} />
          </div>

          {(onAdd || onRemove) && (
            <div className="flex items-center gap-2 mt-3">
              <button onClick={handleRemove} disabled={water <= 0 || !onRemove}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                  water > 0 && onRemove ? "bg-slate-100 text-slate-600 active:bg-slate-200" : "bg-slate-50 text-slate-300"
                }`} data-testid="button-water-minus">
                −
              </button>
              <span className="text-[11px] text-slate-400 font-body">250ml</span>
              <button onClick={handleAdd} disabled={!onAdd}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                  animating ? "bg-blue-600 text-white scale-110" : "bg-blue-500 text-white active:bg-blue-600"
                }`} data-testid="button-water-plus">
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type JungMessage = { id: string; role: "user" | "jung"; content: string };

function formatJungResponse(text: string) {
  const lines = text.split('\n').filter(l => l.trim());
  const elements: ReactNode[] = [];
  let i = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      elements.push(<h4 key={i} className="text-[14px] font-bold text-slate-900 font-display mt-2 first:mt-0">{trimmed.replace(/\*\*/g, '')}</h4>);
    } else if (trimmed.match(/^[-•]\s/)) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
          <span className="text-[13px] text-slate-700 font-body leading-relaxed">{trimmed.replace(/^[-•]\s*/, '')}</span>
        </div>
      );
    } else if (trimmed.match(/^\d+\.\s/)) {
      const num = trimmed.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex items-start gap-2.5 ml-0.5">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{num}</span>
          <span className="text-[13px] text-slate-700 font-body leading-relaxed">{trimmed.replace(/^\d+\.\s*/, '')}</span>
        </div>
      );
    } else if (trimmed.startsWith('💡')) {
      elements.push(
        <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-1">
          <p className="text-[12px] text-amber-800 font-medium font-body">{trimmed}</p>
        </div>
      );
    } else {
      elements.push(<p key={i} className="text-[13px] text-slate-700 font-body leading-relaxed">{trimmed}</p>);
    }
    i++;
  }
  return elements;
}

function JungChatDrawer({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string | null }) {
  const [messages, setMessages] = useState<JungMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "jung",
        content: "Ask me anything — what to eat, how to hit your deficit, or tweak your plan.",
      }]);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const sendMessage = async (directText?: string) => {
    const text = (directText || input).trim();
    if (!text || !userId || sending) return;
    setInput("");
    setSending(true);
    triggerHaptic('light');

    const userMsg: JungMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);

    try {
      const historyForContext = messages.filter(m => m.id !== "welcome").slice(-10);
      const res = await authFetch("/api/jung/quick-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: historyForContext,
        }),
      });
      const data = await res.json();
      const jungMsg: JungMessage = {
        id: `j-${Date.now()}`,
        role: "jung",
        content: data.reply || "I'm having trouble thinking right now. Try again?",
      };
      setMessages(prev => [...prev, jungMsg]);

      if (data.insight) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `insight-${Date.now()}`,
            role: "jung",
            content: `💡 ${data.insight}`,
          }]);
        }, 800);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: "jung",
        content: "Sorry, I couldn't connect right now. Try again in a moment.",
      }]);
    } finally {
      setSending(false);
    }
  };

  const quickActions = [
    { label: "What should I eat?", icon: "🍽️" },
    { label: "Am I in deficit?", icon: "📊" },
    { label: "Suggest a workout", icon: "💪" },
    { label: "Meal prep ideas", icon: "🥗" },
  ];

  return (
    <Drawer.Root open={open} onOpenChange={v => !v && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[100]" />
        <Drawer.Content className="bg-gradient-to-b from-slate-50 to-white flex flex-col rounded-t-[28px] h-[85vh] fixed bottom-0 left-0 right-0 z-[101] shadow-2xl">
          <div className="rounded-t-[28px] flex flex-col h-full">
            <div className="mx-auto w-10 h-1 flex-shrink-0 rounded-full bg-slate-200 mt-3 mb-1" />

            <div className="px-5 pt-2 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                      <Utensils size={20} className="text-white" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-slate-900 font-display">Jung</h3>
                    <p className="text-[11px] text-emerald-500 font-semibold font-body tracking-wide">AI FITNESS COACH</p>
                  </div>
                </div>
                <button onClick={() => { triggerHaptic('light'); onClose(); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200 transition" data-testid="button-close-jung">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4 space-y-4" data-testid="jung-chat-messages">
              {messages.map(msg => (
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end" data-testid={`jung-msg-${msg.id}`}>
                    <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] text-[13px] font-body leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="space-y-1" data-testid={`jung-msg-${msg.id}`}>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/80">
                      <div className="space-y-1.5">
                        {formatJungResponse(msg.content)}
                      </div>
                    </div>
                  </div>
                )
              ))}

              {sending && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/80">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Utensils size={14} className="text-white animate-pulse" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="h-2.5 bg-slate-100 rounded-full w-3/4 animate-pulse" />
                      <div className="h-2.5 bg-slate-50 rounded-full w-1/2 animate-pulse" style={{ animationDelay: "200ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {messages.length <= 1 && !sending && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {quickActions.map((action, i) => (
                    <button key={i} onClick={() => { triggerHaptic('light'); sendMessage(action.label); }}
                      className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm active:scale-[0.97] transition-all text-left group"
                      data-testid={`jung-quick-${i}`}>
                      <span className="text-xl mb-1.5 block">{action.icon}</span>
                      <span className="text-[12px] font-semibold text-slate-700 font-display group-active:text-emerald-700">{action.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 pb-4 bg-white/80 backdrop-blur-lg border-t border-slate-100/50 safe-pad-bottom">
              <div className="flex items-center gap-2">
                <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Ask Jung anything..."
                  className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 text-[14px] outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-body"
                  disabled={sending} data-testid="input-jung-message" />
                <button onClick={() => { triggerHaptic('medium'); sendMessage(); }} disabled={!input.trim() || sending}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                    input.trim() && !sending
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200/50"
                      : "bg-slate-100 text-slate-300"
                  }`} data-testid="button-send-jung">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function DeficitProgressCard({ currentWeight, targetWeight, dailyCalTarget, caloriesEaten, caloriesBurned, weekHistory }: {
  currentWeight: number; targetWeight: number; dailyCalTarget: number; caloriesEaten: number; caloriesBurned: number;
  weekHistory: { date: string; totalCalories: number }[];
}) {
  const KCAL_PER_KG = 7700;
  const isGaining = targetWeight > currentWeight;
  const weightDiff = Math.abs(currentWeight - targetWeight);
  const netCalories = caloriesEaten - caloriesBurned;
  const gapLabel = isGaining ? "surplus" : "deficit";

  const todayGap = isGaining
    ? Math.max(netCalories - dailyCalTarget, 0)
    : Math.max(dailyCalTarget - netCalories, 0);
  const fatGramsToday = Math.round((todayGap / KCAL_PER_KG) * 1000);

  const todayStr = new Date().toISOString().split('T')[0];
  const pastDays = weekHistory.filter(d => d.date !== todayStr);
  const pastCalEaten = pastDays.reduce((s, d) => s + d.totalCalories, 0);
  const totalCalThisWeek = pastCalEaten + caloriesEaten;
  const daysTracked = pastDays.length + 1;
  const weeklyTargetCal = dailyCalTarget * daysTracked;
  const weeklyGap = isGaining
    ? Math.max(totalCalThisWeek - weeklyTargetCal, 0)
    : Math.max(weeklyTargetCal - totalCalThisWeek, 0);
  const weeklyFatKg = weeklyGap / KCAL_PER_KG;

  const safeRate = 0.5;
  const dailyGapTarget = Math.round((safeRate * KCAL_PER_KG) / 7);
  const dailyProgress = Math.min(todayGap / (dailyGapTarget || 1), 1);
  const etaWeeks = safeRate > 0 ? Math.ceil(weightDiff / safeRate) : 0;

  if (weightDiff < 0.5) return null;

  return (
    <div className="mx-4 mt-3" data-testid="deficit-progress-card">
      <div className="bg-white rounded-2xl p-4 border border-slate-100/80 shadow-sm">

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
              <Flame size={15} className="text-white" />
            </div>
            <span className="text-[15px] font-bold font-display text-slate-900">
              Fat {isGaining ? "Gain" : "Burn"} Tracker
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-body bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
            {weightDiff.toFixed(1)}kg to go
          </span>
        </div>

        <div className="mb-3">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-[11px] text-slate-400 font-body mb-0.5">Today's {gapLabel}</p>
              <p className="text-[26px] font-bold font-display text-slate-900 leading-none">
                {todayGap} <span className="text-[13px] text-slate-400 font-normal font-body">kcal</span>
              </p>
            </div>
            <p className="text-[12px] font-semibold text-orange-500 font-display pb-0.5">
              ≈ {fatGramsToday}g fat {isGaining ? "gained" : "burned"}
            </p>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(dailyProgress * 100, 100)}%` }} />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-slate-400 font-body">0</span>
            <span className="text-[10px] text-slate-400 font-body">Goal: {dailyGapTarget} kcal/day</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <div className="flex-1 text-center">
            <p className="text-[10px] text-slate-400 font-body mb-0.5">This week</p>
            <p className="text-[15px] font-bold font-display text-blue-600">
              {weeklyFatKg.toFixed(2)}<span className="text-[10px] font-normal text-slate-400"> kg</span>
            </p>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div className="flex-1 text-center">
            <p className="text-[10px] text-slate-400 font-body mb-0.5">Safe rate</p>
            <p className="text-[15px] font-bold font-display text-blue-600">
              {safeRate}<span className="text-[10px] font-normal text-slate-400"> kg/wk</span>
            </p>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div className="flex-1 text-center">
            <p className="text-[10px] text-slate-400 font-body mb-0.5">ETA</p>
            <p className="text-[15px] font-bold font-display text-blue-600">
              {etaWeeks > 0 ? etaWeeks : "—"}<span className="text-[10px] font-normal text-slate-400">{etaWeeks > 0 ? " wks" : ""}</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function DashboardToday() {
  const store = useStore();
  const { toast } = useToast();
  const [plan, setPlan] = useState<any>(null);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [planDayIndex, setPlanDayIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [mealDetailOpen, setMealDetailOpen] = useState(false);
  const [selectedMacro, setSelectedMacro] = useState<any>(null);
  const [macroDetailOpen, setMacroDetailOpen] = useState(false);
  const [jungOpen, setJungOpen] = useState(false);
  const [showEaten, setShowEaten] = useState(false);
  const [smartInsights, setSmartInsights] = useState<any[]>([]);
  const [dateMeals, setDateMeals] = useState<any[]>([]);
  const [dateWater, setDateWater] = useState(0);
  const [dateLoading, setDateLoading] = useState(false);
  const completedMacrosRef = useRef<Set<string>>(new Set<string>());
  const [weightInput, setWeightInput] = useState("");
  const [weightLogging, setWeightLogging] = useState(false);
  const [weightLoggedToday, setWeightLoggedToday] = useState<number | null>(null);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [dashLoadError, setDashLoadError] = useState(false);
  const [dashLoading, setDashLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!store.userId) return;
    setDashLoading(true);
    setDashLoadError(false);
    try {
      // reloadAll propagates errors from loaders (meals throws on non-ok)
      await store.reloadAll();
    } catch {
      setDashLoadError(true);
    }
    setDashLoading(false);
  }, [store.userId, store.reloadAll]);

  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`sherpa_dismissed_macros_${today}`);
      if (saved) {
        const keys = JSON.parse(saved) as string[];
        keys.forEach(k => completedMacrosRef.current.add(k));
      }
    } catch {}
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const fetchTodayWeight = async () => {
      try {
        const res = await authFetch("/api/weight-logs?days=1");
        if (res.ok) {
          const logs = await res.json();
          const today = new Date().toISOString().split("T")[0];
          const todayLog = logs.find((l: any) => l.date === today);
          if (todayLog) setWeightLoggedToday(todayLog.weightKg);
        }
      } catch {}
    };
    fetchTodayWeight();
  }, []);

  const logTodayWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w < 20 || w > 300) return;
    setWeightLogging(true);
    try {
      const res = await authFetch("/api/weight-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: w }),
      });
      if (res.ok) {
        setWeightLoggedToday(w);
        setWeightInput("");
        setShowWeightInput(false);
        triggerHaptic("success");
        toast({ title: "Weight logged", description: `${w} kg recorded for today`, duration: 2000 });
      }
    } catch {
      toast({ title: "Error", description: "Could not save weight", variant: "destructive" });
    }
    setWeightLogging(false);
  };

  const loadPlan = useCallback(async () => {
    if (!store.userId) return;
    try {
      const res = await authFetch(`/api/plan/latest/${store.userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === "ready" && data.planJson) {
          setPlan(data.planJson);
          const tl = data.planJson.timeline || [];
          const dayIndex = new Date().getDay() % (tl.length || 1);
          setPlanDayIndex(dayIndex);
          const today = tl[dayIndex];
          if (today) {
            setTodayWorkout(today.workout);
            setTodayMeals(today.meals || []);
          }
        }
      }
    } catch {}
  }, [store.userId]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  const dateAbortRef = useRef<AbortController | null>(null);

  const loadDateData = useCallback(async (date: Date) => {
    if (!store.userId) return;
    const dateStr = date.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    if (dateAbortRef.current) dateAbortRef.current.abort();

    if (dateStr === todayStr) {
      setDateMeals([]);
      setDateWater(0);
      setDateLoading(false);
      return;
    }

    const controller = new AbortController();
    dateAbortRef.current = controller;
    setDateLoading(true);
    try {
      const [mealsRes, waterRes] = await Promise.all([
        authFetch(`/api/meals/${store.userId}?date=${dateStr}`),
        authFetch(`/api/water/today/${store.userId}?date=${dateStr}`),
      ]);

      if (controller.signal.aborted) return;

      if (mealsRes.ok) {
        const mealsData = await mealsRes.json();
        setDateMeals((mealsData || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          fiber: m.fiber || 0,
          sugar: m.sugar || 0,
          sodium: m.sodium || 0,
          image: m.image,
          ingredients: m.ingredients || '',
          time: m.loggedAt ? new Date(m.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        })));
      }

      if (waterRes.ok) {
        const waterData = await waterRes.json();
        setDateWater(waterData.total || 0);
      }
    } catch {
      if (!controller.signal.aborted) {
        setDateMeals([]);
        setDateWater(0);
      }
    }
    if (!controller.signal.aborted) setDateLoading(false);
  }, [store.userId]);

  useEffect(() => { loadDateData(selectedDate); }, [selectedDate, loadDateData]);

  const fetchInsights = useCallback(async () => {
    if (!store.userId) return;
    try {
      await authFetch('/api/insights/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: store.userId }) });
      const res = await authFetch(`/api/insights/${store.userId}?dismissed=false`);
      if (res.ok) {
        const data = await res.json();
        setSmartInsights(data.slice(0, 3));
      }
    } catch {}
  }, [store.userId]);

  useEffect(() => {
    fetchInsights();
  }, [store.meals.length, fetchInsights]);

  const dismissInsight = async (id: string) => {
    triggerHaptic('light');
    setSmartInsights(prev => prev.filter(i => i.id !== id));
    try { await authFetch(`/api/insights/${id}/dismiss`, { method: 'POST' }); } catch {}
  };

  const isViewingToday = selectedDate.toDateString() === new Date().toDateString();
  const displayMeals = isViewingToday ? store.meals : dateMeals;
  const displayWater = isViewingToday ? store.water : dateWater;
  const displayCalories = isViewingToday ? store.calories : dateMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const displayProtein = isViewingToday ? store.protein : dateMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const displayCarbs = isViewingToday ? store.carbs : dateMeals.reduce((s, m) => s + (m.carbs || 0), 0);
  const displayFat = isViewingToday ? store.fat : dateMeals.reduce((s, m) => s + (m.fat || 0), 0);

  const waterTarget = plan?.meta?.water_target_ml || 2500;
  const calTarget = plan?.meta?.daily_calories_target || store.target || 2000;
  const caloriesLeft = Math.max(calTarget - displayCalories, 0);
  const proteinTarget = plan?.meta?.macros?.protein_g || 150;
  const carbsTarget = plan?.meta?.macros?.carbs_g || 250;
  const fatTarget = plan?.meta?.macros?.fat_g || 65;
  const proteinLeft = Math.max(proteinTarget - displayProtein, 0);
  const carbsLeft = Math.max(carbsTarget - displayCarbs, 0);
  const fatLeft = Math.max(fatTarget - displayFat, 0);

  useEffect(() => {
    const checks = [
      { key: "protein", value: store.protein, target: proteinTarget },
      { key: "carbs", value: store.carbs, target: carbsTarget },
      { key: "fat", value: store.fat, target: fatTarget },
      { key: "calories", value: store.calories, target: calTarget },
      { key: "water", value: store.water, target: waterTarget },
    ];
    const macroLabels: Record<string, { emoji: string; label: string }> = {
      protein: { emoji: "🍖", label: "Protein" },
      carbs: { emoji: "🌾", label: "Carbs" },
      fat: { emoji: "🫒", label: "Fat" },
      calories: { emoji: "🔥", label: "Calories" },
      water: { emoji: "💧", label: "Water" },
    };
    for (const { key, value, target } of checks) {
      if (value >= target && target > 0 && !completedMacrosRef.current.has(key)) {
        completedMacrosRef.current.add(key);
        triggerHaptic('success');
        const info = macroLabels[key] || { emoji: "✅", label: key };
        toast({
          title: `${info.emoji} ${info.label} target reached!`,
          description: MACRO_ADVICE[key]?.tips?.[0] || "Great job staying on track today.",
          duration: 4000,
        });
        try {
          const today = new Date().toISOString().split('T')[0];
          const existing = JSON.parse(localStorage.getItem(`sherpa_dismissed_macros_${today}`) || '[]');
          if (!existing.includes(key)) {
            existing.push(key);
            localStorage.setItem(`sherpa_dismissed_macros_${today}`, JSON.stringify(existing));
          }
        } catch {}
      }
    }
  }, [store.protein, store.carbs, store.fat, store.calories, store.water, proteinTarget, carbsTarget, fatTarget, calTarget, waterTarget, toast]);

  const calDisplay = showEaten ? displayCalories : caloriesLeft;
  const calLabel = showEaten ? "Calories eaten" : "Calories left";

  const proteinDisplay = showEaten ? displayProtein : proteinLeft;
  const carbsDisplay = showEaten ? displayCarbs : carbsLeft;
  const fatDisplay = showEaten ? displayFat : fatLeft;
  const proteinLabel = showEaten ? "Protein eaten" : "Protein left";
  const carbsLabel = showEaten ? "Carbs eaten" : "Carbs left";
  const fatLabel = showEaten ? "Fat eaten" : "Fat left";

  const mealTypeLabel: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };

  const openMealDetail = (meal: any) => {
    triggerHaptic('light');
    setSelectedMeal(meal);
    setMealDetailOpen(true);
  };

  const openMacroDetail = (name: string, emoji: string, key: string, color: string, ringColor: string, eaten: number, target: number) => {
    setSelectedMacro({ name, emoji, key, color, ringColor, eaten, target, unit: "g" });
    setMacroDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8f8fa]" data-testid="dashboard-today">
      {dashLoadError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 flex items-center justify-between gap-3 safe-pad-top" data-testid="dashboard-load-error-banner">
          <span className="text-[13px] font-body">Failed to load dashboard data</span>
          <button
            onClick={loadDashboard}
            disabled={dashLoading}
            className="text-[13px] font-semibold underline font-body disabled:opacity-50"
            data-testid="button-retry-dashboard"
          >
            {dashLoading ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}
      <div className="bg-white px-5 pb-4 safe-pad-top" style={{ paddingTop: "max(env(safe-area-inset-top, 12px), 12px)" }}>
        <div className="flex items-center justify-between mb-4 pt-2">
          <div className="flex items-center">
            <img src="/images/sherpa-logo.png" alt="Sherpa Fit" className="w-14 h-14 object-contain" />
          </div>
          <div className="flex items-center gap-2">
            {store.streak > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full" data-testid="streak-badge">
                <Flame size={14} className="text-orange-500" />
                <span className="text-[13px] font-bold text-slate-800 font-display">{store.streak}</span>
              </div>
            )}
            <button onClick={() => { triggerHaptic('medium'); setJungOpen(true); }}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200 active:scale-90 transition-transform"
              data-testid="button-open-jung">
              <MessageCircle size={18} className="text-white" />
            </button>
          </div>
        </div>
        <DateStrip selectedDate={selectedDate} onSelect={setSelectedDate} weekHistory={store.weekHistory} workoutLogs={store.workoutLogs} />
      </div>

      <div className="mx-4 mt-4 bg-slate-50 rounded-2xl p-5 border border-slate-100/80" data-testid="calorie-hero">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-body">{calTarget} kcal target</p>
          <EatenLeftToggle showEaten={showEaten} onToggle={() => setShowEaten(v => !v)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[42px] font-bold text-slate-900 leading-none font-display" data-testid="text-calories-display">{calDisplay}</p>
            <p className="text-[13px] text-slate-400 mt-1 font-body">{calLabel}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[12px] text-slate-400 font-body flex items-center gap-1">
                <Flame size={12} className="text-orange-400" /> +{store.caloriesBurned || 0} burned
              </span>
            </div>
          </div>
          <CalorieArc consumed={displayCalories} target={calTarget} size={110} />
        </div>
      </div>

      <div className="px-4 mt-3 grid grid-cols-3 gap-2.5" data-testid="macro-cards">
        <MacroCard emoji="🍖" value={proteinDisplay} target={proteinTarget} label={proteinLabel} color="#ef4444" ringColor="#ef4444"
          onClick={() => openMacroDetail("Protein", "🍖", "protein", "#ef4444", "#ef4444", displayProtein, proteinTarget)} />
        <MacroCard emoji="🌾" value={carbsDisplay} target={carbsTarget} label={carbsLabel} color="#f97316" ringColor="#f97316"
          onClick={() => openMacroDetail("Carbs", "🌾", "carbs", "#f97316", "#f97316", displayCarbs, carbsTarget)} />
        <MacroCard emoji="🫒" value={fatDisplay} target={fatTarget} label={fatLabel} color="#6366f1" ringColor="#6366f1"
          onClick={() => openMacroDetail("Fat", "🫒", "fat", "#6366f1", "#6366f1", displayFat, fatTarget)} />
      </div>

      {plan?.meta && store.user && isViewingToday && (
        <DeficitProgressCard
          currentWeight={store.user.weight || plan.meta.weight_current_kg}
          targetWeight={plan.meta.weight_target_kg}
          dailyCalTarget={calTarget}
          caloriesEaten={displayCalories}
          caloriesBurned={store.caloriesBurned || 0}
          weekHistory={store.weekHistory || []}
        />
      )}

      <WaterBottleWidget water={displayWater} target={waterTarget} onAdd={isViewingToday ? () => store.addWater(250) : undefined} onRemove={isViewingToday ? () => store.removeWater(250) : undefined} />

      {smartInsights.length > 0 && (
        <div className="px-4 mt-4" data-testid="smart-insights-section">
          <h2 className="text-[15px] font-bold text-slate-900 mb-2 font-display flex items-center gap-2">
            <span className="text-lg">💡</span> Smart Insights
          </h2>
          <div className="space-y-2">
            {smartInsights.map((insight: any) => (
              <div key={insight.id} className={`rounded-2xl p-4 border ${
                insight.severity === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'
              }`} data-testid={`insight-card-${insight.type}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    insight.severity === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    <span className="text-sm">
                      {insight.type === 'over_calories' ? '🔥' : insight.type === 'high_carbs' ? '🌾' : insight.type === 'low_protein' ? '🍖' : insight.type === 'low_hydration' ? '💧' : '📝'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 font-display">{insight.message}</p>
                    {insight.actionSuggestion && (
                      <p className="text-[12px] text-slate-500 mt-1 leading-relaxed font-body">{insight.actionSuggestion}</p>
                    )}
                  </div>
                  <button onClick={() => { triggerHaptic('light'); dismissInsight(insight.id); }} className="text-slate-300 active:text-slate-500 p-1" data-testid={`button-dismiss-insight-${insight.type}`}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <Link href="/weekly-meal-planner">
            <div className="bg-white rounded-2xl p-4 border border-slate-100/60 flex items-center gap-3 active:bg-slate-50 transition cursor-pointer w-full" data-testid="link-weekly-planner">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Utensils size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-semibold text-slate-900 font-display">Weekly Meal Planner</h3>
                <p className="text-[12px] text-slate-400 font-body">Set recurring meals for each day</p>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </div>
          </Link>
        </div>
      </div>

      <div className="px-4 mt-1">
        <h2 className="text-[18px] font-bold text-slate-900 mb-3 font-display" data-testid="recently-uploaded-title">{isViewingToday ? "Recently uploaded" : `Entries for ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}</h2>
        <div className="space-y-2.5">
          {dateLoading && (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100/60">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-body">Loading...</p>
            </div>
          )}
          {!dateLoading && displayMeals.length === 0 && store.workoutLogs.length === 0 && (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100/60">
              <p className="text-slate-400 text-sm font-body">{isViewingToday ? "No entries yet today" : "No entries on this day"}</p>
              {isViewingToday && (
                <Link href="/dashboard/log?section=meal">
                  <span className="text-blue-600 text-sm font-semibold mt-2 inline-block font-display cursor-pointer" data-testid="link-log-first-meal">Log your first meal</span>
                </Link>
              )}
            </div>
          )}

          {displayMeals.map((meal: any, i: number) => (
            <div key={`meal-${meal.id || i}`}
              className="bg-white rounded-2xl p-4 border border-slate-100/60 active:bg-slate-50 transition cursor-pointer"
              onClick={() => openMealDetail(meal)}
              data-testid={`recent-meal-${i}`}>
              <div className="flex items-start gap-3">
                {meal.image && (
                  <img src={meal.image} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt={meal.name} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="text-[15px] font-semibold text-slate-900 font-display">{meal.name}</h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className="text-[12px] text-slate-400 font-body">{meal.time}</span>
                      {isViewingToday && meal.id && (
                        <button onClick={(e) => { e.stopPropagation(); triggerHaptic('light'); store.deleteMeal(meal.id); }}
                          className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center active:bg-red-100 transition"
                          data-testid={`button-delete-meal-${i}`}>
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Flame size={13} className="text-slate-600" />
                    <span className="text-[14px] font-bold text-slate-800 font-display">{meal.calories} calories</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-slate-400 font-body flex items-center gap-1"><span className="text-red-400">🍖</span> {meal.protein}g</span>
                    <span className="text-[11px] text-slate-400 font-body flex items-center gap-1"><span className="text-orange-400">🌾</span> {meal.carbs}g</span>
                    <span className="text-[11px] text-slate-400 font-body flex items-center gap-1"><span className="text-yellow-500">🫒</span> {meal.fat}g</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {store.workoutLogs.map((workout: any, i: number) => (
            <div key={`workout-${workout.id || i}`} className="bg-white rounded-2xl p-4 border border-slate-100/60" data-testid={`recent-workout-${i}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-500 text-lg">❤️</span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-900 font-display">{workout.exerciseName}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Flame size={13} className="text-slate-600" />
                      <span className="text-[14px] font-bold text-slate-800 font-display">{workout.caloriesBurned || 0} calories</span>
                    </div>
                    {workout.duration && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-[12px] text-slate-400 font-body">{workout.duration} Mins</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-slate-400 font-body">
                    {workout.loggedAt ? new Date(workout.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </span>
                  {isViewingToday && workout.id && (
                    <button onClick={() => { triggerHaptic('light'); store.deleteWorkoutLog(workout.id); }}
                      className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center active:bg-red-100 transition"
                      data-testid={`button-delete-workout-${i}`}>
                      <Trash2 size={13} className="text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4" data-testid="weight-log-widget">
        <div className="bg-white rounded-2xl p-4 border border-slate-100/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                <Scale size={16} className="text-violet-500" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900 font-display">Today's Weight</p>
                {weightLoggedToday !== null ? (
                  <p className="text-[12px] text-green-600 font-body">{weightLoggedToday} kg logged ✓</p>
                ) : (
                  <p className="text-[12px] text-slate-400 font-body">Not logged yet</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowWeightInput(v => !v)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-[12px] font-semibold active:bg-slate-200 transition font-display"
              data-testid="button-toggle-weight-input"
            >
              {weightLoggedToday !== null ? "Update" : "Log"}
            </button>
          </div>
          {showWeightInput && (
            <div className="mt-3 flex gap-2">
              <input
                type="number"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && logTodayWeight()}
                placeholder={`${store.user?.weight ?? 70} kg`}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] font-body text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-slate-50"
                data-testid="input-weight-today"
              />
              <button
                onClick={logTodayWeight}
                disabled={!weightInput || weightLogging}
                className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-[13px] font-semibold active:opacity-80 transition disabled:opacity-40 font-display"
                data-testid="button-save-weight-today"
              >
                {weightLogging ? "..." : "Save"}
              </button>
            </div>
          )}
        </div>
      </div>

      {todayMeals.length > 0 && (
        <div className="px-4 mt-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold text-slate-900 font-display">Suggested Meals</h2>
            <Link href="/dashboard/journey">
              <span className="text-[12px] text-blue-600 font-semibold cursor-pointer font-body" data-testid="link-all-meals">See all</span>
            </Link>
          </div>
          <div className="space-y-2">
            {todayMeals.slice(0, 3).map((meal: any, i: number) => {
              const isLogged = displayMeals.some((m: any) => m.name?.toLowerCase() === meal.title?.toLowerCase());
              return (
                <div key={i} className={`flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-100/60 ${isLogged ? "opacity-50" : ""}`}
                  data-testid={`meal-preview-${i}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    meal.type === "breakfast" ? "bg-amber-50" : meal.type === "lunch" ? "bg-green-50" : meal.type === "snack" ? "bg-violet-50" : "bg-blue-50"
                  }`}>
                    <Utensils size={18} className={
                      meal.type === "breakfast" ? "text-amber-500" : meal.type === "lunch" ? "text-green-500" : meal.type === "snack" ? "text-violet-500" : "text-blue-500"
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider font-body">{mealTypeLabel[meal.type] || meal.type}</p>
                    <p className="text-[14px] font-semibold text-slate-800 truncate font-display">{meal.title}</p>
                    <p className="text-[12px] text-slate-400 mt-0.5 font-body">{meal.calories} kcal</p>
                  </div>
                  {isLogged ? (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                  ) : (
                    <Link href="/dashboard/log?section=meal">
                      <div className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-[12px] font-semibold cursor-pointer active:opacity-80 transition flex-shrink-0 font-display" data-testid={`button-log-meal-${i}`}>
                        Log
                      </div>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {todayWorkout && (
        <Link href="/dashboard/journey">
          <div className="mx-4 mt-2 mb-6 bg-white rounded-2xl p-5 border border-slate-100/60 cursor-pointer active:bg-slate-50 transition" data-testid="workout-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-body">Today's Workout</p>
                <h3 className="text-[16px] font-bold text-slate-900 mt-1 font-display" data-testid="text-workout-title">{todayWorkout.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-slate-400 text-[12px] font-body">
                  <span className="flex items-center gap-1"><Clock size={13} />{todayWorkout.duration_min || 30} min</span>
                  <span className="flex items-center gap-1"><Flame size={13} />{todayWorkout.calories_burn_est || 200} kcal</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </div>
          </div>
        </Link>
      )}

      <div className="h-6" />

      <MealDetailSheet meal={selectedMeal} open={mealDetailOpen} onClose={() => setMealDetailOpen(false)}
        onMealUpdated={() => store.reloadMeals()}
        onDelete={(id) => { store.deleteMeal(id); }} />
      <MacroDetailSheet macro={selectedMacro} meals={displayMeals} weekHistory={store.weekHistory} open={macroDetailOpen} onClose={() => setMacroDetailOpen(false)} />
      <JungChatDrawer open={jungOpen} onClose={() => setJungOpen(false)} userId={store.userId} />

    </div>
  );
}
