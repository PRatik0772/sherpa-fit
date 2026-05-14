import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useStore, authFetch } from "@/lib/store";
import { CheckCircle2, Loader2, AlertCircle, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/capacitor";

const STAGES = [
  { key: "Analyzing goals", label: "Analyzing your goals", icon: "🎯" },
  { key: "Calculating calories & macros", label: "Calculating calories & macros", icon: "🔢" },
  { key: "Designing meal plan", label: "Creating your meal plan", icon: "🍽️" },
  { key: "Creating workout structure", label: "Building workout routine", icon: "💪" },
  { key: "Creating hydration schedule", label: "Setting hydration schedule", icon: "💧" },
  { key: "Generating milestones", label: "Setting milestones", icon: "🏆" },
  { key: "Creating analytics framework", label: "Preparing analytics", icon: "📊" },
  { key: "Finalizing journey", label: "Finalizing your plan", icon: "✨" },
];

export default function PlanCreating() {
  const [, params] = useRoute("/plan-creating/:planId");
  const [, navigate] = useLocation();
  const store = useStore();
  const planId = params?.planId;
  const [currentStage, setCurrentStage] = useState("Analyzing goals");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"generating" | "ready" | "failed">("generating");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [stallSeconds, setStallSeconds] = useState(0);
  const lastProgressRef = useRef(0);
  const lastProgressTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!planId) return;
    const startTime = Date.now();
    const TIMEOUT = 150000;
    const interval = setInterval(async () => {
      if (Date.now() - startTime > TIMEOUT) {
        clearInterval(interval);
        setStatus("failed");
        setErrorMsg("Plan generation is taking too long. You can retry or go to your dashboard.");
        return;
      }
      try {
        const res = await authFetch(`/api/plan/${planId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        setCurrentStage(data.stage || "Analyzing goals");
        setProgress(data.progress || 0);
        setStatus(data.status);

        if (data.progress !== lastProgressRef.current) {
          lastProgressRef.current = data.progress;
          lastProgressTimeRef.current = Date.now();
          setStallSeconds(0);
        } else {
          const elapsed = Math.floor((Date.now() - lastProgressTimeRef.current) / 1000);
          setStallSeconds(elapsed);
        }

        if (data.status === "ready") {
          clearInterval(interval);
          triggerHaptic('success');
          setTimeout(() => navigate("/dashboard/today"), 2000);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setErrorMsg(data.message || "Plan generation failed. Please try again.");
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [planId, navigate]);

  const handleRetry = async () => {
    if (!store.userId) return;
    setRetrying(true);
    triggerHaptic('medium');
    try {
      const res = await authFetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: store.userId }),
      });
      const data = await res.json();
      if (data.planId) {
        navigate(`/plan-creating/${data.planId}`);
        window.location.reload();
      } else {
        setErrorMsg("Could not start plan generation. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection.");
    }
    setRetrying(false);
  };

  const handleSkip = () => {
    triggerHaptic('light');
    navigate("/dashboard/today");
  };

  const currentIdx = STAGES.findIndex(s => s.key === currentStage);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6" data-testid="plan-creating-screen">
      {status === "generating" && (
        <>
          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-slate-900 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-display">Creating Your Plan</h1>
            <p className="text-slate-400 text-sm mt-2 font-body">Jung is crafting your personalized journey</p>
          </div>

          <div className="w-full max-w-xs mb-10">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }} />
            </div>
            <p className="text-slate-400 text-xs text-center mt-2 font-body">{progress}%</p>
          </div>

          <div className="w-full max-w-xs space-y-1">
            {STAGES.map((stage, idx) => {
              const isActive = idx === currentIdx;
              const isComplete = idx < currentIdx;
              const isPending = idx > currentIdx;
              return (
                <div key={stage.key}
                  className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-500",
                    isActive && "bg-slate-50",
                  )} data-testid={`stage-${stage.key}`}>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm",
                    isComplete ? "bg-slate-900" : isActive ? "bg-slate-100" : "bg-slate-50")}>
                    {isComplete ? <CheckCircle2 size={16} className="text-white" /> :
                      isActive ? <span className="animate-pulse">{stage.icon}</span> :
                      <span className="opacity-30">{stage.icon}</span>}
                  </div>
                  <span className={cn("text-sm font-body transition-all",
                    isComplete ? "text-slate-900 font-semibold" : isActive ? "text-slate-900 font-semibold" : "text-slate-300")}>
                    {stage.label}
                  </span>
                  {isActive && <Loader2 size={14} className="text-slate-400 animate-spin ml-auto" />}
                </div>
              );
            })}
          </div>

          {stallSeconds > 30 && (
            <div className="mt-8 text-center">
              <p className="text-slate-400 text-xs font-body mb-3">This is taking a bit longer than usual...</p>
              <button onClick={handleSkip}
                className="text-slate-500 text-sm font-medium underline font-body"
                data-testid="btn-skip-waiting">
                Go to dashboard
              </button>
            </div>
          )}
        </>
      )}

      {status === "ready" && (
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-900 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Your Plan is Ready!</h1>
          <p className="text-slate-400 text-sm mt-2 font-body">Redirecting to your dashboard...</p>
        </div>
      )}

      {status === "failed" && (
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Something went wrong</h1>
          <p className="text-slate-400 text-sm mt-2 mb-8 font-body max-w-xs">{errorMsg}</p>
          <div className="space-y-3 w-full max-w-xs">
            <button onClick={handleRetry} disabled={retrying}
              className="w-full py-4 rounded-2xl bg-slate-900 text-white font-semibold text-sm font-display flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50"
              data-testid="btn-retry-plan">
              {retrying ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              {retrying ? "Retrying..." : "Try Again"}
            </button>
            <button onClick={handleSkip}
              className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-semibold text-sm font-display active:scale-[0.98] transition"
              data-testid="btn-skip-to-dashboard">
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
