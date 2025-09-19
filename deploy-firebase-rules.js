#!/usr/bin/env node

/**
 * Deploy Firebase Security Rules
 * 
 * This script helps you deploy the Firebase security rules to fix permission errors.
 * 
 * Prerequisites:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login to Firebase: firebase login
 * 3. Initialize Firebase project: firebase init firestore
 * 
 * Usage:
 * node deploy-firebase-rules.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Firebase Security Rules...\n');

// Check if firebase.json exists
if (!fs.existsSync('firebase.json')) {
  console.error('❌ firebase.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Check if firestore.rules exists
if (!fs.existsSync('firestore.rules')) {
  console.error('❌ firestore.rules not found. Please ensure the rules file exists.');
  process.exit(1);
}

try {
  // Deploy Firestore rules
  console.log('📝 Deploying Firestore security rules...');
  execSync('firebase deploy --only firestore:rules', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('\n✅ Firebase security rules deployed successfully!');
  console.log('\n🎉 Your app should now work without permission errors.');
  console.log('\n📋 Next steps:');
  console.log('1. Refresh your browser');
  console.log('2. Try the billing portal again');
  console.log('3. Check that wallet balance loads correctly');
  
} catch (error) {
  console.error('\n❌ Failed to deploy Firebase rules:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Make sure you have Firebase CLI installed: npm install -g firebase-tools');
  console.log('2. Login to Firebase: firebase login');
  console.log('3. Initialize Firebase project: firebase init firestore');
  console.log('4. Select your project: aust2-b8d21');
  console.log('5. Run this script again');
  
  process.exit(1);
}
