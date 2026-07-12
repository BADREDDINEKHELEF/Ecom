/**
 * Diagnostic script: fetch Ecom delivery-related data (communes + stop desks).
 *
 * Uses the endpoints shared by the user:
 *   GET /Api_v1/Commune
 *   GET /Api_v1/Commune/{IDWilaya}
 *   GET /Api_v1/Stopdesk
 *   GET /Api_v1/Stopdesk/{IDWilaya}
 *
 * Run with real credentials:
 *   ECOM_API_KEY=<key> ECOM_API_TOKEN=<token> npx tsx scripts/delivery/fetch-ecom-rates.ts
 *
 * Outputs:
 *   - Console summary of communes, stop desks, and any tariff/rate fields found.
 *   - scripts/delivery/ecom-communes.json
 *   - scripts/delivery/ecom-stopdesks.json
 *   - scripts/delivery/ecom-stopdesks-per-wilaya.json
 */

import { ecomTestConnection } from '@/lib/delivery/ecom'
import { deliveryFetch } from '@/lib/delivery/client'
import { ALL_WILAYAS, WILAYA_DATA } from '@/lib/data/wilayas'
import { promises as fs } from 'fs'
import * as path from 'path'

const BASE_URL = 'https://ecom-dz.net/Api_v1'

function authHeaders(key: string, token: string): Record<string, string> {
  return { Key: key, Token: token, Accept: 'application/json' }
}

async function fetchJson(
  url: string,
  key: string,
  token: string,
  timeoutMs = 15000
): Promise<{ ok: boolean; status: number; data: unknown; text: string }> {
  try {
    const res = await deliveryFetch(url, { headers: authHeaders(key, token) }, timeoutMs)
    const text = await res.text()
    let data: unknown = null
    try {
      data = JSON.parse(text)
    } catch {
      // keep raw text
    }
    return { ok: res.ok, status: res.status, data, text }
  } catch (err: unknown) {
    return {
      ok: false,
      status: 0,
      data: null,
      text: err instanceof Error ? err.message : String(err),
    }
  }
}

function getWilayaId(name: string): number | null {
  const info = WILAYA_DATA[name]
  if (!info) return null
  // The canonical ordering index (1–58) is what Ecom likely expects.
  const idx = ALL_WILAYAS.findIndex((w) => w === info.name)
  return idx >= 0 ? idx + 1 : null
}

function extractNumeric(obj: unknown, keys: string[]): number | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  const record = obj as Record<string, unknown>
  for (const key of keys) {
    const val = record[key]
    if (val !== undefined && val !== null && val !== '') {
      const n = Number(val)
      if (!isNaN(n)) return n
    }
  }
  return undefined
}

async function main() {
  const key = process.env.ECOM_API_KEY
  const token = process.env.ECOM_API_TOKEN

  if (!key || !token) {
    console.error('Error: ECOM_API_KEY and ECOM_API_TOKEN are required.')
    console.error(
      'Run: ECOM_API_KEY=<key> ECOM_API_TOKEN=<token> npx tsx scripts/delivery/fetch-ecom-rates.ts'
    )
    process.exit(1)
  }

  console.log('Testing Ecom connection with /Api_v1/Test ...')
  const test = await ecomTestConnection(key, token)
  console.log('Connection test response:', JSON.stringify(test, null, 2))
  console.log()

  const outDir = path.resolve(process.cwd(), 'scripts', 'delivery')
  await fs.mkdir(outDir, { recursive: true })

  // 1. Communes
  console.log('Fetching /Api_v1/Commune ...')
  const communes = await fetchJson(`${BASE_URL}/Commune`, key, token)
  await fs.writeFile(
    path.join(outDir, 'ecom-communes.json'),
    JSON.stringify(communes, null, 2)
  )
  console.log(`  status=${communes.status} ok=${communes.ok}`)

  // 2. All stop desks
  console.log('Fetching /Api_v1/Stopdesk ...')
  const stopdesks = await fetchJson(`${BASE_URL}/Stopdesk`, key, token)
  await fs.writeFile(
    path.join(outDir, 'ecom-stopdesks.json'),
    JSON.stringify(stopdesks, null, 2)
  )
  console.log(`  status=${stopdesks.status} ok=${stopdesks.ok}`)

  // 3. Per-wilaya stop desks (where the pricing usually lives)
  console.log('Fetching /Api_v1/Stopdesk/{IDWilaya} for each wilaya ...')
  const perWilaya: Record<
    string,
    { id: number | null; status: number; ok: boolean; count: number; sample: unknown; rates: { min?: number; max?: number } }
  > = {}

  for (const wilaya of ALL_WILAYAS) {
    const id = getWilayaId(wilaya)
    if (id == null) {
      perWilaya[wilaya] = { id: null, status: 0, ok: false, count: 0, sample: null, rates: {} }
      console.log(`${wilaya.padEnd(20)} no ID mapping`)
      continue
    }

    const res = await fetchJson(`${BASE_URL}/Stopdesk/${id}`, key, token, 10000)
    const rows = Array.isArray(res.data)
      ? res.data
      : Array.isArray((res.data as Record<string, unknown> | null)?.data)
        ? ((res.data as Record<string, unknown>).data as unknown[])
        : []

    const prices = rows
      .map((r) =>
        extractNumeric(r, [
          'Tarif',
          'tarif',
          'Prix',
          'prix',
          'Frais',
          'frais',
          'TarifStopDesk',
          'TarifDomicile',
          'tarif_stopdesk',
          'tarif_domicile',
          'Fee',
          'fee',
          'Price',
          'price',
        ])
      )
      .filter((n): n is number => n !== undefined)

    const sample = rows.length > 0 ? rows[0] : null
    perWilaya[wilaya] = {
      id,
      status: res.status,
      ok: res.ok,
      count: rows.length,
      sample,
      rates: {
        min: prices.length ? Math.min(...prices) : undefined,
        max: prices.length ? Math.max(...prices) : undefined,
      },
    }

    const rateStr = prices.length ? `min=${prices[0]} max=${prices[prices.length - 1]}` : 'no rates'
    console.log(`${wilaya.padEnd(20)} id=${id} status=${res.status} count=${rows.length} ${rateStr}`)

    // Be polite to the provider API.
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  await fs.writeFile(
    path.join(outDir, 'ecom-stopdesks-per-wilaya.json'),
    JSON.stringify(perWilaya, null, 2)
  )

  console.log(`\nFiles saved to ${outDir}:`)
  console.log('  - ecom-communes.json')
  console.log('  - ecom-stopdesks.json')
  console.log('  - ecom-stopdesks-per-wilaya.json')

  // Suggest static rates where we found consistent single values.
  const staticLines: string[] = []
  for (const [wilaya, info] of Object.entries(perWilaya)) {
    if (info.rates.min !== undefined && info.rates.min === info.rates.max) {
      staticLines.push(
        `  '${wilaya}': { homeDelivery: ${info.rates.min}, deskDelivery: ${info.rates.min} },`
      )
    }
  }

  if (staticLines.length) {
    console.log('\nPossible static-rate candidates (verify before using):')
    console.log('const ECOM_STATIC_RATES = {')
    for (const line of staticLines) console.log(line)
    console.log('}')
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
