#!/usr/bin/env node

/**
 * Manual Wallet Credit
 * 
 * This script manually credits your wallet with the amount you paid.
 * Use this to fix the wallet balance while we debug the webhook issue.
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

async function creditWallet(userId, amountCents, description = 'Manual credit') {
  console.log(`💰 Crediting wallet for user: ${userId}`);
  console.log(`💵 Amount: $${(amountCents / 100).toFixed(2)}`);
  console.log(`📝 Description: ${description}\n`);

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const WALLETS = 'wallets';
    const TXNS = 'walletTransactions';

    // 1. Get current wallet
    console.log('1. Getting current wallet...');
    const walletRef = doc(db, WALLETS, userId);
    const walletSnap = await getDoc(walletRef);
    
    let currentBalance = 0;
    if (walletSnap.exists()) {
      const data = walletSnap.data();
      currentBalance = data.balanceCents || 0;
      console.log(`   Current balance: $${(currentBalance / 100).toFixed(2)}`);
    } else {
      console.log('   No wallet found, creating new one...');
      await setDoc(walletRef, {
        userId: userId,
        balanceCents: 0,
        updatedAt: serverTimestamp()
      });
    }

    // 2. Credit wallet
    console.log('2. Crediting wallet...');
    const newBalance = currentBalance + amountCents;
    
    await updateDoc(walletRef, {
      balanceCents: newBalance,
      updatedAt: serverTimestamp()
    });

    // 3. Add transaction record
    await addDoc(collection(db, TXNS), {
      userId: userId,
      type: 'credit',
      amountCents: amountCents,
      description: description,
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
      console.log('\n🎉 Your wallet has been credited! Refresh your app to see the updated balance.');
    } else {
      console.log('   ❌ Wallet credit failed - balance mismatch');
    }

  } catch (error) {
    console.error('❌ Credit failed:', error);
  }
}

// Usage examples:
async function main() {
  const userId = 'lke7NBWdEOU31Cwcgbp6LOEKcq42'; // Your user ID from Firebase
  
  console.log('🔧 Manual Wallet Credit Tool\n');
  
  // Credit with different amounts
  const amounts = [
    { cents: 1000, desc: 'Manual credit - $10' },
    { cents: 2000, desc: 'Manual credit - $20' },
    { cents: 5000, desc: 'Manual credit - $50' },
    { cents: 10000, desc: 'Manual credit - $100' }
  ];
  
  console.log('Available credit amounts:');
  amounts.forEach((amount, index) => {
    console.log(`${index + 1}. $${(amount.cents / 100).toFixed(2)} - ${amount.desc}`);
  });
  
  console.log('\nTo credit your wallet, uncomment one of these lines:');
  console.log('// await creditWallet(userId, 1000, "Manual credit - $10");');
  console.log('// await creditWallet(userId, 2000, "Manual credit - $20");');
  console.log('// await creditWallet(userId, 5000, "Manual credit - $50");');
  console.log('// await creditWallet(userId, 10000, "Manual credit - $100");');
  
  // Uncomment the line below to credit your wallet with $10
  await creditWallet(userId, 1000, "Manual credit - $10");
  
  // Uncomment the line below to credit your wallet with $20
  // await creditWallet(userId, 2000, "Manual credit - $20");
  
  // Uncomment the line below to credit your wallet with $50
  // await creditWallet(userId, 5000, "Manual credit - $50");
  
  // Uncomment the line below to credit your wallet with $100
  // await creditWallet(userId, 10000, "Manual credit - $100");
}

main();
