import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { UserSubscription, UsageData, SUBSCRIPTION_PLANS } from './subscription'

// Collection names
const SUBSCRIPTIONS_COLLECTION = 'subscriptions'
const USAGE_COLLECTION = 'usage'
const USERS_COLLECTION = 'users'

// User subscription management
export async function createUserSubscription(
  userId: string,
  planId: string,
  stripeSubscriptionId?: string,
  stripeCustomerId?: string
): Promise<UserSubscription> {
  try {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId)
    if (!plan) {
      throw new Error(`Plan ${planId} not found`)
    }

    const now = new Date()
    const subscriptionData: UserSubscription = {
      id: `${userId}_${planId}_${Date.now()}`,
      userId,
      planId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days
      cancelAtPeriodEnd: false,
      stripeSubscriptionId,
      stripeCustomerId
    }

    await setDoc(doc(db, SUBSCRIPTIONS_COLLECTION, subscriptionData.id), {
      ...subscriptionData,
      currentPeriodStart: Timestamp.fromDate(subscriptionData.currentPeriodStart),
      currentPeriodEnd: Timestamp.fromDate(subscriptionData.currentPeriodEnd),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // Update user document with subscription info
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      subscriptionId: subscriptionData.id,
      plan: planId,
      updatedAt: serverTimestamp()
    })

    return subscriptionData
  } catch (error) {
    console.error('Error creating user subscription:', error)
    throw error
  }
}

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const q = query(
      collection(db, SUBSCRIPTIONS_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'active')
    )
    
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }

    const doc = querySnapshot.docs[0]
    const data = doc.data()
    
    return {
      id: doc.id,
      userId: data.userId,
      planId: data.planId,
      status: data.status,
      currentPeriodStart: data.currentPeriodStart.toDate(),
      currentPeriodEnd: data.currentPeriodEnd.toDate(),
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripeCustomerId: data.stripeCustomerId
    }
  } catch (error) {
    console.error('Error getting user subscription:', error)
    throw error
  }
}

export async function updateUserSubscription(
  subscriptionId: string,
  updates: Partial<UserSubscription>
): Promise<void> {
  try {
    const subscriptionRef = doc(db, SUBSCRIPTIONS_COLLECTION, subscriptionId)
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp()
    }

    // Convert Date objects to Timestamps
    if (updates.currentPeriodStart) {
      updateData.currentPeriodStart = Timestamp.fromDate(updates.currentPeriodStart)
    }
    if (updates.currentPeriodEnd) {
      updateData.currentPeriodEnd = Timestamp.fromDate(updates.currentPeriodEnd)
    }

    await updateDoc(subscriptionRef, updateData)
  } catch (error) {
    console.error('Error updating user subscription:', error)
    throw error
  }
}

export async function cancelUserSubscription(subscriptionId: string): Promise<void> {
  try {
    await updateUserSubscription(subscriptionId, {
      status: 'canceled',
      cancelAtPeriodEnd: true
    })
  } catch (error) {
    console.error('Error canceling user subscription:', error)
    throw error
  }
}

// Usage tracking
export async function createUsageRecord(
  userId: string,
  month: string,
  dataTransferred: number,
  transferCount: number
): Promise<UsageData> {
  try {
    const usageData: UsageData = {
      userId,
      month,
      dataTransferred,
      transferCount,
      lastUpdated: new Date()
    }

    const docRef = await addDoc(collection(db, USAGE_COLLECTION), {
      ...usageData,
      lastUpdated: Timestamp.fromDate(usageData.lastUpdated),
      createdAt: serverTimestamp()
    })

    return { ...usageData, userId: docRef.id }
  } catch (error) {
    console.error('Error creating usage record:', error)
    throw error
  }
}

export async function getUserUsage(userId: string, month?: string): Promise<UsageData | null> {
  try {
    let q = query(
      collection(db, USAGE_COLLECTION),
      where('userId', '==', userId)
    )

    if (month) {
      q = query(q, where('month', '==', month))
    } else {
      // Get current month
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
      q = query(q, where('month', '==', currentMonth))
    }

    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }

    const doc = querySnapshot.docs[0]
    const data = doc.data()
    
    return {
      userId: data.userId,
      month: data.month,
      dataTransferred: data.dataTransferred,
      transferCount: data.transferCount,
      lastUpdated: data.lastUpdated.toDate()
    }
  } catch (error) {
    console.error('Error getting user usage:', error)
    throw error
  }
}

