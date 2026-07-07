export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// GET /api/products
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)

  const category = searchParams.get('category')
  const search   = searchParams.get('search')

  let query = supabase
    .from('products')
    .select('*, inventory(id, stock_qty, reorder_at, expiry_date, batch_no, purchase_price)')
    .order('name')

  if (category) query = query.eq('category', category)
  if (search)   query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/products — Insert new product + first inventory batch
export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json()

  if (!body.name || !body.mrp || !body.category) {
    return NextResponse.json({ error: 'name, mrp and category are required' }, { status: 400 })
  }

  const { data: prod, error: prodError } = await supabase
    .from('products')
    .insert({
      name:         body.name,
      salt_name:    body.salt_name   || null,
      category:     body.category,
      manufacturer: body.manufacturer || null,
      mrp:          Number(body.mrp),
      sell_price:   Number(body.sell_price) || Number(body.mrp),
      requires_rx:  body.requires_rx ?? false,
    })
    .select()
    .single()

  if (prodError) {
    console.error('[POST /api/products] product insert:', prodError)
    return NextResponse.json({ error: prodError.message }, { status: 500 })
  }

  const { error: invError } = await supabase
    .from('inventory')
    .insert({
      product_id:     prod.id,
      batch_no:       body.batch_no       || null,
      stock_qty:      Number(body.stock_qty)      || 0,
      reorder_at:     Number(body.reorder_at)     || 10,
      expiry_date:    body.expiry_date    || null,
      purchase_price: Number(body.purchase_price) || 0,
    })

  if (invError) {
    console.error('[POST /api/products] inventory insert:', invError)
    // Product was created — still return success but log the inventory failure
    return NextResponse.json({ ...prod, inventory_error: invError.message }, { status: 201 })
  }

  return NextResponse.json(prod, { status: 201 })
}
