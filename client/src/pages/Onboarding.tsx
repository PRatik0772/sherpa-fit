import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Sparkles, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const CLIENT_STEPS = [
  { id: "basics", title: "Basics" },
  { id: "goal", title: "Your Goal" },
  { id: "lifestyle", title: "Lifestyle" },
  { id: "food", title: "Food Preferences" },
  { id: "training", title: "Training & Confirm" },
];

const COACH_STEPS = [
  { id: "basics", title: "Coach Setup" },
];


const GOALS = [
  { label: "Lose Fat", emoji: "🔥", value: "lose fat" },
  { label: "Build Muscle", emoji: "💪", value: "build muscle" },
  { label: "Improve Health", emoji: "💚", value: "improve health" },
  { label: "Athletic Performance", emoji: "⚡", value: "athletic performance" },
];

const ACTIVITY_LEVELS = [
  { label: "Sedentary", desc: "Desk job, little exercise", value: "sedentary", multiplier: 1.2 },
  { label: "Light", desc: "Light exercise 1-3 days/wk", value: "light", multiplier: 1.375 },
  { label: "Moderate", desc: "Moderate exercise 3-5 days/wk", value: "moderate", multiplier: 1.55 },
  { label: "Active", desc: "Hard exercise 6-7 days/wk", value: "active", multiplier: 1.725 },
  { label: "Very Active", desc: "Intense daily training", value: "very active", multiplier: 1.9 },
];

const CUISINES = ["Indian", "Nepali", "Chinese", "Cuban", "Any"];

const DIET_TYPES = [
  { label: "Vegetarian", emoji: "🥬", value: "vegetarian" },
  { label: "Non-Veg", emoji: "🍗", value: "non-veg" },
  { label: "Eggetarian", emoji: "🥚", value: "eggetarian" },
  { label: "Vegan", emoji: "🌱", value: "vegan" },
];

const ALLERGIES = ["Dairy", "Gluten", "Nuts", "Soy", "Shellfish", "Eggs", "None"];
const EQUIPMENT = ["Dumbbells", "Resistance Bands", "Full Gym", "Bodyweight Only", "Yoga Mat", "Pull-up Bar"];
const TIMELINES = [
  { label: "7 days", value: "7" },
  { label: "14 days", value: "14" },
  { label: "21 days", value: "21" },
  { label: "30 days", value: "30" },
  { label: "60 days", value: "60" },
  { label: "90 days", value: "90" },
];
const JOB_TYPES = [
  { label: "Active", desc: "On your feet most of the day", value: "active" },
  { label: "Desk", desc: "Mostly sitting", value: "desk" },
  { label: "Mixed", desc: "A bit of both", value: "mixed" },
];
const BUDGET_LEVELS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];
const COOKING_TIMES = [
  { label: "15 min", value: "15" },
  { label: "30 min", value: "30" },
  { label: "45 min", value: "45" },
  { label: "60+ min", value: "60" },
];
const TRAINING_PREFERENCES = [
  { label: "Cardio", emoji: "🏃", value: "cardio" },
  { label: "Strength", emoji: "🏋️", value: "strength" },
  { label: "Mixed", emoji: "⚡", value: "mixed" },
];

