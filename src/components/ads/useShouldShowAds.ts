import { useAuth } from '../../context/AuthContext';

/**
 * Returns false when the current viewer should not see ads:
 *   - Paying premium subscribers (is_premium)
 *   - Users who earned the ad-free perk (is_ad_free)
 *
 * Safe to call on unauthenticated pages (AuthContext returns null profile;
 * we default to showing ads in that case).
 */
export function useShouldShowAds(): boolean {
  const { profile } = useAuth();
  if (!profile) return true; // anonymous visitors see ads
  return !profile.isPremium && !profile.isAdFree;
}
