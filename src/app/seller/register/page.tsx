'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Mail, Lock, User, Store, Phone, MapPin, FileText,
  Eye, EyeOff, Loader2, CheckCircle, KeyRound, AlertCircle,
  Check, X, RefreshCw, EyeIcon
} from 'lucide-react'

import { ALL_WILAYAS } from '@/lib/data/wilayas'
import { useT, useLang } from '@/lib/store/langStore'
import { slugify, validateStoreSlug } from '@/lib/validation/slug'
import { isValidAlgerianPhone } from '@/lib/validation/phone'

type View = 'form' | 'otp'
type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

const validationMsgs = {
  fr: {
    fullNameRequired: 'Le nom complet est requis.',
    fullNameLength: 'Le nom complet doit comporter au moins 2 caractères.',
    emailRequired: 'L\'adresse e-mail est requise.',
    emailInvalid: 'Adresse e-mail invalide (ex: exemple@domaine.com).',
    passwordRequired: 'Le mot de passe est requis.',
    passwordLength: 'Le mot de passe doit comporter au moins 8 caractères.',
    passwordComplexity: 'Le mot de passe doit inclure une majuscule, un chiffre et un caractère spécial.',
    passwordConfirmRequired: 'Veuillez confirmer votre mot de passe.',
    passwordConfirmMismatch: 'Les mots de passe ne correspondent pas.',
    storeNameRequired: 'Le nom de la boutique est requis.',
    storeSlugRequired: 'L\'URL de la boutique est requise.',
    storeSlugInvalid: 'L\'URL contient des caractères non autorisés (utilisez lettres, chiffres, tirets).',
    phoneRequired: 'Le numéro de téléphone est requis.',
    phoneInvalid: 'Numéro algérien invalide (ex: 05xx xxx xxx ou 07xx xxx xxx).',
    wilayaRequired: 'Veuillez sélectionner une wilaya.',
  },
  en: {
    fullNameRequired: 'Full name is required.',
    fullNameLength: 'Full name must be at least 2 characters.',
    emailRequired: 'Email address is required.',
    emailInvalid: 'Invalid email address (e.g. example@domain.com).',
    passwordRequired: 'Password is required.',
    passwordLength: 'Password must be at least 8 characters.',
    passwordComplexity: 'Password must include an uppercase letter, a number and a special character.',
    passwordConfirmRequired: 'Please confirm your password.',
    passwordConfirmMismatch: 'Passwords do not match.',
    storeNameRequired: 'Store name is required.',
    storeSlugRequired: 'Store URL is required.',
    storeSlugInvalid: 'Store URL contains invalid characters (use letters, numbers, hyphens).',
    phoneRequired: 'Phone number is required.',
    phoneInvalid: 'Invalid Algerian number (e.g. 05xx xxx xxx or 07xx xxx xxx).',
    wilayaRequired: 'Please select a wilaya.',
  },
  ar: {
    fullNameRequired: 'الاسم الكامل مطلوب.',
    fullNameLength: 'يجب أن يكون الاسم الكامل حرفين على الأقل.',
    emailRequired: 'عنوان البريد الإلكتروني مطلوب.',
    emailInvalid: 'عنوان بريد إلكتروني غير صحيح.',
    passwordRequired: 'كلمة المرور مطلوبة.',
    passwordLength: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
    passwordComplexity: 'يجب أن تحتوي كلمة المرور على حرف كبير ورقم ورمز خاص.',
    passwordConfirmRequired: 'يرجى تأكيد كلمة المرور.',
    passwordConfirmMismatch: 'كلمتا المرور غير متطابقتين.',
    storeNameRequired: 'اسم المتجر مطلوب.',
    storeSlugRequired: 'رابط المتجر مطلوب.',
    storeSlugInvalid: 'يحتوي الرابط على أحرف غير مسموح بها (استخدم حروف وأرقام وشرطات).',
    phoneRequired: 'رقم الهاتف مطلوب.',
    phoneInvalid: 'رقم هاتف جزائري غير صحيح.',
    wilayaRequired: 'يرجى اختيار الولاية.',
  }
}