function calculateTargets(
  weight: number,
  height: number,
  age: number,
  gender: string,
  goal: string,
  activityLevel: string
) {
  const genderMod = gender === "Female" ? -161 : 5;
  const bmr = 10 * weight + 6.25 * height - 5 * age + genderMod;
  const mult = ACTIVITY_LEVELS.find((a) => a.value === activityLevel)?.multiplier || 1.55;
  let tdee = Math.round(bmr * mult);

  if (goal === "lose fat") tdee -= 500;
  else if (goal === "build muscle") tdee += 300;

  const proteinPerKg = goal === "build muscle" ? 2.0 : 1.6;
  const protein = Math.round(proteinPerKg * weight);
  const fatCal = Math.round(tdee * 0.27);
  const fat = Math.round(fatCal / 9);
  const carbsCal = tdee - protein * 4 - fatCal;
  const carbs = Math.round(carbsCal / 4);

  return { calories: Math.max(tdee, 1200), protein, carbs, fat };
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { setOnboardingData, user: storeUser, userId } = useStore();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const selectedRole = storeUser?.role || "client";
  const [submitting, setSubmitting] = useState(false);

  const prefillName =
    storeUser?.name ||
    storeUser?.firstName ||
    "";

  const [formData, setFormData] = useState({
    name: prefillName,
    gender: "Male",
    weight: "",
    targetWeight: "",
    height: "",
    age: "",
    goal: "",
    goalDescription: "",
    goalTimelineDays: "30",
    activityLevel: "moderate",
    sleepHours: "7",
    jobType: "desk",
    cuisines: [] as string[],
    dietType: "non-veg",
    allergies: [] as string[],
    dislikes: "",
    budgetLevel: "medium",
    cookingTime: "30",
    equipment: [] as string[],
    injuries: "",
    trainingPreference: "mixed",
  });

  useEffect(() => {
    if (prefillName && !formData.name) {
      setFormData((prev) => ({ ...prev, name: prefillName }));
    }
  }, [prefillName]);

  const updateForm = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: "cuisines" | "allergies" | "equipment", item: string) => {
    setFormData((prev) => {
      const arr = prev[key];
      if (key === "allergies" && item === "None") {
        return { ...prev, [key]: arr.includes("None") ? [] : ["None"] };
      }
      if (key === "allergies" && arr.includes("None")) {
        return { ...prev, [key]: [item] };
      }
      return {
        ...prev,
        [key]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item],
      };
    });
  };

  const isCoachOrAdmin = selectedRole === "coach" || selectedRole === "admin";
  const STEPS = isCoachOrAdmin ? COACH_STEPS : CLIENT_STEPS;

  const canProceed = () => {
    if (isCoachOrAdmin) {
      return formData.name.trim().length > 0;
    }
    switch (step) {
      case 0:
        return formData.name.trim().length > 0 && formData.weight && formData.height && formData.age;
      case 1:
        return formData.goal !== "";
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return !submitting;
      default:
        return true;
    }
  };

  const handleGeneratePlan = async () => {
    if (!userId) return;
    setSubmitting(true);

    const targets = calculateTargets(
      Number(formData.weight) || 70,
      Number(formData.height) || 170,
      Number(formData.age) || 25,
      formData.gender,
      formData.goal || "improve health",
      formData.activityLevel
    );

    try {
      const { authFetch } = await import("@/lib/store");
      await authFetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          gender: formData.gender,
          age: Number(formData.age),
          heightCm: Number(formData.height),
          weightKgCurrent: Number(formData.weight),
          weightKgTarget: Number(formData.targetWeight) || undefined,
          goalTimelineDays: Number(formData.goalTimelineDays),
          goalDescription: formData.goalDescription || formData.goal,
          activityLevel: formData.activityLevel,
          sleepHoursAvg: Number(formData.sleepHours),
          dietaryPreferences: formData.dietType,
          cuisines: formData.cuisines,
          allergies: formData.allergies.filter((a) => a !== "None"),
          dislikes: formData.dislikes ? formData.dislikes.split(",").map((s) => s.trim()).filter(Boolean) : [],
          budgetLevel: formData.budgetLevel,
          cookingTimeAvailable: Number(formData.cookingTime),
          equipmentAvailable: formData.equipment,
          injuriesLimitations: formData.injuries,
          completed: true,
        }),
      }).catch(() => {});

      authFetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }).catch(() => {});

      await setOnboardingData({
        name: formData.name,
        age: Number(formData.age) || undefined,
        height: Number(formData.height) || undefined,
        weight: Number(formData.weight) || undefined,
        targetWeight: Number(formData.targetWeight) || undefined,
        gender: formData.gender,
        motivation: formData.goal,
        dietType: formData.dietType,
        cuisinePreference: formData.cuisines.join(", ") || "any",
        activityLevel: formData.activityLevel,
        dailyCalorieTarget: targets.calories,
        proteinTarget: targets.protein,
        carbsTarget: targets.carbs,
        fatTarget: targets.fat,
        role: selectedRole,
        onboardingComplete: true,
      });

      setLocation("/");
    } catch (e) {
      console.error("Onboarding submit failed", e);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (isCoachOrAdmin && step === 0) {
      await setOnboardingData({
        name: formData.name,
        onboardingComplete: true,
      });
      setLocation("/coach-dashboard");
      return;
    }

    if (step < STEPS.length - 1) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  const CheckIcon = () => (
    <div className="w-5 h-5 bg-[#1e3a5f] rounded-full flex items-center justify-center flex-shrink-0">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col safe-pad-top safe-pad-bottom">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          data-testid="button-back"
          onClick={handleBack}
          className={cn("p-2 rounded-full hover:bg-gray-100 transition-colors", step === 0 && "invisible")}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i <= step ? "bg-[#1e3a5f] w-8" : "bg-gray-200 w-6"
              )}
            />
          ))}
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col px-6 pb-6 overflow-y-auto">
        {step === 0 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mt-6 mb-6">
              <div className="w-16 h-16 bg-[#1e3a5f]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-[#1e3a5f]" size={28} />
              </div>
              <h1 className="text-2xl font-bold mb-1">
                {isCoachOrAdmin ? `Welcome, Coach` : "Tell us about yourself"}
              </h1>
              <p className="text-gray-500 text-sm">
                {isCoachOrAdmin ? "Just one more step to get started" : "We'll use this to personalize your plan"}
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <Label className="text-sm font-medium text-gray-700">Your Name</Label>
                <Input
                  data-testid="input-name"
                  placeholder="Enter your name"
                  className="h-12 bg-white border-gray-200 rounded-xl text-base focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                  value={formData.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
              </div>

              {!isCoachOrAdmin && (
                <>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Gender</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {["Male", "Female", "Other"].map((g) => (
                        <button
                          key={g}
                          data-testid={`button-gender-${g.toLowerCase()}`}
                          onClick={() => updateForm("gender", g)}
                          className={cn(
                            "p-3 rounded-xl border text-sm font-medium transition-all",
                            formData.gender === g
                              ? "border-[#1e3a5f] bg-[#1e3a5f]/10 text-[#1e3a5f]"
                              : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Age</Label>
                    <Input
                      data-testid="input-age"
                      type="number"
                      placeholder="25"
                      className="h-12 bg-white border-gray-200 rounded-xl text-lg focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                      value={formData.age}
                      onChange={(e) => updateForm("age", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Height (cm)</Label>
                      <Input
                        data-testid="input-height"
                        type="number"
                        placeholder="170"
                        className="h-12 bg-white border-gray-200 rounded-xl text-lg focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                        value={formData.height}
                        onChange={(e) => updateForm("height", e.target.value)}
                      />
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Weight (kg)</Label>
                      <Input
                        data-testid="input-weight"
                        type="number"
                        placeholder="70"
                        className="h-12 bg-white border-gray-200 rounded-xl text-lg focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                        value={formData.weight}
                        onChange={(e) => updateForm("weight", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-2xl font-bold mt-6 mb-1">Your Goal</h1>
            <p className="text-gray-500 text-sm mb-6">What do you want to achieve?</p>

            <div className="space-y-3 mb-6">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  data-testid={`button-goal-${g.value.replace(/\s/g, "-")}`}
                  onClick={() => updateForm("goal", g.value)}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3",
                    formData.goal === g.value
                      ? "border-[#1e3a5f] bg-[#1e3a5f]/10"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <span className={cn("font-medium", formData.goal === g.value ? "text-[#1e3a5f]" : "text-gray-700")}>{g.label}</span>
                  {formData.goal === g.value && <div className="ml-auto"><CheckIcon /></div>}
                </button>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
              <Label className="text-sm font-medium text-gray-700">Target Weight (kg)</Label>
              <Input
                data-testid="input-target-weight"
                type="number"
                placeholder="65"
                className="h-12 bg-white border-gray-200 rounded-xl text-lg focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                value={formData.targetWeight}
                onChange={(e) => updateForm("targetWeight", e.target.value)}
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
              <Label className="text-sm font-medium text-gray-700">Timeline</Label>
              <div className="grid grid-cols-3 gap-2">
                {TIMELINES.map((t) => (
                  <button
                    key={t.value}
                    data-testid={`button-timeline-${t.value}`}
                    onClick={() => updateForm("goalTimelineDays", t.value)}
                    className={cn(
                      "p-2.5 rounded-xl border text-sm font-medium transition-all",
                      formData.goalTimelineDays === t.value
                        ? "border-[#1e3a5f] bg-[#1e3a5f]/10 text-[#1e3a5f]"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <Label className="text-sm font-medium text-gray-700">Describe your goal (optional)</Label>
              <Textarea
                data-testid="input-goal-description"
                placeholder="E.g., I want to lose belly fat and feel more energetic..."
                className="bg-white border-gray-200 rounded-xl text-sm focus:border-[#1e3a5f] focus:ring-[#1e3a5f] min-h-[80px]"
                value={formData.goalDescription}
                onChange={(e) => updateForm("goalDescription", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-2xl font-bold mt-6 mb-1">Your Lifestyle</h1>
            <p className="text-gray-500 text-sm mb-6">Help us understand your daily routine</p>

            <div className="space-y-3 mb-6">
              <Label className="text-sm font-medium text-gray-700">Activity Level</Label>
              {ACTIVITY_LEVELS.map((a) => (
                <button
                  key={a.value}
                  data-testid={`button-activity-${a.value.replace(/\s/g, "-")}`}
                  onClick={() => updateForm("activityLevel", a.value)}
                  className={cn(
                    "w-full p-3 rounded-xl border text-left transition-all",
                    formData.activityLevel === a.value
                      ? "border-[#1e3a5f] bg-[#1e3a5f]/10"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <span className={cn("text-sm font-medium", formData.activityLevel === a.value ? "text-[#1e3a5f]" : "text-gray-700")}>{a.label}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>
                </button>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">Average Sleep Hours</Label>
                <span className="text-lg font-bold text-[#1e3a5f]">{formData.sleepHours}h</span>
              </div>
              <Slider
                data-testid="slider-sleep"
                min={4}
                max={10}
                step={0.5}
                value={[Number(formData.sleepHours)]}
                onValueChange={(val) => updateForm("sleepHours", String(val[0]))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>4h</span>
                <span>10h</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <Label className="text-sm font-medium text-gray-700">Job Type</Label>
              <div className="grid grid-cols-3 gap-3">
                {JOB_TYPES.map((j) => (
                  <button
                    key={j.value}
                    data-testid={`button-job-${j.value}`}
                    onClick={() => updateForm("jobType", j.value)}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all",
                      formData.jobType === j.value
                        ? "border-[#1e3a5f] bg-[#1e3a5f]/10"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    <span className={cn("text-sm font-medium", formData.jobType === j.value ? "text-[#1e3a5f]" : "text-gray-700")}>{j.label}</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{j.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-2xl font-bold mt-6 mb-1">Food Preferences</h1>
            <p className="text-gray-500 text-sm mb-6">Customize your nutrition plan</p>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Diet Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {DIET_TYPES.map((d) => (
                    <button
                      key={d.value}
                      data-testid={`button-diet-${d.value}`}
                      onClick={() => updateForm("dietType", d.value)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all flex items-center gap-2",
                        formData.dietType === d.value
                          ? "border-[#1e3a5f] bg-[#1e3a5f]/10"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      <span className="text-lg">{d.emoji}</span>
                      <span className={cn("text-sm font-medium", formData.dietType === d.value ? "text-[#1e3a5f]" : "text-gray-700")}>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Cuisines (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {CUISINES.map((c) => (
                    <button
                      key={c}
                      data-testid={`chip-cuisine-${c.toLowerCase()}`}
                      onClick={() => toggleArrayItem("cuisines", c)}
                      className={cn(
                        "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                        formData.cuisines.includes(c)
                          ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Allergies</Label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGIES.map((a) => (
                    <button
                      key={a}
                      data-testid={`chip-allergy-${a.toLowerCase()}`}
                      onClick={() => toggleArrayItem("allergies", a)}
                      className={cn(
                        "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                        formData.allergies.includes(a)
                          ? "border-[#c41e3a] bg-[#c41e3a] text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <Label className="text-sm font-medium text-gray-700">Dislikes (optional)</Label>
                <Input
                  data-testid="input-dislikes"
                  placeholder="E.g., broccoli, liver, tofu..."
                  className="h-12 bg-white border-gray-200 rounded-xl text-sm focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                  value={formData.dislikes}
                  onChange={(e) => updateForm("dislikes", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Budget Level</Label>
                <div className="grid grid-cols-3 gap-3">
                  {BUDGET_LEVELS.map((b) => (
                    <button
                      key={b.value}
                      data-testid={`button-budget-${b.value}`}
                      onClick={() => updateForm("budgetLevel", b.value)}
                      className={cn(
                        "p-3 rounded-xl border text-sm font-medium transition-all",
                        formData.budgetLevel === b.value
                          ? "border-[#8fbc8f] bg-[#8fbc8f]/15 text-[#5a8a5a]"
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Cooking Time Available</Label>
                <div className="grid grid-cols-4 gap-2">
                  {COOKING_TIMES.map((t) => (
                    <button
                      key={t.value}
                      data-testid={`button-cooking-${t.value}`}
                      onClick={() => updateForm("cookingTime", t.value)}
                      className={cn(
                        "p-2.5 rounded-xl border text-sm font-medium transition-all",
                        formData.cookingTime === t.value
                          ? "border-[#1e3a5f] bg-[#1e3a5f]/10 text-[#1e3a5f]"
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-2xl font-bold mt-6 mb-1">Training & Confirm</h1>
            <p className="text-gray-500 text-sm mb-6">Almost there! Final details</p>

            <div className="space-y-5 mb-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Equipment Available</Label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT.map((e) => (
                    <button
                      key={e}
                      data-testid={`chip-equipment-${e.toLowerCase().replace(/\s/g, "-")}`}
                      onClick={() => toggleArrayItem("equipment", e)}
                      className={cn(
                        "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                        formData.equipment.includes(e)
                          ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <Label className="text-sm font-medium text-gray-700">Injuries / Limitations (optional)</Label>
                <Textarea
                  data-testid="input-injuries"
                  placeholder="E.g., lower back pain, knee issues..."
                  className="bg-white border-gray-200 rounded-xl text-sm focus:border-[#1e3a5f] focus:ring-[#1e3a5f] min-h-[70px]"
                  value={formData.injuries}
                  onChange={(e) => updateForm("injuries", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Training Preference</Label>
                <div className="grid grid-cols-3 gap-3">
                  {TRAINING_PREFERENCES.map((tp) => (
                    <button
                      key={tp.value}
                      data-testid={`button-training-${tp.value}`}
                      onClick={() => updateForm("trainingPreference", tp.value)}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all",
                        formData.trainingPreference === tp.value
                          ? "border-[#1e3a5f] bg-[#1e3a5f]/10"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      <span className="text-lg block mb-1">{tp.emoji}</span>
                      <span className={cn("text-sm font-medium", formData.trainingPreference === tp.value ? "text-[#1e3a5f]" : "text-gray-700")}>{tp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Check size={18} className="text-[#8fbc8f]" />
                Your Summary
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="text-gray-500">Name</div>
                <div className="font-medium text-gray-800">{formData.name || "—"}</div>

                <div className="text-gray-500">Gender / Age</div>
                <div className="font-medium text-gray-800">{formData.gender}, {formData.age || "—"} yrs</div>

                <div className="text-gray-500">Height / Weight</div>
                <div className="font-medium text-gray-800">{formData.height || "—"} cm / {formData.weight || "—"} kg</div>

                <div className="text-gray-500">Target Weight</div>
                <div className="font-medium text-gray-800">{formData.targetWeight ? `${formData.targetWeight} kg` : "—"}</div>

                <div className="text-gray-500">Goal</div>
                <div className="font-medium text-gray-800 capitalize">{formData.goal || "—"}</div>

                <div className="text-gray-500">Timeline</div>
                <div className="font-medium text-gray-800">{formData.goalTimelineDays} days</div>

                <div className="text-gray-500">Activity</div>
                <div className="font-medium text-gray-800 capitalize">{formData.activityLevel}</div>

                <div className="text-gray-500">Sleep</div>
                <div className="font-medium text-gray-800">{formData.sleepHours}h avg</div>

                <div className="text-gray-500">Job Type</div>
                <div className="font-medium text-gray-800 capitalize">{formData.jobType}</div>

                <div className="text-gray-500">Diet</div>
                <div className="font-medium text-gray-800 capitalize">{formData.dietType}</div>

                <div className="text-gray-500">Cuisines</div>
                <div className="font-medium text-gray-800">{formData.cuisines.length > 0 ? formData.cuisines.join(", ") : "Any"}</div>

                <div className="text-gray-500">Allergies</div>
                <div className="font-medium text-gray-800">{formData.allergies.length > 0 ? formData.allergies.join(", ") : "None"}</div>

                {formData.dislikes && (
                  <>
                    <div className="text-gray-500">Dislikes</div>
                    <div className="font-medium text-gray-800">{formData.dislikes}</div>
                  </>
                )}

                <div className="text-gray-500">Budget</div>
                <div className="font-medium text-gray-800 capitalize">{formData.budgetLevel}</div>

                <div className="text-gray-500">Cooking Time</div>
                <div className="font-medium text-gray-800">{formData.cookingTime} min</div>

                <div className="text-gray-500">Equipment</div>
                <div className="font-medium text-gray-800">{formData.equipment.length > 0 ? formData.equipment.join(", ") : "None selected"}</div>

                <div className="text-gray-500">Training</div>
                <div className="font-medium text-gray-800 capitalize">{formData.trainingPreference}</div>

                {formData.injuries && (
                  <>
                    <div className="text-gray-500">Injuries</div>
                    <div className="font-medium text-gray-800">{formData.injuries}</div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6">
              <Button
                data-testid="button-generate-plan"
                onClick={handleGeneratePlan}
                disabled={submitting}
                className={cn(
                  "w-full h-14 text-base font-bold rounded-xl shadow-lg transition-all",
                  "bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] text-white hover:from-[#162d4a] hover:to-[#1e3a5f] disabled:opacity-50"
                )}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    Generating Your Plan...
                  </span>
                ) : (
                  "Generate My Plan 🚀"
                )}
              </Button>
            </div>
          </div>
        )}

        {(isCoachOrAdmin ? step === 0 : step < STEPS.length - 1) && (
          <div className="mt-auto pt-6">
            <Button
              data-testid="button-continue"
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                "w-full h-14 text-base font-bold rounded-xl shadow-sm transition-all",
                "bg-[#c41e3a] text-white hover:bg-[#a01830] disabled:bg-gray-200 disabled:text-gray-400"
              )}
            >
              {isCoachOrAdmin ? "Complete Setup" : "Continue"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}