import Link from 'next/link'
import {
  Store, ArrowRight, Check, Smartphone, Globe, ShoppingCart,
  Zap, MessageCircle, BarChart3, Package, Users, Star,
  TrendingUp, CreditCard,
} from 'lucide-react'

export const metadata = {
  title: 'StoreDz — Créez votre boutique en ligne en Algérie',
  description:
    'Lancez votre boutique en ligne en quelques minutes. Lien personnalisé, WhatsApp intégré, paiement à la livraison. 100% gratuit pour démarrer.',
}

const WA_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

const FEATURES = [
  {
    icon: <Globe className="w-6 h-6" />,
    title: 'Votre boutique, votre lien',
    desc: 'Chaque vendeur obtient une URL unique : ecom-dz.net/store/votre-nom. Partagez-la sur WhatsApp, Instagram, TikTok.',
  },
  {
    icon: WA_SVG,
    title: 'Commandes WhatsApp intégrées',
    desc: 'Vos clients commandent en un clic directement via WhatsApp avec un message pré-rempli — nom, produit, quantité, total.',
  },
  {
    icon: <ShoppingCart className="w-6 h-6" />,
    title: 'Catalogue de produits illimité',
    desc: 'Ajoutez autant de produits que vous voulez — photos, descriptions, prix barrés, gestion de stock inclus.',
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: '100% mobile-first',
    desc: 'Vos clients commandent depuis leur téléphone. Votre boutique est parfaitement optimisée pour mobile.',
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: 'Paiement à la livraison + en ligne',
    desc: 'Cash on Delivery vers 58 wilayas. Paiement CIB, Edahabia et BaridiMob disponibles sur les plans payants.',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Analytics vendeur inclus',
    desc: 'Suivez vos ventes, votre chiffre d\'affaires, vos meilleurs produits et l\'activité de vos clients.',
  },
]

