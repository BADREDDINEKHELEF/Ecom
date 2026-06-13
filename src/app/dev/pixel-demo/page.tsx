'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import PixelBadge from '@/components/ui/PixelBadge'
import { usePixelCartPop } from '@/components/effects/usePixelCartPop'
import { usePixelCartFloat } from '@/components/effects/PixelCartFloat'

// Guard: this page only renders in dev
if (process.env.NODE_ENV === 'production') {
  throw new Error('pixel-demo page is dev-only')
}

const PixelConfetti  = dynamic(() => import('@/components/effects/PixelConfetti'),  { ssr: false })
const PixelCartFloat = dynamic(() => import('@/components/effects/PixelCartFloat').then(m => ({ default: m.default })), { ssr: false })

export default function PixelDemoPage() {
  const [confettiTrigger, setConfettiTrigger] = useState(false)
  const [confettiDone,    setConfettiDone]    = useState(false)
  const imgRef  = useRef<HTMLImageElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const { triggerPop } = usePixelCartPop()
  const { floatState, triggerFloat, resetFloat } = usePixelCartFloat()

  function fireConfetti() {
    setConfettiDone(false)
    setConfettiTrigger(true)
  }

  function fireCartPop() {
    triggerPop(imgRef)
  }

  function fireCartFloat() {
    if (cardRef.current) {
      triggerFloat(cardRef.current.getBoundingClientRect(), '/placeholder.png')
    }
  }

  function simulateNav() {
    window.dispatchEvent(new CustomEvent('shopdzNavStart'))
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('shopdzNavEnd', { detail: { pathname: '/demo' } }))
    }, 1500)
  }

  const btnStyle: React.CSSProperties = {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 9,
    padding: '10px 16px',
    backgroundColor: '#2A9D8F',
    color: '#F1FAEE',
    border: '2px solid #1D3557',
    cursor: 'pointer',
    boxShadow: '2px 2px 0 #1D3557',
    letterSpacing: '0.04em',
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: 48,
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 8,
    color: '#2A9D8F',
    marginBottom: 16,
    display: 'block',
    letterSpacing: '0.05em',
  }

  return (
    <div style={{ background: '#1D3557', minHeight: '100vh', padding: '48px 24px', color: '#F1FAEE' }}>
      <h1 style={{
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 14,
        color: '#F1FAEE',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 1.6,
      }}>
        🎮 ShopDZ Pixel System
      </h1>
      <p style={{
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 7,
        color: '#2A9D8F',
        textAlign: 'center',
        marginBottom: 48,
        letterSpacing: '0.04em',
      }}>
        Dev Preview — not visible in production
      </p>

      {/* ── Badges ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>PIXEL BADGES (all 5 variants)</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          <PixelBadge variant="top-seller" />
          <PixelBadge variant="promo" discount={30} />
          <PixelBadge variant="new" />
          <PixelBadge variant="verified" />
          <PixelBadge variant="cod-safe" />
          <PixelBadge variant="top-seller" size="sm" />
          <PixelBadge variant="cod-safe"   size="sm" />
        </div>
      </div>

      {/* ── PixelConfetti ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>PIXEL CONFETTI (3-wave burst + checkmark)</span>
        <button style={btnStyle} onClick={fireConfetti}>
          {confettiTrigger && !confettiDone ? 'RUNNING...' : 'FIRE CONFETTI'}
        </button>
        <PixelConfetti
          trigger={confettiTrigger && !confettiDone}
          onComplete={() => { setConfettiDone(true); setConfettiTrigger(false) }}
          message="تبارك الله! طلبك تأكد"
        />
      </div>

      {/* ── usePixelCartPop ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>PIXEL CART POP (flash → burst → stamp)</span>
        <div ref={cardRef} style={{ display: 'inline-block', position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=150&fit=crop"
            alt="Demo product"
            width={200}
            height={150}
            style={{ display: 'block', imageRendering: 'pixelated' }}
            crossOrigin="anonymous"
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <button style={btnStyle} onClick={fireCartPop}>FIRE CART POP</button>
        </div>
      </div>

      {/* ── PixelCartFloat ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>PIXEL CART FLOAT (bezier fly to cart icon)</span>
        <p style={{ fontFamily: 'sans-serif', fontSize: 11, color: '#F4A261', marginBottom: 12 }}>
          Add data-pixel-cart-target to a cart icon to see the full effect.
          Requires cart icon to be visible in the page header.
        </p>
        <button style={btnStyle} onClick={fireCartFloat}>FIRE CART FLOAT</button>
        <PixelCartFloat
          trigger={floatState.trigger}
          fromRect={floatState.fromRect}
          toRect={floatState.toRect}
          productImageSrc={floatState.productImageSrc}
          onComplete={resetFloat}
        />
      </div>

      {/* ── PixelLoadingBar sim ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>PIXEL LOADING BAR (simulate navigation)</span>
        <p style={{ fontFamily: 'sans-serif', fontSize: 11, color: '#F4A261', marginBottom: 12 }}>
          Cycles through 3 colors (red → teal → orange) with each navigation.
          Leading block has +50% brightness.
        </p>
        <button style={btnStyle} onClick={simulateNav}>SIMULATE NAV (1.5s)</button>
      </div>

      {/* ── Palette ── */}
      <div style={sectionStyle}>
        <span style={labelStyle}>SHOPDZ PIXEL PALETTE</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['#E63946', 'red'],
            ['#F4A261', 'orange'],
            ['#2A9D8F', 'teal'],
            ['#1D3557', 'navy'],
            ['#F1FAEE', 'offwhite'],
            ['#FFD700', 'gold'],
          ].map(([hex, name]) => (
            <div key={hex} style={{ textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, backgroundColor: hex, border: '2px solid #F1FAEE' }} />
              <p style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 5, color: '#F1FAEE', marginTop: 4 }}>
                {name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
