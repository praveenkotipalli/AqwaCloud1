"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCloudConnections } from "@/hooks/use-cloud-connections"
import { GoogleDriveExplorer } from "@/components/google-drive-explorer"
import { OneDriveExplorer } from "@/components/onedrive-explorer"
import { ConnectionManager } from "@/components/connection-manager"

export default function TestDrivePage() {
  const { connections } = useCloudConnections()
  const [selectedFiles, setSelectedFiles] = useState<any[]>([])
  const [selectedOneDriveFiles, setSelectedOneDriveFiles] = useState<any[]>([])

  const googleConnection = connections.find(c => c.id === "google-drive")
  const onedriveConnection = connections.find(c => c.id === "onedrive")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Cloud Storage Integration Test</h1>
          <p className="text-slate-300 text-lg">
            Test the real-time Google Drive and OneDrive file browsing and authentication
          </p>
        </div>

        {/* Connection Status */}
        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Google Drive</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Status:</span>
                    <Badge 
                      variant={googleConnection?.connected ? "default" : "secondary"}
                      className={googleConnection?.connected ? "bg-green-600" : ""}
                    >
                      {googleConnection?.status || "disconnected"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Connected:</span>
                    <span className={googleConnection?.connected ? "text-green-400" : "text-red-400"}>
                      {googleConnection?.connected ? "Yes" : "No"}
                    </span>
                  </div>
                  {googleConnection?.accountEmail && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Account:</span>
                      <span className="text-white">{googleConnection.accountEmail}</span>
                    </div>
                  )}
                  {googleConnection?.lastSync && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Last Sync:</span>
                      <span className="text-white">
                        {new Date(googleConnection.lastSync).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">OneDrive</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Status:</span>
                    <Badge 
                      variant={onedriveConnection?.connected ? "default" : "secondary"}
                      className={onedriveConnection?.connected ? "bg-green-600" : ""}
                    >
                      {onedriveConnection?.status || "disconnected"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Connected:</span>
                    <span className={onedriveConnection?.connected ? "text-green-400" : "text-red-400"}>
                      {onedriveConnection?.connected ? "Yes" : "No"}
                    </span>
                  </div>
                  {onedriveConnection?.accountEmail && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Account:</span>
                      <span className="text-white">{onedriveConnection.accountEmail}</span>
                    </div>
                  )}
                  {onedriveConnection?.lastSync && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Last Sync:</span>
                      <span className="text-white">
                        {new Date(onedriveConnection.lastSync).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Selected Files</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Google Drive:</span>
                    <Badge variant="secondary" className="text-white">
                      {selectedFiles.length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">OneDrive:</span>
                    <Badge variant="secondary" className="text-white">
                      {selectedOneDriveFiles.length}
                    </Badge>
                  </div>
                  {(selectedFiles.length > 0 || selectedOneDriveFiles.length > 0) && (
                    <div className="text-sm text-slate-300">
                      <div className="font-medium mb-1">Files:</div>
                      <div className="space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div key={`gdrive-${index}`} className="flex items-center gap-2">
                            <span className="text-blue-400">•</span>
                            <span className="truncate">{file.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {file.type}
                            </Badge>
                          </div>
                        ))}
                        {selectedOneDriveFiles.map((file, index) => (
                          <div key={`onedrive-${index}`} className="flex items-center gap-2">
                            <span className="text-green-400">•</span>
                            <span className="truncate">{file.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {file.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection Manager */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Manage Connections</h2>
          <ConnectionManager />
        </div>

        {/* Google Drive Explorer */}
        {googleConnection?.connected && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Google Drive Files</h2>
            <GoogleDriveExplorer
              connection={googleConnection}
              onFileSelect={setSelectedFiles}
              selectedFiles={selectedFiles}
            />
          </div>
        )}

        {/* OneDrive Explorer */}
        {onedriveConnection?.connected && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">OneDrive Files</h2>
            <OneDriveExplorer connectionId="onedrive" />
          </div>
        )}

        {/* Instructions */}
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-blue-400">How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-blue-300">
            <p>1. Click "Connect" on Google Drive or OneDrive in the Connection Manager</p>
            <p>2. You'll be redirected to the service's OAuth page</p>
            <p>3. Grant permissions to AqwaCloud</p>
            <p>4. You'll be redirected back and can browse your real cloud storage files</p>
            <p>5. Select files to see them appear in the Selected Files section</p>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-300 space-y-2">
              <div>
                <strong>Environment Variables:</strong>
                <div className="ml-4 space-y-1">
                  <div>GOOGLE_CLIENT_ID: {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Not Set"}</div>
                  <div>GOOGLE_CLIENT_SECRET: {process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Not Set"}</div>
                  <div>ONEDRIVE_CLIENT_ID: {process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID ? "✅ Set" : "❌ Not Set"}</div>
                  <div>ONEDRIVE_CLIENT_SECRET: {process.env.ONEDRIVE_CLIENT_SECRET ? "✅ Set" : "❌ Not Set"}</div>
                  <div>NEXTAUTH_URL: {process.env.NEXTAUTH_URL ? "✅ Set" : "❌ Not Set"}</div>
                </div>
              </div>
              <div>
                <strong>Connection Details:</strong>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong>Google Drive:</strong>
                    <pre className="bg-slate-900 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(googleConnection, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <strong>OneDrive:</strong>
                    <pre className="bg-slate-900 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(onedriveConnection, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
