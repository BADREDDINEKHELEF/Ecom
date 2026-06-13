export const PIXEL_PALETTE = {
  red:      '#E63946',
  orange:   '#F4A261',
  teal:     '#2A9D8F',
  navy:     '#1D3557',
  offwhite: '#F1FAEE',
  gold:     '#FFD700',
} as const

export type PixelColor = keyof typeof PIXEL_PALETTE
export const PALETTE_ARRAY: readonly string[] = Object.values(PIXEL_PALETTE)
