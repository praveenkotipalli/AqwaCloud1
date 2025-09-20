import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createUserSubscription, updateUserSubscription, cancelUserSubscription } from '@/lib/firebase-subscriptions'
import { creditWallet } from '@/lib/wallet'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    const sig = request.headers.get('stripe-signature') as string
    const rawBody = await request.text() // Stripe requires raw body

    if (!sig) {
      console.error('No stripe signature provided')
      return new NextResponse('No signature provided', { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
    }

    console.log('Received webhook event:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object)
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
    console.log('Session metadata:', session.metadata)
    console.log('Payment status:', session.payment_status)
    console.log('Amount total:', session.amount_total)

    // Wallet top-up flow
    // We set metadata.purpose = 'wallet_topup' and metadata.userId when creating the session
    if (session.metadata?.purpose === 'wallet_topup' && session.payment_status === 'paid') {
      const userId = session.metadata.userId
      const amountCents = session.amount_total
      
      console.log(`Processing wallet top-up: userId=${userId}, amount=${amountCents} cents`)
      
      if (userId && typeof amountCents === 'number' && amountCents > 0) {
        try {
          await creditWallet(userId, amountCents, 'Stripe top-up')
          console.log(`✅ Wallet credited successfully for user ${userId}: ${amountCents} cents`)
        } catch (e) {
          console.error('❌ Failed to credit wallet:', e)
          throw e // Re-throw to ensure webhook fails if wallet credit fails
        }
      } else {
        console.error('❌ Invalid wallet top-up data:', { userId, amountCents })
      }
    } else {
      console.log('Not a wallet top-up or payment not completed:', {
        purpose: session.metadata?.purpose,
        payment_status: session.payment_status
      })
    }

    // Subscription flow handled by other events
  } catch (error) {
    console.error('Error handling checkout session completed:', error)
    throw error // Re-throw to ensure webhook fails
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  try {
    console.log('Payment intent succeeded:', paymentIntent.id)
    console.log('Payment intent metadata:', paymentIntent.metadata)
    console.log('Amount:', paymentIntent.amount)
    console.log('Status:', paymentIntent.status)

    // Check if this is a wallet top-up payment
    if (paymentIntent.metadata?.purpose === 'wallet_topup' && paymentIntent.status === 'succeeded') {
      const userId = paymentIntent.metadata.userId
      const amountCents = paymentIntent.amount
      
      console.log(`Processing wallet top-up from payment intent: userId=${userId}, amount=${amountCents} cents`)
      
      if (userId && typeof amountCents === 'number' && amountCents > 0) {
        try {
          await creditWallet(userId, amountCents, 'Stripe payment intent top-up')
          console.log(`✅ Wallet credited successfully for user ${userId}: ${amountCents} cents`)
        } catch (e) {
          console.error('❌ Failed to credit wallet:', e)
          throw e // Re-throw to ensure webhook fails if wallet credit fails
        }
      } else {
        console.error('❌ Invalid wallet top-up data:', { userId, amountCents })
      }
    } else {
      console.log('Not a wallet top-up or payment not succeeded:', {
        purpose: paymentIntent.metadata?.purpose,
        status: paymentIntent.status
      })
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error)
    throw error // Re-throw to ensure webhook fails
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
