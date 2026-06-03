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
