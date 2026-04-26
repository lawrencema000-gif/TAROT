// useVersionCheck — detects when the bundled web assets shipped inside
// the Android AAB are stale relative to the live web deploy, and prompts
// the user to update.
//
// Why this exists:
//   The Capacitor Android app ships with a snapshot of dist/ baked into
//   the AAB. After we publish a new web bundle to Netlify, *web* users
//   pick it up on next page load (cache headers force revalidation), but
//   *Android* users keep running the bundle from their installed APK
//   until they install a new AAB from Play Store.
//
//   When we ship a critical fix (security, billing, broken AI), we need
//   a way to nudge Android users to update. This hook compares the
//   bundled `version.json.sha` (compiled into the app at build time) to
//   the live `tarotlife.app/version.json.sha`. If they differ AND a
//   minimum-version policy says the bundled is too old, we surface a
//   one-time prompt.
//
// Web behaviour: no-op. Web users always get the latest bundle.

import { useEffect, useState } from 'react';
import { isNative } from '../utils/platform';

const LIVE_VERSION_URL = 'https://tarotlife.app/version.json';
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly while app is open
const MIN_AGE_TO_PROMPT_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

interface VersionInfo {
  sha?: string;
  version?: string;
  builtAt?: string;
}

interface UpdateState {
  /** Live SHA differs from the embedded bundle SHA. */
  isStale: boolean;
  /** Bundle is older than MIN_AGE_TO_PROMPT_MS — actively show the prompt. */
  shouldPrompt: boolean;
  /** When the live build was published. */
  liveBuiltAt: string | null;
  /** When the embedded bundle was built. */
  bundledBuiltAt: string | null;
}

const INITIAL: UpdateState = {
  isStale: false,
  shouldPrompt: false,
  liveBuiltAt: null,
  bundledBuiltAt: null,
};

async function fetchLiveVersion(): Promise<VersionInfo | null> {
  try {
    const res = await fetch(LIVE_VERSION_URL, {
      cache: 'no-store',
      // Short fetch budget — never block the app on a slow check.
      signal: AbortSignal.timeout?.(5000) ?? undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as VersionInfo;
  } catch {
    return null;
  }
}

async function fetchBundledVersion(): Promise<VersionInfo | null> {
  // The embedded bundle's version.json is at the app's relative root.
  // On Android (Capacitor), that's served from the assets directory.
  try {
    const res = await fetch('/version.json', {
      cache: 'no-store',
      signal: AbortSignal.timeout?.(3000) ?? undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as VersionInfo;
  } catch {
    return null;
  }
}

export function useVersionCheck(): UpdateState {
  const [state, setState] = useState<UpdateState>(INITIAL);

  useEffect(() => {
    // Web users always have the latest — no need to check.
    if (!isNative()) return;

    let cancelled = false;

    const check = async () => {
      const [bundled, live] = await Promise.all([
        fetchBundledVersion(),
        fetchLiveVersion(),
      ]);
      if (cancelled) return;
      if (!bundled || !live) return;

      const isStale = !!(bundled.sha && live.sha && bundled.sha !== live.sha);
      let shouldPrompt = false;
      if (isStale && bundled.builtAt) {
        const age = Date.now() - new Date(bundled.builtAt).getTime();
        shouldPrompt = age >= MIN_AGE_TO_PROMPT_MS;
      }

      setState({
        isStale,
        shouldPrompt,
        liveBuiltAt: live.builtAt ?? null,
        bundledBuiltAt: bundled.builtAt ?? null,
      });
    };

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return state;
}
