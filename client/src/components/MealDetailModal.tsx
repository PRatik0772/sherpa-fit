import { X } from "lucide-react";

type Meal = {
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

function MacroBar({ label, value, max, color, unit = "g" }: { label: string; value: number; max: number; color: string; unit?: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div className="space-y-1" data-testid={`macro-bar-${label.toLowerCase()}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{Math.round(value)}{unit}</span>
      </div>
      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }}
        />
      </div>
    </div>
  );
}

export default function MealDetailModal({ meal, onClose }: { meal: Meal; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      data-testid="meal-detail-overlay"
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
        data-testid="meal-detail-modal"
      >
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 px-5 pt-4 pb-2 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 truncate pr-4">{meal.name}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            data-testid="button-close-meal-detail"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {meal.image && (
            <div className="w-full h-48 rounded-2xl overflow-hidden bg-gray-100">
              <img src={meal.image} alt={meal.name} className="w-full h-full object-cover" data-testid="img-meal-detail" />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900" data-testid="text-meal-calories">{meal.calories}</p>
              <p className="text-xs text-gray-400">calories</p>
            </div>
            {meal.time && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-500" data-testid="text-meal-time">🕐 {meal.time}</p>
              </div>
            )}
          </div>

          <div className="glass-card p-4 rounded-2xl space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Macronutrients</h3>
            <MacroBar label="Protein" value={meal.protein} max={160} color="#7c3aed" />
            <MacroBar label="Carbs" value={meal.carbs} max={220} color="#ea580c" />
            <MacroBar label="Fat" value={meal.fat} max={70} color="#d97706" />
          </div>

          <div className="glass-card p-4 rounded-2xl space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Micronutrients</h3>
            <MacroBar label="Fiber" value={meal.fiber} max={38} color="#22C55E" />
            <MacroBar label="Sugar" value={meal.sugar} max={71} color="#EC4899" />
            <MacroBar label="Sodium" value={meal.sodium} max={2300} color="#6366F1" unit="mg" />
          </div>
        </div>
      </div>
    </div>
  );
}
