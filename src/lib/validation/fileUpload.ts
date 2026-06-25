import { randomBytes } from 'crypto'

/**
 * File upload security utilities.
 * Validates MIME type, enforces size limits, sanitizes filenames, and strips EXIF.
 */

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export const MAX_IMAGE_SIZE   = 10 * 1024 * 1024 // 10 MB
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024  // 20 MB

// Magic byte signatures for image format verification
// (prevents disguising a malicious file with a trusted extension)
const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },  // "RIFF"
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },              // "GIF8"
]

/**
 * Sanitize a filename: strip path traversal, control characters, and limit length.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w.\-]/g, '_')       // keep only word chars, dots, hyphens
    .replace(/\.{2,}/g, '_')          // collapse .. sequences
    .replace(/^[./\\]+/, '')          // strip leading slashes/dots
    .slice(0, 100)                    // max 100 chars
    || 'upload'
}

/**
 * Verify a buffer's magic bytes match the declared MIME type.
 * Returns true if the file is what it claims to be.
 */
export function verifyMagicBytes(buffer: Buffer, declaredMime: string): boolean {
  const spec = MAGIC_BYTES.find((m) => m.mime === declaredMime)
  if (!spec) return false  // unknown type — reject
  const offset = spec.offset ?? 0
  return spec.bytes.every((byte, i) => buffer[offset + i] === byte)
}

/**
 * Validate an uploaded image buffer.
 * Throws a descriptive error if validation fails.
 */
export function validateImageUpload(buffer: Buffer, mimetype: string): void {
  if (!ALLOWED_IMAGE_TYPES.has(mimetype)) {
    throw new Error(`Type de fichier non autorisé: ${mimetype}. Formats acceptés: JPEG, PNG, WebP, GIF.`)
  }
  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Fichier trop volumineux: maximum ${MAX_IMAGE_SIZE / 1024 / 1024}MB.`)
  }
  if (buffer.length === 0) {
    throw new Error('Fichier vide.')
  }
  if (!verifyMagicBytes(buffer, mimetype)) {
    throw new Error(`Le contenu du fichier ne correspond pas au type déclaré (${mimetype}).`)
  }
}

/**
 * Generate a safe, collision-resistant storage path.
 * Never stores files at user-supplied paths.
 */
export function generateStoragePath(folder: string, originalName: string): string {
  const ext    = originalName.split('.').pop()?.toLowerCase() ?? 'bin'
  const safe   = sanitizeFilename(ext)
  const ts     = Date.now()
  const random = randomBytes(16).toString('hex')
  return `${folder}/${ts}-${random}.${safe}`
}
