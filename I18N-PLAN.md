# Multi-Language (i18n) Rollout — Detailed Plan

Goal: Ship complete language packs for **English (en)**, **Japanese (ja)**, **Korean (ko)**, and **Chinese Simplified (zh)** across the **web app** and **Android app**, with a language selector at account setup. No half-translated screens — every language ships when it is 100% covered for the surface area of that release.

## 1. Success criteria (acceptance gates)

A language is "shippable" when **all of the following are true**:

- [ ] Every UI string in the 17 pages + 53 components renders in the language
- [ ] Every tarot card (78) has translated name, keywords, upright/reversed meanings, description, love/career/reflection fields
- [ ] Every zodiac sign (12) has translated horoscope, compatibility text, element/modality labels
- [ ] Every quiz (MBTI, Big Five, Enneagram, Attachment, Love Language) has translated questions, answers, and results
- [ ] All validation and error messages render in the language
- [ ] Welcome email template renders in the language
- [ ] Server-generated premium readings (Gemini) are produced in the language
- [ ] All navigation, buttons, form labels, toasts are translated
- [ ] Date/time formatting uses the locale's conventions
- [ ] Language switcher works without data loss
- [ ] App doesn't crash if a key is missing (falls back to English gracefully)

## 2. Content inventory & volume

### Hard-coded content in code
| Source | Lines | KB | ~Words |
|---|---|---|---|
| `src/data/tarotDeck.ts` | 892 | 285 | ~48,000 |
| `src/data/planetInSign.ts` | 525 | 59 | ~10,000 |
| `src/data/horoscopes.ts` | 516 | 25 | ~4,200 |
| `src/data/zodiacContent.ts` | 479 | 45 | ~7,500 |
| `src/data/enneagramQuiz.ts` | 383 | 38 | ~6,400 |
| `src/data/attachmentQuiz.ts` | 399 | 30 | ~5,000 |
| `src/data/journalTemplates.ts` | 376 | 14 | ~2,300 |
| `src/data/bigFiveQuiz.ts` | 351 | 35 | ~5,800 |
| `src/data/mbtiCognitiveFunctions.ts` | 304 | 22 | ~3,700 |
| `src/data/aspects.ts` | 213 | 17 | ~2,800 |
| `src/data/planetInHouse.ts` | 194 | 16 | ~2,700 |
| `src/data/tarotMeanings.ts` | 184 | 11 | ~1,800 |
| **Data total** | **4,816** | **597** | **~100,000** |

Plus UI strings extracted from the **70 page + component files** — estimated **~800-1200 UI strings, ~6,000 words**.

**Per-language translation volume ≈ 106,000 words.**
**4 languages × 3 non-English = ~318,000 words of translation.**

### Database content
- `blog_posts.content` (currently single language) — ~6 posts live, growing
- `profiles` — no locale field yet (we add one)

### External content (out of scope for v1)
- Play Store listing description (translate separately in Play Console)
- Tarot card art itself (already locale-agnostic — pure imagery)
- Blog post images

## 3. Technical architecture

### Library: `react-i18next` + `i18next` + `i18next-browser-languagedetector` + `i18next-http-backend`

**Why:** de-facto standard for React, supports:
- Namespaced JSON files (split load per feature)
- HTTP backend (lazy load language packs — reduces initial bundle)
- Interpolation with variables
- Pluralization per-language
- Fallback chain (zh → en, ko → en, etc.)
- Suspense integration

**Bundle cost:** ~30 KB gzipped for the library + HTTP backend. Per-language JSON payload loaded on demand.

### File structure

```
src/i18n/
  config.ts                    # i18next initialization
  useT.ts                      # typed wrapper hook
  locales/
    en/
      common.json              # navigation, buttons, toasts, errors
      onboarding.json          # signup flow
      landing.json             # marketing landing page
      tarot.json               # card names + keywords (short strings)
      meanings.json            # card prose (big — lazy-loaded)
      horoscope.json           # zodiac + astrology
      quizzes.json             # quiz questions + results
      journal.json             # prompts + templates
      premium.json             # paywall, subscription UI
      admin.json               # admin-only strings (skip for ja/ko/zh? or include)
    ja/ ... same structure
    ko/ ... same structure
    zh/ ... same structure
```

### Loading strategy
- `common.json`, `landing.json`, `onboarding.json` — **bundled** in the initial language pack (needed before any interaction)
- Everything else — **lazy-loaded** when the relevant feature is opened
- Per-language pack size target: <150 KB gzipped total for all JSON

