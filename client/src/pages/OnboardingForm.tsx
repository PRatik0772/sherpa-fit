import { useState } from "react";
import { useStore, authFetch } from "@/lib/store";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/capacitor";
import { ChevronLeft } from "lucide-react";

const TOTAL_STEPS = 10;

const CUISINES = ["Indian", "Nepali", "Chinese", "Thai", "Mediterranean", "Mexican", "Japanese", "American", "Italian", "Korean"];

type FormData = {
  gender: string; age: string; heightCm: string; weightKgCurrent: string; weightKgTarget: string;
  goalDescription: string; goalTimelineDays: string; dietaryPreferences: string; cuisines: string[];
  allergies: string[]; dislikes: string; budgetLevel: string; cookingTimeAvailable: string;
  activityLevel: string; preferredExercises: string[]; equipmentAvailable: string[];
  injuriesLimitations: string; sleepHoursAvg: string; waterTargetMl: string; notesFreeText: string;
};

function ValueSlider({ value, onChange, min, max, step, unit }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit: string; label?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <div className="text-center mb-12">
        <span className="text-7xl font-bold text-slate-900 font-display tabular-nums">{value}</span>
        <span className="text-2xl text-slate-400 ml-2 font-body">{unit}</span>
      </div>
      <div className="w-full px-4">
        <input type="range" min={min} max={max} step={step || 1} value={value}
          onChange={e => { onChange(Number(e.target.value)); triggerHaptic('selection'); }}
          className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white"
          data-testid="slider-input"
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs text-slate-400 font-body">{min}{unit}</span>
          <span className="text-xs text-slate-400 font-body">{max}{unit}</span>
        </div>
      </div>
    </div>
  );
}

