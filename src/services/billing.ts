import {
  Purchases,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from '@revenuecat/purchases-capacitor';
import { isNative, isAndroid } from '../utils/platform';
import { supabase } from '../lib/supabase';
import { preventDoubleBilling } from './billingGuard';

export type BillingProvider = 'google' | 'samsung' | 'web';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
  period?: 'month' | 'year' | 'lifetime';
  isLifetime?: boolean;
  hasTrial?: boolean;
  trialDays?: number;
  rcPackage?: PurchasesPackage;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  error?: string;
}

export interface BillingService {
  provider: BillingProvider;
  initialize(userId?: string): Promise<boolean>;
  setUserId(userId: string): Promise<void>;
  logOut(): Promise<void>;
  getProducts(productIds: string[]): Promise<Product[]>;
  purchase(productId: string, product?: Product): Promise<PurchaseResult>;
  restorePurchases(): Promise<PurchaseResult[]>;
  isPremium(): Promise<boolean>;
  getCustomerInfo(): Promise<CustomerInfo | null>;
}

const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'arcana_premium_monthly',
  PREMIUM_YEARLY: 'arcana_premium_yearly',
  PREMIUM_LIFETIME: 'arcana_premium_lifetime',
};

const STRIPE_PRICE_IDS = {
  PREMIUM_MONTHLY: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || '',
  PREMIUM_YEARLY: import.meta.env.VITE_STRIPE_PRICE_YEARLY || '',
  PREMIUM_LIFETIME: import.meta.env.VITE_STRIPE_PRICE_LIFETIME || '',
};

const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_API_KEY || '';
const ENTITLEMENT_ID = 'premium';

function detectProvider(): BillingProvider {
  if (isNative()) {
    if (isAndroid()) {
      return 'google';
    }
  }
  return 'web';
}

class NativeBillingService implements BillingService {
  provider: BillingProvider = 'google';
  private initialized = false;
  private packages: PurchasesPackage[] = [];
  private userId?: string;

