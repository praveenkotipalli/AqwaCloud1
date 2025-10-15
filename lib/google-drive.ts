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
  private uploadBaseUrl = "https://www.googleapis.com/upload/drive/v3"

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    console.log(`🌐 Making Google Drive API request to: ${url.toString()}`)
    console.log(`🔑 Using access token: ${this.accessToken.substring(0, 20)}...`)

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Google Drive API error: ${response.status} ${response.statusText}`)
      console.error(`📄 Error details:`, errorText)
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

  // Download file content
  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    console.log(`📥 Downloading file ${fileId} from Google Drive`)
    
    // First, get file metadata to determine if it's a Google Docs file
    const metadataResponse = await fetch(`${this.baseUrl}/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      }
    })

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text()
      console.error(`❌ Google Drive metadata error: ${metadataResponse.status} ${metadataResponse.statusText}`)
      throw new Error(`Google Drive metadata error: ${metadataResponse.status} ${metadataResponse.statusText} - ${errorText}`)
    }

    const fileMetadata = await metadataResponse.json()
    console.log(`📄 File metadata:`, {
      name: fileMetadata.name,
      mimeType: fileMetadata.mimeType,
      size: fileMetadata.size
    })

    // Check if it's a Google Docs file that needs export
    const isGoogleDocsFile = fileMetadata.mimeType && (
      fileMetadata.mimeType.startsWith('application/vnd.google-apps.') ||
      fileMetadata.mimeType.includes('google-apps')
    )

    let downloadUrl: string
    if (isGoogleDocsFile) {
      console.log(`📝 Detected Google Docs file, using Export API`)
      // For Google Docs files, use the export API
      const exportMimeType = this.getExportMimeType(fileMetadata.mimeType)
      downloadUrl = `${this.baseUrl}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`
    } else {
      console.log(`📄 Detected binary file, using direct download`)
      // For regular files, use direct download
      downloadUrl = `${this.baseUrl}/files/${fileId}?alt=media`
    }

    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Google Drive download error: ${response.status} ${response.statusText}`)
      console.error(`📄 Error details:`, errorText)
      throw new Error(`Google Drive download error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    console.log(`✅ Downloaded ${arrayBuffer.byteLength} bytes from Google Drive`)
    return arrayBuffer
  }

  // Get the appropriate export MIME type for Google Docs files
  private getExportMimeType(googleDocsMimeType: string): string {
    const exportMimeTypes: { [key: string]: string } = {
      'application/vnd.google-apps.document': 'application/pdf', // Google Docs -> PDF
      'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Google Sheets -> Excel
      'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', // Google Slides -> PowerPoint
      'application/vnd.google-apps.drawing': 'image/png', // Google Drawings -> PNG
      'application/vnd.google-apps.form': 'application/pdf', // Google Forms -> PDF
    }

    return exportMimeTypes[googleDocsMimeType] || 'application/pdf'
  }

  // Upload file to Google Drive (resumable for large files)
  async uploadFile(fileData: ArrayBuffer, fileName: string, folderId: string = "root"): Promise<GoogleDriveFile> {
    console.log(`📤 Uploading file ${fileName} to Google Drive folder ${folderId}`)
    console.log(`📊 File size: ${fileData.byteLength} bytes`)
    
    try {
      // Use the correct Google Drive multipart format
      const boundary = '-------314159265358979323846'
      const delimiter = `\r\n--${boundary}\r\n`
      const close_delim = `\r\n--${boundary}--`
      
      const metadata = {
        name: fileName,
        parents: folderId === "root" ? undefined : [folderId]
      }
      
      // Create the multipart body efficiently using Uint8Array
      const metadataPart = new TextEncoder().encode(
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/octet-stream\r\n\r\n'
      )
      
      const closePart = new TextEncoder().encode(close_delim)
      
      // Combine all parts efficiently
      const totalLength = metadataPart.length + fileData.byteLength + closePart.length
      const combinedData = new Uint8Array(totalLength)
      
      let offset = 0
      combinedData.set(metadataPart, offset)
      offset += metadataPart.length
      combinedData.set(new Uint8Array(fileData), offset)
      offset += fileData.byteLength
      combinedData.set(closePart, offset)
      
      // Recompose body to strictly follow Drive multipart/related format
      const preamble = `--${boundary}\r\n` +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\n` +
        'Content-Type: application/octet-stream\r\n\r\n'

      const closing = `\r\n--${boundary}--`
      const preambleBytes = new TextEncoder().encode(preamble)
      const closingBytes = new TextEncoder().encode(closing)

      // Build body bytes (explicit, avoids implicit header issues)
      const bodyBytes = new Uint8Array(preambleBytes.length + fileData.byteLength + closingBytes.length)
      bodyBytes.set(preambleBytes, 0)
      bodyBytes.set(new Uint8Array(fileData), preambleBytes.length)
      bodyBytes.set(closingBytes, preambleBytes.length + fileData.byteLength)

      // For very large files (> 150MB), prefer resumable uploads
      if (fileData.byteLength > 150 * 1024 * 1024) {
        console.log(`⏫ Using resumable upload flow for large file`)
        // 1) Start a resumable session
        const sessionResp = await fetch(`${this.uploadBaseUrl}/files?uploadType=resumable`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8'
          },
          body: JSON.stringify({
            name: fileName,
            parents: folderId === "root" ? undefined : [folderId]
          })
        })
        if (!sessionResp.ok) {
          const t = await sessionResp.text()
          throw new Error(`Failed to start resumable session: ${sessionResp.status} ${sessionResp.statusText} - ${t}`)
        }
        const uploadUrl = sessionResp.headers.get('Location')
        if (!uploadUrl) {
          throw new Error('Resumable session did not return Location header')
        }

        // 2) Upload in chunks (10MB) with retry/backoff per chunk
        const chunkSize = 10 * 1024 * 1024
        const total = fileData.byteLength
        let offset = 0
        while (offset < total) {
          const end = Math.min(offset + chunkSize, total)
          const chunk = (fileData as ArrayBuffer).slice(offset, end)
          const contentRange = `bytes ${offset}-${end - 1}/${total}`
          let success = false
          let attempt = 0
          const maxRetries = 3
          while (!success && attempt < maxRetries) {
            attempt++
            const resp = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Length': String(chunk.byteLength),
                'Content-Range': contentRange
              },
              body: chunk
            })
            if (resp.status === 308 || resp.ok) {
              success = true
              break
            }
            const t = await resp.text()
            if (attempt >= maxRetries) {
              throw new Error(`Resumable chunk upload failed: ${resp.status} ${resp.statusText} - ${t}`)
            }
            const backoff = Math.min(30000, 1000 * Math.pow(2, attempt))
            console.warn(`⏳ Retrying Drive chunk (${attempt}/${maxRetries}) after ${backoff}ms: ${resp.status} ${resp.statusText}`)
            await new Promise(r => setTimeout(r, backoff))
          }
          offset = end
        }

        // 3) Final response
        const finalizeResp = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Length': '0', 'Content-Range': `bytes */${total}` } })
        if (!finalizeResp.ok) {
          const t = await finalizeResp.text()
          throw new Error(`Finalize resumable upload failed: ${finalizeResp.status} ${finalizeResp.statusText} - ${t}`)
        }
        const uploadedFile = await finalizeResp.json()
        console.log(`✅ Resumable upload complete:`, uploadedFile.id)
        return uploadedFile
      }

      // Use the Google Drive multipart upload for smaller files
      const response = await fetch(`${this.uploadBaseUrl}/files?uploadType=multipart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: bodyBytes
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Google Drive upload error: ${response.status} ${response.statusText}`)
        console.error(`📄 Error details:`, errorText)
        throw new Error(`Google Drive upload error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const uploadedFile = await response.json()
      console.log(`✅ Uploaded file ${fileName} to Google Drive:`, uploadedFile.id)
      return uploadedFile
      
    } catch (error) {
      console.error(`❌ Google Drive upload failed:`, error)
      throw error
    }
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
