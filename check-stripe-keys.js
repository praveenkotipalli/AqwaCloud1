#!/usr/bin/env node

/**
 * Check Stripe Keys
 * 
 * This script checks if the Stripe keys are properly formatted.
 */

const fs = require('fs');
const path = require('path');

function checkStripeKeys() {
  console.log('🔍 Checking Stripe Keys\n');

  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  let stripeSecretKey = '';
  let stripePublishableKey = '';
  let webhookSecret = '';

  lines.forEach(line => {
    if (line.startsWith('STRIPE_SECRET_KEY=')) {
      stripeSecretKey = line.split('=')[1];
    } else if (line.startsWith('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=')) {
      stripePublishableKey = line.split('=')[1];
    } else if (line.startsWith('STRIPE_WEBHOOK_SECRET=')) {
      webhookSecret = line.split('=')[1];
    }
  });

  console.log('📋 Found Keys:');
  console.log(`STRIPE_SECRET_KEY: ${stripeSecretKey ? 'Set' : 'Missing'}`);
  console.log(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${stripePublishableKey ? 'Set' : 'Missing'}`);
  console.log(`STRIPE_WEBHOOK_SECRET: ${webhookSecret ? 'Set' : 'Missing'}`);

  console.log('\n🔍 Key Validation:');
  
  if (stripeSecretKey) {
    if (stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('sk_live_')) {
      console.log('✅ STRIPE_SECRET_KEY: Valid format');
    } else {
      console.log('❌ STRIPE_SECRET_KEY: Invalid format (should start with sk_test_ or sk_live_)');
    }
  }

  if (stripePublishableKey) {
    if (stripePublishableKey.startsWith('pk_test_') || stripePublishableKey.startsWith('pk_live_')) {
      console.log('✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Valid format');
    } else {
      console.log('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Invalid format (should start with pk_test_ or pk_live_)');
    }
  }

  if (webhookSecret) {
    if (webhookSecret.startsWith('whsec_')) {
      console.log('✅ STRIPE_WEBHOOK_SECRET: Valid format');
    } else {
      console.log('❌ STRIPE_WEBHOOK_SECRET: Invalid format (should start with whsec_)');
    }
  }

  console.log('\n🧪 Testing Stripe Instance:');
  try {
    const Stripe = require('stripe');
    if (stripeSecretKey) {
      const stripe = new Stripe(stripeSecretKey);
      console.log('✅ Stripe instance created successfully');
    } else {
      console.log('❌ Cannot test Stripe instance - secret key missing');
    }
  } catch (error) {
    console.log('❌ Stripe instance creation failed:', error.message);
  }

  console.log('\n📝 Recommendations:');
  if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_test_')) {
    console.log('1. Get your Stripe secret key from: https://dashboard.stripe.com/test/apikeys');
    console.log('2. Make sure it starts with sk_test_');
  }
  if (!stripePublishableKey || !stripePublishableKey.startsWith('pk_test_')) {
    console.log('3. Get your Stripe publishable key from: https://dashboard.stripe.com/test/apikeys');
    console.log('4. Make sure it starts with pk_test_');
  }
  if (!webhookSecret || !webhookSecret.startsWith('whsec_')) {
    console.log('5. Get your webhook secret from: https://dashboard.stripe.com/test/webhooks');
    console.log('6. Make sure it starts with whsec_');
  }
}

checkStripeKeys();
