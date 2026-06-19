import Link from 'next/link'
import { Check, X, Zap, Star, Crown, ArrowRight, MessageCircle, Shield } from 'lucide-react'

export const metadata = {
  title: 'Tarifs — StoreDz',
  description: 'Plans simples et transparents. Lancez votre boutique, évoluez quand vous voulez.',
}

const PLANS = [
  {
    id: 'starter',
    name: 'Démarrage',
    icon: Zap,
    price: 2000,
    period: '/ mois',
    color: 'border-gray-200',
    headerColor: 'bg-gray-50',
    badgeColor: 'bg-gray-100 text-gray-700',
    ctaColor: 'bg-gray-900 hover:bg-gray-800 text-white',
    cta: 'Essayer 10 jours gratuit',
    ctaHref: '/become-seller',
    highlight: false,
    trial: true,
    features: [
      { text: '1 boutique · jusqu\'à 10 produits', included: true },
      { text: 'Boutique en ligne avec URL personnalisée', included: true },
      { text: 'Commandes WhatsApp intégrées', included: true },
      { text: 'Paiement à la livraison (58 wilayas)', included: true },
      { text: 'Gestion des commandes (statuts, annulation)', included: true },
      { text: 'Dashboard de base (KPIs du jour)', included: true },
      { text: 'Variantes couleur & taille', included: true },
      { text: 'Support communautaire', included: true },
      { text: 'Produits illimités', included: false },
      { text: 'Analytics avancés', included: false },
      { text: 'API livraison intégrée (9 transporteurs)', included: false },
      { text: 'Codes promo & ventes flash', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Star,
    price: 4000,
    period: '/ mois',
    color: 'border-indigo-500 ring-2 ring-indigo-500/20',
    headerColor: 'bg-indigo-600',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    ctaColor: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200',
    cta: 'Essayer 10 jours gratuit',
    ctaHref: '/become-seller',
    highlight: true,
    badge: 'Le plus populaire',
    trial: true,
    features: [
      { text: '1 boutique · produits illimités', included: true },
      { text: 'Boutique en ligne avec URL personnalisée', included: true },
      { text: 'Commandes WhatsApp intégrées', included: true },
      { text: 'Paiement à la livraison (58 wilayas)', included: true },
      { text: 'Analytics avancés (ventes, clients, géo, entonnoir)', included: true },
      { text: 'API livraison intégrée (Yalidine, Maystro, ZR, Rex…)', included: true },
      { text: 'Codes promo & ventes flash', included: true },
      { text: 'Import CSV produits en masse', included: true },
      { text: 'Pixels marketing (Meta, TikTok, Google Analytics)', included: true },
      { text: 'Gestion des retours & remboursements', included: true },
      { text: 'Support 7j/7 WhatsApp', included: true },
      { text: 'Suppression du branding StoreDz', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    icon: Crown,
    price: 6000,
    period: '/ mois',
    color: 'border-amber-300',
    headerColor: 'bg-gradient-to-br from-amber-500 to-orange-500',
    badgeColor: 'bg-amber-100 text-amber-700',
    ctaColor: 'bg-amber-500 hover:bg-amber-600 text-white',
    cta: 'Essayer 10 jours gratuit',
    ctaHref: '/become-seller',
    highlight: false,
    trial: true,
    features: [
      { text: 'Jusqu\'à 3 boutiques · produits illimités', included: true },
      { text: 'Tout le plan Pro inclus', included: true },
      { text: 'Suppression du branding StoreDz', included: true },
      { text: 'Facture fiscale B2B (NIF, NIS, RC)', included: true },
      { text: 'Pre-order & quantité minimum (MOQ)', included: true },
      { text: 'Mode vacances avec message personnalisé', included: true },
      { text: 'Export CSV analytics & revenus', included: true },
      { text: 'Badge vendeur vérifié ✓', included: true },
      { text: 'Compte manager dédié', included: true },
      { text: 'Support prioritaire 24/7', included: true },
      { text: 'Pixels marketing avancés (Meta, TikTok, GA4)', included: true },
    ],
  },
]

const FAQ = [
  {
    q: 'Est-ce que je peux changer de plan plus tard ?',
    a: 'Oui, à tout moment. Si vous montez en plan, le changement est immédiat. Si vous descendez, il prend effet à la prochaine date de renouvellement.',
  },
  {
    q: "Comment se passe le paiement de l'abonnement ?",
    a: "Vous payez par virement BaridiMob ou CCP. Pas de carte bancaire requise. Notre équipe valide votre paiement sous 24h et active votre plan.",
  },
  {
    q: "Y a-t-il une commission sur mes ventes ?",
    a: "Non. StoreDz ne prend aucune commission sur vos ventes. Vous gardez 100% de ce que vous vendez. Votre seul coût est l'abonnement mensuel.",
  },
  {
    q: "Que se passe-t-il à la fin de la période d'essai ?",
    a: "Après 14 jours, votre boutique passe automatiquement sur le plan Gratuit. Vos produits restent en ligne (les 10 premiers). Vous pouvez upgrader à tout moment.",
  },
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui, sans frais ni pénalité. Vous continuez à bénéficier de votre plan jusqu'à la fin de la période payée.",
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Header */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16 sm:py-20 text-center px-4">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
          <Shield className="w-4 h-4" /> Sans commission sur vos ventes
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 mb-4">
          Des tarifs simples &amp; transparents
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-8">
          Commencez gratuitement. Passez au Pro quand votre boutique décolle.
          Aucune surprise, aucune commission cachée.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Paiement BaridiMob ou CCP · Pas de carte bancaire requise
        </div>
      </section>

      {/* Plans grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border-2 overflow-hidden shadow-sm ${plan.color} ${plan.highlight ? 'md:-mt-4 md:mb-4' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-indigo-600 text-white text-xs font-black px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className={`px-7 pt-8 pb-6 ${plan.headerColor} ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${plan.highlight ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                    <Icon className={`w-5 h-5 ${plan.highlight ? 'text-white' : 'text-indigo-600'}`} />
                  </div>
                  <p className={`font-black text-lg mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</p>
                  <div className="flex items-end gap-1">
                    <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price.toLocaleString('fr')}
                    </span>
                    <span className={`text-base font-semibold mb-1 ${plan.highlight ? 'text-white/70' : 'text-gray-500'}`}> DA{plan.period}</span>
                  </div>
                  <p className={`text-sm mt-1 ${plan.highlight ? 'text-white/70' : 'text-gray-400'}`}>Facturation mensuelle</p>
                  {'trial' in plan && (
                    <span className={`inline-block mt-2 text-xs font-bold px-2.5 py-1 rounded-full ${plan.highlight ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                      ✓ 10 jours d&apos;essai gratuit
                    </span>
                  )}
                </div>

                {/* Features */}
                <div className="px-7 py-6">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-start gap-3">
                        {f.included ? (
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-4 h-4 text-gray-200 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${f.included ? 'text-gray-700' : 'text-gray-300'}`}>{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.ctaHref}
                    className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl transition-colors text-sm ${plan.ctaColor}`}
                  >
                    {plan.cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Comparison note */}
      <section className="bg-indigo-50 py-10 px-4 text-center">
        <p className="text-gray-600 text-sm max-w-2xl mx-auto">
          <strong className="text-gray-900">Tous les plans incluent :</strong> hébergement inclus, SSL gratuit, sous-domaine ecom-dz.net/store/votre-nom,
          mises à jour automatiques, sauvegarde quotidienne des données, et conformité RGPD.
        </p>
      </section>

      {/* Trust signals */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 className="text-2xl font-black text-gray-900 text-center mb-10">Pourquoi choisir StoreDz ?</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: '🇩🇿',
              title: '100% algérien',
              desc: 'Conçu pour le marché algérien. COD vers 58 wilayas, paiement BaridiMob, support en darija et en français.',
            },
            {
              icon: '0%',
              title: 'Zéro commission',
              desc: 'Vous gardez 100% de vos ventes. StoreDz se rémunère uniquement sur l\'abonnement mensuel, pas sur vos revenus.',
            },
            {
              icon: '⚡',
              title: 'Prêt en 5 minutes',
              desc: 'Inscription, ajout de produits, partage du lien. Votre première vente peut arriver le jour même.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
              <div className="text-4xl mb-4">{icon}</div>
              <h3 className="font-black text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">Questions fréquentes</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">{q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-indigo-600 to-violet-700 py-16 px-4 text-center text-white">
        <h2 className="text-2xl sm:text-3xl font-black mb-3">Prêt à lancer votre boutique ?</h2>
        <p className="text-white/65 mb-8">Commencez gratuitement — aucune carte bancaire requise.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/become-seller"
            className="inline-flex items-center justify-center gap-2 bg-white text-indigo-800 font-black px-8 py-4 rounded-2xl hover:bg-indigo-50 transition-colors shadow-xl"
          >
            Créer ma boutique gratuite <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="https://wa.me/213779528330?text=Bonjour%2C+je+veux+en+savoir+plus+sur+StoreDz"
            className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors border border-white/20"
          >
            <MessageCircle className="w-5 h-5" /> Parler à l&apos;équipe
          </a>
        </div>
      </section>

    </main>
  )
}
