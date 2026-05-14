import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Compass, BarChart2, User, Plus, X, Camera, Utensils, Dumbbell, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { NutritionSheet } from "./NutritionSheet";
import { triggerHaptic } from "@/lib/capacitor";

interface LayoutProps {
  children: React.ReactNode;
}

function FABMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, navigate] = useLocation();

  if (!open) return null;

  const actions = [
    { label: "Log Meal", icon: <Utensils size={20} />, color: "bg-orange-500", path: "/dashboard/log?section=meal" },
    { label: "Scan Food", icon: <Camera size={20} />, color: "bg-blue-600", path: "/scanner" },
    { label: "Log Exercise", icon: <Dumbbell size={20} />, color: "bg-emerald-500", path: "/dashboard/log?section=exercise" },
    { label: "Log Water", icon: <Droplets size={20} />, color: "bg-cyan-500", path: "/dashboard/log?section=water" },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] animate-in fade-in duration-200" onClick={onClose} data-testid="fab-overlay" />
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-300" data-testid="fab-menu">
        {actions.map((action, i) => (
          <button key={i}
            onClick={() => { triggerHaptic('light'); onClose(); navigate(action.path); }}
            className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3.5 shadow-xl border border-slate-100/80 active:scale-95 transition-all min-w-[180px]"
            style={{ animationDelay: `${i * 50}ms` }}
            data-testid={`fab-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}>
            <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center text-white`}>
              {action.icon}
            </div>
            <span className="text-[14px] font-semibold text-slate-800 font-display">{action.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [fabOpen, setFabOpen] = useState(false);

  const navItems = [
    { icon: Home, activeIcon: Home, label: "Today", path: "/dashboard/today" },
    { icon: Compass, activeIcon: Compass, label: "Plan", path: "/dashboard/journey" },
    { type: "fab" as const },
    { icon: BarChart2, activeIcon: BarChart2, label: "Stats", path: "/dashboard/analytics" },
    { icon: User, activeIcon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900 pb-[72px]">
      <main className="max-w-md mx-auto min-h-screen">
        {children}
      </main>

      {!location.startsWith("/dashboard/log") && !location.startsWith("/scanner") && <NutritionSheet />}
      <FABMenu open={fabOpen} onClose={() => setFabOpen(false)} />

      <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-2 safe-pad-bottom">
        <div className="max-w-md mx-auto">
          <nav className="flex items-center justify-around px-2 py-1.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-md shadow-black/6 border border-slate-100/60">
            {navItems.map((item, idx) => {
              if ('type' in item && item.type === 'fab') {
                return (
                  <button key="fab" onClick={() => { triggerHaptic('medium'); setFabOpen(v => !v); }}
                    className={cn(
                      "w-11 h-11 -mt-5 rounded-xl flex items-center justify-center shadow-md transition-all duration-300 active:scale-90",
                      fabOpen
                        ? "bg-slate-800 rotate-45 shadow-slate-300"
                        : "bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-200/50"
                    )}
                    data-testid="fab-button">
                    {fabOpen ? <X size={18} className="text-white -rotate-45" /> : <Plus size={20} className="text-white" />}
                  </button>
                );
              }
              const navItem = item as { icon: any; activeIcon: any; label: string; path: string };
              const isActive = location === navItem.path || (navItem.path === "/dashboard/today" && (location === "/" || location === ""));
              const Icon = isActive ? navItem.activeIcon : navItem.icon;
              return (
                <Link key={navItem.path} href={navItem.path}>
                  <div className="flex flex-col items-center gap-0 cursor-pointer min-w-[40px] py-1" onClick={() => triggerHaptic('selection')} data-testid={`nav-${navItem.label.toLowerCase()}`}>
                    <Icon size={20} className={cn("transition-colors", isActive ? "text-orange-500" : "text-slate-400")} />
                    <span className={cn("text-[9px] font-medium transition-colors font-body mt-0.5", isActive ? "text-orange-500" : "text-slate-400")}>
                      {navItem.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
