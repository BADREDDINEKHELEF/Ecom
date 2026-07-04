'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, Loader2, Store, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/store/langStore'

type Status = 'loading' | 'ready' | 'invalid' | 'success'

function friendlyAuthError(msg: string): string {
  if (/same.*password|identical/i.test(msg))
    return 'Le nouveau mot de passe doit être différent de l\'ancien.'
  if (/too.*many.*requests|rate.*limit/i.test(msg))
    return 'Trop de tentatives. Réessayez dans quelques minutes.'
  if (/weak.*password/i.test(msg))
    return 'Mot de passe trop faible. Utilisez au moins 8 caractères.'
  return msg
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const t = useT()
  const [status, setStatus] = useState<Status>('loading')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready')
      }
    })

    // Fallback timeout ? if no PASSWORD_RECOVERY event after 5s, link is invalid/expired
    const timer = setTimeout(() => {
      setStatus((prev) => prev === 'loading' ? 'invalid' : prev)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(friendlyAuthError(err.message)); return }
    setStatus('success')
    setTimeout(() => router.push('/seller/login'), 2500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-gray-900">{t.seller.resetPasswordTitle}</h1>
            <p className="text-gray-500 text-sm mt-1">{t.seller.resetPasswordSub}</p>
          </div>

          {/* Loading */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-sm text-gray-500">Vérification du lien?</p>
            </div>
          )}

          {/* Invalid / expired */}
          {status === 'invalid' && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{t.seller.resetPasswordInvalid}</span>
              </div>
              <Link href="/seller/login"
                className="block w-full text-center bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors">
                {t.seller.backToLogin}
              </Link>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <p className="text-gray-700 font-semibold">{t.seller.resetPasswordSuccess}</p>
            </div>
          )}

          {/* Form */}
          {status === 'ready' && (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
                  {error}
                </div>
              )}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t.seller.passwordLabel}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•¢•¢•¢•¢"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      aria-label={showPwd ? 'Masquer' : 'Afficher'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{t.seller.passwordMin}</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t.seller.resetPasswordBtn}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-5">
                <Link href="/seller/login" className="text-emerald-600 font-bold hover:underline">
                  ← {t.seller.backToLogin}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
