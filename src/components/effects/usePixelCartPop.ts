// @ts-strict
'use client'

import { RefObject, useCallback } from 'react'

const FRAME_MS = 33 // ~30fps
const DURATION_MS = 600
const PIXEL_SIZE = 6  // sample every 6px

interface PixelParticle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  g: number
  b: number
  a: number
}

export function usePixelCartPop() {
  const triggerPop = useCallback((imageRef: RefObject<HTMLImageElement | null>) => {
    if (typeof window === 'undefined') return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const img = imageRef.current
    if (!img) return

    const rect = img.getBoundingClientRect()
    const W = Math.round(rect.width)
    const H = Math.round(rect.height)
    if (W === 0 || H === 0) return

    // Create sampling canvas (offscreen)
    const sample = document.createElement('canvas')
    sample.width  = W
    sample.height = H
    const sCtx = sample.getContext('2d')
    if (!sCtx) return

    try {
      sCtx.drawImage(img, 0, 0, W, H)
    } catch {
      // Cross-origin image — skip
      return
    }

    let imageData: ImageData
    try {
      imageData = sCtx.getImageData(0, 0, W, H)
    } catch {
      return
    }

    // Sample pixels at PIXEL_SIZE intervals
    const particles: PixelParticle[] = []
    const cx = W / 2
    const cy = H / 2

    for (let y = 0; y < H; y += PIXEL_SIZE) {
      for (let x = 0; x < W; x += PIXEL_SIZE) {
        const i = (y * W + x) * 4
        const r = imageData.data[i]
        const g = imageData.data[i + 1]
        const b = imageData.data[i + 2]
        const a = imageData.data[i + 3]
        if (a < 50) continue

        const dx = x - cx
        const dy = y - cy
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const speed = (Math.random() * 3 + 2)
        particles.push({
          x: rect.left + x,
          y: rect.top  + y,
          vx: (dx / dist) * speed + (Math.random() - 0.5),
          vy: (dy / dist) * speed + (Math.random() - 0.5) - 1,
          r, g, b, a: a / 255,
        })
      }
    }

    if (particles.length === 0) return

    // Render canvas fixed over the viewport
    const canvas = document.createElement('canvas')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    canvas.setAttribute('aria-hidden', 'true')
    Object.assign(canvas.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '9998',
      pointerEvents: 'none',
      willChange: 'transform',
      imageRendering: 'pixelated',
    })
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) { canvas.remove(); return }

    const startTime = performance.now()
    let last = startTime
    let rafId: number

    const tick = (now: number) => {
      const elapsed = now - startTime
      if (elapsed >= DURATION_MS) {
        canvas.remove()
        return
      }

      if (now - last < FRAME_MS) { rafId = requestAnimationFrame(tick); return }
      last = now

      const t = elapsed / DURATION_MS
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        p.x  += p.vx
        p.y  += p.vy
        p.vy += 0.15  // gravity

        const alpha = p.a * (1 - t * t)
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(2)})`
        ctx.fillRect(Math.round(p.x), Math.round(p.y), PIXEL_SIZE, PIXEL_SIZE)
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
  }, [])

  return { triggerPop }
}
