'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
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

  const requirements = [
    { label: 'Au moins 8 caractères', met: password.length >= 8 },
    { label: 'Au moins une lettre majuscule', met: /[A-Z]/.test(password) },
    { label: 'Au moins un chiffre', met: /[0-9]/.test(password) },
    { label: 'Au moins un caractère spécial', met: /[^A-Za-z0-9]/.test(password) },
  ]

  return (
    <div className="mt-2 space-y-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
      <div className="flex gap-1">
        {levels.map((l, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? level.color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs font-semibold text-gray-600">Force : <span className="font-bold text-gray-800">{level.label}</span></p>
      </div>
      <ul className="text-xs space-y-1 mt-1 text-gray-500">
        {requirements.map((req, i) => (
          <li key={i} className="flex items-center gap-1.5 transition-colors duration-200">
            <span className={req.met ? 'text-emerald-500 font-bold' : 'text-gray-300'}>
              {req.met ? '✓' : '•'}
            </span>
            <span className={req.met ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
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
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; password?: boolean }>({})
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})

  const validate = (fName: string, fValue: string, currentMode = mode) => {
    let err = ''
    if (fName === 'name' && currentMode === 'register') {
      if (!fValue.trim()) err = 'Le nom complet est requis.'
      else if (fValue.trim().length < 2) err = 'Le nom complet doit comporter au moins 2 caractères.'
    }
    if (fName === 'email') {
      if (!fValue.trim()) {
        err = 'L\'adresse e-mail est requise.'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fValue.trim())) {
        err = 'Format d\'adresse e-mail invalide (ex: exemple@domaine.com).'
      }
    }
    if (fName === 'password') {
      if (!fValue) {
        err = 'Le mot de passe est requis.'
      } else if (currentMode === 'register') {
        if (fValue.length < 8) {
          err = 'Le mot de passe doit comporter au moins 8 caractères.'
        } else if (!/[A-Z]/.test(fValue) || !/[0-9]/.test(fValue) || !/[^A-Za-z0-9]/.test(fValue)) {
          err = 'Le mot de passe doit inclure majuscules, chiffres et caractères spéciaux.'
        }
      }
    }
    setErrors(prev => ({ ...prev, [fName]: err }))
    return err
  }

  const f = (key: keyof typeof form, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }))
    if (touched[key]) {
      validate(key, val)
    }
  }

  const handleBlur = (key: keyof typeof form) => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    validate(key, form[key])
  }

  const handleModeSwitch = (newMode: Mode) => {
    setMode(newMode)
    setError('')
    setSuccess('')
    setTouched({})
    setErrors({})
    setForm({ name: '', email: '', password: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched
    const newTouched = { name: mode === 'register', email: true, password: true }
    setTouched(newTouched)

    // Run validation across all fields
    const nameErr = mode === 'register' ? validate('name', form.name) : ''
    const emailErr = validate('email', form.email)
    const pwdErr = validate('password', form.password)

    if (nameErr || emailErr || pwdErr) {
      setError('Veuillez corriger les erreurs de saisie ci-dessous.')
      return
    }

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
        setForm({ name: '', email: form.email, password: '' })
        setTouched({})
        setErrors({})
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
    if (!form.email) {
      setTouched(prev => ({ ...prev, email: true }))
      setErrors(prev => ({ ...prev, email: 'Entrez votre adresse e-mail d\'abord.' }))
      setError('Entrez votre adresse e-mail d\'abord.')
      return
    }
    const emailErr = validate('email', form.email)
    if (emailErr) {
      setError('Veuillez entrer une adresse e-mail valide.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(form.email)
    setLoading(false)
    if (err) {
      setError(friendlyAuthError(err.message))
    } else {
      setSuccess('E-mail de réinitialisation envoyé. Vérifiez votre boîte de réception.')
    }
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
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {success}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => f('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    placeholder="Mohammed Amiri"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                      touched.name && errors.name
                        ? 'border-red-300 focus:border-red-500 bg-red-50/10'
                        : 'border-gray-200 focus:border-indigo-400'
                    }`}
                  />
                </div>
                {touched.name && errors.name && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 text-red-500" />
                    {errors.name}
                  </p>
                )}
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
                  onBlur={() => handleBlur('email')}
                  placeholder="vous@exemple.com"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                    touched.email && errors.email
                      ? 'border-red-300 focus:border-red-500 bg-red-50/10'
                      : 'border-gray-200 focus:border-indigo-400'
                  }`}
                />
              </div>
              {touched.email && errors.email && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={(e) => f('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                    touched.password && errors.password
                      ? 'border-red-300 focus:border-red-500 bg-red-50/10'
                      : 'border-gray-200 focus:border-indigo-400'
                  }`}
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
              {touched.password && errors.password && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  {errors.password}
                </p>
              )}
              {mode === 'register' && form.password.length > 0 && (
                <PasswordStrength password={form.password} />
              )}
            </div>

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-indigo-600 hover:underline font-medium animate-pulse-slow"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà inscrit ? '}
            <button
              onClick={() => handleModeSwitch(mode === 'login' ? 'register' : 'login')}
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
