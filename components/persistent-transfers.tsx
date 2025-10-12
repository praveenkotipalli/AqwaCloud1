'use client'

import { useState } from 'react'
import { usePersistentTransfers } from '@/hooks/use-persistent-transfers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Play, 
  Pause, 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  Upload,
  RefreshCw,
  FileText,
  HardDrive
} from 'lucide-react'

export function PersistentTransfers() {
  const {
    activeTransfers,
    completedTransfers,
    allTransfers,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
    isLoading,
    error,
    progressUpdates,
    stats
  } = usePersistentTransfers()

  const [selectedTab, setSelectedTab] = useState('active')

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (startTime: Date, endTime?: Date): string => {
    const end = endTime || new Date()
    const duration = end.getTime() - startTime.getTime()
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'transferring':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-orange-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      transferring: 'default',
      pending: 'secondary',
      paused: 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const TransferCard = ({ transfer }: { transfer: any }) => {
    const progressUpdate = progressUpdates.get(transfer.id)
    const currentProgress = progressUpdate?.progress || transfer.progress
    const currentBytes = progressUpdate?.bytesTransferred || transfer.bytesTransferred

    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(transfer.status)}
              <CardTitle className="text-sm font-medium truncate">
                {transfer.sourceFile.name}
              </CardTitle>
            </div>
            {getStatusBadge(transfer.status)}
          </div>
          <CardDescription className="text-xs">
            {formatBytes(transfer.sourceFile.size)} • {transfer.sourceConnection.provider} → {transfer.destConnection.provider}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentProgress}%</span>
              <span>{formatBytes(currentBytes)} / {formatBytes(transfer.totalBytes)}</span>
            </div>
            <Progress value={currentProgress} className="h-2" />
          </div>

          {/* Transfer Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Download className="h-3 w-3" />
                <span>{transfer.sourceConnection.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Upload className="h-3 w-3" />
                <span>{transfer.destConnection.name}</span>
              </div>
            </div>
            <span>{formatDuration(transfer.startTime, transfer.endTime)}</span>
          </div>

          {/* Error Message */}
          {transfer.error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                {transfer.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {transfer.status === 'transferring' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => pauseTransfer(transfer.id)}
                className="h-7 px-2"
              >
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </Button>
            )}
            {transfer.status === 'paused' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => resumeTransfer(transfer.id)}
                className="h-7 px-2"
              >
                <Play className="h-3 w-3 mr-1" />
                Resume
              </Button>
            )}
            {(transfer.status === 'pending' || transfer.status === 'transferring' || transfer.status === 'paused') && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => cancelTransfer(transfer.id)}
                className="h-7 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading transfers...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Transfers</p>
                <p className="text-2xl font-bold">{stats.totalTransfers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold">{stats.activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{stats.completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Download className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Data Transferred</p>
                <p className="text-lg font-bold">{formatBytes(stats.totalBytesTransferred)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeTransfers.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedTransfers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeTransfers.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active transfers</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeTransfers.map((transfer) => (
                <TransferCard key={transfer.id} transfer={transfer} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedTransfers.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No completed transfers</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedTransfers.map((transfer) => (
                <TransferCard key={transfer.id} transfer={transfer} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
