import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, created_at, full_name, wilaya, status, total, shipping_cost, payment_method, order_items(product_name, quantity, product_price, subtotal)')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) throw error

    const rows: string[] = [
      'Date,Numéro,Client,Wilaya,Produit,Qté,Prix unit,Sous-total,Total commande,Frais livraison,Statut,Paiement',
    ]

    for (const order of orders ?? []) {
      const date = new Date(order.created_at).toLocaleDateString('fr-DZ')
      const ref  = order.id.slice(0, 8).toUpperCase()
      const items = (order.order_items as { product_name: string; quantity: number; product_price: number; subtotal: number }[]) ?? []
      if (items.length === 0) {
        rows.push(`"${date}","${ref}","${order.full_name}","${order.wilaya}","","0","0","0","${order.total}","${order.shipping_cost}","${order.status}","${order.payment_method}"`)
      } else {
        for (const item of items) {
          rows.push(`"${date}","${ref}","${order.full_name}","${order.wilaya}","${item.product_name.replace(/"/g, '""')}","${item.quantity}","${item.product_price}","${item.subtotal}","${order.total}","${order.shipping_cost}","${order.status}","${order.payment_method}"`)
        }
      }
    }

    const csv = rows.join('\r\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (err) {
    logger.error('[GET /api/admin/analytics/export]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
