import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { checkVendorProductLimit } from '@/lib/supabase/server-utils'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  values.push(current.trim())
  return values
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase())
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

export async function POST(req: NextRequest) {
  const response = NextResponse.next()
  try {
    // IP-level gate first — before any auth or body parsing
    const ip = getClientIp(req)
    const ipRl = await checkSellerRateLimit(ip, 'import', 5, 60 * 60)
    if (!ipRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(ipRl.retryAfterSeconds) } }
    ))

    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    // Per-account gate — prevents one seller exhausting the limit for a shared NAT
    const userRl = await checkUserRateLimit(user.id, 'import', 3, 60 * 60)
    if (!userRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Limite atteinte. Maximum 3 imports par heure.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    ))

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return copyCookies(response, NextResponse.json({ error: 'Vendor not found' }, { status: 403 }))

    const text = await req.text()
    if (!text.trim()) return copyCookies(response, NextResponse.json({ error: 'CSV vide' }, { status: 400 }))

    const rows = parseCSV(text)
    if (rows.length === 0) return copyCookies(response, NextResponse.json({ error: 'Aucune ligne valide dans le CSV' }, { status: 400 }))
    if (rows.length > 200) return copyCookies(response, NextResponse.json({ error: 'Maximum 200 produits par import' }, { status: 400 }))

    // Enforce subscription product limit before importing
    const limitCheck = await checkVendorProductLimit(vendor.id)
    const validRows = rows.filter((row) => {
      const name  = row['name'] || row['nom'] || row['title'] || row['titre']
      const price = parseFloat(row['price'] || row['prix'] || '0')
      return !!name && !isNaN(price) && price > 0
    })
    if (limitCheck.limit !== null && limitCheck.count + validRows.length > limitCheck.limit) {
      return copyCookies(response, NextResponse.json(
        {
          error: `Limite de produits dépassée. Vous avez ${limitCheck.count}/${limitCheck.limit} produits. Cet import en ajouterait ${validRows.length}.`,
          count: limitCheck.count,
          limit: limitCheck.limit,
        },
        { status: 403 }
      ))
    }

    let imported = 0
    const errors: string[] = []

    for (const row of rows) {
      const name  = row['name'] || row['nom'] || row['title'] || row['titre']
      const price = parseFloat(row['price'] || row['prix'] || '0')

      if (!name || isNaN(price) || price <= 0) {
        errors.push(`Ligne ignorée: nom ou prix manquant/invalide ("${name}", ${price})`)
        continue
      }

      try {
        // Single atomic upsert with vendor_id included — avoids the two-step
        // insert+update window where the product exists without an owner.
        // crypto.randomUUID() guarantees uniqueness; Date.now() does not when
        // multiple rows are processed in rapid succession.
        const admin = createAdminClient()
        const productId = crypto.randomUUID()
        const { error: upsertErr } = await admin.from('products').upsert({
          id:            productId,
          vendor_id:     vendor.id,
          niche_id:      row['niche'] || row['niche_id'] || 'cars',
          category:      row['category'] || row['categorie'] || 'Général',
          name,
          description:   row['description'] || '',
          price,
          compare_price: parseFloat(row['compare_price'] || row['prix_compare'] || '0') || null,
          stock:         (() => { const s = parseInt(row['stock'] ?? '', 10); return isNaN(s) ? 1 : Math.max(0, s) })(),
          images:        (row['images'] || row['image'] || '').split('|').filter(Boolean),
          tags:          (row['tags'] || '').split('|').filter(Boolean),
          is_new:        false,
          is_featured:   false,
          updated_at:    new Date().toISOString(),
        })
        if (upsertErr) throw upsertErr
        imported++
      } catch (err) {
        errors.push(`Erreur pour "${name}": ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
      }
    }

    return copyCookies(response, NextResponse.json({ imported, errors }, { status: 201 }))
  } catch (err) {
    logger.error('[POST /api/seller/products/import]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
