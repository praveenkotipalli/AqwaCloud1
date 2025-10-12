#!/usr/bin/env node

/**
 * Get Environment Variables for Vercel
 * 
 * This script shows the environment variables you need to set in Vercel.
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

function getEnvVars() {
  console.log('🔧 Environment Variables for Vercel\n');
  
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PROJECT_ID',
    'NEXT_PUBLIC_APP_URL'
  ];
  
  console.log('📋 Add these to Vercel Environment Variables:\n');
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`${varName}=${value}`);
    } else {
      console.log(`${varName}=[MISSING]`);
    }
  });
  
  console.log('\n🚀 Steps to add in Vercel:');
  console.log('1. Go to: https://vercel.com/dashboard');
  console.log('2. Select project: aqwa-cloud1-7iaj');
  console.log('3. Go to Settings → Environment Variables');
  console.log('4. Add each variable above');
  console.log('5. Redeploy the project');
}

getEnvVars();
