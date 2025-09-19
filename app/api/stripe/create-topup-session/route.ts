import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

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
    const userId = tokenPayload.user_id

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?status=cancel`,
      metadata: {
        purpose: 'wallet_topup',
        userId
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('create-topup-session error', err)
    return NextResponse.json({ error: 'Failed to create top-up session' }, { status: 500 })
  }
}
