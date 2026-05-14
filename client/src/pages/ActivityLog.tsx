import { useState, useEffect } from "react";
import { useStore, authFetch } from "@/lib/store";
import { useLocation } from "wouter";
import { 
  ChevronLeft, Save, Loader2, Timer, Dumbbell, 
  CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ACTIVITY_CONFIGS: Record<string, {
  icon: string;
  fields: { key: string; label: string; type: string; unit?: string; min?: number; max?: number; step?: number }[];
}> = {
  boxing: {
    icon: "🥊",
    fields: [
      { key: "duration_min", label: "Duration", type: "number", unit: "min", min: 1, max: 180 },
      { key: "rounds", label: "Rounds", type: "number", min: 1, max: 30 },
      { key: "round_duration_min", label: "Round Duration", type: "number", unit: "min", min: 1, max: 5 },
      { key: "type", label: "Type (bag/sparring/shadow)", type: "text" },
      { key: "rpe", label: "Effort (RPE)", type: "range", min: 1, max: 10 },
    ],
  },
  swimming: {
    icon: "🏊",
    fields: [
      { key: "distance_m", label: "Distance", type: "number", unit: "meters", min: 0, max: 10000, step: 25 },
      { key: "duration_min", label: "Duration", type: "number", unit: "min", min: 1, max: 300 },
      { key: "laps", label: "Laps", type: "number", min: 0, max: 200 },
      { key: "pace_per_100m", label: "Pace per 100m", type: "text", unit: "mm:ss" },
      { key: "rpe", label: "Effort (RPE)", type: "range", min: 1, max: 10 },
    ],
  },
  running: {
    icon: "🏃",
    fields: [
      { key: "distance_km", label: "Distance", type: "number", unit: "km", min: 0, max: 100, step: 0.1 },
      { key: "duration_min", label: "Duration", type: "number", unit: "min", min: 1, max: 600 },
      { key: "pace_per_km", label: "Pace per km", type: "text", unit: "mm:ss" },
      { key: "rpe", label: "Effort (RPE)", type: "range", min: 1, max: 10 },
    ],
  },
  cycling: {
    icon: "🚴",
    fields: [
      { key: "distance_km", label: "Distance", type: "number", unit: "km", min: 0, max: 300, step: 0.5 },
      { key: "duration_min", label: "Duration", type: "number", unit: "min", min: 1, max: 600 },
      { key: "avg_speed_kmh", label: "Avg Speed", type: "number", unit: "km/h", min: 0, max: 80, step: 0.5 },
      { key: "rpe", label: "Effort (RPE)", type: "range", min: 1, max: 10 },
    ],
  },
  strength_training: {
    icon: "🏋️",
    fields: [
      { key: "duration_min", label: "Duration", type: "number", unit: "min", min: 1, max: 300 },
      { key: "exercises_count", label: "Exercises", type: "number", min: 1, max: 30 },
      { key: "total_sets", label: "Total Sets", type: "number", min: 1, max: 100 },
      { key: "notes", label: "Notes", type: "text" },
      { key: "rpe", label: "Effort (RPE)", type: "range", min: 1, max: 10 },
    ],
  },
  yoga: {
    icon: "🧘",
    fields: [
      { key: "duration_min", label: "Duration", type: "number", unit: "min", min: 1, max: 180 },
      { key: "style", label: "Style", type: "text" },
      { key: "rpe", label: "Effort (RPE)", type: "range", min: 1, max: 10 },
    ],
  },
  walking: {
    icon: "🚶",
    fields: [
      { key: "distance_km", label: "Distance", type: "number", unit: "km", min: 0, max: 50, step: 0.1 },
      { key: "duration_min", label: "Duration", type: "number", unit: "min", min: 1, max: 600 },
      { key: "steps", label: "Steps", type: "number", min: 0, max: 100000 },
    ],
  },
  bodyweight: {
    icon: "💪",
    fields: [
      { key: "duration_min", label: "Duration", type: "number", unit: "min", min: 1, max: 180 },
      { key: "exercises_count", label: "Exercises", type: "number", min: 1, max: 20 },
      { key: "total_sets", label: "Total Sets", type: "number", min: 1, max: 80 },
      { key: "rpe", label: "Effort (RPE)", type: "range", min: 1, max: 10 },
    ],
  },
};

const ALL_TYPES = Object.keys(ACTIVITY_CONFIGS);

export default function ActivityLog() {
  const store = useStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>(ALL_TYPES[0]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [planActivities, setPlanActivities] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get("type");
    if (typeParam && ALL_TYPES.includes(typeParam)) {
      setSelectedType(typeParam);
    }
  }, []);

  useEffect(() => {
    if (!store.userId) return;
    const loadPlanActivities = async () => {
      try {
        const res = await authFetch(`/api/plan/latest/${store.userId}`);
        if (res.ok) {
          const plan = await res.json();
          if (plan?.planJson?.activity_types_detected) {
            setPlanActivities(plan.planJson.activity_types_detected.map((a: any) => a.type));
          }
        }
      } catch {}
    };
    loadPlanActivities();
  }, [store.userId]);

  const config = ACTIVITY_CONFIGS[selectedType];
  const displayTypes = planActivities.length > 0 ? planActivities.filter(t => ACTIVITY_CONFIGS[t]) : ALL_TYPES;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/activity/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: store.userId,
          activityType: selectedType,
          durationMin: formData.duration_min || null,
          metadataJson: formData,
        }),
      });
      if (res.ok) {
        setSaved(true);
        toast({ title: "Activity Logged!", description: `${selectedType.replace(/_/g, " ")} session saved.` });
        setTimeout(() => navigate("/"), 1500);
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to save activity", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center animate-in zoom-in duration-300">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Activity Logged!</h2>
          <p className="text-sm text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="activity-log-screen">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8f] px-4 py-4 safe-pad-top">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-white/70" data-testid="btn-back-activity">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-white font-bold">Log Activity</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {displayTypes.map((type) => {
            const cfg = ACTIVITY_CONFIGS[type];
            if (!cfg) return null;
            return (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setFormData({}); }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  selectedType === type
                    ? "bg-[#1e3a5f] text-white shadow-md"
                    : "bg-gray-100 text-gray-600"
                )}
                data-testid={`btn-activity-type-${type}`}
              >
                <span>{cfg.icon}</span>
                <span className="capitalize">{type.replace(/_/g, " ")}</span>
              </button>
            );
          })}
        </div>

        {config && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-5xl">{config.icon}</span>
              <h2 className="text-lg font-bold text-gray-900 mt-2 capitalize">{selectedType.replace(/_/g, " ")}</h2>
            </div>

            {config.fields.map((field) => (
              <div key={field.key} className="space-y-1.5" data-testid={`field-${field.key}`}>
                <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                  <span>{field.label}</span>
                  {field.unit && <span className="text-xs text-gray-400">{field.unit}</span>}
                </label>
                {field.type === "range" ? (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">Easy</span>
                      <span className="text-lg font-bold text-[#1e3a5f]">{formData[field.key] || 5}</span>
                      <span className="text-xs text-gray-400">Max</span>
                    </div>
                    <input
                      type="range"
                      min={field.min || 1}
                      max={field.max || 10}
                      value={formData[field.key] || 5}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1e3a5f]"
                    />
                  </div>
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 border border-gray-100"
                  />
                )}
              </div>
            ))}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8f] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
              data-testid="btn-save-activity"
            >
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> Saving...</>
              ) : (
                <><Save size={16} /> Log Activity</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
