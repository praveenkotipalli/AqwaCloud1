import { NextRequest, NextResponse } from 'next/server'
import getAdminApp, { getAdminDb } from '@/lib/firebase-admin'

// POST /api/admin/seed
// Creates default admin user document (role: admin) if not present
export async function POST(_req: NextRequest) {
  try {
    const db = getAdminDb()

    // This only seeds Firestore user doc for RBAC; it does not create Auth user
    const email = 'admin@gmail.com'
    const userQuery = await db.collection('users').where('email', '==', email).limit(1).get()
    if (!userQuery.empty) {
      const docSnap = userQuery.docs[0]
      await docSnap.ref.set({ role: 'admin', plan: 'enterprise', updatedAt: new Date() }, { merge: true })
      return NextResponse.json({ ok: true, message: 'Admin profile ensured', userId: docSnap.id })
    }

    // If no user doc by email, create a placeholder Firestore doc (requires auth user UID mapping later)
    // Use deterministic id based on timestamp for now
    const ref = await db.collection('users').add({
      email,
      name: 'Administrator',
      role: 'admin',
      plan: 'enterprise',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    return NextResponse.json({ ok: true, message: 'Admin profile created (no auth UID linked)', userId: ref.id })
  } catch (error: any) {
    console.error('Seed admin error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to seed admin' }, { status: 500 })
  }
}


