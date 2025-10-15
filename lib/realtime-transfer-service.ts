import { FileItem, CloudConnection } from "@/hooks/use-cloud-connections"
import { RealTimeSyncService, TransferUpdate, FileChangeEvent, SyncJob } from "./real-time-sync"
import { FileMonitorService } from "./file-monitor"
import { ConflictResolver, Conflict } from "./conflict-resolver"
import { BackgroundSyncService } from "./background-sync"
import { GoogleDriveService, createGoogleDriveService } from "./google-drive"
import { OneDriveService, createOneDriveService } from "./onedrive"

export interface RealTimeTransferConfig {
  enableRealTimeSync: boolean
  autoResolveConflicts: boolean
  syncInterval: number
  maxConcurrentTransfers: number
  enableFileMonitoring: boolean
  conflictResolutionStrategy: 'auto' | 'manual' | 'prompt'
}

export interface TransferSession {
  id: string
  sourceConnection: CloudConnection
  destConnection: CloudConnection
  sourceService: GoogleDriveService | OneDriveService
  destService: GoogleDriveService | OneDriveService
  monitoredFiles: Set<string>
  activeTransfers: Map<string, SyncJob>
  config: RealTimeTransferConfig
  startTime: Date
  isActive: boolean
}

export class RealTimeTransferService {
  private sessions: Map<string, TransferSession> = new Map()
  private realTimeSync: RealTimeSyncService
  private fileMonitor: FileMonitorService
  private conflictResolver: ConflictResolver
  private backgroundSync: BackgroundSyncService
  private config: RealTimeTransferConfig
  private updateListeners: Set<(update: any) => void> = new Set()

  constructor(config: RealTimeTransferConfig = {
    enableRealTimeSync: false, // Disabled to prevent WebSocket errors
    autoResolveConflicts: true,
    syncInterval: 30000,
    maxConcurrentTransfers: 3,
    enableFileMonitoring: false, // Disabled to prevent API spam
    conflictResolutionStrategy: 'auto'
  }) {
    this.config = config
    this.realTimeSync = new RealTimeSyncService()
    this.fileMonitor = new FileMonitorService()
    this.conflictResolver = new ConflictResolver()
    this.backgroundSync = new BackgroundSyncService()
    
    this.initializeServices()
  }

  // Initialize all services
  private async initializeServices(): Promise<void> {
    console.log('🚀 Initializing real-time transfer services')
    
    try {
      // Skip WebSocket connection to prevent errors
      console.log('🔌 WebSocket disabled - using direct transfer mode')
      
      // Stop any existing file monitoring to prevent API spam
      this.fileMonitor.stopAllMonitoring()
      console.log('📁 File monitoring disabled - using manual transfer mode')
      
      // Setup background sync callbacks
      this.setupBackgroundSyncCallbacks()
      
      console.log('✅ Real-time transfer services initialized (WebSocket & monitoring disabled)')
    } catch (error) {
      console.error('❌ Failed to initialize real-time transfer services:', error)
    }
  }

  // Setup real-time sync callbacks
  private setupRealTimeCallbacks(): void {
    this.realTimeSync.onUpdate('transfer_service', (update: TransferUpdate) => {
      console.log('📡 Received real-time update:', update)
      this.handleRealTimeUpdate(update)
    })
  }

  // Setup file monitoring callbacks
  private setupFileMonitoringCallbacks(): void {
    this.fileMonitor.onFileChange('transfer_service', (event: FileChangeEvent) => {
      console.log('📝 File change detected:', event)
      this.handleFileChangeEvent(event)
    })
  }

  // Setup background sync callbacks
  private setupBackgroundSyncCallbacks(): void {
    this.backgroundSync.onJobUpdate('transfer_service', (job: SyncJob) => {
      console.log('🔄 Background sync job update:', job)
      this.handleSyncJobUpdate(job)
    })
  }

