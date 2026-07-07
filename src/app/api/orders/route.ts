export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// POST /api/orders — Place a new order
// Calls the place_order Postgres function which deducts stock atomically
export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json()

  const { customer, items, total, delivery_address, payment_method } = body

  // 1. Upsert customer by phone number
  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .upsert(
      { name: customer.name, phone: customer.phone, email: customer.email },
      { onConflict: 'phone' }
    )
    .select()
    .single()

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 500 })
  }

  // 2. Call the atomic Postgres function to create order + deduct stock
  const { data, error } = await supabase.rpc('place_order', {
    p_customer_id:    customerData.id,
    p_items:          items,   // [{ product_id, qty, price }]
    p_total:          total,
    p_address:        delivery_address,
    p_payment_method: payment_method,
  })

  if (error) {
    console.error('[POST /api/orders]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ order_id: data }, { status: 201 })
}

// GET /api/orders — List all orders (admin)
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('orders')
    .select(`*, customer:customers(*), order_items(*, product:products(*))`)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
