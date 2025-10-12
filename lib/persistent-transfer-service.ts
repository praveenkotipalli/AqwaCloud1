import { db } from './firebase'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, onSnapshot, Timestamp, setDoc, getDoc } from 'firebase/firestore'
import { GoogleDriveService, createGoogleDriveService } from './google-drive'
import { OneDriveService, createOneDriveService } from './onedrive'
import { CloudConnection } from '@/hooks/use-cloud-connections'

export interface PersistentTransferJob {
  id: string
  userId: string
  sessionId: string
  sourceConnection: CloudConnection
  destConnection: CloudConnection
  sourceFile: {
    id: string
    name: string
    size: number
    modified: string
    type: string
  }
  destFile?: {
    id: string
    name: string
    size: number
    modified: string
    type: string
  }
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'paused'
  progress: number
  bytesTransferred: number
  totalBytes: number
  startTime: Date
  endTime?: Date
  error?: string
  retryCount: number
  maxRetries: number
  createdAt: Date
  updatedAt: Date
}

export interface TransferProgressUpdate {
  jobId: string
  userId: string
  progress: number
  status: string
  bytesTransferred: number
  totalBytes: number
  fileName: string
  timestamp: Date
}

export class PersistentTransferService {
  private static instance: PersistentTransferService | null = null
  private activeJobs: Map<string, PersistentTransferJob> = new Map()
  private progressListeners: Map<string, (update: TransferProgressUpdate) => void> = new Map()
  private isProcessing: boolean = false
  private processingQueue: string[] = []
  private maxConcurrentTransfers: number = 3

  private constructor() {
    this.startBackgroundProcessor()
  }

  public static getInstance(): PersistentTransferService {
    if (!PersistentTransferService.instance) {
      PersistentTransferService.instance = new PersistentTransferService()
    }
    return PersistentTransferService.instance
  }

