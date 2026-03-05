import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateBirthDate,
  validateBirthTime,
  validateJournalEntry,
  validateTags,
  sanitizeInput,
  isValidUrl,
  normalizeWhitespace,
  truncate,
} from './validation';

describe('validateEmail', () => {
  it('rejects empty string', () => {
    expect(validateEmail('')).toEqual({ valid: false, error: 'Email is required' });
  });

  it('rejects missing @', () => {
    expect(validateEmail('foobar.com').valid).toBe(false);
  });

  it('rejects emails over 254 chars', () => {
    const long = 'a'.repeat(250) + '@b.co';
    expect(validateEmail(long).valid).toBe(false);
  });

  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true });
  });
});

describe('validatePassword', () => {
  it('rejects empty', () => {
    expect(validatePassword('').valid).toBe(false);
  });

  it('rejects too short', () => {
    expect(validatePassword('abc1').valid).toBe(false);
  });

  it('rejects too long', () => {
    expect(validatePassword('a1' + 'x'.repeat(127)).valid).toBe(false);
  });

  it('rejects letters only', () => {
    expect(validatePassword('abcdefgh').valid).toBe(false);
  });

  it('rejects numbers only', () => {
    expect(validatePassword('12345678').valid).toBe(false);
  });

  it('accepts valid password', () => {
    expect(validatePassword('Secret123')).toEqual({ valid: true });
  });
});

describe('validateDisplayName', () => {
  it('rejects empty', () => {
    expect(validateDisplayName('').valid).toBe(false);
  });

  it('rejects single char', () => {
    expect(validateDisplayName('A').valid).toBe(false);
  });

  it('rejects over 50 chars', () => {
    expect(validateDisplayName('A'.repeat(51)).valid).toBe(false);
  });

  it('rejects special characters', () => {
    expect(validateDisplayName('user<script>').valid).toBe(false);
  });

  it('accepts unicode names', () => {
    expect(validateDisplayName('María García')).toEqual({ valid: true });
  });

  it('accepts hyphenated names', () => {
    expect(validateDisplayName("Jean-Pierre O'Brien")).toEqual({ valid: true });
  });
});

describe('validateBirthDate', () => {
  it('rejects empty', () => {
    expect(validateBirthDate('').valid).toBe(false);
  });

  it('rejects invalid date string', () => {
    expect(validateBirthDate('not-a-date').valid).toBe(false);
  });

  it('rejects future date', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(validateBirthDate(future.toISOString()).valid).toBe(false);
  });

  it('rejects under 13', () => {
    const young = new Date();
    young.setFullYear(young.getFullYear() - 10);
    expect(validateBirthDate(young.toISOString()).valid).toBe(false);
  });

  it('accepts valid adult date', () => {
    expect(validateBirthDate('1990-06-15')).toEqual({ valid: true });
  });
});

describe('validateBirthTime', () => {
  it('accepts empty (optional)', () => {
    expect(validateBirthTime('')).toEqual({ valid: true });
  });

  it('rejects bad format', () => {
    expect(validateBirthTime('25:00').valid).toBe(false);
  });

  it('accepts valid time', () => {
    expect(validateBirthTime('14:30')).toEqual({ valid: true });
  });
});

describe('validateJournalEntry', () => {
  it('rejects empty', () => {
    expect(validateJournalEntry('').valid).toBe(false);
  });

  it('rejects over 10000 chars', () => {
    expect(validateJournalEntry('x'.repeat(10001)).valid).toBe(false);
  });

  it('accepts normal entry', () => {
    expect(validateJournalEntry('Today was a good day.')).toEqual({ valid: true });
  });
});

describe('validateTags', () => {
  it('rejects more than 10 tags', () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    expect(validateTags(tags).valid).toBe(false);
  });

  it('rejects tag over 30 chars', () => {
    expect(validateTags(['a'.repeat(31)]).valid).toBe(false);
  });

  it('accepts valid tags', () => {
    expect(validateTags(['mood', 'happy', 'grateful'])).toEqual({ valid: true });
  });
});

describe('sanitizeInput', () => {
  it('strips angle brackets', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });

  it('strips javascript: protocol', () => {
    expect(sanitizeInput('javascript:alert(1)')).not.toContain('javascript:');
  });

  it('strips event handlers', () => {
    expect(sanitizeInput('onerror=alert(1)')).not.toContain('onerror=');
  });

  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });
});

describe('isValidUrl', () => {
  it('accepts https url', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('rejects garbage', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });
});

describe('normalizeWhitespace', () => {
  it('collapses multiple spaces', () => {
    expect(normalizeWhitespace('  hello   world  ')).toBe('hello world');
  });
});

describe('truncate', () => {
  it('returns short string unchanged', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });

  it('truncates with suffix', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });
});