  // Start a real-time transfer session
  async startTransferSession(
    sourceConnection: CloudConnection,
    destConnection: CloudConnection,
    files: FileItem[]
  ): Promise<string> {
    console.log(`🚀 Starting real-time transfer session`)
    console.log(`📁 Source: ${sourceConnection.name} (${sourceConnection.provider})`)
    console.log(`📁 Destination: ${destConnection.name} (${destConnection.provider})`)
    console.log(`📄 Files: ${files.length}`)

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    // Create service instances
    const sourceService = this.createServiceInstance(sourceConnection)
    const destService = this.createServiceInstance(destConnection)
    
    if (!sourceService || !destService) {
      throw new Error('Failed to create service instances')
    }

    // Create transfer session
    const session: TransferSession = {
      id: sessionId,
      sourceConnection,
      destConnection,
      sourceService,
      destService,
      monitoredFiles: new Set(),
      activeTransfers: new Map(),
      config: this.config,
      startTime: new Date(),
      isActive: true
    }

    this.sessions.set(sessionId, session)

    // Skip file monitoring to prevent API spam
    console.log('📁 File monitoring skipped - using manual transfer mode')

    // Queue initial transfers
    await this.queueInitialTransfers(session, files)

    console.log(`✅ Transfer session started: ${sessionId}`)
    return sessionId
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

  // Start monitoring files in the session
  private async startFileMonitoring(session: TransferSession, files: FileItem[]): Promise<void> {
    console.log(`👁️ Starting file monitoring for ${files.length} files`)
    
    // Notify WebSocket server that real file monitoring is starting
    this.realTimeSync.notifyFileMonitoringStarted()
    
    let cumulativeBytesForJob = 0
    for (const file of files) {
      try {
        await this.fileMonitor.startMonitoring(
          file,
          session.sourceConnection.provider,
          'root', // Default folder
          session.sourceService,
          session.destService
        )
        
        session.monitoredFiles.add(file.id)
        console.log(`👁️ Monitoring file: ${file.name}`)
      } catch (error) {
        console.error(`❌ Failed to start monitoring file ${file.name}:`, error)
      }
    }
  }

  // Queue initial transfers
  private async queueInitialTransfers(session: TransferSession, files: FileItem[]): Promise<void> {
    console.log(`📋 Starting direct transfers for ${files.length} files`)
    
    for (const file of files) {
      const syncJob: SyncJob = {
        id: `transfer_${file.id}_${Date.now()}`,
        sourceFile: file,
        status: 'transferring',
        progress: 0,
        startTime: new Date()
      }
      
      session.activeTransfers.set(syncJob.id, syncJob)
      
      // Start direct transfer instead of queuing to background sync
      this.performDirectTransfer(session, syncJob)
    }
  }
  
  // Perform direct file transfer
  private async performDirectTransfer(session: TransferSession, job: SyncJob): Promise<void> {
    try {
      let cumulativeBytesForJob = 0
      console.log(`🔄 Starting direct transfer for: ${job.sourceFile.name}`)
      
      // Update progress - Starting download (25%)
      job.progress = 25
      this.notifyUpdateListeners({
        id: `progress_${job.id}`,
        type: 'progress',
        data: {
          jobId: job.id,
          sessionId: session.id,
          progress: job.progress,
          status: job.status,
          fileName: job.sourceFile.name
        },
        timestamp: new Date()
      })
      
      // Download file from source service with timeout
      console.log(`📥 Downloading ${job.sourceFile.name} from ${session.sourceConnection.provider}...`)
      
      // Download with retry and backoff
      const downloadTimeoutMs = 30 * 60 * 1000 // 30 minutes for large files
      const maxDownloadRetries = 3
      let attempt = 0
      let fileData: ArrayBuffer | null = null
      while (attempt < maxDownloadRetries && !fileData) {
        attempt++
        try {
          const downloadPromise = session.sourceService.downloadFile(job.sourceFile.id)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Download timeout after 30 minutes')), downloadTimeoutMs)
          )
          fileData = await Promise.race([downloadPromise, timeoutPromise]) as ArrayBuffer
        } catch (err) {
          if (attempt >= maxDownloadRetries) throw err
          const backoff = Math.min(30000, 1000 * Math.pow(2, attempt))
          console.warn(`⏳ Download retry ${attempt}/${maxDownloadRetries} after ${backoff}ms due to error:`, err)
          await new Promise(r => setTimeout(r, backoff))
        }
      }
      if (!fileData) throw new Error('Download failed after retries')
      console.log(`✅ Downloaded ${job.sourceFile.name}: ${fileData.byteLength} bytes`)
      
      // Update progress - Download complete, starting upload (50%)
      job.progress = 50
      this.notifyUpdateListeners({
        id: `progress_${job.id}`,
        type: 'progress',
        data: {
          jobId: job.id,
          sessionId: session.id,
          progress: job.progress,
          status: job.status,
          fileName: job.sourceFile.name
        },
        timestamp: new Date()
      })
      
      // Upload file to destination service with timeout
      console.log(`📤 Uploading ${job.sourceFile.name} to ${session.destConnection.provider}...`)
      // Update progress - Upload started (60%)
      job.progress = 60
      this.notifyUpdateListeners({
        id: `progress_${job.id}`,
        type: 'progress',
        data: {
          jobId: job.id,
          sessionId: session.id,
          progress: job.progress,
          status: job.status,
          fileName: job.sourceFile.name
        },
        timestamp: new Date()
      })
      
      const uploadPromise = (async () => {
        try {
          const uploaded = await session.destService.uploadFile(fileData!, job.sourceFile.name, 'root')
          try { cumulativeBytesForJob += (fileData as ArrayBuffer).byteLength } catch {}
          return uploaded
        } catch (err: any) {
          const message = err instanceof Error ? err.message : String(err)
          const looks401 = message.includes('401') || message.includes('Unauthorized')
          const isMicrosoft = session.destConnection.provider === 'microsoft'
          if (looks401 && isMicrosoft && session.destConnection.refreshToken) {
            console.log('🔄 Upload received 401. Attempting OneDrive token refresh and retry...')
            try {
              const resp = await fetch('/api/auth/onedrive/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: session.destConnection.refreshToken })
              })
              if (resp.ok) {
                const refreshed = await resp.json()
                const newAccessToken = refreshed.access_token
                const newRefreshToken = refreshed.refresh_token || session.destConnection.refreshToken
                const newExpiresAt = Date.now() + (refreshed.expires_in * 1000)
                if (newAccessToken) {
                  // Update connection
                  session.destConnection.accessToken = newAccessToken
                  session.destConnection.refreshToken = newRefreshToken
                  session.destConnection.expiresAt = newExpiresAt
                  // Recreate dest service with new token
                  const newService = createOneDriveService(session.destConnection)
                  if (newService) {
                    session.destService = newService
                  }
                  console.log('✅ OneDrive token refreshed. Retrying upload...')
                  const uploadedRetry = await session.destService.uploadFile(fileData, job.sourceFile.name, 'root')
                  try { cumulativeBytesForJob += (fileData as ArrayBuffer).byteLength } catch {}
                  return uploadedRetry
                }
              } else {
                const t = await resp.text()
                console.warn('❌ OneDrive token refresh failed during upload retry:', t)
              }
            } catch (refreshErr) {
              console.warn('❌ OneDrive token refresh exception during upload retry:', refreshErr)
            }
          }
          throw err
        }
      })()
      const uploadTimeoutMs = 30 * 60 * 1000 // 30 minutes for large files
      const uploadTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout after 30 minutes')), uploadTimeoutMs)
      )
      
