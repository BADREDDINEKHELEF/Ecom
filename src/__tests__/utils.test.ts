import { describe, it, expect } from 'vitest'
import { cn, formatPrice, discount, COLOR_HEX } from '@/lib/utils'

describe('cn (classname merge)', () => {
  it('merges tailwind classes and deduplicates', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
  })

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('')
  })
})

describe('formatPrice', () => {
  it('formats a price in DZD with no decimals', () => {
    const result = formatPrice(1500)
    expect(result).toContain('1')
    expect(result).toContain('500')
    expect(result).toContain('DA')
  })

  it('formats zero', () => {
    const result = formatPrice(0)
    expect(result).toContain('0')
  })

  it('formats large numbers with grouping', () => {
    const result = formatPrice(1000000)
    expect(result).toContain('000')
  })
})

describe('discount', () => {
  it('calculates correct discount percentage', () => {
    expect(discount(80, 100)).toBe(20)
  })

  it('returns 0 when comparePrice is 0', () => {
    expect(discount(80, 0)).toBe(0)
  })

  it('returns 0 when comparePrice is negative', () => {
    expect(discount(80, -10)).toBe(0)
  })

  it('rounds to nearest integer', () => {
    expect(discount(67, 100)).toBe(33)
  })

  it('handles price equal to comparePrice (0% off)', () => {
    expect(discount(100, 100)).toBe(0)
  })

  it('handles price of 0 (100% off)', () => {
    expect(discount(0, 100)).toBe(100)
  })
})

describe('COLOR_HEX', () => {
  it('has expected color entries', () => {
    expect(COLOR_HEX.Blanc).toBe('#F9FAFB')
    expect(COLOR_HEX.Noir).toBe('#111827')
    expect(COLOR_HEX.Rouge).toBe('#EF4444')
    expect(COLOR_HEX.Bleu).toBe('#3B82F6')
  })
})
