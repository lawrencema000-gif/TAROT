# TAROT — Audit v2 Report (Language Focus)

**Audit date:** 2026-04-20
**Scope:** full live credentialed tour, Supabase backend v2, language coverage for web + app
**Live:** https://tarotlife.app

---

## TL;DR

You sent a screenshot showing the Japanese horoscope page with the chrome translated but the CONTENT (theme, summary, transits, sign names) still in English. This was the visible symptom of a deeper problem: the astrology edge functions hardcoded their prose content and never accepted a locale parameter.

Fixed in this session:

| Severity | Issue | Status |
|---|---|---|
| 🔴 CRITICAL | Daily horoscope content (theme/summary/categories/do/avoid/powerMove/ritual/journalPrompt/transit briefs) hardcoded English in `astrology-daily` edge function | ✅ Localized en/ja/ko/zh, deployed |
| 🔴 CRITICAL | ES256 user-session JWT migration broke astrology + checkout + generate-reading functions (401 UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM) | ✅ Redeployed 11 functions with `--no-verify-jwt`; internal `getUser()` still enforces real auth |
| 🟠 HIGH | ZodiacSign / Planet / AspectType enums rendered as raw English text (Gemini, Uranus, trine) even in non-EN locales | ✅ New `src/i18n/localizeNames.ts` + wired into 6 components |
| 🟠 HIGH | App.tsx pageTitles ("Today", "Horoscope", "Your cosmic blueprint", etc.) hardcoded English | ✅ Moved to `pageTitles.*` keys in all 4 locales |
| 🟠 HIGH | `billing.ts` logged user IDs in production console | ✅ DEV-guarded the two user-ID-bearing console.logs |

---

## What's now localized (content, not just chrome)

Before this session, the server returned prose strings verbatim so Japanese users saw things like *"Clear Communication / Social connections energize you today..."* on a page whose headers were Japanese. After:

| Field | Before (JA user) | After (JA user) |
|---|---|---|
| `theme` | `Clear Communication` | `明確なコミュニケーション` |
| `summary` | `Social connections energize you today...` | `今日は社会とのつながりがあなたを元気づけます。何気ない会話が意味ある協力や友情に火を灯すかもしれません。` |
| `moonSign` | `Gemini` | `双子座` (via `localizeSignName`) |
| transit brief | `Uranus flows harmoniously with your Venus, easing progress.` | `天王星があなたの金星と調和し、物事がスムーズに進みます。` |
| `categories.love` | `Intellectual compatibility matters most...` | `いまは知的な相性が一番大切。考えでつながりましょう。` |
| `doList` | `[Network, Write your thoughts, Ask thoughtful questions]` | `[人脈を広げる, 思考を書き留める, 丁寧な質問をする]` |
| `powerMove` | `Start a meaningful conversation you've been avoiding.` | `避けてきた大切な会話を始める。` |
| `journalPrompt` | `What idea has been circling my mind...` | `頭を巡り続ける、探求に値するアイデアは何?` |
| Page headers | `Horoscope / Your cosmic blueprint` | `星占い / あなたの宇宙の設計図` |

Same approach ready for astrology-weekly / astrology-monthly / astrology-transit-calendar — the locale-aware content file `supabase/functions/_shared/astrology-content.ts` is in place; those functions still need the same wiring pass (see "Remaining work" below).

---

## Backend audit v2 findings (detailed)

Full report: [`.audit/backend-audit-v2.md`](.audit/backend-audit-v2.md)

### Fixed in this session
- Platform ES256 JWT mismatch — 11 functions redeployed with `--no-verify-jwt` (app-side auth still enforced)
- `astrology-daily` now accepts `locale` and returns localized content
- `billing.ts` user-ID logs DEV-guarded

### Remaining findings — your decision

| Ref | What | Risk | Your action |
|---|---|---|---|
| H1-v2 | `backgrounds` storage bucket is public with no file-size/mime caps; missing DELETE policy | Medium — world-readable user uploads | Tighten bucket to authenticated-only, add 5 MB / image-only caps, add DELETE policy on own-folder |
| H2-v2 | `blog-covers` bucket has no RLS migration (created via script/dashboard) | Low | Add a migration codifying the public-read policy we created |
| H3-v2 | `astrology-geocode` kept unauthenticated by design (for onboarding) | Low | Intentional — noted in audit, accept as-is |
| M3-v2 | 6 astrology functions have JWT auth but no in-memory rate limit (inconsistent with `generate-reading`) | Low | Add `checkRateLimit` to each when next edited |
| M5-v2 | ~13 other `console.log` lines in `billing.ts` and elsewhere | Low | Batch DEV-guard them on next cleanup pass |

### Audit gaps (CLI limitations)
- `functions logs` not available in CLI v2.77/v2.92 — can't grab recent error rates from CLI. Dashboard or Management API needed.
- Leaked-password protection toggle is dashboard-only, cannot be verified via CLI.

---

## Remaining language work

This session fully localized `astrology-daily` + all chrome/UI. What's left:

| Surface | Scope | Notes |
|---|---|---|
| `astrology-weekly` | Similar pattern to daily: takes `locale`, uses locale-specific content tables | Tables already in `_shared/astrology-content.ts` — needs wiring pass |
| `astrology-monthly` | Same | Same |
| `astrology-transit-calendar` | Composes brief strings from planet/aspect names | Uses `buildAspectBrief()` helper already shared |
| Quiz question text | Deferred content migration per earlier memory | MBTI/Big Five/Enneagram/Attachment/Love Language — ~400 questions |
| Journal prompt templates (in Journal tab) | Deferred content migration | 16 prompts per element × 4 elements |
| Blog post bodies | Deferred content migration | SEO-driven, separate translation pass |
| Privacy Policy + Terms of Service bodies | Legal review gate | Do not translate without legal review |
| Admin dashboard | Intentionally EN | You're the only admin |

---

## Files touched this session

**New files:**
- `supabase/functions/_shared/astrology-content.ts` — 900+ translations across 4 locales
- `src/i18n/localizeNames.ts` — sign/planet/aspect name helpers
- `scripts/language-audit.mjs` — Playwright-based language audit runner
- `.audit/MASTER-REPORT-v2.md` — this file

**Modified:**
- `supabase/functions/astrology-daily/index.ts` — locale-aware + cache key includes locale
- `supabase/config.toml` — `verify_jwt = false` for 11 authenticated functions
- `src/hooks/useAstrology.ts` — auto-appends locale to every call
- `src/App.tsx` — pageTitles from i18n keys
- `src/components/horoscope/{TodayForYou,Explore,BirthChart,Forecast}.tsx`
- `src/components/readings/{HoroscopeSection,CompatibilitySection}.tsx`
- `src/services/billing.ts` — DEV-guard user-ID logs
- `src/i18n/locales/{en,ja,ko,zh}/app.json` — added `pageTitles.*` block

---

## Commits shipped this session

```
119729c  feat(i18n): localize daily horoscope backend + page titles + astrology JWT fix
a5486c1  i18n(display): localize zodiac signs + planet + aspect names
2384b1b  chore(blog): migrate cover images from Unsplash to Supabase storage
```

All live at **https://tarotlife.app**. JA verified end-to-end shows fully Japanese content on the Today tab (theme, summary, transits, moon sign, power move, rituals, journal prompts, do/avoid lists).
