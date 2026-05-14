import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Clock, Flame, ChevronRight, Activity, Play, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/store";
import { CustomVideoPlayer } from "@/components/CustomVideoPlayer";
import { MuscleMap } from "@/components/MuscleMap";
import { useState, useEffect } from "react";

type SessionStep = {
  id: number;
  title: string;
  reps: string;
  sets: number;
  videoUrl: string;
  muscles: string[];
};

type SessionData = {
  id: string;
  title: string;
  totalSteps: number;
  duration: string;
  steps: SessionStep[];
};

export default function WorkoutSession() {
  const [, params] = useRoute("/workout/:id/session");
  const id = params?.id;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [, setLocation] = useLocation();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

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

        setSessionData({
          id: plan.id,
          title: plan.title,
          totalSteps: planExercises.length,
          duration: plan.durationMinutes ? `${plan.durationMinutes} min` : '—',
          steps: planExercises.map((e: any, idx: number) => ({
            id: idx + 1,
            title: e.name,
            reps: e.reps || '—',
            sets: e.sets || 3,
            videoUrl: e.videoUrl || '',
            muscles: e.primaryMuscles || [],
          })),
        });
      } catch (e) {
        console.error('Failed to load session:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading || !sessionData || sessionData.steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-700" />
      </div>
    );
  }

  const currentStep = sessionData.steps[currentStepIndex];
  const isLastStep = currentStepIndex === sessionData.steps.length - 1;

  const handleNext = () => {
    if (!completedSteps.includes(currentStep.id)) {
        setCompletedSteps([...completedSteps, currentStep.id]);
    }

    if (isLastStep) {
        setLocation("/workouts");
    } else {
        setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
        setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <div className="px-4 py-4 flex items-center justify-between z-10 bg-gradient-to-b from-white/80 to-transparent">
        <button onClick={() => setLocation(`/workout/${sessionData.id}`)} className="text-gray-400 hover:text-gray-900">
            <ArrowLeft />
        </button>
        <div className="text-center">
            <h2 className="text-gray-900 font-bold text-sm">{sessionData.title}</h2>
            <p className="text-gray-500 text-xs">Step {currentStepIndex + 1} of {sessionData.totalSteps}</p>
        </div>
        <div className="w-6" />
      </div>

      <div className="flex-1 flex flex-col relative">
         <div className="h-[45vh] relative bg-gray-50">
             <CustomVideoPlayer url={currentStep.videoUrl} />
         </div>

         <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-10 border-t border-gray-200 flex flex-col">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-6" />
            
            <div className="px-6 flex-1 overflow-y-auto pb-24">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentStep.title}</h1>
                        <div className="flex gap-3">
                            <span className="bg-gray-700/10 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {currentStep.sets} Sets
                            </span>
                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {currentStep.reps} Reps
                            </span>
                        </div>
                    </div>
                    <div className="w-16 h-20 opacity-80">
                        <MuscleMap highlightedMuscles={currentStep.muscles} className="border-0 bg-transparent" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Track Sets</h3>
                    {Array.from({ length: currentStep.sets }).map((_, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                            <span className="text-gray-500 font-medium">Set {idx + 1}</span>
                            <div className="flex items-center gap-4">
                                <div className="text-gray-900 font-bold text-lg">{currentStep.reps} <span className="text-xs font-normal text-gray-500">reps</span></div>
                                <button className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-900 hover:border-gray-900 hover:text-white transition-colors">
                                    <CheckCircle2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 flex gap-4">
                <button 
                    onClick={handlePrev}
                    disabled={currentStepIndex === 0}
                    className="w-14 h-14 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center disabled:opacity-30"
                >
                    <ArrowLeft className="text-gray-900" />
                </button>
                <button 
                    onClick={handleNext}
                    className="flex-1 h-14 rounded-full bg-gray-900 text-white font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                >
                    {isLastStep ? "Finish Workout" : "Next Exercise"} <ChevronRight />
                </button>
            </div>
         </div>
      </div>
    </div>
  );
}
