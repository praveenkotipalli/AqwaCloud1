#!/usr/bin/env node

/**
 * Test Webhook Manually
 * 
 * This script simulates the webhook call that should have happened.
 */

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testWebhookManually() {
  console.log('🧪 Testing Webhook Manually...\n');

  try {
    // Get the checkout session
    const sessionId = 'cs_test_a1whbXc77l6aBnWNjKS22mu8tZLQeHlG1pIITZblUh3Bo0tDA9ue06lLGR';
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('📋 Session Details:');
    console.log('   ID:', session.id);
    console.log('   Amount:', session.amount_total / 100, 'USD');
    console.log('   Status:', session.payment_status);
    console.log('   User ID:', session.metadata?.userId);
    console.log('   Purpose:', session.metadata?.purpose);
    
    if (session.payment_status === 'paid' && session.metadata?.purpose === 'wallet_topup') {
      console.log('\n✅ This should trigger a webhook!');
      console.log('🔍 Check:');
      console.log('   1. Stripe webhook logs for this session');
      console.log('   2. Vercel function logs');
      console.log('   3. Firebase wallet balance');
      
      console.log('\n📝 Expected webhook event:');
      console.log('   Event: checkout.session.completed');
      console.log('   User ID:', session.metadata.userId);
      console.log('   Amount:', session.amount_total, 'cents');
      console.log('   Purpose:', session.metadata.purpose);
      
    } else {
      console.log('\n❌ This would not trigger a webhook');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWebhookManually();
