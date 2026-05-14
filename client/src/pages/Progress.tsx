import { useState } from "react";
import { useStore } from "@/lib/store";
import { Flame, Trophy, Scale, TrendingDown, TrendingUp, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function StreakCard() {
  const { streak } = useStore();
  return (
    <div className="glass-card p-4 rounded-2xl flex items-center gap-4" data-testid="streak-card">
      <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
        <Flame size={24} className="text-orange-500" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-400 font-medium">Day Streak</p>
        <p className="text-2xl font-bold text-gray-900">{streak}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300" />
    </div>
  );
}

function BadgesCard() {
  const earned = 0;
  return (
    <div className="glass-card p-4 rounded-2xl flex items-center gap-4" data-testid="badges-card">
      <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center">
        <Trophy size={24} className="text-yellow-500" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-400 font-medium">Badges Earned</p>
        <p className="text-2xl font-bold text-gray-900">{earned}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300" />
    </div>
  );
}

function LogWeightModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [weight, setWeight] = useState(user?.weight?.toString() || "");
  const [saving, setSaving] = useState(false);
  const { setOnboardingData } = useStore();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!weight) return;
    setSaving(true);
    await setOnboardingData({ weight: parseFloat(weight) });
    setSaving(false);
    toast({ title: "Weight Updated", description: `Weight set to ${weight} kg`, duration: 3000 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Log Weight</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Enter weight in kg"
            className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 text-2xl font-bold text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
            data-testid="input-log-weight"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!weight || saving}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-sm transition-all",
            weight && !saving ? "bg-[#1e3a5f] text-white active:scale-95" : "bg-gray-200 text-gray-400"
          )}
          data-testid="button-save-weight"
        >
          {saving ? "Saving..." : "Save Weight"}
        </button>
      </div>
    </div>
  );
}

