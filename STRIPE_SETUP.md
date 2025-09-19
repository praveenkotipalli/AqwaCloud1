# Stripe Setup Guide

This guide will help you set up Stripe payments for your AqwaCloud application.

## 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete the account setup process
3. Get your API keys from the Stripe Dashboard

## 2. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Firebase Configuration (already configured)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="your-private-key"

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. Create Stripe Products and Prices

In your Stripe Dashboard, create the following products and prices:

### Personal Plan
- Product Name: "Personal Plan"
- Price: $5.00/month
- Price ID: `price_personal_monthly` (note this down)

### Pro Plan
- Product Name: "Pro Plan"
- Price: $12.00/month
- Price ID: `price_pro_monthly` (note this down)

### Enterprise Plan
- Product Name: "Enterprise Plan"
- Price: $50.00/month
- Price ID: `price_enterprise_monthly` (note this down)

## 4. Update Price IDs

Update the `lib/subscription.ts` file with your actual Stripe price IDs:

```typescript
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  // ... other plans
  {
    id: 'personal',
    // ... other properties
    stripePriceId: 'price_personal_monthly', // Replace with your actual price ID
  },
  {
    id: 'pro',
    // ... other properties
    stripePriceId: 'price_pro_monthly', // Replace with your actual price ID
  },
  {
    id: 'enterprise',
    // ... other properties
    stripePriceId: 'price_enterprise_monthly', // Replace with your actual price ID
  },
]
```

## 5. Set Up Webhooks

1. In your Stripe Dashboard, go to Webhooks
2. Add a new webhook endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook secret and add it to your environment variables

## 6. Test the Integration

1. Use Stripe's test card numbers for testing:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
2. Test the complete flow:
   - User selects a plan
   - Redirects to Stripe Checkout
   - Completes payment
   - Returns to your app
   - Subscription is activated

## 7. Production Setup

When ready for production:

1. Switch to live mode in Stripe Dashboard
2. Update environment variables with live keys
3. Update webhook URL to production domain
4. Test with real payment methods

## 8. Firebase Admin SDK Setup

For the webhook to work, you need Firebase Admin SDK:

1. Go to Firebase Console > Project Settings > Service Accounts
2. Generate a new private key
3. Download the JSON file
4. Extract the values and add to your environment variables

## Troubleshooting

### Common Issues:

1. **Webhook signature verification fails**
   - Check that `STRIPE_WEBHOOK_SECRET` is correct
   - Ensure webhook URL is accessible

2. **Price ID not found**
   - Verify price IDs in Stripe Dashboard
   - Update `lib/subscription.ts` with correct IDs

3. **Firebase Admin SDK errors**
   - Check Firebase credentials
   - Ensure service account has proper permissions

4. **CORS issues**
   - Make sure `NEXT_PUBLIC_APP_URL` is set correctly
   - Check that Stripe checkout URLs are whitelisted

## Security Notes

- Never commit your `.env.local` file to version control
- Use environment variables for all sensitive data
- Regularly rotate your API keys
- Monitor your Stripe dashboard for suspicious activity
- Implement proper error handling and logging
