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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  Cloud,
  CheckCircle,
  AlertCircle,
  Clock,
  Pause,
  Play,
  X,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useCloudConnections, FileItem } from "@/hooks/use-cloud-connections"
import { auth } from "@/lib/firebase"
import { GoogleDriveExplorer } from "@/components/google-drive-explorer"
import { OneDriveExplorer } from "@/components/onedrive-explorer"
import { BandwidthCalculator, TransferEstimate } from "@/lib/bandwidth-calculator"
import { PersistentTransfers } from "@/components/persistent-transfers"
import { usePersistentTransfers } from "@/hooks/use-persistent-transfers"
import { storeTransferJob, getActiveTransfers, updateTransferJob, archiveTransferJob } from "@/lib/persistent-transfer-storage"

// Utility functions for data formatting
const formatDataSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const bytesToGB = (bytes: number): number => {
  return bytes / (1024 * 1024 * 1024)
}

// Helper function to parse file size string to bytes
function parseFileSizeToBytes(sizeString?: string): number {
  if (!sizeString) return 0
  
  // Remove any non-numeric characters except decimal point
  const cleanString = sizeString.replace(/[^\d.]/g, '')
  const size = parseFloat(cleanString)
  
  if (isNaN(size)) return 0
  
  // Determine unit and convert to bytes
  const lowerString = sizeString.toLowerCase()
  if (lowerString.includes('tb')) return size * 1024 * 1024 * 1024 * 1024
  if (lowerString.includes('gb')) return size * 1024 * 1024 * 1024
  if (lowerString.includes('mb')) return size * 1024 * 1024
  if (lowerString.includes('kb')) return size * 1024
  return size // Assume bytes if no unit
}

interface TransferJob {
  id: string
  sourceService: string
  destinationService: string
  sourceFiles: FileItem[]
  destinationFiles: FileItem[]
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'paused'
  progress: number
  startTime: number
  endTime?: number
  errorMessage?: string
}

