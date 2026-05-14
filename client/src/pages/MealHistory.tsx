import { useState, useEffect } from "react";
import { useStore, authFetch } from "@/lib/store";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import MealDetailModal from "@/components/MealDetailModal";

type MealFromAPI = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  image?: string | null;
  loggedAt: string | null;
};

type MealForModal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  time: string;
  image?: string;
};

function getWeekRange(offset: number) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function MealHistory() {
  const { userId } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [meals, setMeals] = useState<MealFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<MealForModal | null>(null);

  const { start, end } = getWeekRange(weekOffset);
  const isCurrentWeek = weekOffset === 0;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    authFetch(`/api/meals/${userId}/history?startDate=${formatDate(start)}&endDate=${formatDate(end)}`)
      .then((r) => r.json())
      .then((data) => setMeals(data || []))
      .catch(() => setMeals([]))
      .finally(() => setLoading(false));
  }, [userId, weekOffset]);

  const dayCards = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const dateStr = formatDate(day);
    const dayMeals = meals.filter((m) => {
      if (!m.loggedAt) return false;
      const d = new Date(m.loggedAt);
      return formatDate(d) === dateStr;
    });
    const totalCal = dayMeals.reduce((s, m) => s + m.calories, 0);
    const isToday = dateStr === formatDate(new Date());
    dayCards.push({ date: day, dateStr, dayName: DAY_NAMES[i], meals: dayMeals, totalCal, isToday });
  }

  const toModal = (m: MealFromAPI): MealForModal => ({
    id: m.id,
    name: m.name,
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
    fiber: m.fiber || 0,
    sugar: m.sugar || 0,
    sodium: m.sodium || 0,
    time: m.loggedAt ? new Date(m.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
    image: m.image || undefined,
  });

  return (
    <div className="p-5 pb-40 space-y-4 animate-in fade-in duration-500" data-testid="meal-history-page">
      <div className="flex items-center gap-3">
        <Link href="/">
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors" data-testid="button-back-history">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Meal History</h1>
      </div>

      <div className="glass-card p-3 rounded-2xl flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          data-testid="button-prev-week"
        >
          <ChevronLeft size={18} className="text-[#1e3a5f]" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-900" data-testid="text-week-range">
            {formatDateLabel(start, end)}
          </p>
          {isCurrentWeek && <p className="text-[10px] text-[#8fbc8f] font-medium">This Week</p>}
        </div>
        <button
          onClick={() => !isCurrentWeek && setWeekOffset((w) => w + 1)}
          className={cn("p-2 rounded-full transition-colors", isCurrentWeek ? "opacity-30" : "hover:bg-gray-100")}
          disabled={isCurrentWeek}
          data-testid="button-next-week"
        >
          <ChevronRight size={18} className="text-[#1e3a5f]" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#1e3a5f]" />
        </div>
      ) : (
        <div className="space-y-3">
          {dayCards.map((day) => (
            <div
              key={day.dateStr}
              className={cn("glass-card rounded-2xl overflow-hidden", day.isToday && "ring-2 ring-[#1e3a5f]/20")}
              data-testid={`day-card-${day.dateStr}`}
            >
              <div className="p-4 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-bold", day.isToday ? "text-[#1e3a5f]" : "text-gray-900")}>
                    {day.dayName}
                  </span>
                  {day.isToday && (
                    <span className="px-2 py-0.5 bg-[#1e3a5f]/10 text-[#1e3a5f] text-[10px] font-semibold rounded-full">
                      Today
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  {day.totalCal > 0 && (
                    <p className="text-xs font-bold text-gray-900" data-testid={`text-day-calories-${day.dateStr}`}>
                      {day.totalCal} kcal
                    </p>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {day.meals.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No meals logged</p>
                ) : (
                  day.meals.map((meal) => (
                    <div
                      key={meal.id}
                      className="p-3 flex items-center gap-3 cursor-pointer active:bg-gray-50 transition-colors"
                      onClick={() => setSelectedMeal(toModal(meal))}
                      data-testid={`history-meal-${meal.id}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                        {meal.image ? (
                          <img src={meal.image} alt={meal.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">🍽️</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium text-sm truncate">{meal.name}</p>
                        <p className="text-gray-400 text-xs">
                          {meal.calories} kcal •{" "}
                          {meal.loggedAt
                            ? new Date(meal.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </p>
                      </div>
                      <ChevronRight className="text-[#1e3a5f]/40 flex-shrink-0" size={14} />
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMeal && <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />}
    </div>
  );
}
