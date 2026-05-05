# Arcana v1.1.8 — Release Notes

**Version**: 1.1.8 (versionCode 15)
**Release date**: 2026-05-05
**Previous**: 1.1.7 (versionCode 14)

---

## Play Store description (short — 500 char limit)

A complete visual refresh — new arched-window app icon, refined gold typography, animated horoscope wheel, and bespoke icons for every quiz. Fixed a Bazi reading reliability issue, restored the 3-part email course, and improved the password reset flow. Faster, prettier, more reliable.

---

## What's new (long)

### A complete visual redesign
- New app icon — an arched-window glyph with star, sun, and moon
- Refined gold typography (Cormorant Garamond) across every page
- New brand wordmark on the landing, sign-in, and sign-up screens
- Animated horoscope chart — the outermost decorative ring slowly rotates while everything readable stays still
- Refined bottom navigation — gold-tinted icons, gold separator hairline, gold dot under the active tab
- New tab icons — a tarot card glyph for Readings, a 12-spoke zodiac wheel for Horoscope

### 11 custom quiz icons
Every quiz now has a bespoke icon designed around what it actually measures:
- MBTI: 4-quadrant divided square (the four MBTI dimensions)
- Quick MBTI: same quadrants + lightning bolt
- Love Languages: heart with five radiating beams
- Mood Check: sine wave over baseline
- Attachment Style: two interlocked rings with a heart at the intersection
- Big Five (OCEAN): pentagon with inner radar polygon
- Enneagram: the actual 9-pointed enneagram figure
- Shadow Archetype: half-lit theatrical mask
- Element Affinity: four classical alchemy triangles
- Tarot Court Match: crown above a tarot card
- Ayurveda Dosha: three petals around a center prakriti dot

### Reliability fixes
- **Bazi AI reading**: hardened against edge function timeouts. Added per-call abort timeouts and reading-completeness validation so partial responses no longer slip through as silent failures.
- **3-part email course**: restored end-to-end after the cron-secret pipeline was reconnected.
- **Password reset**: fixed the cross-browser-context bug that broke reset links opened on a different device than they were requested from.
- **Daily blog generator**: replenished the SEO topic queue with 30 fresh evergreen topics across every category the app covers.

### Behind the scenes
- Migrated all primary AI surfaces (Bazi, Companion, Quick Reading, Dream Interpreter, Mood Letter, Journal Coach) to gpt-5 for higher-quality readings
- Added `reasoning_effort: minimal` plumbing across reasoning-model calls so we don't pay for hidden chain-of-thought we don't need
- Hardened i18n surface — every translated string now consistently uses the new heading-display typography utilities

---

## Internal notes (not for Play Store)

### Files changed since 1.1.7
- 60+ pages migrated to `heading-display-{xl,lg,md}` typography
- New components: `BrandMark`, `BrandWordmark`, `BrandLockup`, `FeaturePill`, `RitualRow`, `AvailableNowLabel`, `EyebrowLabel`, `SectionDivider`, `HairlineRule`, `SparkleFourPoint`, `TarotCardIcon`, `HoroscopeWheelIcon`, plus 11 quiz icon components
- New CSS utilities: `card-ritual`, `hairline-gold-soft`, `chart-rim-spin`, `inset-frame-gold`
- Replaced 30 icon files (web favicon + manifest icons + Android launcher icons across 5 densities)
- Hardened `bazi-interpret` edge function (AbortController, fewer retries, completeness validation)
- Replenished `seo_blog_topics` queue (+30 topics)

### Known follow-ups
- LandingPage OrbitCards fan tightened from translateX(140) → translateX(130) and orbit container 360 → 400 to stop card-clipping at the edges of the rotation cycle
- Anthropic claude-haiku-4-5 as 2nd AI fallback — deferred until ANTHROPIC_API_KEY is provisioned
- OpenAI key rotation recommended — current key has been transmitted through chat several times during this session

### To produce the AAB
```sh
cd android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`
Upload to Play Console → Internal testing → Create release.
