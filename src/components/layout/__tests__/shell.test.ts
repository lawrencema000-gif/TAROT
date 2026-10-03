import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  safeNextPath,
  signInPathFor,
  authPathKeepingNext,
  rememberNextFrom,
  postAuthDestination,
  forgetNext,
  isAuthPath,
} from '../authReturn';
import { isStaleChunkMessage, reloadForStaleChunk } from '../staleChunk';
import { holdPrerenderedHero, releasePrerenderedHero, isPrerenderedHeroHeld } from '../prerenderedHero';
import { cardBackSources, cardBackSrc, backgroundSrc } from '../../../utils/imageUrl';
import { resolveTab, isMoreGroupRoute, MORE_GROUP_ROUTES } from '../../../context/UIContext';
import fs from 'node:fs';
import path from 'node:path';

describe('post-auth destination (P7 #2/#3/#37/#39)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('accepts in-app paths and refuses anything that could leave the site or loop', () => {
    expect(safeNextPath('/cartomancy/reading')).toBe('/cartomancy/reading');
    expect(safeNextPath('/invite/AB12?x=1#y')).toBe('/invite/AB12?x=1#y');
    expect(safeNextPath('/')).toBe('/');
    for (const bad of [
      null, undefined, '', 'cartomancy', '//evil.com', '/\\evil.com', 'https://evil.com/x',
      'javascript:alert(1)', '/signin', '/signup', '/signin?next=/x', '/reset-password', '/x\nSet-Cookie',
    ]) {
      expect(safeNextPath(bad as string | null | undefined)).toBeNull();
    }
  });

  it('builds the sign-in URL with next, and plain /signin for home', () => {
    expect(signInPathFor('/cartomancy/reading')).toBe('/signin?next=%2Fcartomancy%2Freading');
    expect(signInPathFor('/')).toBe('/signin');
    expect(signInPathFor('//evil.com')).toBe('/signin');
  });

  it('keeps next when switching between sign-in and sign-up', () => {
    expect(authPathKeepingNext('/signup', '?next=%2Fjournal')).toBe('/signup?next=%2Fjournal');
    expect(authPathKeepingNext('/signin', '?next=%2F%2Fevil.com')).toBe('/signin');
    expect(authPathKeepingNext('/signin', '')).toBe('/signin');
  });

  it('a signed-in visitor on /signin or /signup goes to next, else Home', () => {
    expect(postAuthDestination('')).toBe('/');
    expect(postAuthDestination('?lang=ja')).toBe('/');
    expect(postAuthDestination('?next=%2Fcartomancy%2Freading')).toBe('/cartomancy/reading');
    expect(postAuthDestination('?next=https%3A%2F%2Fevil.com')).toBe('/');
  });

  it('remembers next across the OAuth return (query stripped), for 30 minutes', () => {
    const t0 = 1_000_000;
    rememberNextFrom('?next=%2Fjournal', t0);
    // The OAuth return lands on /signin with the query already stripped.
    expect(postAuthDestination('', t0 + 60_000)).toBe('/journal');
    // Pure: reading twice (StrictMode) agrees.
    expect(postAuthDestination('', t0 + 60_000)).toBe('/journal');
    expect(postAuthDestination('', t0 + 31 * 60_000)).toBe('/');
    forgetNext();
    expect(postAuthDestination('', t0 + 60_000)).toBe('/');
  });

  it('the URL wins over the stored value', () => {
    rememberNextFrom('?next=%2Fjournal');
    expect(postAuthDestination('?next=%2Fprofile')).toBe('/profile');
  });

  it('knows the two auth screens', () => {
    expect(isAuthPath('/signin')).toBe(true);
    expect(isAuthPath('/signup')).toBe(true);
    expect(isAuthPath('/')).toBe(false);
    expect(isAuthPath('/signin/x')).toBe(false);
  });
});

describe('stale-chunk recovery (P7 #40)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('recognises every browser’s failed-module message', () => {
    for (const m of [
      'Failed to fetch dynamically imported module: https://x/assets/SettingsSheet-abc.js',
      'error loading dynamically imported module',
      'Importing a module script failed.',
      "'text/html' is not a valid JavaScript MIME type.",
      'Failed to load module script: Expected a JavaScript module script',
      'Unable to preload CSS for /assets/x.css',
    ]) expect(isStaleChunkMessage(m)).toBe(true);
    expect(isStaleChunkMessage('TypeError: x is undefined')).toBe(false);
  });

  it('reloads once per window, and again after it', () => {
    const reload = vi.fn();
    const orig = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...orig, reload } });
    try {
      const t0 = 5_000_000;
      expect(reloadForStaleChunk('Failed to fetch dynamically imported module', t0)).toBe(true);
      expect(reloadForStaleChunk('Failed to fetch dynamically imported module', t0 + 10_000)).toBe(false);
      expect(reloadForStaleChunk('Failed to fetch dynamically imported module', t0 + 3 * 60_000)).toBe(true);
      expect(reload).toHaveBeenCalledTimes(2);
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: orig });
    }
  });
});

