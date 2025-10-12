import { NextRequest, NextResponse } from 'next/server'
import getAdminApp, { getAdminDb } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'

// POST /api/admin/create-admin
// Body (optional): { email, password, name }
// Creates a Firebase Auth user if missing, sets custom claim admin=true, and ensures Firestore role
export async function POST(req: NextRequest) {
  try {
    const { email = 'admin@gmail.com', password = 'admin123', name = 'Administrator' } = await req.json().catch(() => ({}))

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const app = getAdminApp()
    const auth = getAuth(app)
    const db = getAdminDb()

    // Find or create auth user
    let userRecord
    try {
      userRecord = await auth.getUserByEmail(email)
    } catch {
      userRecord = await auth.createUser({ email, password, displayName: name, emailVerified: true, disabled: false })
    }

    // Set custom claims for admin
    await auth.setCustomUserClaims(userRecord.uid, { admin: true })

    // Ensure Firestore role
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role: 'admin',
      plan: 'enterprise',
      updatedAt: new Date(),
    }, { merge: true })

    return NextResponse.json({ ok: true, uid: userRecord.uid })
  } catch (error: any) {
    console.error('create-admin error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create admin' }, { status: 500 })
  }
}


