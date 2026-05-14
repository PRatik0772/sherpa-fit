import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MuscleMapProps {
  highlightedMuscles: string[]; // e.g., ['chest', 'triceps', 'front-delts']
  className?: string;
}

export function MuscleMap({ highlightedMuscles, className }: MuscleMapProps) {
  // Muscle Groups Mapping (simplified coordinates for demo)
  // In a real production app, this would be an interactive SVG
  const muscles = [
    { id: 'chest', label: 'Pectorals', cx: '50%', cy: '28%', r: '8%', color: '#3b82f6' },
    { id: 'abs', label: 'Abdominals', cx: '50%', cy: '42%', r: '6%', color: '#3b82f6' },
    { id: 'shoulders', label: 'Deltoids', cx: '32%', cy: '25%', r: '5%', color: '#3b82f6' },
    { id: 'shoulders-r', label: 'Deltoids', cx: '68%', cy: '25%', r: '5%', color: '#3b82f6' },
    { id: 'biceps', label: 'Biceps', cx: '28%', cy: '35%', r: '4%', color: '#3b82f6' },
    { id: 'biceps-r', label: 'Biceps', cx: '72%', cy: '35%', r: '4%', color: '#3b82f6' },
    { id: 'quads', label: 'Quadriceps', cx: '40%', cy: '65%', r: '7%', color: '#3b82f6' },
    { id: 'quads-r', label: 'Quadriceps', cx: '60%', cy: '65%', r: '7%', color: '#3b82f6' },
  ];

  return (
    <div className={cn("relative aspect-[3/4] bg-zinc-950 rounded-2xl overflow-hidden border border-white/5", className)}>
      <img 
        src="/images/muscle-map-base.png" 
        alt="Muscle Map" 
        className="absolute inset-0 w-full h-full object-contain opacity-40 mix-blend-luminosity"
      />
      
      {/* Interactive Overlay */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
         <defs>
            <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
         </defs>
         
         {muscles.map((muscle) => {
           // Basic mapping logic for demo purposes
           // 'shoulders' maps to both left and right delts, etc.
           const isHighlighted = highlightedMuscles.some(m => muscle.id.includes(m));
           
           if (!isHighlighted) return null;

           return (
             <motion.circle
               key={muscle.id}
               cx={muscle.cx}
               cy={muscle.cy}
               r={muscle.r}
               fill={muscle.color}
               opacity="0.5"
               filter="url(#glow)"
               initial={{ scale: 0, opacity: 0 }}
               animate={{ scale: 1, opacity: 0.5 }}
               transition={{ duration: 0.5, ease: "easeOut" }}
             >
                <animate 
                    attributeName="opacity" 
                    values="0.4;0.7;0.4" 
                    dur="2s" 
                    repeatCount="indefinite" 
                />
             </motion.circle>
           );
         })}
      </svg>

      {/* Labels */}
      <div className="absolute top-4 left-4">
        <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-2">Target Muscles</h4>
        <div className="flex flex-wrap gap-1">
          {highlightedMuscles.map(m => (
            <span key={m} className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-medium border border-primary/20">
              {m.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}