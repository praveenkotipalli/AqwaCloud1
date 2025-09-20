#!/usr/bin/env node

/**
 * Test Payment Webhook
 * 
 * This script simulates a webhook call with your actual payment data.
 */

const crypto = require('crypto');

async function testPaymentWebhook() {
  console.log('🧪 Testing Payment Webhook...\n');

  try {
    // Simulate your recent payment data
    const mockPaymentData = {
      id: 'evt_test_payment',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_recent_payment',
          object: 'checkout.session',
          payment_status: 'paid',
          amount_total: 1000, // $10.00 in cents
          metadata: {
            purpose: 'wallet_topup',
            userId: 'lke7NBWdEOU31Cwcgbp6LOEKcq42' // Your user ID
          }
        }
      }
    };

    console.log('📋 Payment Data:');
    console.log(`   Amount: $${mockPaymentData.data.object.amount_total / 100}`);
    console.log(`   User ID: ${mockPaymentData.data.object.metadata.userId}`);
    console.log(`   Purpose: ${mockPaymentData.data.object.metadata.purpose}`);

    // Test local webhook
    console.log('\n1. Testing local webhook...');
    const localResponse = await fetch('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(mockPaymentData)
    });

    console.log(`   Local Status: ${localResponse.status}`);

    // Test production webhook
    console.log('\n2. Testing production webhook...');
    const prodResponse = await fetch('https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(mockPaymentData)
    });

    console.log(`   Production Status: ${prodResponse.status}`);

    console.log('\n📋 Next Steps:');
    console.log('1. Check Stripe webhook logs for your recent payment');
    console.log('2. Check Vercel function logs for errors');
    console.log('3. Manually credit your wallet if needed');
    console.log('4. Test with a new payment to verify webhook works');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPaymentWebhook();
