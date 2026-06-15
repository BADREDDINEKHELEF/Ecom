import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { upsertProduct } from '@/lib/supabase/mutations'
import { logger } from '@/lib/logger'

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const text = await req.text()
    if (!text.trim()) return NextResponse.json({ error: 'CSV vide' }, { status: 400 })

    const rows = parseCSV(text)
    if (rows.length === 0) return NextResponse.json({ error: 'Aucune ligne valide dans le CSV' }, { status: 400 })
    if (rows.length > 200) return NextResponse.json({ error: 'Maximum 200 produits par import' }, { status: 400 })

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
        const productId = `v-${vendor.id.slice(0, 8)}-${Date.now()}-${imported}`
        await upsertProduct({
          id:           productId,
          nicheId:      row['niche'] || row['niche_id'] || 'cars',
          category:     row['category'] || row['categorie'] || 'Général',
          name,
          description:  row['description'] || '',
          price,
          comparePrice: parseFloat(row['compare_price'] || row['prix_compare'] || '0') || undefined,
          stock:        (() => { const s = parseInt(row['stock'] ?? '', 10); return isNaN(s) ? 1 : Math.max(0, s) })(),
          images:       (row['images'] || row['image'] || '').split('|').filter(Boolean),
          tags:         (row['tags'] || '').split('|').filter(Boolean),
          isNew:        false,
          isFeatured:   false,
        })
        // Attach vendor_id (not in upsertProduct signature)
        const admin = createAdminClient()
        await admin.from('products').update({ vendor_id: vendor.id }).eq('id', productId)
        imported++
      } catch (err) {
        errors.push(`Erreur pour "${name}": ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
      }
    }

    return NextResponse.json({ imported, errors }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/seller/products/import]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
