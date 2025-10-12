#!/usr/bin/env node

/**
 * Validate Environment Variables
 * 
 * This script validates that all required environment variables are set correctly.
 */

require('dotenv').config({ path: '.env.local' });

function validateEnvironment() {
  console.log('🔍 Validating Environment Variables\n');

  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PROJECT_ID'
  ];

  let allValid = true;

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    
    if (!value) {
      console.log(`❌ ${varName}: Missing`);
      allValid = false;
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  });

  if (allValid) {
    console.log('\n🎉 All environment variables are valid!');
    console.log('✅ You can now restart your Next.js app');
  } else {
    console.log('\n❌ Some environment variables are invalid');
    console.log('📝 Please check your .env.local file');
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Fix any invalid environment variables');
  console.log('2. Restart your Next.js app: npm run dev');
  console.log('3. Test the application functionality');
}

validateEnvironment();
