"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code")
        const state = searchParams.get("state")
        const error = searchParams.get("error")

        // Check for OAuth errors
        if (error) {
          setStatus("error")
          setMessage(`OAuth error: ${error}`)
          return
        }

        // Validate state parameter
        const savedState = sessionStorage.getItem("google_oauth_state")
        if (!state || !savedState || state !== savedState) {
          setStatus("error")
          setMessage("Invalid state parameter. Please try again.")
          return
        }

        // Clear the state from session storage
        sessionStorage.removeItem("google_oauth_state")

        if (!code) {
          setStatus("error")
          setMessage("No authorization code received from Google.")
          return
        }

        // Exchange code for access token
        const tokenResponse = await fetch("/api/auth/google/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        })

        if (!tokenResponse.ok) {
          let errorMsg = "Failed to exchange code for token"
          try {
            const errorData = await tokenResponse.json()
            if (errorData?.error) {
              errorMsg = errorData.error
              if (errorData.redirect_uri) {
                errorMsg += ` (redirect_uri used: ${errorData.redirect_uri})`
              }
            }
          } catch {}
          throw new Error(errorMsg)
        }

        const tokenData = await tokenResponse.json()

        // Update the connection in localStorage
        const savedConnections = localStorage.getItem("aqwa_cloud_connections")
        if (savedConnections) {
          const connections = JSON.parse(savedConnections)
          const updatedConnections = connections.map((conn: any) => {
            if (conn.id === "google-drive") {
              return {
                ...conn,
                connected: true,
                status: "connected",
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: Date.now() + (tokenData.expires_in * 1000),
                accountEmail: tokenData.email,
                lastSync: new Date().toISOString(),
                error: undefined
              }
            }
            return conn
          })

          localStorage.setItem("aqwa_cloud_connections", JSON.stringify(updatedConnections))
        }

        setStatus("success")
        setMessage("Successfully connected to Google Drive!")

        // Redirect to transfer page after a short delay
        setTimeout(() => {
          router.push("/transfer")
        }, 2000)

      } catch (error) {
        console.error("Google OAuth callback error:", error)
        setStatus("error")
        setMessage(error instanceof Error ? error.message : "An unexpected error occurred")
      }
    }

    handleCallback()
  }, [searchParams, router])

  const handleRetry = () => {
    router.push("/transfer")
  }

  const handleGoHome = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 text-white">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === "loading" && <Loader2 className="h-6 w-6 animate-spin" />}
            {status === "success" && <CheckCircle className="h-6 w-6 text-green-400" />}
            {status === "error" && <XCircle className="h-6 w-6 text-red-400" />}
            Google Drive Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            {status === "loading" && (
              <p className="text-slate-300">Connecting to Google Drive...</p>
            )}
            {status === "success" && (
              <p className="text-green-300">{message}</p>
            )}
            {status === "error" && (
              <p className="text-red-300">{message}</p>
            )}
          </div>

          {status === "success" && (
            <div className="text-center text-sm text-slate-400">
              Redirecting to transfer page...
            </div>
          )}

          {status === "error" && (
            <div className="flex gap-2">
              <Button onClick={handleRetry} variant="outline" className="flex-1">
                Try Again
              </Button>
              <Button onClick={handleGoHome} variant="outline" className="flex-1">
                Go Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 text-white">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-slate-300">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  )
}