      await Promise.race([uploadPromise, uploadTimeoutPromise])
      console.log(`✅ Uploaded ${job.sourceFile.name} successfully`)
      // Notify bytes transferred for this file
      try {
        this.notifyUpdateListeners({
          id: `progress_${job.id}`,
          type: 'progress',
          data: {
            jobId: job.id,
            sessionId: session.id,
            bytes: (fileData as ArrayBuffer).byteLength,
            status: job.status,
            fileName: job.sourceFile.name
          },
          timestamp: new Date()
        })
      } catch {}
      // Update progress - Upload complete, finalizing (90%)
      job.progress = 90
      this.notifyUpdateListeners({
        id: `progress_${job.id}`,
        type: 'progress',
        data: {
          jobId: job.id,
          sessionId: session.id,
          progress: job.progress,
          status: job.status,
          fileName: job.sourceFile.name,
          totalBytes: cumulativeBytesForJob
        },
        timestamp: new Date()
      })
      
      // Update progress - Complete (100%)
      job.progress = 100
      job.status = 'completed'
      job.endTime = new Date()
      this.notifyUpdateListeners({
        id: `progress_${job.id}`,
        type: 'progress',
        data: {
          jobId: job.id,
          sessionId: session.id,
          progress: job.progress,
          status: job.status,
          fileName: job.sourceFile.name,
          totalBytes: cumulativeBytesForJob
        },
        timestamp: new Date()
      })
      
