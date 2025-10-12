#!/usr/bin/env node

/**
 * Environment Setup Helper
 * 
 * This script helps you set up the required environment variables.
 */

const fs = require('fs');
const path = require('path');

function setupEnvironment() {
  console.log('🔧 Environment Setup Helper\n');

  const envPath = path.join(process.cwd(), '.env.local');
  
  // Check if .env.local already exists
  if (fs.existsSync(envPath)) {
    console.log('✅ .env.local file already exists');
    console.log('📝 Current contents:');
    console.log(fs.readFileSync(envPath, 'utf8'));
    console.log('\n🔍 Please check if STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set correctly.');
    return;
  }

  // Create .env.local template
  const envContent = `# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# App Configuration
NEXT_PUBLIC_APP_URL=https://aqwa-cloud1-7iaj.vercel.app

# Firebase Configuration (if not already set)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=aust2-b8d21.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=aust2-b8d21
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=aust2-b8d21.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env.local file');
    console.log('📝 Please edit .env.local and replace the placeholder values with your actual keys');
  } catch (error) {
    console.error('❌ Failed to create .env.local file:', error.message);
    console.log('\n📝 Please create .env.local manually with this content:');
    console.log(envContent);
  }

  console.log('\n🔑 How to get your Stripe keys:');
  console.log('1. Go to: https://dashboard.stripe.com/test/apikeys');
  console.log('2. Copy your Secret key (sk_test_...)');
  console.log('3. Copy your Publishable key (pk_test_...)');
  console.log('4. Go to: https://dashboard.stripe.com/test/webhooks');
  console.log('5. Find your webhook endpoint');
  console.log('6. Copy the Signing secret (whsec_...)');
  console.log('7. Replace the placeholder values in .env.local');
  console.log('8. Restart your Next.js app');
}

setupEnvironment();
