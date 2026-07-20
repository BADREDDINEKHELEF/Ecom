import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initMetaPixel, resetPixels } from '../lib/meta/pixel'
import { normalizePhone, normalizeEmail } from '../lib/meta/normalize'

describe('Meta Pixel Client-Side Initialization & Normalization', () => {
  beforeEach(() => {
    // Mock window object and fbq function
    vi.stubGlobal('window', {
      fbq: vi.fn(),
    })
    resetPixels()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('correctly normalizes Algerian phone numbers to digits-only international format', () => {
    expect(normalizePhone('0555123456')).toBe('213555123456')
    expect(normalizePhone('+213 555 123 456')).toBe('213555123456')
    expect(normalizePhone('213555123456')).toBe('213555123456')
    expect(normalizePhone('0770 11 22 33')).toBe('213770112233')
  })

  it('correctly normalizes email addresses', () => {
    expect(normalizeEmail(' USER@Example.com ')).toBe('user@example.com')
  })

  it('initializes pixel without user data and registers it in initializedPixels', () => {
    initMetaPixel('123456789012345')

    expect(window.fbq).toHaveBeenCalledWith('init', '123456789012345')
    expect(window.fbq).toHaveBeenCalledTimes(1)

    // Call it again — should not re-initialize
    initMetaPixel('123456789012345')
    expect(window.fbq).toHaveBeenCalledTimes(1)
  })
})
