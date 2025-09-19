"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { 
  FolderOpen, 
  File, 
  ArrowLeft, 
  RefreshCw, 
  Search,
  Loader2,
  AlertCircle,
  HardDrive,
  Calendar,
  FileText
} from "lucide-react"
import { FileItem, CloudConnection } from "@/hooks/use-cloud-connections"
import { createGoogleDriveService } from "@/lib/google-drive"

interface GoogleDriveExplorerProps {
  connection: CloudConnection
  onFileSelect: (files: FileItem[]) => void
  selectedFiles: FileItem[]
}

export function GoogleDriveExplorer({ connection, onFileSelect, selectedFiles }: GoogleDriveExplorerProps) {
  const [currentPath, setCurrentPath] = useState<string[]>(["/"])
  const [currentFolderId, setCurrentFolderId] = useState<string>("root")
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  // Load files when connection or path changes
  useEffect(() => {
    if (connection.connected && connection.accessToken) {
      loadFiles()
    }
  }, [connection, currentPath, currentFolderId, currentPage])

  const loadFiles = async () => {
    if (!connection.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const driveService = createGoogleDriveService(connection)
      if (!driveService) {
        throw new Error("Failed to create Google Drive service")
      }

      const path = currentPath.join("/")
      const result = await driveService.getFolderContents(currentFolderId || "root", currentPage, 50)
      
      setFiles(result.files)
      setHasMore(result.hasMore)
      setTotalCount(result.totalCount)
      
      console.log(`Loaded ${result.files.length} files from Google Drive`)
    } catch (err) {
      console.error("Failed to load Google Drive files:", err)
      setError(err instanceof Error ? err.message : "Failed to load files")
      setFiles([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFolderClick = (folder: FileItem) => {
    if (folder.type === "folder") {
      setCurrentPath([...currentPath, folder.name])
      setCurrentFolderId(folder.id)
      setCurrentPage(1) // Reset to first page when entering folder
    }
  }

  const handleBackClick = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1))
      if (currentPath.length - 1 === 1) {
        setCurrentFolderId("root")
      }
      setCurrentPage(1) // Reset to first page when going back
    }
  }

  const handleFileSelect = (file: FileItem, checked: boolean) => {
    if (checked) {
      onFileSelect([...selectedFiles, file])
    } else {
      onFileSelect(selectedFiles.filter(f => f.id !== file.id))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onFileSelect([...selectedFiles, ...files])
    } else {
      onFileSelect([])
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !connection.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const driveService = createGoogleDriveService(connection)
      if (!driveService) {
        throw new Error("Failed to create Google Drive service")
      }

      const searchResults = await driveService.searchFiles(searchQuery)
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

  const loadMoreFiles = async () => {
    if (!hasMore || isLoading) return
    
    setCurrentPage(prev => prev + 1)
  }

  const isFileSelected = (file: FileItem) => {
    return selectedFiles.some(f => f.id === file.id)
  }

  const getBreadcrumbPath = () => {
    return currentPath.map((segment, index) => (
      <span key={index}>
        <span 
          className="cursor-pointer hover:text-blue-400"
          onClick={() => {
            setCurrentPath(currentPath.slice(0, index + 1))
            setCurrentPage(1)
          }}
        >
          {segment === "/" ? "My Drive" : segment}
        </span>
        {index < currentPath.length - 1 && <span className="mx-2 text-slate-400">/</span>}
      </span>
    ))
  }

  if (!connection.connected) {
    return (
      <Card className="bg-white/5 border-white/20">
        <CardContent className="p-6 text-center">
          <HardDrive className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-400">Google Drive not connected</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/5 border-white/20 min-h-[560px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <img 
            src={connection.icon} 
            alt="Google Drive" 
            className="w-6 h-6 rounded"
          />
          Google Drive
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
            disabled={currentPath.length <= 1}
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
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
          />
          <Button 
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isLoading}
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
              checked={files.length > 0 && selectedFiles.length === files.length}
              onCheckedChange={handleSelectAll}
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
        {isLoading && (
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

        {/* File List */}
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
                    isFileSelected(file) ? 'bg-blue-500/20 border border-blue-500/30' : ''
                  }`}
                  onClick={() => handleFolderClick(file)}
                >
                  <Checkbox
                    checked={isFileSelected(file)}
                    onCheckedChange={(checked) => handleFileSelect(file, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                    className="border-white/20"
                  />
                  
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {file.type === "folder" ? (
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
                        {file.size}
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

        {/* Load More Button intentionally removed for Google Drive */}
      </CardContent>
    </Card>
  )
}
