"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cloud, ArrowLeft, Check, ArrowRight, CreditCard } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

export default function PricingPage() {
  const { isAuthenticated } = useAuth()

  const plans = [
    {
      name: "Free Tier",
      description: "Perfect for small, quick transfers.",
      price: "$0",
      unit: "",
      features: ["First 1GB is FREE", "No registration needed", "No credit card required", "Standard transfer speed"],
      popular: false,
      cta: "Start Transferring",
    },
    {
      name: "Pay-Per-GB",
      description: "Simple, transparent pricing for larger transfers.",
      price: "$0.10",
      unit: "/ GB",
      features: [
        "All free tier features, plus:",
        "$0.50 minimum charge",
        "Guest checkout available",
        "Priority transfer speed",
      ],
      popular: true,
      cta: "Start a Paid Transfer",
    },
    {
      name: "Enterprise",
      description: "For large-scale migrations and businesses.",
      price: "Custom",
      unit: "",
      features: ["Volume discounts", "Dedicated support & SLA", "Advanced reporting", "Custom integrations"],
      popular: false,
      cta: "Contact Sales",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-accent to-blue-500 rounded-lg flex items-center justify-center">
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AqwaCloud</span>
          </Link>

          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700">
              Pricing
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-white hover:bg-slate-700 bg-transparent"
              asChild
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <Badge variant="secondary" className="mb-6 bg-slate-800 text-slate-300 border-slate-700">
                <CreditCard className="h-3 w-3 mr-1" />
                No Subscriptions • No Hidden Fees
              </Badge>

              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-white">
                Simple, <span className="gradient-text">Transparent Pricing</span>
              </h1>

              <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                No subscriptions. No hidden fees. Pay only for what you transfer.
              </p>
            </motion.div>
          </div>

          {/* Pricing Plans */}
          <section className="mb-20">
            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card
                    className={`h-full relative bg-slate-800 ${plan.popular ? "border-accent shadow-lg" : "border-slate-700"}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-accent to-blue-500 text-white">Most Popular</Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-8">
                      <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                      <CardDescription className="text-base text-slate-300">{plan.description}</CardDescription>

                      <div className="pt-4">
                        <div className="text-4xl font-bold gradient-text">{plan.price}</div>
                        <div className="text-slate-400">{plan.unit}</div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <ul className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center space-x-3">
                            <Check className="h-4 w-4 text-accent flex-shrink-0" />
                            <span className="text-sm text-slate-300">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={`w-full ${plan.popular ? "bg-gradient-to-r from-accent to-blue-500 hover:from-accent/90 hover:to-blue-500/90" : "border-slate-600 text-white hover:bg-slate-700"}`}
                        variant={plan.popular ? "default" : "outline"}
                        asChild
                      >
                        {plan.name === "Enterprise" ? (
                          <Link href="/contact">
                            {plan.cta}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        ) : (
                          <Link href={isAuthenticated ? "/transfer" : "/signup"}>
                            {plan.cta}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
