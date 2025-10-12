import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

// DELETE /api/admin/user?id=USER_ID -> deletes user profile doc and related aggregates (soft)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const db = getAdminDb()

    // Delete user root doc
    await db.collection('users').doc(id).delete()

    // TODO: optionally delete subcollections (transferHistory, metrics) via background job
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete user' }, { status: 500 })
  }
}