describe('prerendered hero hold (P7 #122)', () => {
  it('moves the hero out of #root, hides #root, and swaps back on release', () => {
    document.body.innerHTML = '<div id="root"><div class="seo-prerender seo-landing"><h1>Know yourself.</h1></div><script></script></div>';
    document.documentElement.setAttribute('data-prerendered', 'landing');
    const root = document.getElementById('root')!;
    expect(holdPrerenderedHero(root)).toBe(true);
    expect(isPrerenderedHeroHeld()).toBe(true);
    expect(root.querySelector('.seo-landing')).toBeNull();
    expect(document.body.firstElementChild?.classList.contains('seo-landing')).toBe(true);
    expect(root.style.display).toBe('none');
    releasePrerenderedHero();
    expect(isPrerenderedHeroHeld()).toBe(false);
    expect(document.querySelector('.seo-landing')).toBeNull();
    expect(root.style.display).toBe('');
    document.documentElement.removeAttribute('data-prerendered');
  });

  it('holds nothing when the guard did not keep the hero', () => {
    document.body.innerHTML = '<div id="root"></div>';
    expect(holdPrerenderedHero(document.getElementById('root')!)).toBe(false);
    releasePrerenderedHero();
    expect(document.getElementById('root')!.style.display).toBe('');
  });

  it('releases on its own after the timeout', () => {
    vi.useFakeTimers();
    try {
      document.body.innerHTML = '<div id="root"><div class="seo-landing"></div></div>';
      document.documentElement.setAttribute('data-prerendered', 'landing');
      holdPrerenderedHero(document.getElementById('root')!, 5000);
      vi.advanceTimersByTime(5001);
      expect(isPrerenderedHeroHeld()).toBe(false);
      expect(document.getElementById('root')!.style.display).toBe('');
    } finally {
      document.documentElement.removeAttribute('data-prerendered');
      vi.useRealTimers();
    }
  });
});

describe('appearance renditions (P7 #138)', () => {
  const S = 'https://ulzlthhkqjuohzjangcq.supabase.co/storage/v1/object/public';
  const DIR = '7bc78b43-0626-4dae-856b-baa1e22ff315';

  it('the stock card back resolves to the shipped WebP sized for the card', () => {
    const url = `${S}/card-backs/${DIR}/card_back_1768047025411.png`;
    const small = cardBackSources(url, 96);
    expect(small.src).toBe('/card-backs/r/card_back_1768047025411-200.webp');
    expect(small.srcSet).toBe('/card-backs/r/card_back_1768047025411-200.webp 200w, /card-backs/r/card_back_1768047025411-480.webp 480w');
    expect(small.sizes).toBe('96px');
    expect(cardBackSrc(url, 160)).toBe('/card-backs/r/card_back_1768047025411-480.webp');
  });

  it('an unknown Storage back goes through the image transform, never the original', () => {
    const url = `${S}/card-backs/${DIR}/card_back_1999999999999.png`;
    const s = cardBackSources(url, 96);
    expect(s.src).toBe(`https://ulzlthhkqjuohzjangcq.supabase.co/storage/v1/render/image/public/card-backs/${DIR}/card_back_1999999999999.png?width=200&quality=75`);
    expect(s.srcSet).toContain('width=480');
  });

  it('bundled card images keep their 150/400 renditions; the default SVG is as given', () => {
    const b = cardBackSources('/bundled-cards/major-arcana/the-fool.webp', 96);
    expect(b.src).toBe('/bundled-cards/full/major-arcana/the-fool.webp');
    expect(b.srcSet).toContain('/bundled-cards/thumb/major-arcana/the-fool.webp 150w');
    expect(cardBackSources(null, 96)).toEqual({ src: '/card-backs/default.svg' });
    expect(cardBackSources('data:image/png;base64,xx', 96)).toEqual({ src: 'data:image/png;base64,xx' });
  });

  it('every stock background maps to its 900px WebP; others are transformed; the rest pass through', () => {
    for (const stem of ['background_1768048475356', 'background_1768048480582', 'background_1768048506937']) {
      expect(backgroundSrc(`${S}/backgrounds/${DIR}/${stem}.png`)).toBe(`/backgrounds/full/${stem}.webp`);
    }
    expect(backgroundSrc(`${S}/backgrounds/${DIR}/background_2.png`)).toBe(
      `https://ulzlthhkqjuohzjangcq.supabase.co/storage/v1/render/image/public/backgrounds/${DIR}/background_2.png?width=900&quality=55`,
    );
    expect(backgroundSrc('https://example.com/a.png')).toBe('https://example.com/a.png');
  });
});

describe('bottom-nav parents (P7 #121)', () => {
  it('every More-menu route lights More and no tab; nothing else lights More', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../BottomNav.tsx'), 'utf8');
    const menuRoutes = [...src.matchAll(/route: '([^']+)'/g)].map((m) => m[1]).filter((r) => r !== '/cartomancy');
    expect(menuRoutes.length).toBeGreaterThanOrEqual(6);
    for (const r of menuRoutes) {
      expect(isMoreGroupRoute(r), r).toBe(true);
      expect(resolveTab(r), r).toBeNull();
    }
    for (const r of ['/ziwei', '/mansions', '/good-days']) expect(resolveTab(r), r).toBeNull();
    // The rest of the More group are the flag-gated social tabs.
    for (const r of MORE_GROUP_ROUTES) {
      expect(menuRoutes.includes(r) || ['/community', '/whispering-well', '/companion'].includes(r), r).toBe(true);
    }
  });

  it('Home-linked pages light Home, not More', () => {
    for (const r of ['/love-tree', '/soulmate-score']) {
      expect(resolveTab(r)).toBe('home');
      expect(isMoreGroupRoute(r)).toBe(false);
    }
    expect(resolveTab('/cartomancy/reading')).toBe('readings');
    expect(resolveTab('/runes')).toBe('readings');
  });
});
