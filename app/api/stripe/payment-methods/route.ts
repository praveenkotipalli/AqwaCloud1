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

    const pms = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    // Determine default from customer invoice_settings if present
    const customer = await stripe.customers.retrieve(customerId)
    const defaultPmId = (customer as any)?.invoice_settings?.default_payment_method as string | null

    const paymentMethods = pms.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
      isDefault: pm.id === defaultPmId,
    }))

    return NextResponse.json({ paymentMethods })
  } catch (error: any) {
    const message = error?.message || 'Failed to fetch payment methods'
    console.error('payment-methods error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


