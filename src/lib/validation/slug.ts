// Shared slug validation for store/vendor URLs

export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'store',
  'auth',
  'seller',
  'dashboard',
  'search',
  'deals',
  'pricing',
  'checkout',
  'orders',
  'profile',
  'wishlist',
  'compare',
  'track',
  'cart',
  'offline',
  'register',
  'login',
  'shop',
  'become-seller',
  'contact',
  'faq',
  'terms',
  'privacy',
  'wholesale',
])

const SLUG_RE = /^[a-z0-9-]+$/

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}

export function isValidSlugFormat(slug: string): boolean {
  return SLUG_RE.test(slug) && !slug.startsWith('-') && !slug.endsWith('-') && !slug.includes('--')
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

export function validateStoreSlug(slug: string): { ok: true } | { ok: false; error: string } {
  if (!slug || slug.length < 1) return { ok: false, error: "L'URL de la boutique est requise." }
  if (slug.length > 50) return { ok: false, error: "L'URL ne doit pas dépasser 50 caractères." }
  if (!isValidSlugFormat(slug)) return { ok: false, error: "L'URL ne peut contenir que des lettres minuscules, chiffres et tirets." }
  if (isReservedSlug(slug)) return { ok: false, error: 'Cette URL est réservée. Choisissez un autre nom.' }
  return { ok: true }
}
