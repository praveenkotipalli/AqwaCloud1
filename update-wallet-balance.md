# Update Wallet Balance

## 💰 **Current Issue**

You set `balanceCents: 10` in Firebase, which equals **$0.10** (10 cents).

## 🔧 **Fix: Update to Correct Amount**

### **If you paid $10:**
- Set `balanceCents: 1000` in Firebase
- This will show as **$10.00** in the UI

### **If you paid $20:**
- Set `balanceCents: 2000` in Firebase
- This will show as **$20.00** in the UI

### **If you paid $50:**
- Set `balanceCents: 5000` in Firebase
- This will show as **$50.00** in the UI

### **If you paid $100:**
- Set `balanceCents: 10000` in Firebase
- This will show as **$100.00** in the UI

## 📝 **Steps to Fix**

1. **Go to Firebase Console:**
   - https://console.firebase.google.com/project/aust2-b8d21/firestore/data/wallets

2. **Find your wallet document:**
   - Document ID: `lke7NBWdEOU31Cwcgbp6LOEKcq42`

3. **Update the balance:**
   - Change `balanceCents` from `10` to `1000` (for $10)
   - Or `2000` (for $20), `5000` (for $50), `10000` (for $100)

4. **Refresh your app** - wallet should show the correct amount

## 🧮 **Balance Conversion**

| Firebase Value | UI Display |
|----------------|------------|
| `balanceCents: 10` | $0.10 |
| `balanceCents: 100` | $1.00 |
| `balanceCents: 1000` | $10.00 |
| `balanceCents: 2000` | $20.00 |
| `balanceCents: 5000` | $50.00 |
| `balanceCents: 10000` | $100.00 |

## ✅ **Expected Result**

After updating to `balanceCents: 1000`, your UI should show:
- **Wallet Balance: $10.00**
- **Available balance: $10.00**

The wallet system is working perfectly - you just need to set the correct cent value!
