# Tarot Card Image Management

This document explains how tarot card images and card backs are managed in the Arcana app using Supabase Storage.

## Overview

All tarot card images and custom card backs are stored in **Supabase Storage** and served via CDN for optimal performance. Card definitions (meanings, descriptions, etc.) are stored in the **PostgreSQL database** for efficient querying and updates.

For detailed information about the custom card back system, see [CARD_BACK_SYSTEM.md](./CARD_BACK_SYSTEM.md).

## Architecture

### Storage

#### Tarot Card Images
- **Bucket**: `tarot-images` (public bucket)
- **Location**: Supabase Storage
- **Access**: Public read, authenticated write
- **File Types**: PNG, JPEG, JPG, WEBP
- **Max Size**: 5 MB per image
- **Purpose**: Stores all 78 tarot card face images

#### Card Back Covers
- **Bucket**: `card-backs` (public bucket)
- **Location**: Supabase Storage
- **Access**: Public read, authenticated users can upload/update/delete their own
- **File Types**: PNG, JPEG, JPG, WEBP
- **Max Size**: 5 MB per image
- **Purpose**: User-uploaded custom card back designs
- **Path Structure**: `{user_id}/card_back.png`

### Database

#### Tarot Cards Table
- **Table**: `tarot_cards`
- **Fields**:
  - `id` - Card ID (0-77 for 78 cards)
  - `name` - Card name
  - `arcana` - 'major' or 'minor'
  - `keywords` - Array of key concepts
  - `meaning_upright` - Upright interpretation
  - `meaning_reversed` - Reversed interpretation
  - `description` - Visual description
  - `love_meaning` - Love interpretation
  - `career_meaning` - Career interpretation
  - `reflection_prompt` - Self-reflection question
  - `image_url` - Supabase Storage public URL
  - `suit` - For minor arcana only

#### Profiles Table (Card Back)
- **Table**: `profiles`
- **Field**: `card_back_url` (text, nullable)
  - Stores the public URL of user's custom card back
  - Updated when user uploads a new card back via Settings
  - Used throughout the app to display custom card backs

### Services
- **`src/services/tarotCards.ts`** - Handles all database operations
  - `getAllTarotCards()` - Fetch all cards
  - `getTarotCardById(id)` - Fetch single card
  - `getTarotCardsByArcana(arcana)` - Filter by major/minor
  - `searchTarotCards(query)` - Search cards
  - `uploadImageToStorage(file, fileName)` - Upload images
  - `seedTarotCards()` - Initial data seeding

## Benefits of This Approach

### 1. **Scalability**
- No limit on number of images
- Images don't bloat the app bundle
- Fast CDN delivery worldwide

### 2. **Performance**
- Images cached at edge locations
- Lazy loading supported
- Optimized delivery based on device

### 3. **Flexibility**
- Easy to add/update/remove cards
- Can manage images through Supabase Dashboard
- No need to rebuild app for image changes

### 4. **Cost Efficiency**
- Supabase Storage is very affordable
- CDN bandwidth included
- No expensive image hosting needed

## How to Add New Tarot Card Images

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to Storage → `tarot-images` bucket
3. Create folder structure (e.g., `major/`, `minor/cups/`, etc.)
4. Upload your image files
5. Copy the public URL
6. Insert/update the card record in the `tarot_cards` table with the URL

### Method 2: Programmatically

```typescript
import { uploadImageToStorage } from './services/tarotCards';

// Upload from file
const file = new File([blob], 'the_fool.png', { type: 'image/png' });
const url = await uploadImageToStorage(file, 'major/the_fool.png');

// Update database
await supabase
  .from('tarot_cards')
  .upsert({
    id: 0,
    name: 'The Fool',
    arcana: 'major',
    image_url: url,
    // ... other fields
  });
```

### Method 3: Batch Upload Script

```typescript
import { seedTarotCards } from './services/tarotCards';

// Run once to seed initial data
await seedTarotCards();
```

## Image Guidelines

### Specifications
- **Format**: PNG (recommended), JPEG, or WEBP
- **Dimensions**: Minimum 400x600px (portrait)
- **Aspect Ratio**: 2:3 (standard tarot card ratio)
- **File Size**: Under 5 MB (recommend under 500 KB)
- **Quality**: High resolution for zoom capability

