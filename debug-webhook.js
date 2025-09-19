#!/usr/bin/env node

/**
 * Debug Stripe Webhook
 * 
 * This script helps debug why the Stripe webhook isn't working.
 */

const crypto = require('crypto');

function debugWebhook() {
  console.log('🔍 Stripe Webhook Debug Tool\n');
  
  console.log('📋 Checklist for Webhook Issues:\n');
  
  console.log('1. ✅ Webhook Endpoint URL:');
  console.log('   - Local: http://localhost:3000/api/stripe/webhook');
  console.log('   - Production: https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook');
  console.log('');
  
  console.log('2. ✅ Required Events:');
  console.log('   - checkout.session.completed');
  console.log('   - customer.subscription.created');
  console.log('   - customer.subscription.updated');
  console.log('   - customer.subscription.deleted');
  console.log('   - invoice.payment_succeeded');
  console.log('   - invoice.payment_failed');
  console.log('');
  
  console.log('3. ✅ Environment Variables:');
  console.log('   - STRIPE_WEBHOOK_SECRET=whsec_...');
  console.log('   - STRIPE_SECRET_KEY=sk_test_... or sk_live_...');
  console.log('');
  
  console.log('4. ✅ Webhook Secret:');
  console.log('   - Get from Stripe Dashboard → Webhooks → Your webhook → Signing secret');
  console.log('   - Should start with "whsec_"');
  console.log('');
  
  console.log('🚨 Common Issues:\n');
  
  console.log('Issue 1: Webhook not accessible from Stripe');
  console.log('Solution: Use Stripe CLI or ngrok for local development');
  console.log('Commands:');
  console.log('  npm install -g stripe');
  console.log('  stripe login');
  console.log('  stripe listen --forward-to localhost:3000/api/stripe/webhook');
  console.log('');
  
  console.log('Issue 2: Wrong webhook secret');
  console.log('Solution: Copy the correct secret from Stripe Dashboard');
  console.log('  - Go to Stripe Dashboard → Webhooks → Your webhook');
  console.log('  - Copy the "Signing secret"');
  console.log('  - Add to .env.local: STRIPE_WEBHOOK_SECRET=whsec_...');
  console.log('');
  
  console.log('Issue 3: Webhook endpoint not responding');
  console.log('Solution: Check if your Next.js app is running');
  console.log('  - Make sure app is running on localhost:3000');
  console.log('  - Test endpoint: curl http://localhost:3000/api/stripe/webhook');
  console.log('');
  
  console.log('Issue 4: Production webhook not configured');
  console.log('Solution: Set up webhook for production URL');
  console.log('  - Go to Stripe Dashboard → Webhooks');
  console.log('  - Create endpoint: https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook');
  console.log('  - Add webhook secret to Vercel environment variables');
  console.log('');
  
  console.log('🧪 Test Commands:\n');
  
  console.log('Test webhook endpoint:');
  console.log('curl -X POST http://localhost:3000/api/stripe/webhook \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "stripe-signature: t=1234567890,v1=test_signature" \\');
  console.log('  -d \'{"type":"test"}\'');
  console.log('');
  
  console.log('Test with Stripe CLI:');
  console.log('stripe listen --forward-to localhost:3000/api/stripe/webhook');
  console.log('');
  
  console.log('📊 Debug Steps:\n');
  
  console.log('1. Check Stripe Dashboard → Webhooks → Your webhook');
  console.log('   - Look for recent deliveries');
  console.log('   - Check for any error messages');
  console.log('');
  
  console.log('2. Check your app logs');
  console.log('   - Look for "Received webhook event: checkout.session.completed"');
  console.log('   - Look for "Wallet credited for user..."');
  console.log('');
  
  console.log('3. Test webhook manually');
  console.log('   - Use the manual credit script to fix wallet balance');
  console.log('   - Then debug webhook for future payments');
  console.log('');
  
  console.log('💡 Quick Fix:\n');
  console.log('1. Run: node manual-wallet-credit.js');
  console.log('2. Uncomment the credit line you want');
  console.log('3. Refresh your app to see updated balance');
  console.log('4. Then debug webhook for future payments');
}

debugWebhook();
