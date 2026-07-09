'use server'

import { createServerActionClient } from './server'
import { getVendorByUserId as getVendorByUserIdDb } from './vendors'
import {
  getVendorProductsPaginated as getVendorProductsPaginatedDb,
  getVendorProducts as getVendorProductsDb,
  getProducts as getProductsDb,
} from './products'
import { getStoreSettings as getStoreSettingsDb } from './settings'
import { checkVendorProductLimit as checkVendorProductLimitDb } from './server-utils'

export async function getVendorByUserId(userId: string) {
  const supabase = await createServerActionClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr) {
    console.error('[getVendorByUserId] auth error:', authErr)
    throw new Error(`Unauthorized: Auth error: ${authErr.message}`)
  }
  if (!user) {
    console.error('[getVendorByUserId] user is null')
    throw new Error('Unauthorized: user is null')
  }
  if (user.id !== userId) {
    console.error('[getVendorByUserId] ID mismatch:', user.id, 'vs', userId)
    throw new Error('Unauthorized: user ID mismatch')
  }
  return getVendorByUserIdDb(userId)
}

export async function getVendorProductsPaginated(
  vendorId: string,
  options?: {
    page?: number
    limit?: number
    search?: string
    sortBy?: 'created_at' | 'name' | 'price' | 'stock'
    sortOrder?: 'asc' | 'desc'
  }
) {
  return getVendorProductsPaginatedDb(vendorId, options)
}

export async function getVendorProducts(vendorId: string) {
  return getVendorProductsDb(vendorId)
}

export async function getProducts(nicheId?: string, category?: string) {
  return getProductsDb(nicheId, category)
}

export async function getStoreSettings() {
  return getStoreSettingsDb()
}

export async function checkVendorProductLimit(vendorId: string) {
  const supabase = await createServerActionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const vendor = await getVendorByUserIdDb(user.id)
  if (!vendor || vendor.id !== vendorId) {
    throw new Error('Unauthorized')
  }

  return checkVendorProductLimitDb(vendorId)
}
