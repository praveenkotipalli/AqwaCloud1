"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "./use-auth"
import { getUserWithSubscription, canUserTransfer, updateUserUsage } from "@/lib/firebase-subscriptions"
import { SUBSCRIPTION_PLANS, formatDataSize, bytesToGB } from "@/lib/subscription"

interface SubscriptionContextType {
  subscription: any | null
  usage: any | null
  currentPlan: any | null
  loading: boolean
  canTransfer: (sizeBytes: number) => Promise<{
    canTransfer: boolean
    reason?: string
    upgradeRequired?: boolean
  }>
  recordTransfer: (sizeBytes: number) => Promise<void>
  refreshSubscription: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [subscription, setSubscription] = useState<any | null>(null)
  const [usage, setUsage] = useState<any | null>(null)
  const [currentPlan, setCurrentPlan] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSubscription = async () => {
    if (!user || !isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { subscription: subData, usage: usageData } = await getUserWithSubscription(user.id)
      
      setSubscription(subData)
      setUsage(usageData)
      
      // Set current plan
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === (subData?.planId || 'free'))
      setCurrentPlan(plan)
    } catch (error) {
      console.error('Error refreshing subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSubscription()
  }, [user, isAuthenticated])

  const canTransfer = async (sizeBytes: number): Promise<{
    canTransfer: boolean
    reason?: string
    upgradeRequired?: boolean
  }> => {
    if (!user) {
      return {
        canTransfer: false,
        reason: 'User not authenticated'
      }
    }

    try {
      const sizeGB = bytesToGB(sizeBytes)
      const result = await canUserTransfer(user.id, sizeGB)
      return result
    } catch (error) {
      console.error('Error checking transfer eligibility:', error)
      return {
        canTransfer: false,
        reason: 'Error checking transfer eligibility'
      }
    }
  }

  const recordTransfer = async (sizeBytes: number): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      const sizeGB = bytesToGB(sizeBytes)
      await updateUserUsage(user.id, sizeGB, 1)
      
      // Refresh usage data
      await refreshSubscription()
    } catch (error) {
      console.error('Error recording transfer:', error)
      throw error
    }
  }

  const value = {
    subscription,
    usage,
    currentPlan,
    loading,
    canTransfer,
    recordTransfer,
    refreshSubscription,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
