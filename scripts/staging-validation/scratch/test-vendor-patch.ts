import { updateVendor } from '../../../src/lib/supabase/vendors'
import { createAdminClient } from '../../../src/lib/supabase/admin'

async function run() {
  const supabase = createAdminClient()
  const { data: vendor, error: fetchErr } = await supabase
    .from('vendors')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (fetchErr || !vendor) {
    console.error('No vendor found to test with:', fetchErr)
    process.exit(1)
  }

  console.log(`Found vendor ID: ${vendor.id}. Attempting update...`)

  try {
    await updateVendor(vendor.id, {
      meta_pixel_id: '123456789012345',
      meta_test_event_code: 'TEST12345',
      meta_enabled: true,
      meta_capi_token: 'test-token',
      tiktok_pixel_id: 'TEST1234567890',
      tiktok_capi_token: 'test-tiktok-token',
      gtag_api_secret: 'test-gtag-secret',
    })
    console.log('Update succeeded!')
  } catch (err: any) {
    console.error('Update failed with error:', {
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code,
    })
  }
}

run()