### Runtime resolution order
1. URL param `?lang=ja` (override for testing)
2. `profiles.locale` (authenticated user preference)
3. `localStorage` cached value (for anonymous sessions)
4. `navigator.language` (browser default)
5. `'en'` (fallback)

### Key helper — the `useT()` hook

```ts
import { useTranslation } from 'react-i18next';
export function useT(namespace?: string) {
  return useTranslation(namespace);
}
// Usage:
const { t } = useT('onboarding');
<h1>{t('welcome.title')}</h1>
```

### Content-data migration pattern

Instead of hard-coded strings in `tarotDeck.ts`, data files become **schema + key registry**, and prose lives in JSON:

**Before** (`tarotDeck.ts`):
```ts
{
  id: 0,
  name: 'The Fool',
  keywords: ['New beginnings', 'Innocence', ...],
  meaningUpright: 'New beginnings, innocence, ...',
  ...
}
```

**After** (`tarotDeck.ts`):
```ts
{
  id: 0,
  slug: 'the-fool',
  arcana: 'major',
  imageUrl: '/bundled-cards/full/major-arcana/the-fool.webp',
  // text fields moved to i18n
}
```

**After** (`locales/en/meanings.json`):
```json
{
  "the-fool": {
    "name": "The Fool",
    "keywords": ["New beginnings", "Innocence", ...],
    "upright": "New beginnings, innocence, ...",
    "reversed": "...",
    "description": "...",
    "love": "...",
    "career": "...",
    "reflection": "..."
  }
}
```

Components look up card text via `t('meanings:the-fool.upright')`.

## 4. Data model changes

### Supabase migration — `profiles.locale`

```sql
-- New migration: 20260419000000_add_profile_locale.sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale TEXT
  DEFAULT 'en'
  CHECK (locale IN ('en', 'ja', 'ko', 'zh'));

CREATE INDEX IF NOT EXISTS profiles_locale_idx ON public.profiles (locale);
```

### Supabase migration — `blog_posts` translations

Option chosen: **single `content` field per locale via a linking table** (normalized, scalable)

```sql
-- New migration: 20260419000001_add_blog_translations.sql
CREATE TABLE IF NOT EXISTS public.blog_post_translations (
  blog_post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'ja', 'ko', 'zh')),
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (blog_post_id, locale)
);

-- Backfill existing posts into en translations
INSERT INTO blog_post_translations (blog_post_id, locale, title, excerpt, content)
SELECT id, 'en', title, excerpt, content FROM blog_posts;

-- RLS: same as blog_posts
ALTER TABLE blog_post_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published blog translations"
  ON blog_post_translations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM blog_posts
    WHERE id = blog_post_id AND published = true
  ));
```

Old `title`, `excerpt`, `content` columns on `blog_posts` remain (as `en` fallback) but the new reads go through the translations table.

### TypeScript types

Add `locale: 'en' | 'ja' | 'ko' | 'zh'` to `UserProfile` in [src/types/index.ts](TAROT/src/types/index.ts), and to `PROFILE_WRITABLE_FIELDS` allowlist in [src/context/AuthContext.tsx](TAROT/src/context/AuthContext.tsx).

## 5. Translation pipeline (the hard part)

**Honest assessment:** 318,000 words of high-quality spiritual/astrology translation is the single biggest cost/risk. Three options:

### Option A — Machine translation, no review (~$50 total)
- Google Cloud Translation / DeepL API for all strings
- Quality: poor for spiritual/poetic content. JA/KO tarot terminology has established conventions that MT often misses.
- Timeline: 1 day to run all scripts
- **Recommended as a fallback only** — we'd ship with "machine-translated; help us improve" disclaimer.

### Option B — LLM translation with glossary + stylistic review (~$200-500 in Claude/Gemini calls, recommended)
- Build a **domain glossary** first:
  - Example: "The Fool" → 愚者 (JA) / 바보 (KO) / 愚者 (ZH) — established tarot names
  - Astrology terms: zodiac signs, planets, houses, aspects — all have canonical translations
- Use Claude/Gemini with the glossary as context: translate in batches, asking for tone match (poetic, encouraging, non-literal)
- **Human spot-check** on ~100 critical strings (landing page, onboarding, major arcana keywords)
- Timeline: 2-3 days
- **Recommended approach.**

### Option C — Professional human translation (~$15,000-30,000)
- Professional spiritual/metaphysical translators via agencies
- 3-4 weeks
- Highest quality but out of budget for a pre-revenue stage.

### Chosen approach: **Option B with incremental human review**