  // Start a persistent transfer job
  async startTransfer(
    userId: string,
    sessionId: string,
    sourceConnection: CloudConnection,
    destConnection: CloudConnection,
    sourceFile: any
  ): Promise<string> {
    console.log(`🚀 Starting persistent transfer for user: ${userId}`)
    
    const jobId = `transfer_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const transferJob: PersistentTransferJob = {
      id: jobId,
      userId,
      sessionId,
      sourceConnection,
      destConnection,
      sourceFile,
      status: 'pending',
      progress: 0,
      bytesTransferred: 0,
      totalBytes: sourceFile.size || 0,
      startTime: new Date(),
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Save to Firebase
    await this.saveTransferJob(transferJob)
    
    // Add to processing queue
    this.processingQueue.push(jobId)
    
    console.log(`✅ Persistent transfer job created: ${jobId}`)
    return jobId
  }

  // Save transfer job to Firebase
  private async saveTransferJob(job: PersistentTransferJob): Promise<void> {
    try {
      const jobData = {
        ...job,
        startTime: Timestamp.fromDate(job.startTime),
        endTime: job.endTime ? Timestamp.fromDate(job.endTime) : null,
        createdAt: Timestamp.fromDate(job.createdAt),
        updatedAt: Timestamp.fromDate(job.updatedAt)
      }

      // Use deterministic document ID so subsequent updates via job.id work with security rules
      await setDoc(doc(db, 'transferJobs', job.id), jobData)
      console.log(`💾 Transfer job saved to Firebase: ${job.id}`)
    } catch (error) {
      console.error(`❌ Failed to save transfer job:`, error)
      throw error
    }
  }

  // Update transfer job in Firebase
  private async updateTransferJob(job: PersistentTransferJob): Promise<void> {
    try {
      const jobData = {
        ...job,
        startTime: Timestamp.fromDate(job.startTime),
        endTime: job.endTime ? Timestamp.fromDate(job.endTime) : null,
        createdAt: Timestamp.fromDate(job.createdAt),
        updatedAt: Timestamp.fromDate(job.updatedAt)
      }

      const jobRef = doc(db, 'transferJobs', job.id)
      await updateDoc(jobRef, jobData)
      console.log(`💾 Transfer job updated in Firebase: ${job.id}`)
    } catch (error) {
      console.error(`❌ Failed to update transfer job:`, error)
    }
  }

  // Background processor that runs continuously
  private startBackgroundProcessor(): void {
    console.log(`🔄 Starting background transfer processor`)
    
    setInterval(async () => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        await this.processNextJob()
      }
    }, 1000) // Check every second

    // Also listen for real-time updates from Firebase
    this.setupFirebaseListeners()
  }

  // Process the next job in the queue
  private async processNextJob(): Promise<void> {
    if (this.processingQueue.length === 0) return

    const jobId = this.processingQueue.shift()!
    this.isProcessing = true

    try {
      await this.executeTransfer(jobId)
    } catch (error) {
      console.error(`❌ Failed to process job ${jobId}:`, error)
    } finally {
      this.isProcessing = false
    }
  }

  // Execute the actual transfer
  private async executeTransfer(jobId: string): Promise<void> {
    console.log(`🔄 Executing transfer job: ${jobId}`)
    
    // Get job from Firebase
    const job = await this.getTransferJob(jobId)
    if (!job) {
      console.error(`❌ Job not found: ${jobId}`)
      return
    }

    this.activeJobs.set(jobId, job)

    try {
      // Update status to transferring
      job.status = 'transferring'
      job.startTime = new Date()
      job.updatedAt = new Date()
      await this.updateTransferJob(job)

      // Create service instances
      const sourceService = this.createServiceInstance(job.sourceConnection)
      const destService = this.createServiceInstance(job.destConnection)

      if (!sourceService || !destService) {
        throw new Error('Failed to create service instances')
      }

      // Download file from source
      console.log(`📥 Downloading ${job.sourceFile.name} from ${job.sourceConnection.provider}...`)
      job.progress = 25
      await this.updateTransferJob(job)
      this.notifyProgress(job)

      const fileData = await sourceService.downloadFile(job.sourceFile.id)
      console.log(`✅ Downloaded ${job.sourceFile.name}: ${fileData.byteLength} bytes`)

      // Upload file to destination
      console.log(`📤 Uploading ${job.sourceFile.name} to ${job.destConnection.provider}...`)
      job.progress = 50
      job.bytesTransferred = fileData.byteLength
      await this.updateTransferJob(job)
      this.notifyProgress(job)

      const uploadedFile = await destService.uploadFile(fileData, job.sourceFile.name, 'root')
      console.log(`✅ Uploaded ${job.sourceFile.name} successfully`)

      // Update job with destination file info
      job.destFile = {
        id: uploadedFile.id,
        name: uploadedFile.name,
        size: uploadedFile.size,
        modified: uploadedFile.modified,
        type: uploadedFile.type
      }

      // Complete the transfer
      job.status = 'completed'
      job.progress = 100
      job.endTime = new Date()
      job.updatedAt = new Date()
      await this.updateTransferJob(job)
      this.notifyProgress(job)

      console.log(`🎉 Transfer completed successfully: ${job.sourceFile.name}`)

    } catch (error) {
      console.error(`❌ Transfer failed for ${job.sourceFile.name}:`, error)
      
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown error'
      job.endTime = new Date()
      job.updatedAt = new Date()
      await this.updateTransferJob(job)
      this.notifyProgress(job)

      // Retry logic
      if (job.retryCount < job.maxRetries) {
        job.retryCount++
        job.status = 'pending'
        job.progress = 0
        job.error = undefined
        job.updatedAt = new Date()
        await this.updateTransferJob(job)
        
        // Add back to queue for retry
        this.processingQueue.push(jobId)
        console.log(`🔄 Retrying transfer (attempt ${job.retryCount}/${job.maxRetries}): ${job.sourceFile.name}`)
      }
    } finally {
      this.activeJobs.delete(jobId)
    }
  }

  // Create service instance from connection
  private createServiceInstance(connection: CloudConnection): GoogleDriveService | OneDriveService | null {
    if (connection.provider === 'google') {
      return createGoogleDriveService(connection)
    } else if (connection.provider === 'microsoft') {
      return createOneDriveService(connection)
    }
    return null
  }

  // Get transfer job from Firebase
  private async getTransferJob(jobId: string): Promise<PersistentTransferJob | null> {
    try {
      const jobRef = doc(db, 'transferJobs', jobId)
      const snap = await getDoc(jobRef)
      if (!snap.exists()) {
        return null
      }
      const data = snap.data()
      
      return {
        ...data,
        startTime: data.startTime.toDate(),
        endTime: data.endTime ? data.endTime.toDate() : undefined,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as PersistentTransferJob
    } catch (error) {
      console.error(`❌ Failed to get transfer job:`, error)
      return null
    }
  }

  // Setup Firebase listeners for real-time updates
  private setupFirebaseListeners(): void {
    console.log(`👂 Setting up Firebase listeners for transfer jobs`)
    
    // Listen for new jobs
    const jobsQuery = query(
      collection(db, 'transferJobs'),
      where('status', 'in', ['pending', 'transferring']),
      orderBy('createdAt', 'asc')
    )

    onSnapshot(jobsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const jobData = change.doc.data()
          const jobId = jobData.id
          
          if (!this.processingQueue.includes(jobId) && !this.activeJobs.has(jobId)) {
            this.processingQueue.push(jobId)
            console.log(`📥 New transfer job detected: ${jobId}`)
          }
        }
      })
    })
  }

  // Get user's transfer jobs
  async getUserTransferJobs(userId: string): Promise<PersistentTransferJob[]> {
    try {
      const q = query(
        collection(db, 'transferJobs'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const jobs: PersistentTransferJob[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        jobs.push({
          ...data,
          startTime: data.startTime.toDate(),
          endTime: data.endTime ? data.endTime.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as PersistentTransferJob)
      })

      return jobs
    } catch (error) {
      console.error(`❌ Failed to get user transfer jobs:`, error)
      return []
    }
  }

  // Get active transfers for user
  async getActiveTransfers(userId: string): Promise<PersistentTransferJob[]> {
    const allJobs = await this.getUserTransferJobs(userId)
    return allJobs.filter(job => 
      job.status === 'pending' || job.status === 'transferring'
    )
  }

  // Get completed transfers for user
  async getCompletedTransfers(userId: string): Promise<PersistentTransferJob[]> {
    const allJobs = await this.getUserTransferJobs(userId)
    return allJobs.filter(job => 
      job.status === 'completed' || job.status === 'failed'
    )
  }

  // Pause a transfer
  async pauseTransfer(jobId: string): Promise<void> {
    const job = await this.getTransferJob(jobId)
    if (!job) return

    job.status = 'paused'
    job.updatedAt = new Date()
    await this.updateTransferJob(job)

    // Remove from processing queue
    const index = this.processingQueue.indexOf(jobId)
    if (index > -1) {
      this.processingQueue.splice(index, 1)
    }

    console.log(`⏸️ Transfer paused: ${jobId}`)
  }

  // Resume a transfer
  async resumeTransfer(jobId: string): Promise<void> {
    const job = await this.getTransferJob(jobId)
    if (!job) return

    job.status = 'pending'
    job.updatedAt = new Date()
    await this.updateTransferJob(job)

    // Add back to processing queue
    if (!this.processingQueue.includes(jobId)) {
      this.processingQueue.push(jobId)
    }

    console.log(`▶️ Transfer resumed: ${jobId}`)
  }

  // Cancel a transfer
  async cancelTransfer(jobId: string): Promise<void> {
    const job = await this.getTransferJob(jobId)
    if (!job) return

    job.status = 'failed'
    job.error = 'Cancelled by user'
    job.endTime = new Date()
    job.updatedAt = new Date()
    await this.updateTransferJob(job)

    // Remove from processing queue
    const index = this.processingQueue.indexOf(jobId)
    if (index > -1) {
      this.processingQueue.splice(index, 1)
    }

    console.log(`❌ Transfer cancelled: ${jobId}`)
  }

  // Add progress listener
  addProgressListener(userId: string, listener: (update: TransferProgressUpdate) => void): void {
    this.progressListeners.set(userId, listener)
  }

  // Remove progress listener
  removeProgressListener(userId: string): void {
    this.progressListeners.delete(userId)
  }

  // Notify progress update
  private notifyProgress(job: PersistentTransferJob): void {
    const update: TransferProgressUpdate = {
      jobId: job.id,
      userId: job.userId,
      progress: job.progress,
      status: job.status,
      bytesTransferred: job.bytesTransferred,
      totalBytes: job.totalBytes,
      fileName: job.sourceFile.name,
      timestamp: new Date()
    }

    const listener = this.progressListeners.get(job.userId)
    if (listener) {
      listener(update)
    }
  }

  // Get service statistics
  getServiceStats(): {
    activeJobs: number
    queuedJobs: number
    processingQueue: string[]
  } {
    return {
      activeJobs: this.activeJobs.size,
      queuedJobs: this.processingQueue.length,
      processingQueue: [...this.processingQueue]
    }
  }
}

// Export singleton instance
export const persistentTransferService = PersistentTransferService.getInstance()
