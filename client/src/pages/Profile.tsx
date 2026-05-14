import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useStore, authFetch } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, X, LogOut, User, Utensils, Dumbbell, Scale, Globe, Mail, Shield, Share2, Star, Download, KeyRound, Check, MessageCircle, Camera, Loader2 } from "lucide-react";


import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/capacitor";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 pb-8 w-full max-w-sm sm:mx-5 space-y-4 animate-in slide-in-from-bottom-4 duration-300 mb-0 sm:mb-0 safe-pad-bottom" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 font-display">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200 transition">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", unit }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; unit?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 mb-1.5 block font-body">{label}</label>
      <div className="relative">
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 font-body" />
        {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-body">{unit}</span>}
      </div>
    </div>
  );
}

function PersonalDetailsModal({ user, onClose, onSave }: { user: any; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [name, setName] = useState(user?.name || "");
  const [age, setAge] = useState(user?.age?.toString() || "");
  const [height, setHeight] = useState(user?.height?.toString() || "");
  const [weight, setWeight] = useState(user?.weight?.toString() || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ name: name || undefined, age: age ? parseInt(age) : undefined, height: height ? parseFloat(height) : undefined, weight: weight ? parseFloat(weight) : undefined });
    setSaving(false);
    onClose();
  };

  return (
    <Modal title="Personal Details" onClose={onClose}>
      <div className="space-y-3">
        <InputField label="Name" value={name} onChange={setName} placeholder="Your name" />
        <InputField label="Age" value={age} onChange={setAge} placeholder="25" type="number" unit="years" />
        <InputField label="Height" value={height} onChange={setHeight} placeholder="170" type="number" unit="cm" />
        <InputField label="Current Weight" value={weight} onChange={setWeight} placeholder="75" type="number" unit="kg" />
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-[0.98] transition font-display"
        data-testid="button-save-personal-details">
        {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Save Changes"}
      </button>
    </Modal>
  );
}

function NutritionGoalsModal({ user, onClose, onSave }: { user: any; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [calories, setCalories] = useState(user?.dailyCalorieTarget?.toString() || "2400");
  const [protein, setProtein] = useState(user?.proteinTarget?.toString() || "160");
  const [carbs, setCarbs] = useState(user?.carbsTarget?.toString() || "220");
  const [fat, setFat] = useState(user?.fatTarget?.toString() || "70");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ dailyCalorieTarget: parseInt(calories) || 2400, proteinTarget: parseInt(protein) || 160, carbsTarget: parseInt(carbs) || 220, fatTarget: parseInt(fat) || 70 });
    setSaving(false);
    onClose();
  };

  return (
    <Modal title="Nutrition Goals" onClose={onClose}>
      <div className="space-y-3">
        <InputField label="Daily Calorie Target" value={calories} onChange={setCalories} placeholder="2400" type="number" unit="kcal" />
        <InputField label="Protein Target" value={protein} onChange={setProtein} placeholder="160" type="number" unit="g" />
        <InputField label="Carbs Target" value={carbs} onChange={setCarbs} placeholder="220" type="number" unit="g" />
        <InputField label="Fat Target" value={fat} onChange={setFat} placeholder="70" type="number" unit="g" />
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-sm shadow-lg shadow-orange-200 disabled:opacity-50 active:scale-[0.98] transition font-display"
        data-testid="button-save-nutrition-goals">
        {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Save Goals"}
      </button>
    </Modal>
  );
}

