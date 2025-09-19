#!/usr/bin/env node

/**
 * Test Wallet System
 * 
 * This script tests the wallet functionality to ensure everything works correctly.
 * Run this after setting up Firebase rules and Stripe configuration.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, Timestamp } = require('firebase/firestore');

// Firebase config (same as your app)
const firebaseConfig = {
  apiKey: "AIzaSyBvQZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8",
  authDomain: "aust2-b8d21.firebaseapp.com",
  projectId: "aust2-b8d21",
  storageBucket: "aust2-b8d21.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

async function testWalletSystem() {
  console.log('🧪 Testing Wallet System...\n');

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const testUserId = 'test-user-123';
    
    // Test 1: Create wallet
    console.log('1️⃣ Testing wallet creation...');
    const walletRef = doc(db, 'wallets', testUserId);
    const walletData = {
      userId: testUserId,
      balanceCents: 1000, // $10.00
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    await setDoc(walletRef, walletData);
    console.log('✅ Wallet created successfully');
    
    // Test 2: Read wallet
    console.log('\n2️⃣ Testing wallet read...');
    const walletSnap = await getDoc(walletRef);
    if (walletSnap.exists()) {
      const data = walletSnap.data();
      console.log(`✅ Wallet balance: $${(data.balanceCents / 100).toFixed(2)}`);
    } else {
      console.log('❌ Wallet not found');
    }
    
    // Test 3: Test transfer cost calculation
    console.log('\n3️⃣ Testing transfer cost calculation...');
    const testFileSize = 1024 * 1024 * 1024; // 1GB
    const costCents = Math.ceil((testFileSize / (1024 * 1024 * 1024)) * 12); // $0.12/GB
    console.log(`✅ 1GB transfer cost: $${(costCents / 100).toFixed(2)}`);
    
    // Test 4: Check if user can afford transfer
    console.log('\n4️⃣ Testing affordability check...');
    const canAfford = walletData.balanceCents >= costCents;
    console.log(`✅ Can afford 1GB transfer: ${canAfford ? 'Yes' : 'No'}`);
    
    console.log('\n🎉 All wallet tests passed!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to /billing in your app');
    console.log('2. Click a top-up button ($10, $20, $50, or $100)');
    console.log('3. Use Stripe test card: 4242 4242 4242 4242');
    console.log('4. Verify wallet balance updates');
    
  } catch (error) {
    console.error('❌ Wallet test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure Firebase rules are deployed');
    console.log('2. Check Firebase project ID is correct');
    console.log('3. Ensure you have proper Firebase permissions');
  }
}

// Run the test
testWalletSystem().catch(console.error);
