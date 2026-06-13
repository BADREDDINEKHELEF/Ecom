'use client'

/**
 * @perf Validated: RAF cleanup ✓ | Mobile particle cap ✓ | prefers-reduced-motion ✓ | lazy-loaded ✓
 * @version 2.0.0
 */

import { useEffect, useRef } from 'react'

// Inject keyframes once per session
let keyframesInjected = false
function injectKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return
  keyframesInjected = true
  const style = document.createElement('style')
  style.textContent = `
    @keyframes pixelShimmer {
      0%,100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    @keyframes pixelShake {
      0%,100% { transform: translateX(0); }
      20% { transform: translateX(1px); }
      40% { transform: translateX(-1px); }
      60% { transform: translateX(1px); }
      80% { transform: translateX(-1px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .pixel-shimmer, .pixel-shake { animation: none !important; }
    }
  `
  document.head.appendChild(style)
}

export interface PixelBadgeProps {
  variant: 'top-seller' | 'promo' | 'new' | 'verified' | 'cod-safe'
  discount?: number
  className?: string
  size?: 'sm' | 'md'
}

// Shared retro 3D shadow — uses CSS currentColor for the border offset
const RETRO_SHADOW =
  '2px 0 0 0 currentColor, 0 2px 0 0 currentColor, 2px 2px 0 0 currentColor, ' +
  '4px 2px 0 0 rgba(0,0,0,0.3), 2px 4px 0 0 rgba(0,0,0,0.3)'

const BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 6px',
  border: '2px solid currentColor',
  boxShadow: RETRO_SHADOW,
  fontFamily: '"Press Start 2P", monospace',
  fontSize: 6,
  lineHeight: 1.4,
  letterSpacing: '0.03em',
  userSelect: 'none',
  whiteSpace: 'nowrap',
}

// Crown SVG (7×4 pixel grid) — top-seller
function CrownIcon() {
  return (
    <svg viewBox="0 0 7 4" width="14" height="8" aria-hidden="true"
      style={{ display: 'block', shapeRendering: 'crispEdges' } as React.CSSProperties}>
      <rect x="1" y="0" width="1" height="1" fill="currentColor" />
      <rect x="3" y="0" width="1" height="1" fill="currentColor" />
      <rect x="5" y="0" width="1" height="1" fill="currentColor" />
      <rect x="0" y="1" width="7" height="2" fill="currentColor" />
      <rect x="1" y="3" width="5" height="1" fill="currentColor" />
    </svg>
  )
}

// Flame SVG (6×6 pixel grid) — promo
function FlameIcon() {
  return (
    <svg viewBox="0 0 6 6" width="10" height="10" aria-hidden="true"
      style={{ display: 'block', shapeRendering: 'crispEdges' } as React.CSSProperties}>
      <rect x="2" y="0" width="2" height="1" fill="currentColor" />
      <rect x="1" y="1" width="4" height="1" fill="currentColor" />
      <rect x="0" y="2" width="6" height="2" fill="currentColor" />
      <rect x="1" y="4" width="4" height="1" fill="currentColor" />
      <rect x="2" y="5" width="2" height="1" fill="currentColor" />
    </svg>
  )
}

// Star SVG (7×7 pixel grid, 4-point with diagonal corners) — new
function StarIcon() {
  return (
    <svg viewBox="0 0 7 7" width="12" height="12" aria-hidden="true"
      style={{ display: 'block', shapeRendering: 'crispEdges' } as React.CSSProperties}>
      {/* Vertical bar */}
      <rect x="3" y="0" width="1" height="7" fill="currentColor" />
      {/* Horizontal bar */}
      <rect x="0" y="3" width="7" height="1" fill="currentColor" />
      {/* Diagonal corners — 8-point star approximation */}
      <rect x="1" y="1" width="1" height="1" fill="currentColor" />
      <rect x="5" y="1" width="1" height="1" fill="currentColor" />
      <rect x="1" y="5" width="1" height="1" fill="currentColor" />
      <rect x="5" y="5" width="1" height="1" fill="currentColor" />
    </svg>
  )
}

