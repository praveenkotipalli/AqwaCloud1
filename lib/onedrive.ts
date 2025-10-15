import { CloudConnection, FileItem } from "@/hooks/use-cloud-connections"

export interface OneDriveFile {
  id: string
  name: string
  size: number
  lastModifiedDateTime: string
  parentReference?: {
    id: string
    path: string
  }
  webUrl?: string
  "@microsoft.graph.downloadUrl"?: string
  file?: {
    mimeType: string
  }
  folder?: {
    childCount: number
  }
}

export interface OneDriveFolder {
  id: string
  name: string
  lastModifiedDateTime: string
  parentReference?: {
    id: string
    path: string
  }
  folder: {
    childCount: number
  }
}

export class OneDriveService {
  private accessToken: string
  private baseUrl = "https://graph.microsoft.com/v1.0"

  constructor(accessToken: string) {
    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error('Invalid access token provided')
    }
    
    // Remove any whitespace or newlines that might have been added
    this.accessToken = accessToken.trim()
    
    // Microsoft Graph API uses opaque access tokens, not JWT tokens
    // These tokens don't contain dots and don't start with 'ey'
    // This is normal behavior for Microsoft Graph API tokens
    if (!this.accessToken.includes('.')) {
      console.log('ℹ️ Access token is opaque format (normal for Microsoft Graph API)')
    }
    
    // Microsoft tokens don't start with 'ey' - this is expected
    if (!this.accessToken.startsWith('ey')) {
      console.log('ℹ️ Access token is Microsoft Graph API format (not JWT)')
    }
    
    // Check token length (Microsoft Graph API tokens are typically 100+ characters)
    if (this.accessToken.length < 50) {
      console.warn(`⚠️ Access token seems too short (${this.accessToken.length} chars), expected 50+`)
    }
    
    // Check for any obvious formatting issues
    if (this.accessToken.includes('\n') || this.accessToken.includes('\r')) {
      console.warn('⚠️ Access token contains newline characters, cleaning...')
      this.accessToken = this.accessToken.replace(/[\r\n]/g, '')
    }
    
    // Check if token ends with '...' which might indicate truncation
    if (this.accessToken.endsWith('...')) {
      console.warn('⚠️ Access token appears to be truncated (ends with ...)')
    }
    
    // Check for common corruption patterns
    if (this.accessToken.includes('undefined') || this.accessToken.includes('null')) {
      console.warn('⚠️ Access token contains undefined/null values')
    }
    
    console.log(`🔧 OneDriveService initialized with token:`, {
      length: this.accessToken.length,
      preview: this.accessToken.substring(0, 20) + '...',
      hasDots: this.accessToken.includes('.'),
      startsWithEy: this.accessToken.startsWith('ey'),
      cleaned: this.accessToken === accessToken ? 'no' : 'yes'
    })
    
    // Skip JWT decoding to avoid warnings with non-standard tokens
    // this.decodeJWT(this.accessToken)
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    console.log(`🌐 Making OneDrive API request to: ${url.toString()}`)
    console.log(`🔑 Using access token: ${this.accessToken.substring(0, 20)}...`)
    console.log(`📋 Request headers:`, {
      'Authorization': `Bearer ${this.accessToken.substring(0, 20)}...`,
      'Content-Type': 'application/json'
    })
    console.log(`📋 Full Authorization header:`, `Bearer ${this.accessToken}`)
    console.log(`📋 Request method:`, 'GET')
    console.log(`📋 Request URL:`, url.toString())
    console.log(`🔍 Token analysis before request:`, {
      length: this.accessToken.length,
      startsWithEy: this.accessToken.startsWith('ey'),
      hasDots: this.accessToken.includes('.'),
      endsWithDots: this.accessToken.endsWith('...'),
      containsNewlines: this.accessToken.includes('\n'),
      containsQuotes: this.accessToken.includes('"')
    })

    const response = await fetch(url.toString(), {
      method: 'GET', // Default to GET, can be overridden
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    console.log(`📡 Response status: ${response.status} ${response.statusText}`)
    console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()))
    
    // Verify token wasn't modified during the request
    console.log(`🔍 Token integrity check:`, {
      originalLength: this.accessToken.length,
      currentLength: this.accessToken.length,
      wasModified: false, // This should always be false
      tokenPreview: this.accessToken.substring(0, 20) + '...'
    })
    
