# Card Back Cover System

## Overview

A comprehensive card back customization system that allows users to upload their own custom card back image, which is displayed everywhere cards appear face-down throughout the application.

## Implementation Summary

### 1. Database & Storage

**Storage Bucket**: `card-backs`
- Public read access for all card back images
- Authenticated users can upload, update, and delete their own card backs
- 5MB file size limit
- Supported formats: PNG, JPEG, JPG, WEBP
- Storage path: `{user_id}/card_back.png`

**Database Field**: `profiles.card_back_url`
- Stores the public URL of the user's uploaded card back
- Updated automatically when user uploads a new card back
- Optional field (nullable)

### 2. Upload Functionality

**Location**: Settings > Customization section
- Prominent upload button at the top of settings
- Preview of current card back (or default icon if none uploaded)
- Visual feedback during upload (loading spinner)
- Success/error toast notifications
- Automatic profile refresh after upload

**Upload Service**: `src/services/cardImageUpload.ts`
```typescript
uploadCardBack(userId: string, file: File)
```
- Handles file upload to Supabase storage
- Updates profile with new card back URL
- Includes cache-busting timestamps
- Returns success/error status with messages

### 3. Card Back Display Locations

The custom card back is displayed in ALL the following locations:

#### Homepage (Daily Ritual)
**Component**: `src/components/ritual/TarotFlipCard.tsx`
- Shows card back before user taps to flip
- Smooth flip animation reveals the drawn card
- Falls back to default gradient if no custom back uploaded

#### Tarot Readings Section
**Component**: `src/components/readings/TarotSection.tsx`

1. **Daily Draw Card Icon**
   - Main card icon users click to start a reading
   - Located at top of readings page

2. **Shuffle Animation**
   - 8 stacked cards shown during shuffle
   - Animated shuffle effect with custom backs

3. **Card Selection Grid**
   - 78 cards displayed in 4-column grid
   - Users tap to select cards for their reading
   - Custom back shown on unselected cards

4. **Reveal Screen**
   - Cards shown face-down before tap to reveal
   - Appears in all spread types (single, 3-card, Celtic Cross, etc.)
   - Custom back visible until card is revealed

5. **Browse Deck Icon**
   - Three small stacked cards in the browse section
   - Visual indicator for the deck browser feature

### 4. Fallback Behavior

When no custom card back is uploaded:
- **TarotFlipCard**: Shows elegant gradient with sparkle icon and "Tap to reveal" text
- **Shuffle View**: Shows gradient cards with gold accent overlay
- **Selection Grid**: Shows gradient background with sparkle icons
- **Reveal View**: Shows gradient with sparkle icon and tap prompt
- **Daily Draw / Browse Icons**: Shows gradient with sparkle icon

### 5. Technical Implementation

**Type Definition** (`src/types/index.ts`):
```typescript
interface UserProfile {
  // ... other fields
  card_back_url?: string;
}
```

**Props Passing**:
- TarotFlipCard receives `cardBackUrl` prop from parent components
- TarotSection accesses card back via `profile?.card_back_url` from AuthContext
- Consistent usage pattern across all components

**Image Handling**:
- Uses `object-cover` CSS class for proper aspect ratio
- Overflow hidden on containers to prevent image bleeding
- Smooth transitions and hover effects maintained
- Cache-busting with timestamp query parameters

### 6. Security

**Row Level Security Policies**:
- Public read access to all card backs (public bucket)
- Users can only upload to their own folder (`{user_id}/`)
- Users can only update/delete their own card backs
- Enforced at storage bucket level via Supabase policies

### 7. User Experience

**Upload Flow**:
1. User opens Settings from profile page
2. Sees "Customization" section at top
3. Clicks on card back preview area
4. Selects image file from device
5. Upload progress shown with spinner
6. Success message displayed
7. Card back immediately visible throughout app

**Visual Consistency**:
- All card backs use same aspect ratio (2:3 or 2.5:4 depending on context)
- Consistent border styling (2px gold/mystic borders)
- Smooth transitions and hover effects
- Maintains visual hierarchy and readability

### 8. Files Modified

**New Migration**:
- `supabase/migrations/add_card_back_storage.sql`

**Updated Files**:
- `src/types/index.ts` - Added card_back_url to UserProfile
- `src/services/cardImageUpload.ts` - Added uploadCardBack function
- `src/pages/ProfilePage.tsx` - Added upload UI in settings
- `src/components/ritual/TarotFlipCard.tsx` - Added cardBackUrl prop and display logic
- `src/components/readings/TarotSection.tsx` - Added card back display in 5 locations
- `src/pages/HomePage.tsx` - Pass cardBackUrl prop to TarotFlipCard

## Usage Example

```typescript
// In any component with access to AuthContext
const { profile } = useAuth();

// Use the card back URL
{profile?.card_back_url ? (
  <img src={profile.card_back_url} alt="Card Back" className="w-full h-full object-cover" />
) : (
  // Fallback default design
)}
```

## Benefits

1. **Personalization**: Users can customize their tarot experience
2. **Consistency**: Same card back shown everywhere
3. **Performance**: Images cached with timestamps
4. **Flexibility**: Easy to update or remove
5. **Security**: Proper access control and policies
6. **UX**: Seamless integration with existing flows

## Future Enhancements

Potential features to consider:
- Multiple card back designs to choose from
- Card back gallery/marketplace
- Animated card backs
- Seasonal/themed card backs
- Card back preview before upload
- Crop/resize tool in upload flow
