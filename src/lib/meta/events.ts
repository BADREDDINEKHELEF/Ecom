/**
 * Developer-friendly event helpers.
 *
 * These are the primary API for developers to call.
 * Each function:
 *   1. Resolves the current store's Meta config automatically
 *   2. Fires the browser pixel event
 *   3. Returns the config for optional server-side CAPI (Purchase only)
 *
 * No hardcoded credentials — config is always resolved dynamically.
 */

import type {
  PageViewParams,
  ViewContentParams,
  SearchParams,
  AddToWishlistParams,
  AddToCartParams,
  InitiateCheckoutParams,
  AddPaymentInfoParams,
  PurchaseParams,
  StoreMetaConfig,
} from './types'

import { initMetaPixel } from './pixel'
import { normalizePhone } from './normalize'
import {
  trackPageView as pixelPageView,
  trackViewContent as pixelViewContent,
  trackSearch as pixelSearch,
  trackAddToWishlist as pixelAddToWishlist,
  trackAddToCart as pixelAddToCart,
  trackInitiateCheckout as pixelInitiateCheckout,
  trackAddPaymentInfo as pixelAddPaymentInfo,
  trackPurchase as pixelPurchase,
} from './pixel'

export interface MetaUserDataInput {
  em?: string | null
  ph?: string | null
}

/**
 * Ensure a store's pixel is initialized before firing events.
 * Safe to call multiple times — pixel init is idempotent.
 */
export function initializeMeta(config: StoreMetaConfig, userData?: MetaUserDataInput): void {
  if (typeof window === 'undefined') return
  if (!config.enabled || !config.pixelId) return
  
  if (userData?.em || userData?.ph) {
    const cleanUserData = {
      em: userData.em ? userData.em.trim().toLowerCase() : null,
      ph: userData.ph ? normalizePhone(userData.ph) : null,
    }
    initMetaPixel(config.pixelId, config.testEventCode, cleanUserData)
  } else {
    initMetaPixel(config.pixelId, config.testEventCode)
  }
}

// ── 8 standard events ─────────────────────────────────────────────────

/**
 * PageView — fires on every page load / route change.
 */
export function trackPageView(config: StoreMetaConfig, params?: PageViewParams): void {
  initializeMeta(config)
  pixelPageView(params)
}

/**
 * ViewContent — fires when a product or store page is viewed.
 */
export function trackViewContent(config: StoreMetaConfig, params: ViewContentParams): void {
  initializeMeta(config)
  pixelViewContent(params)
}

/**
 * Search — fires when a user searches.
 */
export function trackSearch(config: StoreMetaConfig, params: SearchParams): void {
  initializeMeta(config)
  pixelSearch(params)
}

/**
 * AddToWishlist — fires when a user adds an item to their wishlist.
 */
export function trackAddToWishlist(config: StoreMetaConfig, params: AddToWishlistParams): void {
  initializeMeta(config)
  pixelAddToWishlist(params)
}

/**
 * AddToCart — fires when a user adds an item to their cart.
 */
export function trackAddToCart(config: StoreMetaConfig, params: AddToCartParams): void {
  initializeMeta(config)
  pixelAddToCart(params)
}

/**
 * InitiateCheckout — fires when a user starts the checkout process.
 */
export function trackInitiateCheckout(
  config: StoreMetaConfig,
  params: InitiateCheckoutParams,
  userData?: MetaUserDataInput,
): void {
  initializeMeta(config, userData)
  pixelInitiateCheckout(params)
}

/**
 * AddPaymentInfo — fires when a user enters payment information.
 */
export function trackAddPaymentInfo(config: StoreMetaConfig, params: AddPaymentInfoParams): void {
  initializeMeta(config)
  pixelAddPaymentInfo(params)
}

/**
 * Purchase — fires after a successful order.
 * Returns the config for optional server-side CAPI call.
 */
export function trackPurchase(
  config: StoreMetaConfig,
  params: PurchaseParams,
  userData?: MetaUserDataInput,
): StoreMetaConfig {
  initializeMeta(config, userData)
  pixelPurchase(params)
  return config
}
