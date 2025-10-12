"use client"

import { useState, useEffect } from "react"
import { useCloudConnections, FileItem } from "@/hooks/use-cloud-connections"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  FolderOpen, 
  File, 
  Search, 
  RefreshCw, 
  HardDrive, 
  Calendar,
  Loader2,
  AlertCircle,
  ArrowLeft,
  FileText
} from "lucide-react"
import { createOneDriveService } from "@/lib/onedrive"

interface OneDriveExplorerProps {
  connectionId: string
  onFileSelect?: (files: FileItem[]) => void
  selectedFiles?: FileItem[]
}

export function OneDriveExplorer({ connectionId, onFileSelect, selectedFiles: externalSelectedFiles }: OneDriveExplorerProps) {
  const { connections, getFiles, loadMoreFiles } = useCloudConnections()
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState("/")
  const [currentFolderId, setCurrentFolderId] = useState<string>("root")
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [internalSelectedFiles, setInternalSelectedFiles] = useState<Set<string>>(new Set())
  
  // Use external selected files if provided, otherwise use internal state
  const selectedFiles = externalSelectedFiles ? new Set(externalSelectedFiles.map(f => f.id)) : internalSelectedFiles
  const setSelectedFiles = externalSelectedFiles ? (() => {}) : setInternalSelectedFiles

  const connection = connections.find(c => c.id === connectionId)

  useEffect(() => {
    console.log(`🔄 OneDrive Explorer useEffect triggered:`, {
      connectionId,
      hasConnection: !!connection,
      connected: connection?.connected,
      hasAccessToken: !!connection?.accessToken,
      accessTokenLength: connection?.accessToken?.length || 0,
      accessTokenPreview: connection?.accessToken?.substring(0, 20) + '...',
      expiresAt: connection?.expiresAt,
      isExpired: connection?.expiresAt ? Date.now() > connection?.expiresAt : 'unknown',
      status: connection?.status,
      provider: connection?.provider,
      accountEmail: connection?.accountEmail
    })
    
    if (connection?.connected) {
      loadFiles()
    }
  }, [connection?.connected, currentPath, currentFolderId, currentPage, connectionId])

  const loadFiles = async () => {
    console.log(`📁 OneDrive loadFiles called:`, {
      connectionId,
      hasConnection: !!connection,
      connected: connection?.connected,
      hasAccessToken: !!connection?.accessToken,
      currentPath,
      currentPage
    })
    
    if (!connection?.connected) {
      console.log(`❌ OneDrive connection not ready`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log(`🚀 Calling getFiles for OneDrive...`)
      const result = await getFiles(connectionId, currentFolderId, currentPage)
      console.log(`✅ OneDrive files loaded:`, {
        fileCount: result.files.length,
        hasMore: result.hasMore,
        totalCount: result.totalCount
      })
      setFiles(result.files)
      setHasMore(result.hasMore)
      setTotalCount(result.totalCount)
    } catch (err) {
      console.error("Failed to load OneDrive files:", err)
      setError(err instanceof Error ? err.message : "Failed to load files")
      setFiles([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadMore = async () => {
    if (!hasMore || isLoading) return

    setIsLoading(true)
    try {
      const result = await loadMoreFiles(connectionId, currentPath, currentPage)
      setFiles(prev => [...prev, ...result.files])
      setHasMore(result.hasMore)
      setCurrentPage(prev => prev + 1)
    } catch (err) {
      console.error("Failed to load more files:", err)
      setError(err instanceof Error ? err.message : "Failed to load more files")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFolderClick = (folder: FileItem) => {
    if (folder.type === 'folder') {
      setCurrentPath(prev => `${prev}${prev.endsWith('/') ? '' : '/'}${folder.name}`)
      setCurrentFolderId(folder.id)
      setCurrentPage(1)
      setSelectedFiles(new Set())
    }
  }

  const handleFileSelect = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles)
    if (checked) {
      newSelected.add(fileId)
    } else {
      newSelected.delete(fileId)
    }
    setSelectedFiles(newSelected)
    
    // If external onFileSelect is provided, call it with the selected files
    if (onFileSelect) {
      const selectedFileItems = files.filter(file => newSelected.has(file.id))
      onFileSelect(selectedFileItems)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(files.map(f => f.id)))
      if (onFileSelect) onFileSelect(files)
    } else {
      setSelectedFiles(new Set())
      if (onFileSelect) onFileSelect([])
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !connection?.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const onedriveService = createOneDriveService(connection)
      if (!onedriveService) {
        throw new Error("Failed to create OneDrive service")
      }

      const searchResults = await onedriveService.searchFiles(searchQuery)
      setFiles(searchResults)
      setHasMore(false)
      setTotalCount(searchResults.length)
      setCurrentPage(1)
    } catch (err) {
      console.error("Search failed:", err)
      setError(err instanceof Error ? err.message : "Search failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToRoot = () => {
    setCurrentPath("/")
    setCurrentFolderId("root")
    setCurrentPage(1)
    setSelectedFiles(new Set())
    setSearchQuery("")
  }

  const handleBackClick = () => {
    if (currentPath !== "/") {
      const parts = currentPath.split('/').filter(Boolean)
      const parent = parts.slice(0, -1).join('/')
      setCurrentPath(parent ? `/${parent}` : "/")
      // We don't have the parent folder ID mapping; reset to root when going back to top
      if (!parent) {
        setCurrentFolderId("root")
      }
      setCurrentPage(1)
      setSelectedFiles(new Set())
    }
  }

  const getBreadcrumbPath = () => {
    const parts = currentPath.split('/').filter(Boolean)
    const segments = ["/", ...parts]
    let built = ""
    return segments.map((segment, index) => {
      if (segment === "/") {
        built = "/"
      } else {
        built = `${built}${built.endsWith('/') ? '' : '/'}${segment}`
      }
      return (
        <span key={index}>
          <span 
            className="cursor-pointer hover:text-blue-400"
            onClick={() => {
              setCurrentPath(built)
              setCurrentPage(1)
            }}
          >
            {segment === "/" ? "OneDrive" : segment}
          </span>
          {index < segments.length - 1 && <span className="mx-2 text-slate-400">/</span>}
        </span>
      )
    })
  }

  const formatFileSize = (size?: string) => {
    if (!size) return "Unknown"
    return size
  }

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') {
      return <FolderOpen className="h-5 w-5 text-blue-400" />
    }
    return <File className="h-5 w-5 text-slate-400" />
  }

  if (!connection?.connected) {
    return (
      <Card className="bg-white/5 border-white/20">
        <CardContent className="p-6 text-center">
          <HardDrive className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-400">OneDrive not connected</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/5 border-white/20 min-h-[560px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          {connection.icon ? (
            <img src={connection.icon} alt="OneDrive" className="w-6 h-6 rounded" />
          ) : (
            <HardDrive className="h-6 w-6" />
          )}
          OneDrive
          {connection.accountEmail && (
            <Badge variant="secondary" className="text-xs">
              {connection.accountEmail}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            disabled={currentPath === "/"}
            className="p-1 h-auto"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center">
            {getBreadcrumbPath()}
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
          />
          <Button 
            onClick={handleSearch} 
            disabled={isLoading || !searchQuery.trim()}
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* File List Header */}
        <div className="flex items-center justify-between text-sm text-slate-400 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={files.length > 0 && selectedFiles.size === files.length}
              onCheckedChange={(val) => handleSelectAll(Boolean(val))}
              className="border-white/20"
            />
            <span>Select All</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{totalCount} items</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadFiles}
              disabled={isLoading}
              className="p-1 h-auto text-slate-400 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && files.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <span className="ml-2 text-slate-400">Loading files...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        {/* Files List */}
        {!isLoading && !error && (
          <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
            {files.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No files found</p>
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer ${
                    selectedFiles.has(file.id) ? 'bg-blue-500/20 border border-blue-500/30' : ''
                  }`}
                  onClick={() => handleFolderClick(file)}
                >
                  <Checkbox
                    checked={selectedFiles.has(file.id)}
                    onCheckedChange={(checked) => handleFileSelect(file.id, Boolean(checked))}
                    onClick={(e) => e.stopPropagation()}
                    className="border-white/20"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {file.type === 'folder' ? (
                      <FolderOpen className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    ) : (
                      <File className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-white truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-shrink-0">
                    {file.size && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {formatFileSize(file.size)}
                      </span>
                    )}
                    {file.modified && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {file.modified}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="text-center pt-4">
            <Button
              onClick={loadMore}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Load More Files
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
