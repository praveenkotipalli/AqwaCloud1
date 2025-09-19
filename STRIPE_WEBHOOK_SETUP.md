# Stripe Webhook Setup Guide

## 🔍 **Problem: Payment Succeeded But Wallet Not Updated**

Your payment succeeded in Stripe, but the wallet balance didn't update because **Stripe isn't calling your webhook**.

## 🚀 **Solution: Set Up Stripe Webhook**

### **Method 1: Stripe CLI (Recommended for Local Development)**

**Step 1: Install Stripe CLI**
```bash
# Windows (PowerShell)
npm install -g stripe

# Or download from: https://github.com/stripe/stripe-cli/releases
```

**Step 2: Login to Stripe**
```bash
stripe login
# This will open a browser to authenticate
```

**Step 3: Forward Webhooks to Localhost**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Step 4: Copy Webhook Secret**
- The CLI will show a webhook secret (starts with `whsec_`)
- Add it to your `.env.local` file:
```
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

**Step 5: Test**
- Make a new payment
- Watch the CLI for webhook events
- Check your app for updated wallet balance

### **Method 2: Stripe Dashboard (For Production)**

**Step 1: Go to Stripe Dashboard**
- https://dashboard.stripe.com/webhooks
- Make sure you're in **Test mode** (not Live mode)

**Step 2: Create Webhook Endpoint**
- Click **"Add endpoint"**
- **Endpoint URL**: `https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook`
- **Events to send**: Select these events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

**Step 3: Get Webhook Secret**
- After creating the webhook, click on it
- Copy the **"Signing secret"** (starts with `whsec_`)
- Add to Vercel environment variables:
```
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

### **Method 3: ngrok (Alternative for Local Development)**

**Step 1: Install ngrok**
```bash
npm install -g ngrok
```

**Step 2: Expose Localhost**
```bash
ngrok http 3000
```

**Step 3: Use ngrok URL in Stripe**
- Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
- Create webhook endpoint: `https://abc123.ngrok.io/api/stripe/webhook`
- Copy webhook secret to `.env.local`

## 🧪 **Test the Webhook**

### **Test 1: Make a Payment**
1. Go to your billing page
2. Click any top-up button
3. Complete payment with test card: `4242 4242 4242 4242`
4. Check if wallet balance updates automatically

### **Test 2: Check Webhook Logs**
- **Stripe CLI**: Watch the terminal for webhook events
- **Stripe Dashboard**: Go to Webhooks → Your webhook → Recent deliveries
- **Your app logs**: Look for "Received webhook event: checkout.session.completed"

### **Test 3: Verify Wallet Update**
- Check Firebase Console for updated `balanceCents`
- Check your app UI for updated wallet balance

## 🔧 **Troubleshooting**

### **Issue 1: Webhook Not Called**
- **Cause**: Webhook URL not accessible from Stripe
- **Solution**: Use Stripe CLI or ngrok for local development

### **Issue 2: Webhook Secret Mismatch**
- **Cause**: Wrong webhook secret in environment variables
- **Solution**: Copy the correct secret from Stripe Dashboard

### **Issue 3: Webhook Endpoint Not Responding**
- **Cause**: Next.js app not running or endpoint not working
- **Solution**: Make sure app is running on localhost:3000

### **Issue 4: Firebase Permission Errors**
- **Cause**: Webhook trying to access Firebase without authentication
- **Solution**: The webhook should work - check Firebase security rules

## 📝 **Quick Fix for Current Payment**

Since your payment already succeeded, you can manually credit your wallet:

1. **Go to Firebase Console:**
   - https://console.firebase.google.com/project/aust2-b8d21/firestore/data/wallets

2. **Find your wallet document:**
   - Document ID: `lke7NBWdEOU31Cwcgbp6LOEKcq42`

3. **Update the balance:**
   - Change `balanceCents` from `10` to `1000` (for $10.00)

4. **Refresh your app** - wallet should show $10.00

## 🎯 **Next Steps**

1. **Fix current wallet balance** manually
2. **Set up Stripe webhook** using one of the methods above
3. **Test with a new payment** to confirm everything works
4. **Deploy to production** with proper webhook configuration

---

**The webhook is the missing piece that connects Stripe payments to your wallet system!**
