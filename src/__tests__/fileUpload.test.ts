import { describe, it, expect } from 'vitest'
import {
  sanitizeFilename,
  verifyMagicBytes,
  validateImageUpload,
  generateStoragePath,
  MAX_IMAGE_SIZE,
} from '@/lib/validation/fileUpload'

describe('sanitizeFilename', () => {
  it('strips path traversal characters', () => {
    const result = sanitizeFilename('../../etc/passwd')
    expect(result).not.toContain('..')
    expect(result).not.toContain('/')
    expect(result).toContain('etc')
    expect(result).toContain('passwd')
  })

  it('replaces special characters with underscore', () => {
    expect(sanitizeFilename('my file (1).jpg')).toBe('my_file__1_.jpg')
  })

  it('collapses double dots', () => {
    expect(sanitizeFilename('file..name.jpg')).toBe('file_name.jpg')
  })

  it('strips leading slashes and dots', () => {
    // The regex replaces non-word chars first, so . becomes _ then leading strip applies
    const result = sanitizeFilename('./hidden')
    expect(result).not.toContain('/')
    expect(result).not.toContain('..')
    const result2 = sanitizeFilename('/root/path')
    expect(result2).not.toContain('/')
  })

  it('limits to 100 characters', () => {
    const long = 'a'.repeat(200) + '.jpg'
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(100)
  })

  it('returns "upload" for empty string', () => {
    expect(sanitizeFilename('')).toBe('upload')
  })
})

describe('verifyMagicBytes', () => {
  it('verifies JPEG magic bytes', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])
    expect(verifyMagicBytes(buf, 'image/jpeg')).toBe(true)
  })

  it('verifies PNG magic bytes', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    expect(verifyMagicBytes(buf, 'image/png')).toBe(true)
  })

  it('verifies WebP (RIFF) magic bytes', () => {
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00])
    expect(verifyMagicBytes(buf, 'image/webp')).toBe(true)
  })

  it('verifies GIF magic bytes', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    expect(verifyMagicBytes(buf, 'image/gif')).toBe(true)
  })

  it('rejects mismatched magic bytes', () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00])
    expect(verifyMagicBytes(buf, 'image/jpeg')).toBe(false)
  })

  it('rejects unknown MIME type', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff])
    expect(verifyMagicBytes(buf, 'application/pdf')).toBe(false)
  })
})

describe('validateImageUpload', () => {
  it('throws for disallowed MIME type', () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46]) // PDF magic
    expect(() => validateImageUpload(buf, 'application/pdf')).toThrow('non autorisé')
  })

  it('throws for oversized file', () => {
    const buf = Buffer.alloc(MAX_IMAGE_SIZE + 1, 0xff)
    expect(() => validateImageUpload(buf, 'image/jpeg')).toThrow('volumineux')
  })

  it('throws for empty file', () => {
    const buf = Buffer.alloc(0)
    expect(() => validateImageUpload(buf, 'image/jpeg')).toThrow('vide')
  })

  it('throws for MIME mismatch (claims jpeg but is png)', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(() => validateImageUpload(buf, 'image/jpeg')).toThrow('ne correspond pas')
  })

  it('passes for valid JPEG', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(100).fill(0x00)])
    expect(() => validateImageUpload(buf, 'image/jpeg')).not.toThrow()
  })
})

describe('generateStoragePath', () => {
  it('produces a path with the correct folder', () => {
    const path = generateStoragePath('products', 'photo.jpg')
    expect(path.startsWith('products/')).toBe(true)
  })

  it('includes the sanitized extension', () => {
    const path = generateStoragePath('uploads', 'image.png')
    expect(path.endsWith('.png')).toBe(true)
  })

  it('generates unique paths for same input', () => {
    const a = generateStoragePath('uploads', 'same.jpg')
    const b = generateStoragePath('uploads', 'same.jpg')
    expect(a).not.toBe(b)
  })

  it('sanitizes dangerous extensions', () => {
    const path = generateStoragePath('uploads', 'file.../../exe')
    expect(path).not.toContain('..')
  })
})
