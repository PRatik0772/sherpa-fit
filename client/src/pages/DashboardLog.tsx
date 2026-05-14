import { useState, useEffect, useRef, useCallback } from "react";
import { useSearch } from "wouter";
import { useStore, authFetch } from "@/lib/store";
import { ArrowLeft, Plus, Droplets, Utensils, Dumbbell, Search, Mic, Flame, Sparkles, Loader2, Bookmark, BookmarkCheck, Trash2, Check, X } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { triggerHaptic } from "@/lib/capacitor";

export default function DashboardLog() {
  const store = useStore();
  const { toast } = useToast();
  const search = useSearch();
  const [activeSection, setActiveSection] = useState<"water" | "meal" | "exercise" | null>(null);

  const [autoOpenVoice, setAutoOpenVoice] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const section = params.get("section");
    const voice = params.get("voice");
    if (section === "meal" || section === "exercise" || section === "water") {
      setActiveSection(section);
    } else if (voice === "1") {
      setActiveSection("meal");
    } else {
      setActiveSection(null);
    }
    setAutoOpenVoice(voice === "1");
  }, [search]);

  return (
    <div className="min-h-screen bg-[#f8f8fa] pb-28" data-testid="log-page">
      {!activeSection && (
        <>
          <div className="bg-white px-5 pt-14 pb-5 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-900 font-display">Log</h1>
          </div>

          <div className="px-4 mt-4 space-y-3" data-testid="log-options">
            <button
              onClick={() => { triggerHaptic('light'); setActiveSection("meal"); }}
              className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 text-left active:opacity-80 transition"
              data-testid="log-option-food"
            >
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                <Utensils size={24} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-[16px] font-semibold text-slate-900 font-display">Log Food</p>
                <p className="text-[13px] text-slate-400 mt-0.5 font-body">Track meals, snacks & drinks</p>
              </div>
              <Plus size={20} className="text-slate-300" />
            </button>

            <button
              onClick={() => { triggerHaptic('light'); setActiveSection("exercise"); }}
              className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 text-left active:opacity-80 transition"
              data-testid="log-option-exercise"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Dumbbell size={24} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-[16px] font-semibold text-slate-900 font-display">Log Exercise</p>
                <p className="text-[13px] text-slate-400 mt-0.5 font-body">Workouts, cardio & activities</p>
              </div>
              <Plus size={20} className="text-slate-300" />
            </button>

            <button
              onClick={() => { triggerHaptic('light'); setActiveSection("water"); }}
              className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 text-left active:opacity-80 transition"
              data-testid="log-option-water"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center">
                <Droplets size={24} className="text-cyan-600" />
              </div>
              <div className="flex-1">
                <p className="text-[16px] font-semibold text-slate-900 font-display">Log Water</p>
                <p className="text-[13px] text-slate-400 mt-0.5 font-body">Track your daily hydration</p>
              </div>
              <Plus size={20} className="text-slate-300" />
            </button>
          </div>

          <div className="px-4 mt-5">
            <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide mb-3 font-body">Today's Summary</p>
            <div className="flex gap-3">
              <div className="flex-1 bg-white rounded-2xl p-4 border border-slate-100 text-center">
                <p className="text-xl font-bold text-slate-900 font-display" data-testid="text-summary-calories">{store.calories}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-body">calories</p>
              </div>
              <div className="flex-1 bg-white rounded-2xl p-4 border border-slate-100 text-center">
                <p className="text-xl font-bold text-slate-900 font-display" data-testid="text-summary-workouts">{store.workoutLogs.length}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-body">workouts</p>
              </div>
              <div className="flex-1 bg-white rounded-2xl p-4 border border-slate-100 text-center">
                <p className="text-xl font-bold text-slate-900 font-display" data-testid="text-summary-water">{Math.round(store.water / 100) / 10}L</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-body">water</p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeSection === "water" && <WaterLogger store={store} toast={toast} onBack={() => setActiveSection(null)} />}
      {activeSection === "meal" && <MealLogger store={store} toast={toast} onBack={() => setActiveSection(null)} autoOpenVoice={autoOpenVoice} />}
      {activeSection === "exercise" && <ExerciseLogger store={store} toast={toast} onBack={() => setActiveSection(null)} />}
    </div>
  );
}

function CalHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="bg-white px-4 pt-14 pb-4 border-b border-slate-100 flex items-center relative">
      <button onClick={onBack} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200 transition z-10" data-testid="button-back-log">
        <ArrowLeft size={18} className="text-slate-700" />
      </button>
      <h2 className="absolute left-0 right-0 text-center text-[17px] font-bold text-slate-900 font-display">{title}</h2>
    </div>
  );
}

type AIFoodResult = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  serving?: string;
  ingredients?: string;
  confidence?: number;
};

