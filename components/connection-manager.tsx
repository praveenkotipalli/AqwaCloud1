"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  HardDrive,
  Cloud,
  AlertCircle
} from "lucide-react"
import { CloudConnection, useCloudConnections } from "@/hooks/use-cloud-connections"

export function ConnectionManager() {
  const { 
    connections, 
    connectGoogleDrive, 
    connectOneDrive, 
    disconnectService,
    resetConnections 
  } = useCloudConnections()

  const [isConnecting, setIsConnecting] = useState<string | null>(null)

  const handleConnect = async (serviceId: string) => {
    setIsConnecting(serviceId)
    
    try {
      if (serviceId === "google-drive") {
        await connectGoogleDrive()
      } else if (serviceId === "onedrive") {
        await connectOneDrive()
      }
    } catch (error) {
      console.error(`Failed to connect to ${serviceId}:`, error)
    } finally {
      setIsConnecting(null)
    }
  }

  const handleDisconnect = (serviceId: string) => {
    disconnectService(serviceId)
  }

  const getStatusIcon = (status: CloudConnection["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case "connecting":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-400" />
      default:
        return <Cloud className="h-5 w-5 text-slate-400" />
    }
  }

  const getStatusColor = (status: CloudConnection["status"]) => {
    switch (status) {
      case "connected":
        return "text-green-400"
      case "connecting":
        return "text-blue-400"
      case "error":
        return "text-red-400"
      default:
        return "text-slate-400"
    }
  }

  const getConnectionButton = (connection: CloudConnection) => {
    if (connection.connected) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDisconnect(connection.id)}
          className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs sm:text-sm"
        >
          Disconnect
        </Button>
      )
    }

    return (
      <Button
        onClick={() => handleConnect(connection.id)}
        disabled={isConnecting === connection.id}
        variant="outline"
        size="sm"
        className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm"
      >
        {isConnecting === connection.id ? (
          <>
            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Connecting...</span>
            <span className="sm:hidden">Connecting</span>
          </>
        ) : (
          "Connect"
        )}
      </Button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Cloud Connections</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetConnections}
          className="text-slate-400 hover:text-white"
        >
          Reset All
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {connections.map((connection) => (
          <Card key={connection.id} className="bg-white/5 border-white/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
                  <img 
                    src={connection.icon} 
                    alt={connection.name} 
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded"
                  />
                  {connection.name}
                </CardTitle>
                {getStatusIcon(connection.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Status and Connection Info */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className={getStatusColor(connection.status)}>
                  {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                </span>
                {connection.accountEmail && (
                  <Badge variant="secondary" className="text-xs">
                    {connection.accountEmail}
                  </Badge>
                )}
              </div>

              {/* Error Message */}
              {connection.error && (
                <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs sm:text-sm">
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                  <span className="text-red-400 text-xs">{connection.error}</span>
                </div>
              )}

              {/* Storage Info */}
              {connection.storageInfo && (
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span>{connection.storageInfo.used}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available:</span>
                    <span>{connection.storageInfo.available}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full" 
                      style={{ 
                        width: `${(parseFloat(connection.storageInfo.used) / parseFloat(connection.storageInfo.total)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Last Sync */}
              {connection.lastSync && (
                <div className="text-xs text-slate-400">
                  Last sync: {new Date(connection.lastSync).toLocaleString()}
                </div>
              )}

              {/* Connection Button */}
              <div className="flex justify-end">
                {getConnectionButton(connection)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connection Instructions */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-400 text-lg">How to Connect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-300">
          <p>1. Click "Connect" on the service you want to use</p>
          <p>2. You'll be redirected to the service's login page</p>
          <p>3. Grant the necessary permissions to AqwaCloud</p>
          <p>4. You'll be redirected back and can start transferring files</p>
        </CardContent>
      </Card>
    </div>
  )
}
