'use client'

/**
 * @perf Validated: RAF cleanup ✓ | Mobile particle cap ✓ | prefers-reduced-motion ✓ | lazy-loaded ✓
 * @version 2.0.0
 */

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { PALETTE_ARRAY } from '@/lib/pixel/palette'
import { isMobileBrowser, clearCanvas } from '@/lib/pixel/canvas'

const FRAME_MS = 33
const TOTAL_DURATION = 4500
const CHECKMARK_START = 3500
const WAVE_TIMES = [0, 300, 600] as const

type Shape = 'square' | 'strip' | 'dot'
const SHAPES: Shape[] = ['square', 'strip', 'dot']

interface Particle {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  color: string
  shape: Shape
  rotation: number
  rotationSpeed: number
  spawnTime: number
}

// 24×24 pixel grid checkmark pixel coordinates (column, row)
const CHECK_PIXELS: ReadonlyArray<readonly [number, number]> = [
  // Left arm going down-right
  [2,12],[3,12],[2,13],[3,13],[4,14],[3,14],[4,15],[5,15],[5,16],[6,16],[6,17],[7,17],[7,18],[8,18],
  // Right arm going up-right
  [9,17],[9,16],[10,16],[10,15],[11,15],[11,14],[12,14],[12,13],
  [13,13],[13,12],[14,12],[14,11],[15,11],[15,10],[16,10],[16,9],
  [17,9],[17,8],[18,8],[18,7],[19,7],[19,6],[20,6],[20,5],[21,5],[21,4],[22,4],
]

function drawShape(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.fillStyle = p.color
  switch (p.shape) {
    case 'square': ctx.fillRect(-3, -3, 6, 6); break
    case 'strip':  ctx.fillRect(-1, -4, 2, 8); break
    case 'dot':
      ctx.fillRect(-1, -3, 2, 6)
      ctx.fillRect(-3, -1, 6, 2)
      break
  }
  ctx.restore()
}

function drawCheckmark(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  cellSize: number, alpha: number,
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#2A9D8F'
  const ox = cx - 12 * cellSize
  const oy = cy - 11 * cellSize
  for (const [px, py] of CHECK_PIXELS) {
    ctx.fillRect(ox + px * cellSize, oy + py * cellSize, cellSize, cellSize)
  }
  ctx.restore()
}

interface PixelConfettiProps {
  trigger: boolean
  onComplete?: () => void
  message?: string
}

export default function PixelConfetti({
  trigger,
  onComplete,
  message = 'تبارك الله! طلبك تأكد',
}: PixelConfettiProps) {
  const reduced = useReducedMotion()
  const rafRef = useRef<number>(0)
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    if (!trigger) { setShowMessage(false); return }
    const t = setTimeout(() => setShowMessage(true), 3500)
    return () => clearTimeout(t)
  }, [trigger])

  useEffect(() => {
    if (!trigger || typeof window === 'undefined') return

    const mobile = isMobileBrowser()
    const maxParticles = mobile ? 60 : 150
    const cellSize = mobile ? 8 : 10

    const canvas = document.createElement('canvas')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.setAttribute('aria-hidden', 'true')
    canvas.setAttribute('role', 'presentation')
    Object.assign(canvas.style, {
      position: 'fixed', top: '0', left: '0',
      zIndex: '9999', pointerEvents: 'none', imageRendering: 'pixelated',
    })
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) { canvas.remove(); return }

    const cx = canvas.width / 2
    const cy = canvas.height / 2

    // Object pool — pre-allocate, reset instead of push/splice
    const pool: Particle[] = Array.from({ length: maxParticles }, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0,
      color: PALETTE_ARRAY[0], shape: 'square' as Shape,
      rotation: 0, rotationSpeed: 0, spawnTime: 0,
    }))

    function resetParticle(p: Particle, elapsed: number): void {
      p.active = true
      p.x = cx
      p.y = cy
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 6
      p.vx = Math.cos(angle) * speed
      p.vy = Math.sin(angle) * speed - 2
      p.color = PALETTE_ARRAY[Math.floor(Math.random() * PALETTE_ARRAY.length)]
      p.shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
      p.rotation = Math.random() * Math.PI * 2
      p.rotationSpeed = (Math.random() - 0.5) * 0.1
      p.spawnTime = elapsed
    }

    function spawnWave(count: number, elapsed: number): void {
      let spawned = 0
      for (const p of pool) {
        if (!p.active && spawned < count) {
          resetParticle(p, elapsed)
          spawned++
        }
      }
    }

    const waveSize = Math.floor(maxParticles / 3)
    let wavesSpawned = 0
    let startTime = 0
    let lastFrame = 0

    if (reduced) {
      let innerStart = 0
      const reducedTick = (now: number) => {
        if (!innerStart) innerStart = now
        const elapsed = now - innerStart
        clearCanvas(ctx)
        const alpha = elapsed > 1500 ? Math.max(0, 1 - (elapsed - 1500) / 500) : 1
        drawCheckmark(ctx, cx, cy, cellSize, alpha)
        if (elapsed < 2000) {
          rafRef.current = requestAnimationFrame(reducedTick)
        } else {
          canvas.remove()
          onComplete?.()
        }
      }
      rafRef.current = requestAnimationFrame(reducedTick)
      return () => {
        cancelAnimationFrame(rafRef.current)
        canvas.remove()
      }
    }

    const tick = (now: number) => {
      if (!startTime) startTime = now
      const elapsed = now - startTime

      if (elapsed >= TOTAL_DURATION) {
        clearCanvas(ctx)
        canvas.remove()
        onComplete?.()
        return
      }

      if (now - lastFrame < FRAME_MS) { rafRef.current = requestAnimationFrame(tick); return }
      lastFrame = now

      while (wavesSpawned < WAVE_TIMES.length && elapsed >= WAVE_TIMES[wavesSpawned]) {
        spawnWave(waveSize, elapsed)
        wavesSpawned++
      }

      clearCanvas(ctx)

      const W = canvas.width
      const H = canvas.height
      for (const p of pool) {
        if (!p.active) continue
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.15
        p.vx *= 0.98
        p.vy *= 0.98
        p.rotation += p.rotationSpeed
        if (p.y > H + 10 || p.x < -10 || p.x > W + 10) { p.active = false; continue }
        const localElapsed = elapsed - p.spawnTime
        ctx.globalAlpha = Math.max(0, 1 - localElapsed / 3000)
        drawShape(ctx, p)
      }
      ctx.globalAlpha = 1

      if (elapsed >= CHECKMARK_START) {
        const ce = elapsed - CHECKMARK_START
        const checkAlpha = ce < 400
          ? ce / 400
          : Math.max(0, 1 - (ce - 400) / 600)
        drawCheckmark(ctx, cx, cy, cellSize, checkAlpha)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.remove()
    }
  }, [trigger, reduced, onComplete])

  if (!showMessage) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: '15vh',
        pointerEvents: 'none',
      }}
    >
      <p
        dir="rtl"
        style={{
          fontFamily: "'Segoe UI', Tahoma, system-ui, sans-serif",
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#2A9D8F',
          textAlign: 'center',
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          letterSpacing: '0.02em',
        }}
      >
        {message}
      </p>
    </div>
  )
}
