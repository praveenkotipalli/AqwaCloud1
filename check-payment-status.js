#!/usr/bin/env node

/**
 * Check Payment Status
 * 
 * This script checks if a payment was completed.
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

async function checkPaymentStatus() {
  console.log('🔍 Checking Payment Status...\n');

  try {
    // Check the checkout session
    const sessionId = 'cs_test_a1whbXc77l6aBnWNjKS22mu8tZLQeHlG1pIITZblUh3Bo0tDA9ue06lLGR';
    
    console.log('📋 Checking checkout session:', sessionId);
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('✅ Session found!');
    console.log('💰 Amount:', session.amount_total / 100, 'USD');
    console.log('📊 Payment Status:', session.payment_status);
    console.log('🎯 Session Status:', session.status);
    console.log('👤 User ID:', session.metadata?.userId);
    console.log('🎯 Purpose:', session.metadata?.purpose);
    
    if (session.payment_status === 'paid') {
      console.log('\n🎉 Payment completed!');
      console.log('🔍 Now check:');
      console.log('   1. Stripe webhook logs');
      console.log('   2. Vercel function logs');
      console.log('   3. Firebase wallet balance');
    } else {
      console.log('\n❌ Payment not completed yet');
      console.log('🚀 Complete the payment at:');
      console.log('   ' + session.url);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPaymentStatus();