function MealLogger({ store, toast, onBack, autoOpenVoice }: { store: any; toast: any; onBack: () => void; autoOpenVoice?: boolean }) {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sugar, setSugar] = useState("");
  const [sodium, setSodium] = useState("");
  const [logging, setLogging] = useState(false);

  const [aiResults, setAiResults] = useState<AIFoodResult[]>([]);
  const [aiSearching, setAiSearching] = useState(false);
  const [selectedAiFood, setSelectedAiFood] = useState<AIFoodResult | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  const [dbResults, setDbResults] = useState<AIFoodResult[]>([]);
  const [dbSearching, setDbSearching] = useState(false);
  const dbSearchTimeoutRef = useRef<any>(null);

  const [savedFoods, setSavedFoods] = useState<any[]>([]);
  const [savedFoodsLoading, setSavedFoodsLoading] = useState(false);
  const [savedFoodsMap, setSavedFoodsMap] = useState<Map<string, string>>(new Map()); // name → id
  const [mealTemplatesList, setMealTemplatesList] = useState<any[]>([]);
  const [mealTemplatesLoading, setMealTemplatesLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string | null>(null);
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Auto-open voice sheet when navigated with ?voice=1
  useEffect(() => {
    if (autoOpenVoice) {
      const t = setTimeout(() => setShowVoiceSheet(true), 120);
      return () => clearTimeout(t);
    }
  }, [autoOpenVoice]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (dbSearchTimeoutRef.current) clearTimeout(dbSearchTimeoutRef.current);
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch {}
    };
  }, []);

  // Load saved foods on mount so bookmark state is correct everywhere
  useEffect(() => { loadSavedFoods(); }, []);

  useEffect(() => {
    if (activeTab === "saved") loadSavedFoods();
    if (activeTab === "my_meals") loadMealTemplates();
  }, [activeTab]);

  const loadMealTemplates = async () => {
    setMealTemplatesLoading(true);
    try {
      const res = await authFetch("/api/meal-templates");
      if (res.ok) setMealTemplatesList(await res.json());
    } catch {
      toast({ title: "Error", description: "Could not load saved meals", variant: "destructive" });
    }
    setMealTemplatesLoading(false);
  };

  // Compute session meals: foods logged in the same meal slot as the most-recently logged meal.
  // Slots: Breakfast 05:00-10:30, Lunch 10:30-14:30, Snack 14:30-17:30, Dinner 17:30-21:00, Late 21:00-05:00
  const getMealSlot = (d: Date) => {
    const h = d.getHours() + d.getMinutes() / 60;
    if (h >= 5 && h < 10.5) return "breakfast";
    if (h >= 10.5 && h < 14.5) return "lunch";
    if (h >= 14.5 && h < 17.5) return "snack";
    if (h >= 17.5 && h < 21) return "dinner";
    return "late";
  };
  const sessionMeals = (() => {
    if (!store.meals.length) return [];
    const dated = store.meals.filter(m => m.loggedAt);
    if (!dated.length) return store.meals;
    const latestDate = new Date(Math.max(...dated.map(m => new Date(m.loggedAt!).getTime())));
    const currentSlot = getMealSlot(latestDate);
    return store.meals.filter(m => {
      if (!m.loggedAt) return true;
      return getMealSlot(new Date(m.loggedAt)) === currentSlot;
    });
  })();

  const saveAsMealTemplate = async () => {
    if (!templateName.trim() || sessionMeals.length < 2) return;
    setSavingTemplate(true);
    try {
      const res = await authFetch("/api/meal-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName.trim(), foods: sessionMeals }),
      });
      if (res.ok) {
        const row = await res.json();
        setMealTemplatesList(prev => [row, ...prev]);
        setTemplateName("");
        setShowSaveTemplate(false);
        triggerHaptic("success");
        toast({ title: "Meal saved", description: `"${row.name}" saved as a meal template`, duration: 2000 });
      }
    } catch {
      toast({ title: "Error", description: "Could not save meal template", variant: "destructive" });
    }
    setSavingTemplate(false);
  };

  const deleteMealTemplate = async (id: string) => {
    setMealTemplatesList(prev => prev.filter(t => t.id !== id));
    try {
      const res = await authFetch(`/api/meal-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      triggerHaptic("light");
    } catch {
      loadMealTemplates();
      toast({ title: "Error", description: "Could not delete meal template", variant: "destructive" });
    }
  };

  const loadSavedFoods = async () => {
    setSavedFoodsLoading(true);
    try {
      const res = await authFetch("/api/saved-foods");
      if (res.ok) {
        const list = await res.json();
        setSavedFoods(list);
        const map = new Map<string, string>();
        list.forEach((f: any) => {
          if (f.name) map.set(f.name.toLowerCase(), f.id);
          if (f.id) map.set(`__id__${f.id}`, f.id); // stable ID-based key
        });
        setSavedFoodsMap(map);
      }
    } catch {
      toast({ title: "Error", description: "Could not load saved foods", variant: "destructive" });
    }
    setSavedFoodsLoading(false);
  };

  // Toggle save: POST if not saved, DELETE if already saved
  // Map uses name-based keys to support cross-source matching (search results vs DB foods)
  // Falls back to food.savedFoodId if available for stable lookups
  const handleToggleSaveFood = async (food: AIFoodResult | any) => {
    const key = (food.savedFoodId ? `__id__${food.savedFoodId}` : null) ?? food.name?.toLowerCase();
    const existingId = food.savedFoodId || savedFoodsMap.get(food.name?.toLowerCase());
    if (existingId) {
      // Optimistic unsave
      setSavedFoodsMap(prev => { const m = new Map(prev); m.delete(key); return m; });
      setSavedFoods(prev => prev.filter(f => f.id !== existingId));
      try {
        const res = await authFetch(`/api/saved-foods/${existingId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("delete failed");
        triggerHaptic("light");
        toast({ title: "Removed", description: `${food.name} removed from saved foods`, duration: 1500 });
      } catch {
        loadSavedFoods();
        toast({ title: "Error", description: "Could not remove saved food", variant: "destructive" });
      }
    } else {
      // Optimistic save with a temp id
      const tempId = `temp-${Date.now()}`;
      setSavedFoodsMap(prev => { const m = new Map(prev); m.set(key, tempId); return m; });
      try {
        const res = await authFetch("/api/saved-foods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(food),
        });
        if (res.ok) {
          const saved = await res.json();
          setSavedFoods(prev => [saved, ...prev.filter(f => f.id !== tempId)]);
          setSavedFoodsMap(prev => { const m = new Map(prev); m.set(key, saved.id); return m; });
          triggerHaptic("success");
          toast({ title: "Saved", description: `${food.name} saved for quick access`, duration: 2000 });
        } else {
          setSavedFoodsMap(prev => { const m = new Map(prev); m.delete(key); return m; });
          toast({ title: "Error", description: "Could not save food", variant: "destructive" });
        }
      } catch {
        setSavedFoodsMap(prev => { const m = new Map(prev); m.delete(key); return m; });
        toast({ title: "Error", description: "Could not save food", variant: "destructive" });
      }
    }
  };

  const handleUnsaveFood = async (id: string, name?: string) => {
    const key = name?.toLowerCase();
    setSavedFoods(prev => prev.filter(f => f.id !== id));
    if (key) setSavedFoodsMap(prev => { const m = new Map(prev); m.delete(key); return m; });
    try {
      const res = await authFetch(`/api/saved-foods/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      triggerHaptic("light");
      toast({ title: "Removed", description: "Removed from saved foods", duration: 1500 });
    } catch {
      loadSavedFoods();
      toast({ title: "Error", description: "Could not remove saved food", variant: "destructive" });
    }
  };

  const [voicePermissionDenied, setVoicePermissionDenied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const [mediaRecording, setMediaRecording] = useState(false);
  const [mediaTranscribing, setMediaTranscribing] = useState(false);

  const useSpeechRecognition = typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Start MediaRecorder fallback when SpeechRecognition isn't available
  const startMediaRecorder = async () => {
    if (mediaRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg" });
      mediaChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) mediaChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        mediaStreamRef.current = null;
        stream.getTracks().forEach(t => t.stop());
        setMediaRecording(false);
        setMediaTranscribing(true);
        try {
          const blob = new Blob(mediaChunksRef.current, { type: mr.mimeType });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            try {
              const base64 = (reader.result as string).split(",")[1];
              const mimeType = mr.mimeType.split(";")[0];
              const res = await authFetch("/api/transcribe-audio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audio: base64, mimeType }),
              });
              if (res.ok) {
                const { transcript } = await res.json();
                if (transcript?.trim()) setVoiceTranscript(transcript.trim());
                else toast({ title: "No speech detected", description: "Try again in a quieter environment", variant: "destructive" });
              } else {
                toast({ title: "Transcription failed", description: "Could not process audio. Try again.", variant: "destructive" });
              }
            } catch {
              toast({ title: "Error", description: "Audio processing failed", variant: "destructive" });
            }
            setMediaTranscribing(false);
          };
        } catch {
          setMediaTranscribing(false);
          toast({ title: "Error", description: "Could not process recording", variant: "destructive" });
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setMediaRecording(true);
      triggerHaptic("medium");
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setVoicePermissionDenied(true);
      } else {
        toast({ title: "Microphone error", description: "Could not access microphone", variant: "destructive" });
      }
    }
  };

  // Open bottom sheet first; recognition starts only when user taps mic inside sheet
  const startVoiceLog = () => {
    setVoicePermissionDenied(false);
    setVoiceTranscript(null);
    setInterimTranscript(null);
    setShowVoiceSheet(true);
    triggerHaptic("medium");
  };

  const startRecognitionInSheet = () => {
    if (!useSpeechRecognition) {
      startMediaRecorder();
      return;
    }
    if (voiceListening) {
      try { recognitionRef.current?.stop(); } catch {}
      return;
    }
    setVoicePermissionDenied(false);
    setInterimTranscript(null);
    triggerHaptic("medium");
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => {
      setVoiceListening(false);
      setInterimTranscript(null);
    };
    recognition.onerror = (event: any) => {
      setVoiceListening(false);
      setInterimTranscript(null);
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        setVoicePermissionDenied(true);
      } else if (event.error !== "no-speech") {
        toast({ title: "Couldn't hear you", description: "Try speaking clearly, then tap the mic again", variant: "destructive" });
      }
    };
    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += text;
        else interim += text;
      }
      if (interim) setInterimTranscript(interim);
      if (final) {
        setVoiceListening(false);
        setInterimTranscript(null);
        triggerHaptic("selection");
        setVoiceTranscript(final);
      }
    };
    recognition.start();
  };

  const tabs = [
    { id: "all", label: "All" },
    { id: "my_foods", label: "My foods" },
    { id: "my_meals", label: "My meals" },
    { id: "saved", label: "Saved foods" },
  ];

  const searchFoodAI = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setAiResults([]);
      return;
    }
    setAiSearching(true);
    try {
      const res = await authFetch("/api/analyze-food-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: query }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.name) {
          setAiResults([data]);
        }
      }
    } catch {
      setAiResults([]);
    } finally {
      setAiSearching(false);
    }
  }, []);

  const searchFoodDB = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setDbResults([]);
      return;
    }
    setDbSearching(true);
    try {
      const res = await authFetch(`/api/food-search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setDbResults(data || []);
      }
    } catch {
      setDbResults([]);
    } finally {
      setDbSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (dbSearchTimeoutRef.current) clearTimeout(dbSearchTimeoutRef.current);
    if (value.length >= 2) {
      dbSearchTimeoutRef.current = setTimeout(() => searchFoodDB(value), 200);
    } else {
      setDbResults([]);
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => searchFoodAI(value), 1000);
    } else {
      setAiResults([]);
    }
  };

  const handleSearchSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.length >= 3) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchFoodAI(searchQuery);
    }
  };

  const selectAiFood = (food: AIFoodResult) => {
    triggerHaptic('selection');
    setSelectedAiFood(food);
    setName(food.name);
    setCalories(String(food.calories));
    setProtein(String(food.protein));
    setCarbs(String(food.carbs));
    setFat(String(food.fat));
    setFiber(String(food.fiber || 0));
    setSugar(String(food.sugar || 0));
    setSodium(String(food.sodium || 0));
  };

  const logMeal = async () => {
    if (!name || !calories) return;
    setLogging(true);
    try {
      await store.addMeal({
        name, calories: Number(calories), protein: Number(protein) || 0,
        carbs: Number(carbs) || 0, fat: Number(fat) || 0,
        fiber: Number(fiber) || 0, sugar: Number(sugar) || 0, sodium: Number(sodium) || 0,
      });
      triggerHaptic('success');
      toast({ title: "Meal logged", description: `${name} added` });
      setName(""); setCalories(""); setProtein(""); setCarbs(""); setFat("");
      setFiber(""); setSugar(""); setSodium("");
      setSelectedAiFood(null);
      setShowManualAdd(false);
      setSearchQuery("");
      setAiResults([]);
      setDbResults([]);
    } catch {
      toast({ title: "Error", description: "Failed to log meal", variant: "destructive" });
    }
    setLogging(false);
  };

  const quickAddAiFood = async (food: AIFoodResult) => {
    try {
      await store.addMeal({
        name: food.name, calories: food.calories, protein: food.protein,
        carbs: food.carbs, fat: food.fat,
        fiber: food.fiber || 0, sugar: food.sugar || 0, sodium: food.sodium || 0,
      });
      triggerHaptic('success');
      toast({ title: "Meal logged", description: `${food.name} - ${food.calories} cal added` });
    } catch {
      toast({ title: "Error", description: "Failed to log meal", variant: "destructive" });
    }
  };

  if (selectedAiFood) {
    return (
      <div data-testid="meal-logger-ai-detail">
        <CalHeader title="Add Food" onBack={() => setSelectedAiFood(null)} />
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-blue-500" />
              <p className="text-[11px] text-blue-600 font-medium font-body">AI-powered nutrition</p>
            </div>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full text-xl font-bold text-slate-900 font-display border-b border-slate-200 pb-2 focus:outline-none focus:border-blue-500 bg-transparent mb-4"
              data-testid="input-ai-food-name" />

            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className="text-[10px] text-slate-400 font-body mb-1">Calories</p>
                <input type="number" value={calories} onChange={e => setCalories(e.target.value)}
                  className="text-lg font-bold text-slate-900 font-display w-full text-center bg-transparent focus:outline-none"
                  data-testid="input-ai-calories" />
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                <p className="text-[10px] text-red-400 font-body mb-1">Protein</p>
                <input type="number" value={protein} onChange={e => setProtein(e.target.value)}
                  className="text-lg font-bold text-red-500 font-display w-full text-center bg-transparent focus:outline-none"
                  data-testid="input-ai-protein" />
                <p className="text-[9px] text-slate-400">g</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
                <p className="text-[10px] text-orange-400 font-body mb-1">Carbs</p>
                <input type="number" value={carbs} onChange={e => setCarbs(e.target.value)}
                  className="text-lg font-bold text-orange-500 font-display w-full text-center bg-transparent focus:outline-none"
                  data-testid="input-ai-carbs" />
                <p className="text-[9px] text-slate-400">g</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                <p className="text-[10px] text-blue-400 font-body mb-1">Fat</p>
                <input type="number" value={fat} onChange={e => setFat(e.target.value)}
                  className="text-lg font-bold text-blue-500 font-display w-full text-center bg-transparent focus:outline-none"
                  data-testid="input-ai-fat" />
                <p className="text-[9px] text-slate-400">g</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                <p className="text-[10px] text-slate-400 font-body">Fiber</p>
                <input type="number" value={fiber} onChange={e => setFiber(e.target.value)}
                  className="text-sm font-bold text-green-600 font-display w-full text-center bg-transparent focus:outline-none"
                  data-testid="input-ai-fiber" />
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                <p className="text-[10px] text-slate-400 font-body">Sugar</p>
                <input type="number" value={sugar} onChange={e => setSugar(e.target.value)}
                  className="text-sm font-bold text-pink-500 font-display w-full text-center bg-transparent focus:outline-none"
                  data-testid="input-ai-sugar" />
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                <p className="text-[10px] text-slate-400 font-body">Sodium</p>
                <input type="number" value={sodium} onChange={e => setSodium(e.target.value)}
                  className="text-sm font-bold text-purple-500 font-display w-full text-center bg-transparent focus:outline-none"
                  data-testid="input-ai-sodium" />
              </div>
            </div>

            {selectedAiFood.ingredients && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-body">Ingredients</p>
                <p className="text-[13px] text-slate-600 font-body leading-relaxed">{selectedAiFood.ingredients}</p>
              </div>
            )}

            <button onClick={logMeal} disabled={logging || !name || !calories}
              className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-[15px] disabled:opacity-50 active:opacity-80 transition font-display"
              data-testid="button-log-ai-meal">
              {logging ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Log Meal"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showManualAdd) {
    return (
      <div data-testid="meal-logger-manual">
        <CalHeader title="Manual Add" onBack={() => setShowManualAdd(false)} />
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <div className="space-y-3">
              <input type="text" placeholder="What did you eat?" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent font-body"
                data-testid="input-meal-name" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Calories" value={calories} onChange={e => setCalories(e.target.value)}
                  className="px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-900 font-body"
                  data-testid="input-calories" />
                <input type="number" placeholder="Protein (g)" value={protein} onChange={e => setProtein(e.target.value)}
                  className="px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-900 font-body"
                  data-testid="input-protein" />
                <input type="number" placeholder="Carbs (g)" value={carbs} onChange={e => setCarbs(e.target.value)}
                  className="px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-900 font-body"
                  data-testid="input-carbs" />
                <input type="number" placeholder="Fat (g)" value={fat} onChange={e => setFat(e.target.value)}
                  className="px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-900 font-body"
                  data-testid="input-fat" />
              </div>
              <button onClick={logMeal} disabled={logging || !name || !calories}
                className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-[15px] disabled:opacity-50 active:opacity-80 transition font-display"
                data-testid="button-log-meal">
                {logging ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Add Meal"}
              </button>
            </div>
          </div>

          {store.meals.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-slate-100 mt-3">
              <p className="text-[15px] font-semibold text-slate-900 mb-3 font-display">Today's Meals</p>
              <div className="space-y-3">
                {store.meals.map((meal: any, i: number) => (
                  <div key={meal.id || i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0" data-testid={`logged-meal-${i}`}>
                    <div>
                      <p className="text-[14px] font-medium text-slate-900 font-display">{meal.name}</p>
                      <p className="text-[12px] text-slate-400 font-body">{meal.time}</p>
                    </div>
                    <span className="text-[14px] font-semibold text-slate-900 font-display">{meal.calories} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="meal-logger">
      <CalHeader title="Log Food" onBack={onBack} />

      <div className="px-4 mt-3 flex gap-0 border-b border-slate-100 bg-white">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { triggerHaptic('selection'); setActiveTab(tab.id); }}
            className={`flex-1 py-3 text-[13px] font-medium transition-all font-body relative ${
              activeTab === tab.id ? "text-slate-900" : "text-slate-400"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-slate-900 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Describe what you ate (e.g. chicken curry with rice)"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchSubmit}
            className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-white border border-slate-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent font-body"
            data-testid="input-food-search"
          />
          {(aiSearching || dbSearching) && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 size={16} className="animate-spin text-slate-400" />
            </div>
          )}
          {!aiSearching && !dbSearching && searchQuery.length >= 3 && (
            <button
              onClick={() => searchFoodAI(searchQuery)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-900 text-white"
              data-testid="button-ai-search"
            >
              <Sparkles size={14} />
            </button>
          )}
        </div>
        {searchQuery.length >= 1 && searchQuery.length < 2 && (
          <p className="text-[11px] text-slate-400 mt-1.5 ml-1 font-body">Type at least 2 characters to search</p>
        )}
        {searchQuery.length === 2 && (
          <p className="text-[11px] text-slate-400 mt-1.5 ml-1 font-body">Type 1 more character for AI search</p>
        )}
      </div>

      {dbResults.length > 0 && (
        <div className="px-4 mt-4" data-testid="db-results-section">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Utensils size={13} className="text-green-500" />
            <p className="text-[12px] font-semibold text-green-600 font-body">From Food Database</p>
            {dbSearching && <Loader2 size={12} className="animate-spin text-green-400 ml-1" />}
          </div>
          <div className="space-y-2">
            {dbResults.map((food, i) => (
              <div key={`db-${i}`} className="bg-white rounded-2xl p-4 border border-green-100 shadow-sm" data-testid={`db-food-result-${i}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold text-slate-900 font-display">{food.name}</p>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 font-body">DB</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Flame size={13} className="text-orange-500" />
                      <span className="text-[14px] font-bold text-slate-800 font-display">{food.calories} cal</span>
                      {food.serving && <span className="text-[12px] text-slate-400 font-body">· {food.serving}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-red-500 font-medium font-body">🍖 {food.protein}g</span>
                      <span className="text-[11px] text-orange-500 font-medium font-body">🌾 {food.carbs}g</span>
                      <span className="text-[11px] text-blue-500 font-medium font-body">💧 {food.fat}g</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-3">
                    <button
                      onClick={() => handleToggleSaveFood(food)}
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center active:bg-slate-100 transition ${savedFoodsMap.has(food.name?.toLowerCase()) ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}
                      data-testid={`button-save-db-food-${i}`}
                      title={savedFoodsMap.has(food.name?.toLowerCase()) ? "Remove from saved" : "Save to My Foods"}
                    >
                      {savedFoodsMap.has(food.name?.toLowerCase())
                        ? <BookmarkCheck size={13} className="text-blue-500" />
                        : <Bookmark size={13} className="text-slate-500" />}
                    </button>
                    <button
                      onClick={() => selectAiFood(food)}
                      className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-[12px] font-semibold active:bg-slate-200 transition font-display"
                      data-testid={`button-edit-db-food-${i}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => quickAddAiFood(food)}
                      className="px-3 py-2 rounded-xl bg-green-600 text-white text-[12px] font-semibold active:opacity-80 transition font-display"
                      data-testid={`button-add-db-food-${i}`}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dbSearching && dbResults.length === 0 && searchQuery.length >= 2 && (
        <div className="px-4 mt-4">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-green-400" />
            <p className="text-[12px] text-green-600 font-body">Searching food database...</p>
          </div>
        </div>
      )}

      {aiSearching && aiResults.length === 0 && searchQuery.length >= 3 && (
        <div className="px-4 mt-4">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-blue-400" />
            <p className="text-[12px] text-blue-600 font-body">AI analyzing your food...</p>
          </div>
        </div>
      )}

      {aiResults.length > 0 && (
        <div className="px-4 mt-4" data-testid="ai-results-section">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles size={13} className="text-blue-500" />
            <p className="text-[12px] font-semibold text-blue-600 font-body">AI-Powered Results</p>
            {aiSearching && <Loader2 size={12} className="animate-spin text-blue-400 ml-1" />}
          </div>
          <div className="space-y-2">
            {aiResults.map((food, i) => (
              <div key={`ai-${i}`} className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm" data-testid={`ai-food-result-${i}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold text-slate-900 font-display">{food.name}</p>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 font-body">AI</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Flame size={13} className="text-orange-500" />
                      <span className="text-[14px] font-bold text-slate-800 font-display">{food.calories} cal</span>
                      {food.serving && <span className="text-[12px] text-slate-400 font-body">· {food.serving}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-red-500 font-medium font-body">🍖 {food.protein}g</span>
                      <span className="text-[11px] text-orange-500 font-medium font-body">🌾 {food.carbs}g</span>
                      <span className="text-[11px] text-blue-500 font-medium font-body">💧 {food.fat}g</span>
                    </div>
                    {food.ingredients && (
                      <p className="text-[11px] text-slate-400 mt-2 font-body line-clamp-2">{food.ingredients}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-3">
                    <button
                      onClick={() => handleToggleSaveFood(food)}
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center active:bg-slate-100 transition ${savedFoodsMap.has(food.name?.toLowerCase()) ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}
                      data-testid={`button-save-ai-food-${i}`}
                      title={savedFoodsMap.has(food.name?.toLowerCase()) ? "Remove from saved" : "Save to My Foods"}
                    >
                      {savedFoodsMap.has(food.name?.toLowerCase())
                        ? <BookmarkCheck size={13} className="text-blue-500" />
                        : <Bookmark size={13} className="text-slate-500" />}
                    </button>
                    <button
                      onClick={() => selectAiFood(food)}
                      className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-[12px] font-semibold active:bg-slate-200 transition font-display"
                      data-testid={`button-edit-ai-food-${i}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => quickAddAiFood(food)}
                      className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[12px] font-semibold active:opacity-80 transition font-display"
                      data-testid={`button-add-ai-food-${i}`}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "my_foods" && (
        <div className="px-4 mt-4">
          {store.meals.length === 0 ? (
            <div className="text-center py-14">
              <Utensils size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-[15px] font-semibold text-slate-700 font-display">No foods logged today</p>
              <p className="text-[13px] text-slate-400 font-body mt-1 mb-4">Search above to log your first meal</p>
              <button
                onClick={() => { setActiveTab("all"); triggerHaptic("light"); }}
                className="px-5 py-2.5 bg-blue-600 text-white text-[13px] font-semibold font-display rounded-xl active:opacity-80 transition"
                data-testid="button-go-search-food"
              >
                Search Foods
              </button>
            </div>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide mb-3 font-body">Today's logged foods</p>
              <div className="space-y-2">
                {store.meals.map((meal: any, i: number) => (
                  <div key={meal.id || i} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100" data-testid={`my-food-${i}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-slate-900 font-display truncate">{meal.name}</p>
                      <p className="text-[12px] text-slate-400 font-body">{meal.calories} cal · {meal.protein}g P · {meal.time}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleSaveFood(meal)}
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center active:bg-slate-100 transition ${savedFoodsMap.has(meal.name?.toLowerCase()) ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}
                        data-testid={`button-save-log-food-${i}`}
                        title={savedFoodsMap.has(meal.name?.toLowerCase()) ? "Remove from saved" : "Save to My Foods"}
                      >
                        {savedFoodsMap.has(meal.name?.toLowerCase())
                          ? <BookmarkCheck size={13} className="text-blue-500" />
                          : <Bookmark size={13} className="text-slate-500" />}
                      </button>
                      <button
                        onClick={() => quickAddAiFood(meal)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-[12px] font-semibold active:bg-slate-200 transition font-display"
                        data-testid={`button-add-again-${i}`}
                      >
                        + Add again
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "my_meals" && (
        <div className="px-4 mt-4">
          {/* Save as Meal Template — shown when 2+ foods logged in the current session (last 2 h) */}
          {sessionMeals.length >= 2 && (
            <div className="mb-4">
              {!showSaveTemplate ? (
                <button
                  onClick={() => setShowSaveTemplate(true)}
                  className="w-full py-2.5 rounded-2xl border-2 border-dashed border-orange-300 text-orange-600 text-[13px] font-semibold font-display active:opacity-70 transition flex items-center justify-center gap-2"
                  data-testid="button-show-save-template"
                >
                  <Plus size={15} />
                  Save this meal as a template
                </button>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                  <p className="text-[12px] text-orange-700 font-body mb-2">Name this meal template ({sessionMeals.length} foods, {sessionMeals.reduce((s: number, m: any) => s + (m.calories || 0), 0)} cal)</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && saveAsMealTemplate()}
                      placeholder="e.g. My Breakfast, Dal Bhat Lunch…"
                      className="flex-1 px-3 py-2 rounded-xl border border-orange-200 text-[13px] font-body text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/30 bg-white"
                      data-testid="input-template-name"
                    />
                    <button
                      onClick={saveAsMealTemplate}
                      disabled={!templateName.trim() || savingTemplate}
                      className="px-4 py-2 rounded-xl bg-orange-500 text-white text-[12px] font-semibold active:opacity-80 transition disabled:opacity-40 font-display"
                      data-testid="button-save-template"
                    >
                      {savingTemplate ? "..." : "Save"}
                    </button>
                    <button onClick={() => setShowSaveTemplate(false)} className="p-2 rounded-xl bg-white border border-orange-200 text-orange-400" data-testid="button-cancel-save-template">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DB-backed meal templates */}
          {mealTemplatesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-slate-300" />
            </div>
          ) : mealTemplatesList.length === 0 ? (
            <div className="text-center py-10">
              <Utensils size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-[15px] font-semibold text-slate-700 font-display">No saved meal templates yet</p>
              <p className="text-[13px] text-slate-400 font-body mt-1 leading-relaxed px-6">
                Log 2+ foods and tap "Save today's foods as a meal template" above to create a quick-add meal.
              </p>
              <button
                onClick={() => setActiveTab("all")}
                className="mt-4 px-5 py-2.5 bg-slate-900 text-white text-[13px] font-semibold rounded-xl active:opacity-80 transition font-display"
                data-testid="button-goto-log-meal"
              >
                Log a meal to get started
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide font-body">{mealTemplatesList.length} saved meal{mealTemplatesList.length !== 1 ? "s" : ""}</p>
              {mealTemplatesList.map((template: any, i: number) => (
                <div key={template.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm" data-testid={`meal-template-${i}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[15px] font-bold text-slate-900 font-display">{template.name}</p>
                      <p className="text-[12px] text-orange-500 font-semibold font-body">{template.totalCalories} cal · {(template.foods || []).length} items</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          for (const food of (template.foods || [])) {
                            await quickAddAiFood(food);
                          }
                          triggerHaptic("success");
                          toast({ title: "Meal added", description: `${template.name} logged successfully`, duration: 2000 });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[12px] font-semibold active:opacity-80 transition font-display"
                        data-testid={`button-log-template-${i}`}
                      >
                        + Log all
                      </button>
                      <button
                        onClick={() => deleteMealTemplate(template.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition"
                        data-testid={`button-delete-template-${i}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(template.foods || []).slice(0, 5).map((f: any, j: number) => (
                      <span key={j} className="px-2 py-0.5 bg-slate-100 rounded-full text-[11px] text-slate-600 font-body">{f.name}</span>
                    ))}
                    {(template.foods || []).length > 5 && (
                      <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[11px] text-slate-400 font-body">+{template.foods.length - 5} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "saved" && (
        <div className="px-4 mt-4">
          {savedFoodsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-slate-300" />
            </div>
          ) : savedFoods.length === 0 ? (
            <div className="text-center py-14">
              <Bookmark size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-[15px] font-semibold text-slate-700 font-display">No saved foods yet</p>
              <p className="text-[13px] text-slate-400 font-body mt-1 mb-4">Tap the bookmark icon on any food to save it here</p>
              <button
                onClick={() => setActiveTab("all")}
                className="px-5 py-2.5 bg-slate-900 text-white text-[13px] font-semibold rounded-xl active:opacity-80 transition font-display"
                data-testid="button-goto-log-for-saved"
              >
                Browse foods to save
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide mb-2 font-body">{savedFoods.length} saved</p>
              {savedFoods.map((food: any, i: number) => (
                <div key={food.id || i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm" data-testid={`saved-food-${i}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-slate-900 font-display">{food.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[13px] font-semibold text-orange-500">{food.calories} cal</span>
                        {food.protein > 0 && <span className="text-[11px] text-slate-400 font-body">P: {food.protein}g</span>}
                        {food.carbs > 0 && <span className="text-[11px] text-slate-400 font-body">C: {food.carbs}g</span>}
                        {food.fat > 0 && <span className="text-[11px] text-slate-400 font-body">F: {food.fat}g</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-3">
                      <button
                        onClick={() => handleUnsaveFood(food.id, food.name)}
                        className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center active:bg-red-100 transition"
                        data-testid={`button-unsave-food-${i}`}
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                      <button
                        onClick={() => quickAddAiFood(food)}
                        className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[12px] font-semibold active:opacity-80 transition font-display"
                        data-testid={`button-add-saved-food-${i}`}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "all" && aiResults.length === 0 && !aiSearching && (
        <div className="px-4 mt-5">
          <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide mb-3 font-body">Quick suggestions</p>
          <p className="text-[13px] text-slate-400 font-body text-center py-6">
            Type what you ate above and AI will find the exact nutrition info
          </p>
        </div>
      )}

      <div className="px-4 mt-6 mb-8 flex gap-3">
        <button
          onClick={() => { triggerHaptic('selection'); setShowManualAdd(true); }}
          className="flex-1 py-3 rounded-2xl border-2 border-slate-900 text-slate-900 font-semibold text-[14px] active:opacity-80 transition font-display"
          data-testid="button-manual-add"
        >
          Manual Add
        </button>
        <button
          onClick={startVoiceLog}
          className={`flex-1 py-3 rounded-2xl border-2 font-semibold text-[14px] active:opacity-80 transition font-display flex items-center justify-center gap-2 ${
            voiceListening
              ? "border-red-500 text-red-500 bg-red-50 animate-pulse"
              : "border-slate-900 text-slate-900"
          }`}
          data-testid="button-voice-log"
        >
          {voiceListening ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
          {voiceListening ? "Listening..." : "Voice Log"}
        </button>
      </div>


      {showVoiceSheet && (
        <div className="fixed inset-0 z-50 flex items-end" data-testid="voice-confirm-sheet">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => {
            if (voiceListening) try { recognitionRef.current?.stop(); } catch {}
            if (mediaRecording) { try { mediaRecorderRef.current?.stop(); } catch {} }
            if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
            setShowVoiceSheet(false);
          }} />
          <div className="relative w-full bg-white rounded-t-3xl shadow-2xl" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}>
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Fallback mode label */}
            {!useSpeechRecognition && (
              <div className="mx-5 mb-1 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2" data-testid="voice-fallback-mode-banner">
                <span className="text-[11px] text-slate-500 font-body">Using audio recording (browser fallback)</span>
              </div>
            )}

            {/* Large mic start/stop button */}
            <div className="flex flex-col items-center pt-4 pb-3">
              <button
                onClick={startRecognitionInSheet}
                disabled={mediaTranscribing}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all disabled:opacity-50 ${
                  voiceListening || mediaRecording ? "bg-red-500 animate-pulse" : "bg-blue-600"
                }`}
                data-testid="button-start-recording"
              >
                {mediaTranscribing
                  ? <Loader2 size={32} className="text-white animate-spin" />
                  : <Mic size={32} className="text-white" />
                }
              </button>
              <p className="text-[13px] font-semibold font-display mt-3 mb-1 uppercase tracking-wide" style={{
                color: voiceListening || mediaRecording ? "#ef4444" : mediaTranscribing ? "#94a3b8" : "#2563eb"
              }}>
                {mediaTranscribing ? "Transcribing…" :
                  mediaRecording ? "Recording… tap to stop" :
                  voiceListening ? "Listening… tap to stop" :
                  voiceTranscript ? "Tap to record again" : "Tap the mic to speak"}
              </p>
              {/* Live interim transcript (SpeechRecognition mode) */}
              {voiceListening && interimTranscript && (
                <div className="mx-5 mt-2 px-4 py-2 bg-blue-50 rounded-2xl w-full max-w-xs" data-testid="voice-interim-in-sheet">
                  <p className="text-[13px] text-blue-700 font-body italic text-center leading-snug">{interimTranscript}</p>
                </div>
              )}
            </div>

            {voicePermissionDenied && (
              <div className="mx-5 mb-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-[12px] text-amber-700 font-body">Microphone access denied. In your browser settings, allow microphone access and try again.</p>
              </div>
            )}

            {voiceTranscript && !voiceListening && (
              <div className="px-5">
                {/* Transcript bubble */}
                <div className="bg-slate-50 rounded-2xl px-4 py-3 mb-3">
                  <p className="text-[10px] text-slate-400 font-body mb-1 uppercase tracking-widest">Heard</p>
                  <p className="text-[17px] font-bold text-slate-900 font-display leading-snug">&ldquo;{voiceTranscript}&rdquo;</p>
                </div>
                <p className="text-[13px] text-slate-400 font-body mb-3">Edit if needed, then tap Search to look up nutrition info.</p>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[14px] font-body text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-4"
                  value={voiceTranscript}
                  onChange={e => setVoiceTranscript(e.target.value)}
                  data-testid="input-voice-transcript"
                />
                <div className="flex gap-3 pb-2">
                  <button
                    onClick={() => {
                      if (mediaRecording) { try { mediaRecorderRef.current?.stop(); } catch {} }
                      if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
                      setShowVoiceSheet(false); triggerHaptic("light");
                    }}
                    className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-500 font-semibold text-[14px] font-display active:bg-slate-50 transition"
                    data-testid="button-voice-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!voiceTranscript) return;
                      setShowVoiceSheet(false);
                      setSearchQuery(voiceTranscript);
                      setActiveTab("all");
                      triggerHaptic("medium");
                      setTimeout(() => searchFoodAI(voiceTranscript!), 100);
                    }}
                    className="flex-1 py-3.5 rounded-2xl bg-blue-600 text-white font-semibold text-[14px] font-display flex items-center justify-center gap-2 active:opacity-80 transition shadow-md"
                    data-testid="button-voice-confirm"
                  >
                    <Check size={16} />
                    Search Food
                  </button>
                </div>
              </div>
            )}

            {!voiceTranscript && !voiceListening && (
              <div className="px-5 pb-4">
                <button
                  onClick={() => { setShowVoiceSheet(false); }}
                  className="w-full py-3.5 rounded-2xl border-2 border-slate-200 text-slate-500 font-semibold text-[14px] font-display active:bg-slate-50 transition"
                  data-testid="button-voice-dismiss"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const EXERCISE_CATEGORIES = [
  { id: "run", emoji: "🏃", title: "Run", description: "Running & jogging" },
  { id: "weights", emoji: "🏋️", title: "Weights", description: "Free weights & machines" },
  { id: "describe", emoji: "✏️", title: "Describe", description: "Write your workout" },
  { id: "manual", emoji: "🔥", title: "Manual", description: "Enter calories burned" },
];

const INTENSITY_OPTIONS = [
  { id: "high", label: "High", description: "All-out effort" },
  { id: "medium", label: "Medium", description: "Moderate effort" },
  { id: "low", label: "Low", description: "Light effort" },
];

const DURATION_PILLS = [15, 30, 60, 90];

function ExerciseLogger({ store, toast, onBack }: { store: any; toast: any; onBack: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [intensity, setIntensity] = useState("medium");
  const [duration, setDuration] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [showCaloriesStep, setShowCaloriesStep] = useState(false);
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [describeText, setDescribeText] = useState("");
  const [logging, setLogging] = useState(false);

  const selectedCat = EXERCISE_CATEGORIES.find(c => c.id === selectedCategory);

  const handleContinue = () => {
    triggerHaptic('selection');
    setShowCaloriesStep(true);
  };

  const handleAddExercise = async () => {
    const exerciseName = selectedCategory === "describe"
      ? describeText || "Custom Workout"
      : selectedCat?.title || "Exercise";
    const dur = duration ? Number(duration) : (customDuration ? Number(customDuration) : undefined);

    setLogging(true);
    try {
      await store.logExercise({
        exerciseName,
        duration: dur,
        caloriesBurned: caloriesBurned ? Number(caloriesBurned) : undefined,
        intensity,
      });
      triggerHaptic('success');
      toast({ title: "Exercise logged", description: `${exerciseName} added` });
      setSelectedCategory(null);
      setShowCaloriesStep(false);
      setIntensity("medium");
      setDuration("");
      setCustomDuration("");
      setCaloriesBurned("");
      setDescribeText("");
    } catch {
      toast({ title: "Error", description: "Failed to log exercise", variant: "destructive" });
    }
    setLogging(false);
  };

  if (selectedCategory && showCaloriesStep) {
    return (
      <div data-testid="exercise-calories-step">
        <CalHeader title={selectedCat?.title || "Exercise"} onBack={() => setShowCaloriesStep(false)} />
        <div className="px-4 mt-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <p className="text-[15px] font-semibold text-slate-900 mb-4 font-display">Calories Burned</p>
            <input
              type="number"
              placeholder="Enter calories burned"
              value={caloriesBurned}
              onChange={e => setCaloriesBurned(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-900 font-body"
              data-testid="input-calories-burned"
            />
            <button
              onClick={handleAddExercise}
              disabled={logging}
              className="w-full mt-4 py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-[15px] disabled:opacity-50 active:opacity-80 transition font-display"
              data-testid="button-log-exercise"
            >
              {logging
                ? <span className="flex items-center justify-center gap-2" data-testid="exercise-logging-indicator"><Loader2 size={16} className="animate-spin" />Logging…</span>
                : "Add"
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedCategory) {
    return (
      <div data-testid="exercise-detail">
        <CalHeader title={selectedCat?.title || "Exercise"} onBack={() => setSelectedCategory(null)} />
        <div className="px-4 mt-5">
          {selectedCategory === "manual" ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <p className="text-[15px] font-semibold text-slate-900 mb-4 font-display">Enter calories burned</p>
              <input
                type="number"
                placeholder="Calories burned"
                value={caloriesBurned}
                onChange={e => setCaloriesBurned(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-900 font-body"
                data-testid="input-calories-burned"
              />
              <input
                type="number"
                placeholder="Duration (minutes)"
                value={customDuration}
                onChange={e => setCustomDuration(e.target.value)}
                className="w-full mt-3 px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-900 font-body"
                data-testid="input-manual-duration"
              />
              <button
                onClick={handleAddExercise}
                disabled={logging || !caloriesBurned}
                className="w-full mt-4 py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-[15px] disabled:opacity-50 active:opacity-80 transition font-display"
                data-testid="button-log-exercise"
              >
                {logging ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Add"}
              </button>
            </div>
          ) : selectedCategory === "describe" ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <p className="text-[15px] font-semibold text-slate-900 mb-4 font-display">Describe your workout</p>
              <textarea
                placeholder="e.g. 30 minutes of HIIT with jumping jacks, burpees..."
                value={describeText}
                onChange={e => setDescribeText(e.target.value)}
                rows={4}
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-900 font-body resize-none"
                data-testid="input-describe-workout"
              />

              <div className="mt-5">
                <p className="text-[14px] font-semibold text-slate-900 mb-3 font-display">Set intensity</p>
                <div className="space-y-2">
                  {INTENSITY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { triggerHaptic('selection'); setIntensity(opt.id); }}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border transition ${
                        intensity === opt.id ? "border-slate-900 bg-slate-50" : "border-slate-200"
                      }`}
                      data-testid={`intensity-${opt.id}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        intensity === opt.id ? "border-slate-900" : "border-slate-300"
                      }`}>
                        {intensity === opt.id && <div className="w-2 h-2 rounded-full bg-slate-900" />}
                      </div>
                      <div className="text-left">
                        <p className="text-[14px] font-semibold text-slate-900 font-display">{opt.label}</p>
                        <p className="text-[12px] text-slate-400 font-body">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleContinue}
                disabled={!describeText}
                className="w-full mt-5 py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-[15px] disabled:opacity-50 active:opacity-80 transition font-display"
                data-testid="button-continue-exercise"
              >
                Continue
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl p-6 border border-slate-100">
                <p className="text-[14px] font-semibold text-slate-900 mb-3 font-display">Set intensity</p>
                <div className="space-y-2">
                  {INTENSITY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { triggerHaptic('selection'); setIntensity(opt.id); }}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border transition ${
                        intensity === opt.id ? "border-slate-900 bg-slate-50" : "border-slate-200"
                      }`}
                      data-testid={`intensity-${opt.id}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        intensity === opt.id ? "border-slate-900" : "border-slate-300"
                      }`}>
                        {intensity === opt.id && <div className="w-2 h-2 rounded-full bg-slate-900" />}
                      </div>
                      <div className="text-left">
                        <p className="text-[14px] font-semibold text-slate-900 font-display">{opt.label}</p>
                        <p className="text-[12px] text-slate-400 font-body">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-100 mt-3">
                <p className="text-[14px] font-semibold text-slate-900 mb-3 font-display">Duration</p>
                <div className="flex gap-2">
                  {DURATION_PILLS.map(d => (
                    <button
                      key={d}
                      onClick={() => { triggerHaptic('selection'); setDuration(String(d)); setCustomDuration(""); }}
                      className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition font-display ${
                        duration === String(d) ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                      data-testid={`duration-${d}`}
                    >
                      {d} mins
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Custom duration (minutes)"
                  value={customDuration}
                  onChange={e => { setCustomDuration(e.target.value); setDuration(""); }}
                  className="w-full mt-3 px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-900 font-body"
                  data-testid="input-custom-duration"
                />
              </div>

              <button
                onClick={handleContinue}
                className="w-full mt-4 py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-[15px] active:opacity-80 transition font-display"
                data-testid="button-continue-exercise"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="exercise-logger">
      <CalHeader title="Exercise" onBack={onBack} />
      <div className="px-4 mt-5">
        <h2 className="text-2xl font-bold text-slate-900 mb-5 font-display">Log Exercise</h2>
        <div className="space-y-3">
          {EXERCISE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { triggerHaptic('selection'); setSelectedCategory(cat.id); }}
              className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 text-left active:opacity-80 transition"
              data-testid={`exercise-category-${cat.id}`}
            >
              <span className="text-3xl">{cat.emoji}</span>
              <div className="flex-1">
                <p className="text-[16px] font-semibold text-slate-900 font-display">{cat.title}</p>
                <p className="text-[13px] text-slate-400 mt-0.5 font-body">{cat.description}</p>
              </div>
              <ArrowLeft size={16} className="text-slate-300 rotate-180" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WaterLogger({ store, toast, onBack }: { store: any; toast: any; onBack: () => void }) {
  const [amount, setAmount] = useState(250);
  const [logging, setLogging] = useState(false);

  const logWater = async () => {
    setLogging(true);
    try {
      await store.addWater(amount);
      triggerHaptic('success');
      toast({ title: "Water logged", description: `${amount}ml added` });
    } catch {
      toast({ title: "Error", description: "Failed to log water", variant: "destructive" });
    }
    setLogging(false);
  };

  const quickAmounts = [100, 250, 500, 750];

  return (
    <div data-testid="water-logger">
      <CalHeader title="Log Water" onBack={onBack} />
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="text-center mb-5">
            <p className="text-4xl font-bold text-slate-900 font-display" data-testid="text-water-amount">{amount}</p>
            <p className="text-[13px] text-slate-400 mt-1 font-body">milliliters</p>
          </div>
          <input type="range" min={50} max={1000} step={50} value={amount} onChange={e => setAmount(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
            data-testid="slider-water" />
          <div className="flex gap-2 mt-4">
            {quickAmounts.map(amt => (
              <button key={amt} onClick={() => { triggerHaptic('selection'); setAmount(amt); }}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all font-display ${amount === amt ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                data-testid={`quick-water-${amt}`}>{amt}ml</button>
            ))}
          </div>
          <button onClick={logWater} disabled={logging}
            className="w-full mt-5 py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-[15px] disabled:opacity-50 active:opacity-80 transition font-display"
            data-testid="button-log-water">
            {logging
              ? <span className="flex items-center justify-center gap-2" data-testid="water-logging-indicator"><Loader2 size={16} className="animate-spin" />Logging…</span>
              : "Add Water"
            }
          </button>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 mt-3">
          <p className="text-[13px] text-slate-400 font-body">Today's total</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-display" data-testid="text-water-total">{store.water}<span className="text-sm text-slate-400 font-normal ml-1">ml</span></p>
        </div>
      </div>
    </div>
  );
}