### Naming Convention
```
[arcana]/[card_name].png

Examples:
- major/the_fool.png
- major/the_magician.png
- minor/cups/ace_of_cups.png
- minor/wands/two_of_wands.png
```

### Optimization Tips
1. Compress images before upload (use tools like TinyPNG)
2. Use WebP format for smaller file sizes
3. Provide multiple resolutions if needed
4. Ensure consistent styling across all cards

## Data Seeding

The app automatically seeds the database with tarot card data on first load if the table is empty:

1. Checks if `tarot_cards` table has data
2. If empty, uploads all images from `/public` to Supabase Storage
3. Inserts card definitions with storage URLs
4. Cards are then fetched from database on subsequent loads

## Fallback Mechanism

The app has built-in fallbacks for reliability:

```typescript
// If database fetch fails, falls back to local data
const cards = await getAllTarotCards();
// Returns majorArcana from tarotDeck.ts if DB is unavailable
```

## Storage Policies

### Read Access
- Public read access for all images
- Anyone can view images (no auth required)

### Write Access
- Only authenticated users can upload
- Users can update/delete their own uploads
- Admin role can manage all images

### Security
```sql
-- Public read
CREATE POLICY "Public read access for tarot images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'tarot-images');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload tarot images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tarot-images');
```

## Performance Considerations

### Caching
- Images are cached in-memory after first fetch
- Browser caches images automatically
- CDN caches at edge locations

### Loading States
- Components show loading state while fetching
- Skeleton loaders for better UX
- Graceful fallbacks if images fail to load

### Optimization
```typescript
// Cache deck in memory
let cachedDeck: TarotCard[] = [];

async function getDeck(): Promise<TarotCard[]> {
  if (cachedDeck.length === 0) {
    cachedDeck = await getAllTarotCards();
  }
  return cachedDeck;
}
```

## Troubleshooting

### Images not loading
1. Check Supabase Storage bucket permissions
2. Verify image URLs are correct and public
3. Check browser console for CORS errors
4. Ensure bucket name is 'tarot-images'

### Database empty
1. Run `seedTarotCards()` function
2. Check migration files have been applied
3. Verify RLS policies allow reads

### Upload fails
1. Check file size (must be under 5 MB)
2. Verify file type is allowed (PNG, JPEG, WEBP)
3. Ensure user is authenticated
4. Check storage quota in Supabase dashboard

## Future Enhancements

### Potential Improvements
- [ ] Image variations (thumbnail, full-size, print)
- [ ] Dynamic image transformations
- [ ] Lazy loading with blur placeholder
- [ ] Progressive image loading
- [ ] Offline image caching
- [ ] AI-generated alternative descriptions
- [ ] User-uploaded custom card images

## Monitoring

### Check Storage Usage
```sql
SELECT
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint / 1024 / 1024 as total_mb
FROM storage.objects
GROUP BY bucket_id;
```

### Check Card Data
```sql
SELECT
  arcana,
  COUNT(*) as count,
  COUNT(image_url) as with_images
FROM tarot_cards
GROUP BY arcana;
```

## Quick Upload via Browser Console

For specific cards that have update functions available, you can upload directly from the browser console:

### Upload Judgement Card

1. Prepare your image file (PNG recommended, 400x600px minimum)
2. Open browser DevTools (F12)
3. Run in console:
```javascript
// Create file input
const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/png,image/jpeg,image/jpg';
input.onchange = async (e) => {
  const file = e.target.files[0];
  const result = await window.updateJudgementCard(file);
  console.log(result);
};
input.click();
```

### Upload The World Card

1. Prepare your image file (PNG recommended, 400x600px minimum)
2. Open browser DevTools (F12)
3. Run in console:
```javascript
// Create file input
const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/png,image/jpeg,image/jpg';
input.onchange = async (e) => {
  const file = e.target.files[0];
  const result = await window.updateWorldCard(file);
  console.log(result);
};
input.click();
```

**Note**: These functions are only available in development mode. After uploading, the page will automatically reload to display the new images.

## Support

For questions or issues:
- Check Supabase Storage documentation
- Review the `src/services/tarotCards.ts` file
- Consult the database migrations in `supabase/migrations/`
