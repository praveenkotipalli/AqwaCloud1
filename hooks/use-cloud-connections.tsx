"use client"

import { useState, useEffect, useCallback } from "react"
import { createGoogleDriveService } from "@/lib/google-drive"

export interface CloudConnection {
  id: string
  name: string
  provider: "google" | "microsoft"
  icon: string
  connected: boolean
  status: "disconnected" | "connecting" | "connected" | "error"
  accountEmail?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  permissions: string[]
  storageInfo?: {
    used: string
    total: string
    available: string
  }
  lastSync?: Date
  error?: string
}

export interface FileItem {
  id: string
  name: string
  type: "file" | "folder"
  size?: string
  modified?: string
  mimeType?: string
  path: string
  parentId?: string
  selected: boolean
  children?: FileItem[]
}

export interface TransferJob {
  id: string
  sourceService: string
  destinationService: string
  sourceFiles: FileItem[]
  destinationPath: string
  status: "pending" | "transferring" | "completed" | "failed" | "paused"
  progress: number
  startTime?: Date
  endTime?: Date
  error?: string
}

const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "511490618915-u9f7sic8g95b09d4k0998ij0jr91l17p.apps.googleusercontent.com",
  scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file",
  redirectUri: typeof window !== "undefined" ? `${window.location.origin}/auth/google/callback` : "",
}

const ONEDRIVE_OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || "d5edfa6f-cee9-4160-b6fc-f1ec28f8b3ff",
  scope: "Files.ReadWrite.All",
  redirectUri: typeof window !== "undefined" ? `${window.location.origin}/auth/onedrive/callback` : "",
}

