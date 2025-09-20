#!/usr/bin/env node

/**
 * Debug Webhook Processing
 * 
 * This script helps debug why the webhook isn't processing payments.
 */

async function debugWebhookProcessing() {
  console.log('🔍 Debugging Webhook Processing...\n');

  console.log('📋 Check These Things:\n');

  console.log('1. Stripe Webhook Logs:');
  console.log('   - Go to: https://dashboard.stripe.com/test/webhooks');
  console.log('   - Find: https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook');
  console.log('   - Check recent deliveries for your payment');
  console.log('   - Look for Success/Failed status');
  console.log('   - If Failed, check the error message\n');

  console.log('2. Vercel Function Logs:');
  console.log('   - Go to: https://vercel.com/dashboard');
  console.log('   - Select project: aqwa-cloud1-7iaj');
  console.log('   - Go to Functions tab');
  console.log('   - Look for webhook function logs');
  console.log('   - Check for error messages\n');

  console.log('3. Common Issues:');
  console.log('   - Webhook secret mismatch');
  console.log('   - Firebase permissions error');
  console.log('   - User ID not found in metadata');
  console.log('   - Wallet document doesn\'t exist');
  console.log('   - Environment variables missing\n');

  console.log('4. Quick Fix - Manual Wallet Credit:');
  console.log('   - Go to: https://console.firebase.google.com/project/aust2-b8d21/firestore/data/wallets');
  console.log('   - Find document: lke7NBWdEOU31Cwcgbp6LOEKcq42');
  console.log('   - Add the amount you paid to balanceCents\n');

  console.log('5. Test Questions:');
  console.log('   - What status shows in Stripe webhook logs?');
  console.log('   - What error message (if any)?');
  console.log('   - How much did you pay?');
  console.log('   - Are there any errors in Vercel logs?\n');

  console.log('🎯 Most Likely Issues:');
  console.log('   1. Webhook secret mismatch between Stripe and Vercel');
  console.log('   2. Firebase security rules blocking webhook access');
  console.log('   3. User ID not matching in metadata');
  console.log('   4. Wallet document not found');
}

debugWebhookProcessing();
