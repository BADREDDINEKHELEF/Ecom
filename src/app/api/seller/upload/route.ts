import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserId } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    // Auth
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserId(user.id)
    if (!vendor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Parse multipart
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Format non supporté. Utilisez JPG, PNG ou WebP.` },
        { status: 400 }
      )
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop grand (max 10 Mo).` },
        { status: 400 }
      )
    }

    const ext   = file.type === 'image/webp' ? 'webp'
                : file.type === 'image/png'  ? 'png'
                : file.type === 'image/gif'  ? 'gif'
                : 'jpg'
    const path  = `vendors/${vendor.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const bytes = await file.arrayBuffer()

    const admin = createAdminClient()
    const { error: uploadErr } = await admin.storage
      .from('product-images')
      .upload(path, bytes, { contentType: file.type, upsert: false })

    if (uploadErr) {
      logger.error('[POST /api/seller/upload] storage error', { error: uploadErr.message })
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    const { data: { publicUrl } } = admin.storage
      .from('product-images')
      .getPublicUrl(path)

    return NextResponse.json({ url: publicUrl }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/seller/upload]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
