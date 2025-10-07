"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ArrowRight,
  ArrowLeft,
  FolderOpen,
  File,
  Upload,
  Download,
  RefreshCw,
  Home,
  Settings,
  ChevronRight,
  ArrowLeftRight,
  Play,
  Pause,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Repeat,
  Loader2,
  DollarSign,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useSubscription } from "@/hooks/use-subscription"
import { useRouter } from "next/navigation"
import { useCloudConnections, FileItem } from "@/hooks/use-cloud-connections"
import { auth } from "@/lib/firebase"
import { GoogleDriveExplorer } from "@/components/google-drive-explorer"
import { OneDriveExplorer } from "@/components/onedrive-explorer"
import { BandwidthCalculator, TransferEstimate } from "@/lib/bandwidth-calculator"
import { UsageLimitModal } from "@/components/usage-limit-modal"
import { formatDataSize, bytesToGB } from "@/lib/subscription"
import { getStripe } from "@/lib/stripe"
import { PersistentTransfers } from "@/components/persistent-transfers"
import { usePersistentTransfers } from "@/hooks/use-persistent-transfers"
import { useWallet } from "@/hooks/use-wallet"

// Helper function to parse file size string to bytes
function parseFileSizeToBytes(sizeString?: string): number {
  if (!sizeString) return 0
  
  // Remove any non-numeric characters except decimal point
  const cleanSize = sizeString.replace(/[^\d.]/g, '')
  const size = parseFloat(cleanSize)
  
  if (isNaN(size)) return 0
  
  // Determine unit and convert to bytes
  if (sizeString.toLowerCase().includes('tb')) {
    return size * 1024 * 1024 * 1024 * 1024
  } else if (sizeString.toLowerCase().includes('gb')) {
    return size * 1024 * 1024 * 1024
  } else if (sizeString.toLowerCase().includes('mb')) {
    return size * 1024 * 1024
  } else if (sizeString.toLowerCase().includes('kb')) {
    return size * 1024
  } else {
    return size // Assume bytes if no unit
  }
}

interface TransferConfig {
  overwriteExisting: boolean
  preserveTimestamps: boolean
  createFolders: boolean
  skipExisting: boolean
}

interface ScheduleConfig {
  enabled: boolean
  type: "once" | "recurring"
  date: string
  time: string
  recurring?: {
    frequency: "daily" | "weekly" | "monthly"
    interval: number
    endDate?: string
  }
}

interface QueuedTransfer {
  id: string
  sourceFiles: string[]
  sourceService: string
  destinationService: string
  direction: "source-to-dest" | "dest-to-source"
  status: "queued" | "transferring" | "paused" | "completed" | "failed" | "scheduled"
  progress: number
  startTime?: Date
  endTime?: Date
  totalFiles: number
  transferredFiles: number
  schedule?: ScheduleConfig
  errorMessage?: string
}

