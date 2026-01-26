#!/usr/bin/env node

import Stripe from 'stripe';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

if (!STRIPE_SECRET_KEY) {
  console.error('❌ Error: STRIPE_SECRET_KEY environment variable is required');
  console.error('');
  console.error('Usage:');
  console.error('  STRIPE_SECRET_KEY=sk_test_xxxxx node scripts/create-stripe-products.mjs');
  console.error('');
  console.error('Get your secret key from: https://dashboard.stripe.com/test/apikeys');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

console.log('🚀 Creating Stripe products for Arcana...\n');

async function createProducts() {
  try {
    console.log('📦 Creating Product 1: Premium Monthly...');
    const monthlyProduct = await stripe.products.create({
      name: 'Arcana Premium Monthly',
      description: 'Monthly subscription - Full premium features, cancel anytime',
      metadata: {
        product_id: 'arcana_premium_monthly',
        type: 'subscription',
      },
    });

    const monthlyPrice = await stripe.prices.create({
      product: monthlyProduct.id,
      unit_amount: 799,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        product_id: 'arcana_premium_monthly',
      },
    });

    console.log('✅ Monthly Product created!');
    console.log(`   Product ID: ${monthlyProduct.id}`);
    console.log(`   Price ID: ${monthlyPrice.id}`);
    console.log('');

    console.log('📦 Creating Product 2: Premium Yearly (Best Value)...');
    const yearlyProduct = await stripe.products.create({
      name: 'Arcana Premium Yearly',
      description: 'Yearly subscription - Best value, save 58%',
      metadata: {
        product_id: 'arcana_premium_yearly',
        type: 'subscription',
      },
    });

    const yearlyPrice = await stripe.prices.create({
      product: yearlyProduct.id,
      unit_amount: 3999,
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      metadata: {
        product_id: 'arcana_premium_yearly',
      },
    });

    console.log('✅ Yearly Product created!');
    console.log(`   Product ID: ${yearlyProduct.id}`);
    console.log(`   Price ID: ${yearlyPrice.id}`);
    console.log('');

    console.log('📦 Creating Product 3: Premium Lifetime...');
    const lifetimeProduct = await stripe.products.create({
      name: 'Arcana Premium Lifetime',
      description: 'One-time purchase, unlock everything + remove ads forever',
      metadata: {
        product_id: 'arcana_premium_lifetime',
        type: 'lifetime',
      },
    });

    const lifetimePrice = await stripe.prices.create({
      product: lifetimeProduct.id,
      unit_amount: 5999,
      currency: 'usd',
      metadata: {
        product_id: 'arcana_premium_lifetime',
      },
    });

    console.log('✅ Lifetime Product created!');
    console.log(`   Product ID: ${lifetimeProduct.id}`);
    console.log(`   Price ID: ${lifetimePrice.id}`);
    console.log('');

    console.log('📦 Creating Product 4: Ad Removal Only...');
    const adRemovalProduct = await stripe.products.create({
      name: 'Arcana Ad Removal',
      description: 'One-time purchase - Remove all ads (no premium features)',
      metadata: {
        product_id: 'arcana_ad_removal',
        type: 'one_time',
      },
    });

    const adRemovalPrice = await stripe.prices.create({
      product: adRemovalProduct.id,
      unit_amount: 699,
      currency: 'usd',
      metadata: {
        product_id: 'arcana_ad_removal',
      },
    });

    console.log('✅ Ad Removal Product created!');
    console.log(`   Product ID: ${adRemovalProduct.id}`);
    console.log(`   Price ID: ${adRemovalPrice.id}`);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Success! All products created in Stripe.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📋 Add these to your .env file:');
    console.log('');
    console.log(`VITE_STRIPE_PRICE_MONTHLY=${monthlyPrice.id}`);
    console.log(`VITE_STRIPE_PRICE_YEARLY=${yearlyPrice.id}`);
    console.log(`VITE_STRIPE_PRICE_LIFETIME=${lifetimePrice.id}`);
    console.log(`VITE_STRIPE_PRICE_AD_REMOVAL=${adRemovalPrice.id}`);
    console.log('');

    const envPath = join(__dirname, '..', '.env');
    let envContent = '';

    try {
      envContent = readFileSync(envPath, 'utf8');
    } catch (err) {
      const envExamplePath = join(__dirname, '..', '.env.example');
      try {
        envContent = readFileSync(envExamplePath, 'utf8');
        console.log('📝 Creating .env from .env.example...');
      } catch {
        console.log('⚠️  Warning: Could not read .env or .env.example');
        console.log('   Please manually add the price IDs to your .env file');
        return;
      }
    }

    envContent = envContent.replace(
      /VITE_STRIPE_PRICE_MONTHLY=.*/,
      `VITE_STRIPE_PRICE_MONTHLY=${monthlyPrice.id}`
    );
    envContent = envContent.replace(
      /VITE_STRIPE_PRICE_YEARLY=.*/,
      `VITE_STRIPE_PRICE_YEARLY=${yearlyPrice.id}`
    );
    envContent = envContent.replace(
      /VITE_STRIPE_PRICE_LIFETIME=.*/,
      `VITE_STRIPE_PRICE_LIFETIME=${lifetimePrice.id}`
    );
    envContent = envContent.replace(
      /VITE_STRIPE_PRICE_AD_REMOVAL=.*/,
      `VITE_STRIPE_PRICE_AD_REMOVAL=${adRemovalPrice.id}`
    );

    writeFileSync(envPath, envContent);
    console.log('✅ .env file updated with new price IDs!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 Next Steps:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('1. ✅ Products created in Stripe');
    console.log('2. ✅ Price IDs added to .env');
    console.log('3. 🔔 Set up webhook (see STRIPE_SETUP_GUIDE.md)');
    console.log('4. 🧪 Test with: npm run dev');
    console.log('');
    console.log('View your products: https://dashboard.stripe.com/test/products');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating products:', error.message);

    if (error.type === 'StripeAuthenticationError') {
      console.error('');
      console.error('Authentication failed. Please check:');
      console.error('1. Your STRIPE_SECRET_KEY is correct');
      console.error('2. You\'re using the right key (test mode vs live mode)');
      console.error('3. Get keys from: https://dashboard.stripe.com/test/apikeys');
    }

    process.exit(1);
  }
}

createProducts();
