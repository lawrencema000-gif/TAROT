import { describe, it, expect } from 'vitest';
import {
  canAccessFeature,
  canAccessSpread,
  canSaveMore,
  getRemainingFreeSaves,
  getFeatureBlockedMessage,
  spreadTypeToFeature,
  isFeatureUnlockable,
  FREE_TIER,
  PREMIUM_FEATURES,
} from './premium';

describe('canAccessFeature', () => {
  it('always returns true for premium users', () => {
    expect(canAccessFeature(true, 'celtic_cross')).toBe(true);
    expect(canAccessFeature(true, 'birth_chart')).toBe(true);
  });

  it('returns false for free users on premium features', () => {
    expect(canAccessFeature(false, 'celtic_cross')).toBe(false);
    expect(canAccessFeature(false, 'deep_interpretations')).toBe(false);
  });
});

describe('canAccessSpread', () => {
  it('premium can access all spreads', () => {
    expect(canAccessSpread(true, 'celtic-cross')).toBe(true);
    expect(canAccessSpread(true, 'three-card')).toBe(true);
  });

  it('free can only access single', () => {
    expect(canAccessSpread(false, 'single')).toBe(true);
    expect(canAccessSpread(false, 'celtic-cross')).toBe(false);
    expect(canAccessSpread(false, 'three-card')).toBe(false);
  });
});

describe('canSaveMore', () => {
  it('premium can always save', () => {
    expect(canSaveMore(true, 999)).toBe(true);
  });

  it('free has limit', () => {
    expect(canSaveMore(false, 0)).toBe(true);
    expect(canSaveMore(false, FREE_TIER.saves - 1)).toBe(true);
    expect(canSaveMore(false, FREE_TIER.saves)).toBe(false);
  });
});

describe('getRemainingFreeSaves', () => {
  it('returns Infinity for premium', () => {
    expect(getRemainingFreeSaves(true, 5)).toBe(Infinity);
  });

  it('returns correct remaining for free', () => {
    expect(getRemainingFreeSaves(false, 3)).toBe(FREE_TIER.saves - 3);
    expect(getRemainingFreeSaves(false, FREE_TIER.saves + 5)).toBe(0);
  });
});

describe('getFeatureBlockedMessage', () => {
  it('includes feature name', () => {
    const msg = getFeatureBlockedMessage('celtic_cross');
    expect(msg).toContain(PREMIUM_FEATURES.celtic_cross.name);
  });
});

describe('spreadTypeToFeature', () => {
  it('maps celtic-cross', () => {
    expect(spreadTypeToFeature('celtic-cross')).toBe('celtic_cross');
  });

  it('maps three-card', () => {
    expect(spreadTypeToFeature('three-card')).toBe('three_card');
  });

  it('maps relationship/career/shadow to deep_interpretations', () => {
    expect(spreadTypeToFeature('relationship')).toBe('deep_interpretations');
    expect(spreadTypeToFeature('career')).toBe('deep_interpretations');
    expect(spreadTypeToFeature('shadow')).toBe('deep_interpretations');
  });

  it('returns null for unknown', () => {
    expect(spreadTypeToFeature('single')).toBeNull();
    expect(spreadTypeToFeature('unknown')).toBeNull();
  });
});

describe('isFeatureUnlockable', () => {
  it('celtic_cross is unlockable', () => {
    expect(isFeatureUnlockable('celtic_cross')).toBe(true);
  });

  it('unlimited_saves is not unlockable', () => {
    expect(isFeatureUnlockable('unlimited_saves')).toBe(false);
  });
});
