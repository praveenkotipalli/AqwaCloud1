"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { db, auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Cloud,
  ArrowLeft,
  CreditCard,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  FileText,
  Settings,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useSubscription } from "@/hooks/use-subscription"
import { useWallet } from "@/hooks/use-wallet"
import { formatCurrency, formatDataSize } from "@/lib/subscription"
import { getStripe } from "@/lib/stripe"
import { collection, limit, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore"

export default function BillingPage() {
  const { isAuthenticated, user, loading } = useAuth()
  const { subscription, usage, currentPlan, refreshSubscription } = useSubscription()
  const { balance, balanceDollars, isLoading: walletLoading, error: walletError, topUp, formatBalance, refreshBalance } = useWallet()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loadingTopUp, setLoadingTopUp] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; brand?: string; last4?: string; exp_month?: number; exp_year?: number; isDefault?: boolean }>>([])
  const [fireHistory, setFireHistory] = useState<Array<{ id: string; timestamp: number; fromService: string; toService: string; totalBytes: number; costUsd: number; status: string }>>([])
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  // Handle success redirect from Stripe
  useEffect(() => {
    const status = searchParams.get('status')
    if (status === 'success') {
      setShowSuccessMessage(true)
      // Refresh wallet balance and subscription data with error handling
      try {
        refreshBalance()
        refreshSubscription()
      } catch (error) {
        console.error('Error refreshing data after payment:', error)
      }
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000)
    }
  }, [searchParams, refreshBalance, refreshSubscription])

  // Refresh payment methods when returning from Stripe portal
  const fetchPaymentMethods = async () => {
    try {
      const u = auth.currentUser
      if (!u) return
      const token = await u.getIdToken()
      // Ensure we have a Stripe customer and persist its ID to the user profile
      await fetch('/api/stripe/ensure-customer', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const resp = await fetch('/api/stripe/payment-methods', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (resp.ok) {
        const data = await resp.json()
        console.log('payment methods response:', data)
        setPaymentMethods(data.paymentMethods || [])
      } else {
        console.warn('Fetch payment methods failed:', resp.status)
      }
    } catch (e) {
      console.warn('Fetch payment methods error:', e)
    }
  }

  useEffect(() => {
    fetchPaymentMethods()
    const onFocus = () => fetchPaymentMethods()
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchPaymentMethods() }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onVisibility)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Cloud className="h-5 w-5 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const handleManageBilling = async () => {
    if (!user) {
      console.error('No user found')
      alert('Please log in to manage billing')
      return
    }

    console.log('Opening billing portal for user:', user.id)
    setLoadingPortal(true)
    
    try {
      // Get Firebase auth token
      const firebaseUser = auth.currentUser
      if (!firebaseUser) {
        throw new Error('No Firebase user found')
      }

      const token = await firebaseUser.getIdToken()
      if (!token) {
        throw new Error('Failed to get auth token')
      }

      console.log('Making API call to create portal session...')
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('Portal session response status:', response.status)

      if (!response.ok) {
        let reason = 'Failed to create billing portal session'
        try {
          const data = await response.json()
          console.error('Portal session error data:', data)
          if (data?.error) reason = data.error
        } catch (e) {
          console.error('Failed to parse error response:', e)
        }
        throw new Error(reason)
      }

      const { url } = await response.json()
      console.log('Portal URL received:', url)
      
      if (url) {
        // Redirect to Stripe billing portal
        window.location.href = url
      } else {
        throw new Error('No portal URL received')
      }
    } catch (error) {
      console.error('Error opening billing portal:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error opening billing portal: ${errorMessage}`)
    } finally {
      setLoadingPortal(false)
    }
  }

  const handleTopUp = async (amountCents: number) => {
    try {
      setLoadingTopUp(`${amountCents}`)
      const url = await topUp(amountCents)
      window.location.href = url
    } catch (error) {
      console.error('Error creating top-up session:', error)
      alert('Failed to create top-up session')
    } finally {
      setLoadingTopUp(null)
    }
  }

  // Load recent transfers from Firestore (same as Dashboard)
  useEffect(() => {
    if (loading) return
    if (!user?.id) return

    const historyQ = query(
      collection(db, "users", user.id, "transferHistory"),
      orderBy("timestamp", "desc"),
      limit(25)
    )
    const unsub = onSnapshot(historyQ, snap => {
      const items = snap.docs.map(d => {
        const data: any = d.data()
        const ts = (data.timestamp instanceof Timestamp) ? data.timestamp.toMillis() : (data.timestamp || Date.now())
        return {
          id: d.id,
          timestamp: ts,
          fromService: data.fromService,
          toService: data.toService,
          totalBytes: data.totalBytes || 0,
          costUsd: data.costUsd || 0,
          status: data.status || "completed",
        }
      })
      setFireHistory(items)
    })

    return () => { try { unsub() } catch {} }
  }, [loading, user?.id])

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return "—"
    const units = ["B","KB","MB","GB","TB"]
    let i = 0
    let n = bytes
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
    const value = i === 0 ? n : Math.round(n * 10) / 10
    return `${value} ${units[i]}`
  }

  const currentUsage = usage || { dataTransferred: 0, transferCount: 0 }
  const monthlyLimit = currentPlan?.dataLimit || 1
  const usagePercentage = (currentUsage.dataTransferred / monthlyLimit) * 100

  const recentTransfers = fireHistory.slice(0, 10).map(item => ({
    id: item.id,
    date: new Date(item.timestamp).toLocaleString(),
    from: item.fromService,
    to: item.toService,
    size: formatBytes(item.totalBytes),
    cost: `$${(item.costUsd || 0).toFixed(3)}`,
    status: item.status
  }))

  const monthlyStats = {
    totalTransfers: currentUsage.transferCount,
    totalData: formatDataSize(currentUsage.dataTransferred * 1024 * 1024 * 1024),
    totalCost: currentPlan?.price ? formatCurrency(currentPlan.price) : "$0.00",
    avgTransferSize: currentUsage.transferCount > 0 ? formatDataSize((currentUsage.dataTransferred / currentUsage.transferCount) * 1024 * 1024 * 1024) : "0 B",
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 text-center">
          <p className="text-sm font-medium">✅ Payment successful! Your wallet has been topped up and you've been upgraded to Pro tier.</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center">
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AqwaCloud</span>
          </Link>

          <div className="flex items-center space-x-4">
            <Badge variant="secondary">Billing & Usage</Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-4xl font-bold mb-2">Billing & Usage</h1>
              <p className="text-xl text-muted-foreground">Track your transfers and manage your account billing</p>
            </motion.div>
          </div>

          {/* Current Usage Overview */}
          <section className="mb-8">
            <div className="grid md:grid-cols-4 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold gradient-text">{monthlyStats.totalTransfers}</div>
                    <p className="text-xs text-muted-foreground">transfers completed</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Download className="h-4 w-4 mr-2" />
                      Data Transferred
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold gradient-text">{monthlyStats.totalData}</div>
                    <p className="text-xs text-muted-foreground">across all services</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Total Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold gradient-text">{monthlyStats.totalCost}</div>
                    <p className="text-xs text-muted-foreground">this billing period</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Avg Transfer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold gradient-text">{monthlyStats.avgTransferSize}</div>
                    <p className="text-xs text-muted-foreground">per transfer</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Transfers */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Recent Transfers
                  </CardTitle>
                  <CardDescription>Your latest file transfer activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentTransfers.length > 0 ? recentTransfers.map((transfer, index) => (
                      <motion.div
                        key={transfer.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{transfer.from}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{transfer.to}</span>
                            <Badge variant="secondary" className="ml-2">
                              {transfer.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transfer.date} • {transfer.size}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{transfer.cost}</div>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-center text-sm text-muted-foreground py-6">NO RECENT TRANSFER</div>
                    )}
                  </div>

                  <div className="mt-6 text-center">
                    <Button variant="outline">View All Transfers</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Billing Info */}
            <div className="space-y-6">
              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paymentMethods.length === 0 ? (
                    <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                      <div className="text-sm text-muted-foreground">
                        No payment method on file yet.
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Use Manage Billing to add a card in the Stripe portal.
                      </div>
                    </div>
                  ) : (
                    paymentMethods.map(pm => (
                      <div key={pm.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center">
                            <span className="text-xs text-white font-bold">{(pm.brand || 'CARD').toUpperCase()}</span>
                          </div>
                          <div>
                            <div className="font-medium">•••• {pm.last4}</div>
                            <div className="text-sm text-muted-foreground">Expires {pm.exp_month?.toString().padStart(2,'0')}/{pm.exp_year}</div>
                          </div>
                        </div>
                        {pm.isDefault && <Badge variant="secondary">Default</Badge>}
                      </div>
                    ))
                  )}

                  <Button 
                    variant="outline" 
                    className="w-full bg-transparent" 
                    onClick={handleManageBilling}
                    disabled={loadingPortal}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {loadingPortal ? "Opening..." : "Manage Billing"}
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full bg-transparent"
                    onClick={fetchPaymentMethods}
                  >
                    Refresh Payment Methods
                  </Button>
                </CardContent>
              </Card>

              {/* Wallet Balance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Wallet Balance
                  </CardTitle>
                  <CardDescription>Prepaid credits for transfers ($0.12/GB)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {walletLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading balance...</p>
                    </div>
                  ) : walletError ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-destructive">Error loading wallet: {walletError}</p>
                      <Button variant="outline" size="sm" onClick={() => {
                        try {
                          refreshBalance()
                        } catch (error) {
                          console.error('Error refreshing balance:', error)
                        }
                      }} className="mt-2">
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="text-center p-4 rounded-lg border border-border/50 bg-muted/30">
                        <div className="text-3xl font-bold gradient-text">{formatBalance()}</div>
                        <p className="text-sm text-muted-foreground mt-1">Available balance</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Quick Top-up:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTopUp(1000)}
                            disabled={loadingTopUp === '1000'}
                          >
                            {loadingTopUp === '1000' ? 'Loading...' : '$10'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTopUp(2000)}
                            disabled={loadingTopUp === '2000'}
                          >
                            {loadingTopUp === '2000' ? 'Loading...' : '$20'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTopUp(5000)}
                            disabled={loadingTopUp === '5000'}
                          >
                            {loadingTopUp === '5000' ? 'Loading...' : '$50'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTopUp(10000)}
                            disabled={loadingTopUp === '10000'}
                          >
                            {loadingTopUp === '10000' ? 'Loading...' : '$100'}
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground text-center">
                        Transfers cost $0.12 per GB. Balance is automatically deducted when transfers complete.
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Next Billing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Next Billing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billing Date</span>
                      <span className="font-medium">
                        {subscription?.currentPeriodEnd ? 
                          new Date(subscription.currentPeriodEnd).toLocaleDateString() : 
                          "N/A"
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="font-medium">{currentPlan?.name || "Free"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Usage</span>
                      <span className="font-medium">
                        {formatDataSize(currentUsage.dataTransferred * 1024 * 1024 * 1024)} / {formatDataSize(monthlyLimit * 1024 * 1024 * 1024)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Monthly Cost</span>
                      <span className="gradient-text">{monthlyStats.totalCost}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Usage Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage Alerts</CardTitle>
                  <CardDescription>Get notified about your usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email at $10 usage</span>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email at $25 usage</span>
                    <Badge variant="outline">Inactive</Badge>
                  </div>

                  <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                    <Link href="/alerts">Configure Alerts</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
