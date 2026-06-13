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

  // Step 1: fetch this vendor's order items directly (eq on direct column works)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('order_id, product_name, quantity, unit_price')
    .eq('vendor_id', vendor.id)
    .limit(2000)

  if (itemsError) {
    return NextResponse.json(
      { error: itemsError.message, code: itemsError.code },
      { status: 500 },
    )
  }

  const orderIds = [...new Set((items ?? []).map((i) => i.order_id))].filter(Boolean)

  // Step 2: fetch the parent orders (status, wilaya, date)
  let orders: { id: string; created_at: string; status: string; wilaya: string | null }[] = []
  if (orderIds.length > 0) {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at, status, wilaya')
      .in('id', orderIds)
      .order('created_at', { ascending: false })

    if (ordersError) {
      return NextResponse.json(
        { error: ordersError.message, code: ordersError.code },
        { status: 500 },
      )
    }
    orders = ordersData ?? []
  }

  // Build lookup map for O(1) order access
  const orderMap = new Map(orders.map((o) => [o.id, o]))

  // Build CSV
  const rows = ['Date,Commande,Produit,Qté,Prix unitaire,Sous-total,Statut,Wilaya']

  for (const item of items ?? []) {
    const order = orderMap.get(item.order_id)
    if (!order) continue
    const date     = new Date(order.created_at).toLocaleDateString('fr-DZ')
    const subtotal = item.quantity * item.unit_price
    rows.push([
      date,
      String(order.id).slice(0, 8).toUpperCase(),
      `"${String(item.product_name ?? '').replace(/"/g, '""')}"`,
      item.quantity,
      item.unit_price,
      subtotal,
      order.status,
      order.wilaya ?? '',
    ].join(','))
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="commandes-${vendor.store_slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