  async initialize(userId?: string): Promise<boolean> {
    if (this.initialized) return true;

    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

      if (isAndroid() && REVENUECAT_API_KEY) {
        this.userId = userId;
        await Purchases.configure({
          apiKey: REVENUECAT_API_KEY,
          appUserID: userId,
        });
        this.initialized = true;
        console.log('[RevenueCat] Initialized with user ID:', userId);
        return true;
      }

      console.warn('RevenueCat API key not configured');
      return false;
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      return false;
    }
  }

  async setUserId(userId: string): Promise<void> {
    try {
      this.userId = userId;
      // Clear cached packages from previous user
      this.packages = [];
      if (this.initialized) {
        await Purchases.logIn({ appUserID: userId });
        console.log('[RevenueCat] User ID set:', userId);
      }
    } catch (error) {
      console.error('[RevenueCat] Failed to set user ID:', error);
    }
  }

  async logOut(): Promise<void> {
    try {
      // Clear cached packages and user state
      this.packages = [];
      this.userId = undefined;
      if (this.initialized) {
        await Purchases.logOut();
        console.log('[RevenueCat] User logged out');
      }
    } catch (error) {
      console.error('[RevenueCat] Failed to log out:', error);
    }
  }

  async getProducts(): Promise<Product[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log('[RevenueCat] Fetching offerings...');
      const offerings = await Purchases.getOfferings();

      console.log('[RevenueCat] Offerings response:', {
        hasCurrent: !!offerings.current,
        currentId: offerings.current?.identifier,
        allOfferingsCount: Object.keys(offerings.all || {}).length,
        allOfferingIds: Object.keys(offerings.all || {}),
      });

      if (!offerings.current) {
        console.warn('[RevenueCat] No current offering set. Please configure a "Current" offering in RevenueCat dashboard.');
        console.warn('[RevenueCat] Available offerings:', Object.keys(offerings.all || {}));
        return this.getFallbackProducts();
      }

      this.packages = offerings.current.availablePackages;

      console.log('[RevenueCat] Available packages:', this.packages.map(pkg => ({
        identifier: pkg.identifier,
        productId: pkg.product.identifier,
        price: pkg.product.priceString,
      })));

      if (this.packages.length === 0) {
        console.warn('[RevenueCat] Current offering has no packages. Please add packages in RevenueCat dashboard.');
        return this.getFallbackProducts();
      }

      return this.packages.map((pkg) => {
        const product = pkg.product;
        let period: 'month' | 'year' | 'lifetime' | undefined;
        let isLifetime = false;

        if (product.subscriptionPeriod) {
          const periodUnit = product.subscriptionPeriod.toLowerCase();
          if (periodUnit.includes('month') || periodUnit.includes('p1m')) {
            period = 'month';
          } else if (periodUnit.includes('year') || periodUnit.includes('p1y')) {
            period = 'year';
          }
        } else {
          period = 'lifetime';
          isLifetime = true;
        }

        return {
          id: product.identifier,
          title: product.title,
          description: product.description,
          price: product.priceString,
          priceAmount: product.price,
          currency: product.currencyCode,
          period,
          isLifetime,
          rcPackage: pkg,
        };
      });
    } catch (error) {
      console.error('[RevenueCat] Failed to get products:', error);
      return this.getFallbackProducts();
    }
  }

  private getFallbackProducts(): Product[] {
    return [
      {
        id: PRODUCT_IDS.PREMIUM_MONTHLY,
        title: 'Premium Monthly',
        description: 'Monthly subscription - Full premium features',
        price: '$4.99',
        priceAmount: 4.99,
        currency: 'USD',
        period: 'month',
      },
      {
        id: PRODUCT_IDS.PREMIUM_YEARLY,
        title: 'Premium Yearly',
        description: 'Yearly subscription - Best value, save 58%',
        price: '$24.99',
        priceAmount: 24.99,
        currency: 'USD',
        period: 'year',
      },
      {
        id: PRODUCT_IDS.PREMIUM_LIFETIME,
        title: 'Premium Lifetime',
        description: 'One-time purchase, unlock everything forever',
        price: '$29.99',
        priceAmount: 29.99,
        currency: 'USD',
        period: 'lifetime',
        isLifetime: true,
      },
    ];
  }

  private matchesProductId(productId: string, searchId: string): boolean {
    const normalizedProductId = productId.split(':')[0].toLowerCase();
    const normalizedSearchId = searchId.split(':')[0].toLowerCase();
    return normalizedProductId === normalizedSearchId;
  }

  async purchase(_productId: string, product?: Product): Promise<PurchaseResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('[RevenueCat] Starting purchase for:', _productId, 'hasRcPackage:', !!product?.rcPackage);

    try {
      let packageToPurchase = product?.rcPackage;

      if (!packageToPurchase) {
        console.log('[RevenueCat] No rcPackage provided, fetching products...');
        const products = await this.getProducts();
        const foundProduct = products.find((p) =>
          p.id === _productId ||
          p.id.startsWith(_productId + ':') ||
          _productId.startsWith(p.id + ':') ||
          this.matchesProductId(p.id, _productId)
        );

        if (!foundProduct) {
          console.error('[RevenueCat] Product not found in offerings:', _productId);
          console.error('[RevenueCat] Available product IDs:', products.map(p => p.id));
          return {
            success: false,
            error: 'Product not available. Please check RevenueCat configuration.',
          };
        }

        if (!foundProduct.rcPackage) {
          console.error('[RevenueCat] Product found but no rcPackage:', foundProduct);
          return {
            success: false,
            error: 'Product not configured in RevenueCat. Please set up offerings.',
          };
        }

        packageToPurchase = foundProduct.rcPackage;
      }

      console.log('[RevenueCat] Purchasing package:', packageToPurchase.identifier);

      const result = await Purchases.purchasePackage({
        aPackage: packageToPurchase,
      });

      const isPremium = result.customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      const transactionId = result.transaction?.transactionIdentifier || result.productIdentifier;

      console.log('[RevenueCat] Purchase result:', {
        isPremium,
        transactionId,
        entitlements: Object.keys(result.customerInfo.entitlements.active),
      });

      if (isPremium) {
        const billingCheck = await preventDoubleBilling(this.userId || '', 'mobile');
        if (!billingCheck.allowed) {
          console.warn('[RevenueCat] DB billing guard warning (purchase succeeded):', billingCheck.reason);
        }
      }

      return {
        success: isPremium,
        transactionId,
        productId: _productId,
      };
    } catch (error: unknown) {
      const purchaseError = error as { code?: string; message?: string };

      if (purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return {
          success: false,
          error: 'Purchase cancelled',
        };
      }

      console.error('[RevenueCat] Purchase failed:', error);
      return {
        success: false,
        error: purchaseError.message || 'Purchase failed',
      };
    }
  }

  async restorePurchases(): Promise<PurchaseResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await Purchases.restorePurchases();
      const isPremium = !!result.customerInfo.entitlements.active[ENTITLEMENT_ID];

      console.log('[RevenueCat] Restore result:', {
        isPremium,
        entitlements: Object.keys(result.customerInfo.entitlements.active),
      });

      if (isPremium) {
        return [
          {
            success: true,
            transactionId: `restored-${result.customerInfo.originalAppUserId}`,
            productId: ENTITLEMENT_ID,
          },
        ];
      }

      return [];
    } catch (error) {
      console.error('[RevenueCat] Failed to restore purchases:', error);
      return [];
    }
  }

  async isPremium(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    } catch (error) {
      console.error('Failed to check premium status:', error);
      return false;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await Purchases.getCustomerInfo();
      return result.customerInfo;
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return null;
    }
  }
}

