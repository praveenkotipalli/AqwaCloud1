import { NextRequest, NextResponse } from 'next/server'
import { stripe, verifyStripeWebhookSignature } from '@/lib/stripe'
import { createUserSubscription, updateUserSubscription, cancelUserSubscription } from '@/lib/firebase-subscriptions'
import { creditWallet } from '@/lib/wallet'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      )
    }

    // Verify the webhook signature
    const event = verifyStripeWebhookSignature(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    console.log('Received webhook event:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  try {
    console.log('Checkout session completed:', session.id)

    // Wallet top-up flow
    // We set metadata.purpose = 'wallet_topup' and metadata.userId when creating the session
    if (session.metadata?.purpose === 'wallet_topup' && session.payment_status === 'paid') {
      const userId = session.metadata.userId
      const amountCents = session.amount_total
      if (userId && typeof amountCents === 'number' && amountCents > 0) {
        try {
          await creditWallet(userId, amountCents, 'Stripe top-up')
          console.log(`Wallet credited for user ${userId}: ${amountCents} cents`)
        } catch (e) {
          console.error('Failed to credit wallet:', e)
        }
      }
    }

    // Subscription flow handled by other events
  } catch (error) {
    console.error('Error handling checkout session completed:', error)
  }
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    console.log('Subscription created:', subscription.id)
    
    // Get customer details
    const customer = await stripe.customers.retrieve(subscription.customer)
    
    // Find user by email
    const userEmail = customer.email
    if (!userEmail) {
      console.error('No email found for customer:', subscription.customer)
      return
    }

    // You'll need to implement a function to find user by email
    // For now, we'll assume the user ID is stored in customer metadata
    const userId = customer.metadata?.userId
    if (!userId) {
      console.error('No userId found in customer metadata')
      return
    }

    // Determine plan from price ID
    const priceId = subscription.items.data[0].price.id
    const planId = getPlanIdFromPriceId(priceId)
    
    if (!planId) {
      console.error('Could not determine plan from price ID:', priceId)
      return
    }

    // Create subscription in database
    await createUserSubscription(
      userId,
      planId,
      subscription.id,
      subscription.customer
    )

    console.log('Subscription created in database for user:', userId)
  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    console.log('Subscription updated:', subscription.id)
    
    // Update subscription status in database
    await updateUserSubscription(subscription.metadata?.subscriptionId || '', {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    })

    console.log('Subscription updated in database')
  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    console.log('Subscription deleted:', subscription.id)
    
    // Cancel subscription in database
    await cancelUserSubscription(subscription.metadata?.subscriptionId || '')

    console.log('Subscription canceled in database')
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}

async function handlePaymentSucceeded(invoice: any) {
  try {
    console.log('Payment succeeded for invoice:', invoice.id)
    
    // Update subscription status to active
    if (invoice.subscription) {
      await updateUserSubscription(invoice.subscription, {
        status: 'active'
      })
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handlePaymentFailed(invoice: any) {
  try {
    console.log('Payment failed for invoice:', invoice.id)
    
    // Update subscription status to past_due
    if (invoice.subscription) {
      await updateUserSubscription(invoice.subscription, {
        status: 'past_due'
      })
    }
  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

function getPlanIdFromPriceId(priceId: string): string | null {
  // Map Stripe price IDs to plan IDs
  // You'll need to set these up in your Stripe dashboard
  const priceIdToPlanId: { [key: string]: string } = {
    'price_personal_monthly': 'personal',
    'price_pro_monthly': 'pro',
    'price_enterprise_monthly': 'enterprise',
  }

  return priceIdToPlanId[priceId] || null
}
