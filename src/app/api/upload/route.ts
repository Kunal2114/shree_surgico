export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase  = createAdminClient()
  const formData  = await request.formData()
  const file      = formData.get('file') as File
  const orderId   = formData.get('order_id') as string

  if (!file || !orderId) {
    return NextResponse.json({ error: 'file and order_id are required' }, { status: 400 })
  }

  // Validate type
  const allowed = [
    'image/jpeg', 'image/jpg', 'image/png',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ]
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, PDF, DOCX.' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds 5 MB limit.' }, { status: 400 })
  }

  const ext      = file.name.split('.').pop() ?? 'bin'
  const filePath = `prescriptions/${orderId}/${Date.now()}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  // Upload to Supabase Storage (private bucket)
  const { error: uploadError } = await supabase.storage
    .from('prescriptions')
    .upload(filePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[upload] storage error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Save record in prescriptions table with the storage path (NOT a public URL)
  const { error: dbError } = await supabase.from('prescriptions').insert({
    order_id:  orderId,
    image_url: filePath,   // store path, not public URL — we generate signed URLs on demand
    status:    'pending',
  })

  if (dbError) {
    console.error('[upload] db error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, path: filePath })
}
