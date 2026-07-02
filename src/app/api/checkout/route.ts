export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// POST /api/checkout — Create a Razorpay order using plain fetch (no SDK)
export async function POST(request: NextRequest) {
  const { amount } = await request.json()

  const keyId     = process.env.RAZORPAY_KEY_ID!
  const keySecret = process.env.RAZORPAY_KEY_SECRET!
  const auth      = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      amount:   Math.round(amount * 100), // ₹ to paise
      currency: 'INR',
      receipt:  `ssp_${Date.now()}`,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    console.error('[Razorpay create-order]', err)
    return NextResponse.json({ error: err.error?.description ?? 'Razorpay error' }, { status: 500 })
  }

  const order = await res.json()
  return NextResponse.json({
    razorpay_order_id: order.id,
    amount:            order.amount,
    currency:          order.currency,
  })
}

// PUT /api/checkout — Verify Razorpay payment signature
export async function PUT(request: NextRequest) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    await request.json()

  const body     = `${razorpay_order_id}|${razorpay_payment_id}`
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')

  if (expected !== razorpay_signature) {
    return NextResponse.json({ verified: false }, { status: 400 })
  }

  return NextResponse.json({ verified: true })
}
