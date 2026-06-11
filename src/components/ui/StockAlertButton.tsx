'use client'

import { useState } from 'react'
import { Bell, CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  productId: string
}

export default function StockAlertButton({ productId }: Props) {
  const [open, setOpen]       = useState(false)
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stock-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Une erreur est survenue')
        return
      }
      setDone(true)
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-50 rounded-xl px-4 py-3">
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        Vous serez alerté dès que ce produit sera disponible
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        <Bell className="w-4 h-4" />
        M&apos;alerter quand disponible
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            OK
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
