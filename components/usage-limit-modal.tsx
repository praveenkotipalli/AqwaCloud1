"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertTriangle,
  Zap,
  Check,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { SUBSCRIPTION_PLANS, formatDataSize, formatCurrency } from "@/lib/subscription"

interface UsageLimitModalProps {
  isOpen: boolean
  onClose: () => void
  currentUsage: {
    dataTransferred: number
    transferCount: number
  }
  currentPlan: any
  transferSizeGB: number
  onUpgrade: (planId: string) => void
  loadingUpgrade?: string | null
}

export function UsageLimitModal({
  isOpen,
  onClose,
  currentUsage,
  currentPlan,
  transferSizeGB,
  onUpgrade,
  loadingUpgrade
}: UsageLimitModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const monthlyLimit = currentPlan?.dataLimit || 1
  const usagePercentage = (currentUsage.dataTransferred / monthlyLimit) * 100
  const newUsagePercentage = ((currentUsage.dataTransferred + transferSizeGB) / monthlyLimit) * 100

  // Get recommended plans (excluding free and current plan)
  const recommendedPlans = SUBSCRIPTION_PLANS.filter(plan => 
    plan.id !== 'free' && 
    plan.id !== currentPlan?.id && 
    plan.dataLimit > currentUsage.dataTransferred + transferSizeGB
  ).slice(0, 3)

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId)
    onUpgrade(planId)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <AlertTriangle className="h-6 w-6 mr-2 text-orange-500" />
            Transfer Limit Exceeded
          </DialogTitle>
          <DialogDescription>
            This transfer would exceed your {currentPlan?.name || "Free"} plan limit. 
            Upgrade to continue with your transfer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Usage</CardTitle>
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

          {/* Transfer Impact */}
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <CardHeader>
              <CardTitle className="text-lg text-orange-800 dark:text-orange-200">
                Transfer Impact
              </CardTitle>
              <CardDescription className="text-orange-700 dark:text-orange-300">
                This transfer would add {formatDataSize(transferSizeGB * 1024 * 1024 * 1024)} to your usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Current Usage</span>
                  <span className="text-sm">{usagePercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">After Transfer</span>
                  <span className="text-sm text-orange-600 dark:text-orange-400">
                    {newUsagePercentage.toFixed(1)}% (Exceeds Limit)
                  </span>
                </div>
                <Progress value={Math.min(newUsagePercentage, 100)} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Recommended Plans */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recommended Plans</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {recommendedPlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`relative ${plan.popular ? 'md:scale-105' : ''} ${selectedPlan === plan.id ? 'ring-2 ring-accent' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-accent to-secondary text-white px-3 py-1 text-xs">
                        Popular
                      </Badge>
                    </div>
                  )}
                  
                  <Card className={`h-full cursor-pointer transition-all ${selectedPlan === plan.id ? 'border-accent shadow-lg' : 'hover:shadow-md'}`} onClick={() => setSelectedPlan(plan.id)}>
                    <CardHeader className="text-center pb-3">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="mt-2">
                        <span className="text-2xl font-bold gradient-text">
                          {formatCurrency(plan.price, plan.currency)}
                        </span>
                        <span className="text-muted-foreground text-sm">/{plan.interval}</span>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Key Features */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">Key Features</h4>
                        <ul className="space-y-1">
                          {plan.features.slice(0, 3).map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-start space-x-2 text-xs">
                              <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Action Button */}
                      <Button 
                        variant={plan.popular ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUpgrade(plan.id)
                        }}
                        disabled={loadingUpgrade === plan.id}
                      >
                        {loadingUpgrade === plan.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Upgrade Now
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Zap className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Why Upgrade?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {formatDataSize(recommendedPlans[0]?.dataLimit * 1024 * 1024 * 1024 || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Monthly Transfer Limit</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    Priority
                  </div>
                  <div className="text-sm text-muted-foreground">Faster Transfers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    24/7
                  </div>
                  <div className="text-sm text-muted-foreground">Support</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel Transfer
            </Button>
            <Button asChild>
              <Link href="/pricing">
                View All Plans
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
