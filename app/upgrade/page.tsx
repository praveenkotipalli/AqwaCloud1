"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Cloud, ArrowLeft, Check, Zap, Shield, CheckCircle, CreditCard, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

interface Plan {
  id: string
  name: string
  price: number
  period: string
  description: string
  features: string[]
  popular?: boolean
  current?: boolean
}

export default function UpgradePage() {
  const { isAuthenticated, user, loading } = useAuth()
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [paymentStep, setPaymentStep] = useState<"select" | "confirm" | "processing" | "success">("select")

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  const plans: Plan[] = [
    {
      id: "free",
      name: "Free",
      price: 0,
      period: "forever",
      description: "Perfect for trying out AqwaCloud",
      features: [
        "Up to 1 GB transfers per month",
        "Basic cloud service connections",
        "Email support",
        "Standard transfer speed",
      ],
      current: user?.plan === "free" || !user?.plan,
    },
    {
      id: "pro",
      name: "Pro",
      price: 9.99,
      period: "month",
      description: "Great for individuals and small teams",
      features: [
        "Up to 100 GB transfers per month",
        "All cloud service connections",
        "Priority email support",
        "Fast transfer speed",
        "Transfer scheduling",
        "Advanced analytics",
      ],
      popular: true,
      current: user?.plan === "pro",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 29.99,
      period: "month",
      description: "For businesses with high-volume needs",
      features: [
        "Unlimited transfers",
        "All cloud service connections",
        "24/7 phone & email support",
        "Fastest transfer speed",
        "Advanced scheduling & automation",
        "Team management",
        "Custom integrations",
        "SLA guarantee",
      ],
      current: user?.plan === "enterprise",
    },
  ]

  const handleSelectPlan = (planId: string) => {
    if (planId === "free" || planId === user?.plan) return
    setSelectedPlan(planId)
    setPaymentStep("confirm")
  }

  const handleConfirmUpgrade = () => {
    setPaymentStep("processing")
    setIsProcessing(true)

    // Simulate payment processing
    setTimeout(() => {
      setPaymentStep("success")
      setIsProcessing(false)
      setShowSuccess(true)
    }, 3000)
  }

  const selectedPlanDetails = plans.find((p) => p.id === selectedPlan)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Cloud className="h-5 w-5 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (paymentStep === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="h-8 w-8 text-green-600" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-3xl font-bold mb-4">Welcome to {selectedPlanDetails?.name}!</h1>
            <p className="text-muted-foreground mb-8">
              Your account has been successfully upgraded. You now have access to all {selectedPlanDetails?.name}{" "}
              features.
            </p>
            <div className="space-y-4">
              <Button className="w-full bg-accent hover:bg-accent/90" asChild>
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <Link href="/transfer">Start Your First Transfer</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (paymentStep === "processing") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="w-16 h-16 bg-gradient-to-r from-accent to-secondary rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CreditCard className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-4">Processing Payment...</h1>
          <p className="text-muted-foreground">Please wait while we process your payment and upgrade your account.</p>
        </div>
      </div>
    )
  }

  if (paymentStep === "confirm") {
    return (
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center">
                <Cloud className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">AqwaCloud</span>
            </Link>

            <div className="flex items-center space-x-4">
              <Badge variant="secondary">Upgrade Confirmation</Badge>
              <Button variant="outline" size="sm" onClick={() => setPaymentStep("select")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Plans
              </Button>
            </div>
          </div>
        </nav>

        <div className="pt-24 pb-12 px-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">Confirm Your Upgrade</h1>
              <p className="text-xl text-muted-foreground">Review your plan selection and complete payment</p>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedPlanDetails?.name} Plan</div>
                    <div className="text-sm text-muted-foreground">{selectedPlanDetails?.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${selectedPlanDetails?.price}</div>
                    <div className="text-sm text-muted-foreground">per {selectedPlanDetails?.period}</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">What you'll get:</h4>
                  <ul className="space-y-1">
                    {selectedPlanDetails?.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div className="flex items-center justify-between font-bold">
                  <span>Total</span>
                  <span>
                    ${selectedPlanDetails?.price}/{selectedPlanDetails?.period}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center">
                      <span className="text-xs text-white font-bold">VISA</span>
                    </div>
                    <div>
                      <div className="font-medium">•••• 4242</div>
                      <div className="text-sm text-muted-foreground">Expires 12/26</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/payment-methods">Change</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-4">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setPaymentStep("select")}>
                Back to Plans
              </Button>
              <Button className="flex-1 bg-accent hover:bg-accent/90" onClick={handleConfirmUpgrade}>
                Complete Upgrade
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2">
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-5xl font-bold mb-4">Choose Your Plan</h1>
              <p className="text-xl text-muted-foreground">
                Scale your file transfers with the perfect plan for your needs
              </p>
            </motion.div>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative ${plan.popular ? "scale-105" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-accent text-white">Most Popular</Badge>
                  </div>
                )}

                <Card
                  className={`h-full ${plan.popular ? "border-accent shadow-lg" : ""} ${plan.current ? "bg-muted/30" : ""}`}
                >
                  <CardHeader className="text-center">
                    <div className="mb-4">
                      {plan.id === "free" && <Cloud className="h-12 w-12 mx-auto text-muted-foreground" />}
                      {plan.id === "pro" && <Zap className="h-12 w-12 mx-auto text-accent" />}
                      {plan.id === "enterprise" && <Shield className="h-12 w-12 mx-auto text-secondary" />}
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <Check className="h-4 w-4 text-green-600 mr-3 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-4">
                      {plan.current ? (
                        <Button className="w-full" disabled>
                          Current Plan
                        </Button>
                      ) : plan.id === "free" ? (
                        <Button variant="outline" className="w-full bg-transparent" disabled>
                          Downgrade Available
                        </Button>
                      ) : (
                        <Button
                          className={`w-full ${plan.popular ? "bg-accent hover:bg-accent/90" : ""}`}
                          onClick={() => handleSelectPlan(plan.id)}
                        >
                          Upgrade to {plan.name}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div>
                <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
                <p className="text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
                <p className="text-muted-foreground">
                  We accept all major credit cards including Visa, Mastercard, and American Express.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Is there a free trial?</h3>
                <p className="text-muted-foreground">
                  Our Free plan gives you 1 GB of transfers per month to try out AqwaCloud at no cost.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
                <p className="text-muted-foreground">Yes, we offer a 30-day money-back guarantee for all paid plans.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
