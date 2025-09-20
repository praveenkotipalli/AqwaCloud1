# Vercel Environment Variables Setup

## 🚨 **CRITICAL ISSUE**

Your Vercel deployment is failing because environment variables are missing. This is why the webhook isn't working!

## 🔧 **Required Environment Variables**

Add these to your Vercel project:

### **Stripe Variables**
```
STRIPE_SECRET_KEY=sk_test_51RVm8JP5qvB67uFKd0IdNGuamND9KL9WHGZSfXlic36C51WyN2SBMgGPNWIxROYoLzi8Z66pyfc5Ac8tB
WdlWT2800VNJGJvjR

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RVm8JP5qvB67uFKhIspmi9Tepa2wU2NdmAZ4oJKsBPfenwKSrODRJLS1xyvclM2
v13uWFgMBrSMZGoIjbjuadi500luz1aUJd

STRIPE_WEBHOOK_SECRET=whsec_3YsyrWWVJ7lYJNhOhTqQF5O6rO9nr6M9
```

### **Firebase Variables**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBsZMSZBFC_lKRNkMWm52kdC9KUUAvCbNs
FIREBASE_ADMIN_PROJECT_ID=aust2-b8d21
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@aust2-b8d21.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### **App Variables**
```
NEXT_PUBLIC_APP_URL=https://aqwa-cloud1-7iaj.vercel.app
```

## 🚀 **Steps to Fix**

### **Step 1: Go to Vercel Dashboard**
1. Go to: https://vercel.com/dashboard
2. Select project: `aqwa-cloud1-7iaj`
3. Go to **Settings** tab
4. Click **Environment Variables**

### **Step 2: Add Each Variable**
1. Click **Add New**
2. Enter the **Name** and **Value**
3. Set **Environment** to **Production** (or All)
4. Click **Save**

### **Step 3: Get Firebase Admin Key**
You need to get the Firebase Admin service account key:

1. Go to: https://console.firebase.google.com/project/aust2-b8d21/settings/serviceaccounts/adminsdk
2. Click **Generate new private key**
3. Download the JSON file
4. Extract the values:
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY`

### **Step 4: Redeploy**
After adding all variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger redeploy

## 🧪 **Test After Setup**

After setting up environment variables:

1. **Check deployment**: Should build successfully
2. **Test webhook**: Make a test payment
3. **Check wallet**: Should update automatically

## 🔍 **Verification**

To verify the setup worked:

1. **Build should succeed** (no more Stripe API key errors)
2. **Webhook endpoint should work** (returns 200 for valid requests)
3. **Payments should credit wallet** automatically

## 📝 **Notes**

- **Never commit** `.env.local` to git
- **Environment variables** are only available at runtime
- **Redeploy required** after adding new variables
- **Test mode** uses `sk_test_` and `pk_test_` keys
