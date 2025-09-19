# Fix Wallet Balance Issue

## 🔍 **Problem Identified**

Your wallet balance is stuck at $0 even after successful payment because:
1. **Stripe webhook isn't being called** (most likely cause)
2. **Firebase security rules** are blocking unauthenticated access

## 🚀 **Immediate Fix Options**

### **Option 1: Manual Firebase Update (Fastest)**

1. **Go to Firebase Console:**
   - https://console.firebase.google.com/project/aust2-b8d21/firestore/data/wallets

2. **Find your wallet document:**
   - Document ID: `lke7NBWdEOU31Cwcgbp6LOEKcq42`

3. **Update the balance:**
   - Change `balanceCents` from `0` to `1000` (for $10)
   - Or `2000` (for $20), `5000` (for $50), `10000` (for $100)

4. **Refresh your app** - wallet should show the updated balance

### **Option 2: Use Your App's Wallet System**

1. **Go to your app's billing page**
2. **Open browser developer tools** (F12)
3. **Run this in the console:**
   ```javascript
   // This will credit your wallet using the app's authenticated context
   fetch('/api/stripe/create-topup-session', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer ' + (await firebase.auth().currentUser.getIdToken())
     },
     body: JSON.stringify({ amountCents: 1000 })
   }).then(r => r.json()).then(console.log);
   ```

### **Option 3: Set Up Stripe Webhook (Proper Solution)**

**For Local Development:**
```bash
# Install Stripe CLI
npm install -g stripe

# Login to Stripe
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**For Production:**
1. **Go to Stripe Dashboard:**
   - https://dashboard.stripe.com/webhooks

2. **Create webhook endpoint:**
   - URL: `https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`

3. **Add webhook secret to Vercel:**
   - Copy the webhook secret from Stripe
   - Add to Vercel environment variables: `STRIPE_WEBHOOK_SECRET=whsec_...`

## 🧪 **Test the Fix**

1. **Update wallet balance** using Option 1 or 2
2. **Refresh your app**
3. **Check billing page** - should show updated balance
4. **Try a new payment** - should work with webhook setup

## 🔍 **Why This Happened**

- **Stripe webhook** wasn't configured for your local/production environment
- **Webhook secret** might be missing or incorrect
- **Firebase security rules** prevent unauthenticated access

## 📝 **Next Steps**

1. **Fix wallet balance** immediately using Option 1
2. **Set up Stripe webhook** for future payments
3. **Test the complete flow** end-to-end

---

**Your User ID**: `lke7NBWdEOU31Cwcgbp6LOEKcq42`
**Current Balance**: `0` cents
**Suggested Credit**: `1000` cents ($10.00)
