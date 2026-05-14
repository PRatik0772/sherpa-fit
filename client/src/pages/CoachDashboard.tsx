import { useState, useEffect, useCallback } from "react";
import {
  Users, User as UserIcon, Flame, Scale, Copy, Plus, Send, Dumbbell, UtensilsCrossed,
  X, Check, Trash2, Clock, Key, MessageCircle, Search, ChevronRight, Target,
  TrendingUp, Droplets, Activity, BarChart3, Edit3, Save, ArrowLeft, Calendar
} from "lucide-react";
import { useLocation } from "wouter";
import { useStore, authFetch } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from "recharts";

type ClientWithStats = {
  id: string;
  name: string | null;
  firstName: string | null;
  username: string | null;
  email: string | null;
  weight: number | null;
  dailyCalorieTarget: number | null;
  todayCalories: number;
  mealCount: number;
};

type ClientSummary = {
  profile: {
    name: string; age: number | null; weight: number | null; height: number | null;
    targetWeight: number | null; dailyCalorieTarget: number; proteinTarget: number;
    carbsTarget: number; fatTarget: number; dietType: string; cuisinePreference: string;
    activityLevel: string; gender: string;
  };
  todayMeals: { totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number; mealCount: number };
  todayWorkouts: { totalCaloriesBurned: number; workoutCount: number };
  activePlansCount: number;
  waterIntake: number;
};

type NutritionDay = { date: string; calories: number; protein: number; carbs: number; fat: number; mealCount: number };
type FitnessDay = { date: string; caloriesBurned: number; workoutCount: number };
type PlanItem = { name: string; details: string };

type InviteCode = {
  id: string; code: string; coachId: string; usedBy: string | null;
  usedAt: string | null; expiresAt: string | null; createdAt: string;
};

type CoachPlan = {
  id: string; coachId: string; clientId: string; title: string; type: string;
  description: string | null; items: any; durationWeeks: number | null;
  status: string | null; createdAt: string;
};

const COLORS = {
  blue: "#1e3a5f", red: "#c41e3a", sage: "#8fbc8f",
  protein: "#A855F7", carbs: "#F97316", fat: "#EAB308",
};

function formatDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

function shortDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en", { weekday: "short" });
}