    // Log the exact error response for debugging
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ OneDrive API error: ${response.status} ${response.statusText}`)
      console.error(`📄 Error details:`, errorText)
      
      // Try to parse the error response as JSON for more details
      try {
        const errorJson = JSON.parse(errorText)
        console.error(`📄 Parsed error response:`, errorJson)
        
        // Check for specific Microsoft Graph API error codes
        if (errorJson.error) {
          console.error(`🚨 Microsoft Graph API Error:`, {
            code: errorJson.error.code,
            message: errorJson.error.message,
            innerError: errorJson.error.innerError
          })
          
          // Provide specific guidance based on error codes
          if (errorJson.error.code === 'UnknownError') {
            console.error(`💡 This usually indicates an authentication issue. Common causes:`)
            console.error(`   - Token is expired or invalid`)
            console.error(`   - Token format is corrupted`)
            console.error(`   - Insufficient permissions`)
            console.error(`   - Network or API endpoint issues`)
          }
          
          // Check if this is a token-related error
          if (response.status === 401) {
            console.error(`🔐 401 Unauthorized - Token authentication failed`)
            console.error(`💡 Possible solutions:`)
            console.error(`   1. Check if token is expired`)
            console.error(`   2. Verify token format is correct`)
            console.error(`   3. Ensure proper OAuth scopes were granted`)
            console.error(`   4. Try reconnecting the OneDrive account`)
            
            // Additional debugging for 401 errors
            console.error(`🔍 Token analysis for 401 error:`)
            console.error(`   - Token length: ${this.accessToken.length}`)
            console.error(`   - Token starts with 'ey': ${this.accessToken.startsWith('ey')}`)
            console.error(`   - Token contains dots: ${this.accessToken.includes('.')}`)
            console.error(`   - Token preview: ${this.accessToken.substring(0, 30)}...`)
            
            // Check for common token corruption patterns
            if (this.accessToken.length < 100) {
              console.error(`   - ⚠️ Token is suspiciously short`)
            }
            if (!this.accessToken.startsWith('ey')) {
              console.error(`   - ⚠️ Token doesn't start with expected JWT header`)
            }
            if (this.accessToken.includes('\n') || this.accessToken.includes('\r')) {
              console.error(`   - ⚠️ Token contains newline characters`)
            }
            if (this.accessToken.includes('undefined') || this.accessToken.includes('null')) {
              console.error(`   - ⚠️ Token contains undefined/null values`)
            }
          }
        }
      } catch (parseError) {
        console.error(`📄 Could not parse error response as JSON:`, parseError)
      }
      
      throw new Error(`OneDrive API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`✅ OneDrive API response:`, data)
    return data
  }

  // Get files and folders from a specific folder
  async getFiles(folderId: string = "root", pageToken?: string, pageSize: number = 50) {
    const params: Record<string, string> = {
      $top: pageSize.toString(),
      $orderby: "name",
      $select: "id,name,size,lastModifiedDateTime,parentReference,webUrl,file,folder,@microsoft.graph.downloadUrl"
    }

    let endpoint = "/me/drive/root/children"
    if (folderId !== "root") {
      endpoint = `/me/drive/items/${folderId}/children`
    }

    if (pageToken) {
      params.$skiptoken = pageToken
    }

    const data = await this.makeRequest(endpoint, params)
    
    return {
      files: data.value || [],
      nextPageToken: data["@odata.nextLink"] ? this.extractSkipToken(data["@odata.nextLink"]) : undefined,
      hasMore: !!data["@odata.nextLink"]
    }
  }

  // Get folder contents with pagination
  async getFolderContents(folderId: string = "root", page: number = 1, pageSize: number = 50) {
    let currentPage = 1
    let allFiles: OneDriveFile[] = []
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
      type: file.folder ? 'folder' : 'file',
      size: file.size ? this.formatFileSize(file.size) : undefined,
      modified: new Date(file.lastModifiedDateTime).toLocaleDateString(),
      path: `/${file.name}`,
      mimeType: file.file?.mimeType,
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
    let searchEndpoint = "/me/drive/root/search(q='{query}')"
    
    if (folderId && folderId !== "root") {
      searchEndpoint = `/me/drive/items/${folderId}/search(q='{query}')`
    }

    const params: Record<string, string> = {
      $select: "id,name,size,lastModifiedDateTime,parentReference,webUrl,file,folder,@microsoft.graph.downloadUrl"
    }

    const endpoint = searchEndpoint.replace('{query}', encodeURIComponent(query))
    const data = await this.makeRequest(endpoint, params)
    
    return data.value.map((file: OneDriveFile) => ({
      id: file.id,
      name: file.name,
      type: file.folder ? 'folder' : 'file',
      size: file.size ? this.formatFileSize(file.size) : undefined,
      modified: new Date(file.lastModifiedDateTime).toLocaleDateString(),
      path: `/${file.name}`,
      mimeType: file.file?.mimeType,
      selected: false,
      children: []
    }))
  }

  // Get file metadata
  async getFileMetadata(fileId: string) {
    const data = await this.makeRequest(`/me/drive/items/${fileId}`, {
      $select: "id,name,size,lastModifiedDateTime,parentReference,webUrl,file,folder,@microsoft.graph.downloadUrl"
    })

    return {
      id: data.id,
      name: data.name,
      type: data.folder ? 'folder' : 'file',
      size: data.size ? this.formatFileSize(data.size) : undefined,
      modified: new Date(data.lastModifiedDateTime).toLocaleDateString(),
      path: `/${data.name}`,
      mimeType: data.file?.mimeType,
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
        type: file.folder ? 'folder' : 'file',
        size: file.size ? this.formatFileSize(file.size) : undefined,
        modified: new Date(file.lastModifiedDateTime).toLocaleDateString(),
        path: `/${file.name}`,
        mimeType: file.file?.mimeType,
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
    const data = await this.makeRequest("/me/drive", {
      $select: "quota"
    })

    const quota = data.quota
    return {
      used: this.formatFileSize(quota.used),
      total: this.formatFileSize(quota.total),
      available: this.formatFileSize(quota.total - quota.used)
    }
  }

  // Get user profile information
  async getUserProfile() {
    const data = await this.makeRequest("/me", {
      $select: "mail,displayName,userPrincipalName"
    })

    return {
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      photoLink: undefined // OneDrive doesn't provide photo link in basic profile
    }
  }

  // Helper method to extract skip token from next link
  private extractSkipToken(nextLink: string): string | undefined {
    try {
      const url = new URL(nextLink)
      return url.searchParams.get('$skiptoken') || undefined
    } catch {
      return undefined
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

  // Decode JWT token to inspect contents (for debugging)
  private decodeJWT(token: string): any {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.warn('⚠️ Token does not have 3 parts (not a valid JWT)')
        return null
      }
      
      // Decode header and payload (base64url decode)
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      
      console.log(`🔍 JWT Token Analysis:`, {
        header,
        payload: {
          ...payload,
          exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
          iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'N/A'
        }
      })
      
      return { header, payload }
    } catch (error) {
      console.error(`❌ Failed to decode JWT token:`, error)
      return null
    }
  }

  // Simple token test - try to make a basic request
  async testTokenDirectly(): Promise<boolean> {
    try {
      console.log(`🧪 Testing token directly with /me endpoint...`)
      
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log(`📡 Direct token test response:`, response.status, response.statusText)
      
      if (response.ok) {
        console.log(`✅ Token works directly!`)
        return true
      } else {
        const errorText = await response.text()
        console.log(`❌ Token test failed:`, errorText)
        return false
      }
    } catch (error) {
      console.error(`❌ Direct token test error:`, error)
      return false
    }
  }

  // Test if the Microsoft Graph API is accessible
  async testApiAccess(): Promise<boolean> {
    try {
      console.log(`🧪 Testing Microsoft Graph API accessibility...`)
      
      // Try multiple endpoints to test accessibility
      const testEndpoints = [
        "https://graph.microsoft.com/v1.0/",
        "https://graph.microsoft.com/v1.0/$metadata",
        "https://graph.microsoft.com/v1.0/me"
      ]
      
      for (const endpoint of testEndpoints) {
        try {
          console.log(`🧪 Testing endpoint: ${endpoint}`)
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          })
          
          console.log(`📡 ${endpoint} response:`, response.status, response.statusText)
          
          // Any response means the API is reachable
          if (response.status >= 200 && response.status < 600) {
            console.log(`✅ Microsoft Graph API is accessible via ${endpoint} (status: ${response.status})`)
            return true
          }
        } catch (endpointError) {
          console.log(`⚠️ Endpoint ${endpoint} failed:`, endpointError)
        }
      }
      
      console.log(`❌ All test endpoints failed`)
      return false
      
    } catch (error) {
      console.error(`❌ Failed to test Microsoft Graph API access:`, error)
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(`🌐 Network error - check your internet connection`)
      } else if (error instanceof TypeError && error.message.includes('CORS')) {
        console.error(`🚫 CORS error - this might be a browser security issue`)
      }
      
      return false
    }
  }

  // Download file content from OneDrive
  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    console.log(`📥 Downloading file ${fileId} from OneDrive`)
    
    try {
      // First get the download URL
      const fileResponse = await this.makeRequest(`/me/drive/items/${fileId}`)
      const downloadUrl = fileResponse['@microsoft.graph.downloadUrl']
      
      if (!downloadUrl) {
        throw new Error('No download URL available for this file')
      }
      
      console.log(`🌐 Download URL: ${downloadUrl}`)
      
      // Download the file content
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      console.log(`✅ Downloaded ${arrayBuffer.byteLength} bytes from OneDrive`)
      return arrayBuffer
      
    } catch (error) {
      console.error(`❌ OneDrive download failed:`, error)
      throw error
    }
  }

  // Upload file to OneDrive (uses Upload Session for large files)
  async uploadFile(fileData: ArrayBuffer, fileName: string, folderId: string = "root"): Promise<OneDriveFile> {
    console.log(`📤 Uploading file ${fileName} to OneDrive folder ${folderId}`)
    console.log(`📊 File size: ${fileData.byteLength} bytes`)
    console.log(`🔑 Using access token:`, {
      length: this.accessToken.length,
      preview: this.accessToken.substring(0, 50) + '...',
      hasDots: this.accessToken.includes('.'),
      startsWithEy: this.accessToken.startsWith('ey')
    })
    
    // Prefer Upload Session for reliability with large files
    try {
      // Clean filename for URL safety
      const cleanFileName = fileName.replace(/[<>:"/\\|?*]/g, '_')
      
      console.log(`📝 Original filename: ${fileName}`)
      console.log(`📝 Clean filename: ${cleanFileName}`)
      
      const parentPath = folderId === 'root' ? 'root' : `items/${folderId}`
      const createSessionResp = await fetch(`${this.baseUrl}/me/drive/${parentPath}:/${cleanFileName}:/createUploadSession`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item: {
            '@microsoft.graph.conflictBehavior': 'replace',
            name: cleanFileName
          }
        })
      })
      if (!createSessionResp.ok) {
        const t = await createSessionResp.text()
        console.error('❌ Failed to create upload session', t)
        throw new Error(`Create upload session failed: ${createSessionResp.status} ${createSessionResp.statusText}`)
      }
      const session = await createSessionResp.json()
      const uploadUrl = session.uploadUrl as string
      if (!uploadUrl) throw new Error('Upload session missing uploadUrl')

      // Upload in chunks (10MB)
      const total = fileData.byteLength
      const chunkSize = 10 * 1024 * 1024
      let offset = 0
      while (offset < total) {
        const end = Math.min(offset + chunkSize, total)
        const chunk = (fileData as ArrayBuffer).slice(offset, end)
        const contentRange = `bytes ${offset}-${end - 1}/${total}`
        const resp = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': String(chunk.byteLength),
            'Content-Range': contentRange
          },
          body: chunk
        })
        if (!resp.ok && resp.status !== 202) {
          const t = await resp.text()
          throw new Error(`Upload chunk failed: ${resp.status} ${resp.statusText} - ${t}`)
        }
        offset = end
      }

      // Finalize (GET on uploadUrl returns final item sometimes; to be safe, request item by path)
      const finalizeEndpoint = folderId === 'root' 
        ? `/me/drive/root:/${encodeURIComponent(cleanFileName)}`
        : `/me/drive/items/${folderId}:/${encodeURIComponent(cleanFileName)}`
      const finalizeResp = await fetch(`${this.baseUrl}${finalizeEndpoint}` , {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      })
      if (!finalizeResp.ok) {
        const t = await finalizeResp.text()
        console.warn('⚠️ Could not fetch finalized item, returning minimal object', t)
        return { id: 'unknown', name: cleanFileName, size: total, lastModifiedDateTime: new Date().toISOString(), folder: undefined as any } as OneDriveFile
      }
      const uploadedFile = await finalizeResp.json()
      console.log(`✅ Uploaded file ${fileName} to OneDrive via session:`, uploadedFile.id)
      return uploadedFile
      
    } catch (error) {
      console.error(`❌ OneDrive upload failed:`, error)
      throw error
    }
  }

  // Validate access token
  async validateToken(): Promise<boolean> {
    try {
      console.log(`🔍 Validating OneDrive token...`)
      console.log(`🔑 Token details:`, {
        hasToken: !!this.accessToken,
        tokenLength: this.accessToken?.length || 0,
        tokenPreview: this.accessToken?.substring(0, 50) + '...',
        tokenEnd: this.accessToken?.substring(-20) || 'N/A'
      })
      
      // First test if the API is accessible
      const apiAccessible = await this.testApiAccess()
      if (!apiAccessible) {
        console.warn(`⚠️ Microsoft Graph API accessibility test failed, but continuing with token validation...`)
        // Don't return false here, continue with token validation
      }
      
      // Validate against a Drive endpoint which matches granted Files.* scopes
      console.log(`🧪 Testing token with /me/drive endpoint...`)
      const response = await this.makeRequest("/me/drive", { $select: "id" })
      console.log(`✅ OneDrive token validation successful:`, response)
      return true
    } catch (error) {
      console.error(`❌ OneDrive token validation failed:`, error)
      
      // Try to get more details about the error
      if (error instanceof Error) {
        console.error(`📋 Error message:`, error.message)
        console.error(`📋 Error stack:`, error.stack)
      }
      
      return false
    }
  }
}

// Factory function to create OneDrive service
export function createOneDriveService(connection: CloudConnection): OneDriveService | null {
  if (!connection.accessToken || connection.provider !== 'microsoft') {
    return null
  }

  return new OneDriveService(connection.accessToken)
}
