import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

// GET /api/admin/users -> list users with basic info
export async function GET(req: NextRequest) {
  try {
    const db = getAdminDb()
    const snap = await db.collection('users').limit(200).get()
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ users })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to list users' }, { status: 500 })
  }
}

// POST /api/admin/users/role -> { userId, role }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, role } = body || {}
    if (!userId || !role || !['user','admin'].includes(role)) {
      return NextResponse.json({ error: 'userId and valid role required' }, { status: 400 })
    }
    const db = getAdminDb()
    await db.collection('users').doc(userId).set({ role, updatedAt: new Date() }, { merge: true })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update role' }, { status: 500 })
  }
}


