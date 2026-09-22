import { supabase } from '../lib/supabase';

export interface PurchaseInfo {
  isPremium: boolean;
  provider: 'google' | 'stripe' | 'web' | null;
  productId: string | null;
  status: string | null;
  canPurchase: boolean;
  warning?: string;
}

export async function checkPurchaseStatus(userId: string): Promise<PurchaseInfo> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.is_premium) {
      return {
        isPremium: false,
        provider: null,
        productId: null,
        status: null,
        canPurchase: true,
      };
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('provider, product_id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (!subscription) {
      return {
        isPremium: true,
        provider: null,
        productId: null,
        status: null,
        canPurchase: false,
        warning: 'You already have Premium on this account.',
      };
    }

    const isWebPurchase = subscription.provider === 'stripe';
    const isAppPurchase = subscription.provider === 'google';

    return {
      isPremium: true,
      provider: subscription.provider as 'google' | 'stripe' | 'web',
      productId: subscription.product_id,
      status: subscription.status,
      canPurchase: false,
      warning: isWebPurchase
        ? 'You subscribed on the web — manage it from Settings.'
        : isAppPurchase
        ? 'You subscribed in the mobile app — manage it in Google Play.'
        : 'You already have Premium on this account.',
    };
  } catch (error) {
    console.error('[BillingGuard] Error checking purchase status:', error);
    return {
      isPremium: false,
      provider: null,
      productId: null,
      status: null,
      canPurchase: true,
    };
  }
}

export function getPlatformWarning(currentPlatform: 'web' | 'mobile', purchasePlatform: 'stripe' | 'google' | 'web'): string | null {
  if (currentPlatform === 'web' && (purchasePlatform === 'google')) {
    return 'You already have Premium from the mobile app — no need to buy it again.';
  }

  if (currentPlatform === 'mobile' && (purchasePlatform === 'stripe' || purchasePlatform === 'web')) {
    return 'You already have Premium from the web — no need to buy it again.';
  }

  return null;
}

/**
 * `code` says where the existing Premium came from so the UI can pick a
 * translated message (billing.alreadyPremiumWeb / alreadyPremiumMobile /
 * alreadyPremium); `reason` is the English diagnostic for logs.
 */
export async function preventDoubleBilling(
  userId: string,
  attemptingPlatform: 'web' | 'mobile',
): Promise<{ allowed: boolean; reason?: string; code?: 'web' | 'mobile' | 'active' }> {
  const status = await checkPurchaseStatus(userId);

  if (!status.isPremium) {
    return { allowed: true };
  }

  if (status.provider === 'stripe' && attemptingPlatform === 'mobile') {
    return {
      allowed: false,
      code: 'web',
      reason: 'You already have Premium from the web — no need to buy it again in the app.',
    };
  }

  if (status.provider === 'google' && attemptingPlatform === 'web') {
    return {
      allowed: false,
      code: 'mobile',
      reason: 'You already have Premium from the mobile app — no need to buy it again on the web.',
    };
  }

  return {
    allowed: false,
    code: 'active',
    reason: 'You already have an active Premium subscription.',
  };
}