export default function CoachDashboard() {
  const { toast } = useToast();
  const { userId } = useStore();
  const [, setLocation] = useLocation();

  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientList, setShowClientList] = useState(true);

  const [summary, setSummary] = useState<ClientSummary | null>(null);
  const [nutritionData, setNutritionData] = useState<{ daily: NutritionDay[]; recentMeals: any[] }>({ daily: [], recentMeals: [] });
  const [fitnessData, setFitnessData] = useState<{ daily: FitnessDay[]; recentWorkouts: any[] }>({ daily: [], recentWorkouts: [] });
  const [progressData, setProgressData] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "nutrition" | "fitness" | "plans" | "progress">("overview");
  const [detailLoading, setDetailLoading] = useState(false);

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showInviteCodes, setShowInviteCodes] = useState(false);

  const [plans, setPlans] = useState<CoachPlan[]>([]);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({
    clientId: "", title: "", type: "prep" as "prep" | "exercise",
    description: "", durationWeeks: 4, items: [{ name: "", details: "" }] as PlanItem[],
  });
  const [sendingPlan, setSendingPlan] = useState(false);

  const [editingGoals, setEditingGoals] = useState(false);
  const [goalForm, setGoalForm] = useState({
    dailyCalorieTarget: 2400, proteinTarget: 160, carbsTarget: 220, fatTarget: 70, targetWeight: 70,
  });
  const [savingGoals, setSavingGoals] = useState(false);

  const fetchClients = useCallback(() => {
    if (!userId) return;
    authFetch(`/api/coach/clients?coachId=${userId}`)
      .then((r) => r.json())
      .then(setClients)
      .catch(() => toast({ title: "Failed to load clients", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [userId]);

  const fetchCodes = useCallback(() => {
    if (!userId) return;
    authFetch("/api/coach/invite-codes", { headers: { "x-user-id": userId || "" } })
      .then((r) => r.json())
      .then(setInviteCodes)
      .catch(() => {});
  }, [userId]);

  const fetchPlans = useCallback(() => {
    if (!userId) return;
    authFetch("/api/coach/plans", { headers: { "x-user-id": userId || "" } })
      .then((r) => r.json())
      .then(setPlans)
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    fetchClients();
    fetchCodes();
    fetchPlans();
  }, [fetchClients, fetchCodes, fetchPlans]);

  const selectClient = async (clientId: string) => {
    setSelectedClientId(clientId);
    setShowClientList(false);
    setDetailTab("overview");
    setDetailLoading(true);
    try {
      const [summaryRes, nutritionRes, fitnessRes, progressRes] = await Promise.all([
        authFetch(`/api/coach/clients/${clientId}/summary`, { headers: { "x-user-id": userId || "" } }),
        authFetch(`/api/coach/clients/${clientId}/nutrition-analytics?range=7`, { headers: { "x-user-id": userId || "" } }),
        authFetch(`/api/coach/clients/${clientId}/fitness-analytics?range=7`, { headers: { "x-user-id": userId || "" } }),
        authFetch(`/api/coach/clients/${clientId}/progress`, { headers: { "x-user-id": userId || "" } }),
      ]);
      const [s, n, f, p] = await Promise.all([summaryRes.json(), nutritionRes.json(), fitnessRes.json(), progressRes.json()]);
      setSummary(s);
      setNutritionData(n);
      setFitnessData(f);
      setProgressData(p);
      if (s.profile) {
        setGoalForm({
          dailyCalorieTarget: s.profile.dailyCalorieTarget || 2400,
          proteinTarget: s.profile.proteinTarget || 160,
          carbsTarget: s.profile.carbsTarget || 220,
          fatTarget: s.profile.fatTarget || 70,
          targetWeight: s.profile.targetWeight || s.profile.weight || 70,
        });
      }
    } catch {
      toast({ title: "Failed to load client details", variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  const saveGoals = async () => {
    if (!selectedClientId) return;
    setSavingGoals(true);
    try {
      const res = await authFetch(`/api/coach/clients/${selectedClientId}/goals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": userId || "" },
        body: JSON.stringify(goalForm),
      });
      if (!res.ok) throw new Error("Failed");
      setEditingGoals(false);
      toast({ title: "Goals updated!" });
      selectClient(selectedClientId);
    } catch {
      toast({ title: "Failed to update goals", variant: "destructive" });
    } finally {
      setSavingGoals(false);
    }
  };

  const generateInviteCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await authFetch("/api/coach/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId || "" },
      });
      if (!res.ok) throw new Error("Failed");
      const code = await res.json();
      setInviteCodes((prev) => [code, ...prev]);
      toast({ title: "Invite code generated!", description: code.code });
    } catch {
      toast({ title: "Failed to generate code", variant: "destructive" });
    } finally {
      setGeneratingCode(false);
    }
  };

  const addPlanItem = () => setPlanForm((p) => ({ ...p, items: [...p.items, { name: "", details: "" }] }));
  const removePlanItem = (idx: number) => setPlanForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  const updatePlanItem = (idx: number, field: "name" | "details", value: string) =>
    setPlanForm((p) => ({ ...p, items: p.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)) }));

  const sendPlan = async () => {
    if (!planForm.clientId || !planForm.title) {
      toast({ title: "Select a client and add a title", variant: "destructive" });
      return;
    }
    setSendingPlan(true);
    try {
      const res = await authFetch("/api/coach/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId || "" },
        body: JSON.stringify({
          clientId: planForm.clientId, title: planForm.title, type: planForm.type,
          description: planForm.description, durationWeeks: planForm.durationWeeks,
          items: planForm.items.filter((i) => i.name.trim()),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const plan = await res.json();
      setPlans((prev) => [plan, ...prev]);
      setShowPlanForm(false);
      setPlanForm({ clientId: "", title: "", type: "prep", description: "", durationWeeks: 4, items: [{ name: "", details: "" }] });
      toast({ title: "Plan sent to client!" });
    } catch {
      toast({ title: "Failed to send plan", variant: "destructive" });
    } finally {
      setSendingPlan(false);
    }
  };

  const deletePlan = async (id: string) => {
    try {
      await authFetch(`/api/coach/plans/${id}`, { method: "DELETE", headers: { "x-user-id": userId || "" } });
      setPlans((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Plan deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const getClientName = (id: string) => {
    const c = clients.find((c) => c.id === id);
    return c?.name || c?.firstName || c?.username || "Client";
  };

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    return !q || (c.name || "").toLowerCase().includes(q) || (c.firstName || "").toLowerCase().includes(q) ||
      (c.username || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
  });

  const clientPlans = plans.filter((p) => p.clientId === selectedClientId);
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const totalClientsCalories = clients.reduce((sum, c) => sum + c.todayCalories, 0);
  const activePlansCount = plans.filter((p) => p.status === "active").length;
  const activeToday = clients.filter((c) => c.todayCalories > 0 || c.mealCount > 0).length;
  const avgAdherence = clients.length > 0
    ? Math.round(clients.reduce((sum, c) => {
        if (!c.dailyCalorieTarget || c.dailyCalorieTarget === 0) return sum;
        return sum + Math.min(100, (c.todayCalories / c.dailyCalorieTarget) * 100);
      }, 0) / Math.max(1, clients.filter(c => c.dailyCalorieTarget && c.dailyCalorieTarget > 0).length))
    : 0;

  const detailTabs = [
    { key: "overview" as const, label: "Overview", icon: UserIcon },
    { key: "nutrition" as const, label: "Nutrition", icon: UtensilsCrossed },
    { key: "fitness" as const, label: "Fitness", icon: Dumbbell },
    { key: "plans" as const, label: "Plans", icon: Send },
    { key: "progress" as const, label: "Progress", icon: TrendingUp },
  ];

  if (showClientList && !selectedClientId) {
    return (
      <div className="p-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1e3a5f] to-[#c41e3a] rounded-xl flex items-center justify-center">
              <Activity className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-heading" data-testid="text-coach-title">Coach Panel</h1>
              <p className="text-xs text-gray-400">{clients.length} clients</p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteCodes(!showInviteCodes)}
            className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center"
            data-testid="button-toggle-codes"
          >
            <Key size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-br from-[#1e3a5f] to-[#1e3a5f]/80 rounded-xl p-3 text-white" data-testid="stat-total-clients">
            <Users size={16} className="opacity-70 mb-1" />
            <p className="text-xl font-bold">{clients.length}</p>
            <p className="text-[10px] opacity-70">Total Clients</p>
          </div>
          <div className="bg-gradient-to-br from-[#8fbc8f] to-[#8fbc8f]/80 rounded-xl p-3 text-white" data-testid="stat-active-today">
            <Activity size={16} className="opacity-70 mb-1" />
            <p className="text-xl font-bold">{activeToday}</p>
            <p className="text-[10px] opacity-70">Active Today</p>
          </div>
          <div className="bg-gradient-to-br from-[#c41e3a] to-[#c41e3a]/80 rounded-xl p-3 text-white" data-testid="stat-active-plans">
            <Send size={16} className="opacity-70 mb-1" />
            <p className="text-xl font-bold">{activePlansCount}</p>
            <p className="text-[10px] opacity-70">Active Plans</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-xl p-3 text-white" data-testid="stat-avg-adherence">
            <BarChart3 size={16} className="opacity-70 mb-1" />
            <p className="text-xl font-bold">{avgAdherence}%</p>
            <p className="text-[10px] opacity-70">Avg Adherence</p>
          </div>
        </div>

        {showInviteCodes && (
          <div className="mb-4 bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Invite Codes</h3>
              <button
                onClick={generateInviteCode}
                disabled={generatingCode}
                className="bg-[#1e3a5f] text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"
                data-testid="button-generate-code"
              >
                <Plus size={12} /> {generatingCode ? "..." : "New"}
              </button>
            </div>
            {inviteCodes.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">No invite codes yet</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {inviteCodes.map((ic) => (
                  <div key={ic.id} className="flex items-center justify-between bg-white rounded-lg p-2.5" data-testid={`card-invite-${ic.id}`}>
                    <div>
                      <span className="font-mono text-sm font-bold text-[#1e3a5f] tracking-wider">{ic.code}</span>
                      <span className={`ml-2 text-[10px] ${ic.usedBy ? "text-green-600" : "text-gray-400"}`}>
                        {ic.usedBy ? "Used" : "Available"}
                      </span>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(ic.code); toast({ title: "Copied!" }); }}
                      className="text-gray-400 hover:text-[#1e3a5f] p-1" data-testid={`button-copy-${ic.id}`}>
                      <Copy size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients..."
            className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-2.5 text-sm border border-gray-100 focus:outline-none focus:border-[#1e3a5f]/30"
            data-testid="input-search-clients"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <Users className="mx-auto text-gray-300 mb-3" size={40} />
            <h3 className="font-bold text-gray-900 mb-1" data-testid="text-no-clients">
              {searchQuery ? "No matching clients" : "No Clients Yet"}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {searchQuery ? "Try a different search" : "Generate an invite code and share it"}
            </p>
            {!searchQuery && (
              <button onClick={() => setShowInviteCodes(true)}
                className="bg-[#1e3a5f] text-white text-sm px-4 py-2 rounded-xl" data-testid="button-go-to-codes">
                Generate Invite Code
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredClients.map((client) => {
              const pct = client.dailyCalorieTarget ? Math.min(100, (client.todayCalories / client.dailyCalorieTarget) * 100) : 0;
              const clientPlanCount = plans.filter((p) => p.clientId === client.id && p.status === "active").length;
              return (
                <button key={client.id} data-testid={`card-client-${client.id}`}
                  onClick={() => selectClient(client.id)}
                  className="w-full bg-white rounded-xl p-4 text-left border border-gray-100 hover:border-[#1e3a5f]/30 transition-all shadow-sm active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-[#1e3a5f]/10 to-[#c41e3a]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserIcon className="text-[#1e3a5f]" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {client.name || client.firstName || client.username || "Client"}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Flame size={10} className="text-orange-400" />
                          {client.todayCalories}/{client.dailyCalorieTarget || 2400} kcal
                        </span>
                        {client.weight && (
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Scale size={10} /> {client.weight}kg
                          </span>
                        )}
                        {clientPlanCount > 0 && (
                          <span className="text-[11px] text-[#1e3a5f] bg-[#1e3a5f]/10 px-1.5 py-0.5 rounded">
                            {clientPlanCount} plan{clientPlanCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-10 h-10 relative">
                        <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15" fill="none"
                            stroke={pct >= 100 ? "#22c55e" : pct >= 70 ? "#f97316" : "#1e3a5f"}
                            strokeWidth="3" strokeDasharray={`${pct * 0.942} 100`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-600">
                          {Math.round(pct)}%
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => { setSelectedClientId(null); setShowClientList(true); }}
            className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center" data-testid="button-back-to-clients">
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-sm truncate" data-testid="text-client-name">
              {summary?.profile?.name || selectedClient?.name || "Client"}
            </h2>
            <p className="text-[11px] text-gray-400">
              {summary?.profile?.gender} | {summary?.profile?.age || "—"} yrs | {summary?.profile?.activityLevel}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setLocation("/messages")}
              className="w-8 h-8 bg-[#c41e3a]/10 rounded-lg flex items-center justify-center" data-testid="button-message-client">
              <MessageCircle size={14} className="text-[#c41e3a]" />
            </button>
            <button onClick={() => { setEditingGoals(true); }}
              className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center" data-testid="button-edit-goals">
              <Target size={14} className="text-[#1e3a5f]" />
            </button>
          </div>
        </div>

        <div className="flex px-4 gap-1 overflow-x-auto pb-2 no-scrollbar">
          {detailTabs.map((t) => (
            <button key={t.key} data-testid={`tab-${t.key}`}
              onClick={() => setDetailTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                detailTab === t.key ? "bg-[#1e3a5f] text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              <t.icon size={12} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {detailLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {editingGoals && (
            <div className="bg-white rounded-xl p-4 border-2 border-[#1e3a5f]/20 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Target size={16} className="text-[#1e3a5f]" /> Set Client Goals
                </h3>
                <button onClick={() => setEditingGoals(false)} className="text-gray-400"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-500 block mb-1">Daily Calories</label>
                  <input type="number" value={goalForm.dailyCalorieTarget}
                    onChange={(e) => setGoalForm((p) => ({ ...p, dailyCalorieTarget: +e.target.value }))}
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200" data-testid="input-goal-calories" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 block mb-1">Target Weight (kg)</label>
                  <input type="number" value={goalForm.targetWeight}
                    onChange={(e) => setGoalForm((p) => ({ ...p, targetWeight: +e.target.value }))}
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200" data-testid="input-goal-weight" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 block mb-1">Protein (g)</label>
                  <input type="number" value={goalForm.proteinTarget}
                    onChange={(e) => setGoalForm((p) => ({ ...p, proteinTarget: +e.target.value }))}
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200" data-testid="input-goal-protein" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 block mb-1">Carbs (g)</label>
                  <input type="number" value={goalForm.carbsTarget}
                    onChange={(e) => setGoalForm((p) => ({ ...p, carbsTarget: +e.target.value }))}
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200" data-testid="input-goal-carbs" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 block mb-1">Fat (g)</label>
                  <input type="number" value={goalForm.fatTarget}
                    onChange={(e) => setGoalForm((p) => ({ ...p, fatTarget: +e.target.value }))}
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200" data-testid="input-goal-fat" />
                </div>
              </div>
              <button onClick={saveGoals} disabled={savingGoals}
                className="w-full mt-4 bg-[#1e3a5f] text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="button-save-goals">
                <Save size={14} /> {savingGoals ? "Saving..." : "Save Goals"}
              </button>
            </div>
          )}

          {detailTab === "overview" && summary && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-3 border border-orange-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Flame size={14} className="text-orange-500" />
                    <span className="text-[11px] font-medium text-orange-600">Calories Today</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900" data-testid="text-today-calories">
                    {summary.todayMeals.totalCalories}
                  </p>
                  <p className="text-[11px] text-gray-400">/ {summary.profile.dailyCalorieTarget} kcal target</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3 border border-blue-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Dumbbell size={14} className="text-blue-500" />
                    <span className="text-[11px] font-medium text-blue-600">Workouts Today</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900" data-testid="text-today-workouts">
                    {summary.todayWorkouts.workoutCount}
                  </p>
                  <p className="text-[11px] text-gray-400">{summary.todayWorkouts.totalCaloriesBurned} kcal burned</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-3 border border-purple-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Droplets size={14} className="text-purple-500" />
                    <span className="text-[11px] font-medium text-purple-600">Water Today</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900" data-testid="text-today-water">
                    {summary.waterIntake}
                  </p>
                  <p className="text-[11px] text-gray-400">ml consumed</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-3 border border-green-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Send size={14} className="text-green-500" />
                    <span className="text-[11px] font-medium text-green-600">Active Plans</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900" data-testid="text-active-plans">
                    {summary.activePlansCount}
                  </p>
                  <p className="text-[11px] text-gray-400">assigned plans</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Macro Breakdown</h3>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Protein", value: summary.todayMeals.totalProtein || 1, fill: COLORS.protein },
                            { name: "Carbs", value: summary.todayMeals.totalCarbs || 1, fill: COLORS.carbs },
                            { name: "Fat", value: summary.todayMeals.totalFat || 1, fill: COLORS.fat },
                          ]}
                          innerRadius={28} outerRadius={42} paddingAngle={4} dataKey="value" stroke="none"
                        >
                          <Cell fill={COLORS.protein} />
                          <Cell fill={COLORS.carbs} />
                          <Cell fill={COLORS.fat} />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    {[
                      { label: "Protein", val: summary.todayMeals.totalProtein, target: summary.profile.proteinTarget, color: COLORS.protein },
                      { label: "Carbs", val: summary.todayMeals.totalCarbs, target: summary.profile.carbsTarget, color: COLORS.carbs },
                      { label: "Fat", val: summary.todayMeals.totalFat, target: summary.profile.fatTarget, color: COLORS.fat },
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="font-medium text-gray-600">{m.label}</span>
                          <span className="text-gray-400">{Math.round(m.val)}g / {m.target}g</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (m.val / m.target) * 100)}%`, backgroundColor: m.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Client Profile</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  {[
                    { label: "Weight", value: summary.profile.weight ? `${summary.profile.weight} kg` : "—" },
                    { label: "Height", value: summary.profile.height ? `${summary.profile.height} cm` : "—" },
                    { label: "Target Weight", value: summary.profile.targetWeight ? `${summary.profile.targetWeight} kg` : "—" },
                    { label: "Age", value: summary.profile.age || "—" },
                    { label: "Diet", value: summary.profile.dietType },
                    { label: "Cuisine", value: summary.profile.cuisinePreference },
                    { label: "Activity", value: summary.profile.activityLevel },
                    { label: "Gender", value: summary.profile.gender },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[11px] text-gray-400">{item.label}</p>
                      <p className="font-medium text-gray-700 capitalize" data-testid={`text-profile-${item.label.toLowerCase().replace(/\s/g, "-")}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {detailTab === "nutrition" && (
            <>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-1">7-Day Calorie Trend</h3>
                <p className="text-[11px] text-gray-400 mb-3">Daily calorie intake vs target</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nutritionData.daily} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={shortDay} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={35} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                        labelFormatter={formatDay}
                      />
                      <Bar dataKey="calories" fill={COLORS.blue} radius={[4, 4, 0, 0]} maxBarSize={24} name="Calories" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {summary && (
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#1e3a5f]" /> Intake</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border border-dashed border-gray-300" /> Target: {summary.profile.dailyCalorieTarget} kcal</div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Macro Trends</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={nutritionData.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={shortDay} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} labelFormatter={formatDay} />
                      <Area type="monotone" dataKey="protein" stroke={COLORS.protein} fill={COLORS.protein} fillOpacity={0.1} strokeWidth={2} name="Protein (g)" />
                      <Area type="monotone" dataKey="carbs" stroke={COLORS.carbs} fill={COLORS.carbs} fillOpacity={0.1} strokeWidth={2} name="Carbs (g)" />
                      <Area type="monotone" dataKey="fat" stroke={COLORS.fat} fill={COLORS.fat} fillOpacity={0.1} strokeWidth={2} name="Fat (g)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px]">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.protein }} /> Protein</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.carbs }} /> Carbs</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.fat }} /> Fat</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Meals</h3>
                {nutritionData.recentMeals.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No meals logged yet</p>
                ) : (
                  <div className="space-y-2">
                    {nutritionData.recentMeals.map((meal: any) => (
                      <div key={meal.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{meal.name}</p>
                          <p className="text-[11px] text-gray-400">
                            {meal.loggedAt ? new Date(meal.loggedAt).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-sm font-semibold text-gray-700">{meal.calories} kcal</p>
                          <p className="text-[10px] text-gray-400">P:{Math.round(meal.protein || 0)} C:{Math.round(meal.carbs || 0)} F:{Math.round(meal.fat || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {detailTab === "fitness" && (
            <>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-1">7-Day Workout Activity</h3>
                <p className="text-[11px] text-gray-400 mb-3">Calories burned per day</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fitnessData.daily} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={shortDay} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={35} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} labelFormatter={formatDay} />
                      <Bar dataKey="caloriesBurned" fill={COLORS.red} radius={[4, 4, 0, 0]} maxBarSize={24} name="Cal Burned" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
                  <p className="text-2xl font-bold text-[#c41e3a]">
                    {fitnessData.daily.reduce((s, d) => s + (d.caloriesBurned || 0), 0)}
                  </p>
                  <p className="text-[11px] text-gray-400">kcal burned (7d)</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
                  <p className="text-2xl font-bold text-[#1e3a5f]">
                    {fitnessData.daily.reduce((s, d) => s + (d.workoutCount || 0), 0)}
                  </p>
                  <p className="text-[11px] text-gray-400">workouts (7d)</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Workouts</h3>
                {fitnessData.recentWorkouts.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No workouts logged yet</p>
                ) : (
                  <div className="space-y-2">
                    {fitnessData.recentWorkouts.map((w: any) => (
                      <div key={w.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{w.exerciseName}</p>
                          <p className="text-[11px] text-gray-400">
                            {w.setsCompleted && `${w.setsCompleted} sets`}
                            {w.duration && ` | ${w.duration} min`}
                            {w.intensity && ` | ${w.intensity}`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-sm font-semibold text-[#c41e3a]">{w.caloriesBurned || 0} kcal</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {detailTab === "plans" && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                  Plans for {summary?.profile?.name || "Client"} ({clientPlans.length})
                </h3>
                <button onClick={() => {
                  setPlanForm((p) => ({ ...p, clientId: selectedClientId || "" }));
                  setShowPlanForm(true);
                }}
                  className="bg-[#1e3a5f] text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1" data-testid="button-new-plan">
                  <Plus size={12} /> New Plan
                </button>
              </div>

              {showPlanForm && (
                <div className="bg-white rounded-xl p-4 border-2 border-[#1e3a5f]/20 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-sm">Create Plan</h3>
                    <button onClick={() => setShowPlanForm(false)} className="text-gray-400"><X size={18} /></button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button onClick={() => setPlanForm((p) => ({ ...p, type: "prep" }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border ${
                          planForm.type === "prep" ? "border-[#c41e3a] bg-[#c41e3a]/5 text-[#c41e3a]" : "border-gray-200 text-gray-400"
                        }`} data-testid="button-type-prep">
                        <UtensilsCrossed size={14} /> Nutrition Plan
                      </button>
                      <button onClick={() => setPlanForm((p) => ({ ...p, type: "exercise" }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border ${
                          planForm.type === "exercise" ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]" : "border-gray-200 text-gray-400"
                        }`} data-testid="button-type-exercise">
                        <Dumbbell size={14} /> Exercise Plan
                      </button>
                    </div>

                    <input placeholder="Plan title" value={planForm.title}
                      onChange={(e) => setPlanForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200" data-testid="input-plan-title" />

                    <textarea placeholder="Description (optional)" value={planForm.description}
                      onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))}
                      className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200 resize-none" rows={2} data-testid="input-plan-description" />

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-500">Duration (weeks)</label>
                      <input type="number" min={1} max={52} value={planForm.durationWeeks}
                        onChange={(e) => setPlanForm((p) => ({ ...p, durationWeeks: parseInt(e.target.value) || 4 }))}
                        className="w-16 bg-gray-50 rounded-lg px-2 py-1.5 text-sm border border-gray-200 text-center" data-testid="input-plan-duration" />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-2">
                        {planForm.type === "prep" ? "Meals / Items" : "Exercises"}
                      </label>
                      <div className="space-y-2">
                        {planForm.items.map((item, idx) => (
                          <div key={idx} className="flex gap-2">
                            <div className="flex-1 space-y-1">
                              <input placeholder={planForm.type === "prep" ? "Meal name" : "Exercise name"} value={item.name}
                                onChange={(e) => updatePlanItem(idx, "name", e.target.value)}
                                className="w-full bg-gray-50 rounded-lg px-3 py-1.5 text-xs border border-gray-200" data-testid={`input-item-name-${idx}`} />
                              <input placeholder={planForm.type === "prep" ? "e.g., 400cal, 30g protein" : "e.g., 3x12 reps"} value={item.details}
                                onChange={(e) => updatePlanItem(idx, "details", e.target.value)}
                                className="w-full bg-gray-50 rounded-lg px-3 py-1.5 text-xs border border-gray-200" data-testid={`input-item-details-${idx}`} />
                            </div>
                            {planForm.items.length > 1 && (
                              <button onClick={() => removePlanItem(idx)} className="text-gray-300 hover:text-red-400 self-center"><X size={14} /></button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button onClick={addPlanItem} className="mt-2 text-xs text-[#1e3a5f] flex items-center gap-1" data-testid="button-add-item">
                        <Plus size={12} /> Add item
                      </button>
                    </div>

                    <button onClick={sendPlan} disabled={sendingPlan}
                      className="w-full bg-[#1e3a5f] text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      data-testid="button-send-plan-submit">
                      <Send size={14} /> {sendingPlan ? "Sending..." : "Send Plan"}
                    </button>
                  </div>
                </div>
              )}

              {clientPlans.length === 0 && !showPlanForm ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                  <Send className="mx-auto text-gray-300 mb-3" size={40} />
                  <h3 className="font-bold text-gray-900 mb-1">No Plans Yet</h3>
                  <p className="text-sm text-gray-400">Create a nutrition or exercise plan for this client</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientPlans.map((plan) => (
                    <div key={plan.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm" data-testid={`card-plan-${plan.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {plan.type === "prep" ? (
                            <UtensilsCrossed size={14} className="text-[#c41e3a]" />
                          ) : (
                            <Dumbbell size={14} className="text-[#1e3a5f]" />
                          )}
                          <span className="font-semibold text-sm text-gray-900">{plan.title}</span>
                        </div>
                        <button onClick={() => deletePlan(plan.id)} className="text-gray-300 hover:text-red-400" data-testid={`button-delete-plan-${plan.id}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {plan.description && <p className="text-xs text-gray-500 mb-2">{plan.description}</p>}
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        {plan.durationWeeks && <span>{plan.durationWeeks} weeks</span>}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          plan.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>{plan.status}</span>
                        <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                      </div>
                      {Array.isArray(plan.items) && plan.items.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(plan.items as PlanItem[]).slice(0, 4).map((item, i) => (
                            <div key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                              <span className="text-gray-300 mt-0.5">•</span>
                              <span><span className="font-medium">{item.name}</span>{item.details && ` — ${item.details}`}</span>
                            </div>
                          ))}
                          {(plan.items as PlanItem[]).length > 4 && (
                            <p className="text-[11px] text-gray-400 ml-3">+{(plan.items as PlanItem[]).length - 4} more items</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {detailTab === "progress" && progressData && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
                  <div className="w-16 h-16 mx-auto relative mb-2">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none"
                        stroke={progressData.calorieAchievement >= 80 ? "#22c55e" : progressData.calorieAchievement >= 50 ? "#f97316" : "#ef4444"}
                        strokeWidth="3"
                        strokeDasharray={`${Math.min(100, progressData.calorieAchievement || 0) * 0.942} 100`}
                        strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">
                      {Math.round(progressData.calorieAchievement || 0)}%
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-700">Calorie Goal</p>
                  <p className="text-[10px] text-gray-400">7-day average</p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
                  <div className="w-16 h-16 mx-auto relative mb-2">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none"
                        stroke={progressData.proteinAchievement >= 80 ? "#A855F7" : "#d8b4fe"}
                        strokeWidth="3"
                        strokeDasharray={`${Math.min(100, progressData.proteinAchievement || 0) * 0.942} 100`}
                        strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">
                      {Math.round(progressData.proteinAchievement || 0)}%
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-700">Protein Goal</p>
                  <p className="text-[10px] text-gray-400">7-day average</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Weight Progress</h3>
                <div className="flex items-center gap-6 mt-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{progressData.currentWeight || "—"}</p>
                    <p className="text-[11px] text-gray-400">Current (kg)</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <div className="h-0.5 w-8 bg-gray-200" />
                      <TrendingUp size={16} className="text-[#8fbc8f]" />
                      <div className="h-0.5 w-8 bg-gray-200" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#1e3a5f]">{progressData.targetWeight || "—"}</p>
                    <p className="text-[11px] text-gray-400">Target (kg)</p>
                  </div>
                </div>
                {progressData.currentWeight && progressData.targetWeight && (
                  <div className="mt-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#1e3a5f] to-[#8fbc8f] rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(5, progressData.targetWeight > progressData.currentWeight
                            ? (progressData.currentWeight / progressData.targetWeight) * 100
                            : ((2 * progressData.targetWeight - progressData.currentWeight) / progressData.targetWeight) * 100
                          ))}%`
                        }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 text-center">
                      {Math.abs(progressData.currentWeight - progressData.targetWeight).toFixed(1)} kg to go
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setEditingGoals(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 rounded-xl p-3 text-left" data-testid="button-adjust-goals">
                    <Target size={16} className="text-[#1e3a5f] mb-1" />
                    <p className="text-xs font-medium text-gray-800">Adjust Goals</p>
                    <p className="text-[10px] text-gray-400">Update targets</p>
                  </button>
                  <button onClick={() => { setPlanForm((p) => ({ ...p, clientId: selectedClientId || "" })); setShowPlanForm(true); setDetailTab("plans"); }}
                    className="bg-[#c41e3a]/5 border border-[#c41e3a]/20 rounded-xl p-3 text-left" data-testid="button-create-plan-quick">
                    <Send size={16} className="text-[#c41e3a] mb-1" />
                    <p className="text-xs font-medium text-gray-800">New Plan</p>
                    <p className="text-[10px] text-gray-400">Nutrition or exercise</p>
                  </button>
                  <button onClick={() => setLocation("/messages")}
                    className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-left" data-testid="button-message-quick">
                    <MessageCircle size={16} className="text-purple-500 mb-1" />
                    <p className="text-xs font-medium text-gray-800">Message</p>
                    <p className="text-[10px] text-gray-400">Chat with client</p>
                  </button>
                  <button onClick={() => setDetailTab("nutrition")}
                    className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-left" data-testid="button-view-nutrition-quick">
                    <BarChart3 size={16} className="text-orange-500 mb-1" />
                    <p className="text-xs font-medium text-gray-800">Nutrition</p>
                    <p className="text-[10px] text-gray-400">View food logs</p>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
