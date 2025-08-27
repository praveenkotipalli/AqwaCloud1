"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Cloud, ArrowLeft, CreditCard, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

interface PaymentMethod {
  id: string
  type: "visa" | "mastercard" | "amex"
  last4: string
  expiryMonth: string
  expiryYear: string
  isDefault: boolean
  billingAddress: {
    name: string
    line1: string
    city: string
    state: string
    zip: string
    country: string
  }
}

export default function PaymentMethodsPage() {
  const { isAuthenticated, user, loading } = useAuth()
  const router = useRouter()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: "pm_1",
      type: "visa",
      last4: "4242",
      expiryMonth: "12",
      expiryYear: "26",
      isDefault: true,
      billingAddress: {
        name: "John Doe",
        line1: "123 Main St",
        city: "San Francisco",
        state: "CA",
        zip: "94105",
        country: "US",
      },
    },
  ])
  const [showAddCard, setShowAddCard] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  // Form state for adding new card
  const [newCard, setNewCard] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
    name: "",
    line1: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  })

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  const handleAddCard = async () => {
    setIsProcessing(true)
    setErrorMessage("")

    // Simulate API call
    setTimeout(() => {
      const cardType = newCard.cardNumber.startsWith("4")
        ? "visa"
        : newCard.cardNumber.startsWith("5")
          ? "mastercard"
          : "amex"

      const newPaymentMethod: PaymentMethod = {
        id: `pm_${Date.now()}`,
        type: cardType,
        last4: newCard.cardNumber.slice(-4),
        expiryMonth: newCard.expiryMonth,
        expiryYear: newCard.expiryYear,
        isDefault: paymentMethods.length === 0,
        billingAddress: {
          name: newCard.name,
          line1: newCard.line1,
          city: newCard.city,
          state: newCard.state,
          zip: newCard.zip,
          country: newCard.country,
        },
      }

      setPaymentMethods([...paymentMethods, newPaymentMethod])
      setSuccessMessage("Payment method added successfully!")
      setShowAddCard(false)
      setNewCard({
        cardNumber: "",
        expiryMonth: "",
        expiryYear: "",
        cvc: "",
        name: "",
        line1: "",
        city: "",
        state: "",
        zip: "",
        country: "US",
      })
      setIsProcessing(false)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000)
    }, 2000)
  }

  const handleSetDefault = (id: string) => {
    setPaymentMethods((methods) =>
      methods.map((method) => ({
        ...method,
        isDefault: method.id === id,
      })),
    )
    setSuccessMessage("Default payment method updated!")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const handleDeleteCard = (id: string) => {
    setPaymentMethods((methods) => methods.filter((method) => method.id !== id))
    setSuccessMessage("Payment method removed!")
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const getCardIcon = (type: PaymentMethod["type"]) => {
    const baseClasses = "w-8 h-6 rounded flex items-center justify-center text-xs text-white font-bold"
    switch (type) {
      case "visa":
        return <div className={`${baseClasses} bg-gradient-to-r from-blue-500 to-blue-600`}>VISA</div>
      case "mastercard":
        return <div className={`${baseClasses} bg-gradient-to-r from-red-500 to-orange-500`}>MC</div>
      case "amex":
        return <div className={`${baseClasses} bg-gradient-to-r from-green-500 to-teal-500`}>AMEX</div>
      default:
        return <CreditCard className="h-6 w-6" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Cloud className="h-5 w-5 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading payment methods...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
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
            <Badge variant="secondary">Payment Methods</Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/billing">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Billing
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-4xl font-bold mb-2">Payment Methods</h1>
              <p className="text-xl text-muted-foreground">Manage your payment methods and billing information</p>
            </motion.div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Payment Methods */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Saved Payment Methods
                  </CardTitle>
                  <CardDescription>Manage your credit cards and payment information</CardDescription>
                </div>
                <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
                  <DialogTrigger asChild>
                    <Button className="bg-accent hover:bg-accent/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Payment Method</DialogTitle>
                      <DialogDescription>Add a new credit or debit card to your account</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                      {/* Card Information */}
                      <div className="space-y-4">
                        <h3 className="font-medium">Card Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label htmlFor="cardNumber">Card Number</Label>
                            <Input
                              id="cardNumber"
                              placeholder="1234 5678 9012 3456"
                              value={newCard.cardNumber}
                              onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="expiryMonth">Expiry Month</Label>
                            <Select
                              value={newCard.expiryMonth}
                              onValueChange={(value) => setNewCard({ ...newCard, expiryMonth: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Month" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (
                                  <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>
                                    {String(i + 1).padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="expiryYear">Expiry Year</Label>
                            <Select
                              value={newCard.expiryYear}
                              onValueChange={(value) => setNewCard({ ...newCard, expiryYear: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Year" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 10 }, (_, i) => (
                                  <SelectItem key={i} value={String(new Date().getFullYear() + i).slice(-2)}>
                                    {new Date().getFullYear() + i}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="cvc">CVC</Label>
                            <Input
                              id="cvc"
                              placeholder="123"
                              value={newCard.cvc}
                              onChange={(e) => setNewCard({ ...newCard, cvc: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Billing Address */}
                      <div className="space-y-4">
                        <h3 className="font-medium">Billing Address</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              placeholder="John Doe"
                              value={newCard.name}
                              onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="line1">Address</Label>
                            <Input
                              id="line1"
                              placeholder="123 Main Street"
                              value={newCard.line1}
                              onChange={(e) => setNewCard({ ...newCard, line1: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              placeholder="San Francisco"
                              value={newCard.city}
                              onChange={(e) => setNewCard({ ...newCard, city: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="state">State</Label>
                            <Input
                              id="state"
                              placeholder="CA"
                              value={newCard.state}
                              onChange={(e) => setNewCard({ ...newCard, state: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="zip">ZIP Code</Label>
                            <Input
                              id="zip"
                              placeholder="94105"
                              value={newCard.zip}
                              onChange={(e) => setNewCard({ ...newCard, zip: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="country">Country</Label>
                            <Select
                              value={newCard.country}
                              onValueChange={(value) => setNewCard({ ...newCard, country: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="US">United States</SelectItem>
                                <SelectItem value="CA">Canada</SelectItem>
                                <SelectItem value="GB">United Kingdom</SelectItem>
                                <SelectItem value="AU">Australia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowAddCard(false)} disabled={isProcessing}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddCard} disabled={isProcessing}>
                          {isProcessing ? "Adding..." : "Add Payment Method"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map((method, index) => (
                  <motion.div
                    key={method.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      {getCardIcon(method.type)}
                      <div>
                        <div className="font-medium">•••• {method.last4}</div>
                        <div className="text-sm text-muted-foreground">
                          Expires {method.expiryMonth}/{method.expiryYear} • {method.billingAddress.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {method.isDefault && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Default
                        </Badge>
                      )}
                      {!method.isDefault && (
                        <Button variant="outline" size="sm" onClick={() => handleSetDefault(method.id)}>
                          Set as Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCard(method.id)}
                        disabled={paymentMethods.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}

                {paymentMethods.length === 0 && (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No payment methods</h3>
                    <p className="text-muted-foreground mb-4">Add a payment method to start using AqwaCloud</p>
                    <Button onClick={() => setShowAddCard(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Payment Method
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
