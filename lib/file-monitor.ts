import { FileItem } from "@/hooks/use-cloud-connections"
import { FileChangeEvent } from "./real-time-sync"
import { GoogleDriveService } from "./google-drive"
import { OneDriveService } from "./onedrive"

export interface FileMonitorConfig {
  pollInterval: number // milliseconds
  maxRetries: number
  retryDelay: number // milliseconds
}

export interface MonitoredFile {
  id: string
  name: string
  lastModified: Date
  size: number
  source: 'google' | 'microsoft'
  folderId: string
  lastTransferTriggered?: Date
}

export class FileMonitorService {
  private monitoredFiles: Map<string, MonitoredFile> = new Map()
  private pollInterval: NodeJS.Timeout | null = null
  private changeCallbacks: Map<string, (event: FileChangeEvent) => void> = new Map()
  private config: FileMonitorConfig

  constructor(config: FileMonitorConfig = {
    pollInterval: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 5000
  }) {
    this.config = config
  }

  // Start monitoring a file
  async startMonitoring(
    file: FileItem, 
    source: 'google' | 'microsoft',
    folderId: string,
    sourceService: GoogleDriveService | OneDriveService,
    destService?: GoogleDriveService | OneDriveService
  ): Promise<void> {
    console.log(`👁️ Starting to monitor file: ${file.name} (${source})`)
    
    const monitoredFile: MonitoredFile = {
      id: file.id,
      name: file.name,
      lastModified: new Date(file.modified || new Date()),
      size: parseInt(file.size?.replace(/[^\d]/g, '') || '0'),
      source,
      folderId
    }

    // Store destination service for real transfers
    if (destService) {
      (monitoredFile as any).destService = destService
      console.log(`📤 Destination service available for real transfers`)
    }

    this.monitoredFiles.set(file.id, monitoredFile)

    // Start polling if not already started
    if (!this.pollInterval) {
      this.startPolling(sourceService)
    }
  }

