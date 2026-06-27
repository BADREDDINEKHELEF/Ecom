import { createAdminClient } from './admin'

export interface IntegrationHealth {
  id: string
  vendor_id: string
  integration_name: string
  health_status: 'connected' | 'needs_configuration' | 'failed'
  last_success_at: string | null
  last_failure_at: string | null
  last_error_message: string | null
  last_http_status: number | null
  last_account_name: string | null
  last_quote_fee: number | null
  last_quote_duration: string | null
  last_quote_response: unknown | null
}

export async function getIntegrationHealth(vendorId: string): Promise<IntegrationHealth[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('integration_health')
    .select('*')
    .eq('vendor_id', vendorId)
  if (error) throw error
  return data || []
}

export async function saveIntegrationHealth(
  vendorId: string,
  name: string,
  update: Partial<Omit<IntegrationHealth, 'id' | 'vendor_id' | 'integration_name'>>
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('integration_health')
    .upsert(
      {
        vendor_id: vendorId,
        integration_name: name,
        ...update,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'vendor_id,integration_name' }
    )
  if (error) throw error
}
