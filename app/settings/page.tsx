"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
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
  User,
  Lock,
  Bell,
  Shield,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  Key,
  Eye,
  EyeOff,
  Camera,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { auth, db } from "@/lib/firebase"
import { GoogleAuthProvider, reauthenticateWithPopup, deleteUser as firebaseDeleteUser } from "firebase/auth"
import { collection, deleteDoc, doc, getDocs, limit as fsLimit, query } from "firebase/firestore"

export default function SettingsPage() {
  const { isAuthenticated, user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("profile")
  const [isEditing, setIsEditing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: "",
    company: "",
    location: "",
  })

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailTransferComplete: true,
    emailTransferFailed: true,
    emailUsageAlerts: true,
    pushNotifications: false,
    weeklyReports: true,
  })

  // Security settings
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    sessionTimeout: "24",
    loginAlerts: true,
  })

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        bio: "",
        company: "",
        location: "",
      })
    }
  }, [user])

  const handleSaveProfile = () => {
    // Simulate API call
    setTimeout(() => {
      setSuccessMessage("Profile updated successfully!")
      setIsEditing(false)
      setTimeout(() => setSuccessMessage(""), 3000)
    }, 1000)
  }

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage("New passwords don't match")
      setTimeout(() => setErrorMessage(""), 3000)
      return
    }

    // Simulate API call
    setTimeout(() => {
      setSuccessMessage("Password changed successfully!")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setTimeout(() => setSuccessMessage(""), 3000)
    }, 1000)
  }

  const handleExportData = () => {
    // Simulate data export
    const data = {
      profile: profileData,
      transfers: "Transfer history data...",
      usage: "Usage statistics...",
      exportDate: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "aqwacloud-data-export.json"
    a.click()
    URL.revokeObjectURL(url)
    setSuccessMessage("Data exported successfully!")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      setErrorMessage("No user is logged in")
      setTimeout(() => setErrorMessage(""), 3000)
      return
    }

    if (deleteConfirmText !== "DELETE") {
      setErrorMessage("Type DELETE to confirm")
      setTimeout(() => setErrorMessage(""), 3000)
      return
    }

    setDeleting(true)
    try {
      const userId = user.id

      // 1) Delete Firestore subcollections we use
      const deleteCollectionBatch = async (colPath: string, batchSize = 100) => {
        const colRef = collection(db, colPath)
        while (true) {
          const snap = await getDocs(query(colRef, fsLimit(batchSize)))
          if (snap.empty) break
          await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
          if (snap.size < batchSize) break
        }
      }

      // Known paths used by the app
      await deleteCollectionBatch(`users/${userId}/transferHistory`)
      await deleteCollectionBatch(`users/${userId}/metrics`)

      // Delete the root user document if it exists
      try {
        await deleteDoc(doc(db, "users", userId))
      } catch (e) {
        // ignore if missing
      }

      // 2) Delete Firebase Auth user
      if (auth.currentUser) {
        try {
          await firebaseDeleteUser(auth.currentUser)
        } catch (err: any) {
          if (err?.code === "auth/requires-recent-login") {
            // Reauthenticate quickly (no email confirmation)
            try {
              const provider = new GoogleAuthProvider()
              await reauthenticateWithPopup(auth.currentUser, provider)
              await firebaseDeleteUser(auth.currentUser)
            } catch (reauthErr) {
              throw reauthErr
            }
          } else {
            throw err
          }
        }
      }

      setShowDeleteDialog(false)
      setDeleteConfirmText("")
      setSuccessMessage("Your account and data have been permanently deleted")
      setTimeout(() => setSuccessMessage(""), 4000)
      // Navigate away after a brief moment
      setTimeout(() => router.replace("/"), 500)
    } catch (error: any) {
      console.error("Account deletion failed:", error)
      setErrorMessage(error?.message || "Failed to delete account")
      setTimeout(() => setErrorMessage(""), 4000)
    } finally {
      setDeleting(false)
    }
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "data", label: "Data & Privacy", icon: Download },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Cloud className="h-5 w-5 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading settings...</p>
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
            <Badge variant="secondary">Account Settings</Badge>
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-4xl font-bold mb-2">Account Settings</h1>
              <p className="text-xl text-muted-foreground">Manage your account preferences and security settings</p>
            </motion.div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <nav className="space-y-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                            activeTab === tab.id ? "bg-muted border-r-2 border-accent" : ""
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{tab.label}</span>
                        </button>
                      )
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <User className="h-5 w-5 mr-2" />
                          Profile Information
                        </CardTitle>
                        <CardDescription>Update your personal information and preferences</CardDescription>
                      </div>
                      <Button variant={isEditing ? "outline" : "default"} onClick={() => setIsEditing(!isEditing)}>
                        {isEditing ? "Cancel" : "Edit Profile"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Profile Picture */}
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 bg-gradient-to-r from-accent to-secondary rounded-full flex items-center justify-center">
                        <User className="h-10 w-10 text-white" />
                      </div>
                      {isEditing && (
                        <Button variant="outline" size="sm">
                          <Camera className="h-4 w-4 mr-2" />
                          Change Photo
                        </Button>
                      )}
                    </div>

                    <Separator />

                    {/* Profile Form */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          value={profileData.company}
                          onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Your company name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={profileData.location}
                          onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                          disabled={!isEditing}
                          placeholder="City, Country"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={profileData.bio}
                          onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Tell us about yourself..."
                          rows={3}
                        />
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveProfile}>Save Changes</Button>
                      </div>
                    )}

                    <Separator />

                    {/* Account Info */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Account Information</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Plan</span>
                          <Badge variant="secondary">Free Platform</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Member since</span>
                          <span>January 2024</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account ID</span>
                          <span className="font-mono text-sm">usr_123456789</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  {/* Change Password */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Lock className="h-5 w-5 mr-2" />
                        Change Password
                      </CardTitle>
                      <CardDescription>Update your account password</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPassword ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleChangePassword}>Update Password</Button>
                    </CardContent>
                  </Card>

                  {/* Two-Factor Authentication */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="h-5 w-5 mr-2" />
                        Two-Factor Authentication
                      </CardTitle>
                      <CardDescription>Add an extra layer of security to your account</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Enable 2FA</div>
                          <div className="text-sm text-muted-foreground">
                            Use an authenticator app to generate verification codes
                          </div>
                        </div>
                        <Switch
                          checked={security.twoFactorEnabled}
                          onCheckedChange={(checked) => setSecurity({ ...security, twoFactorEnabled: checked })}
                        />
                      </div>
                      {security.twoFactorEnabled && (
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Key className="h-4 w-4" />
                            <span className="font-medium">Backup Codes</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Save these backup codes in a safe place. You can use them to access your account if you lose
                            your authenticator device.
                          </p>
                          <Button variant="outline" size="sm">
                            Generate New Codes
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Security Preferences */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Security Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Login Alerts</div>
                          <div className="text-sm text-muted-foreground">Get notified of new login attempts</div>
                        </div>
                        <Switch
                          checked={security.loginAlerts}
                          onCheckedChange={(checked) => setSecurity({ ...security, loginAlerts: checked })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bell className="h-5 w-5 mr-2" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>Choose how you want to be notified about your account activity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-medium">Email Notifications</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Transfer Completed</div>
                            <div className="text-sm text-muted-foreground">
                              When your file transfers complete successfully
                            </div>
                          </div>
                          <Switch
                            checked={notifications.emailTransferComplete}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, emailTransferComplete: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Transfer Failed</div>
                            <div className="text-sm text-muted-foreground">When your file transfers fail</div>
                          </div>
                          <Switch
                            checked={notifications.emailTransferFailed}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, emailTransferFailed: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Usage Alerts</div>
                            <div className="text-sm text-muted-foreground">When you approach your usage limits</div>
                          </div>
                          <Switch
                            checked={notifications.emailUsageAlerts}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, emailUsageAlerts: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Weekly Reports</div>
                            <div className="text-sm text-muted-foreground">Summary of your weekly activity</div>
                          </div>
                          <Switch
                            checked={notifications.weeklyReports}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, weeklyReports: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-medium">Push Notifications</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Browser Notifications</div>
                          <div className="text-sm text-muted-foreground">Real-time notifications in your browser</div>
                        </div>
                        <Switch
                          checked={notifications.pushNotifications}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, pushNotifications: checked })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data & Privacy Tab */}
              {activeTab === "data" && (
                <div className="space-y-6">
                  {/* Data Export */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Download className="h-5 w-5 mr-2" />
                        Export Your Data
                      </CardTitle>
                      <CardDescription>Download a copy of your account data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        You can request a copy of your data including your profile information, transfer history, and
                        usage statistics. The export will be provided in JSON format.
                      </p>
                      <Button onClick={handleExportData}>
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Delete Account */}
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="flex items-center text-red-600">
                        <Trash2 className="h-5 w-5 mr-2" />
                        Delete Account
                      </CardTitle>
                      <CardDescription>Permanently delete your account and all associated data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <strong>Warning:</strong> This action cannot be undone. All your data, including transfer
                          history and account information, will be permanently deleted.
                        </AlertDescription>
                      </Alert>

                      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <DialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Are you absolutely sure?</DialogTitle>
                            <DialogDescription>
                              This action cannot be undone. This will permanently delete your account and remove your
                              data from our servers.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              To confirm deletion, please type <strong>DELETE</strong> in the field below:
                            </p>
                            <Input 
                              placeholder="Type DELETE to confirm" 
                              value={deleteConfirmText}
                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                Cancel
                              </Button>
                              <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
                                {deleting ? "Deleting..." : "Delete Account"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