const stepLabels = {
  fr: ['Compte & boutique', 'Vérification e-mail'],
  en: ['Account & store', 'Email verification'],
  ar: ['الحساب والمتجر', 'تأكيد البريد'],
}

const fieldHints = {
  fr: {
    fullName: 'Tel qu\'il apparaîtra sur votre boutique.',
    email: 'Nous enverrons un code de vérification à cette adresse.',
    password: '8 caractères minimum avec majuscule, chiffre et caractère spécial.',
    passwordConfirm: 'Saisissez à nouveau votre mot de passe.',
    storeName: 'Le nom public de votre boutique.',
    storeSlug: 'L\'adresse web de votre boutique (lettres, chiffres, tirets).',
    phone: 'Format algérien : 05xx xxx xxx ou 07xx xxx xxx.',
    wilaya: 'Sélectionnez la wilaya de votre siège.',
    description: 'Décrivez ce que vous vendez (optionnel, 300 caractères max).',
  },
  en: {
    fullName: 'As it will appear on your store.',
    email: 'We will send a verification code to this address.',
    password: 'At least 8 characters with uppercase, number and special character.',
    passwordConfirm: 'Re-enter your password.',
    storeName: 'The public name of your store.',
    storeSlug: 'Your store web address (letters, numbers, hyphens).',
    phone: 'Algerian format: 05xx xxx xxx or 07xx xxx xxx.',
    wilaya: 'Select your headquarters wilaya.',
    description: 'Describe what you sell (optional, 300 characters max).',
  },
  ar: {
    fullName: 'كما سيظهر في متجرك.',
    email: 'سنرسل رمز التحقق إلى هذا العنوان.',
    password: '8 أحرف على الأقل مع حرف كبير ورقم ورمز خاص.',
    passwordConfirm: 'أعد إدخال كلمة المرور.',
    storeName: 'الاسم العام لمتجرك.',
    storeSlug: 'عنوان متجرك على الويب (حروف وأرقام وشرطات).',
    phone: 'الصيغة الجزائرية: 05xx xxx xxx أو 07xx xxx xxx.',
    wilaya: 'اختر ولاية مقرك.',
    description: 'صف ما تبيعه (اختياري، 300 حرف كحد أقصى).',
  },
}

const errorSummaryLabels = {
  fr: { title: 'Veuillez corriger les erreurs suivantes :', item: '•' },
  en: { title: 'Please fix the following errors:', item: '•' },
  ar: { title: 'يرجى تصحيح الأخطاء التالية:', item: '•' },
}

const pwdStrengthLabels = {
  fr: ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'],
  en: ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'],
  ar: ['ضعيف جداً', 'ضعيف', 'متوسط', 'قوي', 'قوي جداً'],
}

const pwdRequirements = {
  fr: ['8 caractères', '12 caractères', 'Une majuscule', 'Un chiffre', 'Un caractère spécial'],
  en: ['8 characters', '12 characters', 'One uppercase', 'One number', 'One special character'],
  ar: ['8 أحرف', '12 حرفاً', 'حرف كبير', 'رقم', 'رمز خاص'],
}

const otpLabels = {
  fr: { title: 'Code de vérification', sent: 'Code envoyé à', placeholder: '123456', verify: 'Vérifier et créer mon compte', resend: 'Renvoyer', edit: 'Modifier mes infos', digitsOnly: '6 chiffres' },
  en: { title: 'Verification code', sent: 'Code sent to', placeholder: '123456', verify: 'Verify and create account', resend: 'Resend', edit: 'Edit my info', digitsOnly: '6 digits' },
  ar: { title: 'رمز التحقق', sent: 'تم إرسال الرمز إلى', placeholder: '123456', verify: 'تحقق وأنشئ حسابي', resend: 'إعادة الإرسال', edit: 'تعديل بياناتي', digitsOnly: '6 أرقام' },
}

