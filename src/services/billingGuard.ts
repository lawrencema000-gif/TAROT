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
        warning: 'You already have premium access.',
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
        ? 'You purchased premium on the web. Manage your subscription in Settings.'
        : isAppPurchase
        ? 'You purchased premium in the mobile app. Manage your subscription in the Google Play Store.'
        : 'You already have premium access.',
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
    return '⚠️ You already purchased premium in the mobile app. You don\'t need to purchase again.';
  }

  if (currentPlatform === 'mobile' && (purchasePlatform === 'stripe' || purchasePlatform === 'web')) {
    return '⚠️ You already purchased premium on the web. You don\'t need to purchase again.';
  }

  return null;
}

export async function preventDoubleBilling(userId: string, attemptingPlatform: 'web' | 'mobile'): Promise<{ allowed: boolean; reason?: string }> {
  const status = await checkPurchaseStatus(userId);

  if (!status.isPremium) {
    return { allowed: true };
  }

  if (status.provider === 'stripe' && attemptingPlatform === 'mobile') {
    return {
      allowed: false,
      reason: 'You already have premium via web purchase. No need to buy again in the app.',
    };
  }

  if (status.provider === 'google' && attemptingPlatform === 'web') {
    return {
      allowed: false,
      reason: 'You already have premium via mobile app purchase. No need to buy again on web.',
    };
  }

  return {
    allowed: false,
    reason: 'You already have an active premium subscription.',
  };
}
