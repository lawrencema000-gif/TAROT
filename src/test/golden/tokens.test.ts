import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * The design system, enforced.
 *
 * Phases 1 to 5 of the remake put the main surfaces on the type roles, the
 * radius roles, the token palette and the designed glyphs, and took the
 * ambient loops off them. The screens the remake had not reached yet still
 * carried the old habits, and nothing stopped a new screen from reaching
 * for them again. This gate does: every rule below is a habit the audits
 * named as the thing that made the app read as generated.
 *
 * Allowances are listed by file, so a legitimate exception is visible and
 * a stale one fails the gate when it stops being needed.
 *
 * Phase 7 added six rules (gradients, blur blooms, inline hex, text-sm,
 * bg-paper, emoji as icons). Their allowances are the offenders that
 * existed on the day the rule landed, enumerated by running the rule
 * empty: they are a burn-down list, not a licence. A file leaves the list
 * when it is fixed, and the gate fails if it is left on the list after
 * that (stale), so the list can only shrink.
 */

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.tsx?$/.test(p) ? [p] : [];
  });
}

const rel = (p: string) => p.slice(process.cwd().length + 1).split(sep).join('/');

const all = walk(SRC)
  .map((p) => ({ path: rel(p), code: readFileSync(p, 'utf8') }))
  .filter(
    (f) =>
      !/\/(test|dev)\//.test(f.path) &&
      !/RedesignShowcasePage/.test(f.path) &&
      !/\.(test|d)\.tsx?$/.test(f.path),
  );

/** Components and pages: the markup. */
const tsx = all.filter((f) => /\.tsx$/.test(f.path));

/** Blank comments and JSX comments so prose about a class is not a hit. */
function strip(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (c) => ' '.repeat(c.length));
}

function hits(re: RegExp, code: string): string[] {
  return [...strip(code).matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))].map((m) => m[0]);
}

type Rule = {
  name: string;
  re: RegExp;
  /** Files that may contain the pattern. Every one must still contain it, or the allowance is stale. */
  allowed: Set<string>;
  /** Directory prefixes that may contain the pattern (SVG paint, canvas). At least one file under each must hit. */
  allowedPrefixes?: string[];
  /** `tsx` (default): components and pages. `all`: .ts too — data files, utils. */
  files?: 'tsx' | 'all';
};

