export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// PUT /api/products/[id] — Update product + inventory
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient()
  const body = await request.json()

  const { error: prodError } = await supabase
    .from('products')
    .update({
      name:         body.name,
      salt_name:    body.salt_name,
      category:     body.category,
      manufacturer: body.manufacturer,
      mrp:          Number(body.mrp),
      sell_price:   Number(body.sell_price) || Number(body.mrp),
      requires_rx:  body.requires_rx ?? false,
    })
    .eq('id', params.id)

  if (prodError) return NextResponse.json({ error: prodError.message }, { status: 500 })

  // Upsert inventory row
  const { data: existing } = await supabase
    .from('inventory')
    .select('id')
    .eq('product_id', params.id)
    .single()

  if (existing) {
    await supabase.from('inventory').update({
      stock_qty:      Number(body.stock_qty) || 0,
      reorder_at:     Number(body.reorder_at) || 10,
      expiry_date:    body.expiry_date || null,
      batch_no:       body.batch_no,
      purchase_price: Number(body.purchase_price) || 0,
    }).eq('product_id', params.id)
  } else {
    await supabase.from('inventory').insert({
      product_id:     params.id,
      stock_qty:      Number(body.stock_qty) || 0,
      reorder_at:     Number(body.reorder_at) || 10,
      expiry_date:    body.expiry_date || null,
      batch_no:       body.batch_no,
      purchase_price: Number(body.purchase_price) || 0,
    })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/products/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient()

  await supabase.from('inventory').delete().eq('product_id', params.id)
  const { error } = await supabase.from('products').delete().eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// GET /api/products/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('*, inventory(*)')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}
