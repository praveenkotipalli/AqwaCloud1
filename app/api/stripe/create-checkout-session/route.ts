import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession, createStripeCustomer } from '@/lib/stripe'
import { SUBSCRIPTION_PLANS } from '@/lib/subscription'
import { createUserProfile, getUserProfile, updateUserProfile } from '@/lib/firebase-subscriptions'

export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json()

    // Verify the plan exists
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId)
    if (!plan || plan.id === 'free') {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    
    // For now, we'll extract userId from the token payload
    // In a production app, you'd verify the token with Firebase Admin SDK
    const tokenPayload = JSON.parse(atob(token.split('.')[1]))
    const userId = tokenPayload.user_id

    // Get or create user profile
    let userProfile = await getUserProfile(userId)
    if (!userProfile) {
      // Create user profile if it doesn't exist
      await createUserProfile(userId, tokenPayload.email || '', tokenPayload.name || '')
      userProfile = await getUserProfile(userId)
    }

    // Create or get Stripe customer
    let stripeCustomerId = userProfile?.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(
        tokenPayload.email || '',
        tokenPayload.name || ''
      )
      stripeCustomerId = customer.id
      
      // Update user profile with Stripe customer ID
      await updateUserProfile(userId, { stripeCustomerId })
    }

    // Create checkout session
    const session = await createCheckoutSession(
      stripeCustomerId,
      plan.stripePriceId || '', // You'll need to set this up in Stripe
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&plan=${planId}`,
      `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      plan.id === 'personal' ? 7 : undefined // 7-day trial for personal plan
    )

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
