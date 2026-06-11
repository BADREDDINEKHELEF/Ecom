import { SignJWT, jwtVerify, decodeJwt, type JWTPayload } from 'jose'
import { randomUUID } from 'crypto'

const secret = () => {
  const s = process.env.ADMIN_JWT_SECRET
  if (!s) throw new Error('ADMIN_JWT_SECRET env var is not set')
  return new TextEncoder().encode(s)
}

// 8-hour session — long enough for a full workday without TOTP re-entry,
// but short enough to limit exposure if the cookie is ever stolen.
// Each token gets a unique JTI so it can be individually revoked on logout.
export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .setJti(randomUUID())
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
