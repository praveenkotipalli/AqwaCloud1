"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Cloud,
  ArrowLeft,
  Plus,
  Settings,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Activity,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

interface CloudConnection {
  id: string
  name: string
  provider: string
  icon: string
  connected: boolean
  status: "healthy" | "warning" | "error" | "syncing"
  lastSync: Date | null
  syncFrequency: "realtime" | "hourly" | "daily" | "manual"
  permissions: string[]
  storageUsed?: string
  totalStorage?: string
  accountEmail?: string
  apiKey?: string
  settings: {
    autoSync: boolean
    notifications: boolean
    bandwidth: "unlimited" | "limited"
    encryption: boolean
  }
}

interface ConnectionLog {
  id: string
  connectionId: string
  action: "connected" | "disconnected" | "sync" | "error"
  message: string
  timestamp: Date
  status: "success" | "warning" | "error"
}

export default function ConnectionsPage() {
  const { isAuthenticated, user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("connections")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingConnection, setEditingConnection] = useState<CloudConnection | null>(null)
  const [successMessage, setSuccessMessage] = useState("")

  const [connections, setConnections] = useState<CloudConnection[]>([
    {
      id: "gdrive",
      name: "Google Drive",
      provider: "Google",
      icon: "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png",
      connected: true,
      status: "healthy",
      lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
      syncFrequency: "hourly",
      permissions: ["read", "write", "delete"],
      storageUsed: "12.4 GB",
      totalStorage: "15 GB",
      accountEmail: "user@gmail.com",
      settings: {
        autoSync: true,
        notifications: true,
        bandwidth: "unlimited",
        encryption: true,
      },
    },
    {
      id: "onedrive",
      name: "OneDrive",
      provider: "Microsoft",
      icon: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg",
      connected: true,
      status: "warning",
      lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000),
      syncFrequency: "daily",
      permissions: ["read", "write"],
      storageUsed: "8.2 GB",
      totalStorage: "5 GB",
      accountEmail: "user@outlook.com",
      settings: {
        autoSync: false,
        notifications: true,
        bandwidth: "limited",
        encryption: true,
      },
    },
    {
      id: "dropbox",
      name: "Dropbox",
      provider: "Dropbox",
      icon: "https://cfl.dropboxstatic.com/static/images/logo_catalog/dropbox_logo_glyph_blue_m1.svg",
      connected: false,
      status: "error",
      lastSync: null,
      syncFrequency: "manual",
      permissions: [],
      settings: {
        autoSync: false,
        notifications: false,
        bandwidth: "unlimited",
        encryption: false,
      },
    },
    {
      id: "aws",
      name: "AWS S3",
      provider: "Amazon",
      icon: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Amazon-S3-Logo.svg",
      connected: true,
      status: "healthy",
      lastSync: new Date(Date.now() - 30 * 60 * 1000),
      syncFrequency: "realtime",
      permissions: ["read", "write", "delete", "admin"],
      storageUsed: "45.8 GB",
      totalStorage: "Unlimited",
      settings: {
        autoSync: true,
        notifications: true,
        bandwidth: "unlimited",
        encryption: true,
      },
    },
  ])

  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([
    {
      id: "1",
      connectionId: "gdrive",
      action: "sync",
      message: "Successfully synced 24 files",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: "success",
    },
    {
      id: "2",
      connectionId: "onedrive",
      action: "error",
      message: "Sync failed: Storage quota exceeded",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: "error",
    },
    {
      id: "3",
      connectionId: "aws",
      action: "connected",
      message: "Connection established successfully",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: "success",
    },
  ])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  const handleConnect = (connectionId: string) => {
    setConnections(
      connections.map((conn) =>
        conn.id === connectionId ? { ...conn, connected: true, status: "healthy", lastSync: new Date() } : conn,
      ),
    )
    setSuccessMessage("Connection established successfully!")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const handleDisconnect = (connectionId: string) => {
    setConnections(
      connections.map((conn) =>
        conn.id === connectionId ? { ...conn, connected: false, status: "error", lastSync: null } : conn,
      ),
    )
    setSuccessMessage("Connection disconnected successfully!")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const handleSync = (connectionId: string) => {
    setConnections(
      connections.map((conn) =>
        conn.id === connectionId ? { ...conn, status: "syncing", lastSync: new Date() } : conn,
      ),
    )

    setTimeout(() => {
      setConnections(connections.map((conn) => (conn.id === connectionId ? { ...conn, status: "healthy" } : conn)))
      setSuccessMessage("Sync completed successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    }, 2000)
  }

  const handleUpdateSettings = (connectionId: string, settings: any) => {
    setConnections(
      connections.map((conn) =>
        conn.id === connectionId ? { ...conn, settings: { ...conn.settings, ...settings } } : conn,
      ),
    )
    setSuccessMessage("Settings updated successfully!")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "syncing":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4" />
      case "warning":
        return <AlertCircle className="h-4 w-4" />
      case "error":
        return <AlertCircle className="h-4 w-4" />
      case "syncing":
        return <RefreshCw className="h-4 w-4 animate-spin" />
      default:
        return <Cloud className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Cloud className="h-5 w-5 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading connections...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center">
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AqwaCloud</span>
          </Link>

          <div className="flex items-center space-x-4">
            <Badge variant="secondary">Connection Management</Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-4xl font-bold mb-2">Connection Management</h1>
              <p className="text-xl text-muted-foreground">Manage your cloud service connections and sync settings</p>
            </motion.div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab("connections")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "connections" ? "bg-background shadow-sm" : "hover:bg-background/50"
                }`}
              >
                Connections
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "logs" ? "bg-background shadow-sm" : "hover:bg-background/50"
                }`}
              >
                Activity Logs
              </button>
            </div>
          </div>

          {/* Connections Tab */}
          {activeTab === "connections" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Cloud Connections</h2>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Connection
                </Button>
              </div>

              <div className="bg-card rounded-lg border">
                <div className="divide-y divide-border">
                  {connections.map((connection, index) => (
                    <motion.div
                      key={connection.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-6 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-6">
                        {/* Large Thumbnail */}
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-lg bg-background border-2 border-border flex items-center justify-center overflow-hidden">
                            <img
                              src={connection.icon || "/placeholder.svg"}
                              alt={connection.name}
                              className="w-12 h-12 object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = "none"
                                target.nextElementSibling?.classList.remove("hidden")
                              }}
                            />
                            <Cloud className="w-8 h-8 text-muted-foreground hidden" />
                          </div>
                        </div>

                        {/* Connection Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold truncate">{connection.name}</h3>
                            <Badge className={getStatusColor(connection.status)}>
                              {getStatusIcon(connection.status)}
                              <span className="ml-1 capitalize">{connection.status}</span>
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                            <span>{connection.provider}</span>
                            {connection.accountEmail && (
                              <>
                                <span>•</span>
                                <span className="truncate">{connection.accountEmail}</span>
                              </>
                            )}
                          </div>

                          {connection.connected && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-foreground">Last Sync: </span>
                                <span className="text-muted-foreground">
                                  {connection.lastSync ? connection.lastSync.toLocaleString() : "Never"}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-foreground">Storage: </span>
                                <span className="text-muted-foreground">
                                  {connection.storageUsed} / {connection.totalStorage}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-foreground">Frequency: </span>
                                <span className="text-muted-foreground capitalize">{connection.syncFrequency}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex-shrink-0">
                          <div className="flex items-center space-x-2">
                            {connection.connected ? (
                              <>
                                <Button variant="outline" size="sm" onClick={() => handleSync(connection.id)}>
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Sync
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditingConnection(connection)}>
                                  <Settings className="h-4 w-4 mr-1" />
                                  Settings
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDisconnect(connection.id)}>
                                  Disconnect
                                </Button>
                              </>
                            ) : (
                              <Button onClick={() => handleConnect(connection.id)}>
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Activity Logs Tab */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Activity Logs</h2>

              <div className="space-y-4">
                {connectionLogs.map((log) => {
                  const connection = connections.find((c) => c.id === log.connectionId)
                  return (
                    <Card key={log.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-full ${getStatusColor(log.status)}`}>
                              <Activity className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <img
                                  src={connection?.icon || "/placeholder.svg"}
                                  alt={connection?.name}
                                  className="w-5 h-5"
                                />
                                <span className="font-medium">{connection?.name}</span>
                                <Badge variant="outline" className="capitalize">
                                  {log.action}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{log.message}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{log.timestamp.toLocaleDateString()}</p>
                            <p className="text-xs text-muted-foreground">{log.timestamp.toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Settings Dialog */}
          {editingConnection && (
            <Dialog open={!!editingConnection} onOpenChange={() => setEditingConnection(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Connection Settings</DialogTitle>
                  <DialogDescription>Configure settings for {editingConnection.name}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Sync</Label>
                      <p className="text-sm text-muted-foreground">Automatically sync files</p>
                    </div>
                    <Switch
                      checked={editingConnection.settings.autoSync}
                      onCheckedChange={(checked) => handleUpdateSettings(editingConnection.id, { autoSync: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notifications</Label>
                      <p className="text-sm text-muted-foreground">Get sync notifications</p>
                    </div>
                    <Switch
                      checked={editingConnection.settings.notifications}
                      onCheckedChange={(checked) =>
                        handleUpdateSettings(editingConnection.id, { notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Encryption</Label>
                      <p className="text-sm text-muted-foreground">Encrypt data in transit</p>
                    </div>
                    <Switch
                      checked={editingConnection.settings.encryption}
                      onCheckedChange={(checked) => handleUpdateSettings(editingConnection.id, { encryption: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bandwidth Limit</Label>
                    <Select
                      value={editingConnection.settings.bandwidth}
                      onValueChange={(value: "unlimited" | "limited") =>
                        handleUpdateSettings(editingConnection.id, { bandwidth: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setEditingConnection(null)}>Close</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  )
}
