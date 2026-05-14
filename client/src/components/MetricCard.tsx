import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  total?: number;
  icon: LucideIcon;
  color: string;
  trend?: string;
  className?: string;
}

export function MetricCard({ 
  label, 
  value, 
  unit, 
  total, 
  icon: Icon, 
  color,
  trend,
  className 
}: MetricCardProps) {
  const percentage = typeof value === 'number' && total ? (value / total) * 100 : 0;

  return (
    <div className={cn("glass-card p-4 rounded-2xl relative overflow-hidden group", className)}>
      <div className="flex justify-between items-start mb-2">
        <div className={cn("p-2 rounded-xl bg-opacity-10", `bg-[${color}]`)} style={{ backgroundColor: `${color}20` }}>
          <Icon size={20} style={{ color: color }} />
        </div>
        {trend && (
          <span className="text-xs font-medium bg-white/5 px-2 py-1 rounded-full text-zinc-400">
            {trend}
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-heading text-white">{value}</span>
          {unit && <span className="text-sm text-zinc-500 font-medium">{unit}</span>}
        </div>
      </div>

      {total && (
        <div className="mt-3 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: color 
            }}
          />
        </div>
      )}
      
      {/* Subtle glow effect */}
      <div 
        className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}