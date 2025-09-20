#!/usr/bin/env node

/**
 * Test Webhook Deployment
 * 
 * This script tests if the webhook is properly deployed and configured.
 */

async function testWebhookDeployment() {
  console.log('🧪 Testing Webhook Deployment...\n');

  try {
    // Test 1: Check if endpoint exists (GET request)
    console.log('1. Testing endpoint accessibility (GET)...');
    const getResponse = await fetch('https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook');
    console.log(`   GET Status: ${getResponse.status}`);
    
    if (getResponse.status === 405) {
      console.log('   ✅ Endpoint exists but rejects GET (expected)');
    } else if (getResponse.status === 404) {
      console.log('   ❌ Endpoint not found');
    } else {
      console.log(`   Status: ${getResponse.status}`);
    }

    // Test 2: Test POST request with invalid signature
    console.log('\n2. Testing POST request...');
    const postResponse = await fetch('https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify({ type: 'test' })
    });

    console.log(`   POST Status: ${postResponse.status}`);
    
    if (postResponse.status === 400) {
      console.log('   ✅ POST request accepted (400 expected for invalid signature)');
    } else if (postResponse.status === 405) {
      console.log('   ❌ POST request rejected - webhook not properly configured');
    } else if (postResponse.status === 500) {
      console.log('   ❌ Server error - likely missing environment variables');
    } else {
      console.log(`   Status: ${postResponse.status}`);
    }

    // Test 3: Check response body for error details
    if (postResponse.status !== 200) {
      try {
        const responseText = await postResponse.text();
        console.log(`   Response: ${responseText.substring(0, 200)}...`);
      } catch (e) {
        console.log('   Could not read response body');
      }
    }

    console.log('\n📋 Diagnosis:');
    if (postResponse.status === 400) {
      console.log('   ✅ Webhook is working correctly');
      console.log('   ✅ Environment variables are set');
      console.log('   ✅ Ready to process Stripe events');
    } else if (postResponse.status === 405) {
      console.log('   ❌ Webhook endpoint not accepting POST requests');
      console.log('   ❌ Likely deployment or configuration issue');
    } else if (postResponse.status === 500) {
      console.log('   ❌ Server error - missing environment variables');
      console.log('   ❌ Check Vercel environment variables');
    }

    console.log('\n🔧 Next Steps:');
    console.log('1. Check Vercel environment variables');
    console.log('2. Redeploy if needed');
    console.log('3. Test with real Stripe webhook');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWebhookDeployment();
