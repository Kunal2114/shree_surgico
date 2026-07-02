export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// GET /api/products
// Returns all products with their inventory (stock, expiry)
// Optional query params: ?category=Tablet  ?search=dolo  ?rx=true
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)

  const category = searchParams.get('category')
  const search   = searchParams.get('search')
  const rx       = searchParams.get('rx')

  let query = supabase
    .from('products')
    .select(`
      *,
      inventory (
        id, batch_no, stock_qty, reorder_at, expiry_date, purchase_price
      )
    `)
    .order('name')

  if (category) query = query.eq('category', category)
  if (rx === 'true') query = query.eq('requires_rx', true)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/products]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/products  — Add a new product (admin only)
export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('products')
    .insert({
      name:        body.name,
      salt_name:   body.salt_name,
      category:    body.category,
      manufacturer: body.manufacturer,
      mrp:         body.mrp,
      sell_price:  body.sell_price ?? body.mrp,
      requires_rx: body.requires_rx ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also insert the first inventory batch
  if (body.stock_qty != null) {
    await supabase.from('inventory').insert({
      product_id:     data.id,
      batch_no:       body.batch_no,
      stock_qty:      body.stock_qty,
      reorder_at:     body.reorder_at ?? 10,
      expiry_date:    body.expiry_date,
      purchase_price: body.purchase_price,
    })
  }

  return NextResponse.json(data, { status: 201 })
}
