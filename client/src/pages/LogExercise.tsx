import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Play, Dumbbell, MessageSquare, Calculator, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useStore, authFetch } from "@/lib/store";

type ExerciseType = "run" | "weights" | "describe" | "manual" | null;

function IntensityDuration({ type, onBack }: { type: "run" | "weights"; onBack: () => void }) {
  const [intensity, setIntensity] = useState<"high" | "medium" | "low">("medium");
  const [duration, setDuration] = useState(30);
  const [logging, setLogging] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { logExercise } = useStore();

  const intensities = [
    { key: "high" as const, label: "High", desc: type === "run" ? "Sprint, hill runs" : "Heavy weights, low reps" },
    { key: "medium" as const, label: "Medium", desc: type === "run" ? "Jogging, moderate pace" : "Moderate weights" },
    { key: "low" as const, label: "Low", desc: type === "run" ? "Walking, light jog" : "Light weights, high reps" },
  ];

  const durations = [15, 30, 60, 90];

  const handleLog = async () => {
    const cals = intensity === "high" ? duration * 12 : intensity === "medium" ? duration * 8 : duration * 5;
    setLogging(true);
    try {
      await logExercise({
        exerciseName: type === "run" ? "Running" : "Weight Lifting",
        caloriesBurned: cals,
        duration,
        intensity,
      });
      toast({ title: "Exercise Logged", description: `${type === "run" ? "Run" : "Weight lifting"} - ${duration} min, ${cals} cal burned`, duration: 3000 });
      setLocation("/");
    } catch {
      toast({ title: "Error", description: "Could not log exercise. Please try again.", variant: "destructive" });
    }
    setLogging(false);
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      <h2 className="text-lg font-bold text-gray-900">
        {type === "run" ? "🏃 Run" : "🏋️ Weight Lifting"}
      </h2>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Set intensity</h3>
        <div className="space-y-2">
          {intensities.map(i => (
            <button
              key={i.key}
              onClick={() => setIntensity(i.key)}
              className={cn(
                "w-full p-4 rounded-xl text-left transition-all border",
                intensity === i.key
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                  : "bg-white text-gray-700 border-gray-200"
              )}
            >
              <p className="font-medium text-sm">{i.label}</p>
              <p className={cn("text-xs mt-0.5", intensity === i.key ? "text-white/70" : "text-gray-400")}>{i.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Duration</h3>
        <div className="grid grid-cols-4 gap-2">
          {durations.map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={cn(
                "py-3 rounded-xl text-sm font-medium transition-all border",
                duration === d
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                  : "bg-white text-gray-700 border-gray-200"
              )}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleLog}
        disabled={logging}
        className={cn(
          "w-full py-4 rounded-xl font-semibold text-sm active:scale-95 transition-all flex items-center justify-center gap-2",
          logging ? "bg-gray-200 text-gray-400" : "bg-[#c41e3a] text-white"
        )}
        data-testid="button-log-exercise-confirm"
      >
        {logging && <Loader2 size={16} className="animate-spin" />}
        {logging ? "Logging..." : "Log Exercise"}
      </button>
    </div>
  );
}

function DescribeExercise({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState("");
  const [logging, setLogging] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { logExercise, userId } = useStore();

  const handleLog = async () => {
    if (!text.trim()) return;
    setLogging(true);
    try {
      const res = await authFetch('/api/chat/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `I just did this workout: ${text}`, userId }),
      });
      const result = await res.json();
      const cals = result.calories || 200;
      await logExercise({ exerciseName: result.name || "Workout", caloriesBurned: cals });
      toast({ title: "Exercise Logged", description: result.response || `${cals} calories burned`, duration: 3000 });
    } catch {
      await logExercise({ exerciseName: "Workout", caloriesBurned: 200 });
      toast({ title: "Exercise Logged", description: "Workout logged with estimated calories", duration: 3000 });
    }
    setLogging(false);
    setLocation("/");
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">✍️ Describe your workout</h2>
        <div className="flex items-center gap-1.5 mb-4">
          <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-[10px] font-semibold rounded-full">Created by AI</span>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe workout time, intensity, etc. For example: '30 minute intense run followed by 20 minutes of weight training'"
        className="w-full h-40 p-4 bg-white rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        data-testid="input-describe-exercise"
      />

      <button
        onClick={handleLog}
        disabled={!text.trim() || logging}
        className={cn(
          "w-full py-4 rounded-xl font-semibold text-sm active:scale-95 transition-all flex items-center justify-center gap-2",
          text.trim() && !logging ? "bg-[#c41e3a] text-white" : "bg-gray-200 text-gray-400"
        )}
        data-testid="button-describe-confirm"
      >
        {logging && <Loader2 size={16} className="animate-spin" />}
        {logging ? "Analyzing..." : "Log Exercise"}
      </button>
    </div>
  );
}

function ManualExercise({ onBack }: { onBack: () => void }) {
  const [cals, setCals] = useState("");
  const [logging, setLogging] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { logExercise } = useStore();

  const handleLog = async () => {
    if (!cals) return;
    setLogging(true);
    await logExercise({ exerciseName: "Manual Exercise", caloriesBurned: parseInt(cals) });
    setLogging(false);
    toast({ title: "Exercise Logged", description: `${cals} calories burned`, duration: 3000 });
    setLocation("/");
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      <h2 className="text-lg font-bold text-gray-900">⚡ Manual Entry</h2>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Calories burned</label>
        <input
          type="number"
          value={cals}
          onChange={(e) => setCals(e.target.value)}
          placeholder="Enter calories"
          className="w-full p-4 bg-white rounded-xl border border-gray-200 text-2xl font-bold text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          data-testid="input-manual-calories"
        />
      </div>

      <button
        onClick={handleLog}
        disabled={!cals || logging}
        className={cn(
          "w-full py-4 rounded-xl font-semibold text-sm active:scale-95 transition-all flex items-center justify-center gap-2",
          cals && !logging ? "bg-[#c41e3a] text-white" : "bg-gray-200 text-gray-400"
        )}
        data-testid="button-manual-confirm"
      >
        {logging && <Loader2 size={16} className="animate-spin" />}
        {logging ? "Logging..." : "Log Exercise"}
      </button>
    </div>
  );
}

export default function LogExercise() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<ExerciseType>(null);

  const options = [
    { key: "run" as const, emoji: "🏃", label: "Run", icon: Play },
    { key: "weights" as const, emoji: "🏋️", label: "Weight lifting", icon: Dumbbell },
    { key: "describe" as const, emoji: "✍️", label: "Describe", icon: MessageSquare },
    { key: "manual" as const, emoji: "⚡", label: "Manual", icon: Calculator },
  ];

  return (
    <div data-testid="log-exercise-page">
      <div className="p-5 pb-20 space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/")} className="p-2 rounded-full bg-white text-gray-500 shadow-sm active:scale-95 transition-all" data-testid="button-back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Log Exercise</h1>
        </div>

        {!selected && (
          <div className="space-y-3">
            {options.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSelected(opt.key)}
                className="w-full glass-card p-5 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-transform"
                data-testid={`exercise-option-${opt.key}`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-base font-medium text-gray-900">{opt.label}</span>
                <ChevronRight size={16} className="text-gray-300 ml-auto" />
              </button>
            ))}
          </div>
        )}

        {(selected === "run" || selected === "weights") && (
          <IntensityDuration type={selected} onBack={() => setSelected(null)} />
        )}

        {selected === "describe" && (
          <DescribeExercise onBack={() => setSelected(null)} />
        )}

        {selected === "manual" && (
          <ManualExercise onBack={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}
