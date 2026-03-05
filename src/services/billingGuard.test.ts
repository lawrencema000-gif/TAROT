import { describe, it, expect } from 'vitest';
import { getPlatformWarning } from './billingGuard';

describe('getPlatformWarning', () => {
  it('warns web user about existing mobile purchase', () => {
    const result = getPlatformWarning('web', 'google');
    expect(result).toContain('mobile app');
  });

  it('warns mobile user about existing web purchase', () => {
    const result = getPlatformWarning('mobile', 'stripe');
    expect(result).toContain('web');
  });

  it('warns mobile user about web provider', () => {
    const result = getPlatformWarning('mobile', 'web');
    expect(result).toContain('web');
  });

  it('returns null for same-platform purchase', () => {
    expect(getPlatformWarning('web', 'stripe')).toBeNull();
    expect(getPlatformWarning('mobile', 'google')).toBeNull();
  });
});
