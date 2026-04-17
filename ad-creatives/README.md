# Ad Creatives

Auto-generated from the bundled tarot card art. Regenerate anytime with:

```bash
node scripts/generate-ad-images.mjs
node scripts/generate-ad-video.mjs
```

## Files

| Folder / File | Dimensions | Use for |
|---|---|---|
| `v1/square-1200.jpg`, `v1/landscape-1200x628.jpg` | 1200×1200 / 1200×628 | **v1 — Ask the Cards** (The High Priestess) |
| `v2/*` | same | **v2 — Love Reading** (The Lovers) |
| `v3/*` | same | **v3 — Daily Ritual** (The Sun) |
| `v4/*` | same | **v4 — Career Decision** (The Emperor) |
| `v5/*` | same | **v5 — Card of the Day** (The Star) |
| `ad-15s-landscape.mp4` | 1200×628, 13s | YouTube bumper / Display video |
| `ad-15s-square.mp4` | 1200×1200, 13s | Discovery / Performance Max |

(Legacy HTML files from the old workflow have been superseded by these JPG/MP4 assets generated directly from the card art.)

## Upload checklist

For each variant, go to **Google Ads → Campaign → Asset library → Upload** and add:

- Square 1200×1200 JPG (minimum image requirement for PMax)
- Landscape 1200×628 JPG (1.91:1 — Discovery/Display requirement)
- The matching video for PMax / YouTube campaigns

## Copy to pair with each image

See [../GOOGLE-ADS-WEB-VARIANTS.md](../GOOGLE-ADS-WEB-VARIANTS.md) for headlines, descriptions, keywords, and UTM-tagged Final URLs to pair with each image variant.

## Iteration

To try different cards or copy, edit `VARIANTS` in [../scripts/generate-ad-images.mjs](../scripts/generate-ad-images.mjs) and re-run. Takes ~3 seconds per render.
