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
      if (this.initialized) {
        await Purchases.logIn({ appUserID: userId });
        console.log('[RevenueCat] User ID set:', userId);
      }
    } catch (error) {
      console.error('[RevenueCat] Failed to set user ID:', error);
    }
  }

  async getProducts(): Promise<Product[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        console.warn('No current offerings available');
        return this.getFallbackProducts();
      }

      this.packages = offerings.current.availablePackages;

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
      console.error('Failed to get products:', error);
      return this.getFallbackProducts();
    }
  }

  private getFallbackProducts(): Product[] {
    return [
      {
        id: PRODUCT_IDS.PREMIUM_MONTHLY,
        title: 'Premium Monthly',
        description: 'Monthly subscription - Full premium features',
        price: '$7.99',
        priceAmount: 7.99,
        currency: 'USD',
        period: 'month',
      },
      {
        id: PRODUCT_IDS.PREMIUM_YEARLY,
        title: 'Premium Yearly',
        description: 'Yearly subscription - Best value, save 58%',
        price: '$39.99',
        priceAmount: 39.99,
        currency: 'USD',
        period: 'year',
      },
      {
        id: PRODUCT_IDS.PREMIUM_LIFETIME,
        title: 'Premium Lifetime',
        description: 'One-time purchase, unlock everything forever',
        price: '$59.99',
        priceAmount: 59.99,
        currency: 'USD',
        period: 'lifetime',
        isLifetime: true,
      },
    ];
  }

  async purchase(_productId: string, product?: Product): Promise<PurchaseResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const billingCheck = await preventDoubleBilling(this.userId || '', 'mobile');
    if (!billingCheck.allowed) {
      return {
        success: false,
        error: billingCheck.reason || 'Already have premium',
      };
    }

    try {
      const packageToPurchase = product?.rcPackage;

      if (!packageToPurchase) {
        const products = await this.getProducts();
        const foundProduct = products.find((p) => p.id === _productId);
        if (!foundProduct?.rcPackage) {
          return {
            success: false,
            error: 'Product not found',
          };
        }
        const result = await Purchases.purchasePackage({
          aPackage: foundProduct.rcPackage,
        });

        const isPremium = result.customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

        return {
          success: isPremium,
          transactionId: result.customerInfo.originalAppUserId,
          productId: _productId,
        };
      }

      const result = await Purchases.purchasePackage({
        aPackage: packageToPurchase,
      });

      const isPremium = result.customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      return {
        success: isPremium,
        transactionId: result.customerInfo.originalAppUserId,
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

      console.error('Purchase failed:', error);
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
      const entitlements = result.customerInfo.entitlements.active;

      if (Object.keys(entitlements).length > 0) {
        return [
          {
            success: true,
            transactionId: result.customerInfo.originalAppUserId,
            productId: ENTITLEMENT_ID,
          },
        ];
      }

      return [];
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return [];
    }
  }

  async isPremium(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
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
    return true;
  }

  async setUserId(userId: string): Promise<void> {
    this.userId = userId;
  }

  async getProducts(): Promise<Product[]> {
    return [
      {
        id: PRODUCT_IDS.PREMIUM_MONTHLY,
        title: 'Premium Monthly',
        description: 'Monthly subscription - Full premium features',
        price: '$7.99',
        priceAmount: 7.99,
        currency: 'USD',
        period: 'month',
      },
      {
        id: PRODUCT_IDS.PREMIUM_YEARLY,
        title: 'Premium Yearly',
        description: 'Yearly subscription - Best value, save 58%',
        price: '$39.99',
        priceAmount: 39.99,
        currency: 'USD',
        period: 'year',
      },
      {
        id: PRODUCT_IDS.PREMIUM_LIFETIME,
        title: 'Premium Lifetime',
        description: 'One-time purchase, unlock everything forever',
        price: '$59.99',
        priceAmount: 59.99,
        currency: 'USD',
        period: 'lifetime',
        isLifetime: true,
      },
    ];
  }

  async purchase(productId: string): Promise<PurchaseResult> {
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
          error: 'Invalid product ID',
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

    if (provider === 'google') {
      billingServiceInstance = new NativeBillingService();
    } else {
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