function SelectionCard({ label, description, selected, onClick, icon }: {
  label: string; description?: string; selected: boolean; onClick: () => void; icon?: string;
}) {
  return (
    <button type="button" onClick={() => { onClick(); triggerHaptic('selection'); }}
      className={cn(
        "w-full text-left px-5 py-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98]",
        selected
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-slate-50 text-slate-700 border-transparent hover:bg-slate-100"
      )}
      data-testid={`card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && <span className="text-xl">{icon}</span>}
          <div>
            <p className={cn("text-[15px] font-semibold font-display", selected ? "text-white" : "text-slate-900")}>{label}</p>
            {description && <p className={cn("text-[12px] mt-0.5 font-body", selected ? "text-white/70" : "text-slate-400")}>{description}</p>}
          </div>
        </div>
        {selected && (
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center" data-testid={`summary-${label.toLowerCase()}`}>
      <span className="text-sm text-slate-400 font-body">{label}</span>
      <span className="text-sm font-semibold text-slate-900 font-display text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function OnboardingForm() {
  const store = useStore();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    gender: "", age: "25", heightCm: "170", weightKgCurrent: "65", weightKgTarget: "60",
    goalDescription: "", goalTimelineDays: "90", dietaryPreferences: "non-veg",
    cuisines: ["Indian"], allergies: [], dislikes: "", budgetLevel: "medium",
    cookingTimeAvailable: "30", activityLevel: "", preferredExercises: [],
    equipmentAvailable: [], injuriesLimitations: "", sleepHoursAvg: "7",
    waterTargetMl: "2500", notesFreeText: "",
  });

  const set = (key: keyof FormData, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const canProceed = () => {
    switch (step) {
      case 0: return !!form.gender;
      case 1: return !!form.age;
      case 2: return !!form.heightCm;
      case 3: return !!form.weightKgCurrent;
      case 4: return !!form.goalDescription;
      case 5: return !!form.weightKgTarget;
      case 6: return !!form.activityLevel;
      case 7: return !!form.dietaryPreferences;
      case 8: return form.cuisines.length > 0;
      case 9: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!store.userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        userId: store.userId, gender: form.gender, age: parseInt(form.age) || null,
        heightCm: parseFloat(form.heightCm) || null, weightKgCurrent: parseFloat(form.weightKgCurrent) || null,
        weightKgTarget: parseFloat(form.weightKgTarget) || null, goalDescription: form.goalDescription,
        goalTimelineDays: parseInt(form.goalTimelineDays) || 90, dietaryPreferences: form.dietaryPreferences,
        cuisines: form.cuisines, allergies: form.allergies,
        dislikes: form.dislikes ? form.dislikes.split(",").map(s => s.trim()) : [],
        budgetLevel: form.budgetLevel, cookingTimeAvailable: parseInt(form.cookingTimeAvailable) || 30,
        activityLevel: form.activityLevel, equipmentAvailable: form.equipmentAvailable,
        injuriesLimitations: form.injuriesLimitations || null, sleepHoursAvg: parseFloat(form.sleepHoursAvg) || 7,
        waterTargetMl: parseInt(form.waterTargetMl) || 2500, notesFreeText: form.notesFreeText || null, completed: true,
      };
      const res = await authFetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to save");
      await authFetch(`/api/users/${store.userId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingComplete: true, gender: form.gender, age: parseInt(form.age) || null,
          height: parseFloat(form.heightCm) || null, weight: parseFloat(form.weightKgCurrent) || null,
          targetWeight: parseFloat(form.weightKgTarget) || null, activityLevel: form.activityLevel,
          dietType: form.dietaryPreferences, cuisinePreference: form.cuisines.join(", "),
          dailyCalorieTarget: Math.round((parseFloat(form.weightKgCurrent) || 70) * 30),
        }),
      });
      const planRes = await authFetch("/api/plan/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: store.userId }) });
      const planData = await planRes.json();
      if (planData.planId) { navigate(`/plan-creating/${planData.planId}`); } else { throw new Error("Failed to start plan generation"); }
    } catch (err: any) { setError(err.message); setSubmitting(false); }
  };

  const handleNext = () => {
    triggerHaptic('light');
    if (step === TOTAL_STEPS - 1) {
      handleSubmit();
    } else {
      setStep(s => s + 1);
    }
  };

  const stepTitles = [
    "What's your gender?",
    "How old are you?",
    "How tall are you?",
    "What's your current weight?",
    "What's your main goal?",
    "What's your target weight?",
    "How active are you?",
    "What's your diet preference?",
    "Which cuisines do you love?",
    "Your personalized plan",
  ];

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-3 transition-all duration-300" data-testid="step-gender">
            {[
              { value: "Male", icon: "👨" },
              { value: "Female", icon: "👩" },
              { value: "Other", icon: "🧑" },
            ].map(opt => (
              <SelectionCard key={opt.value} label={opt.value} selected={form.gender === opt.value}
                onClick={() => set("gender", opt.value)} icon={opt.icon} />
            ))}
          </div>
        );
      case 1:
        return (
          <div className="transition-all duration-300" data-testid="step-age">
            <ValueSlider value={parseInt(form.age) || 25} onChange={v => set("age", String(v))}
              min={16} max={65} unit=" years" />
          </div>
        );
      case 2:
        return (
          <div className="transition-all duration-300" data-testid="step-height">
            <ValueSlider value={parseInt(form.heightCm) || 170} onChange={v => set("heightCm", String(v))}
              min={140} max={210} unit=" cm" />
          </div>
        );
      case 3:
        return (
          <div className="transition-all duration-300" data-testid="step-weight">
            <ValueSlider value={parseInt(form.weightKgCurrent) || 65} onChange={v => {
              set("weightKgCurrent", String(v));
              if (!form.weightKgTarget || form.weightKgTarget === "60") {
                set("weightKgTarget", String(Math.max(40, v - 5)));
              }
            }} min={40} max={150} unit=" kg" />
          </div>
        );
      case 4:
        return (
          <div className="space-y-3 transition-all duration-300" data-testid="step-goal">
            {[
              { value: "Lose weight", label: "Lose Weight", desc: "Reduce body fat, get leaner", icon: "🔥" },
              { value: "Build muscle", label: "Build Muscle", desc: "Gain lean mass, get stronger", icon: "💪" },
              { value: "Maintain fitness", label: "Maintain Fitness", desc: "Stay healthy, keep current physique", icon: "⚖️" },
              { value: "Improve endurance", label: "Improve Endurance", desc: "Better stamina, cardio fitness", icon: "🏃" },
              { value: "Get healthier", label: "Get Healthier", desc: "Better nutrition, more energy", icon: "🌿" },
            ].map(opt => (
              <SelectionCard key={opt.value} label={opt.label} description={opt.desc}
                selected={form.goalDescription === opt.value}
                onClick={() => set("goalDescription", opt.value)} icon={opt.icon} />
            ))}
          </div>
        );
      case 5:
        return (
          <div className="transition-all duration-300" data-testid="step-target-weight">
            <ValueSlider value={parseInt(form.weightKgTarget) || 60} onChange={v => set("weightKgTarget", String(v))}
              min={40} max={150} unit=" kg" />
          </div>
        );
      case 6:
        return (
          <div className="space-y-3 transition-all duration-300" data-testid="step-activity">
            {[
              { value: "sedentary", label: "Sedentary", desc: "Desk job, little to no exercise", icon: "🪑" },
              { value: "lightly_active", label: "Lightly Active", desc: "Light exercise 1-2 days/week", icon: "🚶" },
              { value: "moderate", label: "Moderately Active", desc: "Exercise 3-5 days/week", icon: "🏋️" },
              { value: "very_active", label: "Very Active", desc: "Hard exercise 6-7 days/week", icon: "🔥" },
              { value: "athlete", label: "Athlete", desc: "Training twice a day or more", icon: "🏆" },
            ].map(opt => (
              <SelectionCard key={opt.value} label={opt.label} description={opt.desc}
                selected={form.activityLevel === opt.value}
                onClick={() => set("activityLevel", opt.value)} icon={opt.icon} />
            ))}
          </div>
        );
      case 7:
        return (
          <div className="space-y-3 transition-all duration-300" data-testid="step-diet">
            {[
              { value: "non-veg", label: "Non-Vegetarian", desc: "Includes meat, fish, eggs, dairy", icon: "🥩" },
              { value: "vegetarian", label: "Vegetarian", desc: "No meat or fish, includes eggs & dairy", icon: "🥗" },
              { value: "vegan", label: "Vegan", desc: "Plant-based only", icon: "🌱" },
              { value: "eggetarian", label: "Eggetarian", desc: "Vegetarian + eggs", icon: "🥚" },
              { value: "pescatarian", label: "Pescatarian", desc: "Vegetarian + fish & seafood", icon: "🐟" },
            ].map(opt => (
              <SelectionCard key={opt.value} label={opt.label} description={opt.desc}
                selected={form.dietaryPreferences === opt.value}
                onClick={() => set("dietaryPreferences", opt.value)} icon={opt.icon} />
            ))}
          </div>
        );
      case 8:
        return (
          <div className="transition-all duration-300" data-testid="step-cuisines">
            <div className="flex flex-wrap gap-2">
              {CUISINES.map(cuisine => {
                const active = form.cuisines.includes(cuisine);
                return (
                  <button key={cuisine} type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      set("cuisines", active ? form.cuisines.filter(c => c !== cuisine) : [...form.cuisines, cuisine]);
                    }}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95",
                      active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                    )}
                    data-testid={`cuisine-${cuisine.toLowerCase()}`}>
                    {active && "✓ "}{cuisine}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 9:
        return (
          <div className="space-y-4 transition-all duration-300" data-testid="step-summary">
            <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
              <SummaryRow label="Gender" value={form.gender} />
              <SummaryRow label="Age" value={`${form.age} years`} />
              <SummaryRow label="Height" value={`${form.heightCm} cm`} />
              <SummaryRow label="Weight" value={`${form.weightKgCurrent} kg → ${form.weightKgTarget} kg`} />
              <SummaryRow label="Goal" value={form.goalDescription} />
              <SummaryRow label="Activity" value={form.activityLevel} />
              <SummaryRow label="Diet" value={form.dietaryPreferences} />
              <SummaryRow label="Cuisines" value={form.cuisines.join(", ")} />
            </div>
            {error && (
              <div className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-xl font-body" data-testid="text-error">
                {error}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="onboarding-form">
      <div className="px-5 pt-14 pb-2">
        <div className="flex items-center gap-4 mb-4">
          {step > 0 && (
            <button onClick={() => { setStep(s => s - 1); triggerHaptic('light'); }}
              className="w-8 h-8 flex items-center justify-center"
              data-testid="button-back">
              <ChevronLeft className="w-6 h-6 text-slate-900" />
            </button>
          )}
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden" data-testid="progress-bar">
          <div className="h-full bg-slate-900 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 pt-8 pb-6 overflow-y-auto">
        <h1 className="text-3xl font-bold text-slate-900 font-display leading-tight mb-8">
          {stepTitles[step]}
        </h1>

        <div className="flex-1">
          {renderStep()}
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 bg-white">
        <button onClick={handleNext} disabled={!canProceed() || (step === TOTAL_STEPS - 1 && submitting)}
          className={cn(
            "w-full py-4 rounded-2xl text-[16px] font-semibold font-display transition-all duration-200 active:scale-[0.98]",
            canProceed()
              ? "bg-slate-900 text-white shadow-lg"
              : "bg-slate-200 text-slate-400"
          )}
          data-testid={step === TOTAL_STEPS - 1 ? "button-generate-plan" : "button-next"}>
          {step === TOTAL_STEPS - 1 ? (submitting ? "Generating..." : "Generate My Plan") : "Continue"}
        </button>
      </div>
    </div>
  );
}