function FitnessGoalsModal({ user, onClose, onSave }: { user: any; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [targetWeight, setTargetWeight] = useState(user?.targetWeight?.toString() || "");
  const [activityLevel, setActivityLevel] = useState(user?.activityLevel || "moderate");
  const [saving, setSaving] = useState(false);

  const levels = [
    { value: "sedentary", label: "Sedentary" },
    { value: "lightly_active", label: "Lightly Active" },
    { value: "moderate", label: "Moderate" },
    { value: "very_active", label: "Very Active" },
    { value: "athlete", label: "Athlete" },
  ];

  const handleSave = async () => {
    setSaving(true);
    await onSave({ targetWeight: parseFloat(targetWeight) || undefined, activityLevel });
    setSaving(false);
    onClose();
  };

  return (
    <Modal title="Fitness Goals" onClose={onClose}>
      <InputField label="Target Weight" value={targetWeight} onChange={setTargetWeight} placeholder="65" type="number" unit="kg" />
      <div>
        <label className="text-xs font-medium text-slate-500 mb-2 block font-body">Activity Level</label>
        <div className="space-y-1.5">
          {levels.map(l => (
            <button key={l.value} onClick={() => { triggerHaptic('selection'); setActivityLevel(l.value); }}
              className={cn("w-full text-left px-4 py-3 rounded-xl border transition-all active:scale-[0.98] text-sm font-semibold font-display",
                activityLevel === l.value ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500 text-blue-700" : "bg-white border-slate-200 text-slate-700"
              )} data-testid={`activity-${l.value}`}>
              {l.label}
              {activityLevel === l.value && <Check size={14} className="inline ml-2 text-blue-600" />}
            </button>
          ))}
        </div>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-[0.98] transition font-display"
        data-testid="button-save-fitness-goals">
        {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Save Goals"}
      </button>
    </Modal>
  );
}

function CuisineModal({ user, onClose, onSave }: { user: any; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const options = ["Indian", "Nepali", "Chinese", "Thai", "Mediterranean", "Japanese", "Korean", "Mixed"];
  const [cuisine, setCuisine] = useState(user?.cuisinePreference || "Mixed");
  const [dietType, setDietType] = useState(user?.dietType || "non-veg");
  const [saving, setSaving] = useState(false);

  const diets = ["non-veg", "vegetarian", "vegan", "eggetarian", "pescatarian"];

  const handleSave = async () => {
    setSaving(true);
    await onSave({ cuisinePreference: cuisine, dietType });
    setSaving(false);
    onClose();
  };

  return (
    <Modal title="Diet Preferences" onClose={onClose}>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-2 block font-body">Cuisine Preference</label>
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <button key={opt} onClick={() => { triggerHaptic('selection'); setCuisine(opt); }}
              className={cn("px-3.5 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95",
                cuisine === opt ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-slate-200"
              )} data-testid={`cuisine-${opt.toLowerCase()}`}>
              {cuisine === opt && <Check size={10} className="inline mr-1" />}{opt}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-2 block font-body">Diet Type</label>
        <div className="flex flex-wrap gap-2">
          {diets.map(d => (
            <button key={d} onClick={() => { triggerHaptic('selection'); setDietType(d); }}
              className={cn("px-3.5 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95 capitalize",
                dietType === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"
              )} data-testid={`diet-${d}`}>
              {dietType === d && <Check size={10} className="inline mr-1" />}{d.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-sm shadow-lg shadow-orange-200 disabled:opacity-50 active:scale-[0.98] transition font-display"
        data-testid="button-save-cuisine">
        {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Save Preferences"}
      </button>
    </Modal>
  );
}

function RegeneratePlanModal({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const [, navigate] = useLocation();
  const [regenerating, setRegenerating] = useState(false);
  const { toast } = useToast();

  const handleRegenerate = async () => {
    if (!userId) return;
    setRegenerating(true);
    try {
      const res = await authFetch("/api/plan/generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.planId) {
        onClose();
        navigate(`/plan-creating/${data.planId}`);
      } else {
        throw new Error("Failed");
      }
    } catch {
      toast({ title: "Failed to regenerate", description: "Please try again", variant: "destructive" });
      setRegenerating(false);
    }
  };

  return (
    <Modal title="Regenerate Plan" onClose={onClose}>
      <p className="text-sm text-slate-500 font-body">This will create a new 7-day personalized plan based on your current profile and goals. Your existing plan will be replaced.</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold font-display active:scale-95 transition">
          Cancel
        </button>
        <button onClick={handleRegenerate} disabled={regenerating}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-[0.98] transition font-display"
          data-testid="button-confirm-regenerate">
          {regenerating ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Regenerate"}
        </button>
      </div>
    </Modal>
  );
}

function SettingsRow({ icon: Icon, iconBg, label, subtitle, onClick, rightContent, testId }: {
  icon: any; iconBg: string; label: string; subtitle?: string; onClick?: () => void; rightContent?: React.ReactNode; testId?: string;
}) {
  return (
    <button onClick={onClick}
      className="w-full p-4 flex items-center justify-between active:bg-slate-50 transition-colors text-left"
      data-testid={testId}>
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-slate-800 font-display">{label}</p>
          {subtitle && <p className="text-[11px] text-slate-400 font-body">{subtitle}</p>}
        </div>
      </div>
      {rightContent || <ChevronRight size={16} className="text-slate-300" />}
    </button>
  );
}

export default function Profile() {
  const [, navigate] = useLocation();
  const store = useStore();
  const { user, userId, logout } = store;
  const { toast } = useToast();
  const [showPersonal, setShowPersonal] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [showFitness, setShowFitness] = useState(false);
  const [showCuisine, setShowCuisine] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [showJoinCoach, setShowJoinCoach] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joiningCoach, setJoiningCoach] = useState(false);
  const [planMeta, setPlanMeta] = useState<any>(null);

  const loadPlanMeta = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await authFetch(`/api/plan/latest/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.status === "ready" && data.planJson?.meta) setPlanMeta(data.planJson.meta);
      }
    } catch {}
  }, [userId]);

  useEffect(() => { loadPlanMeta(); }, [loadPlanMeta]);

  const updateProfile = async (data: any) => {
    if (!userId) return;
    try {
      const res = await authFetch(`/api/users/${userId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        store.loginUser(updated);
        triggerHaptic('success');
        toast({ title: "Saved", description: "Profile updated successfully" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
    }
  };

  const joinCoach = async () => {
    if (!inviteCode.trim() || !userId) return;
    setJoiningCoach(true);
    try {
      const res = await authFetch("/api/client/join-coach", {
        method: "POST", headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      store.setOnboardingData({ coachId: data.coachId || "joined" });
      triggerHaptic('success');
      toast({ title: "Joined coach!", description: `Connected to ${data.coachName}` });
      setShowJoinCoach(false);
      setInviteCode("");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setJoiningCoach(false); }
  };

  const bmi = (user?.weight && user?.height) ? (user.weight / ((user.height / 100) ** 2)).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-[#f7f8fc] pb-10 animate-in fade-in duration-500" data-testid="profile-page">
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 px-5 pt-6 pb-8 rounded-b-3xl">
        <h1 className="text-xl font-bold text-white mb-5 font-display">Profile</h1>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <span className="text-2xl font-bold text-white font-display">{user?.name?.[0] || user?.username?.[0] || "A"}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white font-display">{user?.name || user?.username || "User"}</h2>
            <p className="text-[12px] text-blue-200 font-body">{user?.email || `@${user?.username}`}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-semibold rounded-full font-body capitalize">{user?.role || "User"}</span>
              {user?.dailyCalorieTarget && <span className="text-[11px] text-blue-200 font-body">{user.dailyCalorieTarget} kcal/day</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 grid grid-cols-3 gap-3" data-testid="profile-metrics">
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100/80 text-center">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider font-body">Weight</p>
          <p className="text-xl font-bold text-slate-900 mt-1 font-display" data-testid="text-weight">{user?.weight || "—"}</p>
          <p className="text-[10px] text-slate-400 font-body">kg</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100/80 text-center">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider font-body">Target</p>
          <p className="text-xl font-bold text-orange-500 mt-1 font-display" data-testid="text-target-weight">{user?.targetWeight || "—"}</p>
          <p className="text-[10px] text-slate-400 font-body">kg</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100/80 text-center">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider font-body">BMI</p>
          <p className="text-xl font-bold text-blue-600 mt-1 font-display" data-testid="text-bmi">{bmi || "—"}</p>
          <p className="text-[10px] text-slate-400 font-body">{bmi ? (parseFloat(bmi) < 18.5 ? "Underweight" : parseFloat(bmi) < 25 ? "Normal" : parseFloat(bmi) < 30 ? "Overweight" : "Obese") : ""}</p>
        </div>
      </div>

      {planMeta && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100/50" data-testid="plan-summary-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-800 font-display">Active Plan</h3>
            <button onClick={() => setShowRegenerate(true)}
              className="px-3 py-1.5 bg-orange-500 text-white text-[11px] font-semibold rounded-lg active:scale-95 transition font-display"
              data-testid="button-regenerate-plan">Regenerate</button>
          </div>
          <p className="text-[13px] font-semibold text-slate-800 font-display">{planMeta.plan_name || "7-Day Plan"}</p>
          <div className="flex gap-4 mt-1.5 text-[11px] text-slate-500 font-body">
            <span>{planMeta.daily_calories_target} kcal/day</span>
            {planMeta.macros && <span>P:{planMeta.macros.protein_g}g C:{planMeta.macros.carbs_g}g F:{planMeta.macros.fat_g}g</span>}
          </div>
        </div>
      )}

      <div className="px-4 mt-4">
        <h3 className="text-[10px] text-slate-400 uppercase font-semibold tracking-widest px-1 mb-2 font-body">Account</h3>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100/80 divide-y divide-slate-50">
          <SettingsRow icon={User} iconBg="bg-blue-500" label="Personal Details" subtitle={`${user?.age || "—"} yrs · ${user?.height || "—"} cm · ${user?.weight || "—"} kg`}
            onClick={() => setShowPersonal(true)} testId="row-personal" />
          <SettingsRow icon={Utensils} iconBg="bg-orange-500" label="Nutrition Goals" subtitle={`${user?.dailyCalorieTarget || 2400} kcal · P:${user?.proteinTarget || 160}g C:${user?.carbsTarget || 220}g F:${user?.fatTarget || 70}g`}
            onClick={() => setShowNutrition(true)} testId="row-nutrition" />
          <SettingsRow icon={Dumbbell} iconBg="bg-emerald-500" label="Fitness Goals" subtitle={`Target: ${user?.targetWeight || "—"} kg · ${user?.activityLevel || "moderate"}`}
            onClick={() => setShowFitness(true)} testId="row-fitness" />
          <SettingsRow icon={Utensils} iconBg="bg-amber-500" label="Diet & Cuisine" subtitle={`${user?.dietType || "Non-veg"} · ${user?.cuisinePreference || "Mixed"}`}
            onClick={() => setShowCuisine(true)} testId="row-cuisine" />
          <SettingsRow icon={Camera} iconBg="bg-violet-500" label="Progress Snapshots"
            onClick={() => navigate("/progress-snapshots")} testId="row-progress-photos" />
        </div>
      </div>

      {user?.role !== "coach" && user?.role !== "admin" && (
        <div className="px-4 mt-4">
          <h3 className="text-[10px] text-slate-400 uppercase font-semibold tracking-widest px-1 mb-2 font-body">My Coach</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100/80 divide-y divide-slate-50">
            {user?.coachId ? (
              <>
                <SettingsRow icon={Check} iconBg="bg-green-500" label="Connected to Coach"
                  onClick={() => navigate("/messages")}
                  rightContent={<span className="px-3 py-1.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-600 font-body">Active</span>}
                  testId="row-coach-active" />
                <SettingsRow icon={MessageCircle} iconBg="bg-blue-500" label="Message Coach"
                  onClick={() => navigate("/messages")} testId="row-message-coach" />
              </>
            ) : (
              <SettingsRow icon={KeyRound} iconBg="bg-amber-500" label="Join a Coach"
                onClick={() => setShowJoinCoach(!showJoinCoach)} testId="row-join-coach" />
            )}
          </div>
          {showJoinCoach && !user?.coachId && (
            <div className="bg-white rounded-2xl p-4 mt-2 space-y-3 shadow-sm border border-slate-100/80">
              <p className="text-xs text-slate-500 font-body">Ask your coach for an invite code:</p>
              <input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code"
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm border border-slate-200 font-mono tracking-widest text-center uppercase font-body"
                data-testid="input-invite-code" />
              <button onClick={joinCoach} disabled={joiningCoach || !inviteCode.trim()}
                className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition font-display"
                data-testid="button-join-coach">
                {joiningCoach ? "Joining..." : "Join Coach"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="px-4 mt-4">
        <h3 className="text-[10px] text-slate-400 uppercase font-semibold tracking-widest px-1 mb-2 font-body">Support</h3>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100/80 divide-y divide-slate-50">
          <SettingsRow icon={Star} iconBg="bg-yellow-500" label="Request a Feature"
            onClick={() => toast({ title: "Feature Request", description: "feedback@sherpafit.app" })} testId="row-feature" />
          <SettingsRow icon={Mail} iconBg="bg-indigo-500" label="Support" subtitle="support@sherpafit.app"
            onClick={() => window.open("mailto:support@sherpafit.app")} testId="row-support" />
          <SettingsRow icon={Download} iconBg="bg-emerald-500" label="Export Report"
            onClick={() => toast({ title: "Coming Soon", description: "PDF export coming soon" })} testId="row-export" />
          <SettingsRow icon={Shield} iconBg="bg-slate-400" label="Privacy & Terms"
            onClick={() => toast({ title: "Privacy", description: "sherpafit.app/privacy" })} testId="row-privacy" />
        </div>
      </div>

      <div className="px-4 mt-4">
        <h3 className="text-[10px] text-slate-400 uppercase font-semibold tracking-widest px-1 mb-2 font-body">Social</h3>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100/80 divide-y divide-slate-50">
          <SettingsRow icon={Share2} iconBg="bg-pink-500" label="Instagram" subtitle="@sherpafit"
            onClick={() => window.open("https://instagram.com/sherpafit", "_blank")} testId="row-instagram" />
          <SettingsRow icon={Share2} iconBg="bg-slate-700" label="TikTok" subtitle="@sherpafit"
            onClick={() => window.open("https://tiktok.com/@sherpafit", "_blank")} testId="row-tiktok" />
        </div>
      </div>

      <div className="px-4 mt-6">
        <button onClick={() => { logout(); navigate("/"); }}
          className="w-full py-4 bg-red-50 text-red-600 font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition font-display"
          data-testid="button-logout">
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="text-center pt-4 pb-8">
        <p className="text-slate-400 text-[10px] font-body">Sherpa Fit v1.0.0</p>
      </div>

      {showPersonal && <PersonalDetailsModal user={user} onClose={() => setShowPersonal(false)} onSave={updateProfile} />}
      {showNutrition && <NutritionGoalsModal user={user} onClose={() => setShowNutrition(false)} onSave={updateProfile} />}
      {showFitness && <FitnessGoalsModal user={user} onClose={() => setShowFitness(false)} onSave={updateProfile} />}
      {showCuisine && <CuisineModal user={user} onClose={() => setShowCuisine(false)} onSave={updateProfile} />}
      {showRegenerate && <RegeneratePlanModal userId={userId} onClose={() => setShowRegenerate(false)} />}
    </div>
  );
}
