import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * The four locales say the same things.
 *
 * Phase 4 rewrote the English and translated every changed key, and the
 * review still found three translations that could never render: a key
 * had been filed under a name containing the namespace separator. Nothing
 * in the suite could see it. This gate can. It holds the locale files to
 * the shape the code assumes:
 *
 *  - every English key exists in ja, ko and zh (and nothing exists only in
 *    a translation, except the I Ching hexagram names the data file
 *    supplies in English);
 *  - no key name contains ':' (the namespace separator) — such a key can
 *    never be addressed;
 *  - every {{placeholder}} in an English value appears, name for name, in
 *    each translation;
 *  - every key the source asks for exists in some English namespace;
 *  - the English carries no exclamation marks, no emoji and no straight
 *    apostrophes between letters — the house style the phase established.
 */

const ROOT = process.cwd();
const LOCALES = join(ROOT, 'src', 'i18n', 'locales');
const NS = ['app', 'common', 'onboarding', 'landing'] as const;
const OTHERS = ['ja', 'ko', 'zh'] as const;

type Json = { [k: string]: Json | string | number | boolean | null | Json[] };

function load(loc: string, ns: string): Json {
  return JSON.parse(readFileSync(join(LOCALES, loc, `${ns}.json`), 'utf8'));
}

function flat(o: Json | Json[], prefix = '', out: Record<string, string> = {}): Record<string, string> {
  const entries = Array.isArray(o) ? o.map((v, i) => [String(i), v] as const) : Object.entries(o);
  for (const [k, v] of entries) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flat(v as Json, key, out);
    else if (typeof v === 'string') out[key] = v;
  }
  return out;
}

function keysWithColon(o: Json, prefix = '', out: string[] = []): string[] {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (k.includes(':')) out.push(key);
    if (v && typeof v === 'object' && !Array.isArray(v)) keysWithColon(v as Json, key, out);
  }
  return out;
}

/** Keys a translation may carry without an English twin: the data file supplies these in English. */
const TRANSLATION_ONLY = /^iching\.hexagrams\.\d+\.name$/;

const en = Object.fromEntries(NS.map((ns) => [ns, flat(load('en', ns))])) as Record<(typeof NS)[number], Record<string, string>>;

describe('the four locales say the same things', () => {
  it('no key name contains the namespace separator', () => {
    const bad: string[] = [];
    for (const loc of ['en', ...OTHERS]) for (const ns of NS) for (const k of keysWithColon(load(loc, ns))) bad.push(`${loc}/${ns}: ${k}`);
    expect(bad).toEqual([]);
  });

  it('every English key exists in every translation, and nothing exists only in a translation', () => {
    const missing: string[] = [];
    const extra: string[] = [];
    for (const loc of OTHERS) {
      for (const ns of NS) {
        const tr = flat(load(loc, ns));
        for (const k of Object.keys(en[ns])) if (!(k in tr)) missing.push(`${loc}/${ns}: ${k}`);
        for (const k of Object.keys(tr)) if (!(k in en[ns]) && !TRANSLATION_ONLY.test(k)) extra.push(`${loc}/${ns}: ${k}`);
      }
    }
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  it('every placeholder survives translation', () => {
    const bad: string[] = [];
    const ph = (s: string) => (s.match(/\{\{[^}]+\}\}/g) || []).sort().join(' ');
    for (const loc of OTHERS) {
      for (const ns of NS) {
        const tr = flat(load(loc, ns));
        for (const [k, v] of Object.entries(en[ns])) {
          if (k in tr && ph(v) !== ph(tr[k])) bad.push(`${loc}/${ns}: ${k} — en ${ph(v) || '(none)'} vs ${ph(tr[k]) || '(none)'}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('every key the source asks for exists in English', () => {
    const all = new Set<string>();
    for (const ns of NS) for (const k of Object.keys(en[ns])) all.add(k);
    const files: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) { if (!p.includes('locales')) walk(p); }
        else if (/\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) && !n.endsWith('useT.ts')) files.push(p);
      }
    };
    walk(join(ROOT, 'src'));
    const unresolved: string[] = [];
    const call = /\bt(?:App|Common|I18n|AppSettings)?\(\s*['"]([\w.:-]+)['"]/g;
    for (const f of files) {
      const code = readFileSync(f, 'utf8');
      for (const m of code.matchAll(call)) {
        const raw = m[1];
        const key = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw;
        if (all.has(key)) continue;
        if ([...all].some((x) => x.startsWith(key + '.'))) continue; // returnObjects
        unresolved.push(`${relative(ROOT, f).replace(/\\/g, '/')}: ${raw}`);
      }
    }
    expect(unresolved).toEqual([]);
  });

  it('the English keeps the house style: no exclamation marks, no emoji, typographic apostrophes', () => {
    const bad: string[] = [];
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2728}]/u;
    for (const ns of NS) {
      for (const [k, v] of Object.entries(en[ns])) {
        if (/!/.test(v)) bad.push(`${ns}: ${k} has "!"`);
        if (emoji.test(v)) bad.push(`${ns}: ${k} has an emoji`);
        if (/[A-Za-z]'[A-Za-z]/.test(v)) bad.push(`${ns}: ${k} has a straight apostrophe`);
      }
    }
    expect(bad).toEqual([]);
  });
});
