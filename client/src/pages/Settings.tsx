import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Heart, Activity, Bell, Shield, ChevronRight, Check,
  Info, Smartphone, Share2, Star, Download, LogOut, Vibrate,
  Moon, Globe, Database, Trash2, HelpCircle, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { isNative, platform, shareApp, requestPushPermission, triggerHaptic } from "@/lib/capacitor";

type HealthPermission = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user } = useStore();
  const { toast } = useToast();

  const [appleHealthConnected, setAppleHealthConnected] = useState(false);
  const [googleFitConnected, setGoogleFitConnected] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [mealReminders, setMealReminders] = useState(true);
  const [waterReminders, setWaterReminders] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [showHealthModal, setShowHealthModal] = useState<"apple" | "google" | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [healthPermissions, setHealthPermissions] = useState<HealthPermission[]>([
    { id: "steps", name: "Steps", description: "Daily step count tracking", enabled: true },
    { id: "calories_burned", name: "Active Calories", description: "Calories burned from activity", enabled: true },
    { id: "heart_rate", name: "Heart Rate", description: "Resting and active heart rate", enabled: true },
    { id: "sleep", name: "Sleep Analysis", description: "Sleep duration and quality", enabled: true },
    { id: "workouts", name: "Workouts", description: "Exercise sessions and metrics", enabled: true },
    { id: "weight", name: "Body Weight", description: "Weight measurements", enabled: true },
    { id: "nutrition", name: "Nutrition", description: "Calorie and macro intake data", enabled: false },
    { id: "water", name: "Water Intake", description: "Hydration tracking", enabled: false },
  ]);

  const togglePermission = (id: string) => {
    triggerHaptic('selection');
    setHealthPermissions(prev =>
      prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p)
    );
  };

  const connectHealthApp = (type: "apple" | "google") => {
    triggerHaptic('light');
    setShowHealthModal(type);
  };

  const confirmHealthConnect = (type: "apple" | "google") => {
    if (type === "apple") setAppleHealthConnected(true);
    else setGoogleFitConnected(true);
    setShowHealthModal(null);
    triggerHaptic('medium');
    toast({
      title: `${type === "apple" ? "Apple Health" : "Google Fit"} Connected`,
      description: "Your health data will now sync automatically.",
      duration: 3000,
    });
  };

  const disconnectHealthApp = (type: "apple" | "google") => {
    if (type === "apple") setAppleHealthConnected(false);
    else setGoogleFitConnected(false);
    toast({
      title: `${type === "apple" ? "Apple Health" : "Google Fit"} Disconnected`,
      description: "Health data sync has been turned off.",
      duration: 3000,
    });
  };

  const handlePushToggle = async () => {
    if (!pushNotifications) {
      const granted = await requestPushPermission();
      setPushNotifications(granted);
      if (granted) {
        triggerHaptic('medium');
        toast({ title: "Notifications Enabled", description: "You'll receive reminders and updates.", duration: 3000 });
      }
    } else {
      setPushNotifications(false);
    }
  };

  const handleShare = async () => {
    triggerHaptic('light');
    await shareApp();
  };

  const handleExportData = () => {
    triggerHaptic('light');
    toast({ title: "Exporting Data", description: "Your data will be downloaded as a file.", duration: 3000 });
  };

  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={cn(
        "w-11 h-[26px] rounded-full transition-colors relative flex-shrink-0",
        enabled ? "bg-primary" : "bg-gray-300"
      )}
    >
      <div className={cn(
        "absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-md transition-transform",
        enabled ? "translate-x-[22px]" : "translate-x-[3px]"
      )} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900" data-testid="settings-page">
      <div className="p-6 pb-40 max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation("/")} className="p-2 rounded-full bg-white text-gray-500 hover:text-gray-900 shadow-sm active:scale-95 transition-all" data-testid="button-back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer" onClick={() => setLocation("/onboarding")}>
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">{user?.name?.[0] || user?.username?.[0]?.toUpperCase() || "A"}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{user?.name || user?.username || "Alex"}</h3>
            <p className="text-gray-500 text-xs">
              {user?.dailyCalorieTarget || 2400} kcal/day • {user?.activityLevel || "Moderate"}
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest px-1">Health Integrations</h3>
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100">
            <div className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                  <Heart size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Apple Health</p>
                  <p className="text-gray-500 text-[10px]">
                    {appleHealthConnected ? "Connected - syncing data" : "Sync steps, heart rate, workouts"}
                  </p>
                </div>
              </div>
              {appleHealthConnected ? (
                <button onClick={() => disconnectHealthApp("apple")} className="px-3 py-1.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30 active:scale-95 transition-transform" data-testid="button-disconnect-apple">
                  Connected
                </button>
              ) : (
                <button onClick={() => connectHealthApp("apple")} className="px-3 py-1.5 rounded-full text-[10px] font-medium bg-primary/20 text-primary border border-primary/30 active:scale-95 transition-transform" data-testid="button-connect-apple">
                  Connect
                </button>
              )}
            </div>

            <div className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                  <Activity size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Google Fit / Health Connect</p>
                  <p className="text-gray-500 text-[10px]">
                    {googleFitConnected ? "Connected - syncing data" : "Android health data sync"}
                  </p>
                </div>
              </div>
              {googleFitConnected ? (
                <button onClick={() => disconnectHealthApp("google")} className="px-3 py-1.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30 active:scale-95 transition-transform" data-testid="button-disconnect-google">
                  Connected
                </button>
              ) : (
                <button onClick={() => connectHealthApp("google")} className="px-3 py-1.5 rounded-full text-[10px] font-medium bg-primary/20 text-primary border border-primary/30 active:scale-95 transition-transform" data-testid="button-connect-google">
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>

        {(appleHealthConnected || googleFitConnected) && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <h3 className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest px-1">Data Permissions</h3>
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100">
              {healthPermissions.map(perm => (
                <div key={perm.id} className="p-3.5 flex items-center justify-between">
                  <div className="flex-1 mr-3">
                    <p className="text-gray-900 text-sm font-medium">{perm.name}</p>
                    <p className="text-gray-500 text-[10px]">{perm.description}</p>
                  </div>
                  <ToggleSwitch enabled={perm.enabled} onToggle={() => togglePermission(perm.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest px-1">Notifications</h3>
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Bell size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Push Notifications</p>
                  <p className="text-gray-500 text-[10px]">Enable alerts and reminders</p>
                </div>
              </div>
              <ToggleSwitch enabled={pushNotifications} onToggle={handlePushToggle} />
            </div>

            {pushNotifications && (
              <>
                <div className="p-4 flex items-center justify-between pl-14">
                  <div>
                    <p className="text-gray-900 text-sm">Meal Reminders</p>
                    <p className="text-gray-500 text-[10px]">Breakfast, lunch, dinner alerts</p>
                  </div>
                  <ToggleSwitch enabled={mealReminders} onToggle={() => { setMealReminders(!mealReminders); triggerHaptic('selection'); }} />
                </div>
                <div className="p-4 flex items-center justify-between pl-14">
                  <div>
                    <p className="text-gray-900 text-sm">Water Reminders</p>
                    <p className="text-gray-500 text-[10px]">Hourly hydration nudges</p>
                  </div>
                  <ToggleSwitch enabled={waterReminders} onToggle={() => { setWaterReminders(!waterReminders); triggerHaptic('selection'); }} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest px-1">Preferences</h3>
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100">
            <div className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer" onClick={() => setLocation("/onboarding")}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Activity size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Goals & Targets</p>
                  <p className="text-gray-500 text-[10px]">Calories, macros, activity level</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Vibrate size={18} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Haptic Feedback</p>
                  <p className="text-gray-500 text-[10px]">Vibration on interactions</p>
                </div>
              </div>
              <ToggleSwitch enabled={hapticsEnabled} onToggle={() => { setHapticsEnabled(!hapticsEnabled); triggerHaptic('medium'); }} />
            </div>

            <div className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer" onClick={() => setLocation("/onboarding")}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Globe size={18} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Cuisine Preferences</p>
                  <p className="text-gray-500 text-[10px]">{user?.cuisinePreference || "Mixed"} cuisine</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest px-1">Data & Privacy</h3>
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100">
            <div className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer" onClick={handleExportData}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
                  <Download size={18} className="text-[#1e3a5f]" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Export My Data</p>
                  <p className="text-gray-500 text-[10px]">Download all your tracking data</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>

            <div className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Shield size={18} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Privacy Policy</p>
                  <p className="text-gray-500 text-[10px]">How we handle your data</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>

            <div className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer" onClick={() => setShowDeleteModal(true)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <p className="text-red-400 font-medium text-sm">Delete Account</p>
                  <p className="text-gray-500 text-[10px]">Permanently remove all data</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest px-1">Support</h3>
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100">
            <div className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer" onClick={handleShare} data-testid="button-share-app">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Share2 size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Share Sherpa Fit</p>
                  <p className="text-gray-500 text-[10px]">Invite friends to join</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>

            <div className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer" data-testid="button-rate-app">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Star size={18} className="text-yellow-400" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Rate on App Store</p>
                  <p className="text-gray-500 text-[10px]">Help us with a review</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>

            <div className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer" data-testid="button-help">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-500/10 flex items-center justify-center">
                  <HelpCircle size={18} className="text-zinc-400" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Help & FAQ</p>
                  <p className="text-gray-500 text-[10px]">Common questions answered</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>

            <div className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer" data-testid="button-contact">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Mail size={18} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">Contact Support</p>
                  <p className="text-gray-500 text-[10px]">Get help from our team</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
        </div>

        <div className="text-center space-y-1 pt-4 pb-8">
          <p className="text-gray-400 text-[10px]">Sherpa Fit v1.0.0</p>
          <p className="text-gray-400 text-[9px]">
            {isNative ? `Running on ${platform === 'ios' ? 'iOS' : 'Android'}` : "Running as Web App"}
          </p>
          <p className="text-gray-400 text-[9px]">Powered by Gemini AI • 1,324 fitness profiles</p>
        </div>
      </div>

      {showHealthModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-zinc-900 rounded-t-3xl sm:rounded-2xl p-6 pb-8 w-full sm:max-w-sm border-t border-zinc-800 sm:border animate-in slide-in-from-bottom duration-300 safe-pad-bottom">
            <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-4 sm:hidden" />
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                showHealthModal === "apple"
                  ? "bg-gradient-to-br from-red-500 to-pink-600"
                  : "bg-gradient-to-br from-green-500 to-teal-600"
              )}>
                {showHealthModal === "apple" ? <Heart size={22} className="text-white" /> : <Activity size={22} className="text-white" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {showHealthModal === "apple" ? "Apple Health" : "Google Fit"}
                </h3>
                <p className="text-zinc-500 text-xs">Permission Request</p>
              </div>
            </div>

            <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
              Sherpa Fit would like to access your {showHealthModal === "apple" ? "Apple Health" : "Google Fit / Health Connect"} data to:
            </p>

            <ul className="space-y-2 mb-6">
              {["Read step count & activity data", "Read heart rate & workout sessions", "Write nutrition & calorie data", "Read sleep analysis"].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                  <Check size={14} className="text-primary" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex gap-3">
              <button
                onClick={() => setShowHealthModal(null)}
                className="flex-1 py-3.5 rounded-xl bg-zinc-800 text-zinc-400 font-medium text-sm active:scale-95 transition-transform"
                data-testid="button-cancel-health"
              >
                Not Now
              </button>
              <button
                onClick={() => confirmHealthConnect(showHealthModal)}
                className="flex-1 py-3.5 rounded-xl bg-primary text-white font-medium text-sm active:scale-95 transition-transform"
                data-testid="button-confirm-health"
              >
                Allow Access
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-zinc-900 rounded-t-3xl sm:rounded-2xl p-6 pb-8 w-full sm:max-w-sm border-t border-zinc-800 sm:border animate-in slide-in-from-bottom duration-300 safe-pad-bottom">
            <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-4 sm:hidden" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Trash2 size={22} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Account</h3>
                <p className="text-zinc-500 text-xs">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-zinc-300 text-sm mb-6 leading-relaxed">
              All your meal logs, workout history, and personal data will be permanently deleted. This cannot be reversed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3.5 rounded-xl bg-zinc-800 text-zinc-400 font-medium text-sm active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  toast({ title: "Account Deletion Requested", description: "Your account will be deleted within 30 days.", duration: 5000 });
                }}
                className="flex-1 py-3.5 rounded-xl bg-red-500/20 text-red-400 font-medium text-sm border border-red-500/30 active:scale-95 transition-transform"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
