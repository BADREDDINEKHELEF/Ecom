import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'
import { checkOtpVerifyRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { validateStoreSlug } from '@/lib/validation/slug'
import { verifyOtpHash } from '@/lib/auth/otp'

const ALLOWED_STORAGE_HOSTS = ['supabase.co', 'supabase.in']

function safeStorageUrl() {
  return z.string().url().refine((url) => {
    try {
      const { protocol, hostname } = new URL(url)
      return protocol === 'https:' && ALLOWED_STORAGE_HOSTS.some((h) => hostname.endsWith(h))
    } catch { return false }
  }, { message: 'URL must be an https Supabase storage URL' }).nullable().optional()
}

const Schema = z.object({
  store_name:  z.string().min(1).max(100),
  store_slug:  z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  phone:       z.string().max(20).nullable().optional(),
  wilaya:      z.string().max(60).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  logo_url:    safeStorageUrl(),
  email:       z.string().email().transform((v) => v.trim().toLowerCase()),
  password:    z.string().min(8),
  otp:         z.string().trim().length(6).regex(/^\d+$/),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'register', 5, 3600)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsedBody = Schema.safeParse(body)
    if (!parsedBody.success) {
      const details = process.env.NODE_ENV === 'development' ? parsedBody.error.flatten() : undefined
      return NextResponse.json(
        { error: 'Validation failed', ...(details && { details }) },
        { status: 400 }
      )
    }

    const parsed = parsedBody
    const { store_name, store_slug, phone, wilaya, description, logo_url, email, password, otp } = parsed.data

    // Validate slug format and reserved names server-side
    const slugValidation = validateStoreSlug(store_slug)
    if (!slugValidation.ok) {
      return NextResponse.json({ error: slugValidation.error }, { status: 400 })
    }

    const supabase = createAdminClient()

    // ── Verify OTP server-side (proof of email ownership) ─────────────────────
    const otpRl = await checkOtpVerifyRateLimit(email)
    if (!otpRl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(otpRl.retryAfterSeconds) } }
      )
    }

    let record = null
    let queryErr = null

    logger.info('[register] looking up OTP', { email })

    const { data: dataEmail, error: errEmail } = await supabase
      .from('password_reset_otps')
      .select('id, otp_hash, expires_at, used, purpose')
      .eq('email', email)
      .eq('used', false)
      .eq('purpose', 'registration')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    logger.info('[register] OTP lookup by email', { found: !!dataEmail, error: errEmail?.message })

    const isColumnMissing = errEmail && (
      errEmail.code === '42703' ||
      String(errEmail.message).includes('column')
    )

    if (isColumnMissing) {
      const { data: dataPhone, error: errPhone } = await supabase
        .from('password_reset_otps')
        .select('id, otp_hash, expires_at, used, purpose')
        .eq('phone', email)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      record = dataPhone
      queryErr = errPhone
      logger.info('[register] OTP lookup by phone (fallback)', { found: !!dataPhone, error: errPhone?.message })
    } else if (errEmail) {
      queryErr = errEmail
    } else if (dataEmail) {
      record = dataEmail
    } else {
      const { data: dataPhone, error: errPhone } = await supabase
        .from('password_reset_otps')
        .select('id, otp_hash, expires_at, used, purpose')
        .eq('phone', email)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      record = dataPhone
      queryErr = errPhone
      logger.info('[register] OTP lookup by phone (fallback)', { found: !!dataPhone, error: errPhone?.message })
    }

    if (queryErr) {
      throw new Error(`Database query failed: ${queryErr.message} (code: ${queryErr.code})`)
    }

    if (!record) {
      logger.warn('[register] no OTP record found', { email })
      return NextResponse.json({ error: 'Code invalide. Aucun code trouvé pour cet e-mail.' }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(record.expires_at)
    logger.info('[register] OTP record found', {
      id: record.id,
      expiresAt: record.expires_at,
      serverNow: now.toISOString(),
      expired: expiresAt < now,
      hasHash: !!record.otp_hash,
      hashFormat: record.otp_hash?.includes(':') ? 'salt:hash' : 'missing-separator',
    })

    if (expiresAt < now) {
      return NextResponse.json({ error: 'Code expiré. Cliquez sur « Renvoyer le code » pour en recevoir un nouveau.' }, { status: 400 })
    }
    if (!verifyOtpHash(otp, record.otp_hash)) {
      logger.warn('[register] OTP hash mismatch', { email, otpLength: otp.length })
      return NextResponse.json({ error: 'Code incorrect. Vérifiez les 6 chiffres et réessayez.' }, { status: 400 })
    }

    // ── Create Supabase auth user with confirmed email ────────────────────────
    // Email confirmation is handled by our OTP flow, so we mark the email as
    // confirmed immediately. This lets the user sign in right away while still
    // keeping Supabase email confirmation enabled at the project level.
    const { data: authUser, error: createUserErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: '' }, // will be updated below if needed
    })

    if (createUserErr) {
      if (createUserErr.message?.includes('already been registered') || createUserErr.code === 'user_already_exists') {
        return NextResponse.json({ error: 'Cet e-mail est déjà inscrit.' }, { status: 409 })
      }
      throw new Error(`Auth user creation failed: ${createUserErr.message}`)
    }

    const user_id = authUser.user?.id
    if (!user_id) {
      throw new Error('Auth user creation returned no user id')
    }

    // Update user metadata with full name
    await supabase.auth.admin.updateUserById(user_id, {
      user_metadata: { full_name: store_name },
    })

    // ── Check business rules ──────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('vendors')
      .select('id')
      .ilike('store_slug', store_slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'URL déjà prise. Essayez un autre nom.' }, { status: 409 })
    }

    const { data: existingVendor } = await supabase
      .from('vendors')
      .select('id')
      .or(`user_id.eq.${user_id},owner_id.eq.${user_id}`)
      .maybeSingle()
    if (existingVendor) {
      return NextResponse.json({ error: 'Vous avez déjà une boutique.' }, { status: 409 })
    }

    // ── Create vendor ─────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        user_id,
        owner_id:    user_id,
        store_name,
        store_slug:  store_slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''),
        phone:       phone ?? null,
        wilaya:      wilaya ?? null,
        description: description ?? null,
        logo_url:    logo_url ?? null,
        email:       email ?? null,
        commission_rate: 10,
        is_approved: false,
        is_active:   true,
        subscription_status: 'trial',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'URL déjà prise. Essayez un autre nom.' }, { status: 409 })
      }
      throw error
    }

    // Mark OTP as used only after the vendor has been successfully created.
    // The email is now registered, so this OTP cannot be reused for another
    // registration even if the update fails; we still log the failure.
    const { error: markUsedErr } = await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', record.id)
    if (markUsedErr) {
      logger.error('[register] failed to mark OTP as used', { otpId: record.id, error: markUsedErr.message })
    }

    return NextResponse.json({ vendor: data }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/seller/register]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erreur serveur. Réessayez.' }, { status: 500 })
  }
}
