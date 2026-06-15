'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'register'

function friendlyAuthError(msg: string): string {
  if (/invalid.*credentials|invalid.*password|wrong.*password/i.test(msg))
    return 'E-mail ou mot de passe incorrect. Réessayez.'
  if (/email.*already.*registered|user.*already.*exists/i.test(msg))
    return 'Un compte avec cet e-mail existe déjà. Connectez-vous.'
  if (/email.*not.*confirmed/i.test(msg))
    return 'Confirmez votre e-mail avant de vous connecter.'
  if (/too.*many.*requests|rate.*limit/i.test(msg))
    return 'Trop de tentatives. Réessayez dans quelques minutes.'
  if (/weak.*password/i.test(msg))
    return 'Mot de passe trop faible. Utilisez au moins 8 caractères.'
  if (/network|fetch/i.test(msg))
    return 'Erreur de connexion. Vérifiez votre accès internet.'
  return 'Une erreur est survenue. Veuillez réessayer.'
}

function passwordScore(pwd: string): number {
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return score
}

function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password)
  const levels = [
    { label: 'Très faible', color: 'bg-red-500' },
    { label: 'Faible',      color: 'bg-orange-400' },
    { label: 'Moyen',       color: 'bg-yellow-400' },
    { label: 'Fort',        color: 'bg-emerald-400' },
    { label: 'Très fort',   color: 'bg-emerald-600' },
  ]
  const level = levels[Math.min(score, 4)]
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {levels.map((l, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? level.color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">{level.label}</p>
    </div>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const f = (key: keyof typeof form, val: string) => setForm((prev) => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const supabase = createClient()

    if (mode === 'register') {
      const { error: err } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.name } },
      })
      if (err) {
        setError(friendlyAuthError(err.message))
      } else {
        setSuccess('Compte créé ! Vérifiez votre e-mail pour confirmer, puis connectez-vous.')
        setMode('login')
        setForm((prev) => ({ ...prev, password: '' }))
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (err) {
        setError(friendlyAuthError(err.message))
      } else {
        router.push('/')
        router.refresh()
      }
    }

    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!form.email) { setError('Entrez votre adresse e-mail d\'abord.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(form.email)
    setLoading(false)
    if (err) { setError(friendlyAuthError(err.message)) }
    else { setSuccess('E-mail de réinitialisation envoyé. Vérifiez votre boîte de réception.') }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour à la boutique
        </Link>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                  <path d="M20 8 C13 8 10 13 10 18 L10 32 L30 32 L30 18 C30 13 27 8 20 8 Z" fill="#6366f1"/>
                  <path d="M20 16 C17.2 16 15 18.2 15 21 L15 32 L25 32 L25 21 C25 18.2 22.8 16 20 16 Z" fill="white" opacity="0.2"/>
                  <ellipse cx="13" cy="22" rx="2" ry="2.5" fill="white" opacity="0.5"/>
                  <ellipse cx="27" cy="22" rx="2" ry="2.5" fill="white" opacity="0.5"/>
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              {mode === 'login' ? 'Bon retour !' : 'Créer un compte'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'login' ? 'Connectez-vous à votre compte' : 'Rejoignez-nous aujourd\'hui'}
            </p>
          </div>

          {success && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => f('name', e.target.value)}
                    placeholder="Mohammed Amiri"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  autoComplete={mode === 'login' ? 'username' : 'email'}
                  value={form.email}
                  onChange={(e) => f('email', e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={(e) => f('password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'register' && form.password.length > 0 && (
                <PasswordStrength password={form.password} />
              )}
            </div>

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà inscrit ? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
              className="text-indigo-600 font-bold hover:underline"
            >
              {mode === 'login' ? 'S\'inscrire' : 'Se connecter'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
