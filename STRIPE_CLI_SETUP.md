# Stripe CLI Setup for Local Webhook Testing

## 🚀 **Install Stripe CLI**

### **Option 1: Download from GitHub (Recommended)**

1. **Go to:** https://github.com/stripe/stripe-cli/releases
2. **Download:** `stripe_X.X.X_windows_x86_64.zip` (latest version)
3. **Extract** the zip file
4. **Add to PATH:**
   - Copy `stripe.exe` to a folder (e.g., `C:\stripe-cli\`)
   - Add `C:\stripe-cli\` to your Windows PATH environment variable

### **Option 2: Using Chocolatey**

```bash
choco install stripe-cli
```

### **Option 3: Using Winget**

```bash
winget install stripe.stripe-cli
```

## 🔧 **Setup Steps**

### **Step 1: Login to Stripe**

```bash
stripe login
```

This will open your browser to authenticate with Stripe.

### **Step 2: Start Local Development Server**

In one terminal, start your Next.js development server:

```bash
npm run dev
```

### **Step 3: Forward Webhooks to Local Server**

In another terminal, forward Stripe webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will:
- Start listening for Stripe webhooks
- Forward them to your local webhook endpoint
- Display the webhook secret (save this!)

### **Step 4: Update Environment Variables**

Add the webhook secret to your `.env.local`:

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### **Step 5: Test Webhook**

Trigger test events:

```bash
# Test checkout session completed
stripe trigger checkout.session.completed

# Test payment intent succeeded
stripe trigger payment_intent.succeeded
```

## 🧪 **Testing Your Webhook**

### **Test 1: Checkout Session Completed**

```bash
stripe trigger checkout.session.completed
```

Expected result:
- ✅ Webhook receives event
- ✅ Processes metadata: `{ purpose: "wallet_topup", userId: "test-user" }`
- ✅ Credits wallet (if user exists)

### **Test 2: Payment Intent Succeeded**

```bash
stripe trigger payment_intent.succeeded
```

Expected result:
- ✅ Webhook receives event
- ✅ Processes metadata (if present)
- ✅ Credits wallet (if metadata is correct)

## 🔍 **Debugging**

### **Check Webhook Logs**

The Stripe CLI will show:
- ✅ **Success**: `200 POST /api/stripe/webhook`
- ❌ **Error**: `400/500 POST /api/stripe/webhook`

### **Check Your App Logs**

Your Next.js console will show:
- ✅ **Success**: `Received webhook event: checkout.session.completed`
- ✅ **Success**: `Processing wallet top-up: userId=..., amount=... cents`
- ✅ **Success**: `✅ Wallet credited successfully`

## 🎯 **Expected Results**

After setup, you should see:

1. **Stripe CLI output:**
   ```
   Ready! Your webhook signing secret is whsec_xxxxx
   2024-01-20 10:30:00 --> checkout.session.completed [evt_xxxxx]
   2024-01-20 10:30:00 <-- [200] POST http://localhost:3000/api/stripe/webhook
   ```

2. **Your app console:**
   ```
   Received webhook event: checkout.session.completed
   Processing wallet top-up: userId=test-user, amount=1000 cents
   ✅ Wallet credited successfully for user test-user: 1000 cents
   ```

## 🚀 **Next Steps**

Once local testing works:
1. ✅ **Deploy to Vercel**
2. ✅ **Update production webhook URL**
3. ✅ **Test with real payments**
