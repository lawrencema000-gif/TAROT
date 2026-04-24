/**
 * Feature flag provider + hook.
 *
 * Fetches flags once at mount, refreshes every 5 minutes. Components read
 * flags via `useFeatureFlag('some-key')` which returns a deterministic
 * boolean for the current user.
 *
 * Design choice: flags are evaluated CLIENT-SIDE (no server round trip per
 * flag check) because:
 *   1. Flag table is small and public-read; one fetch covers the app.
 *   2. The hook needs to be synchronous.
 *   3. Authoritative decisions (e.g. 'use Gemini Flash') are made by edge
 *      functions which evaluate against the same table, so client drift
 *      doesn't affect trust.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { featureFlags } from '../dal';
import { evaluate, parseQueryOverrides, type EvalContext } from '../utils/featureFlagEval';
import { useAuth } from './AuthContext';
import type { FeatureFlag } from '../dal/featureFlags';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const ANON_ID_KEY = 'arcana_anon_id';

interface FeatureFlagContextValue {
  flags: FeatureFlag[];
  ready: boolean;
  refresh: () => Promise<void>;
  isEnabled: (key: string) => boolean;
}

const Ctx = createContext<FeatureFlagContextValue | null>(null);

function getOrCreateAnonymousId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = window.localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(ANON_ID_KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
}

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [flagMap, setFlagMap] = useState<Map<string, FeatureFlag>>(new Map());
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const res = await featureFlags.fetchAll();
    if (res.ok) {
      setFlagMap(new Map(res.data.map((f) => [f.key, f])));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void load();
    const interval = window.setInterval(() => {
      if (!cancelled) void load();
    }, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [load]);

  const evalCtx = useMemo<EvalContext>(() => ({
    userId: user?.id ?? null,
    anonymousId: getOrCreateAnonymousId(),
    queryOverrides: typeof window !== 'undefined'
      ? parseQueryOverrides(window.location.search)
      : undefined,
    smokeMode: import.meta.env.VITE_AUDIT_SMOKE === 'true',
  }), [user?.id]);

  const isEnabled = useCallback(
    (key: string): boolean => {
      const flag = flagMap.get(key);
      if (!flag) return false; // fail-safe: unknown flag = off
      return evaluate(flag, evalCtx);
    },
    [flagMap, evalCtx],
  );

  const value = useMemo<FeatureFlagContextValue>(() => ({
    flags: [...flagMap.values()],
    ready,
    refresh: load,
    isEnabled,
  }), [flagMap, ready, load, isEnabled]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFeatureFlag(key: string): boolean {
  const ctx = useContext(Ctx);
  if (!ctx) return false; // called outside provider -> off
  return ctx.isEnabled(key);
}

export function useFeatureFlags(): FeatureFlagContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      flags: [],
      ready: false,
      refresh: async () => {},
      isEnabled: () => false,
    };
  }
  return ctx;
}
