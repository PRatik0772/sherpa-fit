import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import { authFetch, StoreProvider, useStore } from "@/lib/store";
import { useEffect, useState } from "react";

import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import OnboardingForm from "@/pages/OnboardingForm";
import JungCoach from "@/pages/JungCoach";
import PlanCreating from "@/pages/PlanCreating";
import DashboardToday from "@/pages/DashboardToday";
import DashboardJourney from "@/pages/DashboardJourney";
import DashboardLog from "@/pages/DashboardLog";
import Analytics from "@/pages/Analytics";
import AdminDashboard from "@/pages/AdminDashboard";
import CoachDashboard from "@/pages/CoachDashboard";
import Profile from "@/pages/Profile";
import Scanner from "@/pages/Scanner";
import WeeklyMealPlanner from "@/pages/WeeklyMealPlanner";
import ProgressSnapshots from "@/pages/ProgressSnapshots";

function LoadingScreen() {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 100); return () => clearTimeout(t); }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-5">
        <img
          src="/images/sherpa-logo.png"
          alt="Sherpa Fit"
          className={`w-28 h-auto transition-all duration-[1200ms] ease-out ${show ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
        />
        <p className={`text-sm text-slate-400 font-medium font-display tracking-wider transition-all duration-700 delay-500 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          SHERPA FIT
        </p>
      </div>
    </div>
  );
}

function RoleGuard({ role, children }: { role: string; children: React.ReactNode }) {
  const store = useStore();
  const [, navigate] = useLocation();
  const hasAccess = store.user?.role === role;
  useEffect(() => {
    if (!hasAccess) navigate("/");
  }, [hasAccess]);
  if (!hasAccess) return <LoadingScreen />;
  return <>{children}</>;
}

type JourneyState = {
  role: string;
  onboardingComplete: boolean;
  latestPlanStatus: string;
  latestPlanId: string | null;
  nextRoute: string;
};

function JourneyGate({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const [location, navigate] = useLocation();
  const [checking, setChecking] = useState(true);
  const [journeyState, setJourneyState] = useState<JourneyState | null>(null);

  useEffect(() => {
    if (!store.userId) { setChecking(false); return; }
    const check = async () => {
      try {
        const res = await authFetch("/api/journey/state");
        if (res.ok) {
          const state = await res.json();
          setJourneyState(state);
          const current = window.location.pathname;
          const target = state.nextRoute;
          if (target && current !== target) {
            const isAllowed = (
              (state.role === "ADMIN" && current.startsWith("/admin")) ||
              (state.role === "COACH" && current.startsWith("/coach-dashboard")) ||
              (current === "/onboarding" && !state.onboardingComplete) ||
              (current.startsWith("/plan-creating/")) ||
              (state.role === "USER" && state.latestPlanStatus === "FINALIZED" && (
                current.startsWith("/dashboard") || current === "/profile" || current === "/coach"
              ))
            );
            if (!isAllowed) {
              navigate(target);
            }
          }
        }
      } catch {}
      setChecking(false);
    };
    check();
  }, [store.userId]);

  if (checking) return <LoadingScreen />;
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!store.loading && !store.user) {
      navigate("/");
    }
  }, [store.loading, store.user]);

  if (store.loading) return <LoadingScreen />;
  if (!store.user) return null;

  return <>{children}</>;
}

function LandingRoute() {
  const store = useStore();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!store.loading && store.user) {
      navigate("/dashboard/today");
    }
  }, [store.loading, store.user]);

  if (store.loading) return <LoadingScreen />;
  if (store.user) return null;

  return <LandingPage onGetStarted={() => navigate("/auth")} />;
}

function AuthRoute() {
  const store = useStore();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!store.loading && store.user) {
      navigate("/dashboard/today");
    }
  }, [store.loading, store.user]);

  if (store.loading) return <LoadingScreen />;
  if (store.user) return null;

  return <AuthPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingRoute} />
      <Route path="/auth" component={AuthRoute} />
      <Route path="/onboarding">
        <ProtectedRoute><OnboardingForm /></ProtectedRoute>
      </Route>
      <Route path="/coach">
        <ProtectedRoute><JungCoach /></ProtectedRoute>
      </Route>
      <Route path="/plan-creating/:planId">
        <ProtectedRoute><PlanCreating /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/today">
        <ProtectedRoute><JourneyGate><Layout><DashboardToday /></Layout></JourneyGate></ProtectedRoute>
      </Route>
      <Route path="/dashboard/journey">
        <ProtectedRoute><JourneyGate><Layout><DashboardJourney /></Layout></JourneyGate></ProtectedRoute>
      </Route>
      <Route path="/dashboard/log">
        <ProtectedRoute><JourneyGate><Layout><DashboardLog /></Layout></JourneyGate></ProtectedRoute>
      </Route>
      <Route path="/scanner">
        <ProtectedRoute><Scanner /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/analytics">
        <ProtectedRoute><JourneyGate><Layout><Analytics /></Layout></JourneyGate></ProtectedRoute>
      </Route>
      <Route path="/weekly-meal-planner">
        <ProtectedRoute><WeeklyMealPlanner /></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
      </Route>
      <Route path="/progress-snapshots">
        <ProtectedRoute><ProgressSnapshots /></ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute><RoleGuard role="admin"><Layout><AdminDashboard /></Layout></RoleGuard></ProtectedRoute>
      </Route>
      <Route path="/coach-dashboard">
        <ProtectedRoute><RoleGuard role="coach"><Layout><CoachDashboard /></Layout></RoleGuard></ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

export default App;
