#!/usr/bin/env node

/**
 * Validate Environment Variables
 * 
 * This script validates that all required environment variables are set correctly.
 */

require('dotenv').config({ path: '.env.local' });

function validateEnvironment() {
  console.log('🔍 Validating Environment Variables\n');

  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];

  let allValid = true;

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    
    if (!value) {
      console.log(`❌ ${varName}: Missing`);
      allValid = false;
    } else {
      // Check format
      if (varName === 'STRIPE_SECRET_KEY') {
        if (value.startsWith('sk_test_') || value.startsWith('sk_live_')) {
          console.log(`✅ ${varName}: Valid format (${value.substring(0, 20)}...)`);
        } else {
          console.log(`❌ ${varName}: Invalid format (should start with sk_test_ or sk_live_)`);
          allValid = false;
        }
      } else if (varName === 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY') {
        if (value.startsWith('pk_test_') || value.startsWith('pk_live_')) {
          console.log(`✅ ${varName}: Valid format (${value.substring(0, 20)}...)`);
        } else {
          console.log(`❌ ${varName}: Invalid format (should start with pk_test_ or pk_live_)`);
          allValid = false;
        }
      } else if (varName === 'STRIPE_WEBHOOK_SECRET') {
        if (value.startsWith('whsec_')) {
          console.log(`✅ ${varName}: Valid format (${value.substring(0, 20)}...)`);
        } else {
          console.log(`❌ ${varName}: Invalid format (should start with whsec_)`);
          allValid = false;
        }
      } else {
        console.log(`✅ ${varName}: Set`);
      }
    }
  });

  console.log('\n🔧 Stripe Configuration Test:');
  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe instance created successfully');
  } catch (error) {
    console.log('❌ Stripe instance creation failed:', error.message);
    allValid = false;
  }

  if (allValid) {
    console.log('\n🎉 All environment variables are valid!');
    console.log('✅ You can now restart your Next.js app');
  } else {
    console.log('\n❌ Some environment variables are invalid');
    console.log('📝 Please check your .env.local file');
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Fix any invalid environment variables');
  console.log('2. Restart your Next.js app: npm run dev');
  console.log('3. Test webhook: node test-webhook-endpoint.js');
  console.log('4. Make a test payment to verify wallet updates');
}

validateEnvironment();
