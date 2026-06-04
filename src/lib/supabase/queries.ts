/**
 * queries.ts — re-export barrel
 *
 * All domain logic has been split into focused modules.
 * This file re-exports everything so existing imports continue to work
 * without touching every page file.
 *
 * Prefer importing directly from the domain module in new code:
 *   import { createOrder } from '@/lib/supabase/orders'
 *   import { getProducts } from '@/lib/supabase/products'
 */

export * from './niches'
export * from './products'
export * from './orders'
export * from './promo'
export * from './reviews'
export * from './vendors'
export * from './settings'
export * from './analytics'
export * from './shipments'
export * from './mutations'
