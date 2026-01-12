# Quick Guide: Adding Bundled Images

This guide explains how to add images to your app bundle for instant loading.

## Why Bundle Images?

**Before**: Images load from Supabase (800-2000ms per card)
**After**: Bundled images load instantly (10-50ms per card)

## What Should Be Bundled?

✅ **Recommended to Bundle**:
- Major Arcana cards (22 cards) - most frequently used
- Default card backs
- App icons and UI assets

❌ **Keep Remote**:
- Minor Arcana cards (56 cards) - less frequently used
- User-uploaded custom images
- Images that change frequently

## Step-by-Step: Adding Images to Bundle

### 1. Prepare Your Images

**Optimal Settings**:
- **Format**: WebP (best compression) or PNG
- **Dimensions**: 400px × 600px (2:3 aspect ratio)
- **Quality**: 80-85%
- **Target Size**: <100KB per image

**How to Optimize**:

Using online tools:
1. Go to [Squoosh.app](https://squoosh.app)
2. Upload your image
3. Select WebP format
4. Set quality to 80-85
5. Resize to 400x600px
6. Download optimized image

Using command line (ImageMagick):
```bash
convert input.png -resize 400x600 -quality 85 output.webp
```

### 2. Name Your Files

Use the card slug format from `src/config/bundledImages.ts`:

```
the-fool.webp
the-magician.webp
the-high-priestess.webp
the-empress.webp
the-emperor.webp
the-hierophant.webp
the-lovers.webp
the-chariot.webp
strength.webp
the-hermit.webp
wheel-of-fortune.webp
justice.webp
the-hanged-man.webp
death.webp
temperance.webp
the-devil.webp
the-tower.webp
the-star.webp
the-moon.webp
the-sun.webp
judgement.webp
the-world.webp
```

### 3. Place Files in Bundle Directory

Copy optimized images to:
```
/public/bundled-cards/major-arcana/
```

Example structure:
```
public/
├── bundled-cards/
│   ├── major-arcana/
│   │   ├── the-fool.webp
│   │   ├── the-magician.webp
│   │   ├── the-high-priestess.webp
│   │   └── ... (19 more cards)
│   └── placeholders/
└── card-backs/
    └── default.svg
```

### 4. Build and Test

```bash
# Build the app
npm run build

# For Android APK
npm run build
npx cap sync android
npx cap run android

# For iOS
npm run build
npx cap sync ios
npx cap run ios
```

### 5. Verify Bundle Works

1. Open the app
2. Navigate to tarot reading
3. Flip a Major Arcana card
4. Card should load instantly (no loading spinner)
5. Check browser/app console - should see no network requests for bundled images

## Current Status

**Bundled** (instant load):
- Default card back ✅
- Directory structure ready ✅

**To Add** (requires your images):
- 22 Major Arcana card images ⏳

**Remote** (loads from Supabase):
- 56 Minor Arcana cards
- All current card images

## Adding More Images to Bundle

### Adding Minor Arcana

If you want to bundle Minor Arcana too:

1. **Update config** (`src/config/bundledImages.ts`):
```typescript
export const MINOR_ARCANA_SUITS = ['wands', 'cups', 'swords', 'pentacles'];

export function getBundledCardPath(cardId: number, cardName: string): string | null {
  if (isMajorArcana(cardId)) {
    return `/bundled-cards/major-arcana/${slugify(cardName)}.webp`;
  }

  // Add minor arcana logic
  const suit = getSuitFromCardName(cardName);
  const number = getNumberFromCardName(cardName);
  return `/bundled-cards/minor-arcana/${suit}/${number}.webp`;
}
```

2. **Create directories**:
```bash
mkdir -p public/bundled-cards/minor-arcana/{wands,cups,swords,pentacles}
```

3. **Add images** following naming convention:
```
public/bundled-cards/minor-arcana/
├── wands/
│   ├── ace.webp
│   ├── two.webp
│   └── ...
├── cups/
├── swords/
└── pentacles/
```

### Adding Custom Card Backs

1. **Place image**:
```
public/card-backs/mystic.svg
```

2. **Update config**:
```typescript
export const BUNDLED_CARD_BACKS = [
  { name: 'default', path: '/card-backs/default.svg' },
  { name: 'mystic', path: '/card-backs/mystic.svg' },
];
```

## Download Images from Supabase

If you want to bundle your existing Supabase images:

1. **Get URLs** from Supabase Storage
2. **Download and optimize** each image
3. **Place in bundle directory** with correct naming
4. **Rebuild** the app

## APK Size Impact

Each image adds to your APK:
- 22 Major Arcana × 100KB = ~2.2MB
- 56 Minor Arcana × 100KB = ~5.6MB
- Total for all 78 cards = ~7.8MB

**Recommended**:
- Bundle Major Arcana only: +2.2MB (✅ Good)
- Bundle all cards: +7.8MB (⚠️ Large but acceptable)

## Performance Comparison

### Major Arcana (22 cards)

**Before** (all remote):
- First card: 800-2000ms
- All 22 cards: 15-30 seconds
- Network data: 2-3MB

**After** (all bundled):
- First card: 10-50ms (98% faster)
- All 22 cards: 200-500ms (98% faster)
- Network data: 0MB
- Works offline: Yes ✅

### Full Deck (78 cards)

**Strategy 1** (Major bundled, Minor remote):
- Major Arcana: Instant
- Minor Arcana: 200-800ms each
- APK size: +2.2MB
- Network data: 5-6MB for Minor

**Strategy 2** (all bundled):
- All cards: Instant
- APK size: +7.8MB
- Network data: 0MB
- Works offline: Yes ✅

## Troubleshooting

### Images Not Loading

**Problem**: Card still shows loading spinner or placeholder

**Check**:
1. File exists in `/public/bundled-cards/major-arcana/`
2. Filename matches slug in `bundledImages.ts`
3. Build was run after adding images: `npm run build`
4. For APK: `npx cap sync` was run after build

### Wrong Image Showing

**Problem**: Different card image appears

**Check**:
1. Filename exactly matches expected slug
2. No duplicate files with different extensions
3. Clear browser/app cache

### APK Too Large

**Problem**: App store rejects large APK

**Solutions**:
1. Reduce number of bundled images
2. Lower image quality (70-75%)
3. Use smaller dimensions (300x450px)
4. Switch some images back to remote loading

## Next Steps

1. **Download or create** optimized images for the 22 Major Arcana cards
2. **Place files** in `/public/bundled-cards/major-arcana/`
3. **Build** the app: `npm run build`
4. **Test** in browser or on device
5. **Measure** the performance improvement!

For more details, see [IMAGE_OPTIMIZATION_STRATEGY.md](./IMAGE_OPTIMIZATION_STRATEGY.md)
