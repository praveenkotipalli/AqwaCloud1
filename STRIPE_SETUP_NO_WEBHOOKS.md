# Stripe Setup Guide (Without Webhooks)

This guide will help you set up Stripe payments for your AqwaCloud application **without webhooks**. This is simpler to set up and perfect for getting started quickly.

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

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note**: No webhook secret needed! 🎉

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

## 5. How It Works (Without Webhooks)

### Payment Flow:
1. User selects a plan and clicks "Upgrade"
2. Redirects to Stripe Checkout
3. User completes payment
4. Stripe redirects back to your app with success URL
5. Your app automatically activates the subscription
6. User can immediately use their new plan features

### Subscription Activation:
- When user returns from successful payment, the dashboard detects the success
- It calls your `/api/stripe/activate-subscription` endpoint
- This endpoint retrieves the subscription from Stripe
- Creates the subscription record in your database
- User's plan is immediately upgraded

## 6. Test the Integration

1. Use Stripe's test card numbers for testing:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
2. Test the complete flow:
   - User selects a plan
   - Redirects to Stripe Checkout
   - Completes payment
   - Returns to your app
   - Subscription is activated automatically

## 7. Production Setup

When ready for production:

1. Switch to live mode in Stripe Dashboard
2. Update environment variables with live keys
3. Update webhook URL to production domain
4. Test with real payment methods

## 8. Firebase Admin SDK Setup

For the subscription activation to work, you need Firebase Admin SDK:

1. Go to Firebase Console > Project Settings > Service Accounts
2. Generate a new private key
3. Download the JSON file
4. Extract the values and add to your environment variables

## Benefits of This Approach

### ✅ **Advantages:**
- **Simpler Setup**: No webhook configuration needed
- **Faster Development**: Get started immediately
- **Reliable**: Works even if webhooks fail
- **User-Friendly**: Immediate subscription activation

### ⚠️ **Limitations:**
- **Manual Activation**: Requires user to return to your app
- **No Automatic Renewals**: You'll need to handle renewals manually
- **Limited Event Handling**: Can't automatically handle failed payments

## Troubleshooting

### Common Issues:

1. **Price ID not found**
   - Verify price IDs in Stripe Dashboard
   - Update `lib/subscription.ts` with correct IDs

2. **Firebase Admin SDK errors**
   - Check Firebase credentials
   - Ensure service account has proper permissions

3. **Subscription not activating**
   - Check browser console for errors
   - Verify the success URL includes session_id
   - Check that the activate-subscription API is working

## Next Steps

1. **Set up Stripe account** and get API keys
2. **Create products and prices** in Stripe Dashboard
3. **Add environment variables** to `.env.local`
4. **Update price IDs** in your code
5. **Test the complete flow** with test cards

## Future Enhancements

When you're ready to scale, you can add webhooks later for:
- Automatic subscription renewals
- Failed payment handling
- Subscription cancellations
- Advanced analytics

But for now, this approach will work perfectly for getting your monetization system up and running! 🚀
