/**
 * Meta browser cookie utilities.
 *
 * Reads _fbp (Facebook browser ID) and _fbc (Facebook click ID) cookies
 * so they can be forwarded to the server-side CAPI for better attribution.
 *
 * https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc
 */

const FBP_REGEX = /^fb\.1\.\d+\.\d+$/
const FBC_REGEX = /^fb\.1\.\d+\.[\w-]+$/

/**
 * Read the _fbp cookie from the browser.
 * Returns null if the cookie doesn't exist or is malformed.
 */
export function getFbp(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/)
  if (!match) return null
  const value = decodeURIComponent(match[1])
  return FBP_REGEX.test(value) ? value : null
}

/**
 * Read the _fbc cookie from the browser.
 * Returns null if the cookie doesn't exist or is malformed.
 */
export function getFbc(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)_fbc=([^;]+)/)
  if (!match) return null
  const value = decodeURIComponent(match[1])
  return FBC_REGEX.test(value) ? value : null
}

/**
 * Read both fbp and fbc cookies at once.
 */
export function getMetaCookies(): { fbp: string | null; fbc: string | null } {
  return { fbp: getFbp(), fbc: getFbc() }
}
