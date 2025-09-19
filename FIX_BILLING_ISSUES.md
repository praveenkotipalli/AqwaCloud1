# Fix Billing Issues Guide

This guide will help you fix both the Firebase permission errors and the Stripe billing portal issue.

## 🔥 Firebase Permission Errors Fix

### Problem
You're seeing errors like:
- `FirebaseError: Missing or insufficient permissions`
- `Error getting user subscription`
- `Error getting user usage`
- `Failed to load wallet balance`

### Solution
Deploy the Firebase security rules I created:

```bash
# 1. Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Initialize Firebase project (if not already done)
firebase init firestore

# 4. Select your project: aust2-b8d21
# 5. Use existing firestore.rules: Yes
# 6. Deploy the rules
node deploy-firebase-rules.js
```

**OR manually deploy:**
```bash
firebase deploy --only firestore:rules
```

## 💳 Stripe Billing Portal Fix

### Problem
You're seeing:
- `Error: No configuration provided and your test mode default configuration has not been created`
- `Failed to create billing portal session`

### Solution
Choose one of these options:

#### Option A: Create Default Portal Configuration (Recommended)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/settings/billing/portal)
2. Make sure you're in **Test mode** (toggle in top-left)
3. Click **"Save"** (no need to change anything)
4. This creates the default test portal configuration
5. Try "Manage billing" again

#### Option B: Use Specific Configuration ID
1. In the same portal settings page, create a custom configuration
2. Copy the configuration ID (starts with `pc_...`)
3. Add to your `.env.local`:
   ```
   STRIPE_PORTAL_CONFIGURATION_ID=pc_1234567890abcdef
   ```
4. Restart your dev server
5. Try "Manage billing" again

## 🧪 Test the Fixes

After applying both fixes:

1. **Refresh your browser**
2. **Check wallet balance loads** (should show your balance without errors)
3. **Try "Manage billing"** (should open Stripe portal)
4. **Test wallet top-up** (should work end-to-end)

## 🚨 If Issues Persist

### Firebase Issues
- Check browser console for specific permission errors
- Verify you're logged in with a valid user
- Ensure Firebase project ID is correct: `aust2-b8d21`

### Stripe Issues
- Verify you're using test mode keys
- Check Stripe dashboard for any webhook failures
- Ensure `STRIPE_SECRET_KEY` starts with `sk_test_`

## 📞 Need Help?

If you're still having issues:
1. Check the browser console for specific error messages
2. Verify your Firebase project settings
3. Confirm your Stripe test mode configuration
4. Make sure all environment variables are set correctly
