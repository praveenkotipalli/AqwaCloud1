"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Cloud } from "lucide-react"

export default function AdminAnalyticsPage() {
  const { user, isAuthenticated, loading } = useAuth() as any
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) {
      router.replace('/dashboard')
    }
  }, [loading, isAuthenticated, user?.role, router])

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/admin" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-accent to-secondary rounded-lg flex items-center justify-center">
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AqwaCloud Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin">Back</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-24 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vercel Web Analytics</CardTitle>
              <CardDescription>
                Basic analytics are enabled globally. For full dashboards, use your Vercel project Analytics tab.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>We added the analytics script site-wide. Page views and performance events will appear in Vercel within ~30s after deploy.</p>
                <p>If you have ad blockers enabled, analytics events may be blocked locally.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


