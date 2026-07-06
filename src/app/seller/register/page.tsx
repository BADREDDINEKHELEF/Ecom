'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Lock, User, Store, Phone, MapPin, FileText, Eye, EyeOff, Loader2, CheckCircle, KeyRound, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ALL_WILAYAS } from '@/lib/data/wilayas'
import { useT, useLang } from '@/lib/store/langStore'
import { slugify, isReservedSlug, validateStoreSlug } from '@/lib/validation/slug'
import { isValidAlgerianPhone } from '@/lib/validation/phone'

type View = 'form' | 'otp'

const validationMsgs = {
  fr: {
    fullName: 'Le nom complet doit comporter au moins 2 caractères.',
    email: 'Adresse e-mail invalide (ex: exemple@domaine.com).',
    password: 'Le mot de passe doit comporter au moins 8 caractères.',
    storeName: 'Le nom de la boutique est requis.',
    phone: 'Numéro algérien invalide (ex: 05xx xxx xxx ou +213...)',
    wilaya: 'Veuillez sélectionner une wilaya.',
  },
  en: {
    fullName: 'Full name must be at least 2 characters.',
    email: 'Invalid email address (e.g. example@domain.com).',
    password: 'Password must be at least 8 characters.',
    storeName: 'Store name is required.',
    phone: 'Invalid Algerian number (e.g. 05xx xxx xxx or +213...)',
    wilaya: 'Please select a wilaya.',
  },
  ar: {
    fullName: 'يجب أن يكون الاسم الكامل حرفين على الأقل.',
    email: 'عنوان بريد إلكتروني غير صحيح.',
    password: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
    storeName: 'اسم المتجر مطلوب.',
    phone: 'رقم هاتف جزائري غير صحيح.',
    wilaya: 'يرجى اختيار الولاية.',
  }
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
        <p className="text-xs font-semibold text-gray-600">Force : <span className="font-bold text-emerald-600">{level.label}</span></p>
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

export default function SellerRegisterPage() {
  useRouter()
  const t = useT()
  const lang = useLang()
  const [view, setView]       = useState<View>('form')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [otp, setOtp]         = useState('')
  const [done, setDone]       = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    storeName: '', storeSlug: '', phone: '', wilaya: '', description: '',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (fName: string, fValue: string) => {
    let err = ''
    const msgs = validationMsgs[lang] || validationMsgs.fr

    if (fName === 'fullName') {
      if (!fValue.trim()) err = msgs.fullName
      else if (fValue.trim().length < 2) err = msgs.fullName
    }
    if (fName === 'email') {
      if (!fValue.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fValue.trim())) {
        err = msgs.email
      }
    }
    if (fName === 'password') {
      if (!fValue) {
        err = msgs.password
      } else {
        if (fValue.length < 8) {
          err = msgs.password
        } else if (!/[A-Z]/.test(fValue) || !/[0-9]/.test(fValue) || !/[^A-Za-z0-9]/.test(fValue)) {
          err = lang === 'ar' 
            ? 'كلمة المرور يجب أن تحتوي على أحرف كبيرة وأرقام ورموز خاصة.'
            : 'Le mot de passe doit inclure majuscules, chiffres et caractères spéciaux.'
        }
      }
    }
    if (fName === 'storeName') {
      if (!fValue.trim()) err = msgs.storeName
    }
    if (fName === 'storeSlug') {
      const slugVal = validateStoreSlug(fValue)
      if (!slugVal.ok) {
        err = slugVal.error
      }
    }
    if (fName === 'phone') {
      if (!fValue.trim() || !isValidAlgerianPhone(fValue)) {
        err = msgs.phone
      }
    }
    if (fName === 'wilaya') {
      if (!fValue) {
        err = msgs.wilaya
      }
    }

    setErrors(prev => ({ ...prev, [fName]: err }))
    return err
  }

  const f = (key: keyof typeof form, val: string) => {
    const next = { ...form, [key]: val }
    if (key === 'storeName') {
      next.storeSlug = slugify(val)
      if (touched.storeSlug) {
        validate('storeSlug', next.storeSlug)
      }
    }
    setForm(next)
    if (touched[key]) {
      validate(key, val)
    }
  }

  const handleBlur = (key: keyof typeof form) => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    validate(key, form[key])
  }

  // Step 1 ? validate form + send OTP
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const step1Fields = ['fullName', 'email', 'password', 'storeName', 'storeSlug', 'phone', 'wilaya']
    const newTouched: Record<string, boolean> = {}
    step1Fields.forEach(field => {
      newTouched[field] = true
    })
    setTouched(prev => ({ ...prev, ...newTouched }))

    let hasErrors = false
    step1Fields.forEach(field => {
      const err = validate(field, form[field as keyof typeof form])
      if (err) hasErrors = true
    })

    if (hasErrors) {
      setError(lang === 'ar' ? 'يرجى تصحيح الأخطاء في النموذج.' : 'Veuillez corriger les erreurs de saisie ci-dessous.')
      return
    }

    setLoading(true); setError('')
    try {
      const res = await fetch('/api/seller/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Impossible d\'envoyer le code.'); return }
      if (body._devOtp) {
        const hint = body._emailError ? ` ? SMTP: ${body._emailError.slice(0, 120)}` : ' (email non envoyé)'
        setError(`Code OTP : ${body._devOtp}${hint}`)
      }
      setView('otp')
    } catch {
      setError('Erreur de connexion. Vérifiez votre accès internet.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 ? verify OTP then create account
  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      // Verify OTP
      const verifyRes = await fetch('/api/seller/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp }),
      })
      const verifyBody = await verifyRes.json()
      if (!verifyRes.ok) { setError(verifyBody.error ?? 'Code incorrect.'); setLoading(false); return }

      // Create auth account
      const supabase = createClient()
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName } },
      })
      if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
      if (!authData.user) { setError(t.seller.registrationFailed); setLoading(false); return }

      // Create vendor record ? pass auth token in case session cookie isn't set yet
      const authToken = authData.session?.access_token
      const regHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) regHeaders['Authorization'] = `Bearer ${authToken}`

      const res = await fetch('/api/seller/register', {
        method: 'POST',
        headers: regHeaders,
        body: JSON.stringify({
          store_name:  form.storeName,
          store_slug:  form.storeSlug,
          logo_url:    null,
          description: form.description || null,
          phone:       form.phone || null,
          wilaya:      form.wilaya || null,
          email:       form.email || null,
        }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        setError(res.status === 409 ? t.seller.urlTaken : (msg ?? t.seller.registrationFailed))
        await supabase.auth.signOut()
      } else {
        setDone(true)
      }
    } catch {
      setError(t.seller.registrationFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError(''); setLoading(true)
    try {
      await fetch('/api/seller/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">{t.seller.storeCreated}</h1>
          <p className="text-gray-500 text-sm mb-6">{t.seller.storeCreatedMsg}</p>
          <Link href="/seller/login"
            className="block w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors text-center">
            {t.seller.goToLogin}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link href="/become-seller" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t.common.back}
        </Link>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              {view === 'otp' ? <KeyRound className="w-6 h-6 text-white" /> : <Store className="w-6 h-6 text-white" />}
            </div>
            <h1 className="text-2xl font-black text-gray-900">
               {view === 'otp' ? 'Vérifiez votre e-mail' : t.seller.registerTitle}
             </h1>
             <p className="text-gray-500 text-sm mt-1">
               {view === 'otp' ? `Code envoyé à ${form.email}` : t.seller.registerSub}
             </p>
           </div>

           {error && (
             <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
               <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
               <span>{error}</span>
             </div>
           )}

           {/* ? OTP verification step ? */}
           {view === 'otp' && (
             <form onSubmit={handleVerifyAndCreate} className="space-y-4">
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">Code e-mail (6 chiffres)</label>
                 <input type="text" required maxLength={6} value={otp}
                   onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                   placeholder="123456" autoFocus
                   className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-center tracking-[0.5em] font-bold text-lg focus:outline-none focus:border-emerald-400" />
               </div>
               <button type="submit" disabled={loading || otp.length !== 6}
                 className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none">
                 {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                 Vérifier et créer mon compte
               </button>
               <div className="flex items-center justify-between text-sm">
                 <button type="button" onClick={() => { setView('form'); setOtp(''); setError('') }}
                   className="text-gray-500 hover:text-gray-700">
                   ✏ Modifier mes infos
                 </button>
                 <button type="button" onClick={handleResend} disabled={loading}
                   className="text-emerald-600 hover:underline font-medium disabled:opacity-50">
                   Renvoyer le code
                 </button>
               </div>
             </form>
           )}

           {/* ? Registration form ? */}
           {view === 'form' && <form onSubmit={handleSubmit} className="space-y-4" noValidate>
             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">{t.seller.accountInfo}</p>

             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.fullNameLabel}</label>
               <div className="relative">
                 <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input required type="text" value={form.fullName} onChange={(e) => f('fullName', e.target.value)}
                   onBlur={() => handleBlur('fullName')}
                   placeholder="Mohammed Amiri"
                   className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                     touched.fullName && errors.fullName
                       ? 'border-red-300 focus:border-red-500 bg-red-50/10'
                       : 'border-gray-200 focus:border-emerald-400'
                   }`} />
               </div>
               {touched.fullName && errors.fullName && (
                 <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                   <AlertCircle className="w-3 h-3 text-red-500" />
                   {errors.fullName}
                 </p>
               )}
             </div>

             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.emailLabel}</label>
               <div className="relative">
                 <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input required type="email" value={form.email} onChange={(e) => f('email', e.target.value)}
                   onBlur={() => handleBlur('email')}
                   placeholder="you@example.com"
                   className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                     touched.email && errors.email
                       ? 'border-red-300 focus:border-red-500 bg-red-50/10'
                       : 'border-gray-200 focus:border-emerald-400'
                   }`} />
               </div>
               {touched.email && errors.email && (
                 <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                   <AlertCircle className="w-3 h-3 text-red-500" />
                   {errors.email}
                 </p>
               )}
             </div>

             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.passwordLabel}</label>
               <div className="relative">
                 <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input required type={showPwd ? 'text' : 'password'}
                   value={form.password} onChange={(e) => f('password', e.target.value)}
                   onBlur={() => handleBlur('password')}
                   placeholder={t.seller.passwordMin}
                   className={`w-full pl-10 pr-12 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                     touched.password && errors.password
                       ? 'border-red-300 focus:border-red-500 bg-red-50/10'
                       : 'border-gray-200 focus:border-emerald-400'
                   }`} />
                 <button type="button" onClick={() => setShowPwd(!showPwd)}
                   className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                   {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                 </button>
               </div>
               {touched.password && errors.password && (
                 <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                   <AlertCircle className="w-3 h-3 text-red-500" />
                   {errors.password}
                 </p>
               )}
               {form.password.length > 0 && (
                 <PasswordStrength password={form.password} />
               )}
             </div>

             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">{t.seller.storeInfo}</p>

             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.storeNameLabel}</label>
               <div className="relative">
                 <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input required type="text" value={form.storeName} onChange={(e) => f('storeName', e.target.value)}
                   onBlur={() => handleBlur('storeName')}
                   placeholder={t.seller.myAlgerianShop}
                   className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                     touched.storeName && errors.storeName
                       ? 'border-red-300 focus:border-red-500 bg-red-50/10'
                       : 'border-gray-200 focus:border-emerald-400'
                   }`} />
               </div>
               {touched.storeName && errors.storeName && (
                 <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                   <AlertCircle className="w-3 h-3 text-red-500" />
                   {errors.storeName}
                 </p>
               )}
             </div>

             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.storeUrlLabel}</label>
               <div className={`flex items-center border rounded-xl overflow-hidden transition-all ${
                 touched.storeSlug && errors.storeSlug
                   ? 'border-red-300 focus-within:border-red-500 bg-red-50/10'
                   : 'border-gray-200 focus-within:border-emerald-400'
               }`}>
                 <span className="px-3 py-3 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">storedz.dz/shop/</span>
                 <input required type="text" value={form.storeSlug}
                   onChange={(e) => f('storeSlug', slugify(e.target.value))}
                   onBlur={() => handleBlur('storeSlug')}
                   placeholder="my-shop"
                   className="flex-1 px-3 py-3 text-sm focus:outline-none bg-transparent" />
               </div>
               {touched.storeSlug && errors.storeSlug && (
                 <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                   <AlertCircle className="w-3 h-3 text-red-500" />
                   {errors.storeSlug}
                 </p>
               )}
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.phoneLabel}</label>
                 <div className="relative">
                   <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input type="tel" required value={form.phone} onChange={(e) => f('phone', e.target.value)}
                     onBlur={() => handleBlur('phone')}
                     placeholder={t.seller.phonePHRegister}
                     className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                       touched.phone && errors.phone
                         ? 'border-red-300 focus:border-red-500 bg-red-50/10'
                         : 'border-gray-200 focus:border-emerald-400'
                     }`} />
                 </div>
                 {touched.phone && errors.phone && (
                   <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                     <AlertCircle className="w-3 h-3 text-red-500 text-xs flex-shrink-0" />
                     <span className="leading-tight">{errors.phone}</span>
                   </p>
                 )}
               </div>
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.wilayaLabel}</label>
                 <div className="relative">
                   <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <select value={form.wilaya} onChange={(e) => f('wilaya', e.target.value)}
                     onBlur={() => handleBlur('wilaya')}
                     className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none bg-white transition-all ${
                       touched.wilaya && errors.wilaya
                         ? 'border-red-300 focus:border-red-500 bg-red-50/10'
                         : 'border-gray-200 focus:border-emerald-400'
                     }`}>
                     <option value="">{t.seller.selectWilaya}</option>
                     {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                   </select>
                 </div>
                 {touched.wilaya && errors.wilaya && (
                   <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                     <AlertCircle className="w-3 h-3 text-red-500" />
                     {errors.wilaya}
                   </p>
                 )}
               </div>
             </div>

             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.descLabel}</label>
               <div className="relative">
                 <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                 <textarea value={form.description} onChange={(e) => f('description', e.target.value)}
                   rows={3} maxLength={300} placeholder={t.seller.descPH}
                   className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 resize-none" />
               </div>
             </div>

             <button type="submit" disabled={loading}
               className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 text-base">
               {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Store className="w-5 h-5" />}
               {loading ? t.seller.creating : t.seller.createMyStore}
             </button>

             <p className="text-xs text-gray-400 text-center">{t.seller.terms}</p>
           </form>}
        </div>
      </div>
    </div>
  )
}
