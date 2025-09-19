// Subscription and pricing configuration
export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number // in cents
  currency: string
  interval: 'month' | 'year'
  dataLimit: number // in GB
  features: string[]
  stripePriceId?: string
  popular?: boolean
}

export interface UserSubscription {
  id: string
  userId: string
  planId: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  stripeSubscriptionId?: string
  stripeCustomerId?: string
}

export interface UsageData {
  userId: string
  month: string // YYYY-MM format
  dataTransferred: number // in GB
  transferCount: number
  lastUpdated: Date
}

// Pricing tiers configuration
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out our service',
    price: 0,
    currency: 'usd',
    interval: 'month',
    dataLimit: 1, // 1 GB
    features: [
      '1 GB transfer per month',
      'Basic file transfers',
      'Standard support',
      'Up to 10 files per transfer'
    ]
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Great for individual users',
    price: 500, // $5.00
    currency: 'usd',
    interval: 'month',
    dataLimit: 50, // 50 GB
    features: [
      '50 GB transfer per month',
      'Priority transfers',
      'Email support',
      'Up to 100 files per transfer',
      'Transfer scheduling',
      'Resume failed transfers'
    ],
    popular: true
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For power users and small teams',
    price: 1200, // $12.00
    currency: 'usd',
    interval: 'month',
    dataLimit: 250, // 250 GB
    features: [
      '250 GB transfer per month',
      'Priority transfers',
      'Priority support',
      'Unlimited files per transfer',
      'Advanced scheduling',
      'Parallel transfers',
      'Transfer analytics',
      'API access'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 5000, // $50.00
    currency: 'usd',
    interval: 'month',
    dataLimit: 1000, // 1 TB
    features: [
      '1 TB transfer per month',
      'Highest priority transfers',
      'Dedicated support',
      'Unlimited files per transfer',
      'Advanced scheduling',
      'Parallel transfers',
      'Transfer analytics',
      'Full API access',
      'Custom integrations',
      'SLA guarantee'
    ]
  }
]

// Usage calculation utilities
export function calculateTransferCost(dataSizeGB: number, plan: SubscriptionPlan): number {
  if (plan.id === 'free') {
    return 0 // Free tier
  }
  
  // Calculate cost per GB based on plan
  const costPerGB = plan.price / plan.dataLimit
  return Math.ceil(dataSizeGB * costPerGB)
}

export function formatCurrency(amountInCents: number, currency: string = 'usd'): string {
  const amount = amountInCents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount)
}

export function formatDataSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function bytesToGB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024)
}

export function gbToBytes(gb: number): number {
  return gb * 1024 * 1024 * 1024
}

// Plan comparison utilities
export function canUserTransfer(userPlan: SubscriptionPlan, userUsage: UsageData, transferSizeGB: number): {
  canTransfer: boolean
  reason?: string
  upgradeRequired?: boolean
} {
  if (userPlan.id === 'free') {
    // Free tier has monthly limit
    if (userUsage.dataTransferred + transferSizeGB > userPlan.dataLimit) {
      return {
        canTransfer: false,
        reason: `Transfer would exceed your free tier limit of ${userPlan.dataLimit} GB per month`,
        upgradeRequired: true
      }
    }
  } else {
    // Paid tiers have monthly limits
    if (userUsage.dataTransferred + transferSizeGB > userPlan.dataLimit) {
      return {
        canTransfer: false,
        reason: `Transfer would exceed your ${userPlan.name} plan limit of ${userPlan.dataLimit} GB per month`,
        upgradeRequired: true
      }
    }
  }
  
  return { canTransfer: true }
}

export function getRecommendedPlan(currentUsage: UsageData): SubscriptionPlan {
  const usageGB = currentUsage.dataTransferred
  
  if (usageGB <= 1) {
    return SUBSCRIPTION_PLANS[0] // Free
  } else if (usageGB <= 50) {
    return SUBSCRIPTION_PLANS[1] // Personal
  } else if (usageGB <= 250) {
    return SUBSCRIPTION_PLANS[2] // Pro
  } else {
    return SUBSCRIPTION_PLANS[3] // Enterprise
  }
}