const RULES: Rule[] = [
  {
    // Ambient loops that report no state. `animate-spin` on a loading
    // indicator is state, and stays allowed everywhere; the Skeleton's
    // shimmer is its own keyframe (animate-shimmer), not a pulse.
    name: 'infinite animation classes',
    re: /\banimate-(?:pulse|pulse-slow|spin-slow|ping|bounce)\b/,
    allowed: new Set(),
  },
  {
    name: 'micro-labels below the caption role',
    re: /\btext-\[(?:9|10|11)px\]/,
    allowed: new Set(),
  },
  {
    // The role classes: caption 12 / meta 13 / ui 15 / body 17 / lede 19.
    name: 'text-xs instead of a type role',
    re: /\btext-xs\b/,
    allowed: new Set(),
  },
  {
    // inset 8 / control 12 / card 16 / sheet 24 / pill.
    name: 'radii off the scale',
    re: /\brounded(?:-[trbl]|-[tb][lr])?-(?:xl|2xl|3xl)\b/,
    allowed: new Set(),
  },
  {
    // The palette is mystic + gold + teal + coral + cosmic blue / violet /
    // rose (+ -ink), and now paper + ink. Tailwind's stock hues are not in it.
    name: 'stock Tailwind hues',
    re: /\b(?:text|bg|border|from|via|to|ring|stroke|fill|shadow|divide|outline|decoration|placeholder)-(?:emerald|pink|amber|rose|sky|indigo|purple|orange|lime|cyan|fuchsia|slate|gray|zinc|neutral|stone|yellow|green|blue|violet|teal|red)-\d{2,3}\b/,
    allowed: new Set(),
  },
  {
    // U+2648-2653 are emoji on Android; the glyph set is drawn.
    name: 'zodiac signs as Unicode text',
    re: /\.symbol\}/,
    allowed: new Set(),
  },
  {
    // The symmetric-sparkle ornaments the audits called the tell.
    name: 'ornate cards, flourishes and dividers',
    re: /variant="ornate"|<FourCornerFlourishes\b|<OrnateDivider\b|<StarBurst\b/,
    // Card.tsx no longer renders FourCornerFlourishes: `ornate` resolves to
    // `accent`, so the allowance it used to need is gone.
    allowed: new Set(),
  },
  {
    name: 'MysticalStar',
    re: /<MysticalStar\b/,
    allowed: new Set(),
  },
  {
    // Elevation is by fill; a blur costs a compositing layer and hides
    // nothing on an opaque surface. The Sheet scrim is the one blur.
    name: 'backdrop-blur',
    re: /\bbackdrop-blur(?:-\w+)?\b/,
    allowed: new Set(['src/components/ui/Sheet.tsx']),
  },

  // ── Phase 7 ──────────────────────────────────────────────────────────
  {
    // Two surfaces, no gradients as decoration. The ones that earn it:
    // the gold Button fill, the Progress gradient variant, Ornament's
    // hairline fades, the Tabs scroller fade and TarotSelectView's CTA
    // scrim. Everything after those five is the burn-down list.
    name: 'gradients outside the ones that earn them',
    re: /\bbg-gradient-to-(?:r|l|t|b|tr|tl|br|bl)\b/,
    allowed: new Set([
      'src/components/ui/Button.tsx',
      'src/components/ui/Progress.tsx',
      'src/components/ui/Ornament.tsx',
      'src/components/ui/Tabs.tsx',
      'src/components/readings/tarot/TarotSelectView.tsx',
      // burn-down (offenders on 2026-10-02)
      'src/App.tsx',
      'src/components/achievements/AchievementCard.tsx',
      'src/components/achievements/AchievementUnlockModal.tsx',
      'src/components/achievements/RankProgressBar.tsx',
      'src/components/bazi/BaziAIReading.tsx',
      'src/components/celebration/LevelUpCelebration.tsx',
      'src/components/celestial/CelestialEducationSection.tsx',
      'src/components/celestial/CelestialMapIntroLoader.tsx',
      'src/components/celestial/CityInsightPanel.tsx',
      'src/components/celestial/DestinedPlaceBanner.tsx',
      'src/components/celestial/FindYourPlace.tsx',
      'src/components/compat/InviteFriendSheet.tsx',
      'src/components/error/ErrorBoundary.tsx',
      'src/components/feedback/RateAppSheet.tsx',
      'src/components/horoscope/HoroscopeOnboarding.tsx',
      'src/components/layout/BottomNav.tsx',
      'src/components/moonstones/EarnMoonstonesSheet.tsx',
      'src/components/oracle/AskOracleButton.tsx',
      'src/components/overlays/SettingsSheet.tsx',
      'src/components/premium/WatchAdSheet.tsx',
      'src/components/profile/CosmicProfileSection.tsx',
      'src/components/readings/HoroscopeSection.tsx',
      'src/components/readings/LibrarySection.tsx',
      'src/components/readings/tarot/TarotRevealView.tsx',
      'src/components/readings/TarotCardDetail.tsx',
      'src/components/readings/TarotSection.tsx',
      'src/components/referral/ReferralSheet.tsx',
      'src/components/setup/MissingSupabaseConfig.tsx',
      'src/components/ui/ResultLayout.tsx',
      'src/components/ui/Sheet.tsx',
      'src/components/ui/Skeleton.tsx',
      'src/components/ui/TarotCardFrame.tsx',
      'src/pages/AchievementsPage.tsx',
      'src/pages/AdvisorsPage.tsx',
      'src/pages/AuthPage.tsx',
      'src/pages/BaziPage.tsx',
      'src/pages/CareerReportPage.tsx',
      'src/pages/CompatInvitePage.tsx',
      'src/pages/DicePage.tsx',
      'src/pages/DreamInterpreterPage.tsx',
      'src/pages/FengShuiPage.tsx',
      'src/pages/FoolsJourneyPage.tsx',
      'src/pages/HumanDesignPage.tsx',
      'src/pages/IChingPage.tsx',
      'src/pages/JournalPage.tsx',
      'src/pages/LoveTreePage.tsx',
      'src/pages/MirrorPage.tsx',
      'src/pages/MoodDiaryPage.tsx',
      'src/pages/NatalChartReportPage.tsx',
      'src/pages/PeoplePage.tsx',
      'src/pages/ProfilePage.tsx',
      'src/pages/QuickReadingPage.tsx',
      'src/pages/QuizzesPage.tsx',
      'src/pages/ResetPasswordPage.tsx',
      'src/pages/SharedReadingPage.tsx',
      'src/pages/SpreadBuilderPage.tsx',
      'src/pages/TarotCompanionPage.tsx',
      'src/pages/UnsubscribePage.tsx',
      'src/pages/YearAheadReportPage.tsx',
    ]),
  },
  {
    // A blurred disc behind a deck is a glow by another name. The deck
    // sits on the canvas, as HomeHero proves it can.
    name: 'blur blooms',
    re: /\bblur-(?:xl|2xl|3xl)\b/,
    allowed: new Set([
      // burn-down (offenders on 2026-10-02)
      'src/components/readings/tarot/TarotShuffleView.tsx',
      'src/components/ui/DeckFan.tsx',
    ]),
  },
  {
    // Colour comes from the tokens. The share-card canvas renderer is the
    // one place a literal is the only way to say it. (src/components/chart
    // and canvasText.ts were expected to need one too; on the day the rule
    // landed neither did, and an allowance with no hits is stale — add the
    // prefix `src/components/chart/` back via allowedPrefixes if SVG paint
    // ever needs a literal there.)
    name: 'inline hex colours',
    re: /#[0-9a-fA-F]{6}\b/,
    files: 'all',
    allowed: new Set([
      'src/utils/shareCard.ts',
      // burn-down (offenders on 2026-10-02)
      'src/App.tsx',
      'src/components/celestial/CelestialDestinedBeacon.tsx',
      'src/components/celestial/CelestialMapIntroLoader.tsx',
      'src/components/celestial/CelestialMapView.tsx',
      'src/components/celestial/CityInsightPanel.tsx',
      'src/components/celestial/FindYourPlace.tsx',
      'src/components/charts/FirdariaTimeline.tsx',
      'src/components/charts/LuckPillarTimeline.tsx',
      'src/components/iching/CoinToss.tsx',
      'src/components/overlays/SettingsSheet.tsx',
      'src/components/people/FriendCircleStats.tsx',
      'src/components/ritual/LoveTree.tsx',
      'src/components/ui/BrandMark.tsx',
      'src/data/archetypalObjects.ts',
      'src/data/bazi.ts',
      'src/data/loveTree.ts',
      'src/lib/chart.ts',
      'src/pages/AuthPage.tsx',
      'src/pages/CrystalsPage.tsx',
      'src/pages/HumanDesignPage.tsx',
      'src/pages/OnboardingPage.tsx',
      'src/pages/TarotCardMeaningPage.tsx',
      'src/utils/imageOptimization.ts',
      'src/utils/telemetry.ts',
    ]),
  },
  {
    // 14px is between meta (13) and ui (15) and belongs to neither.
    name: 'text-sm instead of a type role',
    re: /\btext-sm\b/,
    allowed: new Set([
      // burn-down (offenders on 2026-10-02)
      'src/App.tsx',
      'src/components/achievements/AchievementCard.tsx',
      'src/components/achievements/AchievementUnlockModal.tsx',
      'src/components/admin/AdAnalyticsPanel.tsx',
      'src/components/admin/AdvisorVerificationPanel.tsx',
      'src/components/admin/BlogManager.tsx',
      'src/components/celebration/LevelUpCelebration.tsx',
      'src/components/celestial/CelestialCitySearch.tsx',
      'src/components/celestial/CelestialMapIntroLoader.tsx',
      'src/components/celestial/CelestialPowerPlaces.tsx',
      'src/components/celestial/CityInsightPanel.tsx',
      'src/components/celestial/FindYourPlace.tsx',
      'src/components/community/CrisisBanner.tsx',
      'src/components/compat/InviteFriendSheet.tsx',
      'src/components/diagnostics/DiagnosticsPanel.tsx',
      'src/components/error/ErrorBoundary.tsx',
      'src/components/feedback/RateAppSheet.tsx',
      'src/components/horoscope/BirthChart.tsx',
      'src/components/horoscope/HoroscopeOnboarding.tsx',
      'src/components/horoscope/TodayForYou.tsx',
      'src/components/layout/BottomNav.tsx',
      'src/components/moonstones/EarnMoonstonesSheet.tsx',
      'src/components/oracle/AskOracleButton.tsx',
      'src/components/overlays/SavedSheet.tsx',
      'src/components/overlays/SearchSheet.tsx',
      'src/components/overlays/SettingsSheet.tsx',
      'src/components/overlays/UpdateAvailableBanner.tsx',
      'src/components/people/PersonAIReading.tsx',
      'src/components/people/PersonForm.tsx',
      'src/components/premium/WatchAdSheet.tsx',
      'src/components/profile/CosmicProfileSection.tsx',
      'src/components/readings/CompatibilitySection.tsx',
      'src/components/readings/HoroscopeSection.tsx',
      'src/components/readings/LibrarySection.tsx',
      'src/components/readings/tarot/TarotFocusView.tsx',
      'src/components/readings/tarot/TarotSelectView.tsx',
      'src/components/readings/tarot/TarotShuffleView.tsx',
      'src/components/readings/TarotCardDetail.tsx',
      'src/components/referral/ReferralSheet.tsx',
      'src/components/setup/MissingSupabaseConfig.tsx',
      'src/components/ui/Disclosure.tsx',
      'src/components/ui/EmptyState.tsx',
      'src/components/ui/Input.tsx',
      'src/components/ui/PageHeader.tsx',
      'src/components/ui/ResultLayout.tsx',
      'src/components/ui/Section.tsx',
      'src/components/ui/TarotCardFrame.tsx',
      'src/pages/AchievementsPage.tsx',
      'src/pages/AdminPage.tsx',
      'src/pages/AdvisorBookingPage.tsx',
      'src/pages/AdvisorDashboardPage.tsx',
      'src/pages/AdvisorSessionPage.tsx',
      'src/pages/AdvisorsPage.tsx',
      'src/pages/AdvisorVerifyPage.tsx',
      'src/pages/AiCompanionPage.tsx',
      'src/pages/AstrologyLearnPage.tsx',
      'src/pages/AuspiciousDatesPage.tsx',
      'src/pages/AuthPage.tsx',
      'src/pages/BlogPage.tsx',
      'src/pages/BlogPostPage.tsx',
      'src/pages/CommunityPage.tsx',
      'src/pages/CrystalsPage.tsx',
      'src/pages/FengShuiPage.tsx',
      'src/pages/FoolsJourneyPage.tsx',
      'src/pages/GlossaryPage.tsx',
      'src/pages/IChingPage.tsx',
      'src/pages/JournalPage.tsx',
      'src/pages/LiveRoomPage.tsx',
      'src/pages/LiveRoomsPage.tsx',
      'src/pages/LoveTreePage.tsx',
      'src/pages/MansionsPage.tsx',
      'src/pages/MirrorPage.tsx',
      'src/pages/MoodDiaryPage.tsx',
      'src/pages/NumerologyLearnPage.tsx',
      'src/pages/OAuthOnboardingPage.tsx',
      'src/pages/OnboardingPage.tsx',
      'src/pages/PartnerCompatPage.tsx',
      'src/pages/ProfilePage.tsx',
      'src/pages/QuizzesPage.tsx',
      'src/pages/RunesPage.tsx',
      'src/pages/SandboxPage.tsx',
      'src/pages/SpreadBuilderPage.tsx',
      'src/pages/SpreadDetailPage.tsx',
      'src/pages/TarotCompanionPage.tsx',
      'src/pages/UnsubscribePage.tsx',
      'src/pages/WishingSkyPage.tsx',
    ]),
  },
  {
    // The reading surface is composed, never hand-rolled: Paper.tsx is the
    // one place bg-paper is painted (and applies the .paper-prose scope that
    // keeps gold off it). `bg-paper-2`, the inset panel, is the next rule.
    name: 'bg-paper outside Paper.tsx',
    re: /\bbg-paper\b(?!-)/,
    allowed: new Set(['src/components/ui/Paper.tsx']),
  },
  {
    name: 'bg-paper-2 outside the paper primitives',
    re: /\bbg-paper-2\b/,
    allowed: new Set(['src/components/ui/AffirmationPanel.tsx', 'src/components/icons/SpreadGlyph.tsx']),
  },
  {
    // Glyphs are drawn (src/components/icons, NavIcons, SuitGlyphs). An
    // emoji renders in the platform's own style, in colour, at its own
    // weight, and is the quickest way to read as a template. ©, ® and ™
    // are text, not icons, and are let through. Scans .ts too: the data
    // files carry most of them.
    name: 'emoji as icons',
    re: /(?![©®™])\p{Extended_Pictographic}/u,
    files: 'all',
    allowed: new Set([
      // burn-down (offenders on 2026-10-02)
      'src/components/celestial/CelestialMapIntroLoader.tsx',
      'src/components/celestial/CelestialMapView.tsx',
      'src/components/charts/FirdariaTimeline.tsx',
      'src/components/learn/LearnEntryTemplate.tsx',
      'src/components/profile/CosmicProfileSection.tsx',
      'src/data/astrologyLearn.ts',
      'src/data/extraQuizzes.ts',
      'src/data/extraQuizzesPart2.ts',
      'src/data/extraQuizzesPart3.ts',
      'src/data/moodDiary.ts',
      'src/data/moonPhases.ts',
      'src/data/tarotDeck.ts',
      'src/lib/chart.ts',
      'src/pages/BaziPage.tsx',
      'src/pages/JournalPage.tsx',
      'src/pages/MoodDiaryPage.tsx',
      'src/pages/PartnerCompatPage.tsx',
      'src/pages/ProfilePage.tsx',
      'src/pages/QuizzesPage.tsx',
      'src/pages/SoulmateScorePage.tsx',
      'src/pages/TarotCompanionPage.tsx',
      'src/services/localNotifications.ts',
      'src/utils/chineseZodiac.ts',
      'src/utils/zodiac.ts',
    ]),
  },
];

