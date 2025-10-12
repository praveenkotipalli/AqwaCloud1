"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Shield,
  Zap,
  ArrowRightLeft,
  ArrowRight,
  CheckCircle,
  Star,
  Clock,
  RotateCcw,
  Check,
  CreditCard,
  Lock,
  Eye,
  FileCheck,
  Mail,
  Phone,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function HomePage() {
  const { isAuthenticated, user, logout, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, loading, router])

  const handleLogoClick = () => {
    // Always scroll to top when on landing page
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-accent to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null
  }

  const features = [
    {
      icon: <ArrowRightLeft className="h-8 w-8" />,
      title: "Direct Cloud-to-Cloud",
      description:
        "Transfer files between Google Drive, Dropbox, OneDrive, iCloud, Box and more without using your local bandwidth.",
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Blazing Fast Speeds",
      description: "Optimized transfer routes ensure your files move as quickly as possible.",
    },
    {
      icon: <RotateCcw className="h-8 w-8" />,
      title: "Pause & Resume",
      description: "Full control over your transfers. Pause and resume anytime, from anywhere.",
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Schedule Transfers",
      description: "Set up transfers to run at a specific time that suits your workflow.",
    },
    {
      icon: <CheckCircle className="h-8 w-8" />,
      title: "Automatic Retries",
      description: "We handle temporary network issues gracefully so you don't have to.",
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Bank-Grade Security",
      description: "Your files and credentials are encrypted end-to-end. We never see your data.",
    },
  ]

  const stats = [
    { value: "50+", label: "Cloud Services" },
    { value: "99.9%", label: "Transfer Success" },
    { value: "10TB+", label: "Daily Transfers" },
    { value: "$0.10", label: "Per GB Transferred" },
  ]

  const cloudServices = [
    {
      name: "Google Drive",
      icon: "https://developers.google.com/drive/images/drive_icon.png",
      available: true,
    },
    {
      name: "OneDrive",
      icon: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg",
      available: true,
    },
    {
      name: "Dropbox",
      icon: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Dropbox_logo_2017.svg",
      available: false,
    },
    {
      name: "Box",
      icon: "https://upload.wikimedia.org/wikipedia/commons/5/57/Box%2C_Inc._logo.svg",
      available: false,
    },
    {
      name: "iCloud",
      icon: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Apple_iCloud_logo.svg",
      available: false,
    },
    {
      name: "AWS S3",
      icon: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Amazon-S3-Logo.svg",
      available: false,
    },
  ]

  const steps = [
    {
      number: "01",
      title: "Connect Your Clouds",
      description: "Securely link your cloud storage accounts with one-click authorization.",
    },
    {
      number: "02",
      title: "Select Files & Destination",
      description: "Browse your files and simply drag & drop to where you want them to go.",
    },
    {
      number: "03",
      title: "Start Your Transfer",
      description: 'Hit "transfer" and watch the magic happen. We handle the rest.',
    },
  ]

  const featureCards = [
    {
      name: "Completely Free",
      description: "No hidden fees, no subscriptions, no limits.",
      icon: "🎉",
      features: ["Unlimited transfers", "No registration needed", "No credit card required", "Fast transfer speed"],
      popular: true,
      cta: "Start Transferring",
    },
    {
      name: "Secure & Reliable",
      description: "Enterprise-grade security for all users.",
      icon: "🔒",
      features: [
        "End-to-end encryption",
        "Secure cloud connections",
        "Data privacy protection",
        "Reliable transfer technology",
      ],
      popular: false,
      cta: "Learn More",
    },
    {
      name: "Easy to Use",
      description: "Simple interface for complex transfers.",
      icon: "✨",
      features: ["Drag & drop interface", "Real-time progress", "Automatic retry", "Cross-platform support"],
      popular: false,
      cta: "Get Started",
    },
  ]

  const securityFeatures = [
    {
      icon: <Lock className="h-8 w-8" />,
      title: "End-to-End Encryption",
      description:
        "All file transfers are encrypted using AES-256 encryption. Your data is secure in transit and at rest.",
    },
    {
      icon: <Eye className="h-8 w-8" />,
      title: "Zero Knowledge Architecture",
      description:
        "We never see your files or credentials. All authentication happens directly with your cloud providers.",
    },
    {
      icon: <FileCheck className="h-8 w-8" />,
      title: "Compliance Ready",
      description: "SOC 2 Type II certified with GDPR and HIPAA compliance for enterprise customers.",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={handleLogoClick} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <Image src="/images/aqwa-logo.jpg" alt="AqwaCloud Logo" width={40} height={40} className="rounded-lg" />
            <span className="text-xl font-bold gradient-text">AqwaCloud</span>
          </button>

          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Security
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-accent to-blue-500 hover:from-accent/90 hover:to-blue-500/90"
              asChild
            >
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Badge variant="secondary" className="mb-6 bg-slate-800 text-slate-300 border-slate-700">
              <Star className="h-3 w-3 mr-1" />
              No Subscriptions • Pay-Per-Use
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Move Files Between Clouds. <span className="gradient-text">As Easy As Folders On Your PC.</span>
            </h1>

            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              AqwaCloud provides a unified platform to transfer files directly between any cloud storage services
              without downloading, with complete visibility and control.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                className="bg-gradient-to-r from-accent to-blue-500 hover:from-accent/90 hover:to-blue-500/90"
                asChild
              >
                <Link href="/signup">
                  Start Your First Transfer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-8 text-4xl">
              <div className="flex flex-col items-center">
                <div className="text-blue-400">☁️</div>
                <span className="text-sm text-slate-400 mt-2">Google Drive</span>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-accent animate-pulse" />
              <div className="flex flex-col items-center">
                <div className="text-cyan-400">☁️</div>
                <span className="text-sm text-slate-400 mt-2">OneDrive</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                <div className="text-slate-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-slate-800 text-slate-300 border-slate-700">
              Features
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Everything you need, <span className="gradient-text">nothing you don't.</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              AqwaCloud is packed with powerful features to make your multi-cloud life easier.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 group bg-slate-800 border-slate-700">
                  <CardHeader>
                    <div className="text-accent group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-slate-300 leading-relaxed">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Get Started in <span className="gradient-text">60 Seconds</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Three simple steps to effortless cloud transfers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-accent to-blue-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold mb-4 text-white">{step.title}</h3>
                <p className="text-slate-300 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Services Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Connect <span className="gradient-text">Any Cloud Service</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Transfer files between 50+ popular cloud storage services with just a few clicks.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {cloudServices.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="text-center p-6 hover:shadow-lg transition-all duration-300 bg-slate-800 border-slate-700 relative">
                  <div className="relative">
                    <Image
                      src={service.icon || "/placeholder.svg"}
                      alt={`${service.name} logo`}
                      width={40}
                      height={40}
                      className="mx-auto mb-3 rounded-lg"
                    />
                    {!service.available && (
                      <div className="absolute -top-2 -right-2">
                        <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300 border-slate-600">
                          Coming Soon
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="font-medium text-sm text-white">{service.name}</div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-slate-400">And 44+ more services supported</p>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-slate-800 text-slate-300 border-slate-700">
              <CreditCard className="h-3 w-3 mr-1" />
              No Subscriptions • No Hidden Fees
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Why Choose <span className="gradient-text">AqwaCloud</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Completely free. No subscriptions. No hidden fees. No limits.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featureCards.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card
                  className={`h-full relative bg-slate-800 ${feature.popular ? "border-accent shadow-lg" : "border-slate-700"}`}
                >
                  {feature.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-accent to-blue-500 text-white">Most Popular</Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-8">
                    <div className="text-6xl mb-4">{feature.icon}</div>
                    <CardTitle className="text-2xl text-white">{feature.name}</CardTitle>
                    <CardDescription className="text-base text-slate-300">{feature.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {feature.features.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-center space-x-3">
                          <Check className="h-4 w-4 text-accent flex-shrink-0" />
                          <span className="text-sm text-slate-300">{item}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full ${feature.popular ? "bg-gradient-to-r from-accent to-blue-500 hover:from-accent/90 hover:to-blue-500/90" : "border-slate-600 text-white hover:bg-slate-700"}`}
                      variant={feature.popular ? "default" : "outline"}
                      asChild
                    >
                      <Link href="/transfer">
                        {feature.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-slate-800 text-slate-300 border-slate-700">
              Security
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Your Data is <span className="gradient-text">Always Protected</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Enterprise-grade security measures ensure your files and credentials are never compromised.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full text-center bg-slate-800 border-slate-700">
                  <CardHeader>
                    <div className="text-accent mx-auto mb-4">{feature.icon}</div>
                    <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-slate-300 leading-relaxed">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-slate-800 text-slate-300 border-slate-700">
              Contact
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Get in <span className="gradient-text">Touch</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Have questions about AqwaCloud? We're here to help you get started.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Details */}
            <div className="space-y-8">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Mail className="h-5 w-5 mr-2 text-accent" />
                    Email Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 mb-4">Get help with your transfers or account</p>
                  <div className="space-y-2">
                    <p className="text-slate-400 text-sm">
                      <Badge variant="outline" className="border-slate-600 text-slate-400">
                        Coming Soon
                      </Badge>
                    </p>
                    <p className="text-slate-500 text-sm">support@aqwacloud.com</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-accent" />
                    Enterprise Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 mb-4">Discuss custom solutions for your business</p>
                  <div className="space-y-2">
                    <p className="text-slate-400 text-sm">
                      <Badge variant="outline" className="border-slate-600 text-slate-400">
                        Coming Soon
                      </Badge>
                    </p>
                    <p className="text-slate-500 text-sm">sales@aqwacloud.com</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Send us a Message</CardTitle>
                <CardDescription className="text-slate-300">
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-slate-300">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-slate-300">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-slate-300">
                      Subject
                    </Label>
                    <Input
                      id="subject"
                      placeholder="How can we help?"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-slate-300">
                      Message
                    </Label>
                    <textarea
                      id="message"
                      rows={4}
                      placeholder="Tell us more about your inquiry..."
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-accent to-blue-500 hover:from-accent/90 hover:to-blue-500/90"
                  >
                    Send Message
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="gradient-border bg-slate-800/50">
            <CardContent className="p-12 text-center">
              <h3 className="text-3xl font-bold mb-4 text-white">Ready to Simplify Your File Transfers?</h3>
              <p className="text-xl text-slate-300 mb-8">
                Join thousands of users who have already transferred over 10TB of files with AqwaCloud.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-accent to-blue-500 hover:from-accent/90 hover:to-blue-500/90"
                  asChild
                >
                  <Link href="/signup">Start Your First Transfer</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-700 bg-transparent"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  View Pricing
                </Button>
              </div>
              <div className="flex items-center justify-center mt-6 text-sm text-slate-400">
                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                No credit card required • Pay only for what you use
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-700">
        <div className="max-w-7xl mx-auto text-center">
          <button
            onClick={handleLogoClick}
            className="flex items-center justify-center space-x-3 mb-4 hover:opacity-80 transition-opacity"
          >
            <Image src="/images/aqwa-logo.jpg" alt="AqwaCloud Logo" width={24} height={24} className="rounded-md" />
            <span className="font-bold gradient-text">AqwaCloud</span>
          </button>
          <p className="text-slate-400 mb-4">The simplest way to move files between your cloud storage services.</p>
          <p className="text-slate-500">© 2024 AqwaCloud. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
