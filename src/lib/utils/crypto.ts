import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * AES-256-GCM authenticated encryption for sensitive fields stored in the DB
 * (e.g. vendor API tokens, webhook secrets).
 *
 * Requires env var: FIELD_ENCRYPTION_KEY (64 hex chars = 32 bytes)
 * Generate with: openssl rand -hex 32
 *
 * Ciphertext format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */

function getKey(): Buffer {
  const hex = process.env.FIELD_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY must be set to 64 hex characters (32 bytes). ' +
      'Generate with: openssl rand -hex 32'
    )
  }
  return Buffer.from(hex, 'hex')
}

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES  = 12   // 96-bit IV — recommended for GCM
const TAG_BYTES = 16   // 128-bit auth tag

export function encryptField(plaintext: string): string {
  const key = getKey()
  const iv  = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decryptField(ciphertext: string): string {
  const key = getKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const [ivHex, tagHex, encHex] = parts
  const iv      = Buffer.from(ivHex, 'hex')
  const tag     = Buffer.from(tagHex, 'hex')
  const enc     = Buffer.from(encHex, 'hex')
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error('Invalid ciphertext — wrong IV or tag length')
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(enc).toString('utf8') + decipher.final('utf8')
}

/**
 * Returns true if the value looks like an encrypted field (was run through
 * encryptField). Use this to support gradual migration of existing plaintext
 * values: decrypt only if already encrypted.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  return (
    parts.length === 3 &&
    parts[0].length === IV_BYTES * 2 &&
    parts[1].length === TAG_BYTES * 2
  )
}
