#!/usr/bin/env node

/**
 * Test Wallet Credit
 * 
 * This script manually credits the wallet to test if the wallet system works.
 * Run this to verify the wallet functionality before debugging webhook issues.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc } = require('firebase/firestore');

// Firebase config (same as your app)
const firebaseConfig = {
  apiKey: "AIzaSyBvQZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8",
  authDomain: "aust2-b8d21.firebaseapp.com",
  projectId: "aust2-b8d21",
  storageBucket: "aust2-b8d21.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

async function testWalletCredit() {
  console.log('🧪 Testing Wallet Credit...\n');

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Replace with your actual user ID (you can find this in Firebase Console)
    const testUserId = 'YOUR_USER_ID_HERE'; // Replace this!
    
    if (testUserId === 'YOUR_USER_ID_HERE') {
      console.log('❌ Please replace testUserId with your actual user ID');
      console.log('   You can find this in Firebase Console > Authentication > Users');
      return;
    }

    console.log(`Testing with user ID: ${testUserId}`);

    // Test wallet functions
    const WALLETS = 'wallets';
    const TXNS = 'walletTransactions';

    // 1. Get current wallet
    console.log('1. Getting current wallet...');
    const walletRef = doc(db, WALLETS, testUserId);
    const walletSnap = await getDoc(walletRef);
    
    let currentBalance = 0;
    if (walletSnap.exists()) {
      const data = walletSnap.data();
      currentBalance = data.balanceCents || 0;
      console.log(`   Current balance: $${(currentBalance / 100).toFixed(2)}`);
    } else {
      console.log('   No wallet found, creating new one...');
      await setDoc(walletRef, {
        userId: testUserId,
        balanceCents: 0,
        updatedAt: serverTimestamp()
      });
    }

    // 2. Credit wallet with $10
    console.log('2. Crediting wallet with $10...');
    const creditAmount = 1000; // $10 in cents
    const newBalance = currentBalance + creditAmount;
    
    await updateDoc(walletRef, {
      balanceCents: newBalance,
      updatedAt: serverTimestamp()
    });

    // 3. Add transaction record
    await addDoc(collection(db, TXNS), {
      userId: testUserId,
      type: 'credit',
      amountCents: creditAmount,
      description: 'Test credit - $10',
      createdAt: serverTimestamp()
    });

    console.log(`   ✅ Wallet credited! New balance: $${(newBalance / 100).toFixed(2)}`);

    // 4. Verify the credit
    console.log('3. Verifying credit...');
    const updatedSnap = await getDoc(walletRef);
    const updatedData = updatedSnap.data();
    const verifiedBalance = updatedData.balanceCents || 0;
    
    console.log(`   Verified balance: $${(verifiedBalance / 100).toFixed(2)}`);
    
    if (verifiedBalance === newBalance) {
      console.log('   ✅ Wallet credit successful!');
    } else {
      console.log('   ❌ Wallet credit failed - balance mismatch');
    }

    console.log('\n🎉 Test completed! Check your app to see if the balance updated.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWalletCredit();