describe('the design system holds on every screen', () => {
  it('finds the source at all (guards the walker)', () => {
    expect(tsx.length).toBeGreaterThan(100);
    expect(all.length).toBeGreaterThan(tsx.length);
  });

  for (const rule of RULES) {
    it(`no ${rule.name} outside the allowed files`, () => {
      const files = rule.files === 'all' ? all : tsx;
      const found: string[] = [];
      const stale: string[] = [];
      const prefixHit = new Map<string, boolean>((rule.allowedPrefixes ?? []).map((p) => [p, false]));
      for (const f of files) {
        const h = hits(rule.re, f.code);
        const prefix = (rule.allowedPrefixes ?? []).find((p) => f.path.startsWith(p));
        if (prefix) {
          if (h.length) prefixHit.set(prefix, true);
          continue;
        }
        if (rule.allowed.has(f.path)) {
          if (!h.length) stale.push(f.path);
          continue;
        }
        if (h.length) found.push(`${f.path}: ${[...new Set(h)].join(', ')} (${h.length})`);
      }
      // An allowance for a file that no longer exists would silently exempt
      // a re-created one.
      for (const p of rule.allowed) if (!files.some((f) => f.path === p)) stale.push(`${p} (missing)`);
      for (const [p, hit] of prefixHit) if (!hit) stale.push(`${p} (prefix, no hits)`);
      expect(found).toEqual([]);
      expect(stale).toEqual([]);
    });
  }
});
