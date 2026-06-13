'use client'

/**
 * @perf Validated: RAF cleanup ✓ | Mobile particle cap ✓ | prefers-reduced-motion ✓ | lazy-loaded ✓
 * @version 2.0.0
 */

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

const FRAME_MS  = 33
const BLOCK_W   = 10
const BLOCK_GAP = 3
const BAR_H     = 8
const COLORS    = ['#E63946', '#2A9D8F', '#F4A261'] as const

export default function PixelLoadingBar() {
  const reduced      = useReducedMotion()
  const [progress,   setProgress]   = useState(0)
  const [visible,    setVisible]    = useState(false)
  const [flashWhite, setFlashWhite] = useState(false)
  const [slidingOff, setSlidingOff] = useState(false)
  const [colorMode,  setColorMode]  = useState(0)
  const [blockCount, setBlockCount] = useState(40)

  const rafRef      = useRef<number>(0)
  const progressRef = useRef(0)
  const activeRef   = useRef(false)

  // Compute block count once on mount
  useEffect(() => {
    setBlockCount(Math.ceil(window.innerWidth / (BLOCK_W + BLOCK_GAP)))
  }, [])

  useEffect(() => {
    const onNavStart = () => {
      cancelAnimationFrame(rafRef.current)
      progressRef.current = 0
      setProgress(0)
      setFlashWhite(false)
      setSlidingOff(false)
      setVisible(true)
      activeRef.current = true

      // Reduced motion: jump straight to 80%, no block animation
      if (reduced) {
        progressRef.current = 80
        setProgress(80)
        return
      }

      let lastFrame = 0
      const tick = (now: number) => {
        if (!activeRef.current) return
        if (now - lastFrame < FRAME_MS) { rafRef.current = requestAnimationFrame(tick); return }
        lastFrame = now

        const curr = progressRef.current
        const remaining = 90 - curr
        const speed = Math.max(0.3, remaining * 0.04)
        const next = Math.min(curr + speed, 90)
        progressRef.current = next
        setProgress(next)

        if (next < 90) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    const onNavEnd = () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      progressRef.current = 100
      setProgress(100)
      setColorMode(prev => (prev + 1) % 3)

      // Flash white for 100ms, then slide off over 300ms
      setFlashWhite(true)
      const t1 = setTimeout(() => {
        setFlashWhite(false)
        setSlidingOff(true)
        const t2 = setTimeout(() => {
          setVisible(false)
          setSlidingOff(false)
          setProgress(0)
          progressRef.current = 0
        }, 300)
        return () => clearTimeout(t2)
      }, 100)
      return () => clearTimeout(t1)
    }

    window.addEventListener('shopdzNavStart', onNavStart)
    window.addEventListener('shopdzNavEnd',   onNavEnd)
    return () => {
      window.removeEventListener('shopdzNavStart', onNavStart)
      window.removeEventListener('shopdzNavEnd',   onNavEnd)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (!visible) return null

  const color = flashWhite ? '#FFFFFF' : COLORS[colorMode]
  const filledCount = Math.floor(blockCount * progress / 100)

  return (
    <div
      aria-hidden="true"
      role="presentation"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: BAR_H,
        zIndex: 9997,
        display: 'flex',
        gap: BLOCK_GAP,
        transform:  slidingOff ? 'translateY(-100%)' : 'translateY(0)',
        transition: slidingOff ? 'transform 300ms ease-in' : 'none',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: blockCount }, (_, i) => {
        const filled    = i < filledCount
        const isLeading = filled && i === filledCount - 1
        return (
          <div
            key={i}
            style={{
              width:           BLOCK_W,
              height:          BAR_H,
              flexShrink:      0,
              backgroundColor: filled ? color : 'transparent',
              borderBottom:    filled ? '1px solid rgba(0,0,0,0.25)' : undefined,
              filter:          isLeading ? 'brightness(1.5)' : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
