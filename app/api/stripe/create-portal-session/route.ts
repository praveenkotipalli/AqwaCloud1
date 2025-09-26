import { NextRequest, NextResponse } from 'next/server'
import { createBillingPortalSession, createStripeCustomer, stripe } from '@/lib/stripe'
import { getAdminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]

    // Extract userId from token payload (Node-safe decoding)
    const tokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    const userId = tokenPayload.user_id

    // Ensure Stripe customer exists WITHOUT relying on Firestore (server routes lack Firebase auth)
    const email = tokenPayload.email || ''
    const name = tokenPayload.name || ''

    let stripeCustomerId: string | undefined

    // Prefer stored mapping via Admin (ensures portal and UI use same customer)
    const adminDb = getAdminDb()
    const userSnap = await adminDb.collection('users').doc(userId).get()
    const profile = userSnap.exists ? (userSnap.data() as any) : null
    if (profile?.stripeCustomerId) {
      stripeCustomerId = profile.stripeCustomerId
    }

    // Fallback: find by email; create if none
    if (!stripeCustomerId && email) {
      const existing = await stripe.customers.list({ email, limit: 1 })
      if (existing.data.length > 0) {
        stripeCustomerId = existing.data[0].id
      }
    }
    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(email, name)
      stripeCustomerId = customer.id
    }

    // Persist mapping with Admin
    await adminDb.collection('users').doc(userId).set(
      {
        email,
        name,
        stripeCustomerId,
        updatedAt: new Date()
      },
      { merge: true }
    )

    // Create billing portal session
    const session = await createBillingPortalSession(
      stripeCustomerId!,
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://aqwa-cloud1-7iaj.vercel.app'}/billing`,
      process.env.STRIPE_PORTAL_CONFIGURATION_ID
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = (error as any)?.message || 'Failed to create portal session'
    console.error('Error creating portal session:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