class WebBillingService implements BillingService {
  provider: BillingProvider = 'web';
  private userId?: string;

  async initialize(): Promise<boolean> {
    if (isNative()) {
      console.warn('[WebBilling] Should not be used on native platform');
      return false;
    }
    return true;
  }

  async setUserId(userId: string): Promise<void> {
    this.userId = userId;
  }

  async logOut(): Promise<void> {
    this.userId = undefined;
  }

  async getProducts(): Promise<Product[]> {
    return [
      {
        id: PRODUCT_IDS.PREMIUM_MONTHLY,
        title: 'Premium Monthly',
        description: 'Monthly subscription - Full premium features',
        price: '$4.99',
        priceAmount: 4.99,
        currency: 'USD',
        period: 'month',
      },
      {
        id: PRODUCT_IDS.PREMIUM_YEARLY,
        title: 'Premium Yearly',
        description: 'Yearly subscription - Best value, save 58%',
        price: '$24.99',
        priceAmount: 24.99,
        currency: 'USD',
        period: 'year',
      },
      {
        id: PRODUCT_IDS.PREMIUM_LIFETIME,
        title: 'Premium Lifetime',
        description: 'One-time purchase, unlock everything forever',
        price: '$29.99',
        priceAmount: 29.99,
        currency: 'USD',
        period: 'lifetime',
        isLifetime: true,
      },
    ];
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    if (isNative()) {
      console.error('[WebBilling] Stripe purchase attempted on native platform - this should not happen');
      return {
        success: false,
        error: 'Web billing is not available on mobile. Please use the app store.',
      };
    }

    try {
      if (!this.userId) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const billingCheck = await preventDoubleBilling(this.userId, 'web');
      if (!billingCheck.allowed) {
        return {
          success: false,
          error: billingCheck.reason || 'Already have premium',
        };
      }

      const priceId = this.getStripePriceId(productId);
      if (!priceId) {
        return {
          success: false,
          error: 'Stripe is not configured. Please contact support.',
        };
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          priceId,
          productId,
          userId: this.userId,
          successUrl: `${window.location.origin}/?payment=success`,
          cancelUrl: `${window.location.origin}/?payment=cancelled`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || 'Failed to create checkout session',
        };
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
        return {
          success: true,
          productId,
        };
      }

      return {
        success: false,
        error: 'No checkout URL returned',
      };
    } catch (error) {
      console.error('[Stripe] Purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed',
      };
    }
  }

  private getStripePriceId(productId: string): string | null {
    switch (productId) {
      case PRODUCT_IDS.PREMIUM_MONTHLY:
        return STRIPE_PRICE_IDS.PREMIUM_MONTHLY;
      case PRODUCT_IDS.PREMIUM_YEARLY:
        return STRIPE_PRICE_IDS.PREMIUM_YEARLY;
      case PRODUCT_IDS.PREMIUM_LIFETIME:
        return STRIPE_PRICE_IDS.PREMIUM_LIFETIME;
      default:
        return null;
    }
  }

  async restorePurchases(): Promise<PurchaseResult[]> {
    return [];
  }

  async isPremium(): Promise<boolean> {
    try {
      if (!this.userId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          this.userId = user.id;
        }
      }

      if (!this.userId) {
        return false;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', this.userId)
        .maybeSingle();

      if (error) {
        console.error('[Stripe] Error checking premium status:', error);
        return false;
      }

      return data?.is_premium || false;
    } catch (error) {
      console.error('[Stripe] Error checking premium status:', error);
      return false;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    return null;
  }

  async openCustomerPortal(): Promise<boolean> {
    if (isNative()) {
      console.error('[WebBilling] Stripe portal attempted on native platform');
      return false;
    }

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('[Stripe] Not authenticated');
        return false;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          returnUrl: window.location.origin,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[Stripe] Portal error:', error);
        return false;
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Stripe] Portal error:', error);
      return false;
    }
  }
}

let billingServiceInstance: BillingService | null = null;

export function getBillingService(): BillingService {
  if (!billingServiceInstance) {
    const provider = detectProvider();
    console.log('[Billing] Detected provider:', provider, '| isNative:', isNative(), '| isAndroid:', isAndroid());

    if (provider === 'google') {
      console.log('[Billing] Using NativeBillingService (RevenueCat/Google Play)');
      billingServiceInstance = new NativeBillingService();
    } else {
      console.log('[Billing] Using WebBillingService (Stripe - web only)');
      billingServiceInstance = new WebBillingService();
    }
  }

  return billingServiceInstance;
}

export async function initializeBilling(): Promise<boolean> {
  const service = getBillingService();
  return service.initialize();
}

export { PRODUCT_IDS };
