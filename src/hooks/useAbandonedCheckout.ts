'use client'

import { useCallback, useRef } from 'react'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem('storedzSession')
  if (!id) {
    id = `sess_${Date.now()}_${crypto.randomUUID().replace(/-/g, '')}`
    sessionStorage.setItem('storedzSession', id)
  }
  return id
}

interface AbandonedPayload {
  name?: string
  email?: string
  phone?: string
  wilaya?: string
  address?: string
  cartSnapshot?: unknown
  cartTotal?: number
  storeSlug?: string
}

export function useAbandonedCheckout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback((payload: AbandonedPayload) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      fetch('/api/abandoned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: getSessionId(), ...payload }),
      }).catch(() => {})
    }, 500) // debounce 500ms
  }, [])

  const markRecovered = useCallback((orderId?: string) => {
    const sessionId = getSessionId()
    if (!sessionId) return
    fetch('/api/abandoned', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, orderId }),
    }).catch(() => {})
    sessionStorage.removeItem('storedzSession')
  }, [])

  return { save, markRecovered }
}
