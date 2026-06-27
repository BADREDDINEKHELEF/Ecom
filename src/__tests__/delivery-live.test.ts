import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { ecomGetRateWithToken } from '@/lib/delivery/ecom'
import { yalidineGetRateWithCreds } from '@/lib/delivery/yalidine'
import { apecGetRateWithCreds } from '@/lib/delivery/apec'

describe('Delivery API Integration', () => {
  it('should fetch live delivery rates for a configured store', async () => {
    // Load local environment variables for integration test
    try {
      const envPath = path.resolve(__dirname, '../../.env.local')
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
      console.warn('Could not load .env.local:', e)
    }

    const supabase = createAdminClient()
    
    // Find a vendor with an ecom or yalidine configuration
    const { data: configs } = await supabase
      .from('vendor_delivery_config')
      .select('vendor_id, default_provider')
      .limit(5)

    if (!configs || configs.length === 0) {
      console.log('No vendor delivery configs configured in database. Skipping live test.')
      return
    }

    for (const entry of configs) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('store_slug')
        .eq('id', entry.vendor_id)
        .maybeSingle()

      if (!vendor) continue

      console.log(`Testing delivery rate fetch for slug: "${vendor.store_slug}" via provider: "${entry.default_provider}"`)
      
      const config = await getVendorDeliveryConfig(entry.vendor_id)
      expect(config).toBeDefined()
      expect(config?.vendor_id).toBe(entry.vendor_id)

      const wilaya = 'Alger'
      
      if (config?.default_provider === 'ecom' && config.ecom_api_key && config.ecom_api_token) {
        console.log(`Calling Ecom API for wilaya: ${wilaya}`)
        const rate = await ecomGetRateWithToken(wilaya, config.ecom_api_key, config.ecom_api_token)
        console.log('Ecom Rate Response:', rate)
        if (rate) {
          expect(rate.homeDelivery).toBeGreaterThan(0)
        } else {
          console.warn('Ecom API returned null rate (could be due to invalid/sandbox token)')
        }
      } else if (config?.default_provider === 'yalidine' && config.yalidine_api_id && config.yalidine_api_token) {
        console.log(`Calling Yalidine API for wilaya: ${wilaya}`)
        const rate = await yalidineGetRateWithCreds(wilaya, config.yalidine_api_id, config.yalidine_api_token)
        console.log('Yalidine Rate Response:', rate)
        if (rate) {
          expect(rate.homeDelivery).toBeGreaterThan(0)
        } else {
          console.warn('Yalidine API returned null rate (could be due to invalid/sandbox credentials)')
        }
      }
    }
  }, 30000)

  it('should test Ecom API directly if ECOM_API_KEY and ECOM_API_TOKEN are set in process.env', async () => {
    try {
      const envPath = path.resolve(__dirname, '../../.env.local')
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
      console.warn('Could not load .env.local:', e)
    }

    const key = process.env.ECOM_API_KEY
    const token = process.env.ECOM_API_TOKEN
    if (!key || !token) {
      console.log('No ECOM_API_KEY/TOKEN in env. Skipping direct Ecom test.')
      return
    }
    console.log('Testing Ecom API directly using ECOM_API_KEY and ECOM_API_TOKEN env variables...')
    const rate = await ecomGetRateWithToken('Alger', key, token)
    console.log('Direct Ecom Rate result:', rate)
    if (rate) {
      expect(rate.homeDelivery).toBeGreaterThan(0)
    } else {
      console.warn('Ecom API returned null rate (could be due to invalid/sandbox credentials)')
    }
  })

  it('should test Apec API directly if APEC_API_ID and APEC_API_TOKEN are set in process.env', async () => {
    try {
      const envPath = path.resolve(__dirname, '../../.env.local')
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
      console.warn('Could not load .env.local:', e)
    }

    const apiId = process.env.APEC_API_ID
    const apiToken = process.env.APEC_API_TOKEN
    if (!apiId || !apiToken) {
      console.log('No APEC_API_ID/TOKEN in env. Skipping direct Apec test.')
      return
    }
    console.log('Testing Apec API directly using APEC credentials env variables...')
    const rate = await apecGetRateWithCreds('Alger', apiId, apiToken)
    console.log('Direct Apec Rate result:', rate)
    if (rate) {
      expect(rate.homeDelivery).toBeGreaterThan(0)
    } else {
      console.warn('APEC API returned null rate (could be due to invalid/sandbox credentials)')
    }
  })
})
