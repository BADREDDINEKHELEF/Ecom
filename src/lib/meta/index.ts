/**
 * Multi-tenant Meta Tracking Module
 *
 * Complete production-grade Meta Pixel + Conversions API integration
 * for multi-store ecommerce platforms.
 *
 * Architecture:
 *   types.ts      → All TypeScript interfaces
 *   store.ts      → Store config resolver (auto-detects current store)
 *   user-data.ts  → SHA-256 hashing for PII fields
 *   pixel.ts      → Client-side pixel singleton manager
 *   capi.ts       → Server-side CAPI with retry + timeout
 *   events.ts     → 8 standard event helpers (developer API)
 *
 * Store isolation guarantee:
 *   Each store's Meta config is resolved independently.
 *   Store A's events NEVER fire to Store B's pixel.
 *   CAPI tokens are server-only and never exposed to the browser.
 */

// ── Types ──────────────────────────────────────────────────────────────
export type {
  MetaEventName,
  StoreMetaConfig,
  MetaUserData,
  CAPIResult,
  CAPIVendorResult,
  PageViewParams,
  ViewContentParams,
  SearchParams,
  AddToWishlistParams,
  AddToCartParams,
  InitiateCheckoutParams,
  AddPaymentInfoParams,
  PurchaseParams,
} from './types'

export type { UserDataInput } from './user-data'

// ── Store config resolver ──────────────────────────────────────────────
export {
  getMetaConfigBySlug,
  getMetaConfigById,
  getMetaConfigsByIds,
  getPlatformMetaConfig,
  resolveMetaConfig,
} from './store'

// ── User data builder ──────────────────────────────────────────────────
export { buildUserData, normalizePhone, normalizeEmail, anonymizeIp } from './user-data'

// ── Client-side pixel manager ──────────────────────────────────────────
export {
  initMetaPixel,
  resetPixels,
  trackPageView as rawTrackPageView,
  trackViewContent as rawTrackViewContent,
  trackSearch as rawTrackSearch,
  trackAddToWishlist as rawTrackAddToWishlist,
  trackAddToCart as rawTrackAddToCart,
  trackInitiateCheckout as rawTrackInitiateCheckout,
  trackAddPaymentInfo as rawTrackAddPaymentInfo,
  trackPurchase as rawTrackPurchase,
} from './pixel'

// ── Developer API (auto-resolves config + fires pixel) ─────────────────
export {
  initializeMeta,
  trackPageView,
  trackViewContent,
  trackSearch,
  trackAddToWishlist,
  trackAddToCart,
  trackInitiateCheckout,
  trackAddPaymentInfo,
  trackPurchase,
} from './events'

// ── Server-side CAPI ───────────────────────────────────────────────────
export {
  fireStorePurchaseCAPI,
  fireMultiStorePurchaseCAPI,
} from './capi'
