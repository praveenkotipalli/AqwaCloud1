#!/usr/bin/env node

/**
 * Test Webhook Endpoint
 * 
 * This script tests if the webhook endpoint is working correctly.
 */

const crypto = require('crypto');

async function testWebhookEndpoint() {
  console.log('🧪 Testing Webhook Endpoint...\n');

  try {
    // Test 1: Check if endpoint is accessible
    console.log('1. Testing endpoint accessibility...');
    const response = await fetch('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify({ type: 'test' })
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);

    if (response.status === 405) {
      console.log('   ❌ HTTP 405 - Method Not Allowed');
      console.log('   This suggests the endpoint exists but has an issue');
    } else if (response.status === 400) {
      console.log('   ✅ HTTP 400 - Bad Request (expected for invalid signature)');
      console.log('   This means the endpoint is working correctly');
    } else {
      console.log(`   Status: ${response.status} - ${response.statusText}`);
    }

    // Test 2: Check environment variables
    console.log('\n2. Checking environment variables...');
    console.log('   STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
    console.log('   STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing');

    // Test 3: Check webhook secret format
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (secret.startsWith('whsec_')) {
        console.log('   ✅ Webhook secret format is correct');
      } else {
        console.log('   ❌ Webhook secret should start with "whsec_"');
      }
    }

    console.log('\n🔍 Debugging Steps:');
    console.log('1. Make sure your Next.js app is running on localhost:3000');
    console.log('2. Check .env.local file for STRIPE_WEBHOOK_SECRET');
    console.log('3. Verify webhook secret in Stripe Dashboard');
    console.log('4. Check app logs for webhook errors');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nPossible issues:');
    console.log('- Next.js app not running on localhost:3000');
    console.log('- Webhook endpoint not accessible');
    console.log('- Network connectivity issues');
  }
}

testWebhookEndpoint();
