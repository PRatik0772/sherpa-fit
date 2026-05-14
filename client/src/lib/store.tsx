import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from '@shared/schema';

export function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('sherpa_token');
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

type Meal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  time: string;
  loggedAt?: string;
  image?: string;
  ingredients?: string;
};

type WorkoutLogEntry = {
  id: string;
  exerciseName: string;
  setsCompleted?: number;
  repsCompleted?: string;
  caloriesBurned?: number;
  duration?: number;
  intensity?: string;
  loggedAt: string;
};

type DayHistory = {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  totalSodium: number;
  mealCount: number;
};

type HealthData = {
  steps: number;
  stepsGoal: number;
  caloriesBurnedFromSteps: number;
  activeMinutes: number;
  distanceKm: number;
  weeklySteps: { date: string; steps: number; calories: number }[];
};

type UserState = {
  user: User | null;
  userId: string | null;
  loading: boolean;
  calories: number;
  target: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  sodium: number;
  fiber: number;
  water: number;
  meals: Meal[];
  workoutLogs: WorkoutLogEntry[];
  caloriesBurned: number;
  streak: number;
  weekHistory: DayHistory[];
  healthData: HealthData;
  addMeal: (meal: Omit<Meal, 'id' | 'time'>) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  deleteWorkoutLog: (id: string) => Promise<void>;
  resetWater: () => Promise<void>;
  addWater: (amount?: number) => Promise<void>;
  removeWater: (amount?: number) => Promise<void>;
  reloadMeals: () => Promise<void>;
  reloadAll: () => Promise<void>;
  setOnboardingData: (data: any) => Promise<void>;
  logExercise: (data: { exerciseName: string; setsCompleted?: number; repsCompleted?: string; caloriesBurned?: number; duration?: number; intensity?: string }) => Promise<void>;
  loginUser: (appUser: User) => void;
  logout: () => void;
  loadHealthData: () => Promise<void>;
};

