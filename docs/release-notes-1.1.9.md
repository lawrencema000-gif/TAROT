# Arcana v1.1.9 — Release Notes

**Version**: 1.1.9 (versionCode 16)
**Release date**: 2026-05-06
**Previous**: 1.1.8 (versionCode 15)

---

## Play Store description (short)

Translation polish for Japanese, Korean, and Chinese — extra-quiz cards now translate fully (Money, Boundaries, Burnout, etc.). Every quiz now has its own unique icon designed around what it measures. Refined Readings tab labels (Dice, Runes were still English). Plus deeper i18n plumbing so future quizzes auto-translate.

---

## What's new

### Translation polish (JP / KR / ZH)
- **Extra-quiz cards now translate fully**. The quizzes Money Personality, Boundaries Check, Burnout, Communication, Conflict, Chronotype, Creative Type, Spiritual Type, and Dark Triad — their "what you get" bullets and time estimates now render in your locale instead of English.
- **Readings tab labels**: "Dice" and "Runes" were still showing English on JP/KR/ZH. Fixed: now 骰子/符文 (zh), ダイス/ルーン (ja), 주사위/룬 (ko).
- **New `localizeExtraQuizMetadata` plumbing** so any future extra-quiz auto-translates when locale entries are added.

### 22 unique quiz icons
Every quiz card now has its own bespoke icon designed around what it measures, instead of a generic Sparkles fallback:
- Dark Triad: three overlapping crescents
- DISC: four quadrants in a circle
- Money Personality: coin with "$"
- Boundaries: shield with inside/outside boundary
- Burnout: dampened flame
- Communication: opposing speech bubbles
- Conflict: crossed lines (X)
- Chronotype: moon + sunrise on horizon
- Creative Type: paintbrush + spark
- Spiritual Type: lotus + flame
- Jungian Functions: 8 spokes (the 8 cognitive functions)
- Love Styles: heart with 4 quadrants (4 Greek styles)
- Parenting Style: house with two figures
- Learning Style: open book + lightbulb
- Empath/HSP: concentric ripples
- Self-Compassion: cupped hands holding a heart
- Mood Screener: ECG-style waveform
- Anxiety Profile: wind arcs
- Leadership Style: compass needle
- Productivity Style: gear with arrow
- Relationship Readiness: two figures + heart bridge
- Wellness Type: leaf with veins

### Behind the scenes
- 30 extra-quiz translation entries added across zh/ja/ko/en (10 quizzes × 3 fields × 4 locales after de-dupe)
- `EXTRA_QUIZ_METADATA` icon strings updated to unique keys (e.g. `dark-triad`, `chronotype`) so collision-prone keys (`moon`, `heart` previously shared by multiple quizzes) no longer fight each other in the iconMap

---

## Known issues / follow-ups (not in this release)

- **12 extra quizzes** (Jungian Functions, Love Styles, Parenting Style, Learning Style, Empath/HSP, Self-Compassion, Mood Screener, Anxiety Profile, Leadership, Productivity, Relationship Readiness, Wellness Type) **don't yet have their `extraQuizzes.<key>.*` block in non-EN locale files** — their cards will fall back to English `whatYouGet`/`timeEstimate` until the entries are added. Their TITLES and DESCRIPTIONS are unaffected (those were already keyed). Adding the missing 12 entries is a content-translation pass for next release.
- **The 348 identical-EN values per locale** identified in the i18n audit (pages/components where the locale file copy-pasted EN without translating) — this is a content-translation project (~13-15 hours per locale, best with a CAT tool or translator).
- **Mood feature** — user reported it doesn't work but didn't specify how. Need to know specifically what's failing (page won't load? save not persisting? Letter not generating?) before we can fix.

---

## To produce the AAB

```sh
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`
