// @ts-strict
'use client'

import { useEffect, useRef } from 'react'

interface PixelConfettiProps {
  trigger: boolean
  onComplete: () => void
}

const COLORS = ['#E63946', '#F4A261', '#2A9D8F', '#264653', '#FFFFFF', '#FFD700']
const DURATION_MS = 3500
const FRAME_MS = 33 // ~30 fps

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  phase: number  // wobble phase
}

function createParticles(count: number, w: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x:     Math.random() * w,
    y:     Math.random() * -20,
    vx:    (Math.random() - 0.5) * 1.5,
    vy:    Math.random() * 2 + 1.5,
    size:  Math.random() < 0.5 ? 4 : 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    phase: Math.random() * Math.PI * 2,
  }))
}

export default function PixelConfetti({ trigger, onComplete }: PixelConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number | null>(null)
  const startRef  = useRef<number | null>(null)

  useEffect(() => {
    if (!trigger) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) { onComplete(); return }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width  = W
    canvas.height = H

    const isMobile = W < 768
    const particles = createParticles(isMobile ? 80 : 150, W)
    startRef.current = null

    let last = performance.now()

    const tick = (now: number) => {
      if (!startRef.current) startRef.current = now
      const elapsed = now - startRef.current
      if (elapsed >= DURATION_MS) {
        ctx.clearRect(0, 0, W, H)
        onComplete()
        return
      }

      if (now - last < FRAME_MS) { rafRef.current = requestAnimationFrame(tick); return }
      last = now

      const fade = Math.max(0, 1 - (elapsed / DURATION_MS) ** 2)
      ctx.clearRect(0, 0, W, H)
      ctx.globalAlpha = fade

      for (const p of particles) {
        p.x  += p.vx + Math.sin(p.phase + elapsed * 0.003) * 0.6
        p.y  += p.vy
        p.vy += 0.06  // gravity
        p.phase += 0.05

        if (p.y > H + 20) {
          p.y  = -10
          p.x  = Math.random() * W
          p.vy = Math.random() * 2 + 1
        }

        ctx.fillStyle = p.color
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size)
      }

      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [trigger, onComplete])

  if (!trigger) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        willChange: 'transform',
        imageRendering: 'pixelated',
      }}
    />
  )
}