We build a **translation script** that:
1. Reads a JSON source file
2. Sends it to Gemini in batches with a glossary prompt
3. Writes the output to the target locale's JSON
4. Flags strings that are very long (>500 chars) for optional human review

The same script can re-translate specific keys if the glossary is updated later.

### Glossary (seed)

Stored at `src/i18n/glossary.json`. Examples:

```json
{
  "Arcana": { "ja": "アルカナ", "ko": "아르카나", "zh": "奥秘" },
  "The Fool": { "ja": "愚者", "ko": "바보", "zh": "愚者" },
  "Major Arcana": { "ja": "大アルカナ", "ko": "메이저 아르카나", "zh": "大奥秘" },
  "Tarot": { "ja": "タロット", "ko": "타로", "zh": "塔罗" },
  "Horoscope": { "ja": "星占い", "ko": "별자리 운세", "zh": "星座运势" },
  "Aries": { "ja": "牡羊座", "ko": "양자리", "zh": "白羊座" },
  ...
}
```

Glossary is **injected into every translation call** as a system instruction so the LLM uses consistent terminology across all files.

## 6. Phased execution plan

Each phase is a separate feature branch, reviewed, and merged to `main` only when the language shipped in that phase passes all acceptance criteria.

### Phase 0 — Infrastructure (branch: `feature/i18n-foundation`)
**No user-visible change.** Just wiring.
1. Install `i18next react-i18next i18next-browser-languagedetector i18next-http-backend`
2. Create `src/i18n/config.ts` with init and language detection
3. Create `src/i18n/locales/en/common.json` with ~10 sample keys to prove the pipeline works
4. Wrap `<App>` with `<Suspense fallback={...}>` for lazy language packs
5. Add DB migration for `profiles.locale`
6. Add `locale` to TypeScript `UserProfile` type and `PROFILE_WRITABLE_FIELDS`
7. Ship: infrastructure merged, nothing visually changes

**Deliverable:** `useT()` hook callable anywhere, en returns strings, other languages return keys. Merged to main even though only en is present.

### Phase 1 — UI strings (branch: `feature/i18n-ui-strings`)
1. Audit every `.tsx` file for hardcoded user-facing strings
2. Extract to `en/common.json`, `en/onboarding.json`, `en/landing.json`, `en/premium.json`, `en/admin.json`
3. Replace JSX strings with `t('key')` calls
4. Build en-complete UI
5. Run translation script for ja, ko, zh on just the UI namespaces
6. Human review of onboarding + landing (highest-stakes UI)
7. Add language switcher component (default: browser language; persists to localStorage anonymously, to `profiles.locale` when authenticated)
8. Add language picker as **Step 1 of OnboardingPage** (before anything else)
9. Ship: users can switch UI language — core app works in 4 languages, content pages still en-only

**Acceptance gate per language:** click through every page and every state; no un-translated string visible; snapshot tests catch regressions.

### Phase 2 — Tarot deck content (branch: `feature/i18n-tarot-content`)
1. Refactor `src/data/tarotDeck.ts` into schema-only (remove prose, keep ids/slugs/images/flags)
2. Generate `en/tarot.json` (short strings: names, keywords) and `en/meanings.json` (long prose: upright/reversed/love/career/reflection/description)
3. Translate with glossary-aware LLM pipeline to ja, ko, zh
4. Update `TarotCardMeaningPage`, `TarotMeaningsPage`, reading UI, journal entry cards, etc. to use `t()` from `tarot`/`meanings` namespaces
5. Human spot-check of 22 Major Arcana (high visibility; Minor Arcana can be reviewed async)
6. Ship: all 78 cards render in 4 languages on the web; Android picks this up automatically via Capacitor sync

### Phase 3 — Astrology content (branch: `feature/i18n-astrology`)
1. Refactor `horoscopes.ts`, `zodiacContent.ts`, `planetInSign.ts`, `planetInHouse.ts`, `aspects.ts` to schema + `horoscope.json`
2. Translate
3. Update HoroscopePage, birth chart UI, compatibility components
4. Ship: /horoscope + birth chart flow works in 4 languages

### Phase 4 — Quizzes + journal (branch: `feature/i18n-quizzes-journal`)
1. Refactor 5 quiz data files, `mbtiCognitiveFunctions.ts`, `journalTemplates.ts`
2. Translate
3. Update QuizzesPage flow, journal entry UI
4. Ship: quizzes + journal prompts in 4 languages

### Phase 5 — Server-generated content (branch: `feature/i18n-server-content`)
1. Update `generate-reading` edge function:
   - Accept `locale` param from client
   - Inject into Gemini prompt: "Respond in {locale} using poetic, encouraging language..."
