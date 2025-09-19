"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { auth } from "@/lib/firebase"

export default function BillingPage() {
  const { isAuthenticated, user, loading } = useAuth()
  const { subscription, usage, currentPlan, refreshSubscription } = useSubscription()
  const { balance, balanceDollars, isLoading: walletLoading, error: walletError, topUp, formatBalance, refreshBalance } = useWallet()
  const router = useRouter()
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loadingTopUp, setLoadingTopUp] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

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
    if (!user) return

    try {
      setLoadingPortal(true)
      
      // Get Firebase auth token
      const token = await auth.currentUser?.getIdToken()
      
      // Create billing portal session
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        let reason = 'Failed to create billing portal session'
        try {
          const data = await response.json()
          if (data?.error) reason = data.error
        } catch {}
        throw new Error(reason)
      }

      const { url } = await response.json()
      
      // Redirect to Stripe billing portal
      window.location.href = url
    } catch (error) {
      console.error('Error opening billing portal:', error)
      // Handle error (show toast, etc.)
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

  const currentUsage = usage || { dataTransferred: 0, transferCount: 0 }
  const monthlyLimit = currentPlan?.dataLimit || 1
  const usagePercentage = (currentUsage.dataTransferred / monthlyLimit) * 100

  const recentTransfers = [
    {
      id: "1",
      date: "2024-01-15",
      from: "Google Drive",
      to: "OneDrive",
      size: "2.4 GB",
      cost: "$0.024",
      status: "completed",
    },
    {
      id: "2",
      date: "2024-01-14",
      from: "Dropbox",
      to: "Google Drive",
      size: "890 MB",
      cost: "$0.009",
      status: "completed",
    },
    {
      id: "3",
      date: "2024-01-12",
      from: "OneDrive",
      to: "AWS S3",
      size: "5.2 GB",
      cost: "$0.052",
      status: "completed",
    },
  ]

  const monthlyStats = {
    totalTransfers: currentUsage.transferCount,
    totalData: formatDataSize(currentUsage.dataTransferred * 1024 * 1024 * 1024),
    totalCost: currentPlan?.price ? formatCurrency(currentPlan.price) : "$0.00",
    avgTransferSize: currentUsage.transferCount > 0 ? formatDataSize((currentUsage.dataTransferred / currentUsage.transferCount) * 1024 * 1024 * 1024) : "0 B",
  }

  return (
    <div className="min-h-screen bg-background">
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
                    {recentTransfers.map((transfer, index) => (
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
                    ))}
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
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center">
                        <span className="text-xs text-white font-bold">VISA</span>
                      </div>
                      <div>
                        <div className="font-medium">•••• 4242</div>
                        <div className="text-sm text-muted-foreground">Expires 12/26</div>
                      </div>
                    </div>
                    <Badge variant="secondary">Default</Badge>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full bg-transparent" 
                    onClick={handleManageBilling}
                    disabled={loadingPortal}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {loadingPortal ? "Opening..." : "Manage Billing"}
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
                      <p className="text-sm text-destructive">{walletError}</p>
                      <Button variant="outline" size="sm" onClick={refreshBalance} className="mt-2">
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
