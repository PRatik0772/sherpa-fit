import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { ChevronUp, ChevronDown, Flame, Droplets, Utensils, Leaf, Dumbbell, Candy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/capacitor";

function MiniRing({ value, target, color, size = 28 }: { value: number; target: number; color: string; size?: number }) {
  const progress = Math.min(value / (target || 1), 1);
  const sw = 2.5;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - progress * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}18`} strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease-out" }} />
    </svg>
  );
}

export function NutritionSheet({ calTarget = 2000, waterTarget = 2500 }: { calTarget?: number; waterTarget?: number }) {
  const store = useStore();
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const calPct = Math.round(Math.min(store.calories / (calTarget || 1), 1) * 100);
  const waterPct = Math.round(Math.min(store.water / (waterTarget || 1), 1) * 100);

  const macros = [
    { label: "Protein", value: store.protein, target: 150, unit: "g", color: "#2563eb", icon: <Dumbbell size={12} className="text-blue-600" /> },
    { label: "Carbs", value: store.carbs, target: 250, unit: "g", color: "#f97316", icon: <Utensils size={12} className="text-orange-500" /> },
    { label: "Fat", value: store.fat, target: 65, unit: "g", color: "#eab308", icon: <Leaf size={12} className="text-yellow-500" /> },
    { label: "Sugar", value: store.sugar, target: 50, unit: "g", color: "#ec4899", icon: <Candy size={12} className="text-pink-500" /> },
    { label: "Sodium", value: store.sodium, target: 2300, unit: "mg", color: "#8b5cf6", icon: <Zap size={12} className="text-purple-500" /> },
    { label: "Fiber", value: store.fiber, target: 30, unit: "g", color: "#059669", icon: <Leaf size={12} className="text-emerald-600" /> },
  ];

  return (
    <div className={cn(
      "fixed left-3 right-3 z-40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
      expanded ? "bottom-[72px]" : "bottom-[60px]"
    )} data-testid="nutrition-sheet">
      <div className="max-w-md mx-auto">
        <div className={cn(
          "bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-100/80 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          expanded ? "max-h-[320px]" : "max-h-[56px]"
        )}>
          <button onClick={() => { triggerHaptic('light'); setExpanded(v => !v); }}
            className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-50 transition"
            data-testid="nutrition-sheet-toggle">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-orange-500" />
                <span className="text-[13px] font-semibold text-slate-800 font-display">{store.calories}<span className="text-slate-400 text-[11px] font-normal ml-0.5">kcal</span></span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-2">
                <Droplets size={14} className="text-cyan-500" />
                <span className="text-[13px] font-semibold text-slate-800 font-display">{Math.round(store.water / 100) / 10}<span className="text-slate-400 text-[11px] font-normal ml-0.5">L</span></span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${calPct}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 font-body">{calPct}%</span>
              </div>
            </div>
            {expanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
          </button>

          {expanded && (
            <div className="px-4 pb-4 animate-in fade-in slide-in-from-bottom-2 duration-300" data-testid="nutrition-sheet-expanded">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-100/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider font-body">Calories</span>
                    <Flame size={12} className="text-orange-500" />
                  </div>
                  <p className="text-lg font-bold text-slate-900 font-display">{store.calories} <span className="text-[11px] font-normal text-slate-400">/ {calTarget}</span></p>
                  <div className="w-full h-1.5 bg-orange-100 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all"
                      style={{ width: `${calPct}%` }} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-3 border border-cyan-100/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wider font-body">Water</span>
                    <Droplets size={12} className="text-cyan-500" />
                  </div>
                  <p className="text-lg font-bold text-slate-900 font-display">{store.water} <span className="text-[11px] font-normal text-slate-400">/ {waterTarget}ml</span></p>
                  <div className="w-full h-1.5 bg-cyan-100 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all"
                      style={{ width: `${waterPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {macros.map((macro, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2" data-testid={`sheet-macro-${macro.label.toLowerCase()}`}>
                    <MiniRing value={macro.value} target={macro.target} color={macro.color} />
                    <div>
                      <p className="text-[10px] text-slate-400 font-body">{macro.label}</p>
                      <p className="text-[12px] font-bold text-slate-800 font-display">{macro.value}<span className="text-[9px] text-slate-400 font-normal">{macro.unit}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
