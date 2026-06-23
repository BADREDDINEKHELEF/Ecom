dexport const ADMIN_COOKIE_NAME = 'admin_token'

export function getAdminCookieName(): string {
  return ADMIN_COOKIE_NAME
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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  }
}
