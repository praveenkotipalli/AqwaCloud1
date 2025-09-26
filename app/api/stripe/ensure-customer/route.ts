import { NextRequest, NextResponse } from 'next/server'
import { stripe, createStripeCustomer } from '@/lib/stripe'
import { getUserProfile, createUserProfile, updateUserProfile, ensureUserRootDoc } from '@/lib/firebase-subscriptions'
import getAdminApp, { getAdminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }
    const token = authHeader.split('Bearer ')[1]
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())

    const userId = payload.user_id as string | undefined
    const email = (payload.email as string | undefined) || ''
    const name = (payload.name as string | undefined) || ''
    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    // Try existing profile using Admin SDK (bypass client rules)
    let profile: any = null
    const adminDb = getAdminDb()
    const adminUserSnap = await adminDb.collection('users').doc(userId).get()
    if (adminUserSnap.exists) {
      profile = { id: adminUserSnap.id, ...adminUserSnap.data() }
      if (profile?.stripeCustomerId) {
        return NextResponse.json({ stripeCustomerId: profile.stripeCustomerId })
      }
    }

    // Try find by email
    let customerId: string | undefined
    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 })
      if (existing.data.length > 0) {
        customerId = existing.data[0].id
      }
    }

    // Create if none
    if (!customerId) {
      const customer = await createStripeCustomer(email, name)
      customerId = customer.id
    }

    // Persist mapping with Admin SDK to bypass rules
    await getAdminDb().collection('users').doc(userId).set(
      {
        email,
        name,
        plan: profile?.plan || 'free',
        stripeCustomerId: customerId,
        updatedAt: new Date()
      },
      { merge: true }
    )

    return NextResponse.json({ stripeCustomerId: customerId })
  } catch (error: any) {
    const message = error?.message || 'Failed to ensure Stripe customer'
    console.error('ensure-customer error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


