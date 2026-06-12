import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'

export async function GET(req: NextRequest) {
  const routeClient = createRouteClient(req)
  const { data: { user } } = await routeClient.auth.getUser()
  if (!user) return new NextResponse('Non authentifié', { status: 401 })

  const vendor = await getVendorByUserIdServer(user.id)
  if (!vendor) return new NextResponse('Vendeur introuvable', { status: 403 })

  const supabase = createAdminClient()
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, created_at, status, total, wilaya,
      order_items (
        product_name, quantity, unit_price, vendor_id
      )
    `)
    .eq('order_items.vendor_id', vendor.id)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) return new NextResponse('Erreur DB', { status: 500 })

  const rows = ['Date,Commande,Produit,Qté,Prix unitaire,Sous-total,Statut,Wilaya']

  for (const order of orders ?? []) {
    const items = (order.order_items as { product_name: string; quantity: number; unit_price: number; vendor_id: string }[] | null) ?? []
    const vendorItems = items.filter((i) => i.vendor_id === vendor.id)
    for (const item of vendorItems) {
      const date = new Date(order.created_at).toLocaleDateString('fr-DZ')
      const subtotal = item.quantity * item.unit_price
      rows.push([
        date,
        order.id.slice(0, 8).toUpperCase(),
        `"${item.product_name.replace(/"/g, '""')}"`,
        item.quantity,
        item.unit_price,
        subtotal,
        order.status,
        order.wilaya ?? '',
      ].join(','))
    }
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="commandes-${vendor.store_slug}-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
