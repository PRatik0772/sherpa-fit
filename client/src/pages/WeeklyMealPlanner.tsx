import { useState, useEffect, useCallback, useRef } from "react";
import { useStore, authFetch } from "@/lib/store";
import { useLocation } from "wouter";
import {
  ChevronLeft, Plus, Trash2, Flame, Utensils, X,
  CheckCircle2, Copy, Calendar, ChevronDown, ChevronUp,
  Bell, BellOff, AlarmClock, Check,
} from "lucide-react";
import {
  triggerHaptic, requestNotificationPermission, getNotificationPermission,
  scheduleAllReminders, cancelNativeReminder,
} from "@/lib/capacitor";

type MealPreset = {
  id: string;
  dayOfWeek: number;
  mealType: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type MealReminder = {
  id: string;
  mealType: string;
  scheduledTime: string;
  enabled: boolean;
  label: string | null;
};

const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Snack", "Dinner"];
const MEAL_EMOJIS: Record<string, string> = {
  Breakfast: "🌅", Lunch: "☀️", Snack: "🍎", Dinner: "🌙",
};

export default function WeeklyMealPlanner() {
  const store = useStore();
  const [, navigate] = useLocation();

  const todayIndex = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [allPresets, setAllPresets] = useState<MealPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCalories, setFormCalories] = useState("");
  const [formProtein, setFormProtein] = useState("");
  const [formCarbs, setFormCarbs] = useState("");
  const [formFat, setFormFat] = useState("");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyFrom, setCopyFrom] = useState<number | null>(null);
  const [showCopyPicker, setShowCopyPicker] = useState(false);
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({
    Breakfast: true, Lunch: true, Snack: false, Dinner: true,
  });
  const calRef = useRef<HTMLDivElement>(null);

  const [reminders, setReminders] = useState<MealReminder[]>([]);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [savingReminder, setSavingReminder] = useState<string | null>(null);
  const [showReminders, setShowReminders] = useState(true);

  const REMINDER_DEFAULTS: Record<string, string> = {
    breakfast: "08:00", lunch: "13:00", snack: "16:00", dinner: "19:30", water: "10:00",
  };
  const REMINDER_SLOTS = [
    { type: "breakfast", emoji: "🌅", label: "Breakfast" },
    { type: "lunch", emoji: "☀️", label: "Lunch" },
    { type: "snack", emoji: "🍎", label: "Snack" },
    { type: "dinner", emoji: "🌙", label: "Dinner" },
    { type: "water", emoji: "💧", label: "Water" },
  ];

  const fetchReminders = useCallback(async () => {
    if (!store.userId) return;
    try {
      const res = await authFetch(`/api/meal-reminders/${store.userId}`);
      if (res.ok) {
        const data = await res.json();
        setReminders(data || []);
        scheduleAllReminders((data || []).filter((r: MealReminder) => r.enabled));
      }
    } catch {}
  }, [store.userId]);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    fetchReminders();
  }, [fetchReminders]);

  const handleRequestPermission = async () => {
    triggerHaptic("medium");
    const granted = await requestNotificationPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
    if (granted) fetchReminders();
  };

  const handleSaveReminder = async (mealType: string, time: string, enabled: boolean) => {
    if (!store.userId) return;
    setSavingReminder(mealType);
    try {
      const res = await authFetch("/api/meal-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealType, scheduledTime: time, enabled }),
      });
      if (res.ok) {
        triggerHaptic("success");
        await fetchReminders();
      }
    } catch { triggerHaptic("error"); }
    finally { setSavingReminder(null); }
  };

  const handleToggleReminder = async (mealType: string, enabled: boolean) => {
    const existing = reminders.find(r => r.mealType === mealType);
    const time = existing?.scheduledTime || REMINDER_DEFAULTS[mealType] || "08:00";
    if (!enabled) await cancelNativeReminder(mealType);
    await handleSaveReminder(mealType, time, enabled);
  };

  const fetchAll = useCallback(async () => {
    if (!store.userId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/weekly-meals/${store.userId}`);
      if (res.ok) {
        const data = await res.json();
        setAllPresets(data || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [store.userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (calRef.current) {
      const btn = calRef.current.querySelector(`[data-day="${selectedDay}"]`) as HTMLElement;
      btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedDay]);

  const dayPresets = allPresets.filter(p => p.dayOfWeek === selectedDay);

  const dayTotals = (day: number) => {
    const meals = allPresets.filter(p => p.dayOfWeek === day);
    return {
      calories: meals.reduce((s, m) => s + m.calories, 0),
      protein: meals.reduce((s, m) => s + (m.protein || 0), 0),
      carbs: meals.reduce((s, m) => s + (m.carbs || 0), 0),
      fat: meals.reduce((s, m) => s + (m.fat || 0), 0),
      count: meals.length,
    };
  };

  const selectedTotals = dayTotals(selectedDay);
  const calTarget = store.plan?.meta?.daily_calories || 2000;

  const weekStats = (() => {
    let totalCal = 0, totalProt = 0, totalCarb = 0, totalFat = 0, daysPlanned = 0;
    for (let i = 0; i < 7; i++) {
      const t = dayTotals(i);
      if (t.count > 0) { totalCal += t.calories; totalProt += t.protein; totalCarb += t.carbs; totalFat += t.fat; daysPlanned++; }
    }
    const avgCal = daysPlanned > 0 ? Math.round(totalCal / daysPlanned) : 0;
    const projectedDeficit = daysPlanned > 0 ? (calTarget * daysPlanned - totalCal) : 0;
    const projectedFatKg = projectedDeficit / 7700;
    return { totalCal, avgCal, daysPlanned, totalProt, totalCarb, totalFat, projectedFatKg };
  })();

  const resetForm = () => {
    setAddingTo(null);
    setFormName(""); setFormCalories(""); setFormProtein(""); setFormCarbs(""); setFormFat("");
  };

  const handleAddMeal = async () => {
    if (!store.userId || !addingTo || !formName.trim() || !formCalories) return;
    triggerHaptic("medium");
    setSaving(true);
    try {
      const res = await authFetch("/api/weekly-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: store.userId, dayOfWeek: selectedDay,
          mealType: addingTo.toLowerCase(), name: formName.trim(),
          calories: parseInt(formCalories) || 0,
          protein: parseFloat(formProtein) || 0, carbs: parseFloat(formCarbs) || 0,
          fat: parseFloat(formFat) || 0,
        }),
      });
      if (res.ok) {
        triggerHaptic("success");
        resetForm();
        await fetchAll();
      }
    } catch { triggerHaptic("error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    triggerHaptic("medium");
    try {
      const res = await authFetch(`/api/weekly-meals/${id}`, { method: "DELETE" });
      if (res.ok) { triggerHaptic("success"); setAllPresets(prev => prev.filter(p => p.id !== id)); }
    } catch { triggerHaptic("error"); }
  };

  const handleApplyToday = async () => {
    if (!store.userId || applying) return;
    triggerHaptic("medium");
    setApplying(true);
    try {
      const res = await authFetch("/api/weekly-meals/apply-today", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: store.userId }),
      });
      if (res.ok) { triggerHaptic("success"); setApplied(true); setTimeout(() => setApplied(false), 3000); }
    } catch { triggerHaptic("error"); }
    finally { setApplying(false); }
  };

  const handleCopyDay = async (toDay: number) => {
    if (!store.userId || copyFrom === null) return;
    triggerHaptic("medium");
    setCopying(true);
    setShowCopyPicker(false);
    try {
      const res = await authFetch("/api/weekly-meals/copy-day", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: store.userId, fromDay: copyFrom, toDay }),
      });
      if (res.ok) {
        triggerHaptic("success");
        setSelectedDay(toDay);
        await fetchAll();
      }
    } catch { triggerHaptic("error"); }
    finally { setCopying(false); setCopyFrom(null); }
  };

  const toggleSlot = (type: string) =>
    setExpandedSlots(prev => ({ ...prev, [type]: !prev[type] }));

  const filledDays = Array.from({ length: 7 }, (_, i) => dayTotals(i).count > 0);
  const isToday = selectedDay === todayIndex;

  return (
    <div className="min-h-screen bg-[#f8f8fa] pb-40" data-testid="weekly-meal-planner">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="flex items-center gap-3 px-4 pt-14 pb-3">
          <button
            onClick={() => { triggerHaptic("light"); navigate("/dashboard/today"); }}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center active:scale-95 transition-transform"
            data-testid="button-back"
          >
            <ChevronLeft size={18} className="text-slate-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-slate-900 font-display" data-testid="text-page-title">
              Meal Calendar
            </h1>
            <p className="text-[12px] text-slate-400 font-body">Plan your week, track your journey</p>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1.5 rounded-full border border-blue-100">
            <Calendar size={13} className="text-blue-600" />
            <span className="text-[11px] font-semibold text-blue-600 font-body">{weekStats.daysPlanned}/7 days</span>
          </div>
        </div>

        {/* 7-day calendar strip */}
        <div ref={calRef} className="flex gap-2 px-4 pb-4 overflow-x-auto no-scrollbar" data-testid="day-calendar">
          {DAYS_SHORT.map((day, i) => {
            const t = dayTotals(i);
            const isSelected = selectedDay === i;
            const isT = i === todayIndex;
            const pct = calTarget > 0 ? Math.min(t.calories / calTarget, 1) : 0;
            return (
              <button
                key={day}
                data-day={i}
                onClick={() => { triggerHaptic("selection"); setSelectedDay(i); }}
                className={`flex flex-col items-center px-3 py-2.5 rounded-2xl min-w-[56px] transition-all ${
                  isSelected
                    ? isT
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-200"
                      : "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : isT
                    ? "bg-orange-50 border border-orange-200"
                    : t.count > 0
                    ? "bg-white border border-blue-100"
                    : "bg-white border border-slate-100"
                }`}
                data-testid={`tab-day-${i}`}
              >
                <span className={`text-[10px] font-semibold font-body ${isSelected ? "text-white/70" : isT ? "text-orange-400" : "text-slate-400"}`}>
                  {day}
                </span>
                <span className={`text-[18px] font-bold font-display leading-tight ${isSelected ? "text-white" : isT ? "text-orange-500" : "text-slate-800"}`}>
                  {i}
                </span>
                {t.count > 0 ? (
                  <>
                    <div className={`w-full h-1 rounded-full mt-1.5 overflow-hidden ${isSelected ? "bg-white/20" : "bg-slate-100"}`}>
                      <div
                        className={`h-full rounded-full ${isSelected ? "bg-white" : isT ? "bg-orange-400" : "bg-blue-500"}`}
                        style={{ width: `${Math.round(pct * 100)}%` }}
                      />
                    </div>
                    <span className={`text-[9px] font-body mt-1 ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                      {t.calories > 0 ? `${t.calories}` : "—"}
                    </span>
                  </>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">

        {/* Day summary card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100/80 shadow-sm" data-testid="day-summary">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] text-slate-400 font-body">{isToday ? "Today — " : ""}{DAYS_FULL[selectedDay]}</p>
              <div className="flex items-end gap-1.5 mt-0.5">
                <span className="text-[28px] font-bold font-display text-slate-900 leading-none" data-testid="text-total-calories">
                  {selectedTotals.calories}
                </span>
                <span className="text-[13px] text-slate-400 font-body mb-0.5">kcal planned</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {calTarget > 0 && selectedTotals.calories > 0 && (
                <span className={`text-[11px] font-semibold font-body px-2 py-0.5 rounded-full ${
                  selectedTotals.calories > calTarget
                    ? "bg-red-50 text-red-500 border border-red-100"
                    : "bg-blue-50 text-blue-600 border border-blue-100"
                }`}>
                  {selectedTotals.calories > calTarget
                    ? `+${selectedTotals.calories - calTarget} over`
                    : `${calTarget - selectedTotals.calories} remaining`}
                </span>
              )}
              <span className="text-[10px] text-slate-400 font-body">Target: {calTarget} kcal</span>
            </div>
          </div>

          {selectedTotals.calories > 0 && (
            <>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${selectedTotals.calories > calTarget ? "bg-red-400" : "bg-blue-600"}`}
                  style={{ width: `${Math.min((selectedTotals.calories / calTarget) * 100, 100)}%` }}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-[11px] text-slate-500 font-body" data-testid="text-total-protein">P: {Math.round(selectedTotals.protein)}g</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-[11px] text-slate-500 font-body" data-testid="text-total-carbs">C: {Math.round(selectedTotals.carbs)}g</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-[11px] text-slate-500 font-body" data-testid="text-total-fat">F: {Math.round(selectedTotals.fat)}g</span>
                </div>
              </div>
            </>
          )}

          {selectedTotals.calories === 0 && (
            <p className="text-[12px] text-slate-300 font-body">No meals planned for this day yet.</p>
          )}

          {/* Copy controls */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
            {selectedTotals.count > 0 && (
              <button
                onClick={() => {
                  triggerHaptic("light");
                  setCopyFrom(selectedDay);
                  setShowCopyPicker(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 active:bg-blue-100 transition"
                data-testid="button-copy-day"
              >
                <Copy size={13} className="text-blue-600" />
                <span className="text-[12px] font-semibold text-blue-600 font-body">Copy to another day</span>
              </button>
            )}
            {selectedTotals.count === 0 && filledDays.some(Boolean) && (
              <button
                onClick={() => {
                  triggerHaptic("light");
                  setCopyFrom(null);
                  setShowCopyPicker(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 active:bg-slate-100 transition"
                data-testid="button-copy-from"
              >
                <Copy size={13} className="text-slate-500" />
                <span className="text-[12px] font-semibold text-slate-600 font-body">Copy from another day</span>
              </button>
            )}
          </div>

          {showCopyPicker && (
            <div className="mt-2 bg-slate-50 rounded-xl p-3 border border-slate-200" data-testid="copy-day-picker">
              <p className="text-[11px] text-slate-400 font-body mb-2">
                {copyFrom !== null
                  ? `Copy ${DAYS_SHORT[copyFrom]}'s meals to:`
                  : `Copy meals from:`}
              </p>
              <div className="flex flex-wrap gap-2">
                {DAYS_SHORT.map((d, i) => {
                  if (copyFrom !== null && i === copyFrom) return null;
                  if (copyFrom === null && !filledDays[i]) return null;
                  const t = dayTotals(i);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (copyFrom !== null) { handleCopyDay(i); }
                        else { setCopyFrom(i); setSelectedDay(selectedDay); setShowCopyPicker(false); handleCopyDay(selectedDay); }
                      }}
                      disabled={copying}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 active:bg-blue-50 transition"
                      data-testid={`copy-to-day-${i}`}
                    >
                      <span className="text-[12px] font-bold font-display text-slate-800">{d}</span>
                      {t.count > 0 && <span className="text-[10px] text-slate-400 font-body">{t.calories}k</span>}
                    </button>
                  );
                })}
                <button
                  onClick={() => { setShowCopyPicker(false); setCopyFrom(null); }}
                  className="flex items-center px-2.5 py-1.5 rounded-lg bg-slate-100 active:bg-slate-200 transition"
                  data-testid="button-cancel-copy"
                >
                  <X size={14} className="text-slate-500" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Meal slots */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {MEAL_TYPES.map((type) => {
              const mealPresets = dayPresets.filter(p => p.mealType.toLowerCase() === type.toLowerCase());
              const slotCals = mealPresets.reduce((s, p) => s + p.calories, 0);
              const expanded = expandedSlots[type];
              const isAdding = addingTo === type;

              return (
                <div
                  key={type}
                  className="bg-white rounded-2xl border border-slate-100/80 overflow-hidden shadow-sm"
                  data-testid={`meal-slot-${type.toLowerCase()}`}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer active:bg-slate-50 transition"
                    onClick={() => { triggerHaptic("selection"); toggleSlot(type); }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{MEAL_EMOJIS[type]}</span>
                      <div>
                        <span className="text-[15px] font-semibold text-slate-900 font-display">{type}</span>
                        {slotCals > 0 && (
                          <span className="text-[11px] text-slate-400 font-body ml-2">{slotCals} kcal</span>
                        )}
                      </div>
                      {mealPresets.length > 0 && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded-full border border-blue-100">
                          {mealPresets.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic("light");
                          setAddingTo(isAdding ? null : type);
                          if (!expanded) toggleSlot(type);
                          if (isAdding) resetForm();
                        }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform ${
                          isAdding ? "bg-blue-600" : "bg-slate-100"
                        }`}
                        data-testid={`button-add-${type.toLowerCase()}`}
                      >
                        {isAdding
                          ? <X size={13} className="text-white" />
                          : <Plus size={14} className="text-slate-600" />
                        }
                      </button>
                      {expanded
                        ? <ChevronUp size={16} className="text-slate-300" />
                        : <ChevronDown size={16} className="text-slate-300" />
                      }
                    </div>
                  </div>

                  {expanded && (
                    <>
                      {isAdding && (
                        <div className="px-4 py-3 bg-blue-50/40 border-t border-blue-100/60" data-testid={`form-add-${type.toLowerCase()}`}>
                          <input
                            type="text"
                            placeholder="Meal name (e.g. Oats with banana)"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-[14px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-body mb-2.5"
                            data-testid="input-meal-name"
                          />
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            {[
                              { label: "Calories", key: "cal", val: formCalories, set: setFormCalories, id: "input-calories" },
                              { label: "Protein g", key: "p", val: formProtein, set: setFormProtein, id: "input-protein" },
                              { label: "Carbs g", key: "c", val: formCarbs, set: setFormCarbs, id: "input-carbs" },
                              { label: "Fat g", key: "f", val: formFat, set: setFormFat, id: "input-fat" },
                            ].map(({ label, val, set, id }) => (
                              <div key={label}>
                                <label className="text-[10px] text-slate-400 font-body mb-1 block">{label}</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={val}
                                  onChange={(e) => set(e.target.value)}
                                  className="w-full px-2 py-2 rounded-xl bg-white border border-slate-200 text-[13px] text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-body"
                                  data-testid={id}
                                />
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={handleAddMeal}
                            disabled={saving || !formName.trim() || !formCalories}
                            className={`w-full py-2.5 rounded-xl font-semibold text-[14px] transition-all font-display ${
                              saving || !formName.trim() || !formCalories
                                ? "bg-slate-100 text-slate-300"
                                : "bg-blue-600 text-white active:bg-blue-700 shadow-sm shadow-blue-200"
                            }`}
                            data-testid="button-save-meal"
                          >
                            {saving ? "Saving…" : "Add Meal"}
                          </button>
                        </div>
                      )}

                      {mealPresets.length === 0 && !isAdding && (
                        <div className="px-4 py-4 border-t border-slate-50 text-center">
                          <p className="text-[12px] text-slate-300 font-body" data-testid={`text-empty-${type.toLowerCase()}`}>
                            Tap + to add a {type.toLowerCase()}
                          </p>
                        </div>
                      )}

                      {mealPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center gap-3 px-4 py-3 border-t border-slate-50"
                          data-testid={`preset-${preset.id}`}
                        >
                          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                            <Utensils size={16} className="text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-slate-800 font-display truncate" data-testid={`text-preset-name-${preset.id}`}>
                              {preset.name}
                            </p>
                            <div className="flex gap-2 mt-0.5">
                              <span className="text-[11px] font-semibold text-orange-500 font-body">{preset.calories} kcal</span>
                              <span className="text-[11px] text-slate-300">·</span>
                              <span className="text-[11px] text-slate-400 font-body">P {Math.round(preset.protein || 0)}g</span>
                              <span className="text-[11px] text-slate-400 font-body">C {Math.round(preset.carbs || 0)}g</span>
                              <span className="text-[11px] text-slate-400 font-body">F {Math.round(preset.fat || 0)}g</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(preset.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 active:text-red-500 active:bg-red-50 transition-all"
                            data-testid={`button-delete-${preset.id}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Timings & Reminders */}
        <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden" data-testid="reminders-section">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-slate-50 transition"
            onClick={() => { triggerHaptic("selection"); setShowReminders(v => !v); }}
            data-testid="button-toggle-reminders"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                <AlarmClock size={15} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-[14px] font-bold font-display text-slate-900">Meal Timings & Reminders</p>
                <p className="text-[11px] text-slate-400 font-body">
                  {reminders.filter(r => r.enabled).length > 0
                    ? `${reminders.filter(r => r.enabled).length} reminder${reminders.filter(r => r.enabled).length > 1 ? "s" : ""} active`
                    : "Set times for your meals"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {reminders.filter(r => r.enabled).length > 0 && (
                <span className="w-2 h-2 rounded-full bg-orange-500" />
              )}
              {showReminders ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
            </div>
          </button>

          {showReminders && (
            <div className="border-t border-slate-100">
              {/* Permission banner */}
              {notifPermission !== 'granted' && (
                <div className="mx-4 mt-3 mb-1 bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center gap-3">
                  <BellOff size={18} className="text-orange-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-slate-800 font-display">Notifications off</p>
                    <p className="text-[11px] text-slate-400 font-body">Allow notifications to get meal reminders</p>
                  </div>
                  <button
                    onClick={handleRequestPermission}
                    className="px-3 py-1.5 bg-orange-500 text-white text-[12px] font-semibold rounded-lg active:bg-orange-600 transition font-display"
                    data-testid="button-allow-notifications"
                  >
                    Allow
                  </button>
                </div>
              )}

              {notifPermission === 'granted' && (
                <div className="mx-4 mt-3 mb-1 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <Bell size={14} className="text-blue-600" />
                  <p className="text-[11px] text-blue-600 font-body font-semibold">Notifications enabled — timings are active</p>
                </div>
              )}

              <div className="px-4 py-3 space-y-1">
                {REMINDER_SLOTS.map(({ type, emoji, label }) => {
                  const existing = reminders.find(r => r.mealType === type);
                  const isEnabled = existing?.enabled ?? false;
                  const currentTime = existing?.scheduledTime || REMINDER_DEFAULTS[type];
                  const isSaving = savingReminder === type;

                  return (
                    <div
                      key={type}
                      className={`flex items-center gap-3 py-3 border-b border-slate-50 last:border-0 ${!isEnabled ? "opacity-60" : ""}`}
                      data-testid={`reminder-row-${type}`}
                    >
                      <span className="text-xl w-8 text-center">{emoji}</span>
                      <div className="flex-1">
                        <p className="text-[14px] font-semibold font-display text-slate-800">{label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="time"
                            value={currentTime}
                            onChange={(e) => {
                              if (e.target.value) handleSaveReminder(type, e.target.value, isEnabled || true);
                            }}
                            disabled={!isEnabled && notifPermission !== 'granted'}
                            className="text-[13px] font-bold font-display text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-40"
                            data-testid={`input-time-${type}`}
                          />
                          {isSaving && <div className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />}
                          {!isSaving && existing && <Check size={14} className="text-blue-500" />}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          triggerHaptic("selection");
                          if (notifPermission !== 'granted') { handleRequestPermission(); return; }
                          handleToggleReminder(type, !isEnabled);
                        }}
                        className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                          isEnabled ? "bg-blue-600" : "bg-slate-200"
                        }`}
                        data-testid={`toggle-reminder-${type}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                          isEnabled ? "left-5" : "left-0.5"
                        }`} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 pb-3">
                <p className="text-[10px] text-slate-300 font-body text-center">
                  Reminders fire daily at the set time. Keep the app open for web notifications.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Week Summary */}
        {weekStats.daysPlanned > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100/80 shadow-sm" data-testid="week-summary">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Calendar size={13} className="text-white" />
              </div>
              <span className="text-[14px] font-bold font-display text-slate-900">Week Summary</span>
              <span className="text-[11px] text-slate-400 font-body ml-auto">{weekStats.daysPlanned} days planned</span>
            </div>

            <div className="flex gap-2 mb-3">
              <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-body mb-0.5">Avg / day</p>
                <p className="text-[18px] font-bold font-display text-slate-900">{weekStats.avgCal}</p>
                <p className="text-[9px] text-slate-400 font-body">kcal</p>
              </div>
              <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-body mb-0.5">Weekly total</p>
                <p className="text-[18px] font-bold font-display text-slate-900">{weekStats.totalCal}</p>
                <p className="text-[9px] text-slate-400 font-body">kcal</p>
              </div>
              <div className={`flex-1 rounded-xl p-3 border text-center ${weekStats.projectedFatKg > 0 ? "bg-orange-50 border-orange-100" : "bg-red-50 border-red-100"}`}>
                <p className="text-[10px] text-slate-400 font-body mb-0.5">Projected</p>
                <p className={`text-[18px] font-bold font-display ${weekStats.projectedFatKg > 0 ? "text-orange-500" : "text-red-500"}`}>
                  {weekStats.projectedFatKg > 0 ? `-${weekStats.projectedFatKg.toFixed(2)}` : "+fat"}
                </p>
                <p className="text-[9px] text-slate-400 font-body">kg fat</p>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 flex-1">
                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-[11px] text-slate-500 font-body">Protein <span className="font-semibold text-slate-800">{Math.round(weekStats.totalProt)}g</span></span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                <span className="text-[11px] text-slate-500 font-body">Carbs <span className="font-semibold text-slate-800">{Math.round(weekStats.totalCarb)}g</span></span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                <span className="text-[11px] text-slate-500 font-body">Fat <span className="font-semibold text-slate-800">{Math.round(weekStats.totalFat)}g</span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Apply today sticky button */}
      {dayPresets.length > 0 && isToday && (
        <div className="fixed bottom-6 left-4 right-4 z-20">
          <button
            onClick={handleApplyToday}
            disabled={applying}
            className={`w-full py-4 rounded-2xl font-semibold text-[16px] transition-all font-display shadow-lg ${
              applied
                ? "bg-blue-600 text-white shadow-blue-200"
                : applying
                ? "bg-slate-700 text-slate-300"
                : "bg-orange-500 text-white shadow-orange-200 active:bg-orange-600"
            }`}
            data-testid="button-apply-today"
          >
            {applied ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 size={20} /> Meals Added to Today!
              </span>
            ) : applying ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Applying…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Flame size={20} /> Log Today's Meals ({selectedTotals.calories} kcal)
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
