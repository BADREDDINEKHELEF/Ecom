'use client'

import { useState } from 'react'
import {
  GraduationCap, Play, CheckCircle, Lock, Clock, ChevronRight,
  Star, Zap, Package, Tag, BarChart2, MessageSquare, Truck,
  TrendingUp, BookOpen, Award,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import SellerSidebar from '@/components/seller/SellerSidebar'

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Lesson {
  id:       string
  title:    string
  duration: string
  free:     boolean
  done?:    boolean
}

interface Module {
  id:       string
  title:    string
  icon:     React.ElementType
  color:    string
  bg:       string
  level:    'débutant' | 'intermédiaire' | 'avancé'
  desc:     string
  lessons:  Lesson[]
}

const MODULES: Module[] = [
  {
    id: 'start',
    title: 'Démarrer sur ShopDZ',
    icon: Package,
    color: 'text-emerald-600',
    bg:    'bg-emerald-50',
    level: 'débutant',
    desc:  'Configurez votre boutique et publiez votre premier produit en moins d\'une heure.',
    lessons: [
      { id: 's1', title: 'Créer et configurer votre boutique',          duration: '4 min',  free: true,  done: true },
      { id: 's2', title: 'Ajouter votre premier produit avec photos',    duration: '6 min',  free: true,  done: true },
      { id: 's3', title: 'Configurer les modes de livraison',            duration: '5 min',  free: true },
      { id: 's4', title: 'Partager votre boutique sur les réseaux',      duration: '3 min',  free: true },
      { id: 's5', title: 'Recevoir et traiter votre première commande',  duration: '7 min',  free: false },
    ],
  },
  {
    id: 'photos',
    title: 'Photos qui vendent',
    icon: Star,
    color: 'text-violet-600',
    bg:    'bg-violet-50',
    level: 'débutant',
    desc:  'Des photos professionnelles avec seulement votre smartphone pour multiplier vos conversions.',
    lessons: [
      { id: 'p1', title: 'La règle des 3 photos obligatoires',                     duration: '5 min',  free: true },
      { id: 'p2', title: 'Éclairage naturel vs lampe — comparatif',                duration: '8 min',  free: true },
      { id: 'p3', title: 'Angles et mises en scène pour les vêtements',            duration: '6 min',  free: false },
      { id: 'p4', title: 'Applications gratuites de retouche (Android & iPhone)',  duration: '4 min',  free: false },
      { id: 'p5', title: 'Vidéos courtes : +40% de conversion en moyenne',         duration: '7 min',  free: false },
    ],
  },
  {
    id: 'pricing',
    title: 'Fixer le bon prix',
    icon: Tag,
    color: 'text-amber-600',
    bg:    'bg-amber-50',
    level: 'intermédiaire',
    desc:  'Calculez vos coûts, trouvez le prix qui maximise profit et volume, et gérez les promotions.',
    lessons: [
      { id: 'pr1', title: 'Calculer votre prix de revient complet (frais inclus)',   duration: '6 min',  free: true },
      { id: 'pr2', title: 'Psychologie du prix en Algérie',                          duration: '5 min',  free: false },
      { id: 'pr3', title: 'Codes promo : quand les offrir sans perdre de marge',     duration: '7 min',  free: false },
      { id: 'pr4', title: 'Ventes flash : urgence et stock limité',                  duration: '5 min',  free: false },
      { id: 'pr5', title: 'Ajuster les prix selon la demande et la saison',          duration: '8 min',  free: false },
    ],
  },
  {
    id: 'orders',
    title: 'Gérer les commandes',
    icon: Truck,
    color: 'text-blue-600',
    bg:    'bg-blue-50',
    level: 'débutant',
    desc:  'Confirmez rapidement, expédiez sans erreur et réduisez vos retours au minimum.',
    lessons: [
      { id: 'o1', title: 'Confirmer une commande en moins de 2 minutes',   duration: '3 min',  free: true },
      { id: 'o2', title: 'Préparer et emballer correctement vos colis',    duration: '6 min',  free: true },
      { id: 'o3', title: 'Choisir le bon transporteur par wilaya',         duration: '5 min',  free: false },
      { id: 'o4', title: 'Réduire les retours : script de confirmation',   duration: '8 min',  free: false },
      { id: 'o5', title: 'Gérer les litiges et remboursements',            duration: '6 min',  free: false },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing & acquisition',
    icon: TrendingUp,
    color: 'text-rose-600',
    bg:    'bg-rose-50',
    level: 'intermédiaire',
    desc:  'Attirez vos premiers acheteurs via Facebook, Instagram et WhatsApp gratuitement.',
    lessons: [
      { id: 'm1', title: 'Stratégie de contenu gratuite pour débutants',            duration: '8 min',  free: true },
      { id: 'm2', title: 'Groupes Facebook : comment vendre sans se faire bannir',  duration: '6 min',  free: false },
      { id: 'm3', title: 'WhatsApp Business : catalogue et messages automatiques',  duration: '9 min',  free: false },
      { id: 'm4', title: 'Micro-influenceurs algériens : trouver et négocier',      duration: '7 min',  free: false },
      { id: 'm5', title: 'Premières publicités Facebook : budget 500 DA/jour',      duration: '12 min', free: false },
    ],
  },
  {
    id: 'analytics',
    title: 'Lire vos statistiques',
    icon: BarChart2,
    color: 'text-indigo-600',
    bg:    'bg-indigo-50',
    level: 'avancé',
    desc:  'Comprenez vos chiffres pour prendre de meilleures décisions et scaler votre activité.',
    lessons: [
      { id: 'a1', title: 'Les 4 métriques essentielles de votre boutique',  duration: '5 min',  free: true },
      { id: 'a2', title: 'Interpréter votre entonnoir de conversion',       duration: '7 min',  free: false },
      { id: 'a3', title: 'Taux de retour : causes et solutions',            duration: '8 min',  free: false },
      { id: 'a4', title: 'Identifier vos produits gagnants et perdants',    duration: '6 min',  free: false },
      { id: 'a5', title: 'Prévoir les pics saisonniers algériens',          duration: '9 min',  free: false },
    ],
  },
  {
    id: 'scale',
    title: 'Scaler votre activité',
    icon: Zap,
    color: 'text-orange-600',
    bg:    'bg-orange-50',
    level: 'avancé',
    desc:  'Automatisez, déléguez et développez votre business au-delà de votre capacité individuelle.',
    lessons: [
      { id: 'sc1', title: 'Quand embaucher votre premier employé',            duration: '6 min',  free: false },
      { id: 'sc2', title: 'Gestion des stocks pour volumes importants',       duration: '8 min',  free: false },
      { id: 'sc3', title: 'Travailler avec les fournisseurs en gros',         duration: '10 min', free: false },
      { id: 'sc4', title: 'Automatiser avec les outils gratuits',             duration: '7 min',  free: false },
      { id: 'sc5', title: 'Passer de 50 à 200 commandes par mois',           duration: '12 min', free: false },
    ],
  },
  {
    id: 'customer',
    title: 'Service client',
    icon: MessageSquare,
    color: 'text-cyan-600',
    bg:    'bg-cyan-50',
    level: 'intermédiaire',
    desc:  'Transformez chaque client en ambassadeur grâce à une expérience d\'achat mémorable.',
    lessons: [
      { id: 'c1', title: 'Les 5 messages WhatsApp qui fidélisent',              duration: '5 min',  free: true },
      { id: 'c2', title: 'Répondre aux avis négatifs sans perdre de clients',   duration: '6 min',  free: false },
      { id: 'c3', title: 'Créer un programme de fidélité simple',               duration: '7 min',  free: false },
      { id: 'c4', title: 'Relance panier abandonné par WhatsApp',               duration: '5 min',  free: false },
      { id: 'c5', title: 'Transformer un retour en achat suivant',              duration: '6 min',  free: false },
    ],
  },
]

const LEVEL_BADGE: Record<string, { label: string; color: string }> = {
  'débutant':       { label: 'Débutant',       color: 'bg-green-100 text-green-700' },
  'intermédiaire':  { label: 'Intermédiaire',   color: 'bg-blue-100 text-blue-700' },
  'avancé':         { label: 'Avancé',          color: 'bg-violet-100 text-violet-700' },
}

type FilterLevel = 'all' | 'débutant' | 'intermédiaire' | 'avancé'

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SellerAcademyPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all')
  const [openModule, setOpenModule]   = useState<string | null>('start')
  const [activeLesson, setActiveLesson] = useState<string | null>(null)

  if (loading || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalLessons  = MODULES.reduce((s, m) => s + m.lessons.length, 0)
  const doneLessons   = MODULES.reduce((s, m) => s + m.lessons.filter((l) => l.done).length, 0)
  const progressPct   = Math.round((doneLessons / totalLessons) * 100)

  const filtered = filterLevel === 'all' ? MODULES : MODULES.filter((m) => m.level === filterLevel)

  return (
    <div className="flex min-h-screen bg-gray-50" dir="ltr">
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} />

      <main className="flex-1 ml-60 p-8">

        {/* Hero */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 opacity-10">
            <GraduationCap className="w-full h-full" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-6 h-6" />
              <span className="text-sm font-bold opacity-80">ShopDZ Academy</span>
            </div>
            <h1 className="text-3xl font-black mb-2">Vendez plus, mieux, plus vite.</h1>
            <p className="text-emerald-100 text-sm max-w-lg mb-6">
              {totalLessons} leçons courtes par des vendeurs algériens qui génèrent 200+ commandes/mois.
              Pas de théorie, que des techniques applicables aujourd'hui.
            </p>

            {/* Progress */}
            <div className="bg-white/20 rounded-xl p-4 max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold">Votre progression</span>
                <span className="text-sm font-bold">{doneLessons}/{totalLessons} leçons</span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              {doneLessons > 0 && (
                <p className="text-xs text-emerald-100 mt-2 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  {progressPct >= 100 ? 'Certification débloquée !' : `${progressPct}% complété`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Modules', value: String(MODULES.length), sub: 'de formation',         icon: BookOpen,      color: 'bg-blue-50 text-blue-600' },
            { label: 'Leçons',  value: String(totalLessons),    sub: 'vidéos courtes',        icon: Play,          color: 'bg-violet-50 text-violet-600' },
            { label: 'Durée',   value: '6h',                    sub: 'de contenu au total',   icon: Clock,         color: 'bg-amber-50 text-amber-600' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm font-semibold text-gray-500">Niveau :</span>
          {(['all', 'débutant', 'intermédiaire', 'avancé'] as const).map((level) => (
            <button key={level} onClick={() => setFilterLevel(level)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                filterLevel === level
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {level === 'all' ? 'Tous' : LEVEL_BADGE[level].label}
            </button>
          ))}
        </div>

        {/* Modules grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((mod) => {
            const isOpen     = openModule === mod.id
            const doneCnt    = mod.lessons.filter((l) => l.done).length
            const modPct     = Math.round((doneCnt / mod.lessons.length) * 100)
            const levelStyle = LEVEL_BADGE[mod.level]
            const Icon       = mod.icon

            return (
              <div key={mod.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border transition-all ${isOpen ? 'border-emerald-200' : 'border-gray-100'}`}>
                {/* Module header */}
                <button
                  onClick={() => setOpenModule(isOpen ? null : mod.id)}
                  className="w-full flex items-start gap-4 p-5 text-left hover:bg-gray-50 transition-colors">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${mod.bg}`}>
                    <Icon className={`w-6 h-6 ${mod.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900">{mod.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${levelStyle.color}`}>
                        {levelStyle.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{mod.desc}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${modPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{doneCnt}/{mod.lessons.length}</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {/* Lessons list */}
                {isOpen && (
                  <div className="border-t border-gray-50">
                    {mod.lessons.map((lesson, idx) => {
                      const isActive = activeLesson === lesson.id
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => lesson.free && setActiveLesson(isActive ? null : lesson.id)}
                          className={`w-full flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 transition-colors text-left ${
                            lesson.free ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default opacity-70'
                          } ${isActive ? 'bg-emerald-50' : ''}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            lesson.done
                              ? 'bg-emerald-100 text-emerald-700'
                              : isActive
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {lesson.done ? <CheckCircle className="w-4 h-4" /> : isActive ? <Play className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${lesson.done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {lesson.title}
                            </p>
                            {isActive && (
                              <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                                Vidéo disponible dans la version complète
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {lesson.duration}
                            </span>
                            {lesson.free ? (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">GRATUIT</span>
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="mt-8 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white flex items-center justify-between">
          <div>
            <p className="font-black text-lg">Débloquez tout le contenu</p>
            <p className="text-violet-200 text-sm mt-1">
              Accès illimité à toutes les leçons + nouvelles vidéos chaque semaine.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-2xl font-black">990 DA</p>
              <p className="text-xs text-violet-200">par mois · annulable</p>
            </div>
            <button className="bg-white text-violet-700 font-black px-5 py-2 rounded-xl text-sm hover:bg-violet-50 transition-colors">
              Commencer maintenant →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
