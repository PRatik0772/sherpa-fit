import { useRoute } from "wouter";
import { ArrowLeft, Clock, Flame, Activity, ListOrdered, Play, Loader2, Heart, Brain } from "lucide-react";
import { Link } from "wouter";
import { CustomVideoPlayer } from "@/components/CustomVideoPlayer";
import { MuscleViewer3D } from "@/components/MuscleViewer3D";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useStore, authFetch } from "@/lib/store";

type WorkoutData = {
  id: string;
  title: string;
  description: string;
  duration: string;
  calories: string;
  difficulty: string;
  category: string;
  videoUrl: string;
  muscles: string[];
  steps: { title: string; sets: string; reps: string; rest: string }[];
};

export default function WorkoutDetail() {
  const [, params] = useRoute("/workout/:id");
  const id = params?.id;
  const { user } = useStore();
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<{ predictedCalories: number; targetHeartRate: number; maxHeartRate: number; confidence: string; matchedProfiles: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [planRes, exercisesRes] = await Promise.all([
          authFetch(`/api/workout-plans/${id}`),
          authFetch('/api/exercises'),
        ]);
        const plan = await planRes.json();
        const allExercises = await exercisesRes.json();

        const exerciseMap = new Map((allExercises || []).map((e: any) => [e.id, e]));
        const planExercises = (plan.exerciseIds || [])
          .map((eid: string) => exerciseMap.get(eid))
          .filter(Boolean);

        const muscles = Array.from(new Set(
          planExercises.flatMap((e: any) => e.primaryMuscles || [])
        )) as string[];

        const firstExWithVideo = planExercises.find((e: any) => e.videoUrl);

        setWorkoutData({
          id: plan.id,
          title: plan.title,
          description: plan.description || '',
          duration: plan.durationMinutes ? `${plan.durationMinutes} min` : '—',
          calories: plan.estimatedCalories ? `${plan.estimatedCalories}` : '—',
          difficulty: plan.difficulty,
          category: plan.category,
          videoUrl: firstExWithVideo?.videoUrl || '',
          muscles,
          steps: planExercises.map((e: any) => ({
            title: e.name,
            sets: String(e.sets || '—'),
            reps: e.reps || '—',
            rest: e.restSeconds ? `${e.restSeconds}s` : '—',
          })),
        });

        const workoutTypeMap: Record<string, string> = { Gym: "Strength", Cardio: "Cardio", Bodyweight: "HIIT" };
        const workoutType = workoutTypeMap[plan.category] || "Strength";
        const duration = (plan.durationMinutes || 45) / 60;

        try {
          const predRes = await authFetch("/api/fitness/predict-calories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              age: user?.age || 25,
              weight: user?.weight || 70,
              height: user?.height || 1.75,
              gender: "Male",
              workoutType,
              duration,
            }),
          });
          const pred = await predRes.json();
          setPrediction(pred);
        } catch {}

      } catch (e) {
        console.error('Failed to load workout:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  if (loading || !workoutData) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-700" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-24 animate-in slide-in-from-right duration-500">
      <div className="p-4 flex items-center gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-20 border-b border-gray-100">
        <Link href="/workouts">
          <div className="p-2 rounded-full hover:bg-gray-100 text-gray-900 cursor-pointer">
            <ArrowLeft size={20} />
          </div>
        </Link>
        <h1 className="text-lg font-bold text-gray-900 flex-1 truncate">{workoutData.title}</h1>
      </div>

      <div className="px-4 mb-6">
        <CustomVideoPlayer url={workoutData.videoUrl} poster="/images/exercise-bench-press.png" />
      </div>

      <div className="px-6 space-y-8">
        <div>
           <div className="flex gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-gray-700/10 text-gray-700 text-[10px] font-bold uppercase tracking-wider">{workoutData.difficulty}</span>
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider">{workoutData.category}</span>
           </div>
           <h2 className="text-2xl font-bold text-gray-900 mb-4">{workoutData.title}</h2>
           
           <Link href={`/workout/${workoutData.id}/session`}>
             <button className="w-full py-4 bg-gray-900 rounded-xl font-bold text-white mb-6 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Play fill="currentColor" size={20} /> START WORKOUT
             </button>
           </Link>

           <div className="flex justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100" data-testid="card-workout-stats">
              <div className="text-center">
                 <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                 <p className="text-gray-900 font-bold">{workoutData.duration}</p>
                 <p className="text-[10px] text-gray-500 uppercase">Time</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                 <Flame className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                 <p className="text-gray-900 font-bold" data-testid="text-predicted-calories">{prediction ? prediction.predictedCalories : workoutData.calories}</p>
                 <p className="text-[10px] text-gray-500 uppercase">{prediction ? "AI Cal" : "Cals"}</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                 <Heart className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                 <p className="text-gray-900 font-bold" data-testid="text-target-heart-rate">{prediction ? prediction.targetHeartRate : 130}</p>
                 <p className="text-[10px] text-gray-500 uppercase">BPM</p>
              </div>
           </div>

           {prediction && prediction.matchedProfiles > 0 && (
             <div className="flex items-center gap-2 mt-2 px-1" data-testid="text-ai-prediction-info">
               <Brain size={12} className="text-gray-700" />
               <span className="text-[10px] text-gray-500">
                 AI prediction based on {prediction.matchedProfiles} similar profiles • {prediction.confidence} confidence • Target HR: {prediction.targetHeartRate}-{prediction.maxHeartRate} bpm
               </span>
             </div>
           )}
        </div>

        <div>
           <h3 className="text-gray-900 font-bold mb-3 flex items-center gap-2">
              <Activity size={16} className="text-gray-700" /> Target Muscles (3D)
           </h3>
           <MuscleViewer3D highlightedMuscles={workoutData.muscles} />
           <p className="text-xs text-gray-500 mt-2 leading-relaxed">{workoutData.description}</p>
        </div>

        <div>
           <h3 className="text-gray-900 font-bold mb-3 flex items-center gap-2">
              <ListOrdered size={16} className="text-gray-700" /> Routine
           </h3>
           <div className="space-y-3">
              {workoutData.steps.map((step, index) => (
                 <div key={index} className="glass-card p-4 rounded-xl flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold border border-gray-200">
                       {index + 1}
                    </div>
                    <div className="flex-1">
                       <h4 className="text-gray-900 font-medium text-sm">{step.title}</h4>
                       <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          <span>{step.sets} Sets</span>
                          <span>•</span>
                          <span>{step.reps} Reps</span>
                          <span>•</span>
                          <span>{step.rest} Rest</span>
                       </div>
                    </div>
                    <div className="w-10 h-10 rounded bg-gray-50" />
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
