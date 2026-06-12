import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Truck, Shield, Store, Star, Package } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { dbToProduct } from '@/lib/supabase/products'
import { niches } from '@/lib/data/niches'
import ProductCard from '@/components/shop/ProductCard'

export const revalidate = 300

export const metadata = {
  title: 'ShopDZ — Shopping en ligne pour toute l\'Algérie',
  description:
    'Des milliers de produits livrés dans les 58 wilayas. Auto, Animaux, Enfants, Déco — paiement à la livraison, commande via WhatsApp.',
}

async function getHomeData() {
  const supabase = createAdminClient()

  // Featured / new in-stock products
  const { data: featuredData } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .gt('stock', 0)
    .or('is_featured.eq.true,is_new.eq.true')
    .order('rating', { ascending: false })
    .limit(8)

  // Per-niche product counts (parallel)
  const nicheCounts: Record<string, number> = {}
  await Promise.all(
    niches.map(async (n) => {
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('niche_id', n.id)
        .eq('is_active', true)
      nicheCounts[n.id] = count ?? 0
    }),
  )

  return {
    featured: (featuredData ?? []).map(dbToProduct),
    nicheCounts,
  }
}

const TRUST_ITEMS = [
  { icon: '🚚', title: 'Livraison 24-72h', sub: '58 wilayas couvertes' },
  { icon: '💵', title: 'Paiement à la livraison', sub: 'Cash on Delivery partout' },
  { icon: '✅', title: 'Vendeurs vérifiés', sub: '200+ boutiques actives' },
  { icon: '📱', title: 'Commandez via WhatsApp', sub: 'Réponse rapide garantie' },
]

export default async function HomePage() {
  const { featured, nicheCounts } = await getHomeData()

  return (
    <main className="min-h-screen bg-gray-50">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white overflow-hidden">
        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }}
        />
        {/* Glow blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-2 rounded-full text-sm font-semibold mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            Livraison dans les 58 wilayas 🇩🇿
          </div>

          <h1 className="text-4xl sm:text-6xl font-black leading-tight mb-5 tracking-tight">
            Le shopping algérien
            <br />
            <span className="text-indigo-300">en un seul endroit</span>
          </h1>

          <p className="text-white/65 text-base sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Des milliers de produits de qualité, des vendeurs vérifiés, livrés partout en Algérie.
            Commandez en ligne ou via WhatsApp.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/cars"
              className="inline-flex items-center justify-center gap-2 bg-white text-indigo-900 font-black px-8 py-4 rounded-2xl hover:bg-indigo-50 transition-colors text-base shadow-2xl shadow-black/30"
            >
              Explorer les produits <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/become-seller"
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors text-base border border-white/20"
            >
              <Store className="w-4 h-4" /> Ouvrir ma boutique
            </Link>
          </div>

          {/* Quick niche pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-10">
            {niches.map((n) => (
              <Link
                key={n.id}
                href={`/${n.id}`}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              >
                {n.emoji} {n.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust bar ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
            {TRUST_ITEMS.map(({ icon, title, sub }) => (
              <div key={title} className="py-4 px-4 sm:px-6 text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">{title}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Niche category grid ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Explorez par catégorie</h2>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            Auto · Animaux · Enfants · Maison — tout ce dont vous avez besoin
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
          {niches.map((niche) => (
            <Link
              key={niche.id}
              href={`/${niche.id}`}
              className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block"
            >
              <Image
                src={niche.banner}
                alt={niche.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              {/* Hover ring */}
              <div className="absolute inset-0 ring-inset ring-0 group-hover:ring-2 group-hover:ring-white/30 rounded-2xl transition-all" />
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                <p className="text-2xl sm:text-3xl mb-1 drop-shadow-lg">{niche.emoji}</p>
                <p className="font-black text-white text-sm sm:text-base leading-tight drop-shadow">
                  {niche.name}
                </p>
                <p className="text-white/60 text-xs mt-0.5">
                  {nicheCounts[niche.id] > 0
                    ? `${nicheCounts[niche.id]} produit${nicheCounts[niche.id] !== 1 ? 's' : ''}`
                    : 'Découvrir →'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured products ──────────────────────────────────────── */}
      {featured.length > 0 ? (
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Produits à la une</h2>
                <p className="text-gray-500 text-sm mt-1">Sélectionnés pour vous · renouvelés chaque jour</p>
              </div>
              <Link
                href="/cars"
                className="flex items-center gap-1 text-indigo-600 font-semibold text-sm hover:underline flex-shrink-0"
              >
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* Empty state — shows when no products exist yet */
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center py-10">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-indigo-300" />
            </div>
            <p className="font-bold text-gray-700 mb-1">Boutiques bientôt disponibles</p>
            <p className="text-gray-400 text-sm">Les premières boutiques arrivent très bientôt.</p>
          </div>
        </section>
      )}

      {/* ── Social proof strip ─────────────────────────────────────── */}
      <div className="bg-indigo-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '200+', label: 'Vendeurs actifs' },
              { value: '58',   label: 'Wilayas couvertes' },
              { value: '0%',   label: 'Commission' },
              { value: '24h',  label: 'Livraison express' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl sm:text-4xl font-black">{value}</p>
                <p className="text-indigo-200 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Algeria-specific trust section ─────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: '💬',
              title: 'Commandez via WhatsApp',
              desc: 'Chaque vendeur répond directement sur WhatsApp. Rapide, simple, en arabe ou français.',
            },
            {
              icon: '🚚',
              title: 'Livraison à domicile',
              desc: 'Livraison vers toutes les wilayas d\'Algérie. Paiement cash à la réception.',
            },
            {
              icon: '🛡️',
              title: 'Vendeurs vérifiés',
              desc: 'Chaque boutique est vérifiée par notre équipe. Achetez en toute confiance.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="text-4xl mb-3">{icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Seller CTA ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <div className="text-5xl mb-5">🛍️</div>
          <h2 className="text-3xl font-black mb-3">Vendez sur ShopDZ</h2>
          <p className="text-white/65 mb-8 text-lg">
            Créez votre boutique en ligne gratuitement. Zéro commission. Livraison vers les 58 wilayas.
          </p>
          <Link
            href="/become-seller"
            className="inline-flex items-center gap-2 bg-white text-emerald-800 font-black px-10 py-4 rounded-2xl hover:bg-emerald-50 transition-colors text-base shadow-lg"
          >
            <Store className="w-5 h-5" /> Créer ma boutique
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-white/40 text-sm mt-4">
            Déjà vendeur ?{' '}
            <Link href="/seller/login" className="text-white/60 hover:text-white underline">
              Se connecter
            </Link>
          </p>
        </div>
      </section>

    </main>
  )
}