export default function TransferPage() {
  const { isAuthenticated, user } = useAuth()
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
    getRealTimeStats
  } = useCloudConnections()

  // Persistent transfers hook
  const { 
    activeJobs, 
    recentJobs, 
    loading: persistentLoading, 
    queueTransfer, 
    pauseJob, 
    resumeJob, 
    cancelJob 
  } = usePersistentTransfers()

  const [sourceService, setSourceService] = useState<string>("")
  const [destinationService, setDestinationService] = useState<string>("")
  const [selectedSourceFiles, setSelectedSourceFiles] = useState<FileItem[]>([])
  const [selectedDestFiles, setSelectedDestFiles] = useState<FileItem[]>([])
  const [selectionSide, setSelectionSide] = useState<'source' | 'destination' | null>(null)
  const [transferQueue, setTransferQueue] = useState<TransferJob[]>([])
  const [storedTransfers, setStoredTransfers] = useState<any[]>([])
  const [enableRealTime, setEnableRealTime] = useState(true)
  const [showPersistentTransfers, setShowPersistentTransfers] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  // Load stored transfers on mount and poll for updates
  useEffect(() => {
    if (user?.id) {
      loadStoredTransfers()
      
      // Poll for updates every 3 seconds
      const interval = setInterval(loadStoredTransfers, 3000)
      return () => clearInterval(interval)
    }
  }, [user?.id])

  const loadStoredTransfers = async () => {
    if (!user?.id) return
    
    try {
      const transfers = await getActiveTransfers(user.id)
      setStoredTransfers(transfers)
      console.log(`📋 Loaded ${transfers.length} stored transfers`)
    } catch (error) {
      console.error('❌ Error loading stored transfers:', error)
    }
  }

  const handleLogoClick = () => {
    router.push("/dashboard")
  }

  const handleStartTransfer = async () => {
    if (selectedSourceFiles.length === 0) {
      alert("Please select source files to transfer")
      return
    }

    if (!sourceService || !destinationService) {
      alert("Please select both source and destination services")
      return
    }

    setIsLoading(true)
    setErrorMessage("")

    try {
      // Calculate total size
      const totalBytes = selectedSourceFiles.reduce((sum, file) => sum + parseFileSizeToBytes(file.size), 0)
      const totalGB = totalBytes / (1024 * 1024 * 1024)
      
      // Free platform - no limits or billing checks needed
      console.log(`Free transfer: ${totalGB.toFixed(2)}GB to transfer`)

      const localJobId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const newTransfer: TransferJob = {
        id: localJobId,
        sourceService,
        destinationService,
        sourceFiles: selectedSourceFiles,
        destinationFiles: selectedDestFiles,
        status: 'pending',
        progress: 0,
        startTime: Date.now()
      }

      // Store in database for persistence
      const storedJob = {
        id: localJobId,
        userId: user?.id || '',
        sourceService,
        destinationService,
        sourceFiles: selectedSourceFiles,
        destinationPath: selectedDestFiles[0]?.path || "root",
        status: 'pending' as const,
        progress: 0,
        startTime: Date.now(),
        currentFileIndex: 0,
        totalFiles: selectedSourceFiles.length,
        transferredBytes: 0,
        totalBytes: totalBytes
      }

      await storeTransferJob(storedJob)
      setTransferQueue(prev => [...prev, newTransfer])
      setStoredTransfers(prev => [...prev, storedJob])
      setSelectedSourceFiles([])
      setSelectionSide(null)

      console.log(`Free transfer started with job ID: ${localJobId}`)
      
      // Queue transfer for background processing (persistent)
      const destinationPath = selectedDestFiles[0]?.path || "root"
      
      try {
        const persistentJobId = await queueTransfer(
          sourceService,
          destinationService,
          selectedSourceFiles,
          destinationPath,
          1
        )
        console.log(`📋 Transfer queued for background processing: ${persistentJobId}`)
      } catch (queueError) {
        console.warn('⚠️ Failed to queue persistent transfer, using simple mode:', queueError)
        
        // Fallback to simple API
        const simpleResponse = await fetch('/api/transfers/simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            sourceService,
            destinationService,
            sourceFiles: selectedSourceFiles,
            destinationPath,
            priority: 1
          })
        })
        
        if (simpleResponse.ok) {
          const simpleResult = await simpleResponse.json()
          console.log(`📋 Simple transfer queued: ${simpleResult.jobId}`)
        }
      }

      // Also start real-time transfer if enabled (for immediate feedback)
      if (enableRealTime) {
        const destinationPath = selectedDestFiles[0]?.path || "root"
        await startRealTimeTransfer(sourceService, destinationService, selectedSourceFiles, destinationPath, true)
      }

    } catch (error) {
      console.error("Transfer failed:", error)
      setErrorMessage(error instanceof Error ? error.message : "Transfer failed")
    } finally {
      setIsLoading(false)
    }
  }

  const canStartTransfer = () => {
    const hasConnectedServices = connections && connections.filter(conn => conn.connected).length > 0
    return hasConnectedServices && selectedSourceFiles.length > 0 && sourceService && destinationService && !isLoading
  }

  // Control functions for stored transfers
  const pauseStoredTransfer = async (jobId: string) => {
    if (!user?.id) return
    
    try {
      await updateTransferJob(jobId, user.id, { status: 'paused', pausedAt: Date.now() })
      setStoredTransfers(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: 'paused', pausedAt: Date.now() } : job
      ))
      console.log(`⏸️ Paused stored transfer: ${jobId}`)
    } catch (error) {
      console.error('❌ Error pausing stored transfer:', error)
    }
  }

  const resumeStoredTransfer = async (jobId: string) => {
    if (!user?.id) return
    
    try {
      await updateTransferJob(jobId, user.id, { status: 'transferring' })
      setStoredTransfers(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: 'transferring' } : job
      ))
      console.log(`▶️ Resumed stored transfer: ${jobId}`)
    } catch (error) {
      console.error('❌ Error resuming stored transfer:', error)
    }
  }

  const cancelStoredTransfer = async (jobId: string) => {
    if (!user?.id) return
    
    try {
      await updateTransferJob(jobId, user.id, { status: 'failed', error: 'Cancelled by user' })
      await archiveTransferJob(jobId, user.id)
      setStoredTransfers(prev => prev.filter(job => job.id !== jobId))
      console.log(`❌ Cancelled stored transfer: ${jobId}`)
    } catch (error) {
      console.error('❌ Error cancelling stored transfer:', error)
    }
  }

  const getTotalSize = () => {
    return selectedSourceFiles.reduce((sum, file) => sum + parseFileSizeToBytes(file.size), 0)
  }

  const getTransferEstimate = (): TransferEstimate | null => {
    if (selectedSourceFiles.length === 0) return null
    
    const fileSizes = selectedSourceFiles.map(file => parseFileSizeToBytes(file.size))
    return BandwidthCalculator.generateEstimate(
      fileSizes,
      sourceService as any,
      destinationService as any
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={handleLogoClick} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center">
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AqwaCloud</span>
          </button>

          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <Button size="sm" className="bg-accent hover:bg-accent/90" asChild>
              <Link href="/transfer">
                <Upload className="h-4 w-4 mr-2" />
                New Transfer
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Start a Transfer</h1>
            <p className="text-xl text-muted-foreground">Transfer files between cloud services - completely free!</p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-800">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Transfer Interface */}
            <div className="lg:col-span-2 space-y-6">
              {/* Service Selection */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Select Services</CardTitle>
                      <CardDescription>Choose source and destination cloud services</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/connections">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Connections
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="source-service">Source Service</Label>
                      <Select value={sourceService} onValueChange={setSourceService}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source service" />
                        </SelectTrigger>
                        <SelectContent>
                          {!connections || connections.filter(conn => conn.connected).length === 0 ? (
                            <SelectItem value="no-connections" disabled>
                              No cloud services connected
                            </SelectItem>
                          ) : (
                            (connections || [])
                              .filter((conn) => !!conn && conn.connected)
                              .map((conn) => (
                                <SelectItem key={conn.id} value={conn.id}>
                                  {conn.name}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                      {(!connections || connections.filter(conn => conn.connected).length === 0) && (
                        <p className="text-sm text-muted-foreground">
                          No cloud services connected. Please connect a service first.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destination-service">Destination Service</Label>
                      <Select value={destinationService} onValueChange={setDestinationService}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination service" />
                        </SelectTrigger>
                        <SelectContent>
                          {!connections || connections.filter(conn => conn.connected).length === 0 ? (
                            <SelectItem value="no-connections" disabled>
                              No cloud services connected
                            </SelectItem>
                          ) : (
                            (connections || [])
                              .filter((conn) => !!conn && conn.connected)
                              .map((conn) => (
                                <SelectItem key={conn.id} value={conn.id}>
                                  {conn.name}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                      {(!connections || connections.filter(conn => conn.connected).length === 0) && (
                        <p className="text-sm text-muted-foreground">
                          No cloud services connected. Please connect a service first.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Connection Status */}
                  {Array.isArray(connections) && connections.length > 0 && (
                    <div className="space-y-2">
                      <Label>Connection Status</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(connections || []).filter(Boolean).map((conn) => (
                          <div key={conn.id} className="flex items-center justify-between p-2 rounded border">
                            <span className="text-sm font-medium">{conn?.name || 'Unknown'}</span>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${conn && conn.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="text-xs text-muted-foreground">
                                {conn && conn.connected ? 'Connected' : 'Disconnected'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* File Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Files</CardTitle>
                  <CardDescription>Choose files to transfer from your selected services</CardDescription>
                </CardHeader>
                <CardContent>
                  {!connections || connections.filter(conn => conn.connected).length === 0 ? (
                    <div className="text-center py-8">
                      <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Cloud Services Connected</h3>
                      <p className="text-muted-foreground mb-4">
                        You need to connect at least one cloud service to start transferring files.
                      </p>
                      <Button asChild>
                        <Link href="/connections">
                          <Settings className="h-4 w-4 mr-2" />
                          Connect Services
                        </Link>
                      </Button>
                    </div>
                  ) : sourceService && destinationService ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Source</div>
                        {sourceService === 'google-drive' && (() => {
                          const googleConn = (connections || []).find(c => c.id === 'google-drive')
                          return googleConn ? (
                            <GoogleDriveExplorer
                              connection={googleConn}
                              onFileSelect={setSelectedSourceFiles}
                              selectedFiles={selectedSourceFiles}
                            />
                          ) : null
                        })()}
                        {sourceService === 'onedrive' && (
                          <OneDriveExplorer
                            connectionId="onedrive"
                            onFileSelect={setSelectedSourceFiles}
                            selectedFiles={selectedSourceFiles}
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Destination</div>
                        {destinationService === 'google-drive' && (() => {
                          const googleConn = (connections || []).find(c => c.id === 'google-drive')
                          return googleConn ? (
                            <GoogleDriveExplorer
                              connection={googleConn}
                              onFileSelect={setSelectedDestFiles}
                              selectedFiles={selectedDestFiles}
                            />
                          ) : null
                        })()}
                        {destinationService === 'onedrive' && (
                          <OneDriveExplorer
                            connectionId="onedrive"
                            onFileSelect={setSelectedDestFiles}
                            selectedFiles={selectedDestFiles}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Cloud className="h-8 w-8 mx-auto mb-2" />
                      <p>Please select both source and destination services</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transfer Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Transfer Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="realtime">Real-time Transfer</Label>
                      <p className="text-sm text-muted-foreground">
                        Transfer files immediately (recommended)
                      </p>
                    </div>
                    <Switch
                      id="realtime"
                      checked={enableRealTime}
                      onCheckedChange={setEnableRealTime}
                    />
                  </div>
                  {/* Inline Transfer Status under settings */}
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Transfer Status</h3>
                      <div className="text-xs text-muted-foreground">
                        Active: {transferJobs.filter(j => j.status === 'transferring').length} • Completed: {transferJobs.filter(j => j.status === 'completed').length}
                      </div>
                    </div>
                    {transferJobs.length > 0 && (
                      <Separator className="my-1" />
                    )}
                    {transferJobs.length === 0 && (
                      <div className="text-sm text-muted-foreground">No transfers yet. Start one to see progress here.</div>
                    )}
                    <div className="space-y-3">
                      {transferJobs.slice().reverse().map(job => (
                        <div key={job.id} className={`p-3 rounded-md border ${job.status === 'failed' ? 'border-red-300' : job.status === 'completed' ? 'border-green-300' : ''}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium">
                              {job.sourceService} → {job.destinationService}
                            </div>
                            <div className="flex items-center gap-1">
                              {job.status === 'transferring' && (
                                <Button size="icon" variant="ghost" onClick={() => pauseTransfer(job.id)} aria-label="Pause">
                                  <Pause className="h-4 w-4" />
                                </Button>
                              )}
                              {job.status === 'paused' && (
                                <Button size="icon" variant="ghost" onClick={() => resumeTransfer(job.id)} aria-label="Resume">
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              {job.status !== 'completed' && (
                                <Button size="icon" variant="ghost" onClick={() => cancelTransfer(job.id)} aria-label="Cancel">
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span>Status: {job.status}</span>
                            <span>{Math.max(0, Math.min(100, Math.round(job.progress)))}%</span>
                          </div>
                          <Progress value={Math.max(0, Math.min(100, job.progress))} />
                          {job.status === 'failed' && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertTitle>Transfer failed</AlertTitle>
                              <AlertDescription>{job.error || 'Unknown error'}</AlertDescription>
                            </Alert>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground">
                            Files selected: {job.sourceFiles?.length || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transfer Summary */}
              {selectedSourceFiles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Transfer Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Files selected:</span>
                        <span className="font-medium">{selectedSourceFiles.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total size:</span>
                        <span className="font-medium">{formatDataSize(getTotalSize())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost:</span>
                        <span className="font-medium text-green-600">Free</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Start Transfer Button */}
              <div className="flex justify-center">
                {!connections || connections.filter(conn => conn.connected).length === 0 ? (
                  <Button
                    size="lg"
                    className="bg-accent hover:bg-accent/90"
                    asChild
                  >
                    <Link href="/connections">
                      <Settings className="h-5 w-5 mr-2" />
                      Connect Services First
                    </Link>
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartTransfer}
                    disabled={!canStartTransfer()}
                    size="lg"
                    className="bg-accent hover:bg-accent/90"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Starting Transfer...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 mr-2" />
                        Start Free Transfer
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Transfer Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Transfer Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Active transfers:</span>
                      <span className="font-medium">{transferJobs.filter(j => j.status === 'transferring').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed today:</span>
                      <span className="font-medium">{transferJobs.filter(j => j.status === 'completed').length}</span>
                    </div>

                    {transferJobs.length > 0 && (
                      <Separator className="my-2" />
                    )}

                    {transferJobs.length === 0 && (
                      <div className="text-sm text-muted-foreground">No transfers yet. Start one to see progress here.</div>
                    )}

                    <div className="space-y-3">
                      {/* Real-time transfers */}
                      {transferJobs.slice().reverse().map(job => (
                        <div key={job.id} className="p-3 rounded-md border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium">
                              {job.sourceService} → {job.destinationService}
                            </div>
                            <div className="flex items-center gap-1">
                              {job.status === 'transferring' && (
                                <Button size="icon" variant="ghost" onClick={() => pauseTransfer(job.id)} aria-label="Pause">
                                  <Pause className="h-4 w-4" />
                                </Button>
                              )}
                              {job.status === 'paused' && (
                                <Button size="icon" variant="ghost" onClick={() => resumeTransfer(job.id)} aria-label="Resume">
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              {job.status !== 'completed' && (
                                <Button size="icon" variant="ghost" onClick={() => cancelTransfer(job.id)} aria-label="Cancel">
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span>Status: {job.status}{job.status === 'failed' && job.error ? ` — ${job.error}` : ''}</span>
                            <span>{Math.max(0, Math.min(100, Math.round(job.progress)))}%</span>
                          </div>
                          <Progress value={Math.max(0, Math.min(100, job.progress))} />
                          <div className="mt-2 text-xs text-muted-foreground">
                            Files selected: {job.sourceFiles?.length || 0}
                          </div>
                        </div>
                      ))}
                      
                      {/* Stored persistent transfers */}
                      {storedTransfers.map(job => (
                        <div key={job.id} className="p-3 rounded-md border border-green-200 bg-green-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium">
                              {job.sourceService} → {job.destinationService}
                              <span className="ml-2 text-xs text-green-600">(Persistent)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {job.status === 'transferring' && (
                                <Button size="icon" variant="ghost" onClick={() => pauseStoredTransfer(job.id)} aria-label="Pause">
                                  <Pause className="h-4 w-4" />
                                </Button>
                              )}
                              {job.status === 'paused' && (
                                <Button size="icon" variant="ghost" onClick={() => resumeStoredTransfer(job.id)} aria-label="Resume">
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              {job.status !== 'completed' && (
                                <Button size="icon" variant="ghost" onClick={() => cancelStoredTransfer(job.id)} aria-label="Cancel">
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span>Status: {job.status}{job.status === 'failed' && job.error ? ` — ${job.error}` : ''}</span>
                            <span>{Math.max(0, Math.min(100, Math.round(job.progress)))}%</span>
                          </div>
                          <Progress value={Math.max(0, Math.min(100, job.progress))} />
                          <div className="mt-2 text-xs text-muted-foreground">
                            Files: {job.currentFileIndex}/{job.totalFiles} • {formatDataSize(job.transferredBytes)}/{formatDataSize(job.totalBytes)}
                          </div>
                        </div>
                      ))}
                      
                      {/* Background API transfers */}
                      {activeJobs.map(job => (
                        <div key={job.id} className="p-3 rounded-md border border-blue-200 bg-blue-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium">
                              {job.sourceService} → {job.destinationService}
                              <span className="ml-2 text-xs text-blue-600">(Background)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {job.status === 'processing' && (
                                <Button size="icon" variant="ghost" onClick={() => pauseJob(job.id)} aria-label="Pause">
                                  <Pause className="h-4 w-4" />
                                </Button>
                              )}
                              {job.status === 'paused' && (
                                <Button size="icon" variant="ghost" onClick={() => resumeJob(job.id)} aria-label="Resume">
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              {job.status !== 'completed' && (
                                <Button size="icon" variant="ghost" onClick={() => cancelJob(job.id)} aria-label="Cancel">
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span>Status: {job.status}{job.status === 'failed' && job.error ? ` — ${job.error}` : ''}</span>
                            <span>{Math.max(0, Math.min(100, Math.round(job.progress)))}%</span>
                          </div>
                          <Progress value={Math.max(0, Math.min(100, job.progress))} />
                          <div className="mt-2 text-xs text-muted-foreground">
                            Files: {job.sourceFiles?.length || 0} • Retries: {job.retryCount}/{job.maxRetries}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/transfers">
                      <File className="h-4 w-4 mr-2" />
                      View All Transfers
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
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