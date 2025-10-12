# Environment Variables Setup

## 🔍 **Issue Found: Missing Environment Variables**

The webhook is failing with **HTTP 500** because these environment variables are missing:

- ❌ `STRIPE_SECRET_KEY` is missing
- ❌ `STRIPE_WEBHOOK_SECRET` is missing

## 🚀 **Fix: Create .env.local File**

**Step 1: Create .env.local file in your project root**

Create a file named `.env.local` in your project root with these contents:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# App Configuration
NEXT_PUBLIC_APP_URL=https://aqwa-cloud1-7iaj.vercel.app

# Firebase Configuration (if not already set)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=aust2-b8d21.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=aust2-b8d21
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=aust2-b8d21.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Step 2: Get Your Stripe Keys**

1. **Go to Stripe Dashboard:**
   - https://dashboard.stripe.com/test/apikeys

2. **Copy your keys:**
   - **Secret key**: `sk_test_...` (starts with sk_test_)
   - **Publishable key**: `pk_test_...` (starts with pk_test_)

3. **Replace in .env.local:**
   - Replace `sk_test_your_stripe_secret_key_here` with your actual secret key
   - Replace `pk_test_your_stripe_publishable_key_here` with your actual publishable key

**Step 3: Get Webhook Secret**

1. **Go to Stripe Dashboard:**
   - https://dashboard.stripe.com/test/webhooks

2. **Find your webhook endpoint:**
   - Look for endpoint: `https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook`

3. **Copy webhook secret:**
   - Click on the webhook endpoint
   - Copy the **"Signing secret"** (starts with `whsec_`)

4. **Replace in .env.local:**
   - Replace `whsec_your_webhook_secret_here` with your actual webhook secret

**Step 4: Restart Your App**

```bash
# Stop your Next.js app (Ctrl+C)
# Then restart it
npm run dev
```

## 🧪 **Test the Fix**

**Step 1: Test webhook endpoint**
```bash
node test-webhook-endpoint.js
```

**Expected output:**
- ✅ `STRIPE_SECRET_KEY: ✅ Set`
- ✅ `STRIPE_WEBHOOK_SECRET: ✅ Set`
- ✅ `HTTP 400 - Bad Request (expected for invalid signature)`

**Step 2: Make a test payment**
1. Go to your billing page
2. Click any top-up button
3. Complete payment with test card: `4242 4242 4242 4242`
4. Check if wallet balance updates automatically

## 🎯 **Expected Result**

After setting up the environment variables:

1. ✅ **Webhook endpoint returns HTTP 400** (instead of 500)
2. ✅ **Stripe webhook events succeed** (instead of HTTP 405)
3. ✅ **Wallet balance updates automatically** after payment
4. ✅ **UI shows correct balance** without manual Firebase updates

## 🔍 **Troubleshooting**

**Issue 1: Still getting HTTP 500**
- Check that `.env.local` file exists in project root
- Check that environment variables are set correctly
- Restart your Next.js app

**Issue 2: Still getting HTTP 405**
- Check that webhook secret is correct
- Verify webhook endpoint URL in Stripe Dashboard
- Check that webhook events include `checkout.session.completed`

**Issue 3: Wallet still not updating**
- Check Firebase security rules are deployed
- Check that user ID in webhook matches Firebase user ID
- Check app logs for webhook processing errors

---

**The missing environment variables are the root cause of the webhook failures!**
