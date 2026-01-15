import {
  Purchases,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from '@revenuecat/purchases-capacitor';
import { isNative, isAndroid } from '../utils/platform';

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
  initialize(): Promise<boolean>;
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

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

      if (isAndroid() && REVENUECAT_API_KEY) {
        await Purchases.configure({
          apiKey: REVENUECAT_API_KEY,
        });
        this.initialized = true;
        return true;
      }

      console.warn('RevenueCat API key not configured');
      return false;
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      return false;
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
        let hasTrial = false;
        let trialDays = 0;

        if (product.subscriptionPeriod) {
          const periodUnit = product.subscriptionPeriod.toLowerCase();
          if (periodUnit.includes('month') || periodUnit.includes('p1m')) {
            period = 'month';
            hasTrial = true;
            trialDays = 3;
          } else if (periodUnit.includes('year') || periodUnit.includes('p1y')) {
            period = 'year';
            hasTrial = true;
            trialDays = 3;
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
          hasTrial,
          trialDays,
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
        description: 'Full access with 3-day free trial',
        price: '$9.99',
        priceAmount: 9.99,
        currency: 'USD',
        period: 'month',
        hasTrial: true,
        trialDays: 3,
      },
      {
        id: PRODUCT_IDS.PREMIUM_YEARLY,
        title: 'Premium Yearly',
        description: 'Full access with 3-day free trial',
        price: '$49.99',
        priceAmount: 49.99,
        currency: 'USD',
        period: 'year',
        hasTrial: true,
        trialDays: 3,
      },
      {
        id: PRODUCT_IDS.PREMIUM_LIFETIME,
        title: 'Premium Lifetime',
        description: 'One-time purchase, forever access',
        price: '$99.99',
        priceAmount: 99.99,
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

  async initialize(): Promise<boolean> {
    return true;
  }

  async getProducts(): Promise<Product[]> {
    return [
      {
        id: PRODUCT_IDS.PREMIUM_MONTHLY,
        title: 'Premium Monthly',
        description: 'Full access with 3-day free trial',
        price: '$9.99',
        priceAmount: 9.99,
        currency: 'USD',
        period: 'month',
        hasTrial: true,
        trialDays: 3,
      },
      {
        id: PRODUCT_IDS.PREMIUM_YEARLY,
        title: 'Premium Yearly',
        description: 'Full access with 3-day free trial',
        price: '$49.99',
        priceAmount: 49.99,
        currency: 'USD',
        period: 'year',
        hasTrial: true,
        trialDays: 3,
      },
      {
        id: PRODUCT_IDS.PREMIUM_LIFETIME,
        title: 'Premium Lifetime',
        description: 'One-time purchase, forever access',
        price: '$99.99',
        priceAmount: 99.99,
        currency: 'USD',
        period: 'lifetime',
        isLifetime: true,
      },
    ];
  }

  async purchase(): Promise<PurchaseResult> {
    return {
      success: false,
      error: 'Purchases are only available in the mobile app',
    };
  }

  async restorePurchases(): Promise<PurchaseResult[]> {
    return [];
  }

  async isPremium(): Promise<boolean> {
    return false;
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    return null;
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
