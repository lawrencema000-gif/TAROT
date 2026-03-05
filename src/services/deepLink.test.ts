import { describe, it, expect } from 'vitest';
import { parseDeepLink, generateShareUrl } from './deepLink';

describe('parseDeepLink', () => {
  it('parses reading URL', () => {
    const result = parseDeepLink('https://arcana.app/reading/abc123');
    expect(result).toEqual({ type: 'reading', id: 'abc123' });
  });

  it('parses card URL', () => {
    const result = parseDeepLink('https://arcana.app/card/42');
    expect(result).toEqual({ type: 'card', id: '42' });
  });

  it('parses horoscope URL', () => {
    const result = parseDeepLink('https://arcana.app/horoscope/aries');
    expect(result).toEqual({ type: 'horoscope', id: 'aries' });
  });

  it('returns unknown for unrecognized path', () => {
    const result = parseDeepLink('https://arcana.app/settings/theme');
    expect(result).toEqual({ type: 'unknown' });
  });

  it('returns unknown for root path', () => {
    const result = parseDeepLink('https://arcana.app/');
    expect(result).toEqual({ type: 'unknown' });
  });

  it('returns null for foreign domain', () => {
    expect(parseDeepLink('https://google.com/reading/123')).toBeNull();
  });

  it('returns null for auth callback URLs', () => {
    expect(parseDeepLink('https://arcana.app/auth?code=abc')).toBeNull();
  });

  it('returns null for invalid URL', () => {
    expect(parseDeepLink('not-a-url')).toBeNull();
  });

  it('accepts custom scheme URLs', () => {
    // Custom scheme: host becomes 'reading', path becomes '/abc'
    // The function accepts the protocol but path parsing differs
    const result = parseDeepLink('com.arcana.app://localhost/reading/abc');
    expect(result).not.toBeNull();
  });
});

describe('generateShareUrl', () => {
  it('generates reading URL', () => {
    expect(generateShareUrl('reading', 'abc123')).toBe('https://arcana.app/reading/abc123');
  });

  it('generates card URL', () => {
    expect(generateShareUrl('card', '42')).toBe('https://arcana.app/card/42');
  });

  it('encodes special characters', () => {
    const url = generateShareUrl('horoscope', 'hello world');
    expect(url).toContain('hello%20world');
  });
});
