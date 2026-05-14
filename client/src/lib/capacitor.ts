import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();
export const isIOS = platform === 'ios';
export const isAndroid = platform === 'android';
export const isWeb = platform === 'web';

export async function initCapacitor() {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light });
    if (isAndroid) {
      await StatusBar.setBackgroundColor({ color: '#000000' });
    }
  } catch {}

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {}

  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
  } catch {}
}

export async function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light') {
  if (isNative) {
    try {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      switch (type) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'selection':
          await Haptics.selectionStart();
          await Haptics.selectionChanged();
          await Haptics.selectionEnd();
          break;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
      }
    } catch {}
  } else if ('vibrate' in navigator) {
    try {
      const patterns: Record<string, number | number[]> = {
        light: 10, medium: 20, heavy: 30, selection: 5,
        success: [10, 30, 10], warning: [20, 40, 20], error: [30, 20, 30, 20, 30],
      };
      navigator.vibrate(patterns[type] || 10);
    } catch {}
  }
}

export async function shareApp() {
  try {
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title: 'Sherpa Fit - Nutrition & Fitness Tracker',
      text: 'Check out Sherpa Fit - AI-powered nutrition tracking with food scanning and smart workout library!',
      url: 'https://sherpafit.app',
    });
  } catch {}
}

export async function requestPushPermission(): Promise<boolean> {
  if (!isNative) {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
    return false;
  }
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.requestPermissions();
    if (result.receive === 'granted') {
      await PushNotifications.register();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative) {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
    return false;
  }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch {
    return false;
  }
}

export function getNotificationPermission(): NotificationPermission | 'unknown' {
  if ('Notification' in window) return Notification.permission;
  return 'unknown';
}

type ScheduledReminder = { id: string; mealType: string; scheduledTime: string; label?: string | null };

const _scheduledTimers: ReturnType<typeof setTimeout>[] = [];

function msUntilTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

function showBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body, icon: '/images/sherpa-logo.png', badge: '/images/sherpa-logo.png' }); } catch {}
  }
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: '🌅 Breakfast time!',
  lunch: '☀️ Lunch time!',
  snack: '🍎 Snack time!',
  dinner: '🌙 Dinner time!',
  water: '💧 Hydration reminder',
};

function scheduleDailyBrowserNotification(reminder: ScheduledReminder) {
  const delay = msUntilTime(reminder.scheduledTime);
  const title = MEAL_LABELS[reminder.mealType] || `🍽️ ${reminder.mealType}`;
  const body = reminder.label || `Time for your ${reminder.mealType}! Log it in Sherpa Fit.`;
  const t = setTimeout(() => {
    showBrowserNotification(title, body);
    scheduleDailyBrowserNotification(reminder);
  }, delay);
  _scheduledTimers.push(t);
}

export async function scheduleNativeReminder(reminder: ScheduledReminder): Promise<void> {
  if (!isNative) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const [h, m] = reminder.scheduledTime.split(':').map(Number);
    const idNum = Math.abs(reminder.mealType.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 100000;
    await LocalNotifications.cancel({ notifications: [{ id: idNum }] }).catch(() => {});
    await LocalNotifications.schedule({
      notifications: [{
        id: idNum,
        title: MEAL_LABELS[reminder.mealType] || `🍽️ ${reminder.mealType}`,
        body: reminder.label || `Time for your ${reminder.mealType}! Log it in Sherpa Fit.`,
        schedule: { on: { hour: h, minute: m }, repeats: true, allowWhileIdle: true },
        smallIcon: 'ic_notification',
        channelId: 'meal-reminders',
      }],
    });
  } catch {}
}

export async function cancelNativeReminder(mealType: string): Promise<void> {
  if (!isNative) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const idNum = Math.abs(mealType.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 100000;
    await LocalNotifications.cancel({ notifications: [{ id: idNum }] });
  } catch {}
}

export function scheduleBrowserReminders(reminders: ScheduledReminder[]) {
  _scheduledTimers.forEach(t => clearTimeout(t));
  _scheduledTimers.length = 0;
  reminders.forEach(r => scheduleDailyBrowserNotification(r));
}

export async function scheduleAllReminders(reminders: ScheduledReminder[]) {
  if (isNative) {
    for (const r of reminders) {
      if (r.scheduledTime) await scheduleNativeReminder(r);
    }
  } else {
    scheduleBrowserReminders(reminders);
  }
}