2. Update `send-welcome-email` edge function:
   - 4 HTML email templates (one per language), selected by `profiles.locale`
3. Ship: premium readings + welcome email honor user locale

### Phase 6 — Blog i18n (branch: `feature/i18n-blog`)
1. Apply `blog_post_translations` migration
2. Update `useBlogPost` / `useBlogPosts` hooks to query translations table with current locale, fallback to en if missing
3. Update `blog-webhook` edge function to accept `locale` field on incoming posts (defaults to en); writes to `blog_post_translations`
4. Translate existing 6 posts to ja, ko, zh via LLM script
5. Ship: blog reads in user's locale; untranslated posts show en fallback with a small "Not yet translated" notice

### Phase 7 — SEO & hreflang (branch: `feature/i18n-seo`)
1. Emit `<link rel="alternate" hreflang="ja" href="https://tarotlife.app/?lang=ja" />` tags per page
2. Update `generate-sitemap.mjs` to emit one URL per language per page (with `?lang=ja` etc)
3. Update JSON-LD structured data to use `inLanguage` field
4. Ship: Google can crawl and rank per-language content

### Phase 8 — Android app sync (branch: `feature/i18n-android`)
1. Run `npx cap sync android` after web release is in good shape
2. Verify all 4 languages work inside the Capacitor webview
3. Verify Android system language doesn't fight our in-app language (we respect user's saved `locale` over OS)
4. Update Play Store listing title/description in 4 languages (manual, in Play Console)
5. Ship: new APK to Play Store internal track, then production after QA

### Phase 9 — Monitoring + polish
1. Add analytics: `language_changed` gtag event; track `locale` as user property
2. Missing-key logger: sends to Sentry when an app tries to translate a key that doesn't exist
3. Dashboard: count missing-key errors per locale to prioritize fixes

## 7. Onboarding language-selector spec

Added as the **very first step** of `OnboardingPage` (before the current "welcome" step 0).

```
┌──────────────────────────────────────┐
│                                      │
│         ✦ Welcome to Arcana          │
│                                      │
│       Choose your language           │
│                                      │
│   [ 🇺🇸 English               ]      │
│   [ 🇯🇵 日本語                 ]      │
│   [ 🇰🇷 한국어                 ]      │
│   [ 🇨🇳 简体中文                ]      │
│                                      │
│        (default: browser lang)       │
│                                      │
└──────────────────────────────────────┘
```

On selection:
- Save to `localStorage.arcana_locale`
- Persisted to `profiles.locale` at profile creation
- i18next reloads current page in the selected language immediately
- User sees the next onboarding step already in their language

For **existing users** without a `locale` set:
- On next login, show a one-time modal: "Arcana now speaks your language. Choose yours."
- Once dismissed, set `locale` based on browser language + modal choice

## 8. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| LLM translation quality is inconsistent | Bad UX, spiritual nuance lost | Glossary + human review of highest-stakes strings (landing, Major Arcana) |
| Bundle size grows | Slower first load | Lazy-load JSON per namespace; target <150 KB gz per language |
| Gemini generates unreliable reading in ja/ko/zh | Premium feature broken in 3 languages | A/B test 10 readings per language; refine prompt before enabling |
| Supabase edge function cold start in locale-aware code | Rare latency bumps | Warm hit on first user ping in each region |
| Translation gets out of date when copy changes | Mixed-language UI | "Missing key" logging + CI check that en has superset of keys |
| Right-to-left (Arabic, Hebrew) not supported | Future-work issue, not in scope | Doc decision — add only when a language needing RTL is planned |
| Play Store rejects app for missing localized descriptions | Android release blocker | Prepare all 4 Play listings before submitting update |
| Dynamic `Intl.DateTimeFormat` differs from ja/ko/zh norms | Confusing dates | Explicit `new Intl.DateTimeFormat(locale).format()` everywhere |
| Tarot card image captions embed en text ("THE FOOL") | Can't easily localize | Accept — card art is a visual artifact. Caption text can be rendered in React as overlay if needed, but not v1. |

## 9. Testing plan

### Automated
- **Key-parity test:** CI job compares en's keyset to ja/ko/zh. Fails if any key is missing.
- **Type generation:** optional `i18next-scanner` to generate typed translation keys so IDE autocomplete works.
- **Snapshot tests per locale:** Playwright visits each route with `?lang=ja`/`ko`/`zh` and checks no en text leaks through.

