'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, XCircle, CheckCircle, LogOut, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getVendorByUserId } from '@/lib/supabase/queries'
import type { Vendor } from '@/lib/supabase/vendors'

export default function SellerPendingPage() {
  const router  = useRouter()
  const [vendor,    setVendor]    = useState<Vendor | null>(null)
  const [checking,  setChecking]  = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/seller/login'); return }
      const v = await getVendorByUserId(user.id)
      if (!v)           { router.push('/seller/login'); return }
      if (v.is_approved){ router.push('/seller/dashboard'); return }
      setVendor(v)
    })
  }, [router])

  const checkAgain = async () => {
    setChecking(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/seller/login'); return }
    const v = await getVendorByUserId(user.id)
    if (v?.is_approved) { router.push('/seller/dashboard'); return }
    setVendor(v)
    setChecking(false)
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/seller/login')
  }

  const isDeclined = vendor && !vendor.is_approved && !vendor.is_active

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md w-full">

        {isDeclined ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Demande refusée</h1>
            <p className="text-gray-500 text-sm mb-4">
              Votre boutique <span className="font-bold text-gray-800">{vendor?.store_name}</span> n&apos;a pas été approuvée.
            </p>
            {(vendor as Vendor & { admin_note?: string | null })?.admin_note && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700 text-left">
                <p className="font-bold mb-1">Motif :</p>
                <p>{(vendor as Vendor & { admin_note?: string | null }).admin_note}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mb-6">
              Contactez-nous à <a href="mailto:support@shopdz.dz" className="text-emerald-600 underline">support@shopdz.dz</a> pour plus d&apos;informations.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">En attente de validation</h1>
            <p className="text-gray-500 text-sm mb-2">
              Votre boutique <span className="font-bold text-gray-800">{vendor?.store_name}</span> a bien été créée.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Notre équipe va vérifier votre dossier et vous donner accès dans les plus brefs délais (généralement 24h).
            </p>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-6 text-sm text-emerald-700 text-left space-y-1.5">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0" /> Compte créé avec succès</div>
              <div className="flex items-center gap-2 text-amber-600"><Clock className="w-4 h-4 flex-shrink-0" /> Vérification en cours par notre équipe</div>
            </div>
            <button
              onClick={checkAgain}
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 mb-3"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Vérification…' : 'Vérifier mon statut'}
            </button>
          </>
        )}

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
      </div>
    </div>
  )
}
