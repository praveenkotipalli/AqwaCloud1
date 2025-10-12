import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { code, refresh_token: refreshToken } = await request.json()

    if (!code && !refreshToken) {
      return NextResponse.json(
        { error: "Authorization code or refresh_token is required" },
        { status: 400 }
      )
    }

    console.log(`🔄 OneDrive token exchange initiated`, {
      hasCode: !!code,
      hasRefreshToken: !!refreshToken,
      codePreview: code ? code.substring(0, 20) + '...' : undefined
    })
    // Compute redirect URI using envs with robust fallbacks
    const envRedirect = (process.env.ONEDRIVE_REDIRECT_URI || process.env.NEXT_PUBLIC_ONEDRIVE_REDIRECT_URI)?.replace(/\/$/, "")
    const origin = envRedirect || process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || process.env.NEXTAUTH_URL?.replace(/\/$/, "") || request.nextUrl.origin
    const redirectUri = envRedirect && envRedirect.includes('/auth/onedrive/callback')
      ? envRedirect
      : `${origin}/auth/onedrive/callback`
    console.log(`🔧 OneDrive token endpoint configuration:`, {
      hasClientId: !!process.env.ONEDRIVE_CLIENT_ID,
      hasClientSecret: !!process.env.ONEDRIVE_CLIENT_SECRET,
      origin,
      redirectUri
    })

    // Exchange authorization code or refresh token for access token
    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(
        code
          ? {
              client_id: process.env.ONEDRIVE_CLIENT_ID!,
              client_secret: process.env.ONEDRIVE_CLIENT_SECRET!,
              code,
              grant_type: "authorization_code",
              redirect_uri: redirectUri,
            }
          : {
              client_id: process.env.ONEDRIVE_CLIENT_ID!,
              client_secret: process.env.ONEDRIVE_CLIENT_SECRET!,
              refresh_token: refreshToken!,
              grant_type: "refresh_token",
              redirect_uri: redirectUri,
            }
      ),
    })

    console.log(`📡 Token exchange response status:`, tokenResponse.status, tokenResponse.statusText)

    if (!tokenResponse.ok) {
      const raw = await tokenResponse.text()
      let parsed: any = undefined
      try { parsed = JSON.parse(raw) } catch {}
      const errorMessage = parsed?.error_description || parsed?.error || raw || (code ? "Failed to exchange authorization code" : "Failed to refresh access token")
      console.error("OneDrive token exchange/refresh failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        redirectUri,
        error: parsed || raw
      })
      return NextResponse.json(
        { 
          error: errorMessage,
          redirect_uri: redirectUri,
          upstreamStatus: tokenResponse.status,
          upstreamBody: parsed || raw
        },
        { status: 400 }
      )
    }

    const tokenData = await tokenResponse.json()
    console.log(`✅ Token exchange successful:`, {
      hasAccessToken: !!tokenData.access_token,
      accessTokenLength: tokenData.access_token?.length || 0,
      accessTokenPreview: tokenData.access_token?.substring(0, 20) + '...',
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope
    })

    // Get user profile information using the access token (only when exchanging code)
    let accountEmail = ""
    if (code) {
      try {
        console.log(`🔍 Fetching user profile with access token...`)
        const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        })

        console.log(`📡 Profile response status:`, profileResponse.status, profileResponse.statusText)

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          accountEmail = profileData.mail || profileData.userPrincipalName || ""
          console.log(`✅ Profile fetch successful, email:`, accountEmail)
        } else {
          const errorText = await profileResponse.text()
          console.error(`❌ Profile fetch failed:`, errorText)
        }
      } catch (profileError) {
        console.warn("Failed to get user profile:", profileError)
        // Continue without profile info
      }
    }

    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refreshToken, // Microsoft may omit refresh_token on refresh
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
      accountEmail,
    })

  } catch (error) {
    console.error("OneDrive token exchange error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
