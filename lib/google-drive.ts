import { CloudConnection, FileItem } from "@/hooks/use-cloud-connections"

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime: string
  parents?: string[]
  webViewLink?: string
  thumbnailLink?: string
}

export interface GoogleDriveFolder {
  id: string
  name: string
  mimeType: string
  parents?: string[]
}

export class GoogleDriveService {
  private accessToken: string
  private baseUrl = "https://www.googleapis.com/drive/v3"

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google Drive API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  // Get files and folders from a specific folder
  async getFiles(folderId: string = "root", pageToken?: string, pageSize: number = 50) {
    const params: Record<string, string> = {
      fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,webViewLink,thumbnailLink)",
      pageSize: pageSize.toString(),
      orderBy: "name"
    }

    if (folderId !== "root") {
      params.q = `'${folderId}' in parents and trashed=false`
    } else {
      params.q = "trashed=false"
    }

    if (pageToken) {
      params.pageToken = pageToken
    }

    const data = await this.makeRequest("/files", params)
    
    return {
      files: data.files || [],
      nextPageToken: data.nextPageToken,
      hasMore: !!data.nextPageToken
    }
  }

  // Get folder contents with pagination
  async getFolderContents(folderId: string = "root", page: number = 1, pageSize: number = 50) {
    let currentPage = 1
    let allFiles: GoogleDriveFile[] = []
    let nextPageToken: string | undefined

    // Collect all files up to the requested page
    while (currentPage <= page) {
      const result = await this.getFiles(folderId, nextPageToken, pageSize)
      allFiles = allFiles.concat(result.files)
      nextPageToken = result.nextPageToken
      
      if (!result.hasMore) break
      currentPage++
    }

    // Transform to FileItem format
    const fileItems: FileItem[] = allFiles.map(file => ({
      id: file.id,
      name: file.name,
      type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      size: file.size ? this.formatFileSize(parseInt(file.size)) : undefined,
      modified: new Date(file.modifiedTime).toLocaleDateString(),
      path: `/${file.name}`,
      mimeType: file.mimeType,
      selected: false,
      children: []
    }))

    // Separate folders and files
    const folders = fileItems.filter(item => item.type === 'folder')
    const files = fileItems.filter(item => item.type === 'file')

    return {
      files: [...folders, ...files],
      hasMore: !!nextPageToken,
      totalCount: allFiles.length
    }
  }

  // Search for files and folders by name
  async searchFiles(query: string, folderId?: string) {
    let searchQuery = `name contains '${query}' and trashed=false`
    
    if (folderId && folderId !== "root") {
      searchQuery += ` and '${folderId}' in parents`
    }

    const params: Record<string, string> = {
      q: searchQuery,
      fields: "files(id,name,mimeType,size,modifiedTime,parents,webViewLink,thumbnailLink)",
      orderBy: "name"
    }

    const data = await this.makeRequest("/files", params)
    
    return data.files.map((file: GoogleDriveFile) => ({
      id: file.id,
      name: file.name,
      type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      size: file.size ? this.formatFileSize(parseInt(file.size)) : undefined,
      modified: new Date(file.modifiedTime).toLocaleDateString(),
      path: `/${file.name}`,
      mimeType: file.mimeType,
      selected: false,
      children: []
    }))
  }

  // Get file metadata
  async getFileMetadata(fileId: string) {
    const data = await this.makeRequest(`/files/${fileId}`, {
      fields: "id,name,mimeType,size,modifiedTime,parents,webViewLink,thumbnailLink"
    })

    return {
      id: data.id,
      name: data.name,
      type: data.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      size: data.size ? this.formatFileSize(parseInt(data.size)) : undefined,
      modified: new Date(data.modifiedTime).toLocaleDateString(),
      path: `/${data.name}`,
      mimeType: data.mimeType,
      selected: false,
      children: []
    }
  }

  // Get folder tree structure
  async getFolderTree(folderId: string = "root", maxDepth: number = 3): Promise<FileItem[]> {
    if (maxDepth <= 0) return []

    const result = await this.getFiles(folderId)
    const items: FileItem[] = []

    for (const file of result.files) {
      const item: FileItem = {
        id: file.id,
        name: file.name,
        type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
        size: file.size ? this.formatFileSize(parseInt(file.size)) : undefined,
        modified: new Date(file.modifiedTime).toLocaleDateString(),
        path: `/${file.name}`,
        mimeType: file.mimeType,
        selected: false,
        children: []
      }

      if (item.type === 'folder' && maxDepth > 1) {
        try {
          item.children = await this.getFolderTree(file.id, maxDepth - 1)
        } catch (error) {
          console.warn(`Failed to load children for folder ${file.name}:`, error)
          item.children = []
        }
      }

      items.push(item)
    }

    return items
  }

  // Get storage quota information
  async getStorageQuota() {
    const data = await this.makeRequest("/about", {
      fields: "storageQuota"
    })

    const quota = data.storageQuota
    return {
      used: this.formatFileSize(parseInt(quota.usage)),
      total: this.formatFileSize(parseInt(quota.limit)),
      available: this.formatFileSize(parseInt(quota.limit) - parseInt(quota.usage))
    }
  }

  // Get user profile information
  async getUserProfile() {
    const data = await this.makeRequest("/about", {
      fields: "user"
    })

    return {
      email: data.user.emailAddress,
      name: data.user.displayName,
      photoLink: data.user.photoLink
    }
  }

  // Helper method to format file sizes
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Validate access token
  async validateToken(): Promise<boolean> {
    try {
      await this.makeRequest("/about", { fields: "user" })
      return true
    } catch (error) {
      return false
    }
  }
}

// Factory function to create Google Drive service
export function createGoogleDriveService(connection: CloudConnection): GoogleDriveService | null {
  if (!connection.accessToken || connection.provider !== 'google') {
    return null
  }

  return new GoogleDriveService(connection.accessToken)
}