      console.log(`🎉 Direct transfer completed: ${job.sourceFile.name}`)
      
    } catch (error) {
      console.error(`❌ Direct transfer failed for ${job.sourceFile.name}:`, error)
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown error'
      job.endTime = new Date()
      this.notifyUpdateListeners({
        id: `progress_${job.id}`,
        type: 'progress',
        data: {
          jobId: job.id,
          sessionId: session.id,
          progress: job.progress || 0,
          status: job.status,
          fileName: job.sourceFile.name,
          error: job.error
        },
        timestamp: new Date()
      })
    }
  }

  // Handle real-time updates
  private handleRealTimeUpdate(update: TransferUpdate): void {
    console.log('📡 Processing real-time update:', update.type)
    
    switch (update.type) {
      case 'file_changed':
        this.handleFileChangeEvent(update.data as FileChangeEvent)
        break
      case 'conflict':
        this.handleConflictNotification(update.data)
        break
      case 'progress':
        this.handleProgressUpdate(update.data)
        break
      default:
        console.log(`📡 Unhandled update type: ${update.type}`)
    }
  }

  // Handle file change events
  private async handleFileChangeEvent(event: FileChangeEvent): Promise<void> {
    console.log(`📝 Handling file change: ${event.fileName} (${event.changeType})`)
    
    // Find affected sessions
    const affectedSessions = this.findSessionsByFileId(event.fileId)
    
    for (const session of affectedSessions) {
      await this.processFileChangeInSession(session, event)
    }
    
    // Notify background sync
    await this.backgroundSync.handleFileChangeEvent(event)
  }

  // Find sessions that are monitoring a specific file
  private findSessionsByFileId(fileId: string): TransferSession[] {
    const affectedSessions: TransferSession[] = []
    
    this.sessions.forEach(session => {
      if (session.monitoredFiles.has(fileId)) {
        affectedSessions.push(session)
      }
    })
    
    return affectedSessions
  }

  // Process file change in a specific session
  private async processFileChangeInSession(session: TransferSession, event: FileChangeEvent): Promise<void> {
    console.log(`🔄 Processing file change in session: ${session.id}`)
    
    // Find active transfer for this file
    const activeTransfer = Array.from(session.activeTransfers.values())
      .find(job => job.sourceFile.id === event.fileId)
    
    if (activeTransfer) {
      // Check for conflicts
      const conflict = await this.detectConflict(activeTransfer, event)
      
      if (conflict) {
        await this.handleConflictInSession(session, activeTransfer, conflict)
      } else {
        // Update transfer progress
        this.updateTransferForFileChange(activeTransfer, event)
      }
    }
  }

  // Detect conflicts
  private async detectConflict(job: SyncJob, event: FileChangeEvent): Promise<Conflict | null> {
    // This would involve checking actual file states
    // For now, simulate conflict detection
    
    if (event.changeType === 'modified' && job.status === 'transferring') {
      const conflict: Conflict = {
        id: `conflict_${Date.now()}`,
        sourceFile: job.sourceFile,
        destFile: job.destFile || job.sourceFile,
        conflictType: 'modified_both' as any,
        detectedAt: new Date()
      }
      
      return conflict
    }
    
    return null
  }

  // Handle conflict in session
  private async handleConflictInSession(
    session: TransferSession, 
    job: SyncJob, 
    conflict: Conflict
  ): Promise<void> {
    console.log(`⚔️ Handling conflict in session: ${session.id}`)
    
    if (this.config.autoResolveConflicts) {
      const resolution = this.conflictResolver.autoResolveConflict(conflict)
      
      if (resolution) {
        job.conflictResolution = resolution
        console.log(`✅ Auto-resolved conflict for job: ${job.id}`)
      } else {
        console.log(`❌ Could not auto-resolve conflict for job: ${job.id}`)
        // Send conflict notification
        this.realTimeSync.sendConflictNotification(conflict)
      }
    } else {
      // Send conflict notification for manual resolution
      this.realTimeSync.sendConflictNotification(conflict)
    }
  }

  // Update transfer for file change
  private updateTransferForFileChange(job: SyncJob, event: FileChangeEvent): void {
    console.log(`🔄 Updating transfer ${job.id} for file change`)
    
    // Update file metadata
    if (event.changeType === 'modified') {
      job.sourceFile.modified = event.timestamp.toISOString()
    }
    
    // Send progress update
    this.realTimeSync.sendProgressUpdate(job.id, job.progress, job.status)
  }

  // Handle conflict notification
  private handleConflictNotification(conflictData: any): void {
    console.log('⚔️ Received conflict notification:', conflictData)
    // This would trigger UI to show conflict resolution dialog
  }

  // Handle progress update
  private handleProgressUpdate(progressData: any): void {
    console.log('📊 Received progress update:', progressData)
    // This would update UI progress indicators
  }

  // Handle sync job update
  private handleSyncJobUpdate(job: SyncJob): void {
    console.log('🔄 Sync job update:', job.status, job.progress)
    
    const update = {
      id: `progress_${job.id}`,
      type: 'progress',
      data: {
        jobId: job.id,
        progress: job.progress,
        status: job.status,
        message: (job as any).message,
        fileName: job.sourceFile?.name || 'Unknown file',
        fileSize: job.sourceFile?.size || 'Unknown size'
      },
      timestamp: new Date()
    }
    
    // Send real-time update
    this.realTimeSync.sendProgressUpdate(job.id, job.progress, job.status)
    
    // Notify local listeners
    this.notifyUpdateListeners(update)
  }

  // Add update listener
  onUpdate(listener: (update: any) => void): void {
    this.updateListeners.add(listener)
  }

  // Remove update listener
  offUpdate(listener: (update: any) => void): void {
    this.updateListeners.delete(listener)
  }

  // Notify all update listeners
  private notifyUpdateListeners(update: any): void {
    console.log(`📢 Notifying ${this.updateListeners.size} listeners:`, update)
    this.updateListeners.forEach(listener => {
      try {
        listener(update)
      } catch (error) {
        console.error('Error in update listener:', error)
      }
    })
  }

  // Stop a transfer session
  stopTransferSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.warn(`⚠️ Session ${sessionId} not found`)
      return
    }
    
    console.log(`🛑 Stopping transfer session: ${sessionId}`)
    
    // Stop monitoring files
    session.monitoredFiles.forEach(fileId => {
      this.fileMonitor.stopMonitoring(fileId)
    })
    
    // Notify WebSocket server that real file monitoring has stopped
    this.realTimeSync.notifyFileMonitoringStopped()
    
    // Mark session as inactive
    session.isActive = false
    
    // Remove from active sessions
    this.sessions.delete(sessionId)
    
    console.log(`✅ Transfer session stopped: ${sessionId}`)
  }

  // Get session status
  getSessionStatus(sessionId: string): TransferSession | null {
    return this.sessions.get(sessionId) || null
  }

  // Get all active sessions
  getActiveSessions(): TransferSession[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive)
  }

  // Update configuration
  updateConfig(newConfig: Partial<RealTimeTransferConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('⚙️ Updated real-time transfer configuration:', this.config)
  }

  // Get service statistics
  getServiceStats(): {
    activeSessions: number
    monitoredFiles: number
    activeTransfers: number
    queueStatus: any
  } {
    const activeSessions = this.getActiveSessions()
    const totalMonitoredFiles = activeSessions.reduce((sum, session) => 
      sum + session.monitoredFiles.size, 0
    )
    const totalActiveTransfers = activeSessions.reduce((sum, session) => 
      sum + session.activeTransfers.size, 0
    )
    
    return {
      activeSessions: activeSessions.length,
      monitoredFiles: totalMonitoredFiles,
      activeTransfers: totalActiveTransfers,
      queueStatus: this.backgroundSync.getQueueStatus()
    }
  }

  // Cleanup and stop all services
  cleanup(): void {
    console.log('🧹 Cleaning up real-time transfer service')
    
    // Stop all sessions
    this.sessions.forEach((session, sessionId) => {
      this.stopTransferSession(sessionId)
    })
    
    // Stop background services
    this.backgroundSync.stop()
    this.fileMonitor.stopAllMonitoring()
    this.realTimeSync.disconnect()
    
    console.log('✅ Real-time transfer service cleaned up')
  }
}

// Singleton instance
let realTimeTransferInstance: RealTimeTransferService | null = null

export function getRealTimeTransferService(): RealTimeTransferService {
  if (!realTimeTransferInstance) {
    realTimeTransferInstance = new RealTimeTransferService()
  }
  return realTimeTransferInstance
}
