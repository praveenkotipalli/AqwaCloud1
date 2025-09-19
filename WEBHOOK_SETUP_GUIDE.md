# Stripe Webhook Setup Guide

## 🔍 **Problem Diagnosis**

Your payment succeeded but the wallet balance didn't update. This means the Stripe webhook isn't being called or isn't working properly.

## 🛠️ **Solution: Set Up Stripe Webhook**

### **Step 1: Configure Webhook in Stripe Dashboard**

1. **Go to Stripe Dashboard:**
   - Open: https://dashboard.stripe.com/test/webhooks
   - Make sure you're in **Test mode**

2. **Create New Webhook:**
   - Click **"Add endpoint"**
   - **Endpoint URL**: `http://localhost:3000/api/stripe/webhook`
   - **Events to send**: Select these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. **Get Webhook Secret:**
   - After creating the webhook, click on it
   - Copy the **"Signing secret"** (starts with `whsec_`)
   - Add it to your `.env.local` file:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### **Step 2: Test the Webhook**

**Option A: Use Stripe CLI (Recommended)**
```bash
# Install Stripe CLI
npm install -g stripe

# Login to Stripe
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Option B: Use ngrok (Alternative)**
```bash
# Install ngrok
npm install -g ngrok

# Expose localhost
ngrok http 3000

# Use the ngrok URL in Stripe webhook settings
# Example: https://abc123.ngrok.io/api/stripe/webhook
```

### **Step 3: Test Wallet Credit Manually**

If webhook setup is complex, test the wallet system directly:

1. **Get your User ID:**
   - Go to Firebase Console → Authentication → Users
   - Copy your user ID

2. **Run the test script:**
   ```bash
   # Edit test-wallet-credit.js and replace YOUR_USER_ID_HERE with your actual user ID
   node test-wallet-credit.js
   ```

3. **Check your app:**
   - Refresh the billing page
   - Wallet balance should show $10.00

### **Step 4: Verify Webhook is Working**

1. **Make a test payment:**
   - Go to billing page
   - Click any top-up button
   - Complete payment with test card

2. **Check webhook logs:**
   - In Stripe Dashboard → Webhooks → Your webhook
   - Look for successful deliveries
   - Check for any error messages

3. **Check your app logs:**
   - Look for "Received webhook event: checkout.session.completed"
   - Look for "Wallet credited for user..."

## 🚨 **Common Issues**

### **Issue 1: Webhook Not Called**
- **Cause**: Webhook URL not accessible from Stripe
- **Solution**: Use Stripe CLI or ngrok for local development

### **Issue 2: Webhook Secret Mismatch**
- **Cause**: Wrong webhook secret in environment variables
- **Solution**: Copy the correct secret from Stripe Dashboard

### **Issue 3: User ID Not Found**
- **Cause**: User ID in metadata doesn't match Firebase user
- **Solution**: Check that the user is properly authenticated

## 🎯 **Quick Fix**

If you want to test immediately without webhook setup:

1. **Run the manual test:**
   ```bash
   node test-wallet-credit.js
   ```

2. **Refresh your app** - wallet should show $10.00

3. **Then set up webhook** for future payments

## 📝 **Next Steps**

1. Set up webhook endpoint in Stripe Dashboard
2. Test with a new payment
3. Verify wallet balance updates automatically
4. Remove test files when done

---

**Need help?** Check the Stripe webhook documentation: https://stripe.com/docs/webhooks
