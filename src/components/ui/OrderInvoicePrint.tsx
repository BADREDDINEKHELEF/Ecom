'use client'

import { Printer } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { OrderRow } from '@/lib/supabase/orders'

interface Props {
  order: OrderRow
  storeName?: string
}

export default function OrderInvoicePrint({ order, storeName = 'StoreDz' }: Props) {
  const handlePrint = () => window.print()

  const items = order.order_items ?? []
  const dateStr = new Date(order.created_at).toLocaleDateString('fr-DZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      {/* Print trigger — hidden in print */}
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 font-semibold transition-colors print:hidden"
      >
        <Printer className="w-4 h-4" />
        Facture
      </button>

      {/* Invoice — only visible in print */}
      <div className="hidden print:block font-sans text-black p-8 max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black">{storeName}</h1>
            <p className="text-gray-600 text-sm mt-1">Algérie · support@storedz.dz</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">FACTURE</p>
            <p className="text-sm text-gray-600">N° {order.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-sm text-gray-600">{dateStr}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vendeur</p>
            <p className="font-semibold">{storeName}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Client</p>
            <p className="font-semibold">{order.full_name}</p>
            <p className="text-sm text-gray-700">{order.phone}</p>
            <p className="text-sm text-gray-700">{order.address}</p>
            <p className="text-sm text-gray-700">{order.city}, {order.wilaya}</p>
          </div>
        </div>

        <table className="w-full mb-8 text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 font-bold">Produit</th>
              <th className="text-right py-2 font-bold">Qté</th>
              <th className="text-right py-2 font-bold">Prix unit.</th>
              <th className="text-right py-2 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-2">{item.product_name}</td>
                <td className="text-right py-2">{item.quantity}</td>
                <td className="text-right py-2">{formatPrice(item.product_price)}</td>
                <td className="text-right py-2 font-semibold">{formatPrice(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="space-y-1 text-sm min-w-[200px]">
            <div className="flex justify-between">
              <span className="text-gray-600">Sous-total</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount_amount && order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Remise</span>
                <span>-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Livraison</span>
              <span>{formatPrice(order.shipping_cost)}</span>
            </div>
            <div className="flex justify-between font-black text-base border-t border-black pt-2 mt-2">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <p className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500 text-center">
          Paiement: {order.payment_method === 'cash' ? 'Cash à la livraison' : order.payment_method} · Merci pour votre commande !
        </p>
      </div>
    </>
  )
}
