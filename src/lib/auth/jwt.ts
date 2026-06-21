import { SignJWT, jwtVerify, decodeJwt, type JWTPayload } from 'jose'
import { randomUUID } from 'crypto'

const secret = () => {
  const s = process.env.ADMIN_JWT_SECRET
  if (!s) throw new Error('ADMIN_JWT_SECRET env var is not set')
  return new TextEncoder().encode(s)
}

// 2-hour session — reduced from 8h to limit exposure window if the cookie is stolen.
// The admin UI auto-refreshes at the 1h50m mark (via /api/admin/refresh) so the
// session stays alive during active use without requiring re-authentication.
// Each token gets a unique JTI so it can be individually revoked on logout.
export const ADMIN_TOKEN_MAX_AGE_SECONDS = 2 * 60 * 60  // 2 hours

/**
 * Signs a new admin JWT.
 * Pass a pre-generated JTI when you need the identifier before signing
 * (e.g. to create the session record first). Omit to auto-generate one.
 */
export async function signAdminToken(jti: string = randomUUID()): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .setJti(jti)
    .sign(secret())
}

export async function verifyAdminToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    if (payload.role !== 'admin') return null
    return payload
  } catch {
    return null
  }
}

/** Decode without verifying signature — used only to extract JTI for revocation. */
export function decodeAdminToken(token: string): JWTPayload | null {
  try {
    return decodeJwt(token)
  } catch {
    return null
  }
}
