import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p8 F25: the city picker of the People form and the Celestial Map. It
 * matched only the English names of its curated list, under a localized
 * placeholder, and said nothing when nothing matched: 東京, 大阪, ソウル,
 * 서울 and 上海 returned an empty list, and a person saved without a place
 * was cast in UTC.
 *
 * Now: a country typed in the reader's language matches the list (日本 →
 * the Japanese cities); anything the list cannot answer goes to the place
 * search (astrology-geocode, which answers CJK); the search says when it is
 * searching, and a query nothing answers says so.
 */

const answers = new Map<string, { results: { lat: number; lon: number; displayName: string }[]; error?: string }>();
const searched: string[] = [];

vi.mock('../../hooks/useAstrology', async () => {
  const React = await import('react');
  return {
    // The real hook's contract: `search` sets loading, then results or an error.
    useGeocode: () => {
      const [state, setState] = React.useState<{ results: unknown[]; loading: boolean; error: string | null }>({ results: [], loading: false, error: null });
      const search = React.useCallback(async (q: string) => {
        searched.push(q);
        setState((s) => ({ ...s, loading: true, error: null }));
        await new Promise((r) => setTimeout(r, 30));
        const a = answers.get(q) ?? { results: [] };
        setState({ results: a.results, loading: false, error: a.error ?? null });
      }, []);
      return { ...state, search, usedFallback: false, regionMissed: false };
    },
  };
});
vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, ...rest }: Record<string, unknown>) => {
    void initial; void animate; void exit; void transition;
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
  return { motion, AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</> };
});

import i18n from '../../i18n/config';
import { CelestialCitySearch } from './CelestialCitySearch';

function type(value: string) {
  const box = screen.getByRole('textbox');
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value } });
}
const rowNames = () => screen.queryAllByRole('button').map((b) => b.textContent);

beforeEach(async () => {
  answers.clear();
  searched.length = 0;
  await i18n.changeLanguage('en');
});
afterEach(() => cleanup());

describe('CelestialCitySearch', () => {
  it('an English name is answered by the list, without a place search', async () => {
    const onPick = vi.fn();
    render(<CelestialCitySearch onPick={onPick} />);
    type('Tokyo');
    expect(rowNames()[0]).toContain('Tokyo');
    expect(rowNames()[0]).toContain('Japan');
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tokyo', cc: 'JP' }), 'list');
    await new Promise((r) => setTimeout(r, 450));
    expect(searched).toEqual([]);
  });

  it('ja: a country typed in Japanese lists its cities, under their Japanese country name', async () => {
    await i18n.changeLanguage('ja');
    render(<CelestialCitySearch onPick={() => {}} />);
    type('日本');
    const rows = rowNames();
    expect(rows.length).toBeGreaterThan(1);
    expect(rows[0]).toContain('Tokyo');
    expect(rows.every((r) => r?.includes('日本'))).toBe(true);
  });

  it('ja: 東京 goes to the place search; its answer is listed and picked as the place itself', async () => {
    await i18n.changeLanguage('ja');
    answers.set('東京', { results: [{ lat: 35.6895, lon: 139.6917, displayName: '東京都, 日本' }] });
    const onPick = vi.fn();
    render(<CelestialCitySearch onPick={onPick} />);
    type('東京');
    // While the typing pauses and the search runs: "searching", never an empty box.
    expect(await screen.findByRole('status')).toHaveTextContent(i18n.t('app:celestial.search.searching'));
    const hit = await screen.findByRole('button', { name: /東京都/ }, { timeout: 2000 });
    expect(searched).toEqual(['東京']);
    expect(hit).toHaveTextContent('日本');
    fireEvent.click(hit);
    expect(onPick).toHaveBeenCalledWith({ name: '東京都', country: '日本', cc: '', lat: 35.6895, lon: 139.6917, pop: 0 }, 'search');
  });

  it('a place the search answers twice is listed once', async () => {
    await i18n.changeLanguage('ja');
    const paris = 'Paris, Ile-de-France, Metropolitan France, France';
    answers.set('パリ', { results: [{ lat: 48.8535, lon: 2.3484, displayName: paris }, { lat: 48.8589, lon: 2.32, displayName: paris }, { lat: 33.66, lon: -95.55, displayName: 'Paris, Texas, United States' }] });
    render(<CelestialCitySearch onPick={() => {}} />);
    type('パリ');
    await screen.findAllByRole('button', { name: /Paris/ }, { timeout: 2000 });
    expect(rowNames()).toEqual(['ParisIle-de-France, Metropolitan France, France', 'ParisTexas, United States']);
  });

  it('ko / zh: 서울 and 上海 are searched the same way', async () => {
    for (const [lng, q, place] of [['ko', '서울', '서울특별시, 대한민국'], ['zh', '上海', '上海市，中国']] as const) {
      await i18n.changeLanguage(lng);
      answers.set(q, { results: [{ lat: 37.5, lon: 127, displayName: place }] });
      render(<CelestialCitySearch onPick={() => {}} />);
      type(q);
      await screen.findByRole('button', { name: new RegExp(place.split(/[,，]/)[0]) }, { timeout: 2000 });
      cleanup();
    }
    expect(searched).toEqual(['서울', '上海']);
  });

  it('a query nothing answers says so (ja), and the search’s own notice wins when it has one', async () => {
    await i18n.changeLanguage('ja');
    render(<CelestialCitySearch onPick={() => {}} />);
    type('zzqx');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(i18n.t('app:celestial.search.noResults', { query: 'zzqx' })), { timeout: 2000 });
    expect(screen.getByRole('status').textContent).toContain('「zzqx」');

    answers.set('Springfield, Vermont', { results: [], error: 'None of these places is in Vermont.' });
    act(() => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Springfield, Vermont' } });
    });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('None of these places is in Vermont.'), { timeout: 2000 });
  });
});
