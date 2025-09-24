import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code is required" },
        { status: 400 }
      )
    }

    // Determine redirect URI reliably: prefer explicit env, then public app URL, then request origin
    const envRedirect = process.env.GOOGLE_REDIRECT_URI?.replace(/\/$/, "")
    const origin =
      envRedirect ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
      request.nextUrl.origin
    const redirectUri = envRedirect && envRedirect.includes("/auth/google/callback")
      ? envRedirect
      : `${origin}/auth/google/callback`

    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const raw = await tokenResponse.text()
      let parsed: any = undefined
      try { parsed = JSON.parse(raw) } catch {}
      const errorMessage = parsed?.error_description || parsed?.error || raw || "Failed to exchange authorization code for token"
      console.error("Google token exchange error:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        redirectUri,
        error: parsed || raw,
      })
      return NextResponse.json(
        { error: errorMessage, redirect_uri: redirectUri },
        { status: 400 }
      )
    }

    const tokenData = await tokenResponse.json()

    // Get user information using the access token
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    )

    let userEmail = ""
    if (userResponse.ok) {
      const userData = await userResponse.json()
      userEmail = userData.email
    }

    // Return the token data with user email
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
      email: userEmail,
    })

  } catch (error) {
    console.error("Google OAuth token exchange error:", error)
    return NextResponse.json(
      { error: "Internal server error during token exchange" },
      { status: 500 }
    )
  }
}
