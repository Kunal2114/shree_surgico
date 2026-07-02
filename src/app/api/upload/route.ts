export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// POST /api/upload  — Upload prescription image to Supabase Storage
export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const formData = await request.formData()

  const file    = formData.get('file') as File
  const orderId = formData.get('order_id') as string

  if (!file || !orderId) {
    return NextResponse.json({ error: 'Missing file or order_id' }, { status: 400 })
  }

  // Validate file type and size
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG or PDF.' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 })
  }

  const ext      = file.name.split('.').pop()
  const filePath = `prescriptions/${orderId}/${Date.now()}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  // Upload to Supabase Storage bucket named "prescriptions"
  const { error: uploadError } = await supabase.storage
    .from('prescriptions')
    .upload(filePath, buffer, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('prescriptions')
    .getPublicUrl(filePath)

  // Save prescription record to database
  const { error: dbError } = await supabase.from('prescriptions').insert({
    order_id:  orderId,
    image_url: urlData.publicUrl,
    status:    'pending',
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ url: urlData.publicUrl })
}
