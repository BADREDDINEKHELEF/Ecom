'use client'

import { useState, useId } from 'react'
import { Phone, CheckCircle, XCircle } from 'lucide-react'
import { isValidAlgerianPhone } from '@/lib/validation/phone'

interface Props {
  value:       string
  onChange:    (value: string) => void
  onBlur?:     () => void
  error?:      string
  disabled?:   boolean
  label?:      string
  placeholder?: string
}

/**
 * Mobile-first Algerian phone input.
 *
 * - Numeric keyboard on mobile (inputMode="tel")
 * - Real-time validation with clear visual feedback
 * - Accepts local (06...) and international (+213...) formats
 * - Strips non-numeric noise characters automatically on blur
 */
export default function PhoneInput({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  label = 'Numéro de téléphone',
  placeholder = '06 XX XX XX XX',
}: Props) {
  const id = useId()
  const [touched, setTouched] = useState(false)

  const clean   = value.replace(/[\s\-().]/g, '')
  const isValid = clean.length > 0 && isValidAlgerianPhone(clean)
  const hasError = touched && (!!error || (clean.length > 0 && !isValid))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow typing — only strip clearly non-phone characters (letters etc.)
    const raw = e.target.value.replace(/[^\d\s+\-().]/g, '')
    onChange(raw)
  }

  function handleBlur() {
    setTouched(true)
    onBlur?.()
  }

  const borderColor = hasError
    ? 'border-red-400 focus-within:ring-red-400/30'
    : isValid && touched
    ? 'border-green-400 focus-within:ring-green-400/30'
    : 'border-gray-300 focus-within:ring-indigo-400/30'

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          <span className="text-red-500 ml-0.5">*</span>
        </label>
      )}

      <div className={`flex items-center gap-2 border rounded-xl px-3 focus-within:ring-2 transition-all bg-white ${borderColor} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Country flag + prefix */}
        <div className="flex items-center gap-1.5 shrink-0 border-r border-gray-200 pr-3 py-3">
          <span className="text-base leading-none" aria-hidden>🇩🇿</span>
          <span className="text-sm font-medium text-gray-500">+213</span>
        </div>

        <Phone className="w-4 h-4 text-gray-400 shrink-0" />

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          pattern="(\+?213[5-7]|0[5-7])[0-9]{8}"
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className="flex-1 py-3 text-base bg-transparent focus:outline-none placeholder:text-gray-300 min-w-0"
        />

        {/* Validation icon */}
        {touched && clean.length > 0 && (
          isValid
            ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            : <XCircle    className="w-4 h-4 text-red-400 shrink-0" />
        )}
      </div>

      {/* Hint or error */}
      {hasError ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          {error ?? 'Format invalide — ex: 0655 12 34 56 ou +213 655 12 34 56'}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-gray-400">
          Format: 06XXXXXXXX, 07XXXXXXXX ou +213XXXXXXXXX
        </p>
      )}
    </div>
  )
}
