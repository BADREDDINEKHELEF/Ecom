'use server'

// This file centralizes cookie management for the admin token.

const ADMIN_TOKEN_COOKIE_BASE_NAME = 'casbah_admin_token'

/**
 * Determines the correct admin cookie name based on the environment.
 * In production, it uses the __Host- prefix for enhanced security against
 * cookie-injection attacks from subdomains.
 */
export function getAdminCookieName(): string {
  if (process.env.NODE_ENV === 'production') {
    return `__Host-${ADMIN_TOKEN_COOKIE_BASE_NAME}`
  }
  return ADMIN_TOKEN_COOKIE_BASE_NAME
}

/**
 * Gets the appropriate cookie options for the admin token.
 * In production, it enforces the 'Secure' flag, which is a requirement
 * for the __Host- prefix and a crucial security best practice.
 */
export function getAdminCookieOptions(maxAge: number) {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
    // The 'Secure' flag is mandatory for the __Host- prefix.
    secure: isProduction,
  }
}