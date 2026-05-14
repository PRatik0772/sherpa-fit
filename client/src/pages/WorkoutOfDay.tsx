import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  ChevronLeft,
  Clock,
  Flame,
  Play,
  Pause,
  Dumbbell,
  Timer,
  ChevronDown,
  ChevronUp,
  Target,
  Loader2,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/store";

type WodExercise = {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  primaryMuscles: string[];
  videoUrl: string | null;
  instructions: string;
};

type WodData = {
  dayIndex: number;
  dayName: string;
  title: string;
  description: string;
  difficulty: string;
  durationMinutes: number;
  estimatedCalories: number;
  focusMuscles: string[];
  exercises: WodExercise[];
};

function ExerciseVideoPlayer({ videoUrl, name }: { videoUrl: string; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[320px]">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        loop
        muted={muted}
        playsInline
        preload="metadata"
        onEnded={() => setPlaying(false)}
        data-testid={`video-${name.toLowerCase().replace(/\s+/g, '-')}`}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          onClick={togglePlay}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all",
            playing
              ? "bg-black/30 backdrop-blur-sm opacity-0 hover:opacity-100"
              : "bg-white/90 shadow-lg"
          )}
          data-testid={`btn-play-${name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {playing ? (
            <Pause size={22} className="text-white" />
          ) : (
            <Play size={22} className="text-[#1e3a5f] ml-0.5" />
          )}
        </button>
      </div>
      <button
        onClick={() => setMuted(!muted)}
        className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
      >
        {muted ? (
          <VolumeX size={14} className="text-white" />
        ) : (
          <Volume2 size={14} className="text-white" />
        )}
      </button>
    </div>
  );
}

function ExerciseCard({ exercise, index }: { exercise: WodExercise; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const difficultyColor = (muscle: string) => {
    const colors: Record<string, string> = {
      Chest: "bg-red-100 text-red-700",
      Triceps: "bg-orange-100 text-orange-700",
      Shoulders: "bg-yellow-100 text-yellow-700",
      Core: "bg-green-100 text-green-700",
      Abs: "bg-green-100 text-green-700",
      Quadriceps: "bg-blue-100 text-blue-700",
      Glutes: "bg-purple-100 text-purple-700",
      Hamstrings: "bg-indigo-100 text-indigo-700",
      Calves: "bg-pink-100 text-pink-700",
      Back: "bg-teal-100 text-teal-700",
      Biceps: "bg-cyan-100 text-cyan-700",
      "Full Body": "bg-[#1e3a5f]/10 text-[#1e3a5f]",
      Legs: "bg-blue-100 text-blue-700",
      "Hip Flexors": "bg-amber-100 text-amber-700",
      Obliques: "bg-lime-100 text-lime-700",
      "Lower Back": "bg-emerald-100 text-emerald-700",
    };
    return colors[muscle] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" data-testid={`exercise-card-${index}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 active:bg-gray-50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#1e3a5f]/70 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 text-left">
          <h4 className="font-semibold text-gray-900 text-sm">{exercise.name}</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {exercise.sets} sets × {exercise.reps} reps · {exercise.restSeconds}s rest
          </p>
        </div>
        <div className="flex items-center gap-2">
          {exercise.videoUrl && (
            <div className="w-6 h-6 rounded-full bg-[#c41e3a]/10 flex items-center justify-center">
              <Play size={10} className="text-[#c41e3a] ml-0.5" />
            </div>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {exercise.videoUrl && (
            <ExerciseVideoPlayer videoUrl={exercise.videoUrl} name={exercise.name} />
          )}

          <div className="flex flex-wrap gap-1.5">
            {exercise.primaryMuscles.map((muscle) => (
              <span
                key={muscle}
                className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", difficultyColor(muscle))}
              >
                {muscle}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-[#1e3a5f]">{exercise.sets}</p>
              <p className="text-[10px] text-gray-500">Sets</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-[#c41e3a]">{exercise.reps}</p>
              <p className="text-[10px] text-gray-500">Reps</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-[#8fbc8f]">{exercise.restSeconds}s</p>
              <p className="text-[10px] text-gray-500">Rest</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">{exercise.instructions}</p>
        </div>
      )}
    </div>
  );
}

export default function WorkoutOfDay() {
  const [wod, setWod] = useState<WodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchWod = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch("/api/wod/today");
      if (!res.ok) throw new Error("Failed to fetch WOD");
      const data = await res.json();
      setWod(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWod();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin" />
      </div>
    );
  }

  if (error || !wod) {
    return (
      <div className="p-5 pb-24 space-y-4">
        <Link href="/">
          <button className="flex items-center gap-1 text-sm text-gray-500" data-testid="btn-back-wod">
            <ChevronLeft size={18} /> Back
          </button>
        </Link>
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <span className="text-4xl block mb-3">😕</span>
          <h3 className="font-bold text-gray-900 mb-2">Couldn't load today's workout</h3>
          <button
            onClick={fetchWod}
            className="mt-3 px-4 py-2 bg-[#1e3a5f] text-white rounded-full text-sm font-medium flex items-center gap-2 mx-auto"
            data-testid="btn-retry-wod"
          >
            <RotateCcw size={14} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const diffBadgeColor =
    wod.difficulty === "Advanced"
      ? "bg-red-100 text-red-700"
      : wod.difficulty === "Intermediate"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-green-100 text-green-700";

  const videosCount = wod.exercises.filter((e) => e.videoUrl).length;

  return (
    <div className="pb-24 animate-in fade-in duration-500">
      <div className="relative bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#0f2640] p-5 pt-3 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <button className="flex items-center gap-1 text-white/70 text-sm" data-testid="btn-back-wod">
              <ChevronLeft size={18} /> Home
            </button>
          </Link>
          <span className="text-xs text-white/50 font-medium">{wod.dayName}</span>
        </div>

        <div className="mb-1">
          <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Workout of the Day</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }} data-testid="wod-title">
          {wod.title}
        </h1>
        <p className="text-sm text-white/70 leading-relaxed mb-4">{wod.description}</p>

        <div className="flex items-center gap-3 flex-wrap">
          <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold", diffBadgeColor)}>
            {wod.difficulty}
          </span>
          <div className="flex items-center gap-1 text-white/60 text-xs">
            <Clock size={12} />
            <span>{wod.durationMinutes} min</span>
          </div>
          <div className="flex items-center gap-1 text-white/60 text-xs">
            <Flame size={12} />
            <span>~{wod.estimatedCalories} kcal</span>
          </div>
          <div className="flex items-center gap-1 text-white/60 text-xs">
            <Dumbbell size={12} />
            <span>{wod.exercises.length} exercises</span>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Focus Areas</p>
            <div className="flex flex-wrap gap-1.5">
              {wod.focusMuscles.map((m) => (
                <span key={m} className="px-2 py-0.5 bg-[#1e3a5f]/10 rounded-full text-[10px] font-medium text-[#1e3a5f]">
                  {m}
                </span>
              ))}
            </div>
          </div>
          {videosCount > 0 && (
            <div className="flex items-center gap-1.5 bg-[#c41e3a]/10 px-3 py-1.5 rounded-full">
              <Play size={12} className="text-[#c41e3a]" />
              <span className="text-[11px] font-semibold text-[#c41e3a]">{videosCount} Videos</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 mt-5">
        <h2 className="text-base font-bold text-gray-900 mb-3" data-testid="exercises-heading">
          Exercises
        </h2>
        <div className="space-y-3">
          {wod.exercises.map((exercise, i) => (
            <ExerciseCard key={i} exercise={exercise} index={i} />
          ))}
        </div>
      </div>

      <div className="px-5 mt-6">
        <div className="bg-gradient-to-r from-[#8fbc8f] to-[#6fa86f] rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Target size={18} />
            <h3 className="font-bold">Pro Tips</h3>
          </div>
          <ul className="text-sm opacity-90 space-y-1 list-disc list-inside">
            <li>Warm up for 3-5 minutes before starting</li>
            <li>Focus on proper form over speed</li>
            <li>Stay hydrated throughout the workout</li>
            <li>Cool down and stretch after finishing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
