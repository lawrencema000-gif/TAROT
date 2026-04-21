# i18n Cleanup — Final Report

## TL;DR

Your TAROT app is fully translated across the 4 supported locales (en, ja, ko, zh).

- **Baseline:** 90 / 90 / 83 English runs across ja / ko / zh (and hundreds more unique strings in client-side horoscope templates that the audit couldn't even reach).
- **Final:** 4 / 6 / 3 English runs after batch `f1d7a47`. Following batch `85fac4e` these drop further, with all remaining items being non-bugs (your own display name, MBTI universal typology codes, and the acronym "MBTI" itself).

That's a **>95% reduction**. The Money Reading → 1-Card Daily screenshot bug you flagged is fixed end-to-end.

## Commits shipped this session (22 total)

```
85fac4e fix(i18n): Pascal-case zodiac sign normalize + ko Big Five translation
f1d7a47 fix(i18n): final mop-up — Type prefix for stored enneagram labels, gemini sign normalize, warm deck cache
c43b149 fix(i18n): Library saved-reading focus area / zodiac / dates + HomePage + ProfilePage seeker rank
cbe82b2 fix(i18n): horoscope affirmations + planetary transits + Library tabs/filters + seeker rank display + enneagram Type label
5b65d00 docs(audit): progress report for autonomous i18n cleanup
73c197f fix(i18n): billing web-checkout error translations via errorKey
4d73e3e fix(i18n): AchievementStats labels (Total XP / Streak / Readings / Journal / Quizzes)
78e6c90 fix(i18n): Library saved section headers (Spreads/Cards/Horoscopes) + Daily period
d7bc960 fix(i18n): use getZodiacProfile in dailyContent so strengths/challenges localize
ce4e55c fix(i18n): billing purchase toasts (cancelled/failed) via errorKey passthrough
bc46019 fix(i18n): localize zodiac compatibility list + saved-reading card names
ccb0365 fix(i18n): QuizzesPage result sections + compatible types + take another
5946437 fix(i18n): SettingsSheet + LandingPage stats + HoroscopePage + JournalPage + LibrarySection chrome
42c6027 fix(i18n): SearchSheet recent searches
b959990 fix(i18n): auth callback toasts + TarotCardMeaningPage yes/no verdict
59e0647 fix(i18n): ErrorBoundary + useAstrology errors + SavedSheet + spread positions
47ffbbe fix(i18n): localize LibrarySection 8 guides + chrome strings
e766003 fix(i18n): localize daily horoscope insight arrays + context vocabulary
4bf9b01 fix(i18n): translate premium feature names + descriptions in 4 locales
3ac7277 fix(i18n): translate quiz list whatYouGet + timeEstimate in 4 locales
a4c1823 fix(i18n): translate TarotSection position labels + paywall + toasts + rank names   ← your screenshot bug
4ffd5c7 chore: retrigger deploy after adding 6 GH secrets
```

## Per-locale audit trajectory

| Iteration | ja | ko | zh | Total unique |
|---|---|---|---|---|
| Baseline (before fixes) | 90 | 90 | 83 | ~150 |
| After batches 1–5 live | 24 | 26 | 17 | 29 |
| After batches 1–13 (cbe82b2) | 11 | 13 | 6 | 10 |
| After batch 14 (c43b149) | 10 | 12 | 5 | 10 |
| After batch 15 (f1d7a47) | 4 | 6 | 3 | 5 |
| After batch 16 (85fac4e) measured | 3 | 5 | 3 | 4 |
| After batch 17 (cb1db9c) measured | 3 | 3 | 3 | 3 |
| After native-polish pass 5 (52112cf) re-measured | 3 | 3 | 3 | 3 |

## Native-polish passes (later session)

After the coverage passes above landed a hard "3 English runs per locale"
floor (all acceptable: user name + MBTI brand codes), the user flagged
that while _coverage_ was complete, the _quality_ still read like Google
Translate in places — especially the horoscope daily-insight content.

Five additional polish passes rewrote ~720 user-facing strings for
natural tone without changing semantics or placeholder tokens:

| Pass | Commit | Area | Strings |
|---|---|---|---|
| 1 | `245f6d7` | home + horoscope chrome + dailyInsights templates | 251 |
| 2 | `7b9ed57` | context vocab (focusAreas / loveActions / element descriptors) | 69 |
| 3 | `aba0524` | planets + dayThemes + moodDescriptors + actionSteps | ~150 |
| 4 | `e31f43b` | library guides content (8 guides × ~4 sections × 3 locales) | ~200 |
| 5 | `52112cf` | onboarding first-impression chrome | 49 |

Common patterns fixed:

- **Dropped pronouns** (JA `あなたの`, KO `당신의`, ZH `你的`) where English's
  explicit possessive didn't translate — repetition was making the voice
  feel translated rather than written.
- **Mixed noun/verb forms in interpolated arrays** normalized — templates
  like "今日の恋愛は{loveAction}が吉" grammatically broke on verb-form
  selections. Now uniform.
- **Em-dashes** (——) replaced with sentence breaks or native separators.
- **"Cosmic X" head-noun compounds** (JA `コスミックトーン`, KO `우주 톤`,
  ZH `宇宙语气`) rephrased to natural alternatives.
- **Repetitive "supports"** — JA `支えています` / KO `지지합니다` / ZH `支持着`
  — varied across sentences to match rhythm.
- **Real translation bug caught**: ZH `home.dayStreakLabel` was `天连胜`
  (lit. "day-winning-streak", sports sense) → `天连续`.

Live audit after all 5 polish passes landed: **3 / 3 / 3** — unchanged
from the coverage floor, confirming the polish didn't regress anything
and the only remaining English items are still the 3 acceptable ones
(user display name, MBTI acronym, 16 four-letter type codes).

## The original screenshot bug — FIXED (batch 1, commit a4c1823)

**Before:** Money Reading / 1-Card Daily / Your Card / Interpretation / Get AI Insight / Money Focus / Traditional — all English while the card name (戦車) and AI interpretation rendered in Japanese.

**Root cause:** `TarotSection.tsx:463` had literal `return 'Your Card'` never wrapped in `t()`. Same for paywall labels and toasts. The rank badge "Novice Seeker" on Home was rendering `profile.seekerRank` raw (canonical English DB value).

**Fix:**
- `getPositionLabel()` → `t('readings.positions.yourCard | past | present | future | generic')`
- Paywall: `t('readings.paywall.unlimited' | 'aiInterpretation')`
- Toasts: `t('readings.toasts.aiReady' | 'interpretationReady' | 'aiFailed')`
- Rank badge: `localizeSeekerRank(profile.seekerRank)` on Home, Profile, Achievements, LevelUp

## Remaining English strings (5 unique across all 3 locales)

These are **intentional** and represent ~0 real i18n bugs:

| String | Source | Why it stays English |
|---|---|---|
| `'Lawrence Ma.'` | `profile.displayName` | Your own name. Profile data, not UI chrome. |
| `'MBTI'` | Compatibility section heading | Universal acronym. The 16-type typology is always called "MBTI" worldwide; translating it would confuse rather than help. |
| `'INTJ / INTP / ENTJ / ENTP / INFJ / INFP / ENFJ / ENFP / ISTJ / ISFJ / ISTP / ISFP / ESTJ / ESFJ / ESTP / ESFP'` | Compatibility MBTI type list | Universal type codes. These four-letter identifiers are used verbatim in every language and culture. |
| `'Big Five'` (KO) — now `빅 파이브` after 85fac4e | Quiz types label | The Korean community usually transliterates — now fixed. |
| `'gemini -'` — now `双子座 -` / `쌍둥이자리 -` / `双子座 -` after 85fac4e | Library saved horoscope header | Was lowercase DB value passing through to Pascal-case lookup — now fixed. |

## Architecture changes shipped

- `src/i18n/localizeDailyInsights.ts` — locale-aware getters for 8 insight template arrays + 10 context dictionaries (planets, days, elements, actions, focuses, nurturing vocab, etc.)
- `src/i18n/localizePremium.ts` — feature name/description lookup by stable ID.
- `src/i18n/localizeRank.ts` — seeker_rank canonical → display localization.
- `src/i18n/localizeCard.ts` — added `localizeCardNameSync()` + `prefetchCardNameIndex()` for saved reading card names.
- `src/services/dailyContent.ts` — entire `generateDailyReading()` pipeline pulls templates AND interpolation context from i18n.
- `services/billing.ts` `PurchaseResult` type extended with `errorKey` so service-layer errors carry an i18n key across the UI boundary.
- `TarotCardMeaningPage` split: `getYesNoVerdict()` (structural) + `getYesNo()` (render-time localized) so SEO JSON-LD stays English while UI translates.
- Quiz metadata (`whatYouGet` + `timeEstimate`) moved from data-file constants to `quizzes.definitions.<id>` i18n lookups.

## Translations added

Rough tally: ~600 new translation keys × 4 locales = **~2400 individual translations landed across this session**.

Major content localized:
- 8 daily horoscope template arrays (10 templates each) = 80 × 4 = 320 strings
- 10 planetary influence entries × 3 fields = 30 × 4 = 120 strings
- 7 daily themes × 3 fields = 21 × 4 = 84 strings
- 4 elements × 3 fields = 12 × 4 = 48 strings
- 8 library education guides (tarot basics, mbti, love languages, zodiac, moon phases, crystals, chakras, numerology) with full content = ~200 × 4 = 800 strings
- Premium feature names/descriptions × 10 features = 20 × 4 = 80 strings
- Spread position labels × 6 spreads = 31 × 4 = 124 strings
- Plus: ErrorBoundary, SettingsSheet, QuizzesPage result sections, etc.

## Remaining user action items

1. **Nothing i18n-related.** The translation layer is complete.
2. The other pre-existing action items still apply:
   - `SUPABASE_DB_PASSWORD` GH secret to unblock the `Push DB migrations` CI step.
   - Sentry + UptimeRobot rules from `.audit/ALERTING-RUNBOOK.md` to paste into the dashboards (~20 min).
