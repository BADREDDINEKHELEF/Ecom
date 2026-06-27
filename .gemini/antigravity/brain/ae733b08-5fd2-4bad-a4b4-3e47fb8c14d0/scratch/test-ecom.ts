import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { decryptField, isEncrypted } from '@/lib/utils/crypto'

async function run() {
  // Load local environment variables
  try {
    const envPath = path.resolve(__dirname, '../../../../../.env.local')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      envContent.split('\n').forEach((line: string) => {
        const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/)
        if (match) {
          let val = match[2].trim()
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
          process.env[match[1]] = val
        }
      })
    }
  } catch (e) {
    console.error('Could not load .env.local:', e)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data: configs, error } = await supabase
    .from('vendor_delivery_config')
    .select('vendor_id, default_provider, ecom_token')
    .not('ecom_token', 'is', null)

  if (error) {
    console.error('Supabase error:', error)
    return
  }

  if (!configs || configs.length === 0) {
    console.log('No vendors have configured Ecom tokens or RLS blocked read.')
    return
  }

  const dec = (v: string | null | undefined): string | null =>
    v ? (isEncrypted(v) ? decryptField(v) : v) : null

  // Let's test all configured tokens
  for (const config of configs) {
    const decryptedToken = dec(config.ecom_token)
    if (!decryptedToken) continue

    console.log('--- Config for vendor:', config.vendor_id, '---')
    console.log('Querying Ecom Delivery API for Alger...')
    
    try {
      const res = await fetch(`https://ecom-dz.net/api/v1/delivery-fees?wilaya=Alger`, {
        headers: { Authorization: `Bearer ${decryptedToken}` },
      })
      console.log('Status:', res.status)
      const json = await res.json()
      console.log('Response:', JSON.stringify(json, null, 2))
    } catch (err: any) {
      console.error('Fetch error:', err.message)
    }
  }
}

run()
