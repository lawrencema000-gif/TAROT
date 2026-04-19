# Arcana — Google Play Store Listings

Paste these into the Google Play Console under **Main store listing** →
**Manage translations** for each language.

Each locale has:
- `short-description` — max 80 chars
- `full-description` — max 4000 chars
- `title` — max 30 chars

Current English listing is the default. Add `ja-JP`, `ko-KR`, and `zh-CN`
translations alongside it in the Play Console and Google will automatically
serve the right version to users in each region.

Graphics (screenshots, feature graphic, icon) can stay the same across all
locales as long as any text baked into them is universally readable or
avoided. If you localize screenshots, upload separate sets per language in
the Play Console.

| File | Locale | Script | Max size |
|------|--------|--------|----------|
| en-US.md | English (US) | Latin | default |
| ja-JP.md | Japanese | Hiragana/Katakana/Kanji | same limits |
| ko-KR.md | Korean | Hangul | same limits |
| zh-CN.md | Simplified Chinese | Simplified Han | same limits |

## Rollout notes

- Set US as the default; adding translations does not replace the default, it adds alternatives.
- After uploading Play Console translations, watch the crawl rate of the localized pages in Google Search Console for 1–2 weeks to see uptake.
- Screenshots remain English for v1 — we can test localized screenshots post-launch if install rates in JA/KO/ZH markets underperform.
