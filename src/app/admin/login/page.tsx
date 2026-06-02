'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react'
import Logo from '@/components/ui/Logo'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [needsTotp, setNeedsTotp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, totpCode: totpCode || undefined }),
    })

    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      router.push('/admin')
      router.refresh()
    } else if (res.status === 401 && data.totpRequired) {
      setNeedsTotp(true)
      setError('Enter your 6-digit authenticator code.')
    } else if (res.status === 429) {
      setError(data.error ?? 'Too many attempts. Try again later.')
    } else {
      setError(data.error ?? 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="md" dark />
          </div>
          <p className="text-gray-400 text-sm">Admin Panel</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h1 className="font-black text-gray-900 text-lg">Admin Access</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin password"
                  required
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {needsTotp && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  2FA Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 tracking-widest font-mono"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className={`text-sm font-medium px-3 py-2 rounded-lg ${
                error.includes('2FA') || error.includes('authenticator')
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-red-50 text-red-600'
              }`}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60">
              {loading ? 'Verifying…' : needsTotp ? 'Verify 2FA' : 'Enter Admin Panel'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Set <code className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">ADMIN_SECRET</code> and{' '}
          <code className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">ADMIN_JWT_SECRET</code> in Vercel.
        </p>
      </div>
    </div>
  )
}
