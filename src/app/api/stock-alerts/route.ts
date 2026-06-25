import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientIp } from '@/lib/utils/ip'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { logger } from '@/lib/logger'

const StockAlertSchema = z.object({
  productId: z.string().min(1),
  email:     z.string().email().optional(),
  phone:     z.string().min(8).max(20).optional(),
}).refine((d) => d.email || d.phone, { message: 'Email ou téléphone requis' })

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'stock_alert')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = StockAlertSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Données invalides'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data: product } = await supabase
      .from('products')
      .select('id, stock')
      .eq('id', parsed.data.productId)
      .single()

    if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    if (product.stock > 0) return NextResponse.json({ error: 'Ce produit est déjà en stock' }, { status: 409 })

    const { error } = await supabase.from('stock_alerts').insert({
      product_id: parsed.data.productId,
      email:      parsed.data.email ?? null,
      phone:      parsed.data.phone ?? null,
    })

    if (error) throw error
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/stock-alerts]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
