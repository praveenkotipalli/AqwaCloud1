import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc, Timestamp } from 'firebase/firestore'

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

export interface WalletHold {
  id: string
  userId: string
  amountCents: number
  description?: string
  createdAt: Date
  releasedAt?: Date
  settledAt?: Date
}

const WALLETS = 'wallets'
const TXNS = 'walletTransactions'
const HOLDS = 'walletHolds'

export const PRICE_PER_GB_CENTS = 12 // $0.12/GB

export async function getWallet(userId: string): Promise<Wallet> {
  const ref = doc(db, WALLETS, userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    const wallet: Wallet = { userId, balanceCents: 0, updatedAt: new Date() }
    await setDoc(ref, { ...wallet, updatedAt: Timestamp.fromDate(wallet.updatedAt) })
    return wallet
  }
  const data = snap.data() as any
  return {
    userId,
    balanceCents: data.balanceCents || 0,
    updatedAt: data.updatedAt?.toDate?.() || new Date()
  }
}

export async function creditWallet(userId: string, amountCents: number, description?: string): Promise<void> {
  const wallet = await getWallet(userId)
  const newBalance = wallet.balanceCents + amountCents
  await updateDoc(doc(db, WALLETS, userId), {
    balanceCents: newBalance,
    updatedAt: serverTimestamp()
  })
  await addDoc(collection(db, TXNS), {
    userId,
    type: 'credit',
    amountCents,
    description: description || 'Wallet top-up',
    createdAt: serverTimestamp()
  })
}

export async function debitWallet(userId: string, amountCents: number, description?: string): Promise<boolean> {
  const wallet = await getWallet(userId)
  if (wallet.balanceCents < amountCents) return false
  const newBalance = wallet.balanceCents - amountCents
  await updateDoc(doc(db, WALLETS, userId), {
    balanceCents: newBalance,
    updatedAt: serverTimestamp()
  })
  await addDoc(collection(db, TXNS), {
    userId,
    type: 'debit',
    amountCents,
    description: description || 'Transfer charge',
    createdAt: serverTimestamp()
  })
  return true
}

export async function placeHold(userId: string, amountCents: number, description?: string): Promise<string> {
  const hold = await addDoc(collection(db, HOLDS), {
    userId,
    amountCents,
    description: description || 'Transfer hold',
    createdAt: serverTimestamp()
  })
  await addDoc(collection(db, TXNS), {
    userId,
    type: 'hold',
    amountCents,
    relatedId: hold.id,
    description,
    createdAt: serverTimestamp()
  })
  return hold.id
}

export async function releaseHold(userId: string, holdId: string): Promise<void> {
  await updateDoc(doc(db, HOLDS, holdId), {
    releasedAt: serverTimestamp()
  })
  await addDoc(collection(db, TXNS), {
    userId,
    type: 'release',
    amountCents: 0,
    relatedId: holdId,
    createdAt: serverTimestamp()
  })
}

export async function settleHold(userId: string, holdId: string, amountCents: number, description?: string): Promise<boolean> {
  const ok = await debitWallet(userId, amountCents, description || 'Transfer charge')
  if (!ok) return false
  await updateDoc(doc(db, HOLDS, holdId), {
    settledAt: serverTimestamp()
  })
  await addDoc(collection(db, TXNS), {
    userId,
    type: 'settle',
    amountCents,
    relatedId: holdId,
    description,
    createdAt: serverTimestamp()
  })
  return true
}

export function estimateCostCents(bytes: number): number {
  const gb = bytes / (1024 * 1024 * 1024)
  return Math.ceil(gb * PRICE_PER_GB_CENTS)
}
