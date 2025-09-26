import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getAdminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    const email = payload.email as string | undefined
    const userId = payload.user_id as string | undefined

    // If client provided explicit customerId, prefer it
    const { searchParams } = new URL(request.url)
    const customerIdParam = searchParams.get('customerId') || undefined

    if (!email) {
      return NextResponse.json({ error: 'Email missing in token' }, { status: 400 })
    }

    // Resolve customer ID (prefer stored mapping via Admin; fallback to email lookup)
    let customerId: string | undefined = customerIdParam
    if (!customerId && userId) {
      const snap = await getAdminDb().collection('users').doc(userId).get()
      const profile = snap.exists ? (snap.data() as any) : null
      if (profile?.stripeCustomerId) {
        customerId = profile.stripeCustomerId
      }
    }

    if (!customerId && email) {
      const existing = await stripe.customers.list({ email, limit: 1 })
      if (existing.data.length > 0) {
        customerId = existing.data[0].id
      }
    }

    if (!customerId) {
      // No customer means no payment methods yet
      return NextResponse.json({ paymentMethods: [] })
    }

    console.log('[payment-methods] Using customerId:', customerId)

    // Gather payment methods across all customers with the same email
    const allCustomerIds: string[] = []
    if (customerId) allCustomerIds.push(customerId)
    if (email) {
      const candidates = await stripe.customers.list({ email, limit: 10 })
      for (const c of candidates.data) {
        if (!allCustomerIds.includes(c.id)) allCustomerIds.push(c.id)
      }
    }

    const seen = new Set<string>()
    const aggregated: Array<{ id: string; brand?: string; last4?: string; exp_month?: number; exp_year?: number; isDefault?: boolean }> = []
    let chosenCustomerId = customerId

    for (const cid of allCustomerIds) {
      const list = await stripe.paymentMethods.list({ customer: cid, type: 'card' })
      console.log('[payment-methods] Customer', cid, 'methods:', list.data.length)
      if (list.data.length > 0 && !chosenCustomerId) {
        chosenCustomerId = cid
      }
      const customer = await stripe.customers.retrieve(cid)
      const defaultPmId = (customer as any)?.invoice_settings?.default_payment_method as string | null
      for (const pm of list.data) {
        if (seen.has(pm.id)) continue
        seen.add(pm.id)
        aggregated.push({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year,
          isDefault: pm.id === defaultPmId,
        })
      }
    }

    // If our stored mapping differs from the customer that has a default, update mapping
    const hasDefault = aggregated.find(pm => pm.isDefault)
    if (hasDefault && chosenCustomerId && chosenCustomerId !== customerId) {
      console.log('[payment-methods] Updating stored stripeCustomerId to', chosenCustomerId)
      await getAdminDb().collection('users').doc(userId!).set({ stripeCustomerId: chosenCustomerId, updatedAt: new Date() }, { merge: true })
    }

    const paymentMethods = aggregated

    return NextResponse.json({ paymentMethods })
  } catch (error: any) {
    const message = error?.message || 'Failed to fetch payment methods'
    console.error('payment-methods error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


