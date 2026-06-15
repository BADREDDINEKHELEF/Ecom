'use client'

/**
 * Exports an array of objects to a CSV file downloaded by the browser.
 * BOM prefix (﻿) ensures Arabic/French characters render correctly
 * when opened in Excel on Algerian Windows machines.
 */
export function exportToCSV(data: unknown[], filename: string): void {
  if (!data.length) return
  const headers = Object.keys(data[0] as Record<string, unknown>)
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const csv = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => escape((row as Record<string, unknown>)[h])).join(',')),
  ].join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
