"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Cloud,
  ArrowRightLeft,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Pause,
  Play,
  X,
  MoreHorizontal,
  FileText,
  ArrowLeft,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useCloudConnections } from "@/hooks/use-cloud-connections"
import { db } from "@/lib/firebase"
import { collection, doc, limit, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore"

interface Transfer {
  id: string
  date: string
  from: string
  to: string
  fromIcon: string
  toIcon: string
  size: string
  status: "completed" | "failed" | "in-progress" | "paused" | "scheduled"
  progress?: number
  cost: string
  files: number
  scheduledFor?: string
  errorMessage?: string
}

export default function TransfersPage() {
  const { isAuthenticated, user, loading } = useAuth()
  const { transferHistory, transferJobs } = useCloudConnections()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [fireHistory, setFireHistory] = useState<any[]>([])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  // Read transfer history from Firestore
  useEffect(() => {
    if (loading) return
    if (!user?.id) return

    const historyQ = query(
      collection(db, 'users', user.id, 'transferHistory'),
      orderBy('timestamp', 'desc')
    )

    const unsubHistory = onSnapshot(historyQ, snap => {
      console.log('📊 Transfers page - Firestore data received:', snap.docs.length, 'documents')
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
          fileNames: data.fileNames || []
        }
      })
      console.log('📊 Transfers page - Processed items:', items.length)
      setFireHistory(items)
    }, (error) => {
      console.error('❌ Transfers page - Firestore error:', error)
    })

    return () => unsubHistory()
  }, [user?.id, loading])

  // Build transfers list from real history + live jobs
  const allTransfers: Transfer[] = useMemo(() => {
    const formatAgo = (ts: number) => {
      const diff = Date.now() - ts
      const mins = Math.floor(diff / 60000)
      if (mins < 60) return `${mins} min${mins!==1?"s":""} ago`
      const hrs = Math.floor(mins / 60)
      if (hrs < 24) return `${hrs} hour${hrs!==1?"s":""} ago`
      const days = Math.floor(hrs / 24)
      return `${days} day${days!==1?"s":""} ago`
    }

    const iconFor = (service: string) => {
      const s = service.toLowerCase()
      if (s.includes('google')) return '🔵'
      if (s.includes('one')) return '🔷'
      if (s.includes('aws')) return '🟠'
      return '📦'
    }

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

    // Start from Firestore history (preferred) or local history as fallback
    const historySource = (fireHistory.length ? fireHistory : transferHistory || []).slice().sort((a, b) => b.timestamp - a.timestamp)
    const list: Transfer[] = historySource.map((t: any) => {
      const jobMatch = transferJobs.find(j => j.id === t.id)
      const isActive = jobMatch && jobMatch.status === 'transferring'
      const liveBytes = (jobMatch && liveBytesMap[jobMatch.id]) || liveBytesMap[t.id] || 0
      const bytes = isActive ? liveBytes : (t.totalBytes || liveBytes)
      const from = t.fromService || jobMatch?.sourceService || 'unknown'
      const to = t.toService || jobMatch?.destinationService || 'unknown'

      return {
        id: t.id,
        date: formatAgo(t.timestamp),
        from,
        to,
        fromIcon: iconFor(from),
        toIcon: iconFor(to),
        size: formatBytes(bytes),
        status: (jobMatch?.status === 'transferring' ? 'in-progress' : (t.status || 'completed')) as Transfer['status'],
        progress: jobMatch?.progress,
        cost: 'Free',
        files: Array.isArray(t.fileNames) ? t.fileNames.length : (jobMatch?.sourceFiles?.length || 0)
      }
    })

    // Include currently active jobs that might not be in history yet
    transferJobs.filter(j => !historySource.some((h: any) => h.id === j.id)).forEach(j => {
      const liveBytes = liveBytesMap[j.id] || 0
      list.push({
        id: j.id,
        date: 'Just now',
        from: j.sourceService,
        to: j.destinationService,
        fromIcon: iconFor(j.sourceService),
        toIcon: iconFor(j.destinationService),
        size: formatBytes(liveBytes),
        status: 'in-progress',
        progress: j.progress,
        cost: 'Free',
        files: j.sourceFiles?.length || 0
      })
    })

    return list
  }, [transferHistory, transferJobs, fireHistory])

  const handleRestartTransfer = (transferId: string) => {
    console.log("[v0] Restarting transfer:", transferId)
    // In real app, this would call API to restart the transfer
  }

  const handlePauseTransfer = (transferId: string) => {
    console.log("[v0] Pausing transfer:", transferId)
  }

  const handleResumeTransfer = (transferId: string) => {
    console.log("[v0] Resuming transfer:", transferId)
  }

  const handleCancelTransfer = (transferId: string) => {
    console.log("[v0] Cancelling transfer:", transferId)
  }

  // Filter transfers based on search and filters
  const filteredTransfers = allTransfers.filter((transfer) => {
    const matchesSearch =
      transfer.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.size.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || transfer.status === statusFilter

    // Simple date filtering - in real app, this would be more sophisticated
    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "today" && transfer.date.includes("hours ago")) ||
      (dateFilter === "week" && (transfer.date.includes("day") || transfer.date.includes("hours"))) ||
      (dateFilter === "month" && !transfer.date.includes("Scheduled"))

    return matchesSearch && matchesStatus && matchesDate
  })

  const getStatusBadge = (status: Transfer["status"], progress?: number) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      case "in-progress":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            In Progress ({progress}%)
          </Badge>
        )
      case "paused":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Pause className="h-3 w-3 mr-1" />
            Paused ({progress}%)
          </Badge>
        )
      case "scheduled":
        return (
          <Badge variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        )
      default:
        return null
    }
  }

  const getActionButtons = (transfer: Transfer) => {
    switch (transfer.status) {
      case "failed":
        return (
          <Button size="sm" variant="outline" onClick={() => handleRestartTransfer(transfer.id)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Restart
          </Button>
        )
      case "in-progress":
        return (
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => handlePauseTransfer(transfer.id)}>
              <Pause className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleCancelTransfer(transfer.id)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      case "paused":
        return (
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => handleResumeTransfer(transfer.id)}>
              <Play className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleCancelTransfer(transfer.id)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      case "scheduled":
        return (
          <Button size="sm" variant="outline" onClick={() => handleCancelTransfer(transfer.id)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )
      default:
        return (
          <Button size="sm" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Cloud className="h-5 w-5 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading transfers...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-4 sm:px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center">
              <Cloud className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold gradient-text">AqwaCloud</span>
          </Link>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-xs sm:text-sm" asChild>
              <Link href="/transfer">
                <ArrowRightLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">New Transfer</span>
                <span className="sm:hidden">New</span>
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-20 sm:pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">All Transfers</h1>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">Manage and monitor all your file transfers</p>
            </motion.div>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search transfers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm sm:text-base"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-sm sm:text-base">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="text-sm sm:text-base">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setDateFilter("all")
                  }}
                  className="text-sm sm:text-base"
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transfers List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Transfer History
                  </CardTitle>
                  <CardDescription>
                    Showing {filteredTransfers.length} of {allTransfers.length} transfers
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTransfers.map((transfer, index) => (
                  <motion.div
                    key={transfer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="p-4 sm:p-6 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="text-xl sm:text-2xl">{transfer.fromIcon}</div>
                          <ArrowRightLeft className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          <div className="text-xl sm:text-2xl">{transfer.toIcon}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm sm:text-base lg:text-lg truncate">
                            {transfer.from} → {transfer.to}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {transfer.date} • {transfer.size} • {transfer.files} files • {transfer.cost}
                          </div>
                          {transfer.scheduledFor && (
                            <div className="text-xs sm:text-sm text-blue-600 mt-1">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {transfer.scheduledFor}
                            </div>
                          )}
                          {transfer.errorMessage && (
                            <div className="text-xs sm:text-sm text-red-600 mt-1">
                              <AlertCircle className="h-3 w-3 inline mr-1" />
                              {transfer.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-4 self-end sm:self-auto">
                        {getStatusBadge(transfer.status, transfer.progress)}
                        {getActionButtons(transfer)}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {filteredTransfers.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No transfers found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                        ? "Try adjusting your filters to see more results."
                        : "You haven't made any transfers yet."}
                    </p>
                    <Button asChild>
                      <Link href="/transfer">Start Your First Transfer</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
