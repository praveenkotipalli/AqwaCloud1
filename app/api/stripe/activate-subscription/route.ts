import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createUserSubscription } from '@/lib/firebase-subscriptions'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json()

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Session ID and User ID are required' },
        { status: 400 }
      )
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    })

    if (!session.subscription) {
      return NextResponse.json(
        { error: 'No subscription found in session' },
        { status: 400 }
      )
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    
    // Determine plan from price ID
    const priceId = subscription.items.data[0].price.id
    const planId = getPlanIdFromPriceId(priceId)
    
    if (!planId) {
      return NextResponse.json(
        { error: 'Could not determine plan from price ID' },
        { status: 400 }
      )
    }

    // Create subscription in database
    await createUserSubscription(
      userId,
      planId,
      subscription.id,
      session.customer as string
    )

    return NextResponse.json({ 
      success: true, 
      planId,
      subscriptionId: subscription.id 
    })
  } catch (error) {
    console.error('Error activating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to activate subscription' },
      { status: 500 }
    )
  }
}

function getPlanIdFromPriceId(priceId: string): string | null {
  // Map Stripe price IDs to plan IDs
  // You'll need to update these with your actual Stripe price IDs
  const priceIdToPlanId: { [key: string]: string } = {
    'price_personal_monthly': 'personal',
    'price_pro_monthly': 'pro',
    'price_enterprise_monthly': 'enterprise',
  }

  return priceIdToPlanId[priceId] || null
}
