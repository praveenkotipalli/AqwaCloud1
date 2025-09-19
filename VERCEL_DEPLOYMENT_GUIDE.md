# Vercel Deployment Guide for AqwaCloud

## 🚀 **Production URL Configuration**

Your app is deployed at: **https://aqwa-cloud1-7iaj.vercel.app**

## 🔧 **Environment Variables Setup**

### **1. In Vercel Dashboard:**

Go to your project settings → Environment Variables and add:

```bash
# App Configuration
NEXT_PUBLIC_APP_URL=https://aqwa-cloud1-7iaj.vercel.app

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=aust2-b8d21.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=aust2-b8d21
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=aust2-b8d21.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PORTAL_CONFIGURATION_ID=pc_your_portal_config_id
```

### **2. Stripe Webhook Configuration:**

1. **Go to Stripe Dashboard:**
   - https://dashboard.stripe.com/webhooks
   - Make sure you're in **Live mode** (not Test mode)

2. **Create Production Webhook:**
   - **Endpoint URL**: `https://aqwa-cloud1-7iaj.vercel.app/api/stripe/webhook`
   - **Events**: Select all the events from the test webhook
   - **Copy the webhook secret** and add to Vercel environment variables

### **3. Firebase Security Rules:**

Deploy your Firebase security rules to production:

```bash
# Deploy rules to production Firebase project
firebase deploy --only firestore:rules --project aust2-b8d21
```

## 🧪 **Testing Production Setup**

### **1. Test Wallet Top-up:**

1. **Go to**: https://aqwa-cloud1-7iaj.vercel.app/billing
2. **Click any top-up button** ($10, $20, $50, $100)
3. **Complete payment** with a real card (or test card in test mode)
4. **Should redirect to**: https://aqwa-cloud1-7iaj.vercel.app/billing?status=success
5. **Wallet balance should update** automatically

### **2. Test Billing Portal:**

1. **Go to**: https://aqwa-cloud1-7iaj.vercel.app/billing
2. **Click "Manage billing"**
3. **Should open Stripe Customer Portal**
4. **Should redirect back to**: https://aqwa-cloud1-7iaj.vercel.app/dashboard

## 🔍 **Troubleshooting**

### **Issue 1: Wallet Not Updating After Payment**
- **Check**: Stripe webhook is configured for production URL
- **Check**: Webhook secret is correct in Vercel environment variables
- **Check**: Firebase security rules are deployed

### **Issue 2: Billing Portal Not Working**
- **Check**: Stripe portal configuration is set up in Stripe Dashboard
- **Check**: `STRIPE_PORTAL_CONFIGURATION_ID` is set in Vercel

### **Issue 3: Firebase Permission Errors**
- **Check**: Firebase security rules are deployed to production
- **Check**: User is properly authenticated

## 📝 **Deployment Checklist**

- [ ] Environment variables set in Vercel
- [ ] Stripe webhook configured for production URL
- [ ] Firebase security rules deployed
- [ ] Test wallet top-up works
- [ ] Test billing portal works
- [ ] Test file transfers work

## 🎯 **Next Steps**

1. **Set up environment variables** in Vercel Dashboard
2. **Configure Stripe webhook** for production
3. **Deploy Firebase rules** to production
4. **Test the complete flow** on production
5. **Switch to live Stripe keys** when ready for real payments

---

**Production URL**: https://aqwa-cloud1-7iaj.vercel.app
