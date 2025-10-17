"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './use-auth'

export interface PersistentTransferJob {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused'
  progress: number
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  sourceService: string
  destinationService: string
  sourceFiles: any[]
  retryCount: number
  maxRetries: number
}

export function usePersistentTransfers() {
  const { user } = useAuth()
  const [activeJobs, setActiveJobs] = useState<PersistentTransferJob[]>([])
  const [recentJobs, setRecentJobs] = useState<PersistentTransferJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch transfer jobs from server
  const fetchTransferJobs = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      // Try the main API first
      let response = await fetch(`/api/transfers/status?userId=${user.id}`)
      
      if (!response.ok) {
        console.warn('⚠️ Main API failed, trying simple API...')
        // Fallback to simple API
        response = await fetch(`/api/transfers/simple?userId=${user.id}`)
      }

      if (!response.ok) {
        throw new Error('Failed to fetch transfer status from both APIs')
      }

      const data = await response.json()
      setActiveJobs(data.activeJobs || [])
      setRecentJobs(data.recentJobs || [])

    } catch (err) {
      console.error('❌ Error fetching transfer jobs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch transfers')
      // Set empty arrays on error to prevent UI issues
      setActiveJobs([])
      setRecentJobs([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Poll for updates every 5 seconds
  useEffect(() => {
    if (!user?.id) return

    fetchTransferJobs()
    
    const interval = setInterval(fetchTransferJobs, 5000)
    return () => clearInterval(interval)
  }, [user?.id, fetchTransferJobs])

  // Queue a new transfer job
  const queueTransfer = useCallback(async (
    sourceService: string,
    destinationService: string,
    sourceFiles: any[],
    destinationPath: string = 'root',
    priority: number = 1
  ) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    try {
      // Try main API first
      let response = await fetch('/api/transfers/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          sourceService,
          destinationService,
          sourceFiles,
          destinationPath,
          priority
        })
      })

      if (!response.ok) {
        console.warn('⚠️ Main queue API failed, trying simple API...')
        // Fallback to simple API
        response = await fetch('/api/transfers/simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            sourceService,
            destinationService,
            sourceFiles,
            destinationPath,
            priority
          })
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to queue transfer')
      }

      const result = await response.json()
      console.log(`📋 Transfer queued: ${result.jobId}`)
      
      // Refresh jobs list
      await fetchTransferJobs()
      
      return result.jobId
    } catch (err) {
      console.error('❌ Error queuing transfer:', err)
      throw err
    }
  }, [user?.id, fetchTransferJobs])

  // Get specific job status
  const getJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/transfers/status?jobId=${jobId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch job status')
      }

      const data = await response.json()
      return data.job
    } catch (err) {
      console.error('❌ Error fetching job status:', err)
      throw err
    }
  }, [])

  // Pause a job
  const pauseJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch('/api/transfers/queue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          status: 'paused'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to pause job')
      }

      await fetchTransferJobs()
    } catch (err) {
      console.error('❌ Error pausing job:', err)
      throw err
    }
  }, [fetchTransferJobs])

  // Resume a job
  const resumeJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch('/api/transfers/queue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          status: 'queued'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to resume job')
      }

      await fetchTransferJobs()
    } catch (err) {
      console.error('❌ Error resuming job:', err)
      throw err
    }
  }, [fetchTransferJobs])

  // Cancel a job
  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch('/api/transfers/queue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          status: 'failed',
          error: 'Cancelled by user'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel job')
      }

      await fetchTransferJobs()
    } catch (err) {
      console.error('❌ Error cancelling job:', err)
      throw err
    }
  }, [fetchTransferJobs])

  return {
    activeJobs,
    recentJobs,
    loading,
    error,
    fetchTransferJobs,
    queueTransfer,
    getJobStatus,
    pauseJob,
    resumeJob,
    cancelJob
  }
}