import { NextRequest, NextResponse } from 'next/server'
import { createBillingPortalSession, createStripeCustomer, stripe } from '@/lib/stripe'
import { getUserProfile, createUserProfile, updateUserProfile } from '@/lib/firebase-subscriptions'

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

    // Try to find existing customer by email first
    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 })
      if (existing.data.length > 0) {
        stripeCustomerId = existing.data[0].id
      }
    }
    // Create if none
    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(email, name)
      stripeCustomerId = customer.id
    }

    // Best-effort Firestore sync (ignore failures due to security rules)
    try {
      let userProfile = await getUserProfile(userId)
      if (!userProfile) {
        await createUserProfile(userId, email, name, stripeCustomerId)
      } else if (!userProfile.stripeCustomerId) {
        await updateUserProfile(userId, { stripeCustomerId })
      }
    } catch (e) {
      console.warn('Non-fatal: failed to sync Stripe customer to Firestore', e)
    }

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
