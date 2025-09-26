import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getAdminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { amountCents } = await request.json()
    if (!amountCents || amountCents < 100) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }
    const token = authHeader.split('Bearer ')[1]
    const tokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    const userId = tokenPayload.user_id as string
    const email = tokenPayload.email as string | undefined
    const name = tokenPayload.name as string | undefined

    // Resolve Stripe customer (prefer stored mapping)
    const adminDb = getAdminDb()
    const userSnap = await adminDb.collection('users').doc(userId).get()
    let stripeCustomerId: string | undefined = userSnap.exists ? (userSnap.data() as any)?.stripeCustomerId : undefined
    if (!stripeCustomerId && email) {
      const existing = await stripe.customers.list({ email, limit: 1 })
      if (existing.data.length > 0) {
        stripeCustomerId = existing.data[0].id
      }
    }
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email, name })
      stripeCustomerId = customer.id
      await adminDb.collection('users').doc(userId).set({ stripeCustomerId, email, name, updatedAt: new Date() }, { merge: true })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      payment_method_collection: 'if_required',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'AqwaCloud Wallet Top-up' },
            unit_amount: amountCents
          },
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aqwa-cloud1-7iaj.vercel.app'}/billing?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aqwa-cloud1-7iaj.vercel.app'}/billing?status=cancel`,
      metadata: {
        purpose: 'wallet_topup',
        userId
      },
      payment_intent_data: {
        customer: stripeCustomerId,
        metadata: {
          purpose: 'wallet_topup',
          userId
        }
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('create-topup-session error', err)
    return NextResponse.json({ error: 'Failed to create top-up session' }, { status: 500 })
  }
}
