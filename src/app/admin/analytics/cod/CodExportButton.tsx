'use client'

import { Download } from 'lucide-react'
import type { CodWilayaRow } from '@/lib/supabase/analytics'

interface Props {
  data: CodWilayaRow[]
}

export default function CodExportButton({ data }: Props) {
  function handleExport() {
    const headers = [
      'Wilaya', 'Total COD', 'Collectées', 'Refusées', 'Retournées',
      'Non joignables', 'En attente', 'Taux collecte (%)',
      'Tentatives moy.', 'Montant collecté (DZD)', 'Montant perdu (DZD)',
    ]
    const rows = data.map((r) => [
      r.wilaya,
      r.total_cod_orders,
      r.collected,
      r.refused,
      r.returned,
      r.unreachable,
      r.pending_cod_orders,
      r.collection_rate_pct?.toFixed(1) ?? 'N/A',
      r.avg_attempts?.toFixed(2) ?? 'N/A',
      r.collected_amount_dzd,
      r.lost_amount_dzd,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `cod-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
    >
      <Download className="w-4 h-4" />
      Exporter CSV
    </button>
  )
}
