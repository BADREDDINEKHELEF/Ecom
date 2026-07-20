import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

async function run() {
  const { createAdminClient } = await import('../../../src/lib/supabase/admin')
  const supabase = createAdminClient()

  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('id, store_name, meta_pixel_id, meta_capi_token, meta_enabled')

  if (error) {
    console.error('Failed to fetch vendors:', error)
    process.exit(1)
  }

  console.log('Vendors Meta Configuration status:')
  console.log(JSON.stringify(vendors, null, 2))
}

run()