export default function TransferPage() {
  const { isAuthenticated, user } = useAuth()
  const { subscription, usage, currentPlan, canTransfer, recordTransfer } = useSubscription()
  const router = useRouter()
  const { 
    connections, 
    transferJobs, 
    activeSessions,
    startTransfer, 
    startRealTimeTransfer,
    pauseTransfer, 
    resumeTransfer, 
    cancelTransfer,
    stopRealTimeTransfer,
    getRealTimeStats
  } = useCloudConnections()

  // Persistent transfers hook
  const { startTransfer: startPersistentTransfer } = usePersistentTransfers()

  // Wallet hook
  const { balance, formatBalance, estimateTransferCost, canAffordTransfer, refreshBalance } = useWallet()

  const [sourceService, setSourceService] = useState<string>("")
  const [destinationService, setDestinationService] = useState<string>("")
  const [selectedSourceFiles, setSelectedSourceFiles] = useState<FileItem[]>([])
  const [selectedDestFiles, setSelectedDestFiles] = useState<FileItem[]>([])
  const [selectionSide, setSelectionSide] = useState<"source" | "destination" | null>(null)
  const [transferConfig, setTransferConfig] = useState<TransferConfig>({
    overwriteExisting: false,
    preserveTimestamps: true,
    createFolders: true,
    skipExisting: true,
  })

  const [enableRealTime, setEnableRealTime] = useState(true)
  const [realTimeStats, setRealTimeStats] = useState<any>(null)
  const [transferEstimate, setTransferEstimate] = useState<TransferEstimate | null>(null)
  // Bandwidth UI removed; use fixed default for estimates
  const defaultBandwidthMBps = 5

  const [transferQueue, setTransferQueue] = useState<QueuedTransfer[]>([])
  const [showQueue, setShowQueue] = useState(false)

  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false)
  const [loadingUpgrade, setLoadingUpgrade] = useState<string | null>(null)
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    enabled: false,
    type: "once",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    recurring: {
      frequency: "daily",
      interval: 1,
    },
  })

  // Get connected services
  const connectedServices = connections.filter(conn => conn.connected)

  // Calculate transfer estimate
  const calculateTransferEstimate = () => {
    if (selectedSourceFiles.length === 0 || !sourceService || !destinationService) {
      setTransferEstimate(null)
      return
    }

    const sourceConnection = getSelectedServiceConnection(sourceService)
    const destConnection = getSelectedServiceConnection(destinationService)
    
    if (!sourceConnection || !destConnection) {
      setTransferEstimate(null)
      return
    }

    // Use actual file sizes from the API
    const actualFileSizes = selectedSourceFiles.map(file => {
      if (file.type === 'folder') return 0
      return parseFileSizeToBytes(file.size)
    })

    const estimate = BandwidthCalculator.generateEstimate(
      actualFileSizes,
      sourceConnection.provider as 'google' | 'microsoft',
      destConnection.provider as 'google' | 'microsoft',
      defaultBandwidthMBps
    )

    setTransferEstimate(estimate)
  }

  // Update estimate when files or services change
  useEffect(() => {
    calculateTransferEstimate()
  }, [selectedSourceFiles, sourceService, destinationService])

  // Handle file selection from source
  const handleSourceFileSelect = (files: FileItem[]) => {
    setSelectedSourceFiles(files)
    setSelectionSide("source")
  }

  // Handle file selection from destination
  const handleDestFileSelect = (files: FileItem[]) => {
    setSelectedDestFiles(files)
    setSelectionSide("destination")
  }

  // Start transfer
  const handleStartTransfer = async () => {
    if (!sourceService || !destinationService || selectedSourceFiles.length === 0) {
      alert("Please select source service, destination service, and source files")
      return
    }

    // Calculate total size and cost
    const totalBytes = selectedSourceFiles.reduce((sum, file) => sum + parseFileSizeToBytes(file.size), 0)
    const totalGB = totalBytes / (1024 * 1024 * 1024)
    const costCents = estimateTransferCost(totalBytes)
    const isFreeTier = currentPlan?.id === 'free'
    const isProTier = currentPlan?.id === 'pro'
    const currentUsageGB = usage?.dataTransferred || 0

    // Tier-based validation
    if (isFreeTier) {
      // Free tier: Check 1GB monthly limit
      if (currentUsageGB + totalGB > 1) {
        alert(`Free tier limit exceeded! You've used ${currentUsageGB.toFixed(2)}GB of your 1GB monthly limit. Top up your wallet to upgrade to Pro tier.`)
        return
      }
      console.log(`Free tier transfer allowed: ${currentUsageGB.toFixed(2)}GB used, ${totalGB.toFixed(2)}GB to transfer`)
    } else if (isProTier) {
      // Pro tier: Check wallet balance
      if (balance === 0) {
        alert("No wallet credits available. Please top up your wallet to start transferring.")
        return
      }
      if (!canAffordTransfer(totalBytes)) {
        alert(`Insufficient wallet balance. You need $${(costCents / 100).toFixed(2)} but only have ${formatBalance()}. Please top up your wallet.`)
        return
      }
      console.log(`Pro tier transfer allowed: ${formatBalance()} available, $${(costCents / 100).toFixed(2)} required`)
    } else {
      alert("Unknown tier status. Please refresh the page and try again.")
      return
    }

    try {
      // For free tier: Record usage only (no wallet deduction)
      // For pro tier: Deduct wallet credits
      if (isFreeTier) {
        await recordTransfer(totalBytes)
        console.log(`Free tier: Recorded ${totalGB.toFixed(2)}GB transfer usage`)
      } else if (isProTier) {
        // Deduct wallet credits for pro tier
        const firebaseUser = auth.currentUser
        if (!firebaseUser) {
          throw new Error('No Firebase user found')
        }
        
        const token = await firebaseUser.getIdToken()
        if (!token) {
          throw new Error('Failed to get auth token')
        }
        
        const response = await fetch('/api/wallet/debit', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            amountCents: costCents,
            description: `Transfer: ${selectedSourceFiles.length} files (${totalGB.toFixed(2)}GB)`
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to deduct wallet credits')
        }
        
        await refreshBalance() // Refresh wallet balance after deduction
        console.log(`Pro tier: Deducted $${(costCents / 100).toFixed(2)} from wallet`)
      }

      const jobId = enableRealTime 
        ? await startRealTimeTransfer(
            sourceService,
            destinationService,
            selectedSourceFiles,
            "/",
            true
          )
        : await startTransfer(
            sourceService,
            destinationService,
            selectedSourceFiles,
            "/"
          )

      // Add to local queue for display
      const newTransfer: QueuedTransfer = {
        id: jobId,
        sourceFiles: selectedSourceFiles.map(f => f.name),
        sourceService,
        destinationService,
        direction: "source-to-dest",
        status: enableRealTime ? "transferring" : "queued",
        progress: 0,
        startTime: new Date(),
        totalFiles: selectedSourceFiles.length,
        transferredFiles: 0
      }

      setTransferQueue(prev => [...prev, newTransfer])
      setSelectedSourceFiles([])
      setSelectionSide(null)

      const tierMessage = isFreeTier ? "Free tier" : "Pro tier"
      console.log(`${tierMessage} ${enableRealTime ? 'real-time' : 'standard'} transfer started with job ID: ${jobId}`)
    } catch (error) {
      console.error("Failed to start transfer:", error)
      alert("Failed to start transfer")
    }
  }

  // Start persistent transfer
  const handleStartPersistentTransfer = async () => {
    if (!sourceService || !destinationService || selectedSourceFiles.length === 0) {
      alert("Please select source service, destination service, and source files")
      return
    }

    // Calculate total size and cost
    const totalBytes = selectedSourceFiles.reduce((sum, file) => sum + parseFileSizeToBytes(file.size), 0)
    const totalGB = totalBytes / (1024 * 1024 * 1024)
    const costCents = estimateTransferCost(totalBytes)
    const isFreeTier = currentPlan?.id === 'free'
    const isProTier = currentPlan?.id === 'pro'
    const currentUsageGB = usage?.dataTransferred || 0

    // Tier-based validation
    if (isFreeTier) {
      // Free tier: Check 1GB monthly limit
      if (currentUsageGB + totalGB > 1) {
        alert(`Free tier limit exceeded! You've used ${currentUsageGB.toFixed(2)}GB of your 1GB monthly limit. Top up your wallet to upgrade to Pro tier.`)
        return
      }
      console.log(`Free tier transfer allowed: ${currentUsageGB.toFixed(2)}GB used, ${totalGB.toFixed(2)}GB to transfer`)
    } else if (isProTier) {
      // Pro tier: Check wallet balance
      if (balance === 0) {
        alert("No wallet credits available. Please top up your wallet to start transferring.")
        return
      }
      if (!canAffordTransfer(totalBytes)) {
        alert(`Insufficient wallet balance. You need $${(costCents / 100).toFixed(2)} but only have ${formatBalance()}. Please top up your wallet.`)
        return
      }
      console.log(`Pro tier transfer allowed: ${formatBalance()} available, $${(costCents / 100).toFixed(2)} required`)
    } else {
      alert("Unknown tier status. Please refresh the page and try again.")
      return
    }

    try {
      const sourceConnection = getSelectedServiceConnection(sourceService)
      const destConnection = getSelectedServiceConnection(destinationService)
      
      if (!sourceConnection || !destConnection) {
        alert("Invalid connection selected")
        return
      }

      // For free tier: Record usage only (no wallet deduction)
      // For pro tier: Deduct wallet credits
      if (isFreeTier) {
        await recordTransfer(totalBytes)
        console.log(`Free tier: Recorded ${totalGB.toFixed(2)}GB transfer usage`)
      } else if (isProTier) {
        // Deduct wallet credits for pro tier
        // Get Firebase auth token for API call
        const firebaseUser = auth.currentUser
        if (!firebaseUser) {
          throw new Error('No Firebase user found')
        }
        
        const token = await firebaseUser.getIdToken()
        if (!token) {
          throw new Error('Failed to get auth token')
        }
        
        const response = await fetch('/api/wallet/debit', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            amountCents: costCents,
            description: `Transfer: ${selectedSourceFiles.length} files (${totalGB.toFixed(2)}GB)`
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to deduct wallet credits')
        }
        
        await refreshBalance() // Refresh wallet balance after deduction
        console.log(`Pro tier: Deducted $${(costCents / 100).toFixed(2)} from wallet`)
      }

      // Start persistent transfer for each selected file
      for (const file of selectedSourceFiles) {
        await startPersistentTransfer(sourceConnection, destConnection, file)
      }

      setSelectedSourceFiles([])
      setSelectionSide(null)

      const tierMessage = isFreeTier ? "Free tier transfer" : "Pro tier transfer"
      console.log(`${tierMessage} started for ${selectedSourceFiles.length} files`)
      alert(`${tierMessage} started! Your files will continue transferring even if you log out.`)
    } catch (error) {
      console.error("Failed to start persistent transfer:", error)
      alert("Failed to start persistent transfer")
    }
  }

  // Handle upgrade
  const handleUpgrade = async (planId: string) => {
    setLoadingUpgrade(planId)
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      })
      
      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Upgrade failed:', error)
      alert('Failed to start upgrade process')
    } finally {
      setLoadingUpgrade(null)
    }
  }

  // Get selected service connection
  const getSelectedServiceConnection = (serviceId: string) => {
    const connection = connections.find(conn => conn.id === serviceId)
    return connection
  }

  // Check if transfer is allowed based on tier and limits
  const isTransferAllowed = () => {
    if (!sourceService || !destinationService || selectedSourceFiles.length === 0) {
      return false
    }

    const totalBytes = selectedSourceFiles.reduce((sum, file) => sum + parseFileSizeToBytes(file.size), 0)
    const totalGB = totalBytes / (1024 * 1024 * 1024)
    const costCents = estimateTransferCost(totalBytes)
    const isFreeTier = currentPlan?.id === 'free'
    const isProTier = currentPlan?.id === 'pro'
    const currentUsageGB = usage?.dataTransferred || 0

    if (isFreeTier) {
      // Free tier: Check 1GB monthly limit
      return currentUsageGB + totalGB <= 1
    } else if (isProTier) {
      // Pro tier: Check wallet balance
      return balance > 0 && canAffordTransfer(totalBytes)
    }

    return false // Unknown tier
  }



  // Listen for real-time transfer updates
  useEffect(() => {
    const handleRealTimeUpdate = (update: any) => {
      console.log('📡 Transfer page received real-time update:', update)
      if (update.type === 'progress' && update.data?.jobId) {
        setTransferQueue(prev => prev.map(transfer => {
          // Match queue item either by explicit id/envelope or by session + filename
          const sameId = transfer.id === update.data.jobId || update.data.jobId === transfer.id
          const sameEnvelope = update.id === `progress_${transfer.id}`
          const sameSession = typeof transfer.id === 'string' && update.data.sessionId && transfer.id.includes(update.data.sessionId)
          const sameFile = !!(update.data.fileName && transfer.sourceFiles.includes(update.data.fileName))
          const isMatchingTransfer = sameId || sameEnvelope || sameSession || sameFile

          if (isMatchingTransfer) {
            const nextProgress = typeof update.data.progress === 'number' ? Math.max(transfer.progress, update.data.progress) : transfer.progress
            const nextStatus = update.data.status === 'completed' ? 'completed'
                              : update.data.status === 'failed' ? 'failed'
                              : transfer.status
            console.log(`📊 Updating transfer ${transfer.id} -> progress: ${nextProgress}% status: ${nextStatus}`)
            return {
              ...transfer,
              progress: nextProgress,
              status: nextStatus,
              transferredFiles: nextStatus === 'completed' ? transfer.totalFiles : transfer.transferredFiles,
              endTime: nextStatus === 'completed' || nextStatus === 'failed' ? new Date() : transfer.endTime
            }
          }
          return transfer
        }))
      }
    }

    // Subscribe to real-time updates from the service
    try {
      const { getRealTimeTransferService } = require('@/lib/realtime-transfer-service')
      const realTimeService = getRealTimeTransferService()
      realTimeService.onUpdate(handleRealTimeUpdate)
      console.log('📡 Transfer page subscribed to real-time updates')
      
      return () => {
        realTimeService.offUpdate(handleRealTimeUpdate)
        console.log('📡 Transfer page unsubscribed from real-time updates')
      }
    } catch (error) {
      console.warn('Failed to subscribe to real-time updates:', error)
    }
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  // Show loading state while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-xs sm:text-sm">
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">File Transfer</h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                onClick={() => setShowQueue(!showQueue)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm"
              >
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Queue ({transferQueue.length})</span>
                <span className="sm:hidden">({transferQueue.length})</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Cloud Connections Status */}
        <div className="mb-6">
          <Card className="bg-white/5 border-white/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Cloud Services</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {connectedServices.map((service) => (
                      <div key={service.id} className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-white/10 rounded-full">
                        <img src={service.icon} alt={service.name} className="w-3 h-3 sm:w-4 sm:h-4 rounded" />
                        <span className="text-white text-xs sm:text-sm">{service.name}</span>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full"></div>
                      </div>
                    ))}
                    {connectedServices.length === 0 && (
                      <span className="text-slate-400 text-xs sm:text-sm">No services connected</span>
                    )}
                  </div>
                </div>
                <Link href="/connections">
                  <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm">
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Manage Connections</span>
                    <span className="sm:hidden">Manage</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transfer Configuration */}
        <div className="mb-8">
          <Card className="bg-white/5 border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Transfer Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Source Service */}
                <div className="space-y-2">
                  <Label className="text-white text-sm sm:text-base">Source Service</Label>
                  <Select value={sourceService} onValueChange={setSourceService}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm sm:text-base">
                      <SelectValue placeholder="Select source service" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {connectedServices.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex items-center gap-2">
                            <img src={service.icon} alt={service.name} className="w-4 h-4 rounded" />
                            {service.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destination Service */}
                <div className="space-y-2">
                  <Label className="text-white text-sm sm:text-base">Destination Service</Label>
                  <Select value={destinationService} onValueChange={setDestinationService}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm sm:text-base">
                      <SelectValue placeholder="Select destination service" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {connectedServices.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex items-center gap-2">
                            <img src={service.icon} alt={service.name} className="w-4 h-4 rounded" />
                            {service.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Transfer Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="overwrite"
                    checked={transferConfig.overwriteExisting}
                    onCheckedChange={(checked) => setTransferConfig(prev => ({ ...prev, overwriteExisting: checked }))}
                  />
                  <Label htmlFor="overwrite" className="text-white text-xs sm:text-sm">Overwrite Existing</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="timestamps"
                    checked={transferConfig.preserveTimestamps}
                    onCheckedChange={(checked) => setTransferConfig(prev => ({ ...prev, preserveTimestamps: checked }))}
                  />
                  <Label htmlFor="timestamps" className="text-white text-xs sm:text-sm">Preserve Timestamps</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="folders"
                    checked={transferConfig.createFolders}
                    onCheckedChange={(checked) => setTransferConfig(prev => ({ ...prev, createFolders: checked }))}
                  />
                  <Label htmlFor="folders" className="text-white text-xs sm:text-sm">Create Folders</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="skip"
                    checked={transferConfig.skipExisting}
                    onCheckedChange={(checked) => setTransferConfig(prev => ({ ...prev, skipExisting: checked }))}
                  />
                  <Label htmlFor="skip" className="text-white text-xs sm:text-sm">Skip Existing</Label>
                </div>
              </div>

              {/* Transfer Estimate */}
              {transferEstimate && (
                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-lg font-semibold text-white mb-4">Transfer Estimate</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bandwidth Information */}
                    <div className="space-y-3">
                      <h5 className="text-md font-medium text-white">Bandwidth & Time</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Size:</span>
                          <span className="text-white">{transferEstimate.bandwidth.totalGB} GB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Estimated Time:</span>
                          <span className="text-white">{transferEstimate.bandwidth.estimatedTimeFormatted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Bandwidth:</span>
                          <span className="text-white">{transferEstimate.bandwidth.bandwidthMBps} MB/s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Connection Speed:</span>
                          <span className="text-white">{transferEstimate.bandwidth.bandwidthMbps} Mbps</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost Analysis */}
                    <div className="space-y-3">
                      <h5 className="text-md font-medium text-white">Cost Analysis</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Storage Cost:</span>
                          <span className="text-white">${transferEstimate.cost.storageCost.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Transfer Cost:</span>
                          <span className="text-white">${transferEstimate.cost.egressCost.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">API Cost:</span>
                          <span className="text-white">${transferEstimate.cost.apiCost.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/10 pt-2">
                          <span className="text-slate-400 font-medium">Total Cost:</span>
                          <span className="text-white font-medium">${transferEstimate.cost.totalCost.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {transferEstimate.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-md font-medium text-white mb-2">Recommendations</h5>
                      <div className="space-y-1">
                        {transferEstimate.recommendations.map((rec, index) => (
                          <div key={index} className="text-sm text-slate-300 flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bandwidth Settings removed */}

              {/* Real-Time Transfer Options */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">Real-Time Transfer</h4>
                  <Badge variant="secondary" className="text-white">
                    {activeSessions.length} Active Sessions
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="realtime"
                      checked={enableRealTime}
                      onCheckedChange={setEnableRealTime}
                    />
                    <Label htmlFor="realtime" className="text-white text-sm">
                      Enable Real-Time Sync
                    </Label>
                  </div>
                  
                  {enableRealTime && (
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => setRealTimeStats(getRealTimeStats())}
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Stats
                      </Button>
                    </div>
                  )}
                </div>

                {/* Real-Time Statistics */}
                {realTimeStats && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg">
                    <h5 className="text-sm font-medium text-white mb-2">Real-Time Statistics</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Active Sessions:</span>
                        <span className="text-white ml-2">{realTimeStats.activeSessions}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Monitored Files:</span>
                        <span className="text-white ml-2">{realTimeStats.monitoredFiles}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Active Transfers:</span>
                        <span className="text-white ml-2">{realTimeStats.activeTransfers}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Queue Status:</span>
                        <span className="text-white ml-2">
                          {realTimeStats.queueStatus.pending + realTimeStats.queueStatus.transferring}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* File Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Source Files */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Source Files</h3>
              {selectedSourceFiles.length > 0 && (
                <Badge variant="secondary" className="text-white">
                  {selectedSourceFiles.length} selected
                </Badge>
              )}
            </div>

            {sourceService && getSelectedServiceConnection(sourceService)?.provider === "google" ? (
              <GoogleDriveExplorer
                connection={getSelectedServiceConnection(sourceService)!}
                onFileSelect={handleSourceFileSelect}
                selectedFiles={selectedSourceFiles}
              />
            ) : sourceService && getSelectedServiceConnection(sourceService)?.provider === "microsoft" ? (
              <OneDriveExplorer
                connectionId={sourceService}
                onFileSelect={handleSourceFileSelect}
                selectedFiles={selectedSourceFiles}
              />
            ) : (
              <Card className="bg-white/5 border-white/20">
                <CardContent className="p-6 text-center">
                  <FolderOpen className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-400">
                    {sourceService ? "Service not supported yet" : "Select a source service"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Destination Files */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Destination</h3>
              {selectedDestFiles.length > 0 && (
                <Badge variant="secondary" className="text-white">
                  {selectedDestFiles.length} selected
                </Badge>
              )}
            </div>

            {destinationService && getSelectedServiceConnection(destinationService)?.provider === "google" ? (
              <GoogleDriveExplorer
                connection={getSelectedServiceConnection(destinationService)!}
                onFileSelect={handleDestFileSelect}
                selectedFiles={selectedDestFiles}
              />
            ) : destinationService && getSelectedServiceConnection(destinationService)?.provider === "microsoft" ? (
              <OneDriveExplorer
                connectionId={destinationService}
                onFileSelect={handleDestFileSelect}
                selectedFiles={selectedDestFiles}
              />
            ) : (
              <Card className="bg-white/5 border-white/20">
                <CardContent className="p-6 text-center">
                  <FolderOpen className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-400">
                    {destinationService ? "Service not supported yet" : "Select a destination service"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Tier Status & Transfer Eligibility */}
        {selectedSourceFiles.length > 0 && (
          <div className="mb-6">
            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Transfer Eligibility & Tier Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Tier Display */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-white">Current Tier:</span>
                    <Badge 
                      variant={currentPlan?.id === 'free' ? 'secondary' : 'default'} 
                      className={currentPlan?.id === 'free' ? 'text-white border-white/30' : 'bg-green-500 text-white'}
                    >
                      {currentPlan?.name || 'Free'}
                    </Badge>
                    {currentPlan?.id === 'free' && (
                      <span className="text-xs text-slate-400">
                        (1GB monthly limit)
                      </span>
                    )}
                    {currentPlan?.id === 'pro' && (
                      <span className="text-xs text-green-400">
                        (Wallet-based transfers)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-white">Wallet:</span>
                    <span className="text-lg font-bold text-green-500">{formatBalance()}</span>
                  </div>
                </div>

                {/* Transfer Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2 p-3 bg-white/5 rounded-lg">
                    <span className="text-sm font-medium text-white">Transfer Size:</span>
                    <span className="text-lg font-bold text-blue-500">
                      {formatDataSize(selectedSourceFiles.reduce((sum, file) => sum + parseFileSizeToBytes(file.size), 0))}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-white/5 rounded-lg">
                    <span className="text-sm font-medium text-white">Transfer Cost:</span>
                    <span className="text-lg font-bold text-orange-500">
                      ${(estimateTransferCost(selectedSourceFiles.reduce((sum, file) => sum + parseFileSizeToBytes(file.size), 0)) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-white/5 rounded-lg">
                    <span className="text-sm font-medium text-white">Monthly Usage:</span>
                    <span className="text-lg font-bold text-purple-500">
                      {usage ? formatDataSize(usage.dataTransferred * 1024 * 1024 * 1024) : '0 B'}
                    </span>
                  </div>
                </div>

                {/* Transfer Eligibility Status */}
                <div className="p-4 rounded-lg border">
                  {(() => {
                    const totalBytes = selectedSourceFiles.reduce((sum, file) => sum + parseFileSizeToBytes(file.size), 0)
                    const totalGB = totalBytes / (1024 * 1024 * 1024)
                    const costCents = estimateTransferCost(totalBytes)
                    const canAfford = canAffordTransfer(totalBytes)
                    
                    // Check free tier limits
                    const isFreeTier = currentPlan?.id === 'free'
                    const currentUsageGB = usage?.dataTransferred || 0
                    const wouldExceedFreeLimit = isFreeTier && (currentUsageGB + totalGB) > 1
                    
                    // Check pro tier (wallet-based)
                    const isProTier = currentPlan?.id === 'pro'
                    const hasWalletCredits = balance > 0
                    
                    if (isFreeTier) {
                      if (wouldExceedFreeLimit) {
                        return (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-5 w-5 text-red-500" />
                              <div>
                                <p className="text-sm font-medium text-red-400">
                                  Free tier limit exceeded
                                </p>
                                <p className="text-xs text-slate-400">
                                  You've used {currentUsageGB.toFixed(2)}GB of 1GB monthly limit
                                </p>
                              </div>
                            </div>
                            <Badge variant="destructive">
                              Upgrade Required
                            </Badge>
                          </div>
                        )
                      } else {
                        return (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <div>
                                <p className="text-sm font-medium text-green-400">
                                  Free tier transfer allowed
                                </p>
                                <p className="text-xs text-slate-400">
                                  {((1 - currentUsageGB) * 1024).toFixed(0)}MB remaining this month
                                </p>
                              </div>
                            </div>
                            <Badge variant="default" className="bg-green-500">
                              Ready to Transfer
                            </Badge>
                          </div>
                        )
                      }
                    } else if (isProTier) {
                      if (!hasWalletCredits) {
                        return (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-5 w-5 text-red-500" />
                              <div>
                                <p className="text-sm font-medium text-red-400">
                                  No wallet credits available
                                </p>
                                <p className="text-xs text-slate-400">
                                  Top up your wallet to start transferring
                                </p>
                              </div>
                            </div>
                            <Badge variant="destructive">
                              Top Up Required
                            </Badge>
                          </div>
                        )
                      } else if (!canAfford) {
                        return (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-5 w-5 text-red-500" />
                              <div>
                                <p className="text-sm font-medium text-red-400">
                                  Insufficient wallet balance
                                </p>
                                <p className="text-xs text-slate-400">
                                  Need ${(costCents / 100).toFixed(2)}, have {formatBalance()}
                                </p>
                              </div>
                            </div>
                            <Badge variant="destructive">
                              Insufficient Balance
                            </Badge>
                          </div>
                        )
                      } else {
                        return (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <div>
                                <p className="text-sm font-medium text-green-400">
                                  Pro tier transfer ready
                                </p>
                                <p className="text-xs text-slate-400">
                                  Wallet balance sufficient for transfer
                                </p>
                              </div>
                            </div>
                            <Badge variant="default" className="bg-green-500">
                              Ready to Transfer
                            </Badge>
                          </div>
                        )
                      }
                    }
                    
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="text-sm font-medium text-yellow-400">
                              Unknown tier status
                            </p>
                            <p className="text-xs text-slate-400">
                              Please refresh the page
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          Check Status
                        </Badge>
                      </div>
                    )
                  })()}
                </div>

                {/* Action Required Messages */}
                {(() => {
                  const totalBytes = selectedSourceFiles.reduce((sum, file) => sum + parseFileSizeToBytes(file.size), 0)
                  const totalGB = totalBytes / (1024 * 1024 * 1024)
                  const costCents = estimateTransferCost(totalBytes)
                  const canAfford = canAffordTransfer(totalBytes)
                  const isFreeTier = currentPlan?.id === 'free'
                  const currentUsageGB = usage?.dataTransferred || 0
                  const wouldExceedFreeLimit = isFreeTier && (currentUsageGB + totalGB) > 1
                  const isProTier = currentPlan?.id === 'pro'
                  const hasWalletCredits = balance > 0
                  
                  if (isFreeTier && wouldExceedFreeLimit) {
                    return (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm text-red-400">
                          <strong>Free tier limit exceeded!</strong> You've used {currentUsageGB.toFixed(2)}GB of your 1GB monthly limit. 
                          <Link href="/billing" className="underline ml-1 hover:text-red-300">
                            Top up your wallet to upgrade to Pro tier
                          </Link>
                        </p>
                      </div>
                    )
                  } else if (isProTier && (!hasWalletCredits || !canAfford)) {
                    return (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm text-red-400">
                          <strong>Wallet top-up required!</strong> You need ${(costCents / 100).toFixed(2)} to complete this transfer. 
                          <Link href="/billing" className="underline ml-1 hover:text-red-300">
                            Add funds to your wallet
                          </Link>
                        </p>
                      </div>
                    )
                  }
                  return null
                })()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transfer Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <Button
            onClick={handleStartTransfer}
            disabled={!isTransferAllowed()}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-8 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="hidden sm:inline">{enableRealTime ? 'Start Real-Time Transfer' : 'Start Transfer'}</span>
            <span className="sm:hidden">{enableRealTime ? 'Real-Time' : 'Transfer'}</span>
          </Button>

          <Button
            onClick={handleStartPersistentTransfer}
            disabled={!isTransferAllowed()}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-8 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="hidden sm:inline">Start Persistent Transfer</span>
            <span className="sm:hidden">Persistent</span>
          </Button>
          
          {activeSessions.length > 0 && (
            <Button
              onClick={() => {
                activeSessions.forEach(sessionId => stopRealTimeTransfer(sessionId))
              }}
              variant="outline"
              size="lg"
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-4 sm:px-8 text-sm sm:text-base"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="hidden sm:inline">Stop All Real-Time Sessions</span>
              <span className="sm:hidden">Stop All</span>
            </Button>
          )}
          
          {/* Transfer Status Message */}
          {selectedSourceFiles.length > 0 && !isTransferAllowed() && (
            <div className="w-full mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <div className="text-sm text-red-400">
                  {(() => {
                    const totalBytes = selectedSourceFiles.reduce((sum, file) => sum + parseFileSizeToBytes(file.size), 0)
                    const totalGB = totalBytes / (1024 * 1024 * 1024)
                    const costCents = estimateTransferCost(totalBytes)
                    const isFreeTier = currentPlan?.id === 'free'
                    const isProTier = currentPlan?.id === 'pro'
                    const currentUsageGB = usage?.dataTransferred || 0

                    if (isFreeTier && currentUsageGB + totalGB > 1) {
                      return `Transfer blocked: You've used ${currentUsageGB.toFixed(2)}GB of your 1GB monthly limit. This transfer would add ${totalGB.toFixed(2)}GB more.`
                    } else if (isProTier && balance === 0) {
                      return "Transfer blocked: No wallet credits available. Please top up your wallet."
                    } else if (isProTier && !canAffordTransfer(totalBytes)) {
                      return `Transfer blocked: Insufficient wallet balance. You need $${(costCents / 100).toFixed(2)} but only have ${formatBalance()}.`
                    } else {
                      return "Transfer blocked: Please check your tier status and limits."
                    }
                  })()}
                </div>
              </div>
            </div>
          )}
          
          {/* Debug: Show connection status */}
          {sourceService && destinationService && (
            <div className="text-center text-sm text-slate-400">
              <div>Source: {getSelectedServiceConnection(sourceService)?.name} 
                {getSelectedServiceConnection(sourceService)?.connected ? ' ✅' : ' ❌'}
              </div>
              <div>Destination: {getSelectedServiceConnection(destinationService)?.name} 
                {getSelectedServiceConnection(destinationService)?.connected ? ' ✅' : ' ❌'}
              </div>
              {getSelectedServiceConnection(destinationService)?.provider === "microsoft" && (
                <div className="text-xs mt-1">
                  Token: {getSelectedServiceConnection(destinationService)?.accessToken?.substring(0, 20)}...
                  {(() => {
                    const token = getSelectedServiceConnection(destinationService)?.accessToken
                    return token && token.length > 100 ? ' ✅' : ' ❌'
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Transfer Status */}
        {transferJobs.length > 0 && (
          <div className="mt-8">
            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Active Transfers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transferJobs.map((job) => {
                    // Calculate bandwidth and cost analysis for this specific job
                    const jobFileSizes = job.sourceFiles.map(file => {
                      if (file.type === 'folder') return 0
                      return parseFileSizeToBytes(file.size)
                    })

                    // Map service names to provider types
                    const mapServiceToProvider = (service: string) => {
                      if (service === 'google-drive') return 'google'
                      if (service === 'onedrive') return 'microsoft'
                      return service as 'google' | 'microsoft' | 'aws' | 'azure'
                    }

                    const jobEstimate = BandwidthCalculator.generateEstimate(
                      jobFileSizes,
                      mapServiceToProvider(job.sourceService),
                      mapServiceToProvider(job.destinationService),
                      defaultBandwidthMBps
                    )

                    return (
                      <div key={job.id} className="p-4 bg-white/5 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-white font-medium">
                                {job.sourceFiles.map(f => f.name).join(", ")}
                              </span>
                              <ArrowRight className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-400">{job.destinationService}</span>
                              {job.isRealTime && (
                                <Badge variant="outline" className="text-green-400 border-green-400">
                                  Real-Time
                                </Badge>
                              )}
                            </div>

                            {/* Progress Bar */}
                            <div className="flex items-center gap-2 mb-3">
                              <Progress value={job.progress} className="flex-1" />
                              <span className="text-slate-400 text-sm">{job.progress}%</span>
                            </div>

                            {/* Transfer Status */}
                            {job.status === "transferring" && (
                              <div className="text-sm text-blue-400 mb-3">
                                {job.progress < 25 ? "📥 Downloading files..." : 
                                 job.progress < 75 ? "📤 Uploading files..." : 
                                 "🔄 Finalizing transfer..."} • 
                                {job.isRealTime ? "Real-time sync active" : "Standard transfer"}
                              </div>
                            )}

                            {/* Bandwidth and Cost Analysis */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 p-3 bg-white/5 rounded border border-white/10">
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-white">Bandwidth Usage</h4>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Size:</span>
                                    <span className="text-white">{jobEstimate.bandwidth.totalGB} GB</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Speed:</span>
                                    <span className="text-white">{jobEstimate.bandwidth.bandwidthMBps} MB/s</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Time:</span>
                                    <span className="text-white">{jobEstimate.bandwidth.estimatedTimeFormatted}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-white">Cost Analysis</h4>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Storage:</span>
                                    <span className="text-white">${jobEstimate.cost.storageCost.toFixed(4)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Transfer:</span>
                                    <span className="text-white">${jobEstimate.cost.egressCost.toFixed(4)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-white/10 pt-1">
                                    <span className="text-slate-400 font-medium">Total:</span>
                                    <span className="text-white font-medium">${jobEstimate.cost.totalCost.toFixed(4)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Status Badges */}
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <Badge 
                                variant={job.status === "completed" ? "default" : job.status === "failed" ? "destructive" : "secondary"}
                                className="text-black"
                              >
                                {job.status}
                              </Badge>
                              {job.isRealTime && job.sessionId && (
                                <Badge variant="outline" className="text-blue-400 border-blue-400">
                                  Session: {job.sessionId.substring(0, 8)}...
                                </Badge>
                              )}
                              {job.conflictResolution && (
                                <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                                  Conflict Resolved
                                </Badge>
                              )}
                              {job.error && (
                                <span className="text-red-400">Error: {job.error}</span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 ml-4">
                            {job.status === "transferring" && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                            )}
                            {job.status === "completed" && (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            )}
                            {job.status === "failed" && (
                              <AlertCircle className="h-4 w-4 text-red-400" />
                            )}
                            {job.isRealTime && job.sessionId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => stopRealTimeTransfer(job.sessionId!)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelTransfer(job.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transfer Queue */}
        {showQueue && (
          <div className="mt-8">
            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Transfer Queue</CardTitle>
              </CardHeader>
              <CardContent>
                {transferQueue.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No transfers in queue</p>
                ) : (
                  <div className="space-y-4">
                    {transferQueue.map((transfer) => {
                      // Calculate bandwidth and cost analysis for queued transfers
                      const queueFileSizes = transfer.sourceFiles.map(fileName => {
                        // Estimate file sizes based on file extension
                        if (fileName.endsWith('.jpg') || fileName.endsWith('.png')) return 2 * 1024 * 1024 // 2MB
                        if (fileName.endsWith('.pdf')) return 5 * 1024 * 1024 // 5MB
                        if (fileName.endsWith('.mp4')) return 50 * 1024 * 1024 // 50MB
                        if (fileName.endsWith('.docx')) return 1 * 1024 * 1024 // 1MB
                        return 2 * 1024 * 1024 // Default 2MB
                      })

                      // Map service names to provider types
                      const mapServiceToProvider = (service: string) => {
                        if (service === 'google-drive') return 'google'
                        if (service === 'onedrive') return 'microsoft'
                        return service as 'google' | 'microsoft' | 'aws' | 'azure'
                      }

                      const queueEstimate = BandwidthCalculator.generateEstimate(
                        queueFileSizes,
                        mapServiceToProvider(transfer.sourceService),
                        mapServiceToProvider(transfer.destinationService),
                        defaultBandwidthMBps
                      )

                      return (
                        <div key={transfer.id} className="p-4 bg-white/5 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-white font-medium">
                                  {transfer.sourceFiles.join(", ")}
                                </span>
                                <ArrowRight className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-400">{transfer.destinationService}</span>
                              </div>

                              {/* Progress Bar */}
                              <div className="flex items-center gap-2 mb-3">
                                <Progress value={transfer.progress} className="flex-1" />
                                <span className="text-slate-400 text-sm">{transfer.progress}%</span>
                              </div>

                              {/* Bandwidth and Cost Analysis */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 p-3 bg-white/5 rounded border border-white/10">
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium text-white">Bandwidth Usage</h4>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Size:</span>
                                      <span className="text-white">{queueEstimate.bandwidth.totalGB} GB</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Speed:</span>
                                      <span className="text-white">{queueEstimate.bandwidth.bandwidthMBps} MB/s</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Time:</span>
                                      <span className="text-white">{queueEstimate.bandwidth.estimatedTimeFormatted}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium text-white">Cost Analysis</h4>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Storage:</span>
                                      <span className="text-white">${queueEstimate.cost.storageCost.toFixed(4)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Transfer:</span>
                                      <span className="text-white">${queueEstimate.cost.egressCost.toFixed(4)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-white/10 pt-1">
                                      <span className="text-slate-400 font-medium">Total:</span>
                                      <span className="text-white font-medium">${queueEstimate.cost.totalCost.toFixed(4)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-white">
                                  {transfer.status}
                                </Badge>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (transfer.status === "paused") {
                                    resumeTransfer(transfer.id)
                                  } else if (transfer.status === "transferring") {
                                    pauseTransfer(transfer.id)
                                  }
                                }}
                                disabled={!["transferring", "paused"].includes(transfer.status)}
                              >
                                {transfer.status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelTransfer(transfer.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Persistent Transfers */}
        <div className="mt-8">
          <Card className="bg-white/5 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Persistent Transfers
                <Badge variant="secondary" className="ml-2">
                  Continues even when logged out
                </Badge>
              </CardTitle>
              <CardDescription className="text-slate-400">
                These transfers will continue running in the background even if you log out or close your browser.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PersistentTransfers />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Usage Limit Modal */}
      <UsageLimitModal
        isOpen={showUsageLimitModal}
        onClose={() => setShowUsageLimitModal(false)}
        currentUsage={usage || { dataTransferred: 0, transferCount: 0 }}
        currentPlan={currentPlan}
        transferSizeGB={bytesToGB(selectedSourceFiles.reduce((sum, file) => sum + parseFileSizeToBytes(file.size), 0))}
        onUpgrade={handleUpgrade}
        loadingUpgrade={loadingUpgrade}
      />
    </div>
  )
}