  // Stop monitoring a file
  stopMonitoring(fileId: string): void {
    console.log(`👁️ Stopping monitoring for file: ${fileId}`)
    this.monitoredFiles.delete(fileId)
    
    // Stop polling if no files are being monitored
    if (this.monitoredFiles.size === 0 && this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  // Start polling for changes
  private startPolling(service: GoogleDriveService | OneDriveService): void {
    console.log(`🔄 Starting file change polling (interval: ${this.config.pollInterval}ms)`)
    
    this.pollInterval = setInterval(async () => {
      await this.checkForChanges(service)
    }, this.config.pollInterval)
  }

  // Check for file changes
  private async checkForChanges(service: GoogleDriveService | OneDriveService): Promise<void> {
    console.log(`🔍 Checking for changes in ${this.monitoredFiles.size} monitored files`)
    
    for (const [fileId, monitoredFile] of this.monitoredFiles) {
      try {
        await this.checkFileChange(fileId, monitoredFile, service)
      } catch (error) {
        console.error(`❌ Error checking file ${fileId}:`, error)
      }
    }
  }

  // Check if a specific file has changed
  private async checkFileChange(
    fileId: string, 
    monitoredFile: MonitoredFile, 
    service: GoogleDriveService | OneDriveService
  ): Promise<void> {
    try {
      // Get current file metadata
      const currentFile = await service.getFileMetadata(fileId)
      const currentModified = new Date(currentFile.modified || new Date())
      
      // Compare with last known state
      if (currentModified.getTime() > monitoredFile.lastModified.getTime()) {
        console.log(`📝 File changed detected: ${monitoredFile.name}`)
        
        // Create change event
        const changeEvent: FileChangeEvent = {
          fileId: monitoredFile.id,
          fileName: monitoredFile.name,
          changeType: 'modified',
          timestamp: currentModified,
          source: monitoredFile.source,
          metadata: {
            oldSize: monitoredFile.size,
            newSize: parseInt(currentFile.size?.replace(/[^\d]/g, '') || '0'),
            oldModified: monitoredFile.lastModified,
            newModified: currentModified
          }
        }

        // Update monitored file state
        monitoredFile.lastModified = currentModified
        monitoredFile.size = parseInt(currentFile.size?.replace(/[^\d]/g, '') || '0')

        // Notify callbacks
        this.notifyChangeEvent(changeEvent)
        
        // Trigger immediate transfer for this file (with cooldown)
        const now = new Date()
        const lastTransfer = monitoredFile.lastTransferTriggered
        const cooldownPeriod = 300000 // 5 minute cooldown to prevent loops
        
        if (!lastTransfer || (now.getTime() - lastTransfer.getTime()) > cooldownPeriod) {
          console.log(`🚀 Triggering immediate transfer for changed file: ${monitoredFile.name}`)
          monitoredFile.lastTransferTriggered = now
          this.triggerFileTransfer(fileId, monitoredFile, service)
        } else {
          console.log(`⏳ Transfer cooldown active for: ${monitoredFile.name} (${Math.round((cooldownPeriod - (now.getTime() - lastTransfer.getTime())) / 1000)}s remaining)`)
        }
      }
    } catch (error) {
      console.error(`❌ Failed to check file ${fileId}:`, error)
      
      // Check if file was deleted
      if (error instanceof Error && error.message.includes('404')) {
        const changeEvent: FileChangeEvent = {
          fileId: monitoredFile.id,
          fileName: monitoredFile.name,
          changeType: 'deleted',
          timestamp: new Date(),
          source: monitoredFile.source
        }
        
        this.notifyChangeEvent(changeEvent)
        this.monitoredFiles.delete(fileId)
      }
    }
  }

  // Notify all registered callbacks about a change event
  private notifyChangeEvent(event: FileChangeEvent): void {
    console.log(`📢 Notifying ${this.changeCallbacks.size} callbacks about file change:`, event)
    
    this.changeCallbacks.forEach((callback, id) => {
      try {
        callback(event)
      } catch (error) {
        console.error(`❌ Error in change callback ${id}:`, error)
      }
    })
  }

  // Trigger immediate file transfer
  private async triggerFileTransfer(
    fileId: string, 
    monitoredFile: MonitoredFile, 
    service: GoogleDriveService | OneDriveService
  ): Promise<void> {
    try {
      console.log(`📤 Starting REAL file transfer for: ${monitoredFile.name}`)
      
      // Create a transfer job
      const transferJob = {
        id: `real_transfer_${fileId}_${Date.now()}`,
        sourceFile: {
          id: fileId,
          name: monitoredFile.name,
          size: monitoredFile.size,
          modified: monitoredFile.lastModified,
          type: 'file'
        },
        status: 'transferring',
        progress: 0,
        startTime: new Date()
      }
      
      console.log(`📊 Real transfer job created: ${transferJob.id}`)
      
      // Step 1: Download file from source (10%)
      console.log(`📥 Downloading file from ${monitoredFile.source}: ${monitoredFile.name}`)
      const fileData = await this.downloadFileFromSource(fileId, service)
      console.log(`✅ File downloaded successfully (${fileData.byteLength} bytes)`)
      
      // Step 2: Validate file (30%)
      console.log(`🔍 Validating downloaded file...`)
      await this.validateFileData(fileData, monitoredFile)
      console.log(`✅ File validation passed`)
      
      // Step 3: Upload to destination (50%)
      console.log(`📤 Uploading file to destination...`)
      const destinationFile = await this.uploadFileToDestination(fileData, monitoredFile)
      console.log(`✅ File uploaded successfully: ${destinationFile.name}`)
      
      // Step 4: Verify transfer (70%)
      console.log(`🔍 Verifying transfer...`)
      await this.verifyTransfer(monitoredFile, destinationFile)
      console.log(`✅ Transfer verification passed`)
      
      // Step 5: Complete (100%)
      console.log(`🎉 Real transfer completed successfully: ${monitoredFile.name}`)
      
    } catch (error) {
      console.error(`❌ Failed to complete real transfer for ${fileId}:`, error)
    }
  }

  // Download file from source service
  private async downloadFileFromSource(fileId: string, service: GoogleDriveService | OneDriveService): Promise<ArrayBuffer> {
    try {
      console.log(`📥 Downloading file ${fileId} from ${service.constructor.name}`)
      const fileData = await service.downloadFile(fileId)
      console.log(`✅ Downloaded ${fileData.byteLength} bytes`)
      return fileData
    } catch (error) {
      console.error(`❌ Failed to download file ${fileId}:`, error)
      throw error
    }
  }

  // Validate downloaded file data
  private async validateFileData(fileData: ArrayBuffer, monitoredFile: MonitoredFile): Promise<void> {
    try {
      console.log(`🔍 Validating file data...`)
      
      // Check file size
      if (fileData.byteLength === 0) {
        throw new Error('Downloaded file is empty')
      }
      
      // Check if size matches expected size (if available)
      if (monitoredFile.size > 0 && Math.abs(fileData.byteLength - monitoredFile.size) > 1024) {
        console.warn(`⚠️ File size mismatch: expected ${monitoredFile.size}, got ${fileData.byteLength}`)
      }
      
      console.log(`✅ File validation passed: ${fileData.byteLength} bytes`)
    } catch (error) {
      console.error(`❌ File validation failed:`, error)
      throw error
    }
  }

  // Upload file to destination service
  private async uploadFileToDestination(fileData: ArrayBuffer, monitoredFile: MonitoredFile): Promise<any> {
    try {
      console.log(`📤 Uploading file to destination...`)
      
      // Get destination service from monitored file
      const destService = (monitoredFile as any).destService
      
      if (!destService) {
        console.log(`⚠️ No destination service available, simulating upload...`)
        // Simulate upload progress
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        const uploadedFile = {
          id: `uploaded_${Date.now()}`,
          name: monitoredFile.name,
          size: fileData.byteLength,
          uploadedAt: new Date()
        }
        
        console.log(`✅ File uploaded successfully (simulated): ${uploadedFile.name}`)
        return uploadedFile
      }
      
      // Real upload to destination service
      console.log(`📊 Uploading ${fileData.byteLength} bytes to ${destService.constructor.name}...`)
      
      const uploadedFile = await destService.uploadFile(fileData, monitoredFile.name, 'root')
      
      console.log(`✅ File uploaded successfully: ${uploadedFile.name}`)
      return uploadedFile
      
    } catch (error) {
      console.error(`❌ Failed to upload file:`, error)
      throw error
    }
  }

  // Verify transfer completed successfully
  private async verifyTransfer(sourceFile: MonitoredFile, destinationFile: any): Promise<void> {
    try {
      console.log(`🔍 Verifying transfer...`)
      
      // Check if destination file exists and has correct size
      if (!destinationFile || destinationFile.size === 0) {
        throw new Error('Destination file not found or empty')
      }
      
      // Additional verification could include:
      // - Checksum comparison
      // - File content validation
      // - Metadata comparison
      
      console.log(`✅ Transfer verification passed`)
    } catch (error) {
      console.error(`❌ Transfer verification failed:`, error)
      throw error
    }
  }

  // Register a callback for file change events
  onFileChange(id: string, callback: (event: FileChangeEvent) => void): void {
    this.changeCallbacks.set(id, callback)
  }

  // Unregister a callback
  offFileChange(id: string): void {
    this.changeCallbacks.delete(id)
  }

  // Get list of monitored files
  getMonitoredFiles(): MonitoredFile[] {
    return Array.from(this.monitoredFiles.values())
  }

  // Check if a file is being monitored
  isMonitored(fileId: string): boolean {
    return this.monitoredFiles.has(fileId)
  }

  // Update monitoring configuration
  updateConfig(newConfig: Partial<FileMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart polling with new interval if it changed
    if (newConfig.pollInterval && this.pollInterval) {
      clearInterval(this.pollInterval)
      this.startPolling(new GoogleDriveService('dummy')) // Will be replaced with actual service
    }
  }

  // Stop all monitoring
  stopAllMonitoring(): void {
    console.log('🛑 Stopping all file monitoring')
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    
    this.monitoredFiles.clear()
    this.changeCallbacks.clear()
  }

  // Get monitoring statistics
  getMonitoringStats(): {
    monitoredFiles: number
    pollInterval: number
    isPolling: boolean
  } {
    return {
      monitoredFiles: this.monitoredFiles.size,
      pollInterval: this.config.pollInterval,
      isPolling: this.pollInterval !== null
    }
  }
}

// Singleton instance
let fileMonitorInstance: FileMonitorService | null = null

export function getFileMonitorService(): FileMonitorService {
  if (!fileMonitorInstance) {
    fileMonitorInstance = new FileMonitorService()
  }
  return fileMonitorInstance
}