const slugLabels = {
  fr: { available: 'URL disponible', taken: 'URL déjà utilisée', checking: 'Vérification…', hint: 'Lettres, chiffres et tirets uniquement.' },
  en: { available: 'URL available', taken: 'URL already used', checking: 'Checking…', hint: 'Letters, numbers and hyphens only.' },
  ar: { available: 'الرابط متاح', taken: 'الرابط مستخدم', checking: 'جاري التحقق…', hint: 'حروف وأرقام وشرطات فقط.' },
}

function passwordScore(pwd: string): number {
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return score
}

function PasswordStrength({ password, lang }: { password: string; lang: 'fr' | 'en' | 'ar' }) {
  const score = passwordScore(password)
  const labels = pwdStrengthLabels[lang]
  const reqs = pwdRequirements[lang]
  const colors = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-600']
  const color = colors[Math.min(score, 4)]

  const met = [
    password.length >= 8,
    password.length >= 12,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]

  return (
    <div className="mt-2 space-y-2 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="text-xs font-medium text-gray-600">
        {labels[Math.min(score, 4)]}
      </p>
      <ul className="text-xs space-y-1 text-gray-500">
        {reqs.map((req, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {met[i] ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-gray-300" />}
            <span className={met[i] ? 'text-emerald-700 font-medium' : 'text-gray-400'}>{req}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ErrorSummary({ errors, labels, lang, isRTL }: { errors: Record<string, string>; labels: Record<string, string>; lang: 'fr' | 'en' | 'ar'; isRTL: boolean }) {
  const errorList = Object.entries(errors).filter(([, msg]) => !!msg)
  if (errorList.length === 0) return null
  const title = errorSummaryLabels[lang].title

  return (
    <div
      className="bg-red-50 border border-red-200 rounded-xl p-4"
      role="alert"
      aria-live="polite"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
        {title}
      </p>
      <ul className="space-y-1">
        {errorList.map(([field, msg]) => (
          <li key={field} className="text-xs text-red-700 flex items-start gap-2">
            <span className="mt-0.5">•</span>
            <span><strong>{labels[field] ?? field}:</strong> {msg}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function OtpInput({
  value,
  onChange,
  disabled,
  lang,
}: {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  lang: 'fr' | 'en' | 'ar'
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(6, ' ').split('')

  const focusNext = (idx: number) => {
    const next = inputsRef.current[idx + 1]
    if (next) next.focus()
  }

  const focusPrev = (idx: number) => {
    const prev = inputsRef.current[idx - 1]
    if (prev) prev.focus()
  }

  const handleChange = (idx: number, char: string) => {
    const cleaned = char.replace(/\D/g, '').slice(0, 1)
    if (!cleaned) return
    const arr = value.split('')
    arr[idx] = cleaned
    const nextVal = arr.join('').slice(0, 6)
    onChange(nextVal)
    if (nextVal.length < 6) focusNext(idx)
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const arr = value.split('')
      if (arr[idx]) {
        arr[idx] = ''
        onChange(arr.join('').slice(0, 6))
      } else if (idx > 0) {
        focusPrev(idx)
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      focusPrev(idx)
    } else if (e.key === 'ArrowRight' && idx < 5) {
      focusNext(idx)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
  }

  return (
    <div className="flex justify-center gap-2" dir="ltr">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => { inputsRef.current[idx] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digit === ' ' ? '' : digit}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          aria-label={`${otpLabels[lang].digitsOnly} ${idx + 1}`}
          className="w-12 h-14 text-center text-2xl font-bold border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60 transition-all"
        />
      ))}
    </div>
  )
}

function StepIndicator({
  current,
  labels,
  isRTL,
}: {
  current: number
  labels: string[]
  isRTL: boolean
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {labels.map((label, idx) => {
        const active = idx + 1 === current
        const completed = idx + 1 < current
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : completed
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {completed ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${active ? 'text-emerald-700' : 'text-gray-400'}`}>{label}</span>
            </div>
            {idx < labels.length - 1 && (
              <div className={`w-12 h-0.5 rounded-full ${completed ? 'bg-emerald-200' : 'bg-gray-100'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('213') && digits.length >= 10) return `0${digits.slice(3)}`
  if (digits.startsWith('0')) return digits
  return `0${digits}`
}

export default function SellerRegisterPage() {
  const t = useT()
  const lang = useLang()
  const searchParams = useSearchParams()
  const isRTL = lang === 'ar'
  const msgs = validationMsgs[lang] || validationMsgs.fr
  const hints = fieldHints[lang] || fieldHints.fr
  const stepLabs = stepLabels[lang] || stepLabels.fr
  const otpLab = otpLabels[lang] || otpLabels.fr

  const fieldLabels: Record<string, string> = {
    fullName: t.seller.fullNameLabel,
    email: t.seller.emailLabel,
    password: t.seller.passwordLabel,
    passwordConfirm: isRTL ? 'تأكيد كلمة المرور' : 'Confirmer le mot de passe',
    storeName: t.seller.storeNameLabel,
    storeSlug: t.seller.storeUrlLabel,
    phone: t.seller.phoneLabel,
    wilaya: t.seller.wilayaLabel,
  }

  // Prefill form from the homepage short signup form (or any external link).
  const initialForm = useMemo(() => {
    const normalize = (val: string | null) => {
      if (!val) return ''
      try { return decodeURIComponent(val) } catch { return val }
    }
    return {
      fullName: normalize(searchParams.get('fullName')),
      email: normalize(searchParams.get('email')),
      password: '',
      passwordConfirm: '',
      storeName: normalize(searchParams.get('storeName')),
      storeSlug: slugify(normalize(searchParams.get('storeSlug')) || normalize(searchParams.get('storeName'))),
      phone: normalize(searchParams.get('phone')),
      wilaya: normalize(searchParams.get('wilaya')),
      description: '',
    }
  }, [searchParams])

  const [view, setView] = useState<View>('form')
  const [showPwd, setShowPwd] = useState(false)
  const [showPwdConfirm, setShowPwdConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [otp, setOtp] = useState('')
  const [done, setDone] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const slugCheckRef = useRef<NodeJS.Timeout | null>(null)

  const [form, setForm] = useState(initialForm)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback((fName: string, fValue: string, allForm = form): string => {
    let err = ''

    if (fName === 'fullName') {
      if (!fValue.trim()) err = msgs.fullNameRequired
      else if (fValue.trim().length < 2) err = msgs.fullNameLength
    }
    if (fName === 'email') {
      if (!fValue.trim()) err = msgs.emailRequired
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fValue.trim())) {
        err = msgs.emailInvalid
      }
    }
    if (fName === 'password') {
      if (!fValue) err = msgs.passwordRequired
      else if (fValue.length < 8) err = msgs.passwordLength
      else if (!/[A-Z]/.test(fValue) || !/[0-9]/.test(fValue) || !/[^A-Za-z0-9]/.test(fValue)) {
        err = msgs.passwordComplexity
      }
    }
    if (fName === 'passwordConfirm') {
      if (!fValue) err = msgs.passwordConfirmRequired
      else if (fValue !== allForm.password) err = msgs.passwordConfirmMismatch
    }
    if (fName === 'storeName') {
      if (!fValue.trim()) err = msgs.storeNameRequired
    }
    if (fName === 'storeSlug') {
      if (!fValue.trim()) err = msgs.storeSlugRequired
      else {
        const slugVal = validateStoreSlug(fValue)
        if (!slugVal.ok) err = msgs.storeSlugInvalid
      }
    }
    if (fName === 'phone') {
      if (!fValue.trim()) err = msgs.phoneRequired
      else if (!isValidAlgerianPhone(fValue)) err = msgs.phoneInvalid
    }
    if (fName === 'wilaya') {
      if (!fValue) err = msgs.wilayaRequired
    }

    setErrors((prev) => ({ ...prev, [fName]: err }))
    return err
  }, [msgs, form])

  const checkSlug = useCallback(async (slug: string) => {
    const formatCheck = validateStoreSlug(slug)
    if (!formatCheck.ok) {
      setSlugStatus('invalid')
      return
    }
    setSlugStatus('checking')
    try {
      const res = await fetch(`/api/seller/check-slug?slug=${encodeURIComponent(slug)}`)
      if (!res.ok) {
        setSlugStatus('idle')
        return
      }
      const body = await res.json()
      if (typeof body.available !== 'boolean') {
        setSlugStatus('idle')
        return
      }
      setSlugStatus(body.available ? 'available' : 'taken')
    } catch {
      setSlugStatus('idle')
    }
  }, [])

  const f = (key: keyof typeof form, val: string) => {
    const next = { ...form, [key]: val }
    if (key === 'storeName') {
      next.storeSlug = slugify(val)
      if (touched.storeSlug) validate('storeSlug', next.storeSlug, next)
      if (next.storeSlug) {
        if (slugCheckRef.current) clearTimeout(slugCheckRef.current)
        slugCheckRef.current = setTimeout(() => checkSlug(next.storeSlug), 400)
      } else {
        setSlugStatus('idle')
      }
    }
    if (key === 'storeSlug') {
      next.storeSlug = slugify(val)
      if (next.storeSlug) {
        if (slugCheckRef.current) clearTimeout(slugCheckRef.current)
        slugCheckRef.current = setTimeout(() => checkSlug(next.storeSlug), 400)
      } else {
        setSlugStatus('idle')
      }
    }
    if (key === 'phone') {
      next.phone = normalizePhone(val)
    }
    setForm(next)
    if (touched[key]) validate(key, val, next)
  }

  const handleBlur = (key: keyof typeof form) => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    validate(key, form[key])
  }

  useEffect(() => {
    if (resendSeconds <= 0) return
    const id = setTimeout(() => setResendSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [resendSeconds])

  // If the form was prefilled from the homepage, validate the slug availability.
  useEffect(() => {
    if (form.storeSlug) {
      checkSlug(form.storeSlug)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const step1Fields = ['fullName', 'email', 'password', 'passwordConfirm', 'storeName', 'storeSlug', 'phone', 'wilaya'] as const
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(step1Fields.map((f) => [f, true])) }))

    let hasErrors = false
    step1Fields.forEach((field) => {
      if (validate(field, form[field])) hasErrors = true
    })

    if (hasErrors || slugStatus === 'taken' || slugStatus === 'invalid') {
      setInfo('')
      if (!hasErrors && (slugStatus === 'taken' || slugStatus === 'invalid')) {
        setError(isRTL ? 'رابط المتجر غير متاح أو غير صالح.' : 'L\'URL de la boutique n\'est pas disponible ou n\'est pas valide.')
      } else {
        setError('')
      }
      return
    }

    setLoading(true); setError(''); setInfo('')
    try {
      const res = await fetch('/api/seller/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? (isRTL ? 'تعذر إرسال الرمز.' : 'Impossible d\'envoyer le code.'))
        return
      }
      if (body._devOtp) {
        setInfo(`${isRTL ? 'رمز التطوير' : 'Code dev'} : ${body._devOtp}${body._emailError ? ` — ${body._emailError.slice(0, 120)}` : ''}`)
      }
      setOtp('')
      setView('otp')
      setResendSeconds(60)
    } catch {
      setError(isRTL ? 'خطأ في الاتصال. تحقق من اتصالك بالإنترنت.' : 'Erreur de connexion. Vérifiez votre accès internet.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      setError(isRTL ? 'أدخل رمز التحقق المكون من 6 أرقام.' : 'Entrez le code à 6 chiffres.')
      return
    }
    setLoading(true); setError(''); setInfo('')
    try {
      const verifyRes = await fetch('/api/seller/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp }),
      })
      const verifyBody = await verifyRes.json()
      if (!verifyRes.ok) {
        setError(verifyBody.error ?? (isRTL ? 'رمز غير صحيح.' : 'Code incorrect.'))
        setLoading(false)
        return
      }

      const res = await fetch('/api/seller/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: form.storeName,
          store_slug: form.storeSlug,
          logo_url: null,
          description: form.description || null,
          phone: form.phone || null,
          wilaya: form.wilaya || null,
          email: form.email,
          password: form.password,
          otp,
        }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        setError(res.status === 409 ? t.seller.urlTaken : (msg ?? t.seller.registrationFailed))
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
    if (resendSeconds > 0) return
    setError(''); setInfo(''); setLoading(true)
    try {
      const res = await fetch('/api/seller/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? (isRTL ? 'فشل إعادة الإرسال.' : 'Échec du renvoi.'))
      } else {
        setResendSeconds(60)
        setInfo(isRTL ? 'تم إرسال رمز جديد.' : 'Un nouveau code a été envoyé.')
      }
    } finally {
      setLoading(false)
    }
  }

  const slugMsg = useMemo(() => {
    const labs = slugLabels[lang] || slugLabels.fr
    if (slugStatus === 'available') return { text: labs.available, color: 'text-emerald-600', icon: Check }
    if (slugStatus === 'taken') return { text: labs.taken, color: 'text-red-600', icon: X }
    if (slugStatus === 'checking') return { text: labs.checking, color: 'text-gray-500', icon: Loader2 }
    return { text: labs.hint, color: 'text-gray-400', icon: null }
  }, [slugStatus, lang])

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">{t.seller.storeCreated}</h1>
          <p className="text-gray-500 text-sm mb-6">{t.seller.storeCreatedMsg}</p>
          <div className="bg-emerald-50 rounded-xl p-4 mb-6 text-left text-sm text-emerald-800">
            <p className="font-semibold mb-1">{isRTL ? 'الخطوات التالية:' : 'Prochaines étapes :'}</p>
            <ul className="list-disc list-inside space-y-1 text-emerald-700">
              <li>{isRTL ? 'تحقق من بريدك الإلكتروني لتأكيد الحساب' : 'Vérifiez votre e-mail de confirmation'}</li>
              <li>{isRTL ? 'أكمل ملف المتجر' : 'Complétez votre profil vendeur'}</li>
              <li>{isRTL ? 'أضف منتجك الأول' : 'Ajoutez votre premier produit'}</li>
            </ul>
          </div>
          <Link
            href="/seller/login"
            className="block w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors text-center"
          >
            {t.seller.goToLogin}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-start justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg">
        <Link
          href="/become-seller"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t.common.back}
        </Link>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
          <StepIndicator current={view === 'form' ? 1 : 2} labels={stepLabs} isRTL={isRTL} />

          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              {view === 'otp' ? <KeyRound className="w-6 h-6 text-white" /> : <Store className="w-6 h-6 text-white" />}
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              {view === 'otp' ? otpLab.title : t.seller.registerTitle}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {view === 'otp' ? `${otpLab.sent} ${form.email}` : t.seller.registerSub}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-700">
              <EyeIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
              <span>{info}</span>
            </div>
          )}

          {view === 'otp' && (
            <form onSubmit={handleVerifyAndCreate} className="space-y-5">
              <div>
                <OtpInput value={otp} onChange={setOtp} disabled={loading} lang={lang as 'fr' | 'en' | 'ar'} />
                <p className="text-center text-xs text-gray-400 mt-2">{otpLab.digitsOnly}</p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {otpLab.verify}
              </button>

              <div className="flex items-center justify-between text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                <button
                  type="button"
                  onClick={() => { setView('form'); setOtp(''); setError(''); setInfo('') }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✏ {otpLab.edit}
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || resendSeconds > 0}
                  className="text-emerald-600 hover:underline font-medium disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {resendSeconds > 0 ? (
                    <>{otpLab.resend} ({resendSeconds}s)</>
                  ) : (
                    <><RefreshCw className="w-3.5 h-3.5" /> {otpLab.resend}</>
                  )}
                </button>
              </div>
            </form>
          )}

          {view === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <ErrorSummary errors={errors} labels={fieldLabels} lang={lang as 'fr' | 'en' | 'ar'} isRTL={isRTL} />

              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">{t.seller.accountInfo}</p>

              <Field
                id="fullName"
                label={t.seller.fullNameLabel}
                icon={<User className="w-4 h-4 text-gray-400" />}
                type="text"
                value={form.fullName}
                onChange={(v) => f('fullName', v)}
                onBlur={() => handleBlur('fullName')}
                placeholder="Mohammed Amiri"
                touched={touched.fullName}
                error={errors.fullName}
                helper={hints.fullName}
                isRTL={isRTL}
                autoComplete="name"
              />

              <Field
                id="email"
                label={t.seller.emailLabel}
                icon={<Mail className="w-4 h-4 text-gray-400" />}
                type="email"
                value={form.email}
                onChange={(v) => f('email', v)}
                onBlur={() => handleBlur('email')}
                placeholder="you@example.com"
                touched={touched.email}
                error={errors.email}
                helper={hints.email}
                isRTL={isRTL}
                autoComplete="email"
              />

              <div>
                <Field
                  id="password"
                  label={t.seller.passwordLabel}
                  icon={<Lock className="w-4 h-4 text-gray-400" />}
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(v) => f('password', v)}
                  onBlur={() => handleBlur('password')}
                  placeholder={t.seller.passwordMin}
                  touched={touched.password}
                  error={errors.password}
                  helper={hints.password}
                  isRTL={isRTL}
                  autoComplete="new-password"
                  rightElement={
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                {form.password.length > 0 && <PasswordStrength password={form.password} lang={lang as 'fr' | 'en' | 'ar'} />}
              </div>

              <Field
                id="passwordConfirm"
                label={isRTL ? 'تأكيد كلمة المرور' : 'Confirmer le mot de passe'}
                icon={<Lock className="w-4 h-4 text-gray-400" />}
                type={showPwdConfirm ? 'text' : 'password'}
                value={form.passwordConfirm}
                onChange={(v) => f('passwordConfirm', v)}
                onBlur={() => handleBlur('passwordConfirm')}
                placeholder={t.seller.passwordMin}
                touched={touched.passwordConfirm}
                error={errors.passwordConfirm}
                helper={hints.passwordConfirm}
                isRTL={isRTL}
                autoComplete="new-password"
                rightElement={
                  <button type="button" onClick={() => setShowPwdConfirm(!showPwdConfirm)} className="text-gray-400 hover:text-gray-600">
                    {showPwdConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">{t.seller.storeInfo}</p>

              <Field
                id="storeName"
                label={t.seller.storeNameLabel}
                icon={<Store className="w-4 h-4 text-gray-400" />}
                type="text"
                value={form.storeName}
                onChange={(v) => f('storeName', v)}
                onBlur={() => handleBlur('storeName')}
                placeholder={t.seller.myAlgerianShop}
                touched={touched.storeName}
                error={errors.storeName}
                helper={hints.storeName}
                isRTL={isRTL}
                autoComplete="organization"
              />

              <div>
                <label htmlFor="storeSlug" className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.storeUrlLabel}</label>
                <div
                  className={`flex items-center border rounded-xl overflow-hidden transition-all ${
                    touched.storeSlug && errors.storeSlug
                      ? 'border-red-300 focus-within:border-red-500 bg-red-50/10'
                      : 'border-gray-200 focus-within:border-emerald-400'
                  }`}
                  dir="ltr"
                >
                  <span className="px-3 py-3 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap select-none">storedz.dz/shop/</span>
                  <input
                    id="storeSlug"
                    required
                    type="text"
                    value={form.storeSlug}
                    onChange={(e) => f('storeSlug', e.target.value)}
                    onBlur={() => handleBlur('storeSlug')}
                    placeholder="my-shop"
                    aria-invalid={!!(touched.storeSlug && errors.storeSlug)}
                    aria-describedby="slug-hint"
                    className="flex-1 px-3 py-3 text-sm focus:outline-none bg-transparent"
                  />
                </div>
                <div id="slug-hint" className="mt-1.5">
                  {touched.storeSlug && errors.storeSlug ? (
                    <p className="text-xs text-red-600 flex items-center gap-1 font-medium" role="alert">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      {errors.storeSlug}
                    </p>
                  ) : (
                    <p className={`text-xs flex items-center gap-1 font-medium ${slugMsg.color}`}>
                      {slugMsg.icon && <slugMsg.icon className={`w-3 h-3 ${slugStatus === 'checking' ? 'animate-spin' : ''}`} />}
                      {slugMsg.text || hints.storeSlug}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  id="phone"
                  label={t.seller.phoneLabel}
                  icon={<Phone className="w-4 h-4 text-gray-400" />}
                  type="tel"
                  value={form.phone}
                  onChange={(v) => f('phone', v)}
                  onBlur={() => handleBlur('phone')}
                  placeholder={t.seller.phonePHRegister}
                  touched={touched.phone}
                  error={errors.phone}
                  helper={hints.phone}
                  isRTL={isRTL}
                  autoComplete="tel"
                />

                <div>
                  <label htmlFor="wilaya" className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.wilayaLabel}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      id="wilaya"
                      value={form.wilaya}
                      onChange={(e) => f('wilaya', e.target.value)}
                      onBlur={() => handleBlur('wilaya')}
                      aria-invalid={!!(touched.wilaya && errors.wilaya)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none bg-white transition-all ${
                        touched.wilaya && errors.wilaya
                          ? 'border-red-300 focus:border-red-500 bg-red-50/10'
                          : 'border-gray-200 focus:border-emerald-400'
                      }`}
                    >
                      <option value="">{t.seller.selectWilaya}</option>
                      {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  {touched.wilaya && errors.wilaya ? (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium" role="alert">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      {errors.wilaya}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{hints.wilaya}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.descLabel}</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => f('description', e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder={t.seller.descPH}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 resize-none"
                  />
                </div>
                <p className="text-xs text-gray-500 text-right mt-1">{form.description.length}/300 · {hints.description}</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 text-base"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Store className="w-5 h-5" />}
                {loading ? t.seller.creating : t.seller.createMyStore}
              </button>

              <p className="text-xs text-gray-400 text-center">{t.seller.terms}</p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
function Field({
  id,
  label,
  icon,
  type,
  value,
  onChange,
  onBlur,
  placeholder,
  touched,
  error,
  helper,
  isRTL,
  autoComplete,
  rightElement,
}: {
  id: string
  label: string
  icon: React.ReactNode
  type: string
  value: string
  onChange: (val: string) => void
  onBlur: () => void
  placeholder: string
  touched?: boolean
  error?: string
  helper?: string
  isRTL: boolean
  autoComplete?: string
  rightElement?: React.ReactNode
}) {
  const hasError = !!touched && !!error
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hasError ? errorId : undefined, helper && !hasError ? hintId : undefined]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2">{icon}</span>
        <input
          id={id}
          name={id}
          required
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={`w-full pl-10 ${rightElement ? 'pr-12' : 'pr-4'} py-3 border rounded-xl text-sm focus:outline-none transition-all ${
            hasError
              ? 'border-red-400 focus:border-red-500 bg-red-50/20'
              : 'border-gray-200 focus:border-emerald-400'
          }`}
          dir={isRTL && id !== 'storeSlug' && id !== 'email' ? 'rtl' : 'ltr'}
        />
        {rightElement && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightElement}</span>
        )}
      </div>
      {helper && !hasError && (
        <p id={hintId} className="text-xs text-gray-500 mt-1.5 leading-relaxed">{helper}</p>
      )}
      {hasError && (
        <p id={errorId} className="text-xs text-red-600 mt-1.5 flex items-start gap-1.5 font-medium" role="alert">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="leading-tight">{error}</span>
        </p>
      )}
    </div>
  )
}
