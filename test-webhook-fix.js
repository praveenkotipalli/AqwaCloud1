#!/usr/bin/env node

/**
 * Test Webhook Fix
 * 
 * This script tests if the webhook fix resolves the HTTP 405 error.
 */

async function testWebhookFix() {
  console.log('🧪 Testing Webhook Fix...\n');

  try {
    // Test local webhook
    console.log('1. Testing local webhook endpoint...');
    const localResponse = await fetch('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify({ type: 'test' })
    });

    console.log(`   Local Status: ${localResponse.status}`);
    if (localResponse.status === 400) {
      console.log('   ✅ Local webhook working (HTTP 400 expected for invalid signature)');
    } else {
      console.log(`   ❌ Local webhook issue: ${localResponse.status}`);
    }

    // Test production webhook
    console.log('\n2. Testing production webhook endpoint...');
    const prodResponse = await fetch('https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify({ type: 'test' })
    });

    console.log(`   Production Status: ${prodResponse.status}`);
    if (prodResponse.status === 400) {
      console.log('   ✅ Production webhook working (HTTP 400 expected for invalid signature)');
    } else if (prodResponse.status === 405) {
      console.log('   ❌ Production webhook still returning HTTP 405 - needs deployment');
    } else {
      console.log(`   Status: ${prodResponse.status}`);
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Deploy the updated webhook to Vercel');
    console.log('2. Test with a real payment');
    console.log('3. Check Stripe webhook logs for success');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWebhookFix();
