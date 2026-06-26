import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    maximumFractionDigits: 0,
  }).format(price)
}

export function discount(price: number, comparePrice: number): number {
  if (!comparePrice || comparePrice <= 0) return 0
  return Math.round(((comparePrice - price) / comparePrice) * 100)
}

export const COLOR_HEX: Record<string, string> = {
  Blanc: '#F9FAFB', Noir: '#111827', Gris: '#9CA3AF', Beige: '#D4B896',
  Marron: '#92400E', Rouge: '#EF4444', Rose: '#EC4899', Orange: '#F97316',
  Jaune: '#EAB308', Vert: '#22C55E', Bleu: '#3B82F6', Violet: '#8B5CF6',
}
