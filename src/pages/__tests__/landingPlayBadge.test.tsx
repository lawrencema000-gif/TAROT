import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('../../lib/supabase', () => ({ supabase: {} }));

import i18n from '../../i18n/config';
import { PlayBadge } from '../LandingPage';

/*
 * p10 d2-ja-13: the landing page showed one English "GET IT ON Google Play"
 * badge in every language — a copy with a light checkerboard baked into its
 * pixels around the badge. It now shows Google's own badge for the page's
 * language, downloaded unaltered from
 * play.google.com/intl/en_us/badges/static/images/badges/{lang}_badge_web_generic.png
 * (zh-cn for zh), with the alt text saying what that badge says.
 */

const ROOT = process.cwd();
const landing = (lng: string) => JSON.parse(readFileSync(join(ROOT, 'src', 'i18n', 'locales', lng, 'landing.json'), 'utf8'));

/** SHA-256 of Google's files as published (fetched 2026-10-20). */
const OFFICIAL: Record<string, string> = {
  en: 'f72611e2df8e88204009fd896d05d5e8e83c77009c63943bbffa169559934849',
  ja: '2b1b4ff5b79346bcfc5a78e760e781a5161202adb9884c58f142b457b4bc0a9c',
  ko: '40b67d92fb4162ae7470efe7849481c1f3f978472ada95f306878cd1a8b6707d',
  zh: 'e1522865b98e6969d1af792f0878df36fc09b81d68f043236eb3db462e0a6a68',
};
/** The words on each badge, which its alt text carries too. */
const BADGE_WORDS: Record<string, string[]> = {
  en: ['Get it on', 'Google Play'],
  ja: ['Google Play', '手に入れよう'],
  ko: ['Google Play', '다운로드'],
  zh: ['Google Play', '商店', '下载'],
};

/** A PNG's pixel size, from its IHDR chunk. */
function pngSize(file: string): [number, number] {
  const buf = readFileSync(file);
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}
/** "h-[62.5px] -my-[7.25px]" → the drawn badge's height: the image's, less the ground the margin takes back. */
function badgeHeight(className: string): number {
  const h = Number(/\bh-\[([\d.]+)px\]/.exec(className)![1]);
  const m = /-m(?:y)?-\[([\d.]+)px\]/.exec(className);
  return h - 2 * (m ? Number(m[1]) : 0);
}

beforeAll(() => {
  for (const lng of ['ja', 'ko', 'zh']) i18n.addResourceBundle(lng, 'landing', landing(lng), true, true);
});
afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('p10 d2-ja-13 — the landing page shows Google’s Play badge in the page’s language', () => {
  it.each(['en', 'ja', 'ko', 'zh'])('%s: its own official badge, unaltered, with its words as the alt text', async (lng) => {
    await act(async () => {
      await i18n.changeLanguage(lng);
    });
    const alt = landing(lng).play.alt as string;
    render(<PlayBadge alt={alt} eager />);
    const img = screen.getByRole('img', { name: alt }) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(`/google-play-badge-${lng}.png`);
    for (const w of BADGE_WORDS[lng]) expect(alt).toContain(w);

    const file = join(ROOT, 'public', `google-play-badge-${lng}.png`);
    expect(existsSync(file)).toBe(true);
    expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(OFFICIAL[lng]);
    expect(pngSize(file)).toEqual([646, 250]);
    // The attributes give the file's own proportions; the class sets a 48px badge.
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['646', '250']);
    expect(badgeHeight(img.className)).toBeCloseTo(48, 1);
    expect(img.closest('a')!.getAttribute('href')).toBe('https://play.google.com/store/apps/details?id=com.arcana.app');
  });

  it('no language shows the checkerboard copy any more', async () => {
    for (const lng of ['en', 'ja', 'ko', 'zh']) {
      await act(async () => {
        await i18n.changeLanguage(lng);
      });
      const { container, unmount } = render(<PlayBadge alt="badge" />);
      expect(container.querySelector('img')!.getAttribute('src')).not.toBe('/google-play-badge.png');
      unmount();
    }
  });
});