const StoreContext = createContext<UserState | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [water, setWater] = useState(0);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogEntry[]>([]);
  const [weekHistory, setWeekHistory] = useState<DayHistory[]>([]);
  const [healthData, setHealthData] = useState<HealthData>({
    steps: 0, stepsGoal: 10000, caloriesBurnedFromSteps: 0,
    activeMinutes: 0, distanceKm: 0, weeklySteps: [],
  });

  const calories = meals.reduce((sum, m) => sum + m.calories, 0);
  const protein = meals.reduce((sum, m) => sum + m.protein, 0);
  const carbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const fat = meals.reduce((sum, m) => sum + m.fat, 0);
  const sugar = meals.reduce((sum, m) => sum + (m.sugar || 0), 0);
  const sodium = meals.reduce((sum, m) => sum + (m.sodium || 0), 0);
  const fiber = meals.reduce((sum, m) => sum + (m.fiber || 0), 0);
  const target = user?.dailyCalorieTarget || 2400;

  const caloriesBurned = useMemo(() => {
    return workoutLogs.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  }, [workoutLogs]);

  const streak = useMemo(() => {
    const mealDates = new Set(meals.map(m => {
      if (m.time) {
        const d = new Date();
        return d.toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
    }));
    const workoutDates = new Set(workoutLogs.map(w => {
      if (w.loggedAt) {
        return new Date(w.loggedAt).toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
    }));

    const allDates = new Set([...mealDates, ...workoutDates]);
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (allDates.has(dateStr)) {
        count++;
      } else {
        break;
      }
    }
    return Math.max(count, 0);
  }, [meals, workoutLogs]);

  const loadMeals = useCallback(async (uid: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await authFetch(`/api/meals/${uid}?date=${today}`);
      if (!res.ok) throw new Error(`meals ${res.status}`);
      const data = await res.json();
      const mapped: Meal[] = (data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        fiber: m.fiber || 0,
        sugar: m.sugar || 0,
        sodium: m.sodium || 0,
        image: m.image,
        ingredients: m.ingredients || '',
        time: m.loggedAt
          ? new Date(m.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '',
        loggedAt: m.loggedAt || null,
      }));
      setMeals(mapped);
    } catch (e) {
      setMeals([]);
      throw e;
    }
  }, []);

  const loadWater = useCallback(async (uid: string) => {
    try {
      const res = await authFetch(`/api/water/${uid}`);
      if (!res.ok) throw new Error(`water ${res.status}`);
      const data = await res.json();
      const total = (data || []).reduce((sum: number, w: any) => sum + w.amount, 0);
      setWater(total);
    } catch (e) {
      setWater(0);
      throw e;
    }
  }, []);

  const loadWorkoutLogs = useCallback(async (uid: string) => {
    try {
      const res = await authFetch(`/api/workout-logs/${uid}`);
      if (!res.ok) throw new Error(`workout-logs ${res.status}`);
      const data = await res.json();
      setWorkoutLogs(data || []);
    } catch (e) {
      setWorkoutLogs([]);
      throw e;
    }
  }, []);

  const loadWeekHistory = useCallback(async (uid: string) => {
    try {
      const res = await authFetch(`/api/meals/${uid}/weekly`);
      if (!res.ok) throw new Error(`weekly ${res.status}`);
      const data = await res.json();
      setWeekHistory(data || []);
    } catch (e) {
      setWeekHistory([]);
      throw e;
    }
  }, []);

  const loginUser = useCallback((appUser: any) => {
    if (appUser.token) {
      localStorage.setItem('sherpa_token', appUser.token);
    }
    setUser(appUser);
    setUserId(appUser.id);
    localStorage.setItem('sherpa_userId', appUser.id);
    setLoading(false);
    Promise.all([loadMeals(appUser.id), loadWater(appUser.id), loadWorkoutLogs(appUser.id), loadWeekHistory(appUser.id)]).catch(console.error);
  }, [loadMeals, loadWater, loadWorkoutLogs, loadWeekHistory]);

  const logout = useCallback(() => {
    localStorage.removeItem('sherpa_userId');
    localStorage.removeItem('sherpa_token');
    setUser(null);
    setUserId(null);
    setMeals([]);
    setWater(0);
    setWorkoutLogs([]);
    setWeekHistory([]);
    setHealthData({ steps: 0, stepsGoal: 10000, caloriesBurnedFromSteps: 0, activeMinutes: 0, distanceKm: 0, weeklySteps: [] });
  }, []);

  const loadHealthData = useCallback(async () => {
    try {
      const [stepsRes, trendsRes] = await Promise.allSettled([
        fetch('/api/steps/data?limit=1'),
        fetch('/api/steps/trends'),
      ]);
      let todaySteps = 0, todayCals = 0, todayMins = 0, todayDist = 0;
      if (stepsRes.status === 'fulfilled' && stepsRes.value.ok) {
        const stepsData = await stepsRes.value.json();
        if (stepsData && stepsData.length > 0) {
          const latest = stepsData[0];
          todaySteps = latest.stepCount || latest.step_count || 0;
          todayCals = latest.calories || 0;
          todayMins = latest.activeMinutes || latest.active_minutes || 0;
          todayDist = latest.distanceKm || latest.distance_km || 0;
        }
      }
      let weekly: { date: string; steps: number; calories: number }[] = [];
      if (trendsRes.status === 'fulfilled' && trendsRes.value.ok) {
        const trends = await trendsRes.value.json();
        const monthlyData = trends.monthly || trends.monthlyTrends;
        if (monthlyData && Array.isArray(monthlyData)) {
          weekly = monthlyData.slice(-7).map((t: any) => ({
            date: t.month || t.date || '',
            steps: t.avgSteps || t.steps || 0,
            calories: t.avgCalories || t.calories || 0,
          }));
        }
      }
      setHealthData({
        steps: todaySteps,
        stepsGoal: 10000,
        caloriesBurnedFromSteps: todayCals,
        activeMinutes: todayMins,
        distanceKm: todayDist,
        weeklySteps: weekly,
      });
    } catch {
      console.error('Failed to load health data');
    }
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem('sherpa_userId');
    const savedToken = localStorage.getItem('sherpa_token');
    if (savedId && savedToken) {
      authFetch(`/api/users/${savedId}`)
        .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
        .then(appUser => {
          setUser(appUser);
          setUserId(appUser.id);
          Promise.all([loadMeals(appUser.id), loadWater(appUser.id), loadWorkoutLogs(appUser.id), loadWeekHistory(appUser.id)]).catch(console.error);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('sherpa_userId');
          localStorage.removeItem('sherpa_token');
          setLoading(false);
        });
    } else {
      localStorage.removeItem('sherpa_userId');
      localStorage.removeItem('sherpa_token');
      setLoading(false);
    }
  }, [loadMeals, loadWater, loadWorkoutLogs, loadWeekHistory]);

  const addMeal = useCallback(async (meal: Omit<Meal, 'id' | 'time'>) => {
    if (!userId) throw new Error('Not logged in');
    const res = await authFetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...meal, userId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to log meal' }));
      throw new Error(err.message || 'Failed to log meal');
    }
    await Promise.all([loadMeals(userId), loadWeekHistory(userId)]);
  }, [userId, loadMeals, loadWeekHistory]);

  const deleteMeal = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await authFetch(`/api/meals/${id}`, { method: 'DELETE' });
      await Promise.all([loadMeals(userId), loadWeekHistory(userId)]);
    } catch (e) {
      console.error('Failed to delete meal:', e);
    }
  }, [userId, loadMeals, loadWeekHistory]);

  const deleteWorkoutLog = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await authFetch(`/api/workout-logs/${id}`, { method: 'DELETE' });
      await loadWorkoutLogs(userId);
    } catch (e) {
      console.error('Failed to delete workout:', e);
    }
  }, [userId, loadWorkoutLogs]);

  const resetWater = useCallback(async () => {
    if (!userId) return;
    try {
      await authFetch(`/api/water/reset/${userId}`, { method: 'DELETE' });
      await loadWater(userId);
    } catch (e) {
      console.error('Failed to reset water:', e);
    }
  }, [userId, loadWater]);

  const addWater = useCallback(async (amount: number = 250) => {
    if (!userId) return;
    try {
      await authFetch('/api/water/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount }),
      });
      await loadWater(userId);
    } catch (e) {
      console.error('Failed to add water:', e);
    }
  }, [userId, loadWater]);

  const removeWater = useCallback(async (amount: number = 250) => {
    if (!userId) return;
    try {
      await authFetch('/api/water/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      await loadWater(userId);
    } catch (e) {
      console.error('Failed to remove water:', e);
    }
  }, [userId, loadWater]);

  const reloadMeals = useCallback(async () => {
    if (!userId) return;
    await Promise.all([loadMeals(userId), loadWeekHistory(userId)]);
  }, [userId, loadMeals, loadWeekHistory]);

  const reloadAll = useCallback(async () => {
    if (!userId) return;
    await Promise.all([loadMeals(userId), loadWater(userId), loadWorkoutLogs(userId), loadWeekHistory(userId)]);
  }, [userId, loadMeals, loadWater, loadWorkoutLogs, loadWeekHistory]);

  const logExercise = useCallback(async (data: { exerciseName: string; setsCompleted?: number; repsCompleted?: string; caloriesBurned?: number; duration?: number; intensity?: string }) => {
    if (!userId) return;
    try {
      const res = await authFetch('/api/workout-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId, exerciseName: data.exerciseName }),
      });
      if (!res.ok) throw new Error('Failed to log exercise');
      await loadWorkoutLogs(userId);
    } catch (e) {
      console.error('Failed to log exercise:', e);
      throw e;
    }
  }, [userId, loadWorkoutLogs]);

  const setOnboardingData = useCallback(async (data: any) => {
    if (!userId) return;
    try {
      const res = await authFetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      setUser(updated);
    } catch (e) {
      console.error('Failed to update onboarding:', e);
    }
  }, [userId]);

  const contextValue = useMemo(() => ({
    user,
    userId,
    loading,
    calories,
    target,
    protein,
    carbs,
    fat,
    sugar,
    sodium,
    fiber,
    water,
    meals,
    workoutLogs,
    caloriesBurned,
    streak,
    weekHistory,
    healthData,
    addMeal,
    deleteMeal,
    deleteWorkoutLog,
    resetWater,
    addWater,
    removeWater,
    reloadMeals,
    reloadAll,
    setOnboardingData,
    logExercise,
    loginUser,
    logout,
    loadHealthData,
  }), [user, userId, loading, calories, target, protein, carbs, fat, sugar, sodium, fiber, water, meals, workoutLogs, caloriesBurned, streak, weekHistory, healthData, addMeal, deleteMeal, deleteWorkoutLog, resetWater, addWater, removeWater, reloadMeals, reloadAll, setOnboardingData, logExercise, loginUser, logout, loadHealthData]);

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
