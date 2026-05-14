import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, Play, ChevronRight, Clock, Flame, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = ["All", "Gym", "Cardio", "Bodyweight", "Yoga"];

type Workout = {
  id: string;
  title: string;
  category: string;
  duration: string;
  calories: string;
  difficulty: string;
  image: string | null;
  exerciseIds: string[] | null;
};

export default function Workouts() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkouts = async () => {
      setLoading(true);
      try {
        const url = activeCategory === "All"
          ? '/api/workout-plans'
          : `/api/workout-plans?category=${activeCategory}`;
        const res = await fetch(url);
        const data = await res.json();
        const mapped: Workout[] = (data || []).map((w: any) => ({
          id: w.id,
          title: w.title,
          category: w.category,
          duration: w.durationMinutes ? `${w.durationMinutes} min` : '--',
          calories: w.estimatedCalories ? `${w.estimatedCalories} kcal` : '--',
          difficulty: w.difficulty,
          image: w.image,
          exerciseIds: w.exerciseIds,
        }));
        setWorkouts(mapped);
      } catch {
        setWorkouts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkouts();
  }, [activeCategory]);

  const featured = workouts[0];

  return (
    <div className="p-5 pb-24 space-y-5 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Workouts</h1>
          <p className="text-gray-400 text-sm mt-0.5">Find your perfect training session</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
          <Search size={16} className="text-gray-500" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
              activeCategory === cat 
                ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" 
                : "bg-white text-gray-500 border-gray-200"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {featured && (
            <Link href={`/workout/${featured.id}`}>
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden group cursor-pointer shadow-sm">
                <img 
                  src={featured.image || "/images/exercise-bench-press.png"} 
                  alt="Featured" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                
                <div className="absolute bottom-0 left-0 p-5 w-full">
                  <span className="px-2 py-0.5 bg-[#1e3a5f] text-white text-[10px] font-bold uppercase rounded mb-2 inline-block">Trending</span>
                  <h2 className="text-xl font-bold text-white mb-1">{featured.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-white/80">
                    <span className="flex items-center gap-1"><Clock size={12} /> {featured.duration}</span>
                    <span className="flex items-center gap-1"><Flame size={12} /> {featured.calories}</span>
                  </div>
                </div>
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play fill="currentColor" className="text-white w-5 h-5 ml-1" />
                </div>
              </div>
            </Link>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-gray-900 font-semibold">Recommended for you</h3>
              <span className="text-xs text-gray-400">View All</span>
            </div>

            {workouts.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No workouts found</p>
            )}

            {workouts.map(workout => (
              <Link key={workout.id} href={`/workout/${workout.id}`}>
                <div className="glass-card p-3 rounded-2xl flex gap-4 cursor-pointer group">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 relative flex-shrink-0">
                    <img src={workout.image || "/images/exercise-bench-press.png"} alt={workout.title} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 py-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-gray-900 font-medium text-sm leading-tight">{workout.title}</h4>
                        <ChevronRight size={16} className="text-gray-300" />
                      </div>
                      <p className="text-gray-400 text-xs mt-1">{workout.category} - {workout.difficulty}</p>
                    </div>
                    
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                        <Clock size={10} /> {workout.duration}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                        <Flame size={10} /> {workout.calories}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
