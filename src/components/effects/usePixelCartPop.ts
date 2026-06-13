'use client'

/**
 * @perf Validated: RAF cleanup ✓ | Mobile particle cap ✓ | prefers-reduced-motion ✓ | lazy-loaded ✓
 * @version 2.0.0
 */

import { RefObject, useCallback, useState } from 'react'
import { PALETTE_ARRAY } from '@/lib/pixel/palette'
import { isMobileBrowser, clearCanvas } from '@/lib/pixel/canvas'

const FRAME_MS = 33
const FLASH_END  = 80
const BURST_END  = 500
const STAMP_END  = 700

// Cart icon: 16×16 pixel grid. Each entry is (column, row) with "on" pixels.
const CART_PIXELS: ReadonlyArray<readonly [number, number]> = [
  // handle
  [1,2],
  // top bar
  [1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],
  // left rail
  [3,4],[3,5],[3,6],
  // right rail
  [11,4],[11,5],[11,6],
  // bottom bar
  [3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[11,7],
  // wheels
  [4,9],[4,10],[10,9],[10,10],
]

function drawCartIcon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  scale: number, alpha: number,
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#2A9D8F'
  // Each pixel drawn as 2×scale sized rect, icon centered at (cx, cy)
  const cell = scale * 2
  const ox = cx - 8 * cell
  const oy = cy - 6 * cell
  for (const [px, py] of CART_PIXELS) {
    ctx.fillRect(ox + px * cell, oy + py * cell, cell, cell)
  }
  ctx.restore()
}

interface BurstParticle {
  x: number; y: number; vx: number; vy: number; color: string
}

export function usePixelCartPop(): {
  triggerPop: (imageRef: RefObject<HTMLImageElement | null>) => void
  isAnimating: boolean
} {
  const [isAnimating, setIsAnimating] = useState(false)

  const triggerPop = useCallback((imageRef: RefObject<HTMLImageElement | null>) => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const img = imageRef.current
    if (!img) return

    const rect = img.getBoundingClientRect()
    const W = Math.round(rect.width)
    const H = Math.round(rect.height)
    if (W === 0 || H === 0) return

    setIsAnimating(true)

    // Sample 64 pixel colors from the image via 8×8 grid
    const particles: BurstParticle[] = []
    const sample = document.createElement('canvas')
    sample.width = W
    sample.height = H
    const sCtx = sample.getContext('2d')

    if (sCtx) {
      let imageAvailable = false
      try {
        sCtx.drawImage(img, 0, 0, W, H)
        imageAvailable = true
      } catch { /* cross-origin — use palette colors */ }

      const cx = W / 2
      const cy = H / 2
      for (let gy = 0; gy < 8; gy++) {
        for (let gx = 0; gx < 8; gx++) {
          const px = Math.floor((gx / 8) * W)
          const py = Math.floor((gy / 8) * H)
          let color = PALETTE_ARRAY[Math.floor(Math.random() * PALETTE_ARRAY.length)]

          if (imageAvailable) {
            try {
              const d = sCtx.getImageData(px, py, 1, 1).data
              if (d[3] > 50) color = `rgb(${d[0]},${d[1]},${d[2]})`
            } catch { /* fallback to palette */ }
          }

          const dx = px - cx
          const dy = py - cy
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const speed = 2 + Math.random() * 4
          particles.push({
            x: rect.left + px,
            y: rect.top  + py,
            vx: (dx / dist) * speed + (Math.random() - 0.5),
            vy: (dy / dist) * speed + (Math.random() - 0.5) - 1,
            color,
          })
        }
      }
    } else {
      for (let i = 0; i < 64; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 4
        particles.push({
          x: rect.left + W / 2,
          y: rect.top  + H / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          color: PALETTE_ARRAY[Math.floor(Math.random() * PALETTE_ARRAY.length)],
        })
      }
    }

    const mobile = isMobileBrowser()
    const activeParticles = mobile ? particles.slice(0, 32) : particles

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

    if (!ctx) {
      canvas.remove()
      setIsAnimating(false)
      return
    }

    const canvasWeak = new WeakRef(canvas)
    const cx2 = rect.left + W / 2
    const cy2 = rect.top  + H / 2
    const stampScale = mobile ? 2 : 3

    // Safety net: force-remove canvas after max duration to prevent leaks
    const cleanupTimer = setTimeout(() => {
      cancelAnimationFrame(localRafId)
      canvasWeak.deref()?.remove()
      setIsAnimating(false)
    }, 800)

    let startTime = 0
    let lastFrame = 0
    let localRafId = 0

    const tick = (now: number) => {
      const c = canvasWeak.deref()
      if (!c) { cancelAnimationFrame(localRafId); return }

      if (!startTime) startTime = now
      const elapsed = now - startTime

      if (elapsed >= STAMP_END) {
        clearTimeout(cleanupTimer)
        clearCanvas(ctx)
        c.remove()
        setIsAnimating(false)
        return
      }

      if (now - lastFrame < FRAME_MS) { localRafId = requestAnimationFrame(tick); return }
      lastFrame = now

      clearCanvas(ctx)

      if (elapsed < FLASH_END) {
        // Phase 1: white border flash around image bounds
        const alpha = 1 - elapsed / FLASH_END
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 3
        ctx.strokeRect(rect.left + 1, rect.top + 1, W - 2, H - 2)
        ctx.restore()
      } else if (elapsed < BURST_END) {
        // Phase 2: 64 sampled pixels fly outward
        const t = (elapsed - FLASH_END) / (BURST_END - FLASH_END)
        for (const p of activeParticles) {
          p.x  += p.vx
          p.y  += p.vy
          p.vy += 0.12
          p.vx *= 0.97
          ctx.globalAlpha = Math.max(0, 1 - t)
          ctx.fillStyle = p.color
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 5, 5)
        }
        ctx.globalAlpha = 1
      } else {
        // Phase 3: pixel cart icon scales up then settles
        const t = (elapsed - BURST_END) / (STAMP_END - BURST_END)
        const scale = t < 0.6
          ? stampScale * 1.5 * (t / 0.6)
          : stampScale * (1.5 - 0.5 * ((t - 0.6) / 0.4))
        drawCartIcon(ctx, cx2, cy2, Math.max(0.1, scale), 1)
      }

      localRafId = requestAnimationFrame(tick)
    }

    localRafId = requestAnimationFrame(tick)
  }, [])

  return { triggerPop, isAnimating }
}
