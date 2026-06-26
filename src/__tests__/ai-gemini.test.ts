import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateProductDescription, generateSEOMetadata, translateText, generateMarketingCopy } from '@/lib/ai/gemini'

describe('Gemini AI Helper Utility Tests', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', '') // Clear env variable by default
  })

  it('generateProductDescription returns a fallback description when key is missing', async () => {
    const result = await generateProductDescription({
      name: 'Robe Kabyle',
      category: 'Vêtements',
      nicheId: 'kids',
      features: 'Broderie main, coton bio',
    })

    expect(result).toHaveProperty('fr')
    expect(result).toHaveProperty('ar')
    expect(result).toHaveProperty('en')
    expect(result.fr).toContain('Robe Kabyle')
    expect(result.ar).toContain('Robe Kabyle')
  })

  it('generateSEOMetadata returns fallback SEO tags when key is missing', async () => {
    const result = await generateSEOMetadata({
      name: 'Robe Kabyle',
      category: 'Vêtements',
      description: 'Une belle robe traditionnelle.',
    })

    expect(result).toHaveProperty('metaTitle')
    expect(result).toHaveProperty('metaDescription')
    expect(result).toHaveProperty('tags')
    expect(Array.isArray(result.tags)).toBe(true)
    expect(result.tags).toContain('storedz')
    expect(result.metaTitle).toContain('Robe Kabyle')
  })

  it('translateText returns fallback translation when API key is missing', async () => {
    const text = 'Bonjour tout le monde'
    const resultFr = await translateText(text, 'fr')
    const resultAr = await translateText(text, 'ar')
    const resultEn = await translateText(text, 'en')

    expect(resultFr).toBe(`[Traduction FR] ${text}`)
    expect(resultAr).toBe(`[ترجمة AR] ${text}`)
    expect(resultEn).toBe(`[Translation EN] ${text}`)
  })

  it('generateMarketingCopy returns fallback marketing copy when API key is missing', async () => {
    const result = await generateMarketingCopy({
      name: 'Smart Watch',
      category: 'Electronics',
      description: 'A great smart watch.',
    })

    expect(result).toHaveProperty('sms')
    expect(result).toHaveProperty('instagram')
    expect(result.sms.fr).toContain('Smart Watch')
    expect(result.instagram.en).toContain('Smart Watch')
  })

  it('calls fetch with correct URL and prompt when GEMINI_API_KEY is defined', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'fake-api-key')

    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  fr: 'Description FR',
                  ar: 'الوصف AR',
                  en: 'Description EN',
                }),
              },
            ],
          },
        },
      ],
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })
    global.fetch = fetchMock

    const result = await generateProductDescription({
      name: 'Test Product',
      category: 'Test Category',
      nicheId: 'test-niche',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('key=fake-api-key')
    expect(result.fr).toBe('Description FR')
    expect(result.ar).toBe('الوصف AR')
    expect(result.en).toBe('Description EN')
  })
})
