'use server'

import { getVendorByUserId as getVendorByUserIdDb } from './vendors'
import {
  getVendorProductsPaginated as getVendorProductsPaginatedDb,
  getVendorProducts as getVendorProductsDb,
  getProducts as getProductsDb,
} from './products'
import { getStoreSettings as getStoreSettingsDb } from './settings'
import { checkVendorProductLimit as checkVendorProductLimitDb } from './server-utils'

export async function getVendorByUserId(userId: string) {
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
  return checkVendorProductLimitDb(vendorId)
}
