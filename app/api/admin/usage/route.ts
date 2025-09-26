import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

// GET /api/admin/usage?userId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const db = getAdminDb()
    // Aggregate from metrics doc if exists
    const aggSnap = await db.collection('users').doc(userId).collection('metrics').doc('aggregate').get()
    const aggregate = aggSnap.exists ? aggSnap.data() : null

    // Also compute wallet and transactions summary
    const walletSnap = await db.collection('wallets').doc(userId).get()
    const wallet = walletSnap.exists ? walletSnap.data() : { balanceCents: 0 }

    return NextResponse.json({ aggregate, wallet })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to get usage' }, { status: 500 })
  }
}


