import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initMetaPixel, resetPixels } from '../lib/meta/pixel'
import { initializeMeta } from '../lib/meta/events'
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

  it('initializes pixel with user data and normalizes PII fields client-side', () => {
    initializeMeta(
      {
        storeId: 'test-store',
        storeSlug: 'test-slug',
        pixelId: '123456789012345',
        accessToken: null,
        testEventCode: null,
        datasetId: null,
        enabled: true,
      },
      {
        em: ' TEST@example.com ',
        ph: '0555123456',
      }
    )

    expect(window.fbq).toHaveBeenCalledWith('init', '123456789012345', {
      em: 'test@example.com',
      ph: '213555123456',
    })
  })

  it('upgrades initialization from no user data to user data, but prevents subsequent blank initializations from clearing it', () => {
    const config = {
      storeId: 'test-store',
      storeSlug: 'test-slug',
      pixelId: '123456789012345',
      accessToken: null,
      testEventCode: null,
      datasetId: null,
      enabled: true,
    }

    // 1. First init without user data (e.g. PageView)
    initializeMeta(config)
    expect(window.fbq).toHaveBeenLastCalledWith('init', '123456789012345')
    expect(window.fbq).toHaveBeenCalledTimes(1)

    // 2. Second init with user data (e.g. Checkout start)
    initializeMeta(config, { em: 'test@example.com', ph: '0555 123 456' })
    expect(window.fbq).toHaveBeenLastCalledWith('init', '123456789012345', {
      em: 'test@example.com',
      ph: '213555123456',
    })
    expect(window.fbq).toHaveBeenCalledTimes(2)

    // 3. Third init without user data (e.g. secondary page view/action) — must NOT re-init / override
    initializeMeta(config)
    expect(window.fbq).toHaveBeenCalledTimes(2) // call count should remain 2!
  })
})