export async function updateUserUsage(
  userId: string,
  additionalDataGB: number,
  additionalTransfers: number = 1
): Promise<void> {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const existingUsage = await getUserUsage(userId, currentMonth)

    if (existingUsage) {
      // Update existing usage record
      const q = query(
        collection(db, USAGE_COLLECTION),
        where('userId', '==', userId),
        where('month', '==', currentMonth)
      )
      
      const querySnapshot = await getDocs(q)
      const docRef = querySnapshot.docs[0].ref
      
      await updateDoc(docRef, {
        dataTransferred: existingUsage.dataTransferred + additionalDataGB,
        transferCount: existingUsage.transferCount + additionalTransfers,
        lastUpdated: serverTimestamp()
      })
    } else {
      // Create new usage record
      await createUsageRecord(userId, currentMonth, additionalDataGB, additionalTransfers)
    }
  } catch (error) {
    console.error('Error updating user usage:', error)
    throw error
  }
}

// User management
export async function createUserProfile(
  userId: string,
  email: string,
  name: string,
  stripeCustomerId?: string
): Promise<void> {
  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), {
      email,
      name,
      plan: 'free',
      stripeCustomerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error creating user profile:', error)
    throw error
  }
}

export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string
    plan?: string
    stripeCustomerId?: string
  }
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId)
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

export async function getUserProfile(userId: string): Promise<any | null> {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId))
    
    if (!userDoc.exists()) {
      return null
    }

    return {
      id: userDoc.id,
      ...userDoc.data()
    }
  } catch (error) {
    console.error('Error getting user profile:', error)
    throw error
  }
}

// Utility functions
export async function getUserWithSubscription(userId: string): Promise<{
  user: any
  subscription: UserSubscription | null
  usage: UsageData | null
}> {
  try {
    const [user, subscription, usage] = await Promise.all([
      getUserProfile(userId),
      getUserSubscription(userId),
      getUserUsage(userId)
    ])

    return { user, subscription, usage }
  } catch (error) {
    console.error('Error getting user with subscription:', error)
    throw error
  }
}

export async function canUserTransfer(
  userId: string,
  transferSizeGB: number
): Promise<{
  canTransfer: boolean
  reason?: string
  upgradeRequired?: boolean
  currentUsage?: UsageData
  subscription?: UserSubscription
}> {
  try {
    const { subscription, usage } = await getUserWithSubscription(userId)
    
    if (!subscription) {
      // User has no subscription, check against free tier
      const freePlan = SUBSCRIPTION_PLANS.find(p => p.id === 'free')!
      const currentUsage = usage || { userId, month: '', dataTransferred: 0, transferCount: 0, lastUpdated: new Date() }
      
      if (currentUsage.dataTransferred + transferSizeGB > freePlan.dataLimit) {
        return {
          canTransfer: false,
          reason: `Transfer would exceed your free tier limit of ${freePlan.dataLimit} GB per month`,
          upgradeRequired: true,
          currentUsage,
          subscription: null
        }
      }
      
      return {
        canTransfer: true,
        currentUsage,
        subscription: null
      }
    }

    // User has subscription, check against their plan limits
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId)
    if (!plan) {
      return {
        canTransfer: false,
        reason: 'Invalid subscription plan',
        currentUsage: usage,
        subscription
      }
    }

    const currentUsage = usage || { userId, month: '', dataTransferred: 0, transferCount: 0, lastUpdated: new Date() }
    
    if (currentUsage.dataTransferred + transferSizeGB > plan.dataLimit) {
      return {
        canTransfer: false,
        reason: `Transfer would exceed your ${plan.name} plan limit of ${plan.dataLimit} GB per month`,
        upgradeRequired: true,
        currentUsage,
        subscription
      }
    }

    return {
      canTransfer: true,
      currentUsage,
      subscription
    }
  } catch (error) {
    console.error('Error checking transfer eligibility:', error)
    throw error
  }
}