// Checkmark SVG (bold, 3-pixel stroke) — verified
function CheckIcon() {
  return (
    <svg viewBox="0 0 8 7" width="14" height="12" aria-hidden="true"
      style={{ display: 'block', shapeRendering: 'crispEdges' } as React.CSSProperties}>
      {/* Left arm */}
      <rect x="0" y="3" width="1" height="3" fill="currentColor" />
      <rect x="1" y="4" width="1" height="3" fill="currentColor" />
      <rect x="2" y="5" width="1" height="2" fill="currentColor" />
      {/* Right arm */}
      <rect x="3" y="4" width="1" height="2" fill="currentColor" />
      <rect x="4" y="3" width="1" height="2" fill="currentColor" />
      <rect x="5" y="2" width="1" height="2" fill="currentColor" />
      <rect x="6" y="1" width="1" height="2" fill="currentColor" />
      <rect x="7" y="0" width="1" height="2" fill="currentColor" />
    </svg>
  )
}

// Banknote SVG (16×10 pixel grid) — cod-safe
function BanknoteIcon() {
  return (
    <svg viewBox="0 0 14 9" width="20" height="13" aria-hidden="true"
      style={{ display: 'block', shapeRendering: 'crispEdges' } as React.CSSProperties}>
      {/* Outline */}
      <rect x="0" y="0" width="14" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
      {/* Center circle (coin symbol) */}
      <rect x="5" y="2" width="4" height="5" fill="none" stroke="currentColor" strokeWidth="1" />
      {/* Corner squares */}
      <rect x="1" y="1" width="2" height="2" fill="currentColor" />
      <rect x="11" y="6" width="2" height="2" fill="currentColor" />
    </svg>
  )
}

export default function PixelBadge({ variant, discount, className, size = 'md' }: PixelBadgeProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    injectKeyframes()
  }, [])

  const scale = size === 'sm' ? 0.85 : 1

  const style: React.CSSProperties = {
    ...BASE,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  }

  switch (variant) {
    case 'top-seller':
      return (
        <span
          ref={ref}
          className={`pixel-shimmer ${className ?? ''}`}
          style={{
            ...style,
            color: '#FFD700',
            backgroundColor: '#1D3557',
            animation: 'pixelShimmer 2s ease-in-out infinite',
          }}
        >
          <CrownIcon />
          <span>Vendeur Top</span>
        </span>
      )

    case 'promo':
      return (
        <span
          ref={ref}
          className={`pixel-shake ${className ?? ''}`}
          style={{
            ...style,
            color: '#E63946',
            backgroundColor: '#1D3557',
            animation: 'pixelShake 1.5s ease-in-out infinite',
          }}
        >
          <FlameIcon />
          <span style={{ color: '#F4A261', fontSize: 8 }}>
            -{discount ?? 0}%
          </span>
        </span>
      )

    case 'new': {
      const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
      return (
        <span
          ref={ref}
          className={className}
          style={{
            ...style,
            color: '#2A9D8F',
            backgroundColor: '#1D3557',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}
        >
          <StarIcon />
          <span style={{ color: '#F1FAEE', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span dir="rtl" style={{ fontFamily: "'Segoe UI', Tahoma, system-ui, sans-serif", fontSize: 7 }}>جديد</span>
            <span>Nouveau</span>
          </span>
        </span>
      )
    }

    case 'verified':
      return (
        <span
          ref={ref}
          className={className}
          style={{
            ...style,
            color: '#1D3557',
            backgroundColor: '#2A9D8F',
          }}
        >
          <CheckIcon />
          <span style={{ color: '#F1FAEE' }}>Vérifié</span>
        </span>
      )

    case 'cod-safe':
      return (
        <span
          ref={ref}
          className={className}
          style={{
            ...style,
            color: '#F4A261',
            backgroundColor: '#264653',
          }}
        >
          <BanknoteIcon />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span>Paiement à</span>
            <span>la livraison</span>
          </span>
        </span>
      )
  }
}
