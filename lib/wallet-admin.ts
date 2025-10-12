import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export interface Wallet {
  userId: string
  balanceCents: number
  updatedAt: Date
}

export interface WalletTransaction {
  id: string
  userId: string
  type: 'credit' | 'debit' | 'hold' | 'release' | 'settle'
  amountCents: number
  description?: string
  relatedId?: string
  createdAt: Date
}

const WALLETS = 'wallets'
const TXNS = 'walletTransactions'

export async function getWalletAdmin(userId: string): Promise<Wallet> {
  const adminDb = getAdminDb()
  const walletRef = adminDb.collection(WALLETS).doc(userId)
  const walletDoc = await walletRef.get()
  
  if (!walletDoc.exists) {
    const wallet: Wallet = { 
      userId, 
      balanceCents: 0, 
      updatedAt: new Date() 
    }
    await walletRef.set({
      ...wallet,
      updatedAt: FieldValue.serverTimestamp()
    })
    return wallet
  }
  
  const data = walletDoc.data()!
  return {
    userId,
    balanceCents: data.balanceCents || 0,
    updatedAt: data.updatedAt?.toDate?.() || new Date()
  }
}

export async function creditWalletAdmin(userId: string, amountCents: number, description?: string): Promise<void> {
  const wallet = await getWalletAdmin(userId)
  const newBalance = wallet.balanceCents + amountCents
  
  // Update wallet balance
  const adminDb = getAdminDb()
  await adminDb.collection(WALLETS).doc(userId).update({
    balanceCents: newBalance,
    updatedAt: FieldValue.serverTimestamp()
  })
  
  // Add transaction record
  await getAdminDb().collection(TXNS).add({
    userId,
    type: 'credit',
    amountCents,
    description: description || 'Wallet top-up',
    createdAt: FieldValue.serverTimestamp()
  })
}

export async function debitWalletAdmin(userId: string, amountCents: number, description?: string): Promise<boolean> {
  const wallet = await getWalletAdmin(userId)
  
  if (wallet.balanceCents < amountCents) {
    return false
  }
  
  const newBalance = wallet.balanceCents - amountCents
  
  // Update wallet balance
  const adminDb = getAdminDb()
  await adminDb.collection(WALLETS).doc(userId).update({
    balanceCents: newBalance,
    updatedAt: FieldValue.serverTimestamp()
  })
  
  // Add transaction record
  await adminDb.collection(TXNS).add({
    userId,
    type: 'debit',
    amountCents,
    description: description || 'Transfer charge',
    createdAt: FieldValue.serverTimestamp()
  })
  
  return true
}
