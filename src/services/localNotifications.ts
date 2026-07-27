/**
 * Local notifications — the retention loop the app promised but never had.
 *
 * Onboarding has collected `notificationTime` and Settings has had an
 * enable toggle since launch, but nothing ever scheduled a notification
 * (profiles.notification_time was written and never read). This service
 * closes that loop with @capacitor/local-notifications:
 *
 *   - Daily ritual reminder at the user's chosen time (repeating).
 *   - A one-shot "streak keeper" nudge at 20:30 — scheduled only while
 *     today's ritual is incomplete, cancelled the moment it completes,
 *     so it never nags someone who already showed up.
 *
 * Everything is native-only (no-op on web) and idempotent: sync functions
 * cancel-then-reschedule so they can be called freely whenever profile
 * state changes. The plugin persists schedules across reboots.
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from '../utils/platform';
import { captureException } from '../utils/telemetry';

const DAILY_REMINDER_ID = 1001;
const STREAK_NUDGE_ID = 1002;
const STREAK_NUDGE_HOUR = 20;
const STREAK_NUDGE_MINUTE = 30;

/** Ask for permission. Returns true when granted (or already granted). */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch (err) {
    captureException('localNotifications.permission', err);
    return false;
  }
}

function parseTime(hhmm: string | undefined | null): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  if (!m) return { hour: 9, minute: 0 };
  const hour = Math.min(23, Math.max(0, Number(m[1])));
  const minute = Math.min(59, Math.max(0, Number(m[2])));
  return { hour, minute };
}

/**
 * Reconcile the repeating daily reminder with profile state. Call whenever
 * notificationsEnabled / notificationTime change (App.tsx effect) — safe to
 * call repeatedly.
 */
export async function syncDailyReminder(enabled: boolean, notificationTime: string | undefined | null): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
    if (!enabled) return;
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const { hour, minute } = parseTime(notificationTime);
    await LocalNotifications.schedule({
      notifications: [{
        id: DAILY_REMINDER_ID,
        title: 'Your daily ritual awaits ☽',
        body: 'Pull your card, read your horoscope, write one honest line.',
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      }],
    });
  } catch (err) {
    captureException('localNotifications.syncDailyReminder', err);
  }
}

/**
 * One-shot evening nudge that only exists while today's ritual is
 * incomplete. Call with the current completion state whenever it changes
 * (ritual load + completion). Never fires after completion, never repeats.
 */
export async function syncStreakNudge(enabled: boolean, ritualCompletedToday: boolean): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: STREAK_NUDGE_ID }] });
    if (!enabled || ritualCompletedToday) return;

    const now = new Date();
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), STREAK_NUDGE_HOUR, STREAK_NUDGE_MINUTE, 0);
    if (at.getTime() <= now.getTime()) return; // evening already passed

    const status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') return; // nudge never prompts — only the explicit opt-in path does

    await LocalNotifications.schedule({
      notifications: [{
        id: STREAK_NUDGE_ID,
        title: 'Keep your streak alive 🔥',
        body: 'One card before midnight keeps the ritual unbroken.',
        schedule: { at, allowWhileIdle: true },
      }],
    });
  } catch (err) {
    captureException('localNotifications.syncStreakNudge', err);
  }
}
