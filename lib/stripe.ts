import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe server-side
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Initialize Stripe client-side
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}

// Stripe webhook event types
export interface StripeWebhookEvent {
  id: string
  type: string
  data: {
    object: any
  }
}

// Customer creation
export async function createStripeCustomer(email: string, name: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'aqwa-cloud'
      }
    })
    return customer
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw error
  }
}

// Subscription creation
export async function createStripeSubscription(
  customerId: string,
  priceId: string,
  trialPeriodDays?: number
) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      trial_period_days: trialPeriodDays,
    })
    return subscription
  } catch (error) {
    console.error('Error creating Stripe subscription:', error)
    throw error
  }
}

// Subscription update
export async function updateStripeSubscription(
  subscriptionId: string,
  newPriceId: string
) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
    })
    
    return updatedSubscription
  } catch (error) {
    console.error('Error updating Stripe subscription:', error)
    throw error
  }
}

// Subscription cancellation
export async function cancelStripeSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error canceling Stripe subscription:', error)
    throw error
  }
}

// Get subscription details
export async function getStripeSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'customer']
    })
    return subscription
  } catch (error) {
    console.error('Error retrieving Stripe subscription:', error)
    throw error
  }
}

// Create checkout session
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  trialPeriodDays?: number
) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      trial_period_days: trialPeriodDays,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    })
    
    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

// Create billing portal session
export async function createBillingPortalSession(customerId: string, returnUrl: string, configurationId?: string) {
  try {
    const params: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url: returnUrl,
    }
    if (configurationId) {
      // Attach a specific portal configuration (useful when default is not set in test mode)
      ;(params as any).configuration = configurationId
    }
    const session = await stripe.billingPortal.sessions.create(params)
    
    return session
  } catch (error) {
    console.error('Error creating billing portal session:', error)
    throw error
  }
}

// Verify webhook signature
export function verifyStripeWebhookSignature(
  payload: string,
  signature: string,
  secret: string
) {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret)
    return event
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    throw error
  }
}

// Handle successful payment
export async function handleSuccessfulPayment(subscriptionId: string) {
  try {
    const subscription = await getStripeSubscription(subscriptionId)
    
    if (subscription.status === 'active') {
      // Update user subscription in database
      // This would typically update your database with the new subscription status
      console.log('Subscription activated:', subscription.id)
      return { success: true, subscription }
    }
    
    return { success: false, reason: 'Subscription not active' }
  } catch (error) {
    console.error('Error handling successful payment:', error)
    throw error
  }
}

// Handle failed payment
export async function handleFailedPayment(subscriptionId: string) {
  try {
    const subscription = await getStripeSubscription(subscriptionId)
    
    // Handle failed payment logic
    // This might include sending notifications, updating user status, etc.
    console.log('Payment failed for subscription:', subscription.id)
    
    return { success: true, subscription }
  } catch (error) {
    console.error('Error handling failed payment:', error)
    throw error
  }
}
