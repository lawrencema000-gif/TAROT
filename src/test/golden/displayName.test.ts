import { describe, it, expect } from 'vitest';
import { friendlyDisplayName, displayNameFromEmail } from '../../utils/displayName';

/**
 * What the greeting calls the person. The heuristics exist to hide
 * machine-made handles, and the Phase 5 review found them eating real
 * names: an OAuth "Jean-Paul Sartre" came out "Jean Paul sartre", anything
 * over twenty characters vanished, and an email sign-up "lawrence99" was
 * stored lower case. These pin the behaviour.
 */
describe('friendlyDisplayName', () => {
  it('uses a real name as given', () => {
    expect(friendlyDisplayName('Jean-Paul Sartre')).toBe('Jean-Paul Sartre');
    expect(friendlyDisplayName('Mary-Kate Olsen')).toBe('Mary-Kate Olsen');
    expect(friendlyDisplayName('Dr. Jane Doe')).toBe('Dr. Jane Doe');
    expect(friendlyDisplayName('María José García López')).toBe('María José García López');
    expect(friendlyDisplayName('  Christopher Alexander ')).toBe('Christopher Alexander');
  });

  it('title-cases a handle, including a single word', () => {
    expect(friendlyDisplayName('j.doe')).toBe('J Doe');
    expect(friendlyDisplayName('maria_s')).toBe('Maria S');
    expect(friendlyDisplayName('lawrence')).toBe('Lawrence');
    expect(friendlyDisplayName('lawrence@example.com')).toBe('Lawrence');
    expect(friendlyDisplayName('McDonald')).toBe('McDonald');
  });

  it('hides generated handles', () => {
    expect(friendlyDisplayName('arcana-qa-auth-1776994003021')).toBe('');
    expect(friendlyDisplayName('user8839201')).toBe('');
    expect(friendlyDisplayName('a-b-c-d')).toBe('');
    expect(friendlyDisplayName('averyveryverylonghandle123')).toBe('');
    expect(friendlyDisplayName('')).toBe('');
    expect(friendlyDisplayName(null)).toBe('');
  });
});

describe('displayNameFromEmail', () => {
  it('stores a greeting-ready name and never an empty one', () => {
    expect(displayNameFromEmail('lawrence99@example.com')).toBe('Lawrence');
    expect(displayNameFromEmail('j.doe@example.com')).toBe('J Doe');
    expect(displayNameFromEmail('maria_s@example.com')).toBe('Maria S');
    expect(displayNameFromEmail('8839201@example.com')).toBe('8839201');
  });
});
