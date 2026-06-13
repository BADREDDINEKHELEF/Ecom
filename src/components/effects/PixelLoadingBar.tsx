// @ts-strict
'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const BLOCK_W = 8
const BLOCK_GAP = 2
const COLORS = ['#E63946', '#F4A261', '#2A9D8F']

export default function PixelLoadingBar() {
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  const [progress, setProgress] = useState(0)       // 0–100
  const [visible, setVisible] = useState(false)
  const [colorIdx, setColorIdx] = useState(0)
  const rafRef = useRef<number | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cycle color every 300ms while visible
  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => setColorIdx((i) => (i + 1) % COLORS.length), 300)
    return () => clearInterval(id)
  }, [visible])

  // Detect navigation start (pathname about to change)
  useEffect(() => {
    if (pathname === prevPathname.current) return
    prevPathname.current = pathname

    // Cancel any in-flight animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)

    // Reset and shoot to 100%
    setProgress(0)
    setVisible(true)

    let p = 0
    const FRAME_MS = 33 // ~30 fps
    let last = performance.now()

    const tick = (now: number) => {
      if (now - last < FRAME_MS) { rafRef.current = requestAnimationFrame(tick); return }
      last = now
      // Rush to 90 quickly, then crawl, then snap to 100 on completion
      const step = p < 60 ? 4 : p < 85 ? 1.5 : 0.5
      p = Math.min(p + step, 90)
      setProgress(p)
      if (p < 90) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Snap to 100 and hide after 400ms
        setProgress(100)
        hideTimer.current = setTimeout(() => {
          setVisible(false)
          setProgress(0)
        }, 400)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [pathname])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  if (!visible) return null

  const color = COLORS[colorIdx]
  const barWidth = typeof window !== 'undefined' ? window.innerWidth : 390
  const totalBlockW = BLOCK_W + BLOCK_GAP
  const blockCount = Math.ceil(barWidth / totalBlockW)
  const filledCount = Math.round((progress / 100) * blockCount)

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '6px',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'stretch',
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    >
      {Array.from({ length: blockCount }).map((_, i) => (
        <div
          key={i}
          style={{
            width: `${BLOCK_W}px`,
            marginRight: `${BLOCK_GAP}px`,
            flexShrink: 0,
            background: i < filledCount ? color : 'transparent',
            transition: 'background 0.05s step-start',
          }}
        />
      ))}
    </div>
  )
}
