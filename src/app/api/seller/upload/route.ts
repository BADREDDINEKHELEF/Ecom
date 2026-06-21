import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateImageUpload } from '@/lib/validation/fileUpload'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit, checkUserDualRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'upload', 10, 300)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    // Auth — verify session via route client (reads cookies from request)
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      logger.warn('[upload] auth failed', { error: authErr?.message })
      return NextResponse.json({ error: 'Non connecté. Reconnectez-vous.' }, { status: 401 })
    }

    const userRl = await checkUserDualRateLimit(user.id, 'upload', {
      burstMax: 5, burstWindowSecs: 120,
      sustainedMax: 20, sustainedWindowSecs: 3600,
    })
    if (!userRl.allowed) return NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    )

    // Vendor lookup — use the authenticated session (RLS lets users read their own vendor row)
    const { data: vendorRow, error: vendorErr } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (vendorErr) {
      logger.error('[upload] vendor lookup error', { error: vendorErr.message, userId: user.id })
      return NextResponse.json({ error: 'Erreur serveur. Réessayez.' }, { status: 500 })
    }
    if (!vendorRow) {
      logger.warn('[upload] no vendor for user', { userId: user.id })
      return NextResponse.json({ error: 'Compte vendeur introuvable.' }, { status: 403 })
    }

    const admin = createAdminClient()

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

    // Validate type — client always uploads as image/webp after compression
    if (file.type && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: `Format non supporté. Utilisez une image.` },
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
    const path  = `vendors/${vendorRow.id}/${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`
    const bytes = await file.arrayBuffer()

    // Magic byte verification — prevents MIME type spoofing (e.g., a .php file with image/jpeg content-type)
    try {
      validateImageUpload(Buffer.from(bytes), file.type || 'image/jpeg')
    } catch (validationErr) {
      return NextResponse.json(
        { error: validationErr instanceof Error ? validationErr.message : 'Fichier invalide.' },
        { status: 400 }
      )
    }

    // Ensure bucket exists — creates it on first deploy without needing a manual migration
    const { data: buckets } = await admin.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.id === 'product-images')
    if (!bucketExists) {
      await admin.storage.createBucket('product-images', {
        public:          true,
        fileSizeLimit:   10485760,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      })
    }

    const { error: uploadErr } = await admin.storage
      .from('product-images')
      .upload(path, bytes, { contentType: file.type, upsert: false })

    if (uploadErr) {
      logger.error('[POST /api/seller/upload] storage error', { error: uploadErr.message })
      return NextResponse.json({ error: 'Échec de l\'upload. Réessayez.' }, { status: 500 })
    }

    const { data: { publicUrl } } = admin.storage
      .from('product-images')
      .getPublicUrl(path)

    return NextResponse.json({ url: publicUrl }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/seller/upload]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
