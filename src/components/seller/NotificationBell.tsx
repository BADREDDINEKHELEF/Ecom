'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, CheckCheck, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { SellerNotification } from '@/lib/notifications/seller'

export default function NotificationBell() {
  const [open, setOpen]                       = useState(false)
  const [notifications, setNotifications]     = useState<SellerNotification[]>([])
  const [unread, setUnread]                   = useState(0)
  const [loading, setLoading]                 = useState(false)
  const dropdownRef                           = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/seller/notifications')
      if (!res.ok) return
      const { notifications: list } = await res.json() as { notifications: SellerNotification[] }
      setNotifications(list)
      setUnread(list.filter((n) => !n.is_read).length)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(id)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function markAllRead() {
    setLoading(true)
    try {
      await fetch('/api/seller/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnread(0)
    } finally {
      setLoading(false)
    }
  }

  async function markOneRead(id: string) {
    await fetch('/api/seller/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
    )
    setUnread((c) => Math.max(0, c - 1))
  }

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60_000)
    if (m < 1)  return "À l'instant"
    if (m < 60) return `Il y a ${m} min`
    const h = Math.floor(m / 60)
    if (h < 24) return `Il y a ${h}h`
    return `Il y a ${Math.floor(h / 24)}j`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm font-semibold text-white">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tout lire
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-300 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Aucune notification
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markOneRead(n.id)}
                  className={`flex gap-3 px-4 py-3 border-b border-gray-800 last:border-0 cursor-pointer transition-colors hover:bg-gray-800/50 ${
                    !n.is_read ? 'bg-emerald-950/20' : ''
                  }`}
                >
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                  )}
                  <div className={`flex-1 min-w-0 ${n.is_read ? 'ms-5' : ''}`}>
                    <p className="text-sm text-white font-medium truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-600">{timeAgo(n.created_at)}</span>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                        >
                          Voir <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
