import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/*
 * social-ai-02: FeatureFlagProvider honours `?ff_<key>=on|off` only on the dev
 * server and in VITE_AUDIT_SMOKE builds; a production build ignores them.
 *
 * The real provider runs here; only the flag fetch and the signed-in member
 * are fakes. The URL asks for both directions at once: advisors (off for
 * everyone) on, cartomancy (on for everyone) off. A production build must
 * ignore both; the dev server and a VITE_AUDIT_SMOKE build honour both.
 */

const h = vi.hoisted(() => ({
  flags: [
    {
      key: 'advisors',
      description: null,
      enabled: false,
      rolloutPercent: 0,
      allowedUserIds: [] as string[],
      updatedAt: '2026-11-15T00:00:00.000Z',
    },
    {
      key: 'cartomancy',
      description: null,
      enabled: true,
      rolloutPercent: 100,
      allowedUserIds: [] as string[],
      updatedAt: '2026-11-15T00:00:00.000Z',
    },
  ],
}));

vi.mock('../../dal', () => ({
  featureFlags: {
    fetchAll: vi.fn(async () => ({ ok: true, data: h.flags })),
  },
}));

vi.mock('../AuthContext', () => ({
  useAuth: () => ({ user: { id: '00000000-0000-4000-8000-0000000000f1' } }),
}));

import { FeatureFlagProvider, useFeatureFlag, useFeatureFlags } from '../FeatureFlagContext';

function Probe() {
  const { ready } = useFeatureFlags();
  const advisors = useFeatureFlag('advisors');
  const cartomancy = useFeatureFlag('cartomancy');
  if (!ready) return null;
  return <p data-testid="flags">{`advisors=${advisors} cartomancy=${cartomancy}`}</p>;
}

async function flagsShown(): Promise<string | null> {
  render(
    <FeatureFlagProvider>
      <Probe />
    </FeatureFlagProvider>,
  );
  return (await screen.findByTestId('flags')).textContent;
}

describe('FeatureFlagProvider: ?ff_ overrides only outside production (social-ai-02)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/?ff_advisors=on&ff_cartomancy=off');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    window.history.replaceState(null, '', '/');
  });

  it('a production build ignores them in both directions', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_AUDIT_SMOKE', '');
    expect(await flagsShown()).toBe('advisors=false cartomancy=true');
  });

  it('the dev server honours them', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_AUDIT_SMOKE', '');
    expect(await flagsShown()).toBe('advisors=true cartomancy=false');
  });

  it('a VITE_AUDIT_SMOKE build honours them', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_AUDIT_SMOKE', 'true');
    expect(await flagsShown()).toBe('advisors=true cartomancy=false');
  });
});
