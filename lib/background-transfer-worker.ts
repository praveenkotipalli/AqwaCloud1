import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy, limit, getDoc, setDoc } from 'firebase/firestore'
import { createGoogleDriveService, GoogleDriveService } from '@/lib/google-drive'
import { createOneDriveService, OneDriveService } from '@/lib/onedrive'
import { CloudConnection } from '@/hooks/use-cloud-connections'

export interface BackgroundTransferJob {
  id: string
  userId: string
  sourceService: string
  destinationService: string
  sourceFiles: any[]
  destinationPath: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused'
  progress: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
  retryCount: number
  maxRetries: number
  priority: number
}

export class BackgroundTransferWorker {
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null
  private readonly PROCESSING_INTERVAL = 5000 // 5 seconds
  private readonly MAX_CONCURRENT_JOBS = 3

  constructor() {
    console.log('🔄 Background Transfer Worker initialized')
  }

  start() {
    if (this.processingInterval) {
      console.log('⚠️ Worker already running')
      return
    }

    console.log('🚀 Starting background transfer worker...')
    this.processingInterval = setInterval(() => {
      this.processJobs()
    }, this.PROCESSING_INTERVAL)
  }

  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
      console.log('🛑 Background transfer worker stopped')
    }
  }

  private async processJobs() {
    if (this.isProcessing) {
      return // Prevent concurrent processing
    }

    try {
      this.isProcessing = true
      
      // Get queued jobs, ordered by priority and creation time
      const jobsQuery = query(
        collection(db, 'transferJobs'),
        where('status', '==', 'queued'),
        orderBy('priority', 'desc'),
        orderBy('createdAt', 'asc'),
        limit(this.MAX_CONCURRENT_JOBS)
      )

      const jobsSnapshot = await getDocs(jobsQuery)
      const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BackgroundTransferJob))

      console.log(`📋 Found ${jobs.length} queued jobs`)

      for (const job of jobs) {
        await this.processJob(job)
      }

    } catch (error) {
      console.error('❌ Error processing jobs:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processJob(job: BackgroundTransferJob) {
    try {
      console.log(`🔄 Processing job: ${job.id}`)
      
      // Update status to processing
      await this.updateJobStatus(job.id, 'processing', 0)

      // Get user's cloud connections
      const userConnections = await this.getUserConnections(job.userId)
      if (!userConnections) {
        throw new Error('User connections not found')
      }

      const sourceConnection = userConnections.find(c => c.id === job.sourceService)
      const destConnection = userConnections.find(c => c.id === job.destinationService)

      if (!sourceConnection || !destConnection) {
        throw new Error('Source or destination connection not found')
      }

      // Create service instances
      const sourceService = this.createServiceInstance(sourceConnection)
      const destService = this.createServiceInstance(destConnection)

      if (!sourceService || !destService) {
        throw new Error('Failed to create service instances')
      }

      // Process each file
      const totalFiles = job.sourceFiles.length
      let completedFiles = 0
      let totalBytes = 0

      for (const file of job.sourceFiles) {
        try {
          console.log(`📁 Processing file: ${file.name}`)
          
          // Download file
          const fileData = await sourceService.downloadFile(file.id)
          totalBytes += fileData.byteLength

          // Upload file
          await destService.uploadFile(fileData, file.name, job.destinationPath)

          completedFiles++
          const progress = Math.round((completedFiles / totalFiles) * 100)
          
          await this.updateJobStatus(job.id, 'processing', progress)
          
          console.log(`✅ Completed file: ${file.name} (${completedFiles}/${totalFiles})`)

        } catch (fileError) {
          console.error(`❌ Failed to process file ${file.name}:`, fileError)
          
          // Retry logic
          if (job.retryCount < job.maxRetries) {
            job.retryCount++
            await this.updateJobStatus(job.id, 'queued', 0, `Retry ${job.retryCount}/${job.maxRetries}`)
            return // Job will be retried
          } else {
            throw fileError
          }
        }
      }

      // Mark as completed
      await this.updateJobStatus(job.id, 'completed', 100)
      
      // Record transfer in user's history
      await this.recordTransferHistory(job, totalBytes)

      console.log(`🎉 Job completed: ${job.id}`)

    } catch (error) {
      console.error(`❌ Job failed: ${job.id}`, error)
      await this.updateJobStatus(job.id, 'failed', 0, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private createServiceInstance(connection: CloudConnection): GoogleDriveService | OneDriveService | null {
    if (connection.provider === 'google') {
      return createGoogleDriveService(connection)
    } else if (connection.provider === 'microsoft') {
      return createOneDriveService(connection)
    }
    return null
  }

  private async getUserConnections(userId: string): Promise<CloudConnection[] | null> {
    try {
      // Try to get user's stored connections from Firestore
      const userConnectionsRef = doc(db, 'users', userId, 'connections', 'active')
      const userConnectionsDoc = await getDoc(userConnectionsRef)
      
      if (userConnectionsDoc.exists()) {
        const connections = userConnectionsDoc.data()?.connections || []
        console.log(`🔍 Found ${connections.length} stored connections for user: ${userId}`)
        return connections
      } else {
        console.warn(`⚠️ No stored connections found for user: ${userId}`)
        return null
      }
    } catch (error) {
      console.error('❌ Error fetching user connections:', error)
      return null
    }
  }

  private async updateJobStatus(jobId: string, status: string, progress: number, error?: string) {
    try {
      const updateData: any = {
        status,
        progress,
        updatedAt: serverTimestamp()
      }

      if (error) updateData.error = error
      if (status === 'processing') updateData.startedAt = serverTimestamp()
      if (status === 'completed' || status === 'failed') updateData.completedAt = serverTimestamp()

      await updateDoc(doc(db, 'transferJobs', jobId), updateData)
      
      console.log(`📝 Updated job ${jobId}: ${status} (${progress}%)`)
    } catch (error) {
      console.error('❌ Error updating job status:', error)
    }
  }

  private async recordTransferHistory(job: BackgroundTransferJob, totalBytes: number) {
    try {
      const historyEntry = {
        id: job.id,
        timestamp: Date.now(),
        fromService: job.sourceService,
        toService: job.destinationService,
        fileNames: job.sourceFiles.map(f => f.name),
        totalBytes,
        costUsd: 0, // Free platform
        status: 'completed'
      }

      await setDoc(doc(db, 'users', job.userId, 'transferHistory', job.id), {
        ...historyEntry,
        createdAt: serverTimestamp()
      })

      console.log(`📝 Recorded transfer history for job: ${job.id}`)
    } catch (error) {
      console.error('❌ Error recording transfer history:', error)
    }
  }
}

// Singleton instance
let workerInstance: BackgroundTransferWorker | null = null

export function getBackgroundTransferWorker(): BackgroundTransferWorker {
  if (!workerInstance) {
    workerInstance = new BackgroundTransferWorker()
  }
  return workerInstance
}

// Auto-start worker in server environment
if (typeof window === 'undefined') {
  const worker = getBackgroundTransferWorker()
  worker.start()
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down background transfer worker...')
    worker.stop()
    process.exit(0)
  })
}
