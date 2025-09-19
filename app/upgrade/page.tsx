"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Cloud,
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  Zap,
  Shield,
  Users,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useSubscription } from "@/hooks/use-subscription"
import { SUBSCRIPTION_PLANS, formatCurrency, formatDataSize } from "@/lib/subscription"
import { getStripe } from "@/lib/stripe"
import { auth } from "@/lib/firebase"

function UpgradeContent() {
  const { isAuthenticated, user, loading } = useAuth()
  const { subscription, usage, currentPlan, refreshSubscription } = useSubscription()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loadingUpgrade, setLoadingUpgrade] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const planParam = searchParams.get('plan')

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (planParam) {
      setSelectedPlan(planParam)
    }
  }, [planParam])

  const handleUpgrade = async (planId: string) => {
    if (!user) return

    try {
      setLoadingUpgrade(planId)
      
      // Get Firebase auth token
      const token = await auth.currentUser?.getIdToken()
      
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()
      
      // Redirect to Stripe Checkout
      const stripe = await getStripe()
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId })
      }
    } catch (error) {
      console.error('Error upgrading plan:', error)
      // Handle error (show toast, etc.)
    } finally {
      setLoadingUpgrade(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Cloud className="h-5 w-5 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const currentUsage = usage || { dataTransferred: 0, transferCount: 0 }
  const monthlyLimit = currentPlan?.dataLimit || 1
  const usagePercentage = (currentUsage.dataTransferred / monthlyLimit) * 100

  // Filter out free plan and current plan
  const availablePlans = SUBSCRIPTION_PLANS.filter(plan => 
    plan.id !== 'free' && plan.id !== currentPlan?.id
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center">
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AqwaCloud</span>
          </Link>

          <div className="flex items-center space-x-4">
            <Badge variant="secondary">Upgrade Plan</Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-4xl font-bold mb-4">Upgrade Your Plan</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Get more transfer capacity and premium features
              </p>
            </motion.div>
          </div>

          {/* Current Usage */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Current Usage
                </CardTitle>
                <CardDescription>
                  Your {currentPlan?.name || "Free"} plan usage this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Data Transferred</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDataSize(currentUsage.dataTransferred * 1024 * 1024 * 1024)} / {formatDataSize(monthlyLimit * 1024 * 1024 * 1024)}
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Transfers</span>
                    <span className="text-sm text-muted-foreground">{currentUsage.transferCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Available Plans */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {availablePlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative ${plan.popular ? 'md:scale-105' : ''} ${selectedPlan === plan.id ? 'ring-2 ring-accent' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-accent to-secondary text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <Card className={`h-full cursor-pointer transition-all ${selectedPlan === plan.id ? 'border-accent shadow-lg' : 'hover:shadow-md'}`} onClick={() => setSelectedPlan(plan.id)}>
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold gradient-text">
                        {formatCurrency(plan.price, plan.currency)}
                      </span>
                      <span className="text-muted-foreground">/{plan.interval}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Features */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">Features</h4>
                      <ul className="space-y-2">
                        {plan.features.slice(0, 4).map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start space-x-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                        </li>
                      ))}
                        {plan.features.length > 4 && (
                          <li className="text-sm text-muted-foreground">
                            +{plan.features.length - 4} more features
                          </li>
                        )}
                    </ul>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                        <Button
                        variant={plan.popular ? "default" : "outline"}
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUpgrade(plan.id)
                        }}
                        disabled={loadingUpgrade === plan.id}
                      >
                        {loadingUpgrade === plan.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          `Upgrade to ${plan.name}`
                        )}
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Benefits Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-16"
          >
            <h2 className="text-3xl font-bold text-center mb-8">Why Upgrade?</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Priority Processing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                <p className="text-muted-foreground">
                    Get faster transfer speeds and priority processing for your files. 
                    Your transfers will be processed before free tier users.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Enhanced Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                <p className="text-muted-foreground">
                    Advanced encryption and security features to protect your data 
                    during transfers with enterprise-grade protection.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Priority Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                <p className="text-muted-foreground">
                    Get dedicated support with faster response times and 
                    priority assistance for any issues or questions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UpgradeContent />
    </Suspense>
  )
}