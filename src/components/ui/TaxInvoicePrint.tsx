'use client'

import { Printer } from 'lucide-react'

interface OrderItem {
  productName: string
  quantity: number
  unitPrice: number
}

interface TaxInvoiceProps {
  orderId: string
  createdAt: string
  buyerName: string
  buyerPhone: string
  buyerAddress: string
  companyName?: string
  nif?: string
  nis?: string
  rc?: string
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  total: number
}

export default function TaxInvoicePrint(props: TaxInvoiceProps) {
  const tva = props.subtotal * 0.19

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html lang="fr"><head>
      <meta charset="UTF-8"/>
      <title>Facture fiscale ${props.orderId.slice(0,8).toUpperCase()}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:40px;color:#111}
        h1{font-size:20px;margin-bottom:4px}
        .meta{color:#555;font-size:11px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th{background:#4f46e5;color:#fff;padding:8px;text-align:left}
        td{padding:7px 8px;border-bottom:1px solid #eee}
        .total-row td{font-weight:bold;background:#f9f9f9}
        .footer{margin-top:40px;font-size:10px;color:#888;text-align:center}
        @media print{.no-print{display:none}}
      </style>
    </head><body>
      <h1>Facture Fiscale</h1>
      <div class="meta">N° ${props.orderId.slice(0,8).toUpperCase()} — ${new Date(props.createdAt).toLocaleDateString('fr-DZ')}</div>
      <hr style="margin:12px 0"/>
      <div style="display:flex;justify-content:space-between;gap:20px">
        <div>
          <strong>Vendeur</strong><br/>Casbah Store<br/>commerce@storedz.dz
        </div>
        <div>
          <strong>Client</strong><br/>${props.buyerName}<br/>${props.buyerPhone}<br/>${props.buyerAddress}
          ${props.companyName ? `<br/><br/><strong>${props.companyName}</strong>` : ''}
          ${props.nif ? `<br/>NIF: ${props.nif}` : ''}
          ${props.nis ? `<br/>NIS: ${props.nis}` : ''}
          ${props.rc  ? `<br/>RC: ${props.rc}`   : ''}
        </div>
      </div>
      <table>
        <thead><tr><th>Produit</th><th>Qté</th><th>Prix unit.</th><th>Total HT</th></tr></thead>
        <tbody>
          ${props.items.map((i) => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>${i.unitPrice.toLocaleString('fr-DZ')} DA</td><td>${(i.quantity * i.unitPrice).toLocaleString('fr-DZ')} DA</td></tr>`).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row"><td colspan="3">Sous-total HT</td><td>${props.subtotal.toLocaleString('fr-DZ')} DA</td></tr>
          <tr><td colspan="3">TVA (19%)</td><td>${tva.toLocaleString('fr-DZ')} DA</td></tr>
          <tr><td colspan="3">Livraison</td><td>${props.shippingCost.toLocaleString('fr-DZ')} DA</td></tr>
          <tr class="total-row"><td colspan="3">TOTAL TTC</td><td>${props.total.toLocaleString('fr-DZ')} DA</td></tr>
        </tfoot>
      </table>
      <div class="footer">Casbah Store — facture générée le ${new Date().toLocaleDateString('fr-DZ')}</div>
    </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
    >
      <Printer className="w-4 h-4" />
      Facture fiscale
    </button>
  )
}
