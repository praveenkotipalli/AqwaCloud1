import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

function startOfCurrentMonth(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0,0,0,0)
  return d
}

// GET /api/admin/metrics
// Returns total income, monthly income, and per-user usage/cost summaries
export async function GET(_req: NextRequest) {
  try {
    const db = getAdminDb()
    const monthStart = startOfCurrentMonth()

    // Income: sum of walletTransactions type=credit (avoid composite index by filtering month in-memory)
    const allCreditsSnap = await db.collection('walletTransactions').where('type', '==', 'credit').get()
    const totalIncomeCents = allCreditsSnap.docs.reduce((sum, d) => sum + (d.get('amountCents') || 0), 0)
    const monthIncomeCents = allCreditsSnap.docs
      .filter(d => {
        const ts = d.get('createdAt')
        const dt = ts?.toDate?.() || ts || null
        return dt && dt >= monthStart
      })
      .reduce((sum, d) => sum + (d.get('amountCents') || 0), 0)

    // Per-user summary
    const usersSnap = await db.collection('users').get()
    const users = [] as Array<{
      id: string
      email?: string
      name?: string
      role?: string
      plan?: string
      monthBytes?: number
      totalBytes?: number
      monthCostCents?: number
      totalCostCents?: number
    }>

    for (const doc of usersSnap.docs) {
      const u = { id: doc.id, email: doc.get('email'), name: doc.get('name'), role: doc.get('role'), plan: doc.get('plan') } as any

      // Aggregate usage bytes from users/{id}/metrics/aggregate if exists
      try {
        const agg = await db.collection('users').doc(doc.id).collection('metrics').doc('aggregate').get()
        if (agg.exists) {
          u.monthBytes = agg.get('monthBytes') || 0
          u.totalBytes = agg.get('totalBytes') || 0
        }
      } catch {}

      // Cost from walletTransactions (debits + settle). Avoid composite index by filtering month in-memory
      try {
        const txAll = await db.collection('walletTransactions').where('userId', '==', doc.id).get()
        const allCostTx = txAll.docs.filter(d => (d.get('type') === 'debit' || d.get('type') === 'settle'))
        u.totalCostCents = allCostTx.reduce((sum, d) => sum + (d.get('amountCents') || 0), 0)
        u.monthCostCents = allCostTx
          .filter(d => {
            const ts = d.get('createdAt')
            const dt = ts?.toDate?.() || ts || null
            return dt && dt >= monthStart
          })
          .reduce((sum, d) => sum + (d.get('amountCents') || 0), 0)
      } catch {}

      users.push(u)
    }

    return NextResponse.json({ totalIncomeCents, monthIncomeCents, users })
  } catch (error: any) {
    console.error('admin metrics error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to load metrics' }, { status: 500 })
  }
}


