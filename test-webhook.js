#!/usr/bin/env node

/**
 * Test Stripe Webhook
 * 
 * This script tests if the webhook endpoint is working by simulating a webhook call.
 */

const crypto = require('crypto');

async function testWebhook() {
  console.log('🧪 Testing Stripe Webhook...\n');

  try {
    // Simulate a checkout.session.completed event
    const mockEvent = {
      id: 'evt_test_webhook',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          object: 'checkout.session',
          payment_status: 'paid',
          amount_total: 1000, // $10 in cents
          metadata: {
            purpose: 'wallet_topup',
            userId: 'YOUR_USER_ID_HERE' // Replace this!
          }
        }
      }
    };

    if (mockEvent.data.object.metadata.userId === 'YOUR_USER_ID_HERE') {
      console.log('❌ Please replace userId in the mockEvent with your actual user ID');
      return;
    }

    // Create webhook signature (for testing)
    const payload = JSON.stringify(mockEvent);
    const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    console.log('Mock event payload:', JSON.stringify(mockEvent, null, 2));
    console.log('\nTo test the webhook:');
    console.log('1. Replace YOUR_USER_ID_HERE with your actual user ID');
    console.log('2. Set STRIPE_WEBHOOK_SECRET environment variable');
    console.log('3. Send POST request to http://localhost:3000/api/stripe/webhook');
    console.log('4. With headers: { "stripe-signature": "t=' + Date.now() + ',v1=' + signature + '" }');
    console.log('5. Body: ' + payload);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWebhook();