function WeightSection({ user }: { user: any }) {
  const [showWeightModal, setShowWeightModal] = useState(false);
  const currentWeight = user?.weight || 0;
  const targetWeight = user?.targetWeight || 0;
  const [timeRange, setTimeRange] = useState("90D");
  const ranges = ["90D", "6M", "1Y", "ALL"];

  const startWeight = currentWeight;
  const goalDate = new Date();
  goalDate.setMonth(goalDate.getMonth() + 6);

  const weightChanges = [
    { period: "3 day", change: 0 },
    { period: "7 day", change: 0 },
    { period: "14 day", change: 0 },
    { period: "30 day", change: 0 },
    { period: "90 day", change: 0 },
    { period: "All Time", change: 0 },
  ];

  return (
    <div className="space-y-4" data-testid="weight-section">
      {showWeightModal && <LogWeightModal user={user} onClose={() => setShowWeightModal(false)} />}
      <div className="glass-card p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <Scale size={20} className="text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Current Weight</p>
              <p className="text-2xl font-bold text-gray-900">{currentWeight ? `${currentWeight} kg` : "Not set"}</p>
            </div>
          </div>
          <button
            onClick={() => setShowWeightModal(true)}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-full text-xs font-medium active:scale-95 transition-transform"
            data-testid="button-log-weight"
          >
            Log weight
          </button>
        </div>

        <div className="flex justify-between text-center mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Start</p>
            <p className="font-bold text-gray-900">{startWeight ? `${startWeight} kg` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Goal</p>
            <p className="font-bold text-gray-900">{targetWeight ? `${targetWeight} kg` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">At your goal by</p>
            <p className="font-bold text-gray-900">{goalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 rounded-2xl">
        <h3 className="font-bold text-gray-900 mb-3">Weight Progress</h3>
        <div className="flex gap-2 mb-4">
          {ranges.map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                timeRange === r ? "bg-[#1e3a5f] text-white" : "bg-gray-100 text-gray-500"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="h-40 bg-gray-50 rounded-xl flex items-center justify-center">
          <p className="text-sm text-gray-400">Log weight to see your chart</p>
        </div>
      </div>

      <div className="glass-card p-5 rounded-2xl">
        <h3 className="font-bold text-gray-900 mb-1">Weight Changes</h3>
        <p className="text-xs text-gray-400 mb-3">No weight history yet — log weight regularly to track changes</p>
        <div className="space-y-3">
          {weightChanges.map(wc => (
            <div key={wc.period} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{wc.period}</span>
              <div className="flex items-center gap-1">
                {wc.change < 0 ? (
                  <TrendingDown size={14} className="text-green-500" />
                ) : wc.change > 0 ? (
                  <TrendingUp size={14} className="text-red-500" />
                ) : null}
                <span className={cn(
                  "text-sm font-medium",
                  wc.change < 0 ? "text-green-600" : wc.change > 0 ? "text-red-600" : "text-gray-400"
                )}>
                  {wc.change > 0 ? '+' : ''}{wc.change} kg
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EnergySection() {
  const { calories, caloriesBurned } = useStore();
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const balance = calories - caloriesBurned;
  const { user } = useStore();

  const weight = user?.weight || 0;
  const heightM = user?.height || 0;
  const bmi = weight > 0 && heightM > 0 ? weight / (heightM * heightM) : 0;
  const bmiRounded = Math.round(bmi * 10) / 10;

  let bmiCategory = "";
  let bmiColor = "text-gray-500";
  if (bmi > 0) {
    if (bmi < 18.5) { bmiCategory = "Underweight"; bmiColor = "text-blue-500"; }
    else if (bmi < 25) { bmiCategory = "Normal"; bmiColor = "text-green-500"; }
    else if (bmi < 30) { bmiCategory = "Overweight"; bmiColor = "text-yellow-500"; }
    else if (bmi < 35) { bmiCategory = "Obese"; bmiColor = "text-orange-500"; }
    else { bmiCategory = "Severely Obese"; bmiColor = "text-red-500"; }
  }

  return (
    <div className="space-y-4" data-testid="energy-section">
      <div className="glass-card p-5 rounded-2xl">
        <h3 className="font-bold text-gray-900 mb-1">Daily Average Calories</h3>
        <p className="text-xs text-gray-400 mb-4">Last 7 days</p>
        <div className="h-40 bg-gray-50 rounded-xl flex items-end justify-around px-4 pb-4">
          {weekdays.map((day) => (
            <div key={day} className="flex flex-col items-center gap-1">
              <div className="w-6 bg-gray-200 rounded-t-sm" style={{ height: `${Math.random() * 60 + 20}px` }} />
              <span className="text-[10px] text-gray-400">{day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5 rounded-2xl">
        <h3 className="font-bold text-gray-900 mb-1">Weekly Energy</h3>
        <p className="text-xs text-gray-400 mb-4">Burned vs Consumed</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-400">Burned</p>
            <p className="text-lg font-bold text-orange-500" data-testid="text-calories-burned">{caloriesBurned}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Consumed</p>
            <p className="text-lg font-bold text-blue-500" data-testid="text-calories-consumed">{calories}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Balance</p>
            <p className={cn("text-lg font-bold", balance < 0 ? "text-green-600" : "text-gray-900")} data-testid="text-calories-balance">{balance > 0 ? '+' : ''}{balance}</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 rounded-2xl">
        <h3 className="font-bold text-gray-900 mb-1">BMI</h3>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-bold text-gray-900" data-testid="text-bmi">{bmi > 0 ? bmiRounded : "—"}</span>
          {bmiCategory && <span className={cn("text-sm font-medium", bmiColor)}>{bmiCategory}</span>}
        </div>
        <div className="mt-3 h-2 w-full bg-gray-100 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-blue-400 rounded-l-full" />
            <div className="flex-1 bg-green-400" />
            <div className="flex-1 bg-yellow-400" />
            <div className="flex-1 bg-orange-400" />
            <div className="flex-1 bg-red-400 rounded-r-full" />
          </div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">18.5</span>
          <span className="text-[10px] text-gray-400">25</span>
          <span className="text-[10px] text-gray-400">30</span>
          <span className="text-[10px] text-gray-400">35+</span>
        </div>
      </div>
    </div>
  );
}

export default function Progress() {
  const { user } = useStore();
  const [tab, setTab] = useState<"weight" | "energy">("weight");

  return (
    <div className="p-5 space-y-4 animate-in fade-in duration-500" data-testid="progress-page">
      <h1 className="text-xl font-bold text-gray-900">Progress</h1>

      <div className="grid grid-cols-2 gap-3">
        <StreakCard />
        <BadgesCard />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("weight")}
          className={cn(
            "flex-1 py-2.5 rounded-full text-sm font-medium transition-colors",
            tab === "weight" ? "bg-[#1e3a5f] text-white" : "bg-white text-gray-500 border border-gray-200"
          )}
        >
          Weight
        </button>
        <button
          onClick={() => setTab("energy")}
          className={cn(
            "flex-1 py-2.5 rounded-full text-sm font-medium transition-colors",
            tab === "energy" ? "bg-[#1e3a5f] text-white" : "bg-white text-gray-500 border border-gray-200"
          )}
        >
          Energy
        </button>
      </div>

      {tab === "weight" ? <WeightSection user={user} /> : <EnergySection />}
    </div>
  );
}
