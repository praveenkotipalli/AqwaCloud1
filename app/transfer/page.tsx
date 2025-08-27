"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useCloudConnections, FileItem } from "@/hooks/use-cloud-connections"
import { GoogleDriveExplorer } from "@/components/google-drive-explorer"
import { ConnectionManager } from "@/components/connection-manager"

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
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const { 
    connections, 
    transferJobs, 
    startTransfer, 
    pauseTransfer, 
    resumeTransfer, 
    cancelTransfer 
  } = useCloudConnections()

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

  const [transferQueue, setTransferQueue] = useState<QueuedTransfer[]>([])
  const [showQueue, setShowQueue] = useState(false)

  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
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

    try {
      const jobId = await startTransfer(
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
        status: "queued",
        progress: 0,
        startTime: new Date(),
        totalFiles: selectedSourceFiles.length,
        transferredFiles: 0
      }

      setTransferQueue(prev => [...prev, newTransfer])
      setSelectedSourceFiles([])
      setSelectionSide(null)

      console.log(`Transfer started with job ID: ${jobId}`)
    } catch (error) {
      console.error("Failed to start transfer:", error)
      alert("Failed to start transfer")
    }
  }

  // Get selected service connection
  const getSelectedServiceConnection = (serviceId: string) => {
    return connections.find(conn => conn.id === serviceId)
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-white">File Transfer</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowQueue(!showQueue)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Clock className="h-4 w-4 mr-2" />
                Queue ({transferQueue.length})
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Manager */}
        <div className="mb-8">
          <ConnectionManager />
        </div>

        {/* Transfer Configuration */}
        <div className="mb-8">
          <Card className="bg-white/5 border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Transfer Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Source Service */}
                <div className="space-y-2">
                  <Label className="text-white">Source Service</Label>
                  <Select value={sourceService} onValueChange={setSourceService}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
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
                  <Label className="text-white">Destination Service</Label>
                  <Select value={destinationService} onValueChange={setDestinationService}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="overwrite"
                    checked={transferConfig.overwriteExisting}
                    onCheckedChange={(checked) => setTransferConfig(prev => ({ ...prev, overwriteExisting: checked }))}
                  />
                  <Label htmlFor="overwrite" className="text-white text-sm">Overwrite Existing</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="timestamps"
                    checked={transferConfig.preserveTimestamps}
                    onCheckedChange={(checked) => setTransferConfig(prev => ({ ...prev, preserveTimestamps: checked }))}
                  />
                  <Label htmlFor="timestamps" className="text-white text-sm">Preserve Timestamps</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="folders"
                    checked={transferConfig.createFolders}
                    onCheckedChange={(checked) => setTransferConfig(prev => ({ ...prev, createFolders: checked }))}
                  />
                  <Label htmlFor="folders" className="text-white text-sm">Create Folders</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="skip"
                    checked={transferConfig.skipExisting}
                    onCheckedChange={(checked) => setTransferConfig(prev => ({ ...prev, skipExisting: checked }))}
                  />
                  <Label htmlFor="skip" className="text-white text-sm">Skip Existing</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* File Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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

        {/* Transfer Actions */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={handleStartTransfer}
            disabled={!sourceService || !destinationService || selectedSourceFiles.length === 0}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            <ArrowLeftRight className="h-5 w-5 mr-2" />
            Start Transfer
          </Button>
        </div>

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
                    {transferQueue.map((transfer) => (
                      <div key={transfer.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-white font-medium">
                              {transfer.sourceFiles.join(", ")}
                            </span>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-400">{transfer.destinationService}</span>
                          </div>
                          <Progress value={transfer.progress} className="w-full" />
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant="secondary" className="text-white">
                            {transfer.status}
                          </Badge>
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
