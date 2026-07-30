'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Store, ArrowRight, Check, Smartphone, Globe, ShoppingCart,
  Zap, MessageCircle, BarChart3, Package, Users, Star,
  TrendingUp, CreditCard, ChevronDown, Plus, Minus, Building,
  Truck, Copy, CheckCircle2, ChevronRight, ShieldCheck, RefreshCw,
  Search, Sliders, Palette, Landmark, ShieldAlert, Award
} from 'lucide-react'

// ── Icons / Logos ──────────────────────────────────────────────────────
const WA_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

// ── Mock niches for interactive customizer ─────────────────────────────
const MOCK_NICHES = {
  traditional: {
    label: 'Artisanat & Tradition',
    name: 'Boutique El Djazaïr',
    color: '#047857', // Emerald
    bgAccent: 'from-emerald-500/20 to-teal-500/5',
    tag: '🇩🇿 100% Algérien',
    products: [
      { name: 'Robe Kabyle Traditionnelle', price: '4,500 DA', desc: 'Robe de fête brodée main, col en V algérois.', image: '👗' },
      { name: 'Burnous en Laine pure', price: '12,500 DA', desc: 'Authentique burnous tissé à la main.', image: '🧥' }
    ]
  },
  beauty: {
    label: 'Cosmétique & Huiles',
    name: 'Sahara Pure',
    color: '#d97706', // Amber
    bgAccent: 'from-amber-500/20 to-orange-500/5',
    tag: '🌿 Naturel & local',
    products: [
      { name: 'Huile de Figue de Barbarie', price: '2,900 DA', desc: '100% pure et pressée à froid en Kabylie.', image: '🧪' },
      { name: 'Savon Artisanal Datte & Miel', price: '750 DA', desc: 'Saponifié à froid avec des dattes du Sud.', image: '🧼' }
    ]
  },
  electronics: {
    label: 'Téléphonie & Tech',
    name: 'Ecom-Dz Tech',
    color: '#3b82f6', // Blue
    bgAccent: 'from-blue-500/20 to-sky-500/5',
    tag: '⚡ Expédié sous 24h',
    products: [
      { name: 'Chargeur Rapide 65W', price: '3,100 DA', desc: 'Compatible avec tous les smartphones récents.', image: '🔌' },
      { name: 'Écouteurs Bluetooth Pro', price: '4,800 DA', desc: 'Réduction de bruit active, son de qualité.', image: '🎧' }
    ]
  }
}