### Manual
- Click-through QA by a native speaker per language (onboarding → reading → journal → quiz → paywall → settings → language switch)
- Spot-check: send one premium reading per user locale → native speaker rates 1-5 for tone
- Spot-check: receive welcome email in each language → visual QA

## 10. Rollout strategy

**Per-language rollout gate** — each language ships when 100% of its scope is ready. We do NOT release "ja is 40% done" to users.

Order (recommended):
1. **en** (baseline, always shipped) — always live
2. **ja** first (highest-confidence translation; established tarot terminology)
3. **zh** next (largest potential market)
4. **ko** last (smallest but still important)

Between phases, we run limited-audience tests by appending `?lang=ja` to invite URLs for a handful of native-speaker testers before flipping the locale option on for everyone.

## 11. Android-specific notes

- Capacitor wraps the web bundle — the same i18n system works automatically
- AndroidManifest needs `android:supportsRtl="false"` (we're not supporting RTL in v1)
- System language CAN differ from app language — we show the user their chosen `locale`, not the OS language. Reason: users often use English OS but want Japanese content.
- In-app links to external browser (privacy policy, terms) — make sure those pages exist in 4 languages or bounce to en

## 12. Estimated effort

Assuming one person working full-time alongside normal feature work:

| Phase | Developer time | Translation time | Calendar time |
|---|---|---|---|
| 0 — Infrastructure | 0.5 day | — | 0.5 day |
| 1 — UI strings | 2-3 days | 0.5 day (LLM + review of UI) | 3-4 days |
| 2 — Tarot content | 1 day code | 1 day LLM + 0.5 day review | 2-3 days |
| 3 — Astrology | 1 day code | 1 day LLM + 0.5 day review | 2-3 days |
| 4 — Quizzes+Journal | 1 day code | 0.5 day LLM + review | 1-2 days |
| 5 — Server content | 0.5 day | 0.5 day | 1 day |
| 6 — Blog | 0.5 day | 0.5 day | 1 day |
| 7 — SEO | 0.5 day | — | 0.5 day |
| 8 — Android | 0.5 day | 0.5 day (store listing) | 1 day |
| 9 — Monitoring | 0.5 day | — | 0.5 day |
| **Total** | **~8 dev-days** | **~5 translation-days** | **~2-3 calendar weeks** |

## 13. Out of scope for v1

- RTL languages (Arabic, Hebrew)
- Localized currency display (we show USD; Stripe handles conversion)
- Localized tarot card artwork
- User-generated content translation (journals stay in whatever language the user wrote them)
- Offline translation (app needs network to load new namespaces; en is bundled so anonymous offline browsing of landing still works)
- Region-specific pricing (separate future project)

## 14. Branch & merge discipline

Per user's global rule: **every change ships on a feature branch, tested, merged to main only after pass.** Order of branch lifecycle:

1. `feature/i18n-foundation` → test → merge to main
2. `feature/i18n-ui-strings` → test → merge to main (EN strings extracted, JA/KO/ZH UI works)
3. `feature/i18n-tarot-content` → test → merge to main
4. `feature/i18n-astrology` → test → merge to main
5. `feature/i18n-quizzes-journal` → test → merge to main
6. `feature/i18n-server-content` → test → merge to main
7. `feature/i18n-blog` → test → merge to main
8. `feature/i18n-seo` → test → merge to main
9. `feature/i18n-android` → sync Android → Play internal track → production
10. `feature/i18n-monitoring` → test → merge to main

Total: **10 separate PRs**, each independently reviewable and reversible.

## 15. Immediate next steps (once plan is approved)

1. Create branch `feature/i18n-foundation`
2. Install i18next deps
3. Scaffold `src/i18n/` directory
4. Add `profiles.locale` migration
5. Prove the pipeline with 5 sample keys on the Landing page
6. Report back with a live demo URL showing the EN baseline + one ja string working via `?lang=ja`

From there we move phase by phase.

---

**Review this plan before we start Phase 0. Questions to answer:**

1. Do you want all 4 languages in v1, or stagger (ja first, then ko/zh)?
2. Budget: approve ~$200-500 in Gemini translation calls for the automated pass?
3. Do you have native speakers available for the spot-check review, or do we ship LLM-translated and iterate on user feedback?
4. Is Chinese Simplified (zh) enough, or do you need Traditional (zh-TW) too? (Traditional doubles the pack for zh.)
5. Should the blog webhook translate incoming posts automatically, or require the publisher to supply translations?
6. Any other languages planned in the next 6 months? (Affects whether we design for 4 or N languages.)
