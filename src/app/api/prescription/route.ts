export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// GET /api/prescription?order_id=xxx
// Returns a signed URL (60 min) so the pharmacist can open the file
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const orderId  = new URL(request.url).searchParams.get('order_id')

  if (!orderId) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  const { data: rx, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !rx) return NextResponse.json({ error: 'No prescription found' }, { status: 404 })

  const { data: signed, error: signErr } = await supabase.storage
    .from('prescriptions')
    .createSignedUrl(rx.image_url, 3600)

  if (signErr || !signed) return NextResponse.json({ error: signErr?.message }, { status: 500 })

  return NextResponse.json({
    signed_url: signed.signedUrl,
    status:     rx.status,
    created_at: rx.created_at,
    expires_in: '60 minutes',
  })
}

// PATCH /api/prescription?order_id=xxx  — approve or reject
export async function PATCH(request: NextRequest) {
  const supabase  = createAdminClient()
  const orderId   = new URL(request.url).searchParams.get('order_id')
  const { status, verified_by } = await request.json()

  if (!orderId) return NextResponse.json({ error: 'order_id required' }, { status: 400 })
  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
  }

  const { error } = await supabase
    .from('prescriptions')
    .update({ status, verified_by: verified_by ?? 'Pharmacist' })
    .eq('order_id', orderId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
