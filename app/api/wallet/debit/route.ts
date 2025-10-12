import { NextRequest, NextResponse } from 'next/server'
import { debitWalletAdmin } from '@/lib/wallet-admin'

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    
    // For now, we'll extract userId from the token payload
    // In a production app, you'd verify the JWT token properly
    let userId: string
    try {
      // Decode the JWT token to get the user ID
      const payload = JSON.parse(atob(token.split('.')[1]))
      userId = payload.user_id || payload.sub
    } catch (error) {
      console.error('Error decoding token:', error)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in token' },
        { status: 401 }
      )
    }

    const { amountCents, description } = await request.json()

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Debit the wallet
    const success = await debitWalletAdmin(userId, amountCents, description)

    if (!success) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Wallet debited successfully',
      amountCents,
      description 
    })

  } catch (error) {
    console.error('Error debiting wallet:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
