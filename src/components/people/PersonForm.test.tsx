import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The add / edit sheet of a saved person.
 *  - F23: the edit sheet opens on the stored species (it used to preselect
 *    Dog and save it over a stored Cat); a pet stored with none stays
 *    unspecified; a new pet starts on Dog.
 *  - F24: the species chips are in the reader's language.
 *  - F25: a person saved without a birth place gets the device's zone, not
 *    none (the trigger read a zone-less birth time as UTC), and the form
 *    says what leaving the place out costs.
 */

const create = vi.fn();
const update = vi.fn();
vi.mock('../../dal', () => ({ people: { create: (...a: unknown[]) => create(...a), update: (...a: unknown[]) => update(...a) } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' }, profile: { timezone: 'UTC' } }) }));
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn(async () => ({ data: { data: { results: [] } }, error: null })) } } }));
// The place search is CelestialCitySearch's own test; here it answers nothing.
vi.mock('../../hooks/useAstrology', () => ({
  useGeocode: () => ({ results: [], loading: false, error: null, search: vi.fn(), usedFallback: false, regionMissed: false }),
}));
vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, whileTap, whileHover, layout, variants, ...rest }: Record<string, unknown>) => {
    void initial; void animate; void exit; void transition; void whileTap; void whileHover; void layout; void variants;
    return rest;
  };
  const cache = new Map<string, unknown>();
  const motion = new Proxy({}, {
    get: (_t, tag: string) => {
      if (!cache.has(tag)) {
        cache.set(tag, forwardRef<HTMLElement, Record<string, unknown>>(function M(props, ref) {
          const { children, ...rest } = props as { children?: ReactNode } & Record<string, unknown>;
          return createElement(tag, { ...strip(rest), ref }, children);
        }));
      }
      return cache.get(tag);
    },
  });
  return { motion, AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>, useReducedMotion: () => true };
});

import i18n from '../../i18n/config';
import { PersonForm } from './PersonForm';
import type { Person } from '../../dal/people';

const STORED_CAT: Person = {
  id: 'person-1', userId: 'user-1', name: 'QA Cat', relationship: 'pet', species: 'cat', birthDate: '2020-05-01',
  birthTime: null, birthTz: null, birthPlace: null, birthLat: null, birthLon: null, notes: null, createdAt: '2026-10-17T00:00:00Z',
};

const pressed = () => screen.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent);
const saved = (fn: typeof create, arg: number) => fn.mock.calls[0][arg] as Record<string, unknown>;

beforeEach(async () => {
  await i18n.changeLanguage('en');
  create.mockReset();
  update.mockReset();
  const echo = async (...a: unknown[]) => ({ ok: true, data: { ...STORED_CAT, ...(a[a.length - 1] as object) } });
  create.mockImplementation(echo);
  update.mockImplementation(echo);
});
afterEach(() => cleanup());

describe('PersonForm — species (F23)', () => {
  it('the edit sheet of a stored cat opens on Cat, and saving a date change keeps it', async () => {
    render(<PersonForm existing={STORED_CAT} onSaved={() => {}} onCancel={() => {}} />);
    expect(pressed()).toEqual(['Pet', 'Cat']);
    fireEvent.change(screen.getByLabelText('Birth date'), { target: { value: '2020-06-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save birth details' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0]).toBe('person-1');
    expect(saved(update, 1)).toMatchObject({ species: 'cat', birthDate: '2020-06-01' });
  });

  it('a pet stored without a species stays unspecified (no chip pressed, saved as null)', async () => {
    render(<PersonForm existing={{ ...STORED_CAT, species: null }} onSaved={() => {}} onCancel={() => {}} />);
    expect(pressed()).toEqual(['Pet']);
    fireEvent.click(screen.getByRole('button', { name: 'Save birth details' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(saved(update, 1).species).toBeNull();
  });

  it('a new pet starts on Dog', async () => {
    render(<PersonForm onSaved={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pet' }));
    expect(pressed()).toEqual(['Pet', 'Dog']);
  });
});

describe('PersonForm — species chips in the reader’s language (F24)', () => {
  it('ja: the chips read the people.species labels', async () => {
    await i18n.changeLanguage('ja');
    render(<PersonForm existing={STORED_CAT} onSaved={() => {}} onCancel={() => {}} />);
    const sp = (k: string) => i18n.t(`app:people.species.${k}`);
    expect(sp('cat')).toBe('猫');
    for (const k of ['dog', 'cat', 'bird', 'rabbit', 'horse', 'reptile', 'fish', 'smallPet', 'other']) {
      expect(screen.getByRole('button', { name: sp(k) })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Dog' })).toBeNull();
    expect(screen.getByRole('button', { name: '猫' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('PersonForm — no birth place (F25)', () => {
  it('is saved in the device’s zone, and the form says what that costs', async () => {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    render(<PersonForm onSaved={() => {}} onCancel={() => {}} />);
    expect(screen.getByText(/Without a birth place, the birth time is read in your time zone/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('e.g. Mom, Alex, Jamie'), { target: { value: 'Ann' } });
    fireEvent.change(screen.getByLabelText('Birth date'), { target: { value: '1990-07-04' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add this person' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(saved(create, 1)).toMatchObject({ name: 'Ann', birthTz: device, birthPlace: null, birthLat: null });
    expect(saved(create, 1).birthTz).toBeTruthy();
  });

  it('a pet needs no place: no note', () => {
    render(<PersonForm existing={STORED_CAT} onSaved={() => {}} onCancel={() => {}} />);
    expect(screen.queryByText(/Without a birth place/)).toBeNull();
  });
});
