import { memo } from 'react';

/**
 * Ten moods as line drawings.
 *
 * The journal and the mood diary used platform emoji for moods — a yellow
 * smiley at 24 px beside gold line art, drawn by whatever font the phone
 * shipped. These are the same ten feelings as weather and ground: sun,
 * cloud, wave, leaf, moon, spark, drop, mountain, wind, heart, flame, gift. One stroke
 * weight (1.5 on a 24-box), round caps, `currentColor`, so a glyph takes
 * the tint of the tile it sits in and reads as part of the set the zodiac
 * and planet glyphs belong to.
 *
 * Both diaries share the set: `JOURNAL_MOOD_GLYPHS` maps the journal's ten
 * mood values, and `data/moodDiary.ts` carries a `glyph` per category.
 */
export type MoodGlyphId =
  | 'sun'
  | 'cloud'
  | 'wave'
  | 'leaf'
  | 'moon'
  | 'spark'
  | 'drop'
  | 'mountain'
  | 'wind'
  | 'heart'
  | 'flame'
  | 'gift';

export const MOOD_GLYPH_IDS: readonly MoodGlyphId[] = [
  'sun',
  'cloud',
  'wave',
  'leaf',
  'moon',
  'spark',
  'drop',
  'mountain',
  'wind',
  'heart',
  'flame',
  'gift',
];

/**
 * Journal mood value → glyph. The journal's mood list lives in JournalPage.
 *
 * One glyph, one meaning across both diaries: the mood diary draws Steady as
 * the mountain and Curious as the leaf, so the journal's Frustrated (was the
 * mountain) and Grateful (was the leaf) have their own glyphs — a user who
 * learned mountain = Steady was recording "Frustrated" (P7 #82). Shared
 * glyphs (sun, wave, wind, spark, moon, drop) mean the same family of
 * feeling in both.
 */
export const JOURNAL_MOOD_GLYPHS: Record<string, MoodGlyphId> = {
  happy: 'sun',
  calm: 'wave',
  anxious: 'wind',
  grateful: 'gift',
  inspired: 'spark',
  tired: 'moon',
  sad: 'drop',
  frustrated: 'flame',
  loved: 'heart',
  thoughtful: 'cloud',
};

const FORMS: Record<MoodGlyphId, JSX.Element> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </>
  ),
  cloud: <path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.2 9.6 4.5 4.5 0 0 0 7 18.5Z" />,
  wave: (
    <>
      <path d="M2.5 10c2.2 0 2.2-2.5 4.75-2.5S9.4 10 12 10s2.2-2.5 4.75-2.5S19.3 10 21.5 10" />
      <path d="M2.5 16c2.2 0 2.2-2.5 4.75-2.5S9.4 16 12 16s2.2-2.5 4.75-2.5S19.3 16 21.5 16" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20c0-9 5.5-15.5 16-16-.5 10.5-7 16-16 16Z" />
      <path d="M4 20c3.5-5 7-8.5 11-11.5" />
    </>
  ),
  moon: <path d="M15.5 3.5a8.5 8.5 0 1 0 5 15.3A7 7 0 0 1 15.5 3.5Z" />,
  spark: <path d="M12 3c.6 4.6 3.4 7.4 9 9-5.6 1.6-8.4 4.4-9 9-.6-4.6-3.4-7.4-9-9 5.6-1.6 8.4-4.4 9-9Z" />,
  drop: <path d="M12 3.5c3.6 4.3 6 7.6 6 10.6a6 6 0 0 1-12 0c0-3 2.4-6.3 6-10.6Z" />,
  mountain: <path d="M2.5 19 9 7l3.5 6.2L15 10l6.5 9Z" />,
  wind: (
    <>
      <path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12.5h15.5a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 17h8a2 2 0 1 1-2 2" />
    </>
  ),
  heart: <path d="M12 20.5s-7.5-4.6-7.5-10A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.9c0 5.4-7.5 10-7.5 10Z" />,
  flame: <path d="M12 21a6 6 0 0 0 6-6c0-4.6-3.6-6.6-4.6-11.5-2.6 2.3-3.6 4.8-3.6 7.2-1-.6-1.8-1.6-2.2-2.9C6.6 9.6 6 11.6 6 15a6 6 0 0 0 6 6Z" />,
  gift: (
    <>
      <path d="M4.5 11.5h15v8.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" />
      <path d="M3.5 8h17v3.5h-17Z" />
      <path d="M12 8v13" />
      <path d="M12 8c-1.2-2.8-4.8-3.6-5.3-1.6C6.3 8 9.5 8 12 8c2.5 0 5.7 0 5.3-1.6-.5-2-4.1-1.2-5.3 1.6" />
    </>
  ),
};

export interface MoodGlyphProps {
  glyph: MoodGlyphId;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Names the glyph for assistive tech; without it the glyph is decorative. */
  'aria-label'?: string;
}

export const MoodGlyph = memo(function MoodGlyph({
  glyph,
  size = 20,
  strokeWidth = 1.5,
  className,
  'aria-label': ariaLabel,
}: MoodGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...(ariaLabel ? { role: 'img', 'aria-label': ariaLabel } : { 'aria-hidden': true, focusable: false })}
    >
      {FORMS[glyph]}
    </svg>
  );
});
