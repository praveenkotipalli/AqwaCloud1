"use client"

import { useState, useEffect } from "react"
import { useCloudConnections } from "@/hooks/use-cloud-connections"
import { createOneDriveService } from "@/lib/onedrive"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, AlertCircle, CheckCircle, XCircle } from "lucide-react"

export default function DebugOneDrivePage() {
  const { connections } = useCloudConnections()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)

  const onedriveConnection = connections.find(c => c.id === "onedrive")

  useEffect(() => {
    if (onedriveConnection) {
      analyzeConnection(onedriveConnection)
    }
  }, [onedriveConnection])

  const analyzeConnection = (connection: any) => {
    const info = {
      connection: {
        id: connection.id,
        provider: connection.provider,
        connected: connection.connected,
        status: connection.status,
        accountEmail: connection.accountEmail,
        lastSync: connection.lastSync,
        error: connection.error
      },
      token: {
        hasToken: !!connection.accessToken,
        tokenLength: connection.accessToken?.length || 0,
        tokenPreview: connection.accessToken?.substring(0, 30) + '...',
        tokenEnd: connection.accessToken?.substring(-20) || 'N/A',
        expiresAt: connection.expiresAt,
        isExpired: connection.expiresAt ? Date.now() > connection.expiresAt : 'unknown',
        timeUntilExpiry: connection.expiresAt ? connection.expiresAt - Date.now() : 'unknown'
      },
      localStorage: {
        rawData: null as string | null,
        parsedData: null as any,
        error: null as string | null
      }
    }

    // Get raw localStorage data
    try {
      const rawData = localStorage.getItem("aqwa_cloud_connections")
      info.localStorage.rawData = rawData
      
      if (rawData) {
        const parsed = JSON.parse(rawData)
        info.localStorage.parsedData = parsed
        
        // Find OneDrive connection in parsed data
        const onedriveInStorage = parsed.find((c: any) => c.id === "onedrive")
        if (onedriveInStorage) {
          info.localStorage.parsedData = {
            ...onedriveInStorage,
            accessToken: onedriveInStorage.accessToken ? {
              length: onedriveInStorage.accessToken.length,
              preview: onedriveInStorage.accessToken.substring(0, 30) + '...',
              hasNewlines: onedriveInStorage.accessToken.includes('\n'),
              hasQuotes: onedriveInStorage.accessToken.includes('"'),
              hasBackslashes: onedriveInStorage.accessToken.includes('\\'),
              startsWithEy: onedriveInStorage.accessToken.startsWith('ey'),
              hasDots: onedriveInStorage.accessToken.includes('.'),
              endsWithDots: onedriveInStorage.accessToken.endsWith('...'),
              fullToken: onedriveInStorage.accessToken // Include full token for debugging
            } : null
          }
        }
      }
    } catch (error) {
      info.localStorage.error = error instanceof Error ? error.message : 'Unknown error'
    }

    setDebugInfo(info)
  }

  const testConnection = async () => {
    if (!onedriveConnection?.accessToken) {
      setTestResults({ error: "No access token available" })
      return
    }

    setIsTesting(true)
    setTestResults(null)

    try {
      // Create OneDrive service
      const onedriveService = createOneDriveService(onedriveConnection)
      if (!onedriveService) {
        throw new Error("Failed to create OneDrive service")
      }

      const results = {
        serviceCreation: { success: true, message: "OneDrive service created successfully" },
        apiAccess: null as any,
        tokenValidation: null as any,
        directTokenTest: null as any,
        profileFetch: null as any
      }

      // Test API access
      try {
        const apiAccessible = await onedriveService.testApiAccess()
        results.apiAccess = { success: apiAccessible, message: apiAccessible ? "API is accessible" : "API is not accessible" }
      } catch (error) {
        results.apiAccess = { success: false, message: error instanceof Error ? error.message : "Unknown error" }
      }

      // Test token validation
      try {
        const isValid = await onedriveService.validateToken()
        results.tokenValidation = { success: isValid, message: isValid ? "Token is valid" : "Token validation failed" }
      } catch (error) {
        results.tokenValidation = { success: false, message: error instanceof Error ? error.message : "Unknown error" }
      }

      // Test token directly
      try {
        const directTest = await onedriveService.testTokenDirectly()
        results.directTokenTest = { success: directTest, message: directTest ? "Direct token test passed" : "Direct token test failed" }
      } catch (error) {
        results.directTokenTest = { success: false, message: error instanceof Error ? error.message : "Unknown error" }
      }

      // Test profile fetch
      try {
        const profile = await onedriveService.getUserProfile()
        results.profileFetch = { success: true, message: `Profile fetched: ${profile.email}` }
      } catch (error) {
        results.profileFetch = { success: false, message: error instanceof Error ? error.message : "Unknown error" }
      }

      setTestResults(results)
    } catch (error) {
      setTestResults({ error: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setIsTesting(false)
    }
  }

  const clearConnection = () => {
    try {
      const savedConnections = localStorage.getItem("aqwa_cloud_connections")
      if (savedConnections) {
        const connections = JSON.parse(savedConnections)
        const updatedConnections = connections.map((conn: any) => {
          if (conn.id === "onedrive") {
            return {
              ...conn,
              connected: false,
              status: "disconnected",
              accessToken: undefined,
              refreshToken: undefined,
              expiresAt: undefined,
              accountEmail: undefined,
              lastSync: undefined,
              error: undefined
            }
          }
          return conn
        })
        localStorage.setItem("aqwa_cloud_connections", JSON.stringify(updatedConnections))
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to clear connection:", error)
    }
  }

  if (!onedriveConnection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/5 border-white/20">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">OneDrive Connection Not Found</h2>
              <p className="text-slate-400">No OneDrive connection found in the system.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">OneDrive Debug Page</h1>
          <p className="text-slate-400">Debug and troubleshoot OneDrive connection issues</p>
        </div>

        {/* Connection Status */}
        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className={`h-5 w-5 ${onedriveConnection.connected ? 'text-green-400' : 'text-red-400'}`} />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Status</p>
                <Badge variant={onedriveConnection.connected ? "default" : "destructive"}>
                  {onedriveConnection.status}
                </Badge>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Provider</p>
                <p className="text-white">{onedriveConnection.provider}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Account Email</p>
                <p className="text-white">{onedriveConnection.accountEmail || 'Not available'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Last Sync</p>
                <p className="text-white">{onedriveConnection.lastSync ? new Date(onedriveConnection.lastSync).toLocaleString() : 'Never'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token Information */}
        {debugInfo && (
          <Card className="bg-white/5 border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Token Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-slate-400 text-sm">Token Details</p>
                  <div className="bg-slate-800 p-3 rounded text-sm">
                    <pre className="text-white overflow-x-auto">
                      {JSON.stringify(debugInfo.token, null, 2)}
                    </pre>
                  </div>
                </div>
                
                <div>
                  <p className="text-slate-400 text-sm">LocalStorage Data</p>
                  <div className="bg-slate-800 p-3 rounded text-sm">
                    <pre className="text-white overflow-x-auto">
                      {JSON.stringify(debugInfo.localStorage, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Connection */}
        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Test Connection</CardTitle>
            <CardDescription>Test various aspects of the OneDrive connection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={testConnection} 
                disabled={isTesting || !onedriveConnection.connected}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              {testResults && (
                <div className="space-y-3">
                  {testResults.error ? (
                    <div className="bg-red-500/20 border border-red-500/50 rounded p-3">
                      <p className="text-red-400 text-sm">{testResults.error}</p>
                    </div>
                  ) : (
                    Object.entries(testResults).map(([key, result]: [string, any]) => (
                      <div key={key} className={`border rounded p-3 ${result.success ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'}`}>
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                          <span className="text-sm font-medium text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        </div>
                        <p className={`text-sm mt-1 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                          {result.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                onClick={clearConnection} 
                variant="destructive" 
                className="w-full"
              >
                Clear OneDrive Connection
              </Button>
              
              <Button 
                onClick={async () => {
                  if (!onedriveConnection?.accessToken) {
                    alert("No access token available")
                    return
                  }
                  
                  try {
                    console.log("🧪 Manual token test...")
                    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
                      method: 'GET',
                      headers: {
                        'Authorization': `Bearer ${onedriveConnection.accessToken}`,
                        'Content-Type': 'application/json'
                      }
                    })
                    
                    console.log("📡 Manual test response:", response.status, response.statusText)
                    
                    if (response.ok) {
                      const data = await response.json()
                      alert(`✅ Token works! Response: ${JSON.stringify(data, null, 2)}`)
                    } else {
                      const errorText = await response.text()
                      alert(`❌ Token failed: ${response.status} ${response.statusText}\n\n${errorText}`)
                    }
                  } catch (error) {
                    alert(`❌ Manual test error: ${error}`)
                  }
                }}
                variant="outline"
                className="w-full"
              >
                Manual Token Test
              </Button>
              
              <p className="text-slate-400 text-sm text-center">
                This will disconnect OneDrive and clear all stored tokens. You'll need to reconnect.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
