#!/usr/bin/env node

/**
 * Test Production Webhook
 * 
 * This script tests if the production webhook endpoint is accessible.
 */

async function testProductionWebhook() {
  console.log('🧪 Testing Production Webhook...\n');

  const webhookUrl = 'https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook';

  try {
    console.log('1. Testing webhook endpoint accessibility...');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify({ type: 'test' })
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);

    if (response.status === 400) {
      console.log('   ✅ HTTP 400 - Bad Request (expected for invalid signature)');
      console.log('   This means the webhook endpoint is working correctly!');
    } else if (response.status === 500) {
      console.log('   ❌ HTTP 500 - Internal Server Error');
      console.log('   This suggests missing environment variables in Vercel');
    } else if (response.status === 404) {
      console.log('   ❌ HTTP 404 - Not Found');
      console.log('   This suggests the webhook endpoint is not deployed');
    } else {
      console.log(`   Status: ${response.status} - ${response.statusText}`);
    }

    console.log('\n2. Checking Stripe Dashboard...');
    console.log('   Go to: https://dashboard.stripe.com/test/webhooks');
    console.log('   Look for endpoint: https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook');
    console.log('   Check recent deliveries for successful events');

    console.log('\n3. Testing complete flow...');
    console.log('   Go to: https://aqwa-cloud1-7iaj.vercel.app/billing');
    console.log('   Make a test payment with card: 4242 4242 4242 4242');
    console.log('   Check if wallet balance updates automatically');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nPossible issues:');
    console.log('- Webhook endpoint not accessible');
    console.log('- Network connectivity issues');
    console.log('- Vercel deployment issues');
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Verify webhook endpoint in Stripe Dashboard');
  console.log('2. Check Vercel environment variables');
  console.log('3. Make a test payment on production');
  console.log('4. Check webhook delivery logs');
}

testProductionWebhook();
