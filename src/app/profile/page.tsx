'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Package, Heart, Lock, MapPin, ChevronRight, LogOut, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const QUICK_LINKS = [
  { href: '/orders',            icon: Package, label: 'Mes commandes',     desc: 'Suivi et historique',    color: 'text-indigo-600 bg-indigo-50' },
  { href: '/profile/addresses', icon: MapPin,  label: 'Mes adresses',      desc: 'Adresses de livraison',  color: 'text-emerald-600 bg-emerald-50' },
  { href: '/wishlist',          icon: Heart,   label: 'Liste de souhaits', desc: 'Articles sauvegardés',   color: 'text-red-500 bg-red-50' },
  { href: '/auth',              icon: Lock,    label: 'Sécurité',          desc: 'Mot de passe & accès',   color: 'text-amber-600 bg-amber-50' },
]

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser]       = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/auth')
      } else {
        setUser(data.user)
      }
      setLoading(false)
    })
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!user) return null

  const displayName = ((user.user_metadata?.full_name as string | undefined) || user.email || 'Utilisateur')
  const initial     = (displayName[0] ?? 'U').toUpperCase()
  const joinDate    = new Date(user.created_at).toLocaleDateString('fr-DZ', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* Profile card */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black select-none">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black truncate">{displayName}</h1>
            <p className="text-indigo-200 text-sm truncate">{user.email}</p>
            <p className="text-indigo-300 text-xs mt-0.5">Membre depuis {joinDate}</p>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" /> Informations personnelles
        </h2>
        <div className="space-y-0">
          {[
            { label: 'Nom complet', value: displayName },
            { label: 'Email',       value: user.email ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-semibold text-gray-900 truncate ml-4 max-w-[60%] text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <h2 className="font-bold text-gray-900 px-5 pt-5 pb-3">Mon compte</h2>
        {QUICK_LINKS.map(({ href, icon: Icon, label, desc, color }, i) => (
          <Link
            key={i}
            href={href}
            className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors border-t border-gray-50 first:border-0"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border border-red-200 text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-colors shadow-sm"
      >
        <LogOut className="w-4 h-4" /> Se déconnecter
      </button>
    </div>
  )
}
