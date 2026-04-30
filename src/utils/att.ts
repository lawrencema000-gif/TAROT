/**
 * App Tracking Transparency (ATT) helper.
 *
 * iOS 14.5+ requires apps that use IDFA (e.g. AdMob personalized ads,
 * Sentry session replay with device fingerprinting, RevenueCat audiences)
 * to ask the user for permission via the ATT system prompt.
 *
 * On Android and Web this is a no-op (those platforms have their own
 * consent / Privacy Sandbox flows that we handle elsewhere).
 *
 * Recommended call site: once, early in app startup, AFTER the app UI
 * has had a chance to render its first frame (so the prompt doesn't
 * appear over a black screen) but BEFORE AdMob.initialize() runs.
 *
 * Apple guideline tip: the prompt's `NSUserTrackingUsageDescription`
 * (set in Info.plist by codemagic.yaml) should be a clear, user-facing
 * sentence — Apple will reject vague boilerplate like "we track you".
 */

import { isIOS } from './platform';

type AttStatus = 'authorized' | 'denied' | 'restricted' | 'notDetermined' | 'unsupported';

let cachedStatus: AttStatus | null = null;
let inFlight: Promise<AttStatus> | null = null;

/**
 * Request ATT permission. Idempotent — only shows the prompt once per
 * install (Apple controls this; subsequent calls return the cached
 * answer). Safe to call on non-iOS platforms (returns 'unsupported').
 */
export async function requestATTPermission(): Promise<AttStatus> {
  if (cachedStatus !== null) return cachedStatus;
  if (inFlight) return inFlight;

  if (!isIOS()) {
    cachedStatus = 'unsupported';
    return cachedStatus;
  }

  inFlight = (async () => {
    try {
      const mod = await import('@capgo/capacitor-app-tracking-transparency');
      const plugin = mod.AppTrackingTransparency;

      const current = await plugin.getStatus();
      if (current.status !== 'notDetermined') {
        cachedStatus = current.status as AttStatus;
        return cachedStatus;
      }

      const result = await plugin.requestPermission();
      cachedStatus = result.status as AttStatus;
      return cachedStatus;
    } catch (err) {
      // Plugin not installed (e.g. running on web) or native call failed.
      // Fail open — treat as 'unsupported' so AdMob can still serve
      // non-personalized ads and the app continues to work.
      // eslint-disable-next-line no-console
      console.warn('[ATT] permission request failed:', err);
      cachedStatus = 'unsupported';
      return cachedStatus;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Get the current ATT status without prompting. Returns 'unsupported'
 * on non-iOS or before requestATTPermission() has been called.
 */
export async function getATTStatus(): Promise<AttStatus> {
  if (cachedStatus !== null) return cachedStatus;
  if (!isIOS()) return 'unsupported';

  try {
    const mod = await import('@capgo/capacitor-app-tracking-transparency');
    const result = await mod.AppTrackingTransparency.getStatus();
    cachedStatus = result.status as AttStatus;
    return cachedStatus;
  } catch {
    return 'unsupported';
  }
}

/**
 * Whether the user has explicitly granted tracking permission.
 * Use this to gate personalized-ad requests in AdMob.
 */
export function isTrackingAuthorized(): boolean {
  return cachedStatus === 'authorized';
}
