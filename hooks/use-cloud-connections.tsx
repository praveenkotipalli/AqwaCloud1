"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createGoogleDriveService } from "@/lib/google-drive"
import { createOneDriveService } from "@/lib/onedrive"
import { db, auth } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, doc, setDoc, increment, getDoc, updateDoc } from 'firebase/firestore'
import { getRealTimeTransferService } from "@/lib/realtime-transfer-service"
import { TransferUpdate, FileChangeEvent } from "@/lib/real-time-sync"

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
  isRealTime?: boolean
  sessionId?: string
  conflictResolution?: any
}

export interface TransferHistoryItem {
  id: string
  timestamp: number
  fromService: string
  toService: string
  fileNames: string[]
  totalBytes: number
  status: "completed" | "failed"
}

// Prefer explicit env to avoid Vercel preview domains in redirect_uri
const GOOGLE_REDIRECT_BASE =
  (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_GOOGLE_REDIRECT_URI?.replace(/\/$/, "")) ||
  (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")) ||
  ""

const GOOGLE_CALLBACK = "/auth/google/callback"

const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "511490618915-u9f7sic8g95b09d4k0998ij0jr91l17p.apps.googleusercontent.com",
  scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file",
  redirectUri: (() => {
    // If env provides full callback, use it; else append callback to base; else fallback to window origin
    if (GOOGLE_REDIRECT_BASE) {
      return GOOGLE_REDIRECT_BASE.includes(GOOGLE_CALLBACK)
        ? GOOGLE_REDIRECT_BASE
        : `${GOOGLE_REDIRECT_BASE}${GOOGLE_CALLBACK}`
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}${GOOGLE_CALLBACK}`
    }
    return ""
  })(),
}

// OneDrive env-driven redirect handling (mirrors Google)
const ONEDRIVE_REDIRECT_BASE =
  (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ONEDRIVE_REDIRECT_URI?.replace(/\/$/, "")) ||
  (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")) ||
  ""

const ONEDRIVE_CALLBACK = "/auth/onedrive/callback"

const ONEDRIVE_OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || "d5edfa6f-cee9-4160-b6fc-f1ec28f8b3ff",
  scope: "Files.ReadWrite.All User.Read offline_access",
  redirectUri: (() => {
    if (ONEDRIVE_REDIRECT_BASE) {
      return ONEDRIVE_REDIRECT_BASE.includes(ONEDRIVE_CALLBACK)
        ? ONEDRIVE_REDIRECT_BASE
        : `${ONEDRIVE_REDIRECT_BASE}${ONEDRIVE_CALLBACK}`
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}${ONEDRIVE_CALLBACK}`
    }
    return ""
  })(),
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
  const [transferHistory, setTransferHistory] = useState<TransferHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [realTimeTransferService] = useState(() => getRealTimeTransferService())
  const [activeSessions, setActiveSessions] = useState<string[]>([])
  const [recordedJobs, setRecordedJobs] = useState<Set<string>>(new Set())
  const recordedJobsRef = useRef<Set<string>>(new Set())

  // Listen for real-time updates and update transfer jobs
  useEffect(() => {
    const handleRealTimeUpdate = (update: any) => {
      console.log('📡 Received real-time update:', update)
      
      if (update.type === 'progress' && update.data?.jobId) {
        setTransferJobs(prev => prev.map(job => {
          // Robust matching across realtime session jobs (transfer_*) and UI jobs (realtime_session_*)
          const sameJobId = job.id === update.data.jobId || update.data.jobId === job.id
          const sameProgressEnvelope = update.id === `progress_${job.id}`
          const sameSession = !!(job.sessionId && update.data.sessionId && job.sessionId === update.data.sessionId)
          const sameFileInSession = !!(job.isRealTime && job.sessionId && update.data.fileName && job.sourceFiles?.some(f => f.name === update.data.fileName))
          const isMatchingJob = sameJobId || sameProgressEnvelope || sameSession || sameFileInSession
          
          if (isMatchingJob) {
            const nextProgress = typeof update.data.progress === 'number' ? Math.max(job.progress, update.data.progress) : job.progress
            const nextStatus = update.data.status === 'completed' ? 'completed'
                              : update.data.status === 'failed' ? 'failed'
                              : update.data.status === 'transferring' ? 'transferring'
                              : job.status
            console.log(`📊 Updating job ${job.id} -> progress: ${nextProgress}% status: ${nextStatus}`)
            return {
              ...job,
              progress: nextProgress,
              status: nextStatus,
              endTime: nextStatus === 'completed' || nextStatus === 'failed' ? new Date() : job.endTime,
              error: update.data.error ?? job.error
            }
          }
          return job
        }))

        // Track cumulative bytes for this job/session
        if (typeof update.data.bytes === 'number' && update.data.bytes > 0) {
          const key = update.data.jobId
          ;(window as any).__aqwa_bytes = (window as any).__aqwa_bytes || {}
          ;(window as any).__aqwa_bytes[key] = ((window as any).__aqwa_bytes[key] || 0) + update.data.bytes
        }

        // Persist history/metrics when real-time jobs complete/fail (once per job)
        try {
          const jobId: string = update.data.jobId
          const status: string | undefined = update.data.status
          if ((status === 'completed' || status === 'failed') && jobId && !recordedJobsRef.current.has(jobId)) {
            console.log(`📝 Recording real-time transfer completion for job: ${jobId}`)
            console.log(`📊 Current recordedJobs:`, Array.from(recordedJobsRef.current))
            
            // Add to ref immediately for synchronous checking
            recordedJobsRef.current.add(jobId)
            
            // Update state for UI consistency
            setRecordedJobs(prev => {
              const newSet = new Set(prev).add(jobId)
              console.log(`📊 Updated recordedJobs:`, Array.from(newSet))
              return newSet
            })

            const sessionId: string | undefined = typeof update.data.sessionId === 'string' ? update.data.sessionId : undefined
            const matchedJob = transferJobs.find(j => j.id === jobId || (sessionId && j.sessionId === sessionId))

            const inferService = (s?: string): string => {
              if (!s) return 'unknown'
              const v = s.toLowerCase()
              if (v.includes('google')) return 'google-drive'
              if (v.includes('one')) return 'onedrive'
              return s
            }

            const totalBytes = (typeof update.data.totalBytes === 'number' && update.data.totalBytes >= 0)
              ? update.data.totalBytes
              : ((window as any).__aqwa_bytes?.[jobId] || 0)
            const costDelta = (totalBytes/(1024*1024*1024))*0.01
            const historyEntry = {
              id: jobId,
              timestamp: Date.now(),
              fromService: matchedJob?.sourceService || inferService(update.data.fromService || update.data.sourceProvider),
              toService: matchedJob?.destinationService || inferService(update.data.toService || update.data.destinationProvider),
              fileNames: matchedJob?.sourceFiles?.map(f => f.name) || [],
              totalBytes,
              costUsd: Number(costDelta.toFixed(4)),
              status: status === 'completed' ? 'completed' : 'failed' as const
            }

            const uid = auth.currentUser?.uid || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('aqwa_user')||'{}')?.uid || 'anon') : 'server')
            const write = async () => {
              try {
                await setDoc(doc(db, 'users', uid, 'transferHistory', historyEntry.id), {
                  ...historyEntry,
                  createdAt: serverTimestamp()
                })
                const metricsRef = doc(db, 'users', uid, 'metrics', 'aggregate')
                const snap = await getDoc(metricsRef)
                if (!snap.exists()) {
                  await setDoc(metricsRef, {
                    totalTransfers: 1,
                    totalBytes: totalBytes,
                    totalCost: costDelta,
                    monthTransfers: 1,
                    monthBytes: totalBytes,
                    monthCost: costDelta,
                    updatedAt: serverTimestamp()
                  })
                } else {
                  console.log(`📈 Real-time handler: Incrementing Firestore metrics for job ${jobId}`)
                  await updateDoc(metricsRef, {
                    totalTransfers: increment(1),
                    totalBytes: increment(totalBytes),
                    totalCost: increment(costDelta),
                    monthTransfers: increment(1),
                    monthBytes: increment(totalBytes),
                    monthCost: increment(costDelta),
                    updatedAt: serverTimestamp()
                  })
                }
              } catch (e) {
                console.warn('Failed to persist real-time job to Firestore:', e)
              }
            }
            write()
          }
        } catch (persistErr) {
          console.warn('Real-time persist error:', persistErr)
        }
      }
    }

    // Subscribe to real-time updates
    realTimeTransferService.onUpdate(handleRealTimeUpdate)

    return () => {
      realTimeTransferService.offUpdate(handleRealTimeUpdate)
    }
  }, [realTimeTransferService, transferJobs])

  // Helper function to clean and validate access tokens
  const cleanAccessToken = (token: string): string => {
    if (!token) return token
    
    // Remove any whitespace, newlines, or extra characters
    let cleaned = token.trim()
    
    // Remove any quotes that might have been added
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1)
    }
    
    // Remove any newlines or carriage returns
    cleaned = cleaned.replace(/[\r\n]/g, '')
    
    console.log(`🧹 Token cleaning:`, {
      originalLength: token.length,
      cleanedLength: cleaned.length,
      wasCleaned: token !== cleaned,
      originalPreview: token.substring(0, 20) + '...',
      cleanedPreview: cleaned.substring(0, 20) + '...'
    })
    
    return cleaned
  }

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
          
          // Clean access tokens for all connections
          const cleanedConnections = parsed.map(conn => ({
            ...conn,
            accessToken: conn.accessToken ? cleanAccessToken(conn.accessToken) : conn.accessToken
          }))
          
          console.log("🔍 Checking Google Drive connection details:")
          const googleConn = cleanedConnections.find(c => c.id === "google-drive")
          if (googleConn) {
            console.log("  - Connected:", googleConn.connected)
            console.log("  - Status:", googleConn.status)
            console.log("  - Has Access Token:", !!googleConn.accessToken)
            console.log("  - Access Token Length:", googleConn.accessToken?.length || 0)
            console.log("  - Provider:", googleConn.provider)
          }
          
          console.log("🔍 Checking OneDrive connection details:")
          const onedriveConn = cleanedConnections.find(c => c.id === "onedrive")
          if (onedriveConn) {
            console.log("  - Connected:", onedriveConn.connected)
            console.log("  - Status:", onedriveConn.status)
            console.log("  - Has Access Token:", !!onedriveConn.accessToken)
            console.log("  - Access Token Length:", onedriveConn.accessToken?.length || 0)
            console.log("  - Provider:", onedriveConn.provider)
          }
          
          setConnections(cleanedConnections)
          console.log("Set connections from localStorage:", cleanedConnections)
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

  // Load saved transfer history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("aqwa_transfer_history")
      if (saved) {
        const parsed: TransferHistoryItem[] = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setTransferHistory(parsed)
        }
      }
    } catch (err) {
      console.warn("Failed to load transfer history:", err)
    }
  }, [])

  const saveTransferHistory = useCallback((items: TransferHistoryItem[]) => {
    localStorage.setItem("aqwa_transfer_history", JSON.stringify(items.slice(0, 50)))
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
      // Ensure we initiate OAuth from the canonical base URL to avoid preview domains
      if (typeof window !== "undefined" && GOOGLE_OAUTH_CONFIG.redirectUri) {
        try {
          const redirectUrl = new URL(GOOGLE_OAUTH_CONFIG.redirectUri)
          const redirectOrigin = `${redirectUrl.protocol}//${redirectUrl.host}`
          const currentOrigin = window.location.origin
          if (redirectOrigin && redirectOrigin !== currentOrigin) {
            // Navigate to canonical origin, preserving current path so user context remains
            const target = `${redirectOrigin}${window.location.pathname}${window.location.search}`
            window.location.replace(target)
            return
          }
        } catch {}
      }

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
      // Ensure OAuth starts from canonical origin to avoid preview domains
      if (typeof window !== "undefined" && ONEDRIVE_OAUTH_CONFIG.redirectUri) {
        try {
          const redirectUrl = new URL(ONEDRIVE_OAUTH_CONFIG.redirectUri)
          const redirectOrigin = `${redirectUrl.protocol}//${redirectUrl.host}`
          const currentOrigin = window.location.origin
          if (redirectOrigin && redirectOrigin !== currentOrigin) {
            const target = `${redirectOrigin}${window.location.pathname}${window.location.search}`
            window.location.replace(target)
            return
          }
        } catch {}
      }

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
  const getFiles = useCallback(async (serviceId: string, folderId: string = "root", page: number = 1): Promise<{ files: FileItem[], hasMore: boolean, totalCount: number }> => {
    console.log(`🔍 getFiles called for ${serviceId} at folderId ${folderId}, page: ${page}`)
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
        return await getGoogleDriveFiles(connection, folderId, page)
      } else if (connection.provider === "microsoft") {
        return await getOneDriveFiles(connection, folderId, page)
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
  const getGoogleDriveFiles = async (connection: CloudConnection, folderId: string, page: number = 1): Promise<{ files: FileItem[], hasMore: boolean, totalCount: number }> => {
    if (!connection.accessToken) {
      throw new Error("No access token available")
    }

    try {
      console.log(`🚀 Fetching REAL Google Drive files for folderId: ${folderId}, page: ${page}`)
      console.log(`🔑 Token details:`, {
        hasToken: !!connection.accessToken,
        tokenLength: connection.accessToken?.length || 0,
        tokenPreview: connection.accessToken?.substring(0, 20) + '...',
        expiresAt: connection.expiresAt,
        isExpired: connection.expiresAt ? Date.now() > connection.expiresAt : 'unknown'
      })
      
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
      const result = await driveService.getFolderContents(folderId || "root", page, 50)
      
      console.log(`✅ Retrieved ${result.files.length} files from Google Drive`)
      console.log(`📄 Has more pages: ${result.hasMore}`)
      console.log(`📊 Total count: ${result.totalCount}`)

      return result

    } catch (error) {
      console.error("Failed to get real Google Drive files:", error)
      throw error
    }
  }

  // Get files from OneDrive with real API
  const getOneDriveFiles = async (connection: CloudConnection, folderId: string, page: number = 1): Promise<{ files: FileItem[], hasMore: boolean, totalCount: number }> => {
    if (!connection.accessToken) {
      throw new Error("No access token available")
    }

    try {
      console.log(`🚀 Fetching REAL OneDrive files for folderId: ${folderId}, page: ${page}`)
      console.log(`🔑 OneDrive connection details:`, {
        id: connection.id,
        provider: connection.provider,
        hasAccessToken: !!connection.accessToken,
        tokenLength: connection.accessToken?.length || 0,
        tokenPreview: connection.accessToken?.substring(0, 20) + '...',
        expiresAt: connection.expiresAt,
        isExpired: connection.expiresAt ? Date.now() > connection.expiresAt : 'unknown'
      })
      
      // Log the full token for debugging (be careful with this in production)
      console.log(`🔐 Full access token:`, connection.accessToken)
      
      // Check if token is expired; attempt refresh if possible
      if (connection.expiresAt && Date.now() > connection.expiresAt) {
        console.log(`⏰ OneDrive token is expired! Expired at: ${new Date(connection.expiresAt).toISOString()}`)
        if (connection.refreshToken) {
          console.log(`🔄 Attempting to refresh OneDrive access token using refresh_token...`)
          try {
            const refreshResp = await fetch("/api/auth/onedrive/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: connection.refreshToken })
            })
            if (!refreshResp.ok) {
              const txt = await refreshResp.text()
              console.error(`❌ Token refresh failed:`, txt)
              throw new Error("Failed to refresh OneDrive token")
            }
            const refreshed = await refreshResp.json()
            const newAccessToken: string | undefined = refreshed.access_token
            const newRefreshToken: string | undefined = refreshed.refresh_token || connection.refreshToken
            const newExpiresAt: number = Date.now() + (refreshed.expires_in * 1000)
            if (!newAccessToken) {
              throw new Error("Refresh response missing access_token")
            }
            // Update in state and localStorage
            setConnections(prev => {
              const updated = prev.map(c => c.id === connection.id ? {
                ...c,
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expiresAt: newExpiresAt,
                status: "connected" as const,
                error: undefined
              } : c)
              saveConnections(updated)
              return updated
            })
            // Update local variable reference for this call
            connection.accessToken = newAccessToken
            connection.refreshToken = newRefreshToken
            connection.expiresAt = newExpiresAt
            console.log(`✅ OneDrive token refreshed successfully; proceeding.`)
          } catch (refreshErr) {
            console.error(`❌ OneDrive token refresh error:`, refreshErr)
            throw new Error("Access token has expired. Please reconnect your OneDrive account.")
          }
        } else {
          throw new Error("Access token has expired. Please reconnect your OneDrive account.")
        }
      }
      
      // Create OneDrive service
      const onedriveService = createOneDriveService(connection)
      if (!onedriveService) {
        throw new Error("Failed to create OneDrive service")
      }

      console.log(`🔧 OneDrive service created successfully`)
      console.log(`🔍 Service token details:`, {
        hasToken: !!onedriveService['accessToken'],
        tokenLength: onedriveService['accessToken']?.length || 0,
        tokenPreview: onedriveService['accessToken']?.substring(0, 30) + '...',
        tokenEnd: onedriveService['accessToken']?.substring(-20) || 'N/A'
      })

      // Validate token
      const isValid = await onedriveService.validateToken()
      if (!isValid) {
        console.error(`❌ OneDrive token validation failed`)
        console.error(`🔍 Connection details:`, {
          hasToken: !!connection.accessToken,
          tokenLength: connection.accessToken?.length || 0,
          tokenPreview: connection.accessToken?.substring(0, 30) + '...',
          expiresAt: connection.expiresAt,
          isExpired: connection.expiresAt ? Date.now() > connection.expiresAt : 'unknown'
        })
        throw new Error("Invalid or expired access token")
      }

      console.log(`✅ OneDrive token validation successful, proceeding to fetch files...`)

      // Get folder contents with pagination
      const result = await onedriveService.getFolderContents(folderId || "root", page, 50)
      
      console.log(`✅ Retrieved ${result.files.length} files from OneDrive`)
      console.log(`📄 Has more pages: ${result.hasMore}`)
      console.log(`📊 Total count: ${result.totalCount}`)

      return result

    } catch (error) {
      console.error("Failed to get real OneDrive files:", error)
      throw error
    }
  }

  // Start a real-time transfer session
  const startRealTimeTransfer = useCallback(async (
    sourceService: string,
    destinationService: string,
    sourceFiles: FileItem[],
    destinationPath: string,
    enableRealTime: boolean = true
  ): Promise<string> => {
    console.log(`🚀 Starting ${enableRealTime ? 'real-time' : 'standard'} transfer`)
    
    if (enableRealTime) {
      try {
        // Get source and destination connections
        const sourceConnection = connections.find(conn => conn.id === sourceService)
        const destConnection = connections.find(conn => conn.id === destinationService)

        if (!sourceConnection || !destConnection) {
          throw new Error("Source or destination connection not found")
        }

        if (!sourceConnection.accessToken || !destConnection.accessToken) {
          throw new Error("Source or destination access token not available")
        }

        // Start real-time transfer session
        const sessionId = await realTimeTransferService.startTransferSession(
          sourceConnection,
          destConnection,
          sourceFiles
        )

        // Create transfer job for UI
        const jobId = `realtime_${sessionId}`
        const newJob: TransferJob = {
          id: jobId,
          sourceService,
          destinationService,
          sourceFiles,
          destinationPath,
          status: "transferring",
          progress: 0,
          startTime: new Date(),
          isRealTime: true,
          sessionId: sessionId
        }

        setTransferJobs(prev => [...prev, newJob])
        setActiveSessions(prev => [...prev, sessionId])

        console.log(`✅ Real-time transfer session started: ${sessionId}`)
        return jobId

      } catch (error) {
        console.error("❌ Failed to start real-time transfer:", error)
        throw error
      }
    } else {
      // Fall back to standard transfer
      return await startTransfer(sourceService, destinationService, sourceFiles, destinationPath)
    }
  }, [connections, realTimeTransferService])

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

    try {
      // Get source and destination connections
      const sourceConnection = connections.find(conn => conn.id === sourceService)
      const destConnection = connections.find(conn => conn.id === destinationService)

      console.log(`🔍 Transfer connections debug:`, {
        sourceServiceId: sourceService,
        destinationServiceId: destinationService,
        sourceConnection: sourceConnection ? {
          id: sourceConnection.id,
          provider: sourceConnection.provider,
          connected: sourceConnection.connected,
          hasToken: !!sourceConnection.accessToken,
          tokenLength: sourceConnection.accessToken?.length || 0,
          tokenPreview: sourceConnection.accessToken?.substring(0, 20) + '...'
        } : null,
        destConnection: destConnection ? {
          id: destConnection.id,
          provider: destConnection.provider,
          connected: destConnection.connected,
          hasToken: !!destConnection.accessToken,
          tokenLength: destConnection.accessToken?.length || 0,
          tokenPreview: destConnection.accessToken?.substring(0, 20) + '...'
        } : null
      })

      if (!sourceConnection || !destConnection) {
        throw new Error("Source or destination connection not found")
      }

      if (!sourceConnection.accessToken || !destConnection.accessToken) {
        throw new Error("Source or destination access token not available")
      }

      // Update status to transferring
      setTransferJobs(prev => 
        prev.map(job => 
          job.id === jobId 
            ? { ...job, status: "transferring", progress: 0 }
            : job
        )
      )

      // Import services dynamically
      const { createGoogleDriveService } = await import("@/lib/google-drive")
      const { createOneDriveService } = await import("@/lib/onedrive")

      // Create service instances based on source and destination
      let sourceServiceInstance: any = null
      let destServiceInstance: any = null

      // Create source service
      if (sourceConnection.provider === "google") {
        sourceServiceInstance = createGoogleDriveService(sourceConnection)
        console.log(`🔧 Created Google Drive source service:`, !!sourceServiceInstance)
      } else if (sourceConnection.provider === "microsoft") {
        sourceServiceInstance = createOneDriveService(sourceConnection)
        console.log(`🔧 Created OneDrive source service:`, !!sourceServiceInstance)
      }

      // Create destination service
      if (destConnection.provider === "google") {
        destServiceInstance = createGoogleDriveService(destConnection)
        console.log(`🔧 Created Google Drive destination service:`, !!destServiceInstance)
      } else if (destConnection.provider === "microsoft") {
        destServiceInstance = createOneDriveService(destConnection)
        console.log(`🔧 Created OneDrive destination service:`, !!destServiceInstance)
      }

      console.log(`🔍 Service creation debug:`, {
        sourceProvider: sourceConnection.provider,
        destProvider: destConnection.provider,
        sourceServiceCreated: !!sourceServiceInstance,
        destServiceCreated: !!destServiceInstance,
        sourceHasToken: !!sourceConnection.accessToken,
        destHasToken: !!destConnection.accessToken
      })

      if (!sourceServiceInstance || !destServiceInstance) {
        throw new Error(`Failed to create service instances. Source: ${!!sourceServiceInstance}, Destination: ${!!destServiceInstance}`)
      }

      // Validate tokens before proceeding
      console.log(`🔍 Validating tokens before transfer:`, {
        googleToken: {
          length: sourceConnection.accessToken?.length || 0,
          preview: sourceConnection.accessToken?.substring(0, 20) + '...',
          hasDots: sourceConnection.accessToken?.includes('.') || false,
          startsWithEy: sourceConnection.accessToken?.startsWith('ey') || false
        },
        oneDriveToken: {
          length: destConnection.accessToken?.length || 0,
          preview: destConnection.accessToken?.substring(0, 20) + '...',
          hasDots: destConnection.accessToken?.includes('.') || false,
          startsWithEy: destConnection.accessToken?.startsWith('ey') || false
        }
      })

      // Check if OneDrive token is expired; refresh if needed
      if (destConnection.provider === "microsoft" && destConnection.refreshToken) {
        const isExpired = !!(destConnection.expiresAt && Date.now() > destConnection.expiresAt)
        
        if (isExpired) {
          console.log(`🔄 OneDrive token needs refresh due to expiry`)
          
          try {
            const refreshResp = await fetch("/api/auth/onedrive/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: destConnection.refreshToken })
            })
            
            if (refreshResp.ok) {
              const refreshed = await refreshResp.json()
              const newAccessToken = refreshed.access_token
              const newRefreshToken = refreshed.refresh_token || destConnection.refreshToken
              const newExpiresAt = Date.now() + (refreshed.expires_in * 1000)
              
              if (newAccessToken) {
                console.log(`✅ OneDrive token refreshed successfully`)
                
                // Update the connection in state
                setConnections(prev => {
                  const updated = prev.map(c => c.id === destConnection.id ? {
                    ...c,
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                    expiresAt: newExpiresAt,
                    status: "connected" as const,
                    error: undefined
                  } : c)
                  saveConnections(updated)
                  return updated
                })
                
                // Update the local reference
                destConnection.accessToken = newAccessToken
                destConnection.refreshToken = newRefreshToken
                destConnection.expiresAt = newExpiresAt
                
                // Recreate the destination service with the new token
                if (destConnection.provider === "microsoft") {
                  const { createOneDriveService: createOneDriveServiceNew } = await import("@/lib/onedrive")
                  const newOneDriveService = createOneDriveServiceNew(destConnection)
                  if (newOneDriveService) {
                    destServiceInstance = newOneDriveService
                  }
                }
              }
            } else {
              const errorText = await refreshResp.text()
              console.error(`❌ OneDrive token refresh failed:`, errorText)
              throw new Error("Failed to refresh OneDrive token")
            }
          } catch (refreshError) {
            console.error(`❌ OneDrive token refresh error:`, refreshError)
            throw new Error("Failed to refresh OneDrive token")
          }
        }
      }

      // Transfer each file
      const totalFiles = sourceFiles.length
      let transferredFiles = 0

      let accumulatedBytes = 0
      for (const file of sourceFiles) {
        try {
          console.log(`🔄 Starting transfer for: ${file.name}`)
          console.log(`📊 File size: ${file.size || 'Unknown'}`)
          
          // Update progress - Starting download (25%)
          const downloadProgress = Math.round((transferredFiles / totalFiles) * 100 + 25)
          setTransferJobs(prev => 
            prev.map(job => 
              job.id === jobId 
                ? { ...job, progress: downloadProgress }
                : job
            )
          )
          
          // Download file from source service with timeout
          console.log(`📥 Downloading ${file.name} from ${sourceConnection.provider}...`)
          let fileData: ArrayBuffer
          
          const downloadPromise = sourceConnection.provider === "google" 
            ? sourceServiceInstance.downloadFile(file.id)
            : sourceConnection.provider === "microsoft"
            ? sourceServiceInstance.downloadFile(file.id)
            : Promise.reject(new Error(`Unsupported source provider: ${sourceConnection.provider}`))
          
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Download timeout after 60 seconds')), 60000)
          )
          
          fileData = await Promise.race([downloadPromise, timeoutPromise]) as ArrayBuffer
          
          console.log(`✅ Downloaded ${file.name}: ${fileData.byteLength} bytes`)
          accumulatedBytes += fileData.byteLength
          
          // Update progress - Download complete, starting upload (50%)
          const uploadProgress = Math.round((transferredFiles / totalFiles) * 100 + 50)
          setTransferJobs(prev => 
            prev.map(job => 
              job.id === jobId 
                ? { ...job, progress: uploadProgress }
                : job
            )
          )
          
          // Upload file to destination service with timeout
          console.log(`📤 Uploading ${file.name} to ${destConnection.provider}...`)
          
          const uploadPromise = destConnection.provider === "google"
            ? destServiceInstance.uploadFile(fileData, file.name, destinationPath)
            : destConnection.provider === "microsoft"
            ? destServiceInstance.uploadFile(fileData, file.name, destinationPath)
            : Promise.reject(new Error(`Unsupported destination provider: ${destConnection.provider}`))
          
          // Add timeout to prevent hanging
          const uploadTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout after 60 seconds')), 60000)
          )
          
          try {
            await Promise.race([uploadPromise, uploadTimeoutPromise])
          } catch (uploadErr) {
            const errMsg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr)
            const is401 = /401|Unauthorized/i.test(errMsg)
            const canRefresh = destConnection.provider === "microsoft" && !!destConnection.refreshToken
            
            if (is401 && canRefresh) {
              console.warn(`🔄 Upload received 401. Attempting OneDrive token refresh and retry...`)
              try {
                const refreshResp = await fetch("/api/auth/onedrive/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ refresh_token: destConnection.refreshToken })
                })
                if (!refreshResp.ok) {
                  const txt = await refreshResp.text()
                  console.error(`❌ Retry token refresh failed:`, txt)
                  throw new Error("Failed to refresh OneDrive token for retry")
                }
                const refreshed = await refreshResp.json()
                const newAccessToken = refreshed.access_token
                const newRefreshToken = refreshed.refresh_token || destConnection.refreshToken
                const newExpiresAt = Date.now() + (refreshed.expires_in * 1000)

                if (!newAccessToken) throw new Error("Refresh response missing access_token")

                // Update connection state
                setConnections(prev => {
                  const updated = prev.map(c => c.id === destConnection.id ? {
                    ...c,
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                    expiresAt: newExpiresAt,
                    status: "connected" as const,
                    error: undefined
                  } : c)
                  saveConnections(updated)
                  return updated
                })
                // Update local refs
                destConnection.accessToken = newAccessToken
                destConnection.refreshToken = newRefreshToken
                destConnection.expiresAt = newExpiresAt

                // Recreate destination service with fresh token
                const { createOneDriveService: recreateOneDrive } = await import("@/lib/onedrive")
                destServiceInstance = recreateOneDrive(destConnection)
                if (!destServiceInstance) throw new Error("Failed to recreate OneDrive service")

                // Retry upload once
                const retryUpload = destServiceInstance.uploadFile(fileData, file.name, destinationPath)
                await Promise.race([retryUpload, uploadTimeoutPromise])
                console.log(`✅ Retry upload succeeded for ${file.name}`)
              } catch (retryErr) {
                console.error(`❌ Retry after 401 failed:`, retryErr)
                throw retryErr
              }
            } else {
              throw uploadErr
            }
          }
          
          console.log(`✅ Uploaded ${file.name} successfully`)
          
          transferredFiles++
          const progress = Math.round((transferredFiles / totalFiles) * 100)
          
          // Update progress
          setTransferJobs(prev => 
            prev.map(job => 
              job.id === jobId 
                ? { ...job, progress }
                : job
            )
          )
          
          console.log(`🎉 Successfully transferred: ${file.name} (${transferredFiles}/${totalFiles})`)
        } catch (fileError) {
          console.error(`❌ Failed to transfer file ${file.name}:`, fileError)
          console.error(`📋 Error details:`, fileError)
          // Continue with other files
        }
      }

      // Mark as completed
      setTransferJobs(prev => 
        prev.map(job => 
          job.id === jobId 
            ? { ...job, status: "completed", progress: 100, endTime: new Date() }
            : job
        )
      )

      // Persist history entry (local and Firestore)
      const costUsd = Number(((accumulatedBytes/(1024*1024*1024))*0.01).toFixed(4))
      const historyEntry: TransferHistoryItem = {
        id: jobId,
        timestamp: Date.now(),
        fromService: sourceService,
        toService: destinationService,
        fileNames: sourceFiles.map(f => f.name),
        totalBytes: accumulatedBytes,
        // @ts-ignore - extend stored shape with cost
        costUsd,
        status: "completed"
      }
      setTransferHistory(prev => {
        const next = [historyEntry, ...prev].slice(0, 50)
        saveTransferHistory(next)
        return next
      })
      try {
        // Check if this job was already recorded by real-time handler
        console.log(`🔍 Regular handler checking job ${jobId} against recordedJobs:`, Array.from(recordedJobsRef.current))
        if (jobId && recordedJobsRef.current.has(jobId)) {
          console.log(`⚠️ Job ${jobId} already recorded by real-time handler, skipping duplicate`)
          return jobId
        }
        
        // TEMPORARY FIX: Skip Firestore recording for regular transfers to prevent duplicates
        // Real-time transfers handle all the Firestore recording
        console.log(`⚠️ SKIPPING Firestore recording for regular transfer ${jobId} to prevent duplicates`)
        return jobId
        
        console.log(`📝 Recording regular transfer completion for job: ${jobId}`)
        console.log(`📊 Current recordedJobs before check:`, Array.from(recordedJobsRef.current))
        
        // Add to ref immediately for synchronous checking
        if (jobId) {
          recordedJobsRef.current.add(jobId)
          setRecordedJobs(prev => {
            const newSet = new Set(prev).add(jobId)
            console.log(`📊 Updated recordedJobs:`, Array.from(newSet))
            return newSet
          })
        }
        
        const userId = auth.currentUser?.uid || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('aqwa_user')||'{}')?.uid || 'anon') : 'server')
        await setDoc(doc(db, 'users', userId, 'transferHistory', historyEntry.id), {
          ...historyEntry,
          createdAt: serverTimestamp()
        })
        const metricsRef = doc(db, 'users', userId, 'metrics', 'aggregate')
        const metricsSnap = await getDoc(metricsRef)
        if (!metricsSnap.exists()) {
          await setDoc(metricsRef, {
            totalTransfers: 1,
            totalBytes: accumulatedBytes,
            totalCost: costUsd,
            monthBytes: accumulatedBytes,
            monthTransfers: 1,
            monthCost: costUsd,
            updatedAt: serverTimestamp()
          })
        } else {
          console.log(`📈 Regular handler: Incrementing Firestore metrics for job ${jobId}`)
          await updateDoc(metricsRef, {
            totalTransfers: increment(1),
            totalBytes: increment(accumulatedBytes),
            totalCost: increment(costUsd),
            monthTransfers: increment(1),
            monthBytes: increment(accumulatedBytes),
            monthCost: increment(costUsd),
            updatedAt: serverTimestamp()
          })
        }
      } catch (fireErr) {
        console.warn('Failed to write metrics/history to Firestore:', fireErr)
      }

      console.log(`🎉 Transfer job ${jobId} completed successfully`)
    } catch (error) {
      console.error(`❌ Transfer job ${jobId} failed:`, error)
      
      // Mark as failed
      setTransferJobs(prev => 
        prev.map(job => 
          job.id === jobId 
            ? { ...job, status: "failed", error: error instanceof Error ? error.message : "Unknown error", endTime: new Date() }
            : job
        )
      )

      // Persist failed history entry (bytes may be partial)
      const failedEntry: TransferHistoryItem = {
        id: jobId,
        timestamp: Date.now(),
        fromService: sourceService,
        toService: destinationService,
        fileNames: sourceFiles.map(f => f.name),
        totalBytes: 0,
        // @ts-ignore
        costUsd: 0,
        status: "failed"
      }
      setTransferHistory(prev => {
        const next = [failedEntry, ...prev].slice(0, 50)
        saveTransferHistory(next)
        return next
      })
      try {
        // Check if this job was already recorded by real-time handler
        if (jobId && recordedJobsRef.current.has(jobId)) {
          console.log(`⚠️ Failed job ${jobId} already recorded by real-time handler, skipping duplicate`)
          return jobId
        }
        
        console.log(`📝 Recording failed transfer for job: ${jobId}`)
        if (jobId) {
          recordedJobsRef.current.add(jobId)
          setRecordedJobs(prev => new Set(prev).add(jobId))
        }
        
        const userId = auth.currentUser?.uid || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('aqwa_user')||'{}')?.uid || 'anon') : 'server')
        await setDoc(doc(db, 'users', userId, 'transferHistory', failedEntry.id), {
          ...failedEntry,
          createdAt: serverTimestamp()
        })
        const metricsRef = doc(db, 'users', userId, 'metrics', 'aggregate')
        const metricsSnap = await getDoc(metricsRef)
        if (!metricsSnap.exists()) {
          await setDoc(metricsRef, {
            totalTransfers: 1,
            totalBytes: 0,
            totalCost: 0,
            monthBytes: 0,
            monthTransfers: 1,
            monthCost: 0,
            updatedAt: serverTimestamp()
          })
        } else {
          await updateDoc(metricsRef, {
            totalTransfers: increment(1),
            monthTransfers: increment(1),
            updatedAt: serverTimestamp()
          })
        }
      } catch (fireErr) {
        console.warn('Failed to write failed entry to Firestore:', fireErr)
      }
    }

    return jobId
  }, [connections])

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

  // Stop real-time transfer session
  const stopRealTimeTransfer = useCallback((sessionId: string) => {
    console.log(`🛑 Stopping real-time transfer session: ${sessionId}`)
    realTimeTransferService.stopTransferSession(sessionId)
    setActiveSessions(prev => prev.filter(id => id !== sessionId))
    
    // Update transfer jobs
    setTransferJobs(prev => 
      prev.map(job => 
        job.sessionId === sessionId 
          ? { ...job, status: "completed" as const, endTime: new Date() }
          : job
      )
    )
  }, [realTimeTransferService])

  // Get real-time transfer statistics
  const getRealTimeStats = useCallback(() => {
    return realTimeTransferService.getServiceStats()
  }, [realTimeTransferService])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all active sessions safely
      activeSessions.forEach(sessionId => {
        try {
          realTimeTransferService.stopTransferSession(sessionId)
        } catch (error) {
          console.warn(`Failed to stop session ${sessionId}:`, error)
        }
      })
      
      // Cleanup service
      try {
        realTimeTransferService.cleanup()
      } catch (error) {
        console.warn('Failed to cleanup real-time transfer service:', error)
      }
    }
  }, []) // Remove dependencies to avoid re-running

  return {
    connections,
    transferJobs,
    transferHistory,
    isLoading,
    activeSessions,
    connectGoogleDrive,
    connectOneDrive,
    disconnectService,
    getFiles,
    loadMoreFiles,
    startTransfer,
    startRealTimeTransfer,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
    stopRealTimeTransfer,
    getRealTimeStats,
    resetConnections,
  }
}
