"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { LogOut, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function AdminContent() {
  const { user, isAuthenticated, loading, logout } = useAuth() as any
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [query, setQuery] = useState<string>("")
  const [roleFilter, setRoleFilter] = useState<'all'|'user'|'admin'>('all')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<{ totalIncomeCents: number; monthIncomeCents: number } | null>(null)
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false)

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) {
      router.replace('/dashboard')
    }
  }, [loading, isAuthenticated, user?.role, router])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetricsLoading(true)
        const res = await fetch('/api/admin/metrics')
        const data = await res.json()
        setMetrics({ totalIncomeCents: data.totalIncomeCents || 0, monthIncomeCents: data.monthIncomeCents || 0 })
        if (Array.isArray(data.users) && data.users.length > 0) {
          setUsers(prev => prev.map(u => {
            const m = data.users.find((x: any) => x.id === u.id)
            return m ? { ...u, ...m } : u
          }))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setMetricsLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  const totalUsers = users.length
  const adminCount = users.filter(u => u.role === 'admin').length

  const filteredUsers = users.filter(u => {
    const q = (query || '').toLowerCase()
    const matchesQuery = !q || (u.email||'').toLowerCase().includes(q) || (u.name||'').toLowerCase().includes(q)
    const matchesRole = roleFilter === 'all' ? true : (u.role === roleFilter)
    return matchesQuery && matchesRole
  })

  const handleRole = async (id: string, role: 'user'|'admin') => {
    try {
      setUpdatingId(id)
      await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, role }) })
      await fetchUsers()
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user profile? This cannot be undone.')) return
    try {
      setUpdatingId(id)
      await fetch(`/api/admin/user?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      await fetchUsers()
    } finally {
      setUpdatingId(null)
    }
  }

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
              <Link href="/admin/analytics">Analytics</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard?asUser=1')}>User View</Button>
            <Button size="sm" variant="outline" onClick={() => logout?.()}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </nav>
      <div className="pt-24 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Monitor</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admins: {adminCount}</Badge>
            <Badge variant="outline">Total Users: {totalUsers}</Badge>
            <Button variant="outline" onClick={fetchUsers} disabled={loadingUsers}>Refresh</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by email or name"
            className="w-full border border-border rounded-md px-3 py-2 bg-background"
          />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as any)}
            className="w-full border border-border rounded-md px-3 py-2 bg-background"
          >
            <option value="all">All roles</option>
            <option value="admin">Admins</option>
            <option value="user">Users</option>
          </select>
          <div className="flex gap-2">
            <Button variant="outline" className="w-full" onClick={() => { setQuery(""); setRoleFilter('all') }}>Clear</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total Income</CardTitle></CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                <div className="text-2xl font-bold gradient-text">${((metrics?.totalIncomeCents||0)/100).toFixed(2)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Income This Month</CardTitle></CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                <div className="text-2xl font-bold gradient-text">${((metrics?.monthIncomeCents||0)/100).toFixed(2)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Admins</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold gradient-text">{adminCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total Users</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold gradient-text">{totalUsers}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage roles and accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Month Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Month Data</TableHead>
                    <TableHead>Total Data</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  )}
                  {!loadingUsers && filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">No users found</TableCell>
                    </TableRow>
                  )}
                  {!loadingUsers && filteredUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>{u.email || '—'}</TableCell>
                      <TableCell>{u.name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'secondary' : 'outline'}>{u.role || 'user'}</Badge>
                      </TableCell>
                      <TableCell>{u.plan || 'free'}</TableCell>
                      <TableCell>${(((u.monthCostCents||0))/100).toFixed(2)}</TableCell>
                      <TableCell>${(((u.totalCostCents||0))/100).toFixed(2)}</TableCell>
                      <TableCell>{formatBytes(u.monthBytes||0)}</TableCell>
                      <TableCell>{formatBytes(u.totalBytes||0)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {u.role === 'admin' ? (
                          <Button size="sm" variant="outline" onClick={() => handleRole(u.id, 'user')} disabled={updatingId===u.id}>Make User</Button>
                        ) : (
                          <Button size="sm" onClick={() => handleRole(u.id, 'admin')} disabled={updatingId===u.id}>Make Admin</Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(u.id)} disabled={updatingId===u.id}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminContent />
    </Suspense>
  )
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B','KB','MB','GB','TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  const value = i === 0 ? n : Math.round(n * 10) / 10
  return `${value} ${units[i]}`
}


