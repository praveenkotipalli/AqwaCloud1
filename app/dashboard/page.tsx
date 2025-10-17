"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Cloud,
  Plus,
  ArrowRightLeft,
  TrendingUp,
  Download,
  DollarSign,
  CreditCard,
  FileText,
  ExternalLink,
  Zap,
  LogOut,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useCloudConnections } from "@/hooks/use-cloud-connections"
import { CountryFlag } from "@/components/country-flag"
import Image from "next/image"
import { db, auth } from "@/lib/firebase"
import { collection, doc, limit, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore"
import { useSearchParams } from "next/navigation"

function DashboardContent() {
  const { isAuthenticated, user, loading, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const asUserView = searchParams.get('asUser') === '1'
  const { connections, transferJobs, transferHistory, getRealTimeStats } = useCloudConnections()
  const [rtStats, setRtStats] = useState<any>(null)
  const [fireHistory, setFireHistory] = useState<any[]>([])
  const [fireMetrics, setFireMetrics] = useState<null | { monthTransfers?: number; monthBytes?: number; monthCost?: number; totalTransfers?: number; totalBytes?: number; totalCost?: number }>(null)

  useEffect(() => {
    // Add a small delay to prevent flash of login page
    const timer = setTimeout(() => {
      if (!loading && !isAuthenticated) {
        console.log('🔐 Redirecting to login - not authenticated')
        router.push("/login")
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [isAuthenticated, loading, router])

  // Redirect admins to admin dashboard unless forced user view
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const asUser = params.get('asUser') === '1'
    if (!loading && user?.role === 'admin' && !asUser) {
      router.replace('/admin')
    }
  }, [loading, user?.role, router])


  // Load Firestore data for this user (metrics + recent history)
  useEffect(() => {
    if (loading) return
    if (!user?.id) return

    // Metrics (aggregate) - live subscription
    const metricsRef = doc(db, "users", user.id, "metrics", "aggregate")
    const unsubMetrics = onSnapshot(metricsRef, snap => {
      if (snap.exists()) {
        const data = snap.data() as any
        setFireMetrics({
          monthTransfers: data.monthTransfers || 0,
          monthBytes: data.monthBytes || 0,
          monthCost: data.monthCost || 0,
          totalTransfers: data.totalTransfers || 0,
          totalBytes: data.totalBytes || 0,
          totalCost: data.totalCost || 0,
        })
      } else {
        setFireMetrics(null)
      }
    }, () => setFireMetrics(null))

    // Recent transfer history (live)
    const historyQ = query(
      collection(db, "users", user.id, "transferHistory"),
      orderBy("timestamp", "desc"),
      limit(25)
    )
    const unsubHistory = onSnapshot(historyQ, snap => {
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

    return () => {
      try { unsubMetrics() } catch {}
      try { unsubHistory() } catch {}
    }
  }, [loading, user?.id])

  const handleLogoClick = () => {
    // Authenticated users clicking logo should go to dashboard
    router.push("/dashboard")
  }

  // Defer conditional returns until after all hooks are called (Rules of Hooks)

  // Poll real-time stats periodically
  useEffect(() => {
    const update = () => {
      try {
        const stats = getRealTimeStats?.()
        setRtStats(stats)
      } catch {}
    }
    update()
    const id = setInterval(update, 5000)
    return () => clearInterval(id)
  }, [getRealTimeStats])

  // Derive live usage from transfer history
  const derivedUsage = useMemo(() => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0,0,0,0)

    const historySource = (fireHistory.length ? fireHistory : transferHistory) || []
    const monthly = historySource.filter((t: any) => t.timestamp >= monthStart.getTime())
    const transfersThisMonth = monthly.length
    const storageUsedGB = monthly.reduce((sum, t) => sum + (t.totalBytes || 0), 0) / (1024 * 1024 * 1024)

    return { transfersThisMonth, storageUsed: Math.round(storageUsedGB * 100) / 100 }
  }, [transferHistory, fireHistory])

  const currentUsage = fireMetrics
    ? {
        transfersThisMonth: fireMetrics.monthTransfers || 0,
        storageUsed: Math.round(((fireMetrics.monthBytes || 0) / (1024 * 1024 * 1024)) * 100) / 100,
      }
    : (user?.usage || derivedUsage)
  const usageLimit = 1000 // GB per month - unlimited for free platform
  const usagePercentage = (currentUsage.storageUsed / usageLimit) * 100

  const activeTransfers = useMemo(() => transferJobs.filter(j => j.status === 'transferring').length, [transferJobs])
  const historyForStats = useMemo(() => (fireHistory.length ? fireHistory : transferHistory) || [], [fireHistory, transferHistory])
  const completed = useMemo(() => historyForStats.filter((h: any) => h.status === 'completed').length, [historyForStats])
  const failed = useMemo(() => historyForStats.filter((h: any) => h.status === 'failed').length, [historyForStats])
  const successRate = useMemo(() => {
    const total = completed + failed
    if (total === 0) return 100
    return Math.round((completed / total) * 1000) / 10
  }, [completed, failed])

  // Free platform - no cost calculations
  const monthCostReal = 0
  const totalCostReal = 0

  const formatCost = (value: number) => {
    return 'Free'
  }

  const recentTransfers = useMemo(() => {
    const formatAgo = (ts: number) => {
      const diff = Date.now() - ts
      const mins = Math.floor(diff / 60000)
      if (mins < 60) return `${mins} min${mins!==1?'s':''} ago`
      const hrs = Math.floor(mins / 60)
      if (hrs < 24) return `${hrs} hour${hrs!==1?'s':''} ago`
      const days = Math.floor(hrs / 24)
      return `${days} day${days!==1?'s':''} ago`
    }

    const iconFor = (service: string) => {
      if (service.includes('google')) return '🔵'
      if (service.includes('one')) return '🔷'
      if (service.includes('aws')) return '🟠'
      return '📦'
    }

    const source = (fireHistory.length ? fireHistory : transferHistory) || []
    const formatBytes = (bytes: number) => {
      if (!bytes || bytes <= 0) return '—'
      const units = ['B','KB','MB','GB','TB']
      let i = 0
      let n = bytes
      while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
      const value = i === 0 ? n : Math.round(n * 10) / 10
      return `${value} ${units[i]}`
    }

    const liveBytesMap: Record<string, number> = (typeof window !== 'undefined' && (window as any).__aqwa_bytes) || {}

    return source.slice(0, 4).map((t: any) => {
      const jobMatch = transferJobs.find(j => j.id === t.id)
      const isActive = jobMatch && jobMatch.status === 'transferring'
      const liveBytes = (jobMatch && liveBytesMap[jobMatch.id]) || liveBytesMap[t.id] || 0
      const bytes = isActive ? liveBytes : (t.totalBytes || liveBytes)
      const from = t.fromService || jobMatch?.sourceService || 'unknown'
      const to = t.toService || jobMatch?.destinationService || 'unknown'
      const fromIcon = iconFor((from || '').toLowerCase())
      const toIcon = iconFor((to || '').toLowerCase())
      return {
        id: t.id,
        date: formatAgo(t.timestamp),
        from,
        to,
        fromIcon,
        toIcon,
        size: formatBytes(bytes),
        status: jobMatch?.status || t.status,
      }
    })
  }, [transferHistory, fireHistory, transferJobs])

  const connectedServices = useMemo(() => {
    const iconFor = (name: string) => name.toLowerCase().includes('google') ? '🔵' : '🔷'
    return (connections || []).map(c => ({
      name: c.name,
      icon: iconFor(c.name),
      connected: c.connected,
      lastSync: c.lastSync ? new Date(c.lastSync).toLocaleString() : '—'
    }))
  }, [connections])

  const quickStats = [
    {
      title: "Transfers This Month",
      value: currentUsage.transfersThisMonth.toString(),
      icon: <ArrowRightLeft className="h-4 w-4" />,
      trend: `${activeTransfers} active • ${connections.filter(c=>c.connected).length} connected`,
    },
    {
      title: "Data Transferred",
      value: `${currentUsage.storageUsed} GB`,
      icon: <Download className="h-4 w-4" />,
      trend: `${Math.round(usagePercentage)}% of ${usageLimit} GB`,
    },
    {
      title: "Active Transfers",
      value: activeTransfers.toString(),
      icon: <ArrowRightLeft className="h-4 w-4" />,
      trend: rtStats ? `${rtStats.activeTransfers || 0} in-queue` : '—',
    },
    {
      title: "Success Rate",
      value: `${successRate}%`,
      icon: <TrendingUp className="h-4 w-4" />,
      trend: `${completed} ok • ${failed} failed`,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Guarded content for loading and auth states */}
      {loading && (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
              <Cloud className="h-5 w-5 text-white animate-pulse" />
            </div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      )}
      {!loading && !isAuthenticated && null}
      {!loading && isAuthenticated && (
      <>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-4 sm:px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={handleLogoClick} className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
            <Image src="/images/aqwa-logo.jpg" alt="AqwaCloud Logo" width={28} height={28} className="rounded-lg sm:w-8 sm:h-8" />
            <span className="text-lg sm:text-xl font-bold gradient-text">AqwaCloud</span>
          </button>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <Badge variant="secondary" className="hidden sm:inline-flex">Dashboard</Badge>
            {user?.role === 'admin' && asUserView && (
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin">Admin View</Link>
              </Button>
            )}
            <Button size="sm" className="bg-accent hover:bg-accent/90 hidden sm:flex" asChild>
              <Link href="/transfer">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">New Transfer</span>
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => logout()} className="text-xs sm:text-sm">
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
            <CountryFlag />
          </div>
        </div>
      </nav>

      <div className="pt-20 sm:pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Welcome back, {user?.name}!</h1>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">Here's what's happening with your file transfers</p>
            </motion.div>
          </div>

          {/* Quick Stats */}
          <section className="mb-6 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {quickStats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                      <div className="text-muted-foreground">{stat.icon}</div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">{stat.trend}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Get started with common tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button className="h-auto p-4 sm:p-6 bg-accent hover:bg-accent/90" asChild>
                      <Link href="/transfer" className="flex flex-col items-center space-y-2">
                        <Plus className="h-6 w-6 sm:h-8 sm:w-8" />
                        <div className="text-center">
                          <div className="font-semibold text-sm sm:text-base">Start New Transfer</div>
                          <div className="text-xs sm:text-sm opacity-90">Move files between cloud services</div>
                        </div>
                      </Link>
                    </Button>

                    <Button variant="outline" className="h-auto p-4 sm:p-6 bg-transparent" asChild>
                      <Link href="/transfers" className="flex flex-col items-center space-y-2">
                        <FileText className="h-6 w-6 sm:h-8 sm:w-8" />
                        <div className="text-center">
                          <div className="font-semibold text-sm sm:text-base">View Transfers</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">Check transfer history</div>
                        </div>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Transfers */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Recent Transfers
                      </CardTitle>
                      <CardDescription>Your latest file transfer activity</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/transfers">
                        View All
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentTransfers.map((transfer, index) => (
                      <motion.div
                        key={transfer.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors space-y-3 sm:space-y-0"
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                          <div className="flex items-center space-x-2">
                            <div className="text-xl sm:text-2xl">{transfer.fromIcon}</div>
                            <ArrowRightLeft className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                            <div className="text-xl sm:text-2xl">{transfer.toIcon}</div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm sm:text-base truncate">
                              {transfer.from} → {transfer.to}
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              {transfer.date} • {transfer.size}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 self-end sm:self-auto">
                          {transfer.status === "completed" ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-xs">
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">Failed</Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              {/* Connected Services */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Cloud className="h-5 w-5 mr-2" />
                        Connected Services
                      </CardTitle>
                      <CardDescription>Manage your cloud connections</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/connections">Manage</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {connectedServices.map((service, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-xl">{service.icon}</div>
                          <div>
                            <div className="font-medium text-sm">{service.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {service.connected ? `Synced ${service.lastSync}` : "Not connected"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {service.connected ? (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          ) : (
                            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Usage Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage Overview</CardTitle>
                  <CardDescription>Current month's activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Data Transfer</span>
                        <span>
                          {currentUsage.storageUsed} GB
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-accent to-secondary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 text-center">
                        <div>
                          <div className="text-lg sm:text-2xl font-bold gradient-text">{currentUsage.transfersThisMonth}</div>
                          <div className="text-xs text-muted-foreground">Transfers</div>
                        </div>
                        <div>
                          <div className="text-lg sm:text-2xl font-bold gradient-text">Free</div>
                          <div className="text-xs text-muted-foreground">No Cost</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Settings</CardTitle>
                  <CardDescription>Manage your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link href="/settings">Account Settings</Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link href="/alerts">Configure Alerts</Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link href="/transfers">Transfer History</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
