// @ts-strict
'use client'

interface PixelBadgeProps {
  variant: 'top-seller' | 'promo' | 'new' | 'verified'
  discount?: number
  className?: string
}

const CROWN_SVG = (
  <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
    <rect x="0" y="4" width="2" height="2" fill="#FFD700" />
    <rect x="7" y="2" width="2" height="2" fill="#FFD700" />
    <rect x="14" y="4" width="2" height="2" fill="#FFD700" />
    <rect x="0" y="6" width="2" height="4" fill="#FFD700" />
    <rect x="2" y="8" width="2" height="2" fill="#FFD700" />
    <rect x="4" y="6" width="2" height="4" fill="#FFD700" />
    <rect x="6" y="4" width="4" height="6" fill="#FFD700" />
    <rect x="10" y="6" width="2" height="4" fill="#FFD700" />
    <rect x="12" y="8" width="2" height="2" fill="#FFD700" />
    <rect x="14" y="6" width="2" height="4" fill="#FFD700" />
    <rect x="0" y="10" width="16" height="4" fill="#FFD700" />
    <rect x="2" y="10" width="2" height="2" fill="#FFA500" />
    <rect x="7" y="10" width="2" height="2" fill="#FFA500" />
    <rect x="12" y="10" width="2" height="2" fill="#FFA500" />
  </svg>
)

const TAG_SVG = (
  <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
    <rect x="2" y="0" width="8" height="2" fill="#E63946" />
    <rect x="10" y="2" width="2" height="2" fill="#E63946" />
    <rect x="12" y="4" width="2" height="2" fill="#E63946" />
    <rect x="0" y="2" width="2" height="8" fill="#E63946" />
    <rect x="2" y="2" width="8" height="8" fill="#E63946" />
    <rect x="10" y="4" width="2" height="6" fill="#E63946" />
    <rect x="12" y="6" width="4" height="4" fill="#E63946" />
    <rect x="4" y="10" width="6" height="2" fill="#E63946" />
    <rect x="2" y="12" width="4" height="2" fill="#E63946" />
    <rect x="8" y="12" width="4" height="2" fill="#E63946" />
    <rect x="4" y="14" width="2" height="2" fill="#E63946" />
    <rect x="10" y="14" width="2" height="2" fill="#E63946" />
    <rect x="3" y="4" width="2" height="2" fill="#fff" />
  </svg>
)

const STAR_SVG = (
  <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
    <rect x="6" y="0" width="4" height="2" fill="#2A9D8F" />
    <rect x="6" y="2" width="4" height="2" fill="#2A9D8F" />
    <rect x="0" y="6" width="16" height="4" fill="#2A9D8F" />
    <rect x="2" y="4" width="2" height="2" fill="#2A9D8F" />
    <rect x="12" y="4" width="2" height="2" fill="#2A9D8F" />
    <rect x="4" y="8" width="2" height="2" fill="#2A9D8F" />
    <rect x="10" y="8" width="2" height="2" fill="#2A9D8F" />
    <rect x="2" y="10" width="2" height="2" fill="#2A9D8F" />
    <rect x="6" y="10" width="4" height="2" fill="#2A9D8F" />
    <rect x="12" y="10" width="2" height="2" fill="#2A9D8F" />
    <rect x="0" y="12" width="2" height="2" fill="#2A9D8F" />
    <rect x="4" y="12" width="2" height="4" fill="#2A9D8F" />
    <rect x="10" y="12" width="2" height="4" fill="#2A9D8F" />
    <rect x="14" y="12" width="2" height="2" fill="#2A9D8F" />
  </svg>
)

const CHECK_SVG = (
  <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
    <rect x="10" y="2" width="2" height="2" fill="#3B82F6" />
    <rect x="8" y="4" width="2" height="2" fill="#3B82F6" />
    <rect x="6" y="6" width="2" height="2" fill="#3B82F6" />
    <rect x="4" y="8" width="2" height="2" fill="#3B82F6" />
    <rect x="2" y="6" width="2" height="2" fill="#3B82F6" />
    <rect x="4" y="8" width="2" height="2" fill="#3B82F6" />
    <rect x="12" y="2" width="2" height="2" fill="#3B82F6" />
    <rect x="12" y="4" width="2" height="2" fill="#3B82F6" />
    <rect x="10" y="6" width="2" height="2" fill="#3B82F6" />
    <rect x="8" y="8" width="2" height="2" fill="#3B82F6" />
    <rect x="6" y="10" width="2" height="2" fill="#3B82F6" />
    <rect x="4" y="10" width="2" height="2" fill="#3B82F6" />
    <rect x="2" y="8" width="2" height="2" fill="#3B82F6" />
  </svg>
)

const VARIANT_CONFIG = {
  'top-seller': {
    bg: '#1a1200',
    border: '#FFD700',
    text: '#FFD700',
    icon: CROWN_SVG,
    label: 'Vendeur Top',
    blink: false,
  },
  promo: {
    bg: '#1a0000',
    border: '#E63946',
    text: '#E63946',
    icon: TAG_SVG,
    label: '',
    blink: true,
  },
  new: {
    bg: '#001a18',
    border: '#2A9D8F',
    text: '#2A9D8F',
    icon: STAR_SVG,
    label: 'Nouveau',
    blink: false,
  },
  verified: {
    bg: '#00081a',
    border: '#3B82F6',
    text: '#3B82F6',
    icon: CHECK_SVG,
    label: 'Vérifié',
    blink: false,
  },
}

export default function PixelBadge({ variant, discount, className = '' }: PixelBadgeProps) {
  const cfg = VARIANT_CONFIG[variant]
  const label = variant === 'promo' ? `${discount ?? 0}%` : cfg.label

  return (
    <>
      {/* Blink keyframes injected once via style tag — respects prefers-reduced-motion */}
      {variant === 'promo' && (
        <style>{`
          @keyframes pixel-blink{0%,100%{opacity:1}50%{opacity:0.2}}
          @media(prefers-reduced-motion:reduce){.pixel-blink{animation:none!important}}
        `}</style>
      )}
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 ${className} ${variant === 'promo' ? 'pixel-blink' : ''}`}
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7px',
          lineHeight: '1.2',
          color: cfg.text,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: '2px',
          imageRendering: 'pixelated',
          animation: cfg.blink ? 'pixel-blink 1s step-start infinite' : undefined,
        }}
      >
        <span className="flex-shrink-0" style={{ imageRendering: 'pixelated' }}>
          {cfg.icon}
        </span>
        {label}
      </span>
    </>
  )
}
