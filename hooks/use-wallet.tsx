'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './use-auth'
import { getWallet, creditWallet, debitWallet, estimateCostCents, PRICE_PER_GB_CENTS } from '@/lib/wallet'
import { auth } from '@/lib/firebase'

export interface UseWalletReturn {
  // Wallet state
  balance: number // in cents
  balanceDollars: number // in dollars
  isLoading: boolean
  error: string | null
  
  // Wallet actions
  topUp: (amountCents: number) => Promise<string>
  
  // Utility functions
  estimateTransferCost: (bytes: number) => number
  canAffordTransfer: (bytes: number) => boolean
  formatBalance: () => string
  
  // Refresh
  refreshBalance: () => Promise<void>
}

export function useWallet(): UseWalletReturn {
  const { user } = useAuth()
  const [balance, setBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load wallet balance
  const loadBalance = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const wallet = await getWallet(user.id)
      setBalance(wallet.balanceCents)
    } catch (err) {
      console.error('❌ Failed to load wallet balance:', err)
      setError(err instanceof Error ? err.message : 'Failed to load balance')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Top up wallet
  const topUp = useCallback(async (amountCents: number): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    try {
      // Get the Firebase user directly to access getIdToken
      const firebaseUser = auth.currentUser
      if (!firebaseUser) {
        throw new Error('No Firebase user found')
      }

      const token = await firebaseUser.getIdToken()
      if (!token) {
        throw new Error('Failed to get auth token')
      }

      const response = await fetch('/api/stripe/create-topup-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amountCents })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create top-up session')
      }

      const { url } = await response.json()
      return url
    } catch (err) {
      console.error('❌ Failed to create top-up session:', err)
      throw err
    }
  }, [user])

  // Estimate transfer cost
  const estimateTransferCost = useCallback((bytes: number): number => {
    return estimateCostCents(bytes)
  }, [])

  // Check if user can afford transfer
  const canAffordTransfer = useCallback((bytes: number): boolean => {
    const cost = estimateCostCents(bytes)
    return balance >= cost
  }, [balance])

  // Format balance for display
  const formatBalance = useCallback((): string => {
    const dollars = balance / 100
    return `$${dollars.toFixed(2)}`
  }, [balance])

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    await loadBalance()
  }, [loadBalance])

  // Load balance on mount and when user changes
  useEffect(() => {
    loadBalance()
  }, [loadBalance])

  return {
    balance,
    balanceDollars: balance / 100,
    isLoading,
    error,
    topUp,
    estimateTransferCost,
    canAffordTransfer,
    formatBalance,
    refreshBalance
  }
}
