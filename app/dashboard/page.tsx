"use client"

import { useEffect } from "react"
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
import Image from "next/image"

export default function DashboardPage() {
  const { isAuthenticated, user, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  const handleLogoClick = () => {
    // Authenticated users clicking logo should go to dashboard
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Cloud className="h-5 w-5 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const currentUsage = user?.usage || { transfersThisMonth: 5, storageUsed: 2.4 }
  const usageLimit = 50 // GB per month for free tier
  const usagePercentage = (currentUsage.storageUsed / usageLimit) * 100

  const recentTransfers = [
    {
      id: "1",
      date: "2 hours ago",
      from: "Google Drive",
      to: "OneDrive",
      fromIcon: "🔵",
      toIcon: "🔷",
      size: "2.4 GB",
      status: "completed",
    },
    {
      id: "2",
      date: "1 day ago",
      from: "Dropbox",
      to: "Google Drive",
      fromIcon: "🔹",
      toIcon: "🔵",
      size: "890 MB",
      status: "completed",
    },
    {
      id: "3",
      date: "3 days ago",
      from: "OneDrive",
      to: "AWS S3",
      fromIcon: "🔷",
      toIcon: "🟠",
      size: "1.2 GB",
      status: "failed",
    },
  ]

  const connectedServices = [
    { name: "Google Drive", icon: "🔵", connected: true, lastSync: "2 hours ago" },
    { name: "OneDrive", icon: "🔷", connected: true, lastSync: "1 day ago" },
    { name: "Dropbox", icon: "🔹", connected: false, lastSync: "Never" },
    { name: "AWS S3", icon: "🟠", connected: true, lastSync: "3 days ago" },
  ]

  const quickStats = [
    {
      title: "Transfers This Month",
      value: currentUsage.transfersThisMonth.toString(),
      icon: <ArrowRightLeft className="h-4 w-4" />,
      trend: "+2 from last month",
    },
    {
      title: "Data Transferred",
      value: `${currentUsage.storageUsed} GB`,
      icon: <Download className="h-4 w-4" />,
      trend: `${Math.round(usagePercentage)}% of limit used`,
    },
    {
      title: "This Month's Cost",
      value: `$${(currentUsage.storageUsed * 0.01).toFixed(3)}`,
      icon: <DollarSign className="h-4 w-4" />,
      trend: "Pay-per-use pricing",
    },
    {
      title: "Success Rate",
      value: "98.5%",
      icon: <TrendingUp className="h-4 w-4" />,
      trend: "Above average",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={handleLogoClick} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <Image src="/images/aqwa-logo.jpg" alt="AqwaCloud Logo" width={32} height={32} className="rounded-lg" />
            <span className="text-xl font-bold gradient-text">AqwaCloud</span>
          </button>

          <div className="flex items-center space-x-4">
            <Badge variant="secondary">Dashboard</Badge>
            <Button size="sm" className="bg-accent hover:bg-accent/90" asChild>
              <Link href="/transfer">
                <Plus className="h-4 w-4 mr-2" />
                New Transfer
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => logout()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.name}!</h1>
              <p className="text-xl text-muted-foreground">Here's what's happening with your file transfers</p>
            </motion.div>
          </div>

          {/* Quick Stats */}
          <section className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
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
                  <div className="grid md:grid-cols-2 gap-4">
                    <Button className="h-auto p-6 bg-accent hover:bg-accent/90" asChild>
                      <Link href="/transfer" className="flex flex-col items-center space-y-2">
                        <Plus className="h-8 w-8" />
                        <div className="text-center">
                          <div className="font-semibold">Start New Transfer</div>
                          <div className="text-sm opacity-90">Move files between cloud services</div>
                        </div>
                      </Link>
                    </Button>

                    <Button variant="outline" className="h-auto p-6 bg-transparent" asChild>
                      <Link href="/billing" className="flex flex-col items-center space-y-2">
                        <CreditCard className="h-8 w-8" />
                        <div className="text-center">
                          <div className="font-semibold">View Billing</div>
                          <div className="text-sm text-muted-foreground">Check usage and costs</div>
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
                        className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className="text-2xl">{transfer.fromIcon}</div>
                            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                            <div className="text-2xl">{transfer.toIcon}</div>
                          </div>
                          <div>
                            <div className="font-medium">
                              {transfer.from} → {transfer.to}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {transfer.date} • {transfer.size}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {transfer.status === "completed" ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
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
                          {currentUsage.storageUsed} GB / {usageLimit} GB
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
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold gradient-text">{currentUsage.transfersThisMonth}</div>
                          <div className="text-xs text-muted-foreground">Transfers</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold gradient-text">
                            ${(currentUsage.storageUsed * 0.01).toFixed(3)}
                          </div>
                          <div className="text-xs text-muted-foreground">Cost</div>
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
                      <Link href="/payment-methods">Payment Methods</Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link href="/upgrade">Upgrade Plan</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
