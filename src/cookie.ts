export const ADMIN_COOKIE_NAME = 'admin_token'
export const ADMIN_COOKIE_NAME_HOST = '__Host-admin_token'

// Use the __Host- prefix in production/Vercel for defense-in-depth against
// subdomain cookie injection. The prefix requires Secure, Path=/, and no Domain.
export function getAdminCookieName(): string {
  const isProductionHost =
    process.env.ADMIN_COOKIE_HOST_PREFIX === 'true' ||
    !!process.env.VERCEL ||
    process.env.NODE_ENV === 'production'
  return isProductionHost ? ADMIN_COOKIE_NAME_HOST : ADMIN_COOKIE_NAME
}

export function getAdminCookieOptions(maxAgeSeconds: number): {
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax' | 'strict' | 'none'
    path: string
    maxAge: number
  } {
  return {
    httpOnly: true,
    secure: process.env.ADMIN_COOKIE_SECURE === 'true' || !!process.env.VERCEL || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeSeconds,
  }
}