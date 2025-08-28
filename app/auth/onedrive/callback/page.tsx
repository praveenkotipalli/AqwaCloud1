"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

export default function OneDriveCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code")
        const state = searchParams.get("state")
        const error = searchParams.get("error")
        const errorDescription = searchParams.get("error_description")

        // Check for OAuth errors
        if (error) {
          console.error("OneDrive OAuth error:", error, errorDescription)
          setError(errorDescription || error)
          setStatus("error")
          return
        }

        // Validate required parameters
        if (!code) {
          setError("Authorization code not received")
          setStatus("error")
          return
        }

        // Validate state parameter for security
        const savedState = sessionStorage.getItem("onedrive_oauth_state")
        if (state !== savedState) {
          setError("Invalid state parameter")
          setStatus("error")
          return
        }

        // Exchange authorization code for access token
        const tokenResponse = await fetch("/api/auth/onedrive/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        })

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json()
          throw new Error(errorData.error || "Failed to exchange authorization code")
        }

        const tokenData = await tokenResponse.json()

        console.log(`📥 Token data received:`, {
          hasAccessToken: !!tokenData.access_token,
          accessTokenLength: tokenData.access_token?.length || 0,
          accessTokenPreview: tokenData.access_token?.substring(0, 20) + '...',
          hasRefreshToken: !!tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope
        })

        // Validate token format
        if (!tokenData.access_token || typeof tokenData.access_token !== 'string') {
          throw new Error('Invalid access token received from Microsoft')
        }
        
        // Clean the token before storing
        const cleanToken = tokenData.access_token.trim()
        if (cleanToken.length < 100) {
          console.warn(`⚠️ Access token seems too short (${cleanToken.length} chars)`)
        }
        
        if (!cleanToken.startsWith('ey')) {
          console.warn(`⚠️ Access token does not start with expected JWT header`)
        }
        
        // Additional token validation
        console.log(`🔍 Token validation:`, {
          originalLength: tokenData.access_token.length,
          cleanedLength: cleanToken.length,
          wasCleaned: tokenData.access_token !== cleanToken,
          startsWithEy: cleanToken.startsWith('ey'),
          hasDots: cleanToken.includes('.'),
          endsWithDots: cleanToken.endsWith('...'),
          containsNewlines: cleanToken.includes('\n'),
          containsQuotes: cleanToken.includes('"'),
          containsBackslashes: cleanToken.includes('\\')
        })
        
        // Verify token format
        if (cleanToken.length < 100) {
          console.error(`❌ Token is too short - this might indicate corruption`)
        }
        
        if (!cleanToken.startsWith('ey')) {
          console.error(`❌ Token doesn't start with expected JWT header`)
        }
        
        if (cleanToken.includes('undefined') || cleanToken.includes('null')) {
          console.error(`❌ Token contains undefined/null values`)
        }

        // Update connections in localStorage
        const savedConnections = localStorage.getItem("aqwa_cloud_connections")
        if (savedConnections) {
          const connections = JSON.parse(savedConnections)
          const updatedConnections = connections.map((conn: any) => {
            if (conn.id === "onedrive") {
              return {
                ...conn,
                connected: true,
                status: "connected",
                accessToken: cleanToken,
                refreshToken: tokenData.refresh_token,
                expiresAt: Date.now() + (tokenData.expires_in * 1000),
                accountEmail: tokenData.accountEmail,
                lastSync: new Date().toISOString(),
                error: undefined
              }
            }
            return conn
          })

          localStorage.setItem("aqwa_cloud_connections", JSON.stringify(updatedConnections))
          
          // Test JSON serialization/deserialization
          const testSerialization = JSON.stringify(updatedConnections)
          const testDeserialization = JSON.parse(testSerialization)
          const testOneDrive = testDeserialization.find((c: any) => c.id === "onedrive")
          
          console.log(`🧪 JSON serialization test:`, {
            originalToken: cleanToken.substring(0, 20) + '...',
            serializedLength: testSerialization.length,
            deserializedToken: testOneDrive?.accessToken?.substring(0, 20) + '...',
            tokenSurvived: testOneDrive?.accessToken === cleanToken
          })
          
          // Verify what was stored
          const storedConnections = localStorage.getItem("aqwa_cloud_connections")
          console.log(`💾 Stored connections in localStorage:`, storedConnections)
          
          // Check for any obvious issues in the raw data
          if (storedConnections) {
            const rawOneDriveMatch = storedConnections.match(/"accessToken":"([^"]+)"/)
            if (rawOneDriveMatch) {
              const rawToken = rawOneDriveMatch[1]
              console.log(`🔍 Raw token in localStorage:`, {
                length: rawToken.length,
                preview: rawToken.substring(0, 30) + '...',
                hasNewlines: rawToken.includes('\n'),
                hasQuotes: rawToken.includes('"'),
                hasBackslashes: rawToken.includes('\\')
              })
            }
          }
          
          const parsedStored = JSON.parse(storedConnections!)
          const onedriveStored = parsedStored.find((c: any) => c.id === "onedrive")
          console.log(`🔍 OneDrive connection stored:`, {
            id: onedriveStored?.id,
            connected: onedriveStored?.connected,
            hasAccessToken: !!onedriveStored?.accessToken,
            accessTokenLength: onedriveStored?.accessToken?.length || 0,
            accessTokenPreview: onedriveStored?.accessToken?.substring(0, 20) + '...',
            expiresAt: onedriveStored?.expiresAt,
            accountEmail: onedriveStored?.accountEmail
          })
          
          // Verify the stored token matches the original
          if (onedriveStored?.accessToken) {
            const storedToken = onedriveStored.accessToken
            const tokenMatches = storedToken === cleanToken
            console.log(`🔍 Token storage verification:`, {
              originalLength: cleanToken.length,
              storedLength: storedToken.length,
              matches: tokenMatches,
              storedStartsWithEy: storedToken.startsWith('ey'),
              storedHasDots: storedToken.includes('.'),
              storedEndsWithDots: storedToken.endsWith('...'),
              storedContainsNewlines: storedToken.includes('\n'),
              storedContainsQuotes: storedToken.includes('"'),
              storedContainsBackslashes: storedToken.includes('\\')
            })
            
            if (!tokenMatches) {
              console.error(`❌ Stored token doesn't match original token!`)
              console.error(`   Original: ${cleanToken.substring(0, 30)}...`)
              console.error(`   Stored:   ${storedToken.substring(0, 30)}...`)
            }
          }
        }

        // Clean up session storage
        sessionStorage.removeItem("onedrive_oauth_state")

        setStatus("success")

        // Redirect back to connections page after a short delay
        setTimeout(() => {
          router.push("/connections")
        }, 2000)

      } catch (err) {
        console.error("Failed to handle OneDrive callback:", err)
        setError(err instanceof Error ? err.message : "Unknown error occurred")
        setStatus("error")
      }
    }

    handleCallback()
  }, [searchParams, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Connecting to OneDrive</CardTitle>
            <CardDescription>
              Please wait while we complete your OneDrive connection...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-sm text-gray-600">Processing authorization...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <XCircle className="h-6 w-6" />
              Connection Failed
            </CardTitle>
            <CardDescription>
              We couldn't complete your OneDrive connection
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button 
                onClick={() => router.push("/connections")}
                className="w-full"
              >
                Back to Connections
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            Connected Successfully!
          </CardTitle>
          <CardDescription>
            Your OneDrive account has been connected
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Redirecting you back to the connections page...
          </p>
          <Button 
            onClick={() => router.push("/connections")}
            className="w-full"
          >
            Go to Connections
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
