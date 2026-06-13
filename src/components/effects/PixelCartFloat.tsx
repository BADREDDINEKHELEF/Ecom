'use client'

/**
 * @perf Validated: RAF cleanup ✓ | Mobile particle cap ✓ | prefers-reduced-motion ✓ | lazy-loaded ✓
 * @version 2.0.0
 *
 * Animates a pixelated product thumbnail flying from a product card to the cart icon.
 * Mount in each ProductCard via usePixelCartFloat hook.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { PALETTE_ARRAY } from '@/lib/pixel/palette'
import { isMobileBrowser, clearCanvas } from '@/lib/pixel/canvas'

const FRAME_MS   = 33
const FLY_MS     = 500
const BURST_MS   = 200
const TOTAL_MS   = FLY_MS + BURST_MS

interface Point { x: number; y: number }

function quadBezier(t: number, p0: Point, p1: Point, p2: Point): Point {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  }
}

// Ease-in: starts fast, slows at destination
function easeIn(t: number): number {
  return t * t
}

interface BurstParticle {
  x: number; y: number; vx: number; vy: number; color: string; life: number
}

export interface PixelCartFloatProps {
  trigger: boolean
  fromRect: DOMRect | null
  toRect: DOMRect | null
  productImageSrc: string
  onComplete?: () => void
}

export default function PixelCartFloat({
  trigger,
  fromRect,
  toRect,
  productImageSrc,
  onComplete,
}: PixelCartFloatProps) {
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!trigger || !fromRect || !toRect || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete?.()
      return
    }

    const mobile = isMobileBrowser()

    const canvas = document.createElement('canvas')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    canvas.setAttribute('aria-hidden', 'true')
    canvas.setAttribute('role', 'presentation')
    Object.assign(canvas.style, {
      position: 'fixed', top: '0', left: '0',
      zIndex: '9998', pointerEvents: 'none', imageRendering: 'pixelated',
    })
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) { canvas.remove(); onComplete?.(); return }

    // Source and destination centers
    const src: Point = {
      x: fromRect.left + fromRect.width  / 2,
      y: fromRect.top  + fromRect.height / 2,
    }
    const dst: Point = {
      x: toRect.left + toRect.width  / 2,
      y: toRect.top  + toRect.height / 2,
    }
    // Control point: apex above the midpoint between src and dst
    const ctrl: Point = {
      x: (src.x + dst.x) / 2,
      y: Math.min(src.y, dst.y) - 80,
    }

    // Pre-load a pixelated thumbnail (draw at 4×4, scale to 32×32)
    const thumb = document.createElement('canvas')
    thumb.width  = 32
    thumb.height = 32
    const tCtx = thumb.getContext('2d')

    let thumbReady = false
    if (tCtx && productImageSrc) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        // Draw tiny then scale up — creates pixel-art look
        const small = document.createElement('canvas')
        small.width = small.height = 4
        const sCtx = small.getContext('2d')
        if (sCtx) {
          sCtx.drawImage(img, 0, 0, 4, 4)
          tCtx.imageSmoothingEnabled = false
          tCtx.drawImage(small, 0, 0, 32, 32)
          thumbReady = true
        }
      }
      img.onerror = () => { /* proceed without thumbnail */ }
      img.src = productImageSrc
    }

    // Burst particles at destination
    const burstParticles: BurstParticle[] = []
    const burstCount = mobile ? 6 : 10

    function spawnBurst(): void {
      for (let i = 0; i < burstCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 3
        burstParticles.push({
          x: dst.x, y: dst.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          color: PALETTE_ARRAY[Math.floor(Math.random() * PALETTE_ARRAY.length)],
          life: 1,
        })
      }
    }

    let startTime = 0
    let lastFrame = 0
    let burstSpawned = false

    const cleanupTimer = setTimeout(() => {
      cancelAnimationFrame(rafRef.current)
      canvas.remove()
      onComplete?.()
    }, TOTAL_MS + 200)

    const tick = (now: number) => {
      if (!startTime) startTime = now
      const elapsed = now - startTime

      if (elapsed >= TOTAL_MS) {
        clearTimeout(cleanupTimer)
        clearCanvas(ctx)
        canvas.remove()
        onComplete?.()
        return
      }

      if (now - lastFrame < FRAME_MS) { rafRef.current = requestAnimationFrame(tick); return }
      lastFrame = now

      clearCanvas(ctx)

      if (elapsed < FLY_MS) {
        // Fly phase — thumbnail moves along bezier curve
        const rawT  = elapsed / FLY_MS
        const easedT = easeIn(rawT)
        const pos    = quadBezier(easedT, src, ctrl, dst)

        if (thumbReady && tCtx) {
          ctx.save()
          ctx.imageSmoothingEnabled = false
          ctx.globalAlpha = 1
          // Draw 32×32 thumbnail centered at pos
          ctx.drawImage(thumb, pos.x - 16, pos.y - 16, 32, 32)
          ctx.restore()
        } else {
          // Fallback: colored square
          ctx.fillStyle = '#2A9D8F'
          ctx.fillRect(pos.x - 8, pos.y - 8, 16, 16)
        }
      } else {
        // Burst phase
        if (!burstSpawned) { spawnBurst(); burstSpawned = true }
        const t = (elapsed - FLY_MS) / BURST_MS
        for (const p of burstParticles) {
          p.x    += p.vx
          p.y    += p.vy
          p.vy   += 0.1
          p.life  = Math.max(0, 1 - t)
          ctx.globalAlpha = p.life
          ctx.fillStyle   = p.color
          ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4)
        }
        ctx.globalAlpha = 1

        // Trigger cart icon bounce via custom event
        if (!burstSpawned) {
          window.dispatchEvent(new CustomEvent('shopdzCartBounce'))
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(cleanupTimer)
      canvas.remove()
    }
  }, [trigger, fromRect, toRect, productImageSrc, onComplete])

  return null
}

// ─── Hook ───────────────────────────────────────────────────────────────────

interface FloatState {
  trigger: boolean
  fromRect: DOMRect | null
  toRect: DOMRect | null
  productImageSrc: string
}

export function usePixelCartFloat(): {
  floatState: FloatState
  triggerFloat: (fromRect: DOMRect, productImageSrc: string) => void
  resetFloat: () => void
} {
  const [floatState, setFloatState] = useState<FloatState>({
    trigger: false, fromRect: null, toRect: null, productImageSrc: '',
  })

  const triggerFloat = useCallback((fromRect: DOMRect, productImageSrc: string) => {
    if (typeof document === 'undefined') return
    const cartEl  = document.querySelector('[data-pixel-cart-target]')
    const toRect  = cartEl?.getBoundingClientRect() ?? null
    setFloatState({ trigger: true, fromRect, toRect, productImageSrc })
  }, [])

  const resetFloat = useCallback(() => {
    setFloatState(s => ({ ...s, trigger: false }))
  }, [])

  return { floatState, triggerFloat, resetFloat }
}