export function useCloudConnections() {
  const [connections, setConnections] = useState<CloudConnection[]>([
    {
      id: "google-drive",
      name: "Google Drive",
      provider: "google",
      icon: "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png",
      connected: false,
      status: "disconnected",
      permissions: ["read", "write"],
    },
    {
      id: "onedrive",
      name: "OneDrive",
      provider: "microsoft",
      icon: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg",
      connected: false,
      status: "disconnected",
      permissions: ["read", "write"],
    },
  ])

  const [transferJobs, setTransferJobs] = useState<TransferJob[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load saved connections from localStorage
  useEffect(() => {
    try {
      const savedConnections = localStorage.getItem("aqwa_cloud_connections")
      console.log("Loading connections from localStorage:", savedConnections)
      
      if (savedConnections) {
        const parsed = JSON.parse(savedConnections)
        console.log("Parsed connections:", parsed)
        
        // Validate that we have the expected structure
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("✅ Valid connections found in localStorage")
          console.log("🔍 Checking Google Drive connection details:")
          const googleConn = parsed.find(c => c.id === "google-drive")
          if (googleConn) {
            console.log("  - Connected:", googleConn.connected)
            console.log("  - Status:", googleConn.status)
            console.log("  - Has Access Token:", !!googleConn.accessToken)
            console.log("  - Access Token Length:", googleConn.accessToken?.length || 0)
            console.log("  - Provider:", googleConn.provider)
          }
          setConnections(parsed)
          console.log("Set connections from localStorage:", parsed)
        } else {
          console.warn("Saved connections are invalid, using defaults")
          // Save the default connections
          localStorage.setItem("aqwa_cloud_connections", JSON.stringify(connections))
        }
      } else {
        // No saved connections, save the defaults
        console.log("No saved connections, saving defaults")
        localStorage.setItem("aqwa_cloud_connections", JSON.stringify(connections))
      }
    } catch (error) {
      console.error("Failed to load saved connections:", error)
      // Save the default connections
      localStorage.setItem("aqwa_cloud_connections", JSON.stringify(connections))
    }
  }, [])

  // Save connections to localStorage
  const saveConnections = useCallback((newConnections: CloudConnection[]) => {
    localStorage.setItem("aqwa_cloud_connections", JSON.stringify(newConnections))
  }, [])

  // Connect to Google Drive
  const connectGoogleDrive = useCallback(async () => {
    const connection = connections.find(c => c.id === "google-drive")
    if (!connection) return

    setConnections(prev => 
      prev.map(c => 
        c.id === "google-drive" 
          ? { ...c, status: "connecting" }
          : c
      )
    )

    try {
      // Generate OAuth URL
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
      authUrl.searchParams.append("client_id", GOOGLE_OAUTH_CONFIG.clientId)
      authUrl.searchParams.append("redirect_uri", GOOGLE_OAUTH_CONFIG.redirectUri)
      authUrl.searchParams.append("scope", GOOGLE_OAUTH_CONFIG.scope)
      authUrl.searchParams.append("response_type", "code")
      authUrl.searchParams.append("access_type", "offline")
      authUrl.searchParams.append("prompt", "consent")

      // Store state for security
      const state = Math.random().toString(36).substring(7)
      sessionStorage.setItem("google_oauth_state", state)
      authUrl.searchParams.append("state", state)

      // Redirect to Google OAuth
      window.location.href = authUrl.toString()
    } catch (error) {
      console.error("Failed to connect to Google Drive:", error)
      setConnections(prev => 
        prev.map(c => 
          c.id === "google-drive" 
            ? { ...c, status: "error", error: "Failed to connect" }
            : c
        )
      )
    }
  }, [connections])

  // Connect to OneDrive
  const connectOneDrive = useCallback(async () => {
    const connection = connections.find(c => c.id === "onedrive")
    if (!connection) return

    setConnections(prev => 
      prev.map(c => 
        c.id === "onedrive" 
          ? { ...c, status: "connecting" }
          : c
      )
    )

    try {
      // Generate OAuth URL for Microsoft
      const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize")
      authUrl.searchParams.append("client_id", ONEDRIVE_OAUTH_CONFIG.clientId)
      authUrl.searchParams.append("redirect_uri", ONEDRIVE_OAUTH_CONFIG.redirectUri)
      authUrl.searchParams.append("scope", ONEDRIVE_OAUTH_CONFIG.scope)
      authUrl.searchParams.append("response_type", "code")
      authUrl.searchParams.append("response_mode", "query")

      // Store state for security
      const state = Math.random().toString(36).substring(7)
      sessionStorage.setItem("onedrive_oauth_state", state)
      authUrl.searchParams.append("state", state)

      // Redirect to Microsoft OAuth
      window.location.href = authUrl.toString()
    } catch (error) {
      console.error("Failed to connect to OneDrive:", error)
      setConnections(prev => 
        prev.map(c => 
          c.id === "onedrive" 
            ? { ...c, status: "error", error: "Failed to connect" }
            : c
        )
      )
    }
  }, [connections])

  // Disconnect from a service
  const disconnectService = useCallback((serviceId: string) => {
    setConnections(prev => {
      const newConnections = prev.map(c => 
        c.id === serviceId 
          ? { 
              ...c, 
              connected: false, 
              status: "disconnected" as const,
              accessToken: undefined,
              refreshToken: undefined,
              expiresAt: undefined,
              accountEmail: undefined,
              storageInfo: undefined,
              lastSync: undefined,
              error: undefined
            }
          : c
      )
      saveConnections(newConnections)
      return newConnections
    })
  }, [saveConnections])

  // Get files from a connected service with pagination
  const getFiles = useCallback(async (serviceId: string, path: string = "/", page: number = 1): Promise<{ files: FileItem[], hasMore: boolean, totalCount: number }> => {
    console.log(`🔍 getFiles called for ${serviceId} at path ${path}, page: ${page}`)
    console.log("📊 Current connections:", connections)
    
    // Wait for connections to be loaded
    if (connections.length === 0) {
      console.log("⏳ Connections not yet loaded, returning empty array")
      return { files: [], hasMore: false, totalCount: 0 }
    }

    const connection = connections.find(c => c.id === serviceId && c.connected)
    console.log(`🔗 Found connection for ${serviceId}:`, {
      id: connection?.id,
      connected: connection?.connected,
      status: connection?.status,
      hasAccessToken: !!connection?.accessToken,
      accessTokenLength: connection?.accessToken?.length || 0,
      provider: connection?.provider
    })
    
    if (!connection) {
      console.error(`❌ No connected service found for ${serviceId}`)
      throw new Error("Service not connected")
    }

    // Check if connection has access token
    if (!connection.accessToken) {
      console.warn(`⚠️ No access token for ${serviceId}, returning empty array`)
      return { files: [], hasMore: false, totalCount: 0 }
    }

    try {
      if (connection.provider === "google") {
        return await getGoogleDriveFiles(connection, path, page)
      } else if (connection.provider === "microsoft") {
        const files = await getOneDriveFiles(connection, path)
        // For OneDrive, we'll implement pagination later
        return { files, hasMore: false, totalCount: files.length }
      } else {
        throw new Error("Unsupported provider")
      }
    } catch (error) {
      console.error(`Failed to get files from ${serviceId}:`, error)
      // Return empty array on error - the UI will show "empty folder"
      return { files: [], hasMore: false, totalCount: 0 }
    }
  }, [connections])

  // Get files from Google Drive with real API
  const getGoogleDriveFiles = async (connection: CloudConnection, path: string, page: number = 1): Promise<{ files: FileItem[], hasMore: boolean, totalCount: number }> => {
    if (!connection.accessToken) {
      throw new Error("No access token available")
    }

    try {
      console.log(`🚀 Fetching REAL Google Drive files for path: ${path}, page: ${page}`)
      
      // Create Google Drive service
      const driveService = createGoogleDriveService(connection)
      if (!driveService) {
        throw new Error("Failed to create Google Drive service")
      }

      // Validate token
      const isValid = await driveService.validateToken()
      if (!isValid) {
        throw new Error("Invalid or expired access token")
      }

      // Get folder contents with pagination
      const result = await driveService.getFolderContents("root", page, 50)
      
      console.log(`✅ Retrieved ${result.files.length} files from Google Drive`)
      console.log(`📄 Has more pages: ${result.hasMore}`)
      console.log(`📊 Total count: ${result.totalCount}`)

      return result

    } catch (error) {
      console.error("Failed to get real Google Drive files:", error)
      throw error
    }
  }

  // Get files from OneDrive (placeholder for now)
  const getOneDriveFiles = async (connection: CloudConnection, path: string): Promise<FileItem[]> => {
    if (!connection.accessToken) {
      throw new Error("No access token available")
    }

    // TODO: Implement real OneDrive API integration
    console.log("OneDrive integration coming soon...")
    return []
  }

  // Start a transfer job
  const startTransfer = useCallback(async (
    sourceService: string,
    destinationService: string,
    sourceFiles: FileItem[],
    destinationPath: string
  ): Promise<string> => {
    const jobId = `transfer_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const newJob: TransferJob = {
      id: jobId,
      sourceService,
      destinationService,
      sourceFiles,
      destinationPath,
      status: "pending",
      progress: 0,
      startTime: new Date()
    }

    setTransferJobs(prev => [...prev, newJob])

    // Simulate transfer progress
    setTimeout(() => {
      setTransferJobs(prev => 
        prev.map(job => 
          job.id === jobId 
            ? { ...job, status: "transferring", progress: 25 }
            : job
        )
      )
    }, 1000)

    setTimeout(() => {
      setTransferJobs(prev => 
        prev.map(job => 
          job.id === jobId 
            ? { ...job, progress: 50 }
            : job
        )
      )
    }, 2000)

    setTimeout(() => {
      setTransferJobs(prev => 
        prev.map(job => 
          job.id === jobId 
            ? { ...job, progress: 75 }
            : job
        )
      )
    }, 3000)

    setTimeout(() => {
      setTransferJobs(prev => 
        prev.map(job => 
          job.id === jobId 
            ? { ...job, status: "completed", progress: 100, endTime: new Date() }
            : job
        )
      )
    }, 4000)

    return jobId
  }, [])

  // Pause a transfer job
  const pauseTransfer = useCallback((jobId: string) => {
    setTransferJobs(prev => 
      prev.map(job => 
        job.id === jobId 
          ? { ...job, status: "paused" }
          : job
      )
    )
  }, [])

  // Resume a transfer job
  const resumeTransfer = useCallback((jobId: string) => {
    setTransferJobs(prev => 
      prev.map(job => 
        job.id === jobId 
          ? { ...job, status: "transferring" }
          : job
      )
    )
  }, [])

  // Cancel a transfer job
  const cancelTransfer = useCallback((jobId: string) => {
    setTransferJobs(prev => prev.filter(job => job.id !== jobId))
  }, [])

  // Reset connections to default state
  const resetConnections = useCallback(() => {
    const defaultConnections = [
      {
        id: "google-drive",
        name: "Google Drive",
        provider: "google" as const,
        icon: "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png",
        connected: false,
        status: "disconnected" as const,
        permissions: ["read", "write"],
      },
      {
        id: "onedrive",
        name: "OneDrive",
        provider: "microsoft" as const,
        icon: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg",
        connected: false,
        status: "disconnected" as const,
        permissions: ["read", "write"],
      },
    ]
    setConnections(defaultConnections)
    localStorage.setItem("aqwa_cloud_connections", JSON.stringify(defaultConnections))
  }, [])

  // Load more files for pagination
  const loadMoreFiles = useCallback(async (serviceId: string, path: string, currentPage: number): Promise<{ files: FileItem[], hasMore: boolean }> => {
    const nextPage = currentPage + 1
    const result = await getFiles(serviceId, path, nextPage)
    return { files: result.files, hasMore: result.hasMore }
  }, [getFiles])

  return {
    connections,
    transferJobs,
    isLoading,
    connectGoogleDrive,
    connectOneDrive,
    disconnectService,
    getFiles,
    loadMoreFiles,
    startTransfer,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
    resetConnections,
  }
}
