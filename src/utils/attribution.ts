/**
 * Traffic attribution — captures UTM params on first landing and persists
 * them through the signup flow so each profile can be attributed back to
 * its originating ad campaign.
 *
 * Usage:
 *   - Call captureAttributionFromUrl() once on app boot
 *   - Call getAttribution() when creating a profile row at signup
 */

const STORAGE_KEY = 'arcana_attribution_v1';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  first_referrer?: string;
  captured_at: string;
}

/** Read UTM params from the current URL and persist if any are present. */
export function captureAttributionFromUrl(): void {
  if (typeof window === 'undefined') return;

  try {
    const params = new URLSearchParams(window.location.search);
    const hit: Attribution = { captured_at: new Date().toISOString() };
    let sawAny = false;

    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) {
        hit[key] = value.slice(0, 200);
        sawAny = true;
      }
    }

    if (document.referrer && !document.referrer.includes(window.location.hostname)) {
      hit.first_referrer = document.referrer.slice(0, 500);
    }

    // Only overwrite existing attribution if new UTMs are present.
    // This keeps "first-touch" attribution stable across sessions.
    if (sawAny || (!localStorage.getItem(STORAGE_KEY) && hit.first_referrer)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hit));
    }
  } catch {
    // localStorage may be blocked in some embedded contexts — silent fail
  }
}

/** Get persisted attribution for inclusion in the profile row at signup. */
export function getAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

/** Clear attribution (e.g., after it's been persisted to profile). */
export function clearAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
