import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore'
import { createGoogleDriveService } from '@/lib/google-drive'
import { createOneDriveService } from '@/lib/onedrive'

export class SimpleTransferWorker {
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null
  private readonly PROCESSING_INTERVAL = 10000 // 10 seconds

  constructor() {
    console.log('🔄 Simple Transfer Worker initialized')
  }

  start() {
    if (this.processingInterval) {
      console.log('⚠️ Worker already running')
      return
    }

    console.log('🚀 Starting simple transfer worker...')
    this.processingInterval = setInterval(() => {
      this.processJobs()
    }, this.PROCESSING_INTERVAL)
  }

  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
      console.log('🛑 Simple transfer worker stopped')
    }
  }

  private async processJobs() {
    if (this.isProcessing) {
      return // Prevent concurrent processing
    }

    try {
      this.isProcessing = true
      
      // Get pending/transferring jobs
      const jobsQuery = query(
        collection(db, 'activeTransfers'),
        where('status', 'in', ['pending', 'transferring']),
        orderBy('startTime', 'asc'),
        limit(3)
      )

      const jobsSnapshot = await getDocs(jobsQuery)
      const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      console.log(`📋 Found ${jobs.length} active transfer jobs`)

      for (const job of jobs) {
        await this.processJob(job)
      }

    } catch (error) {
      console.error('❌ Error processing jobs:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processJob(job: any) {
    try {
      console.log(`🔄 Processing job: ${job.id}`)
      
      // Update status to transferring
      await this.updateJobStatus(job.id, job.userId, 'transferring', job.progress || 0)

      // Get user's connections (simplified for now)
      const sourceConnection = await this.getConnection(job.userId, job.sourceService)
      const destConnection = await this.getConnection(job.userId, job.destinationService)

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
      let completedFiles = job.currentFileIndex || 0
      let transferredBytes = job.transferredBytes || 0

      for (let i = completedFiles; i < totalFiles; i++) {
        const file = job.sourceFiles[i]
        
        try {
          console.log(`📁 Processing file ${i + 1}/${totalFiles}: ${file.name}`)
          
          // Download file
          const fileData = await sourceService.downloadFile(file.id)
          const fileSize = fileData.byteLength

          // Upload file
          await destService.uploadFile(fileData, file.name, job.destinationPath)

          completedFiles++
          transferredBytes += fileSize
          
          const progress = Math.round((completedFiles / totalFiles) * 100)
          
          await this.updateJobStatus(job.id, job.userId, 'transferring', progress, {
            currentFileIndex: completedFiles,
            transferredBytes: transferredBytes
          })
          
          console.log(`✅ Completed file: ${file.name} (${completedFiles}/${totalFiles})`)

        } catch (fileError) {
          console.error(`❌ Failed to process file ${file.name}:`, fileError)
          throw fileError
        }
      }

      // Mark as completed
      await this.updateJobStatus(job.id, job.userId, 'completed', 100, {
        currentFileIndex: completedFiles,
        transferredBytes: transferredBytes,
        completedAt: Date.now()
      })
      
      console.log(`🎉 Job completed: ${job.id}`)

    } catch (error) {
      console.error(`❌ Job failed: ${job.id}`, error)
      await this.updateJobStatus(job.id, job.userId, 'failed', job.progress || 0, {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private createServiceInstance(connection: any): any {
    if (connection.provider === 'google') {
      return createGoogleDriveService(connection)
    } else if (connection.provider === 'microsoft') {
      return createOneDriveService(connection)
    }
    return null
  }

  private async getConnection(userId: string, serviceId: string): Promise<any> {
    try {
      // For now, return a mock connection
      // In production, this would fetch from user's stored connections
      console.log(`🔍 Getting connection for user ${userId}, service ${serviceId}`)
      
      // Mock connection data - in production this would come from database
      if (serviceId.includes('google')) {
        return {
          id: serviceId,
          provider: 'google',
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh'
        }
      } else if (serviceId.includes('onedrive')) {
        return {
          id: serviceId,
          provider: 'microsoft',
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh'
        }
      }
      
      return null
    } catch (error) {
      console.error('❌ Error fetching connection:', error)
      return null
    }
  }

  private async updateJobStatus(
    jobId: string, 
    userId: string, 
    status: string, 
    progress: number, 
    additionalData: any = {}
  ) {
    try {
      const updateData = {
        status,
        progress,
        updatedAt: serverTimestamp(),
        ...additionalData
      }

      // Update main document
      await updateDoc(doc(db, 'activeTransfers', jobId), updateData)
      
      // Update user's document
      await updateDoc(doc(db, 'users', userId, 'activeTransfers', jobId), updateData)
      
      console.log(`📝 Updated job ${jobId}: ${status} (${progress}%)`)
    } catch (error) {
      console.error('❌ Error updating job status:', error)
    }
  }
}

// Singleton instance
let workerInstance: SimpleTransferWorker | null = null

export function getSimpleTransferWorker(): SimpleTransferWorker {
  if (!workerInstance) {
    workerInstance = new SimpleTransferWorker()
  }
  return workerInstance
}

// Auto-start worker in server environment
if (typeof window === 'undefined') {
  const worker = getSimpleTransferWorker()
  worker.start()
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down simple transfer worker...')
    worker.stop()
    process.exit(0)
  })
}
