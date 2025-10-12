import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './use-auth'
import { persistentTransferService, PersistentTransferJob, TransferProgressUpdate } from '@/lib/persistent-transfer-service'
import { CloudConnection } from './use-cloud-connections'

export interface UsePersistentTransfersReturn {
  // Transfer management
  startTransfer: (
    sourceConnection: CloudConnection,
    destConnection: CloudConnection,
    sourceFile: any
  ) => Promise<string>
  
  // Transfer status
  activeTransfers: PersistentTransferJob[]
  completedTransfers: PersistentTransferJob[]
  allTransfers: PersistentTransferJob[]
  
  // Transfer control
  pauseTransfer: (jobId: string) => Promise<void>
  resumeTransfer: (jobId: string) => Promise<void>
  cancelTransfer: (jobId: string) => Promise<void>
  
  // Loading states
  isLoading: boolean
  error: string | null
  
  // Progress updates
  progressUpdates: Map<string, TransferProgressUpdate>
  
  // Statistics
  stats: {
    totalTransfers: number
    activeCount: number
    completedCount: number
    failedCount: number
    totalBytesTransferred: number
  }
}

export function usePersistentTransfers(): UsePersistentTransfersReturn {
  const { user } = useAuth()
  const [activeTransfers, setActiveTransfers] = useState<PersistentTransferJob[]>([])
  const [completedTransfers, setCompletedTransfers] = useState<PersistentTransferJob[]>([])
  const [allTransfers, setAllTransfers] = useState<PersistentTransferJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressUpdates, setProgressUpdates] = useState<Map<string, TransferProgressUpdate>>(new Map())

  // Load user's transfer jobs
  const loadTransferJobs = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const [active, completed] = await Promise.all([
        persistentTransferService.getActiveTransfers(user.id),
        persistentTransferService.getCompletedTransfers(user.id)
      ])

      setActiveTransfers(active)
      setCompletedTransfers(completed)
      setAllTransfers([...active, ...completed])
      
      console.log(`📊 Loaded ${active.length} active and ${completed.length} completed transfers`)
    } catch (err) {
      console.error('❌ Failed to load transfer jobs:', err)
      setError(err instanceof Error ? err.message : 'Failed to load transfers')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Start a new transfer
  const startTransfer = useCallback(async (
    sourceConnection: CloudConnection,
    destConnection: CloudConnection,
    sourceFile: any
  ): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
      const jobId = await persistentTransferService.startTransfer(
        user.id,
        sessionId,
        sourceConnection,
        destConnection,
        sourceFile
      )

      console.log(`🚀 Started persistent transfer: ${jobId}`)
      
      // Reload transfers to show the new one
      await loadTransferJobs()
      
      return jobId
    } catch (err) {
      console.error('❌ Failed to start transfer:', err)
      throw err
    }
  }, [user?.id, loadTransferJobs])

  // Pause a transfer
  const pauseTransfer = useCallback(async (jobId: string) => {
    try {
      await persistentTransferService.pauseTransfer(jobId)
      await loadTransferJobs()
      console.log(`⏸️ Transfer paused: ${jobId}`)
    } catch (err) {
      console.error('❌ Failed to pause transfer:', err)
      throw err
    }
  }, [loadTransferJobs])

  // Resume a transfer
  const resumeTransfer = useCallback(async (jobId: string) => {
    try {
      await persistentTransferService.resumeTransfer(jobId)
      await loadTransferJobs()
      console.log(`▶️ Transfer resumed: ${jobId}`)
    } catch (err) {
      console.error('❌ Failed to resume transfer:', err)
      throw err
    }
  }, [loadTransferJobs])

  // Cancel a transfer
  const cancelTransfer = useCallback(async (jobId: string) => {
    try {
      await persistentTransferService.cancelTransfer(jobId)
      await loadTransferJobs()
      console.log(`❌ Transfer cancelled: ${jobId}`)
    } catch (err) {
      console.error('❌ Failed to cancel transfer:', err)
      throw err
    }
  }, [loadTransferJobs])

  // Setup progress listener
  useEffect(() => {
    if (!user?.id) return

    const handleProgressUpdate = (update: TransferProgressUpdate) => {
      setProgressUpdates(prev => {
        const newMap = new Map(prev)
        newMap.set(update.jobId, update)
        return newMap
      })

      // Also update the transfers list if needed
      loadTransferJobs()
    }

    persistentTransferService.addProgressListener(user.id, handleProgressUpdate)

    return () => {
      persistentTransferService.removeProgressListener(user.id)
    }
  }, [user?.id, loadTransferJobs])

  // Load transfers on mount and when user changes
  useEffect(() => {
    loadTransferJobs()
  }, [loadTransferJobs])

  // Calculate statistics
  const stats = {
    totalTransfers: allTransfers.length,
    activeCount: activeTransfers.length,
    completedCount: completedTransfers.filter(t => t.status === 'completed').length,
    failedCount: completedTransfers.filter(t => t.status === 'failed').length,
    totalBytesTransferred: allTransfers.reduce((sum, transfer) => 
      sum + (transfer.bytesTransferred || 0), 0
    )
  }

  return {
    startTransfer,
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
  }
}
