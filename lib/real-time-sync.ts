import { FileItem } from "@/hooks/use-cloud-connections"

export interface TransferUpdate {
  id: string
  type: 'progress' | 'completed' | 'error' | 'conflict' | 'file_changed'
  data: any
  timestamp: Date
}

export interface FileChangeEvent {
  fileId: string
  fileName: string
  changeType: 'created' | 'modified' | 'deleted' | 'moved'
  timestamp: Date
  source: 'google' | 'microsoft'
  metadata?: any
}

export interface ConflictResolution {
  type: 'source_wins' | 'dest_wins' | 'merge' | 'manual'
  resolvedFile: FileItem
  timestamp: Date
}

export interface SyncJob {
  id: string
  sourceFile: FileItem
  destFile?: FileItem
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'conflict'
  progress: number
  startTime: Date
  endTime?: Date
  error?: string
  conflictResolution?: ConflictResolution
}

export class RealTimeSyncService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 5000
  private updateCallbacks: Map<string, (update: TransferUpdate) => void> = new Map()
  private isConnected = false

  constructor(private serverUrl: string = 'ws://localhost:3001') {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Prevent multiple connection attempts
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log('🔄 WebSocket connection already in progress, skipping...')
          return
        }
        
        this.ws = new WebSocket(this.serverUrl)
        
        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.log('⏰ WebSocket connection timeout')
            this.ws.close()
            reject(new Error('Connection timeout'))
          }
        }, 10000) // 10 second timeout
        
        this.ws.onopen = () => {
          clearTimeout(connectionTimeout)
          console.log('🔌 Real-time sync WebSocket connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          
          // Don't send file_monitoring_started here - only when actual monitoring starts
          // This prevents the WebSocket server from stopping test events prematurely
          
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const update: TransferUpdate = JSON.parse(event.data)
            this.handleUpdate(update)
          } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = () => {
          console.log('🔌 Real-time sync WebSocket disconnected')
          this.isConnected = false
          
          // Notify WebSocket server that real file monitoring stopped
          try {
            if (this.ws) {
              this.ws.send(JSON.stringify({
                type: 'file_monitoring_stopped',
                timestamp: new Date()
              }))
            }
          } catch (error) {
            // Connection already closed, ignore
          }
          
          this.handleReconnect()
        }

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout)
          console.error('❌ WebSocket error:', (error as any).message || (error as any).type || 'Unknown WebSocket error')
          // Don't reject on error, let it try to reconnect
          this.isConnected = false
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('❌ Reconnection failed:', error.message || error.type || 'Unknown reconnection error')
          // Continue trying to reconnect
          this.handleReconnect()
        })
      }, this.reconnectInterval)
    } else {
      console.error('❌ Max reconnection attempts reached')
    }
  }

  private handleUpdate(update: TransferUpdate): void {
    console.log('📡 Received real-time update:', update)
    
    // Notify all registered callbacks
    this.updateCallbacks.forEach((callback, id) => {
      try {
        callback(update)
      } catch (error) {
        console.error(`❌ Error in update callback ${id}:`, error)
      }
    })
  }

  // Register a callback for real-time updates
  onUpdate(id: string, callback: (update: TransferUpdate) => void): void {
    this.updateCallbacks.set(id, callback)
  }

  // Unregister a callback
  offUpdate(id: string): void {
    this.updateCallbacks.delete(id)
  }

  // Send an update to the server
  sendUpdate(update: TransferUpdate): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(update))
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send update')
    }
  }

  // Send file change event
  sendFileChangeEvent(event: FileChangeEvent): void {
    const update: TransferUpdate = {
      id: `file_change_${Date.now()}`,
      type: 'file_changed',
      data: event,
      timestamp: new Date()
    }
    this.sendUpdate(update)
  }

  // Send transfer progress update
  sendProgressUpdate(jobId: string, progress: number, status: string): void {
    const update: TransferUpdate = {
      id: `progress_${jobId}`,
      type: 'progress',
      data: { jobId, progress, status },
      timestamp: new Date()
    }
    this.sendUpdate(update)
  }

  // Notify WebSocket server that real file monitoring has started
  notifyFileMonitoringStarted(): void {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'file_monitoring_started',
        timestamp: new Date()
      }))
    }
  }

  // Notify WebSocket server that real file monitoring has stopped
  notifyFileMonitoringStopped(): void {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'file_monitoring_stopped',
        timestamp: new Date()
      }))
    }
  }

  // Send conflict notification
  sendConflictNotification(conflict: any): void {
    const update: TransferUpdate = {
      id: `conflict_${Date.now()}`,
      type: 'conflict',
      data: conflict,
      timestamp: new Date()
    }
    this.sendUpdate(update)
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected
  }
}

// Singleton instance
let realTimeSyncInstance: RealTimeSyncService | null = null

export function getRealTimeSyncService(): RealTimeSyncService {
  if (!realTimeSyncInstance) {
    realTimeSyncInstance = new RealTimeSyncService()
  }
  return realTimeSyncInstance
}
