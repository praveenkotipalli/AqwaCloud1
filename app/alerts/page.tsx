"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Cloud,
  ArrowLeft,
  Bell,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Mail,
  Smartphone,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

interface AlertRule {
  id: string
  name: string
  type: "usage" | "cost" | "transfer" | "storage"
  threshold: number
  unit: string
  enabled: boolean
  channels: ("email" | "sms" | "push")[]
  frequency: "immediate" | "daily" | "weekly"
  lastTriggered?: Date
}

interface AlertHistory {
  id: string
  alertId: string
  alertName: string
  message: string
  triggeredAt: Date
  acknowledged: boolean
  severity: "low" | "medium" | "high"
}

export default function AlertsPage() {
  const { isAuthenticated, user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("rules")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null)
  const [successMessage, setSuccessMessage] = useState("")

  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: "1",
      name: "High Usage Warning",
      type: "usage",
      threshold: 80,
      unit: "%",
      enabled: true,
      channels: ["email", "push"],
      frequency: "immediate",
      lastTriggered: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "2",
      name: "Cost Limit Alert",
      type: "cost",
      threshold: 25,
      unit: "$",
      enabled: true,
      channels: ["email", "sms"],
      frequency: "immediate",
    },
    {
      id: "3",
      name: "Transfer Failure Alert",
      type: "transfer",
      threshold: 3,
      unit: "failures",
      enabled: false,
      channels: ["email"],
      frequency: "daily",
    },
  ])

  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([
    {
      id: "1",
      alertId: "1",
      alertName: "High Usage Warning",
      message: "Your usage has reached 85% of your monthly limit",
      triggeredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      acknowledged: true,
      severity: "medium",
    },
    {
      id: "2",
      alertId: "2",
      alertName: "Cost Limit Alert",
      message: "Your monthly cost has exceeded $25.00",
      triggeredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      acknowledged: false,
      severity: "high",
    },
  ])

  const [newAlert, setNewAlert] = useState<Partial<AlertRule>>({
    name: "",
    type: "usage",
    threshold: 0,
    unit: "%",
    enabled: true,
    channels: ["email"],
    frequency: "immediate",
  })

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  const handleCreateAlert = () => {
    const alert: AlertRule = {
      id: Date.now().toString(),
      name: newAlert.name || "",
      type: newAlert.type || "usage",
      threshold: newAlert.threshold || 0,
      unit: newAlert.unit || "%",
      enabled: newAlert.enabled || true,
      channels: newAlert.channels || ["email"],
      frequency: newAlert.frequency || "immediate",
    }

    setAlertRules([...alertRules, alert])
    setShowCreateDialog(false)
    setNewAlert({
      name: "",
      type: "usage",
      threshold: 0,
      unit: "%",
      enabled: true,
      channels: ["email"],
      frequency: "immediate",
    })
    setSuccessMessage("Alert rule created successfully!")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const handleUpdateAlert = (updatedAlert: AlertRule) => {
    setAlertRules(alertRules.map((alert) => (alert.id === updatedAlert.id ? updatedAlert : alert)))
    setEditingAlert(null)
    setSuccessMessage("Alert rule updated successfully!")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const handleDeleteAlert = (alertId: string) => {
    setAlertRules(alertRules.filter((alert) => alert.id !== alertId))
    setSuccessMessage("Alert rule deleted successfully!")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const handleToggleAlert = (alertId: string) => {
    setAlertRules(alertRules.map((alert) => (alert.id === alertId ? { ...alert, enabled: !alert.enabled } : alert)))
  }

  const acknowledgeAlert = (historyId: string) => {
    setAlertHistory(alertHistory.map((alert) => (alert.id === historyId ? { ...alert, acknowledged: true } : alert)))
  }

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case "usage":
        return <TrendingUp className="h-4 w-4" />
      case "cost":
        return <DollarSign className="h-4 w-4" />
      case "transfer":
        return <AlertTriangle className="h-4 w-4" />
      case "storage":
        return <Cloud className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-3 w-3" />
      case "sms":
        return <Smartphone className="h-3 w-3" />
      case "push":
        return <Bell className="h-3 w-3" />
      default:
        return <Bell className="h-3 w-3" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600 bg-red-100"
      case "medium":
        return "text-yellow-600 bg-yellow-100"
      case "low":
        return "text-blue-600 bg-blue-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Cloud className="h-5 w-5 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading alerts...</p>
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
            <Badge variant="secondary">Alert Management</Badge>
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
              <h1 className="text-4xl font-bold mb-2">Alert Management</h1>
              <p className="text-xl text-muted-foreground">Configure alerts and monitor your account activity</p>
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
                onClick={() => setActiveTab("rules")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "rules" ? "bg-background shadow-sm" : "hover:bg-background/50"
                }`}
              >
                Alert Rules
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "history" ? "bg-background shadow-sm" : "hover:bg-background/50"
                }`}
              >
                Alert History
              </button>
            </div>
          </div>

          {/* Alert Rules Tab */}
          {activeTab === "rules" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Alert Rules</h2>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Alert
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Alert</DialogTitle>
                      <DialogDescription>Set up a new alert rule to monitor your account</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Alert Name</Label>
                        <Input
                          value={newAlert.name}
                          onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                          placeholder="Enter alert name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Alert Type</Label>
                        <Select
                          value={newAlert.type}
                          onValueChange={(value: "usage" | "cost" | "transfer" | "storage") =>
                            setNewAlert({ ...newAlert, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="usage">Usage Alert</SelectItem>
                            <SelectItem value="cost">Cost Alert</SelectItem>
                            <SelectItem value="transfer">Transfer Alert</SelectItem>
                            <SelectItem value="storage">Storage Alert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Threshold</Label>
                          <Input
                            type="number"
                            value={newAlert.threshold}
                            onChange={(e) =>
                              setNewAlert({ ...newAlert, threshold: Number.parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unit</Label>
                          <Select
                            value={newAlert.unit}
                            onValueChange={(value) => setNewAlert({ ...newAlert, unit: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="%">Percentage (%)</SelectItem>
                              <SelectItem value="$">Dollars ($)</SelectItem>
                              <SelectItem value="GB">Gigabytes (GB)</SelectItem>
                              <SelectItem value="failures">Failures</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Notification Channels</Label>
                        <div className="space-y-2">
                          {["email", "sms", "push"].map((channel) => (
                            <div key={channel} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={channel}
                                checked={newAlert.channels?.includes(channel as any)}
                                onChange={(e) => {
                                  const channels = newAlert.channels || []
                                  if (e.target.checked) {
                                    setNewAlert({ ...newAlert, channels: [...channels, channel as any] })
                                  } else {
                                    setNewAlert({ ...newAlert, channels: channels.filter((c) => c !== channel) })
                                  }
                                }}
                              />
                              <Label htmlFor={channel} className="capitalize">
                                {channel}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateAlert}>Create Alert</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {alertRules.map((alert) => (
                  <Card key={alert.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getAlertTypeIcon(alert.type)}
                            <div>
                              <h3 className="font-semibold">{alert.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Triggers when {alert.type} reaches {alert.threshold}
                                {alert.unit}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            {alert.channels.map((channel) => (
                              <div key={channel} className="p-1 bg-muted rounded">
                                {getChannelIcon(channel)}
                              </div>
                            ))}
                          </div>

                          <Badge variant={alert.enabled ? "secondary" : "outline"}>
                            {alert.enabled ? "Active" : "Inactive"}
                          </Badge>

                          <div className="flex items-center space-x-2">
                            <Switch checked={alert.enabled} onCheckedChange={() => handleToggleAlert(alert.id)} />
                            <Button variant="ghost" size="sm" onClick={() => setEditingAlert(alert)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAlert(alert.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {alert.lastTriggered && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-muted-foreground">
                            Last triggered: {alert.lastTriggered.toLocaleDateString()} at{" "}
                            {alert.lastTriggered.toLocaleTimeString()}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Alert History Tab */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Alert History</h2>

              <div className="space-y-4">
                {alertHistory.map((alert) => (
                  <Card key={alert.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{alert.alertName}</h3>
                            <p className="text-sm text-muted-foreground">{alert.message}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {alert.triggeredAt.toLocaleDateString()} at {alert.triggeredAt.toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge variant={alert.acknowledged ? "secondary" : "destructive"}>
                            {alert.acknowledged ? "Acknowledged" : "Unacknowledged"}
                          </Badge>
                          {!alert.acknowledged && (
                            <Button size="sm" onClick={() => acknowledgeAlert(alert.id)}>
                              Acknowledge
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