const STEPS = [
  {
    step: '1',
    icon: '📝',
    title: 'Créez votre compte',
    desc: 'Inscrivez-vous gratuitement en 2 minutes. Choisissez le nom de votre boutique et votre lien personnalisé.',
  },
  {
    step: '2',
    icon: '📦',
    title: 'Ajoutez vos produits',
    desc: 'Uploadez vos photos, fixez vos prix, définissez votre stock. Votre boutique est prête en quelques clics.',
  },
  {
    step: '3',
    icon: '🚀',
    title: 'Partagez & vendez',
    desc: 'Envoyez votre lien sur WhatsApp, Instagram, ou TikTok. Vos clients commandent, vous livrez, vous encaissez.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Meriem B.',
    location: 'Alger',
    category: 'Mode & vêtements',
    avatar: 'M',
    avatarColor: 'bg-pink-100 text-pink-600',
    stars: 5,
    text: "J'ai ouvert ma boutique en 20 minutes. Aujourd'hui je reçois des commandes tous les jours depuis mon Instagram. StoreDz m'a évité d'investir dans un site web.",
    revenue: '+45 commandes / mois',
  },
  {
    name: 'Karim D.',
    location: 'Oran',
    category: 'Électronique & accessoires',
    avatar: 'K',
    avatarColor: 'bg-blue-100 text-blue-600',
    stars: 5,
    text: "Le tableau de bord est simple à comprendre. Je vois mes meilleures ventes, mes stocks critiques et mes revenus en un coup d'œil. Exactement ce qu'il me fallait.",
    revenue: '+120 commandes / mois',
  },
  {
    name: 'Nassima R.',
    location: 'Constantine',
    category: 'Produits bio & naturels',
    avatar: 'N',
    avatarColor: 'bg-green-100 text-green-600',
    stars: 5,
    text: "Ce que j'adore c'est que mes clientes voient UNIQUEMENT ma boutique. Pas de concurrents qui apparaissent à côté de mes produits. C'est ma boutique, rien que ma boutique.",
    revenue: '+80 commandes / mois',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }}
        />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-2 rounded-full text-sm font-semibold mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            Plateforme e-commerce algérienne · 🇩🇿
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6 tracking-tight">
            Créez votre boutique<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-300">
              en ligne en 5 minutes
            </span>
          </h1>

          <p className="text-white/60 text-base sm:text-xl mb-10 leading-relaxed max-w-2xl mx-auto">
            Votre boutique. Votre lien. Vos clients.<br />
            Vendez partout en Algérie avec WhatsApp et paiement à la livraison.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/become-seller"
              className="inline-flex items-center justify-center gap-2 bg-white text-indigo-900 font-black px-8 py-4 rounded-2xl hover:bg-indigo-50 transition-colors text-base shadow-2xl shadow-black/30"
            >
              <Store className="w-5 h-5" />
              Créer ma boutique gratuite
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/seller/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors text-base border border-white/20"
            >
              Déjà vendeur ? Se connecter
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-12 text-white/50 text-sm">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> 200+ boutiques actives</span>
            <span className="flex items-center gap-1.5"><Package className="w-4 h-4" /> 10 000+ produits</span>
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> 0% commission</span>
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              4.9/5 · 150+ avis vendeurs
            </span>
          </div>
        </div>
      </section>

      {/* ══ DEMO LINK PREVIEW ══════════════════════════════════════ */}
      <div className="bg-indigo-50 border-y border-indigo-100">
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200">
            <Globe className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-1">Votre lien de boutique</p>
            <p className="text-indigo-900 font-black text-lg sm:text-xl font-mono">
              ecom-dz.net/store/<span className="text-indigo-500">votre-nom</span>
            </p>
            <p className="text-gray-500 text-sm mt-1">Vos clients voient uniquement votre boutique — aucun concurrent à côté</p>
          </div>
          <Link
            href="/become-seller"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
          >
            Réserver mon lien <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">Lancez-vous en 3 étapes</h2>
          <p className="text-gray-500">Pas besoin de coder. Pas besoin d&apos;hébergement. Pas besoin de carte bancaire.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {STEPS.map(({ step, icon, title, desc }) => (
            <div key={step} className="relative bg-white rounded-2xl p-7 shadow-sm border border-gray-100 text-center">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200">
                <span className="text-white text-xs font-black">{step}</span>
              </div>
              <div className="text-5xl mb-5 mt-3">{icon}</div>
              <h3 className="font-black text-gray-900 mb-2 text-lg">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ TESTIMONIALS ═══════════════════════════════════════════ */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">Ce que disent nos vendeurs</h2>
            <p className="text-gray-500">Des entrepreneurs algériens qui ont lancé leur boutique sur StoreDz</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0 ${t.avatarColor}`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.location} · {t.category}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed flex-1 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600">{t.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ═══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">Tout ce dont vous avez besoin</h2>
          <p className="text-gray-500">Une boutique professionnelle sans la complexité technique</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                {icon}
              </div>
              <h3 className="font-black text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ WHATSAPP DEMO ══════════════════════════════════════════ */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold mb-5">
                {WA_SVG} WhatsApp Commerce
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4 leading-tight">
                Vos clients commandent<br />directement sur WhatsApp
              </h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Un clic sur &ldquo;Commander via WhatsApp&rdquo; ouvre une conversation avec un message pré-rempli
                contenant tous les détails de la commande — le client n&apos;a qu&apos;à envoyer.
              </p>
              <ul className="space-y-3">
                {[
                  'Message automatique avec produit + quantité + total',
                  'Confirmation de livraison Cash on Delivery',
                  'Votre numéro WhatsApp personnel, aucun intermédiaire',
                  'Fonctionne sans compte bancaire ni terminal de paiement',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* WhatsApp message mock */}
            <div className="bg-[#0a1929] rounded-3xl p-6 shadow-2xl">
              <div className="bg-[#075e54] rounded-t-2xl px-4 py-3 flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">🛍️</div>
                <div>
                  <p className="text-white font-bold text-sm">Boutique Ahmed</p>
                  <p className="text-white/60 text-xs">En ligne</p>
                </div>
              </div>
              <div className="bg-[#e5ddd5] rounded-b-2xl p-4 min-h-[200px] space-y-3">
                <div className="bg-white rounded-xl p-3 shadow-sm max-w-[85%] text-xs leading-relaxed text-gray-800 font-mono">
                  <p>🛍️ *COMMANDE — Boutique Ahmed*</p>
                  <p>━━━━━━━━━━━━━━━━━━</p>
                  <p>📦 *Produit:* Robe Kabyle XL</p>
                  <p>🔢 *Quantité:* 1</p>
                  <p>💰 *Total:* 4 500 DA</p>
                  <p>━━━━━━━━━━━━━━━━━━</p>
                  <p>💵 Paiement à la livraison</p>
                  <p className="text-gray-500 text-right mt-2">12:34 ✓✓</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS BAR ══════════════════════════════════════════════ */}
      <div className="bg-indigo-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: '200+', label: 'Boutiques actives' },
              { value: '58',   label: 'Wilayas couvertes' },
              { value: '0%',   label: 'Commission StoreDz' },
              { value: '4.9★', label: 'Note moyenne vendeurs' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl sm:text-4xl font-black">{value}</p>
                <p className="text-indigo-200 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ PRICING TEASER ═════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">Des tarifs simples</h2>
          <p className="text-gray-500">10 jours d&apos;essai gratuit sur tous les plans. Sans carte bancaire.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 mb-8">
          {/* Démarrage */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-7">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Démarrage</p>
            <p className="text-4xl font-black text-gray-900 mb-1">2 000 <span className="text-2xl font-semibold text-gray-400">DA</span></p>
            <p className="text-sm text-gray-400 mb-1">/ mois</p>
            <span className="inline-block mb-4 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">✓ 10 jours d&apos;essai gratuit</span>
            <ul className="space-y-2.5 text-sm text-gray-600">
              {["Jusqu'à 10 produits", 'Boutique + URL personnalisée', 'Commandes WhatsApp', 'Gestion commandes & statuts', 'Variantes couleur & taille'].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />{f}</li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="bg-indigo-600 rounded-2xl border-2 border-indigo-600 p-7 text-white relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-black px-2.5 py-1 rounded-full">Le plus populaire</div>
            <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-3">Pro</p>
            <p className="text-4xl font-black mb-1">4 000 <span className="text-2xl font-semibold text-indigo-200">DA</span></p>
            <p className="text-sm text-indigo-200 mb-1">/ mois</p>
            <span className="inline-block mb-4 text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">✓ 10 jours d&apos;essai gratuit</span>
            <ul className="space-y-2.5 text-sm text-indigo-100">
              {['Produits illimités', 'Analytics avancés (ventes, géo, entonnoir)', 'API livraison (Yalidine, Maystro, ZR…)', 'Codes promo & ventes flash', 'Pixels Meta, TikTok, Google Analytics', 'Support 7j/7 WhatsApp'].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-white flex-shrink-0" />{f}</li>
              ))}
            </ul>
          </div>

          {/* Business */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl border-2 border-amber-400 p-7 text-white">
            <p className="text-xs font-bold text-amber-100 uppercase tracking-wider mb-3">Business</p>
            <p className="text-4xl font-black mb-1">6 000 <span className="text-2xl font-semibold text-amber-100">DA</span></p>
            <p className="text-sm text-amber-100 mb-1">/ mois</p>
            <span className="inline-block mb-4 text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">✓ 10 jours d&apos;essai gratuit</span>
            <ul className="space-y-2.5 text-sm text-amber-50">
              {["Jusqu'à 3 boutiques", 'Tout le plan Pro inclus', 'Suppression du branding StoreDz', 'Facture fiscale B2B (NIF, NIS, RC)', 'Badge vendeur vérifié', 'Manager dédié + support 24/7'].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-white flex-shrink-0" />{f}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
          >
            Voir tous les plans et comparer <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-12 text-white text-center shadow-2xl">
          <div className="text-5xl mb-5">🎁</div>
          <h2 className="text-2xl sm:text-3xl font-black mb-3">10 jours d&apos;essai gratuit</h2>
          <p className="text-white/60 mb-8 text-base sm:text-lg max-w-xl mx-auto">
            Testez votre boutique pendant 10 jours — sans engagement, sans carte bancaire. Payez seulement si vous aimez.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-10 text-left">
            {[
              { icon: '✅', text: 'Boutique en ligne personnalisée' },
              { icon: '✅', text: 'Produits illimités' },
              { icon: '✅', text: 'Commandes WhatsApp' },
              { icon: '✅', text: 'Dashboard de gestion' },
              { icon: '✅', text: 'Zéro commission' },
              { icon: '✅', text: 'Support inclus' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-white/80">
                <span>{icon}</span> {text}
              </div>
            ))}
          </div>

          <Link
            href="/become-seller"
            className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-black px-10 py-4 rounded-2xl hover:bg-gray-100 transition-colors text-base shadow-lg"
          >
            <Store className="w-5 h-5" />
            Créer ma boutique maintenant
            <ArrowRight className="w-5 h-5" />
          </Link>

          <p className="text-white/35 text-xs mt-5">
            Pas de carte bancaire requise · Zéro commission · Annulation possible à tout moment
          </p>
        </div>
      </section>

      {/* ══ FAQ ════════════════════════════════════════════════════ */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">Questions fréquentes</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Est-ce que mes clients peuvent voir les boutiques des autres vendeurs ?',
                a: 'Non. Chaque boutique est 100% isolée. Quand un client entre sur votre lien /store/votre-nom, il voit uniquement vos produits.',
              },
              {
                q: 'Comment mes clients commandent-ils ?',
                a: 'Ils cliquent sur un produit dans votre boutique et une conversation WhatsApp s\'ouvre avec un message pré-rempli. Vous confirmez la commande directement avec eux.',
              },
              {
                q: 'Comment se passe la livraison ?',
                a: 'Vous gérez la livraison vous-même ou via un transporteur de votre choix (Yalidine, Zaki, etc.). Le client paie cash à la réception.',
              },
              {
                q: 'Y a-t-il des frais ou commissions ?',
                a: 'StoreDz ne prend aucune commission sur vos ventes. Vous gardez 100% de vos revenus. Seul l\'abonnement mensuel est facturé (plan gratuit disponible).',
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">{q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/pricing" className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:text-indigo-800">
              <MessageCircle className="w-4 h-4" /> D&apos;autres questions ? Voir les tarifs complets
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ══════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-indigo-600 to-violet-700 py-16 px-4 text-center text-white">
        <h2 className="text-2xl sm:text-3xl font-black mb-3">Prêt à lancer votre boutique ?</h2>
        <p className="text-white/65 mb-8 text-base">Rejoignez les 200+ vendeurs qui utilisent StoreDz</p>
        <Link
          href="/become-seller"
          className="inline-flex items-center justify-center gap-2 bg-white text-indigo-800 font-black px-10 py-4 rounded-2xl hover:bg-indigo-50 transition-colors text-base shadow-xl"
        >
          <Store className="w-5 h-5" /> Créer ma boutique
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

    </main>
  )
}
