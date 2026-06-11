'use client'

// Hardcoded approximate rates (updated periodically, not live)
const RATES: Record<string, { symbol: string; rate: number }> = {
  MAD: { symbol: 'MAD', rate: 0.037 },
  EUR: { symbol: '€',   rate: 0.0069 },
}

interface CurrencyDisplayProps {
  amount: number
  showConverted?: 'MAD' | 'EUR'
  className?: string
}

export default function CurrencyDisplay({ amount, showConverted, className }: CurrencyDisplayProps) {
  const converted = showConverted ? RATES[showConverted] : null

  return (
    <span className={className}>
      <span className="font-semibold">{amount.toLocaleString('fr-DZ')} DA</span>
      {converted && (
        <span className="text-xs text-gray-400 ml-1">
          ≈ {(amount * converted.rate).toFixed(2)} {converted.symbol}
        </span>
      )}
    </span>
  )
}