export default function HomePage() {
  // ── States ───────────────────────────────────────────────────────────
  const [storeName, setStoreName] = useState('Boutique Kabylie')
  const [activeNicheKey, setActiveNicheKey] = useState<keyof typeof MOCK_NICHES>('traditional')
  const [storeColor, setStoreColor] = useState('#047857')
  const [isCopied, setIsCopied] = useState(false)

  // Multi-Store States
  const [selectedDashboardStore, setSelectedDashboardStore] = useState('store1')

  // WhatsApp simulation states
  const [simStep, setSimStep] = useState(1)

  // FAQ Accordion states
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const activeNiche = MOCK_NICHES[activeNicheKey]

  // Sync color changes when switching niches
  useEffect(() => {
    setStoreColor(MOCK_NICHES[activeNicheKey].color)
  }, [activeNicheKey])

  const copyStoreLink = () => {
    navigator.clipboard.writeText(`ecom-dz.net/store/${storeName.toLowerCase().replace(/\s+/g, '-')}`)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white overflow-hidden animate-fade-in">
      
      {/* ── BACKGROUND GLOWS ───────────────────────────────────────────────── */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-1/3 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[130px] pointer-events-none" />

      {/* ── NAV BAR ────────────────────────────────────── */}
      <header className="relative z-50 max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Store className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">Store<span className="text-indigo-400">Dz</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
          <a href="#customizer" className="hover:text-white transition-colors">Bâtisseur de Boutique</a>
          <a href="#advantages" className="hover:text-white transition-colors">Avantages Compétitifs</a>
          <a href="#multistore" className="hover:text-white transition-colors">Multi-Boutique</a>
          <a href="#apis" className="hover:text-white transition-colors">Intégrations APIs</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/seller/login"
            className="text-sm font-bold text-slate-300 hover:text-white px-4 py-2 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/become-seller"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Démarrer Gratuitement
          </Link>
        </div>
      </header>

      {/* ── HERO SECTION ───────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-12 sm:pt-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4.5 py-1.5 rounded-full text-xs font-extrabold text-indigo-300 mb-8 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          Solution E-commerce 100% Algérienne · 🇩🇿
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.1] mb-6 tracking-tight text-white">
          Vendez en Algérie<br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
            sans commission et sans intermédiaire
          </span>
        </h1>

        <p className="text-slate-450 text-base sm:text-xl mb-10 leading-relaxed max-w-3xl mx-auto">
          Gérez plusieurs boutiques de niche, centralisez vos fiches clients dans un CRM unifié, et automatisez vos livraisons avec Yalidine, Procolis et Maystro en quelques clics.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link
            href="/become-seller"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black px-8 py-4.5 rounded-2xl shadow-xl shadow-indigo-600/35 hover:scale-[1.02] active:scale-[0.98] transition-all text-base"
          >
            <Store className="w-5 h-5" />
            Créer ma boutique maintenant
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="#customizer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900/60 hover:bg-slate-900 text-slate-300 font-semibold px-8 py-4.5 rounded-2xl hover:text-white transition-colors text-base border border-slate-800/80"
          >
            <Sliders className="w-4 h-4 text-indigo-400" /> Essayer la démo interactive
          </a>
        </div>
      </section>

      {/* ── INTERACTIVE SANDBOX CUSTOMIZER ─────────────────────────────────── */}
      <section id="customizer" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Créez virtuellement votre boutique</h2>
          <p className="text-slate-450 max-w-2xl mx-auto">Saisissez le nom de votre marque, choisissez un thème et une niche pour voir comment votre boutique s&apos;affiche sur mobile.</p>
        </div>

        <div className="grid lg:grid-cols-[45%_55%] gap-8 items-center bg-slate-900/30 border border-slate-900 p-6 sm:p-10 rounded-[32px] backdrop-blur-xl">
          {/* Controls Panel */}
          <div className="space-y-6">
            <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">Configuration de base</span>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Nom de votre commerce</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value || 'Ma Boutique')}
                  maxLength={25}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Couleur thématique du site</label>
                <div className="flex gap-3">
                  {['#047857', '#d97706', '#3b82f6', '#ec4899', '#8b5cf6'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setStoreColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-9 h-9 rounded-xl transition-transform relative ${storeColor === color ? 'scale-110 ring-2 ring-white/50' : 'opacity-80 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Sélectionnez une Niche Locale</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(Object.keys(MOCK_NICHES) as Array<keyof typeof MOCK_NICHES>).map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveNicheKey(key)}
                    className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border text-center ${activeNicheKey === key ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'}`}
                  >
                    {MOCK_NICHES[key].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Live Link preview */}
            <div className="p-4.5 bg-indigo-950/10 border border-indigo-900/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">Votre lien unique réservé</p>
                <p className="text-sm font-bold font-mono text-white truncate">
                  ecom-dz.net/store/<span className="text-indigo-400">{storeName.toLowerCase().replace(/\s+/g, '-')}</span>
                </p>
              </div>
              <button
                onClick={copyStoreLink}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 text-xs font-bold text-white px-4 py-2.5 rounded-xl border border-slate-800 transition-colors"
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                {isCopied ? 'Copié !' : 'Copier le lien'}
              </button>
            </div>
          </div>

          {/* Interactive Phone Mockup Render */}
          <div className="relative mx-auto w-full max-w-[340px] aspect-[9/18.5] bg-slate-950 rounded-[48px] p-3 border-[6px] border-slate-850 shadow-2xl overflow-hidden ring-4 ring-indigo-500/10">
            {/* Speaker & camera slot */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-850 rounded-b-2xl z-50 flex items-center justify-center">
              <div className="w-12 h-1 bg-black rounded-full mb-1" />
            </div>

            {/* Mobile screen container */}
            <div className="h-full w-full bg-white text-slate-900 rounded-[38px] overflow-y-auto scrollbar-none flex flex-col relative pt-4">
              {/* Shop Header */}
              <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between z-10">
                <span className="font-extrabold text-sm tracking-tight text-slate-900">{storeName}</span>
                <ShoppingCart className="w-4 h-4 text-slate-600" />
              </div>

              {/* Shop Hero Banner */}
              <div className={`p-5 bg-gradient-to-br ${activeNiche.bgAccent} text-center border-b border-slate-100 flex flex-col items-center justify-center`}>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 mb-2 border border-slate-200">
                  {activeNiche.tag}
                </span>
                <h3 className="text-base font-black text-slate-900">{storeName}</h3>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-normal">Bienvenue dans notre boutique e-commerce. Paiement à la livraison sur 58 wilayas.</p>
              </div>

              {/* Shop Products Listing Grid */}
              <div className="p-4 flex-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Produits du Catalogue</p>
                <div className="grid grid-cols-2 gap-3">
                  {activeNiche.products.map((prod) => (
                    <div key={prod.name} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col">
                      <div className="aspect-square bg-slate-200/50 rounded-lg flex items-center justify-center text-3xl mb-2">
                        {prod.image}
                      </div>
                      <h4 className="text-[10px] font-bold text-slate-800 line-clamp-1">{prod.name}</h4>
                      <p className="text-[8px] text-slate-400 mt-0.5 line-clamp-2 leading-tight">{prod.desc}</p>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-900">{prod.price}</span>
                        <button
                          style={{ backgroundColor: storeColor }}
                          className="w-5 h-5 rounded-md text-white flex items-center justify-center text-xs font-black shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticky Order button */}
              <div className="sticky bottom-0 bg-white/95 border-t border-slate-100 p-3">
                <button
                  style={{ backgroundColor: storeColor }}
                  className="w-full text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-black/10"
                >
                  {WA_SVG} Commander via WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WINNING POINTS / ADVANTAGES SECTION (No lies, 100% Real local value) ── */}
      <section id="advantages" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-900/60">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold text-indigo-400 mb-4">
            <Award className="w-4 h-4" /> Avantages Concurrentiels Reéls
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Pourquoi les meilleurs vendeurs algériens choisissent StoreDz ?</h2>
          <p className="text-slate-450 mt-2 max-w-2xl mx-auto">Des outils construits pour les réalités du marché algérien. Pas de fonctions inutiles, juste du concret pour votre e-commerce.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Point 1: Anti-Retour Client unique */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Lutte contre les colis non récupérés</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Le premier fléau de l&apos;e-commerce en Algérie. Notre base de données client consolidée analyse l&apos;historique d&apos;achat du client. S&apos;il a déjà refusé plusieurs colis sur d&apos;autres boutiques de la plateforme, vous êtes alerté avant d&apos;expédier pour économiser vos frais de retour.
            </p>
          </div>

          {/* Point 2: APIs Transporteurs en 1-clic */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Intégrations APIs Logistiques locales</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connectez vos comptes de transporteurs en 1 clic (Yalidine, ZR Express, Procolis, Maystro). Exportez vos commandes instantanément, imprimez vos bordereaux d&apos;expédition en masse et synchronisez le statut du colis en temps réel sans aucune saisie manuelle.
            </p>
          </div>

          {/* Point 3: Gestion Multi-Boutique */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Multi-Boutique sous un seul compte</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gérez plusieurs marques ou catalogues de niches différents sans payer plusieurs abonnements distincts. Vous passez d&apos;un magasin à un autre depuis la même interface et centralisez l&apos;ensemble de vos clients au même endroit.
            </p>
          </div>

          {/* Point 4: Zéro commission */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">0% de commission sur vos ventes</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Contrairement à d&apos;autres plateformes, StoreDz ne prend aucun pourcentage sur votre chiffre d&apos;affaires. Vous payez un abonnement mensuel fixe et transparent. Vos gains sont 100% les vôtres.
            </p>
          </div>

          {/* Point 5: Paiement local par BaridiMob & CCP */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Landmark className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Abonnement payable en DZD (CCP / BaridiMob)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pas besoin de carte bancaire internationale (Wise, Redotpay, Pyypl) pour payer votre outil. Réglez votre abonnement e-commerce en Dinars Algériens par virement BaridiMob, versement CCP, ou par carte Edahabia/CIB locale.
            </p>
          </div>

          {/* Point 6: Totalement Optimisé Mobile-first */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Optimisé pour les connexions 3G / 4G</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Les boutiques StoreDz sont ultra-légères et s&apos;ouvrent instantanément, même dans les wilayas à faible couverture réseau. Moins de temps de chargement signifie moins d&apos;abandons de paniers par vos clients.
            </p>
          </div>

        </div>
      </section>

      {/* ── MULTI-STORE & CRM CONSOLIDATION DETAIL ─────────────────────────── */}
      <section id="multistore" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-900/60">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold text-indigo-400">
              <Building className="w-4 h-4" /> CRM Vendeur Unifié
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Fichier client consolidé et<br />
              <span className="text-indigo-400">multi-boutique d&apos;un seul coup</span>
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Évitez d&apos;éparpiller les informations de vos acheteurs. Notre système regroupe vos clients sous une fiche unique. Même si vous gérez des magasins de vêtements et de tech distincts, l&apos;historique d&apos;achat et la fiabilité de vos acheteurs sont croisés au même endroit.
            </p>

            <div className="space-y-3.5">
              {[
                { title: 'Fiche client unifiée', desc: 'Savoir exactement quel client a commandé sur quelle boutique et le montant de ses dépenses globales.' },
                { title: 'Filtrage automatique des wilayas', desc: 'Classez et filtrez vos expéditions par wilaya pour négocier des tarifs préférentiels avec Yalidine ou ZR.' },
                { title: 'Sécurité renforcée de vos données', desc: 'Vos fichiers clients sont cryptés et strictement confidentiels. Aucun autre vendeur n\'y a accès.' }
              ].map(({ title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Multi-store & CRM dashboard mock */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-[32px] p-5 sm:p-7 backdrop-blur-md">
            
            {/* Dashboard Mock Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Dashboard Compte Vendeur</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-sm font-black text-white">Karim e-Commerce</span>
                </div>
              </div>
              
              {/* Store Switcher Tab */}
              <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-850">
                <button
                  onClick={() => setSelectedDashboardStore('store1')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDashboardStore === 'store1' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Boutique Dattes
                </button>
                <button
                  onClick={() => setSelectedDashboardStore('store2')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDashboardStore === 'store2' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Boutique Tissage
                </button>
              </div>
            </div>

            {/* Dashboard metrics preview */}
            <div className="grid grid-cols-3 gap-3.5 mb-6">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Chiffre d&apos;Affaires</span>
                <span className="text-base sm:text-lg font-black text-white mt-1 block">
                  {selectedDashboardStore === 'store1' ? '450 000 DA' : '230 000 DA'}
                </span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Colis Expédiés</span>
                <span className="text-base sm:text-lg font-black text-white mt-1 block">
                  {selectedDashboardStore === 'store1' ? '92 exp' : '48 exp'}
                </span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Livraisons Réussies</span>
                <span className="text-base sm:text-lg font-black text-emerald-400 mt-1 block">
                  {selectedDashboardStore === 'store1' ? '94.2 %' : '91.5 %'}
                </span>
              </div>
            </div>

            {/* Customer Consolidation list mockup */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aperçu Client Unique (CRM)</span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-bold">Consolidé</span>
              </div>

              <div className="space-y-2.5">
                {[
                  { name: 'Mohamed Lakhdar', wilaya: 'Alger (16)', orders: 4, revenue: '18,500 DA', tag: 'Client Fidèle', tagColor: 'bg-emerald-500/10 text-emerald-400' },
                  { name: 'Amine B.', wilaya: 'Oran (31)', orders: 3, revenue: '12,200 DA', tag: 'Livraison Auto', tagColor: 'bg-indigo-500/10 text-indigo-400' },
                  { name: 'Yacine K.', wilaya: 'Constantine (25)', orders: 1, revenue: '4,500 DA', tag: 'Nouveau', tagColor: 'bg-slate-500/10 text-slate-400' }
                ].map((c) => (
                  <div key={c.name} className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-white">{c.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Wilaya: {c.wilaya}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white">{c.revenue}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{c.orders} commandes</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${c.tagColor}`}>{c.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── ALGERIAN SHIPPING DIRECT INTEGRATIONS ─────────────────────────── */}
      <section id="apis" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-900/60">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-400 mb-4">
            <Truck className="w-4 h-4" /> Logistique Connectée
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Envoyez vos commandes par API en 1-clic</h2>
          <p className="text-slate-450 max-w-2xl mx-auto mt-3">StoreDz s&apos;interface directement avec les leaders de la livraison en Algérie pour automatiser vos expéditions.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { name: 'Yalidine Express', badge: 'Auto-Sync', logo: '📦', delay: '24h - 48h', desc: 'Impression en masse de bordereaux et suivi direct de livraison.' },
            { name: 'Maystro Delivery', badge: 'Auto-Sync', logo: '🚚', delay: '24h - 48h', desc: 'Gestion des livraisons avec retour gratuit de l\'information client.' },
            { name: 'Procolis Express', badge: 'Intégré', logo: '🛵', delay: '48h', desc: 'Envoi direct des bordereaux d\'expédition en 1 clic.' },
            { name: 'ZR Express', badge: 'Intégré', logo: '🚛', delay: '24h', desc: 'Planification automatique des ramassages de colis.' },
            { name: 'Colivraison', badge: 'Intégré', logo: '📦', delay: '48h', desc: 'Suivi de livraison direct synchronisé dans votre CRM.' }
          ].map((api) => (
            <div key={api.name} className="bg-slate-900/30 border border-slate-900 hover:border-slate-800 p-5 rounded-2xl flex flex-col justify-between transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-3xl">{api.logo}</div>
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                    {api.badge}
                  </span>
                </div>
                <h4 className="font-extrabold text-white text-sm leading-tight">{api.name}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Délai moyen: {api.delay}</p>
                <p className="text-xs text-slate-450 mt-3 leading-normal">{api.desc}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-900 flex items-center justify-between text-[10px] font-black text-indigo-400">
                <span>Connecter mes accès API</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── INTERACTIVE WHATSAPP DEMO SIMULATOR ─────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-900/60">
        <div className="grid md:grid-cols-[45%_55%] gap-12 items-center">
          
          <div className="space-y-5 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold text-green-400">
              {WA_SVG} WhatsApp Commande
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              Laissez vos acheteurs commander sur WhatsApp
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Pas de formulaire long à remplir. Le panier génère un récapitulatif propre et lance directement WhatsApp avec le message prêt à envoyer vers votre numéro.
            </p>

            {/* Sim step controllers */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
              {[
                { step: 1, label: '1. Choix du produit' },
                { step: 2, label: '2. Clic Bouton' },
                { step: 3, label: '3. Envoi sur WhatsApp' }
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => setSimStep(s.step)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${simStep === s.step ? 'bg-green-600 border-green-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-750 text-slate-400'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Simulator Visualizer Panel */}
          <div className="bg-[#050c14] border border-slate-900 rounded-[32px] p-6 min-h-[350px] flex flex-col justify-between shadow-2xl relative">
            <div className="absolute top-4 right-4 text-[10px] text-slate-500 font-bold">SIMULATEUR DE FLUX</div>

            {simStep === 1 && (
              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-6 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl">👗</div>
                <div>
                  <h3 className="font-bold text-white text-base">Le client choisit son produit</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">Le client navigue sur votre boutique mobile et clique sur le produit de son choix.</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-xs flex items-center justify-between w-64">
                  <span className="font-bold text-white">Robe Kabyle tradition</span>
                  <span className="font-black text-indigo-400">4,500 DA</span>
                </div>
              </div>
            )}

            {simStep === 2 && (
              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-6 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-3xl">📱</div>
                <div>
                  <h3 className="font-bold text-white text-base">Clic sur commander</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">Sans formulaire compliqué, il clique sur le bouton WhatsApp pour valider.</p>
                </div>
                <button className="w-64 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-green-600/10">
                  {WA_SVG} Commander via WhatsApp
                </button>
              </div>
            )}

            {simStep === 3 && (
              <div className="flex-1 flex flex-col justify-between pt-4 animate-fade-in">
                <div className="bg-[#075e54] rounded-t-2xl px-4 py-2.5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm">🛍️</div>
                  <div>
                    <p className="text-white font-bold text-xs">Boutique El Djazaïr</p>
                    <p className="text-white/60 text-[9px]">En ligne</p>
                  </div>
                </div>
                
                {/* Whatsapp chat message bubble */}
                <div className="bg-[#e5ddd5] p-4 flex-1 flex items-center justify-center min-h-[160px]">
                  <div className="bg-white rounded-xl p-3 shadow-md max-w-[90%] text-[10px] leading-relaxed text-slate-800 font-mono">
                    <p className="font-bold text-green-700">🛍️ *COMMANDE — Boutique El Djazaïr*</p>
                    <p className="text-slate-350">━━━━━━━━━━━━━━━━━━</p>
                    <p>📦 *Produit:* Robe Kabyle tradition</p>
                    <p>🔢 *Quantité:* 1</p>
                    <p>💰 *Total:* 4,500 DA</p>
                    <p className="text-slate-350">━━━━━━━━━━━━━━━━━━</p>
                    <p>💵 Paiement à la livraison (COD)</p>
                    <p className="text-slate-405 text-right mt-1">12:35 ✓✓</p>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-b-2xl flex items-center gap-2 border-t border-slate-800/40">
                  <input
                    disabled
                    type="text"
                    placeholder="Message WhatsApp prêt à envoyer..."
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-[10px] text-slate-450 focus:outline-none"
                  />
                  <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xs cursor-pointer">
                    ➤
                  </div>
                </div>
              </div>
            )}

            {/* Sim controls footer */}
            <div className="border-t border-slate-900/80 pt-4 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">Étape {simStep} sur 3</span>
              <button
                onClick={() => setSimStep((prev) => (prev < 3 ? prev + 1 : 1))}
                className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                {simStep === 3 ? 'Recommencer' : 'Suivant'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ── PRICING SECTION ────────────────────────────────────────────────── */}
      <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-900/60">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-white">Des tarifs simples pour tous</h2>
          <p className="text-slate-450 mt-2 max-w-2xl mx-auto">10 jours d&apos;essai gratuits. Pas d&apos;engagement. Pas de carte bancaire.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-stretch mb-10">
          {/* Starter Plan */}
          <div className="bg-slate-900/30 border border-slate-900 hover:border-slate-850 p-7 rounded-[24px] flex flex-col justify-between backdrop-blur-sm transition-all duration-300">
            <div>
              <p className="text-xs text-slate-500 font-extrabold uppercase tracking-wider mb-2">Starter</p>
              <div className="flex items-baseline gap-1 text-white">
                <span className="text-4xl font-black">2,000</span>
                <span className="text-xl font-bold">DA / mois</span>
              </div>
              <span className="inline-block mt-3 text-[10px] font-black px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                ✓ 10 jours d&apos;essai gratuit
              </span>
              <ul className="space-y-3 text-xs text-slate-400 mt-6">
                {['Jusqu\'à 10 produits', 'Lien ecom-dz.net/store/votre-nom', 'Commandes WhatsApp', 'Gestion des commandes standard', 'Variantes de tailles & couleurs'].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
            <Link
              href="/become-seller"
              className="w-full text-center bg-slate-900 hover:bg-slate-850 text-white font-bold py-3.5 rounded-xl text-xs border border-slate-800 transition-colors mt-8"
            >
              Essayer gratuitement
            </Link>
          </div>

          {/* Pro Plan (Best) */}
          <div className="bg-slate-900 border-2 border-indigo-500 p-7 rounded-[24px] flex flex-col justify-between relative shadow-2xl shadow-indigo-600/10 transition-all duration-300">
            <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              Le plus populaire
            </div>
            <div>
              <p className="text-xs text-indigo-400 font-extrabold uppercase tracking-wider mb-2">Pro</p>
              <div className="flex items-baseline gap-1 text-white">
                <span className="text-4xl font-black">4,000</span>
                <span className="text-xl font-bold">DA / mois</span>
              </div>
              <span className="inline-block mt-3 text-[10px] font-black px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                ✓ 10 jours d&apos;essai gratuit
              </span>
              <ul className="space-y-3 text-xs text-slate-350 mt-6">
                {['Produits illimités', 'Analytics avancés (ventes, wilayas, paniers)', 'Intégration APIs livraison (Yalidine, Maystro, ZR)', 'Codes promo & ventes flash', 'Pixels Meta, TikTok & Google Analytics', 'Support WhatsApp prioritaires'].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
            <Link
              href="/become-seller"
              className="w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition-all mt-8"
            >
              Essayer gratuitement
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-slate-900/30 border border-slate-900 hover:border-slate-850 p-7 rounded-[24px] flex flex-col justify-between backdrop-blur-sm transition-all duration-350">
            <div>
              <p className="text-xs text-slate-500 font-extrabold uppercase tracking-wider mb-2">Business</p>
              <div className="flex items-baseline gap-1 text-white">
                <span className="text-4xl font-black">6,000</span>
                <span className="text-xl font-bold">DA / mois</span>
              </div>
              <span className="inline-block mt-3 text-[10px] font-black px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/15">
                ✓ 10 jours d&apos;essai gratuit
              </span>
              <ul className="space-y-3 text-xs text-slate-400 mt-6">
                {['Gérez jusqu\'à 3 boutiques', 'Tout le plan Pro inclus', 'Retrait complet du logo StoreDz', 'Fiches clients CRM avancées & export', 'Badge Boutique vérifiée algérienne', 'Manager de compte dédié + support 24/7'].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
            <Link
              href="/become-seller"
              className="w-full text-center bg-slate-900 hover:bg-slate-850 text-white font-bold py-3.5 rounded-xl text-xs border border-slate-800 transition-colors mt-8"
            >
              Essayer gratuitement
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION SECTION ──────────────────────────────────────────── */}
      <section className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-900/60">
        <h2 className="text-3xl font-black text-white text-center mb-10">Foire aux questions</h2>
        <div className="space-y-3">
          {[
            {
              q: 'Comment les clients commandent-ils sur ma boutique ?',
              a: 'Le client visite votre boutique, choisit un produit, et clique sur le bouton WhatsApp. Une discussion s\'ouvre directement sur votre numéro avec un message automatique pré-rempli (nom, produit, quantité, total). Vous n\'avez qu\'à valider avec lui.'
            },
            {
              q: 'Puis-je utiliser mon propre service de livraison ?',
              a: 'Oui. StoreDz intègre directement les APIs de Yalidine Express, Maystro, ZR Express et Procolis. Vous pouvez connecter vos comptes de transporteurs pour générer vos fiches d\'expédition automatiquement.'
            },
            {
              q: 'Comment se passe la gestion de plusieurs boutiques ?',
              a: 'Le plan Business vous permet de créer et administrer jusqu\'à 3 boutiques distinctes sous un seul tableau de bord de gestion. Vos clients et historiques de ventes y sont consolidés pour vous offrir une vue d\'ensemble de votre e-commerce.'
            },
            {
              q: 'Prenez-vous des commissions sur mes ventes ?',
              a: 'No. StoreDz ne prélève aucune commission sur vos transactions. Vous payez un abonnement fixe mensuel et conservez 100% de vos bénéfices.'
            }
          ].map((faq, idx) => (
            <div key={idx} className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-5 flex items-center justify-between font-bold text-white text-sm focus:outline-none hover:bg-slate-900/20"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 pt-1 text-slate-450 text-xs leading-relaxed border-t border-slate-900/40 animate-fade-in">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL DYNAMIC CTA ──────────────────────────────────────────────── */}
      <section className="relative z-10 bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-center py-20 px-4 border-t border-slate-900/80">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
        <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">Prêt à propulser votre commerce ?</h2>
        <p className="text-slate-350 max-w-xl mx-auto text-sm sm:text-base mb-8">Rejoignez les meilleurs vendeurs algériens et ouvrez votre boutique en ligne aujourd&apos;hui.</p>
        <Link
          href="/become-seller"
          className="inline-flex items-center justify-center gap-2 bg-white text-indigo-950 font-black px-10 py-4.5 rounded-2xl hover:bg-slate-100 transition-all shadow-2xl hover:scale-[1.03] active:scale-[0.97]"
        >
          <Store className="w-5 h-5 text-indigo-950" /> Créer ma boutique gratuitement
          <ArrowRight className="w-5 h-5 text-indigo-950" />
        </Link>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 bg-slate-950 border-t border-slate-900 py-12 text-center text-xs text-slate-600">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-extrabold text-white text-sm">StoreDz</span>
          </div>
          <p>© {new Date().getFullYear()} StoreDz. Plateforme E-commerce optimisée pour l&apos;Algérie.</p>
          <div className="flex gap-4">
            <a href="/terms" className="hover:text-slate-400 transition-colors">CGU</a>
            <a href="/privacy" className="hover:text-slate-400 transition-colors">Confidentialité</a>
          </div>
        </div>
      </footer>

    </main>
  )
}
