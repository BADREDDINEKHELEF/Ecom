import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: "Conditions d'utilisation — ShopDZ",
  description: "Conditions générales d'utilisation de la plateforme ShopDZ.",
}

const LAST_UPDATED = 'Juin 2025'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour à ShopDZ
        </Link>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-3xl font-black text-gray-900 mb-2">{"Conditions générales d'utilisation"}</h1>
          <p className="text-sm text-gray-400 mb-8">Dernière mise à jour : {LAST_UPDATED}</p>

          <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed text-gray-700">

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">{"1. Acceptation des conditions"}</h2>
              <p>
                En accédant ou en utilisant ShopDZ (&quot;la Plateforme&quot;), vous acceptez d&apos;être lié par les présentes
                conditions générales d&apos;utilisation. Si vous n&apos;acceptez pas ces conditions, vous ne pouvez pas utiliser
                la Plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">2. La Plateforme</h2>
              <p>
                ShopDZ est une place de marché en ligne qui met en relation des acheteurs et des vendeurs indépendants
                basés en Algérie. ShopDZ n&apos;est pas le vendeur des produits listés — chaque produit est vendu par
                le vendeur individuel dont la boutique l&apos;héberge.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">3. Obligations de l&apos;acheteur</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Fournir des informations de livraison exactes lors de la passation de commande</li>
                <li>Être disponible pour réceptionner votre commande et effectuer le paiement à la livraison (pour les commandes en paiement à la livraison)</li>
                <li>Contacter le vendeur ou le support ShopDZ dans les <strong>7 jours</strong> suivant la livraison pour tout problème</li>
                <li>Ne pas tenter de frauder les vendeurs par de faux retours ou des réclamations abusives</li>
                <li>Ne pas passer de commandes fictives ou refuser de manière répétée la réception des colis</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">4. Obligations du vendeur</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Ne lister que des produits dont la vente est légalement autorisée en Algérie</li>
                <li>Fournir des descriptions, images et prix exacts et non trompeurs</li>
                <li>Honorer les commandes dans les délais et conformément à la description</li>
                <li>Ne pas lister de produits contrefaits, prohibés ou dangereux</li>
                <li>S&apos;acquitter de la commission plateforme convenue (10 % de chaque vente) conformément à votre contrat vendeur</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">5. Produits interdits</h2>
              <p>Les éléments suivants sont strictement interdits sur ShopDZ :</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Armes, munitions ou matériaux explosifs</li>
                <li>Produits contrefaits ou portant atteinte à des droits de marque</li>
                <li>Substances contrôlées ou médicaments nécessitant une ordonnance</li>
                <li>Contenus pour adultes ou à caractère pornographique</li>
                <li>Tout produit en violation de la législation algérienne en vigueur</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">6. Retours et remboursements</h2>
              <p>
                Les acheteurs peuvent demander un retour dans les <strong>7 jours</strong> suivant la livraison pour
                les produits défectueux, endommagés ou ne correspondant pas à la description. Le vendeur est responsable
                de l&apos;organisation de la logistique de retour. ShopDZ peut intervenir en tant que médiateur dans les
                litiges à sa discrétion.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">7. Limitation de responsabilité</h2>
              <p>
                ShopDZ fournit la Plateforme &quot;en l&apos;état&quot; et ne garantit pas un service ininterrompu
                ou sans erreur. Dans les limites autorisées par la loi algérienne, la responsabilité de ShopDZ
                pour toute réclamation découlant de l&apos;utilisation de la Plateforme est limitée à la valeur
                de la commande en litige.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">8. Propriété intellectuelle</h2>
              <p>
                La marque, le logo et le design de la Plateforme ShopDZ sont la propriété de ShopDZ. Les vendeurs
                conservent la propriété de leur contenu produit. En listant sur ShopDZ, les vendeurs accordent à
                ShopDZ une licence non exclusive pour afficher et promouvoir leurs produits sur la Plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">9. Droit applicable</h2>
              <p>
                Les présentes conditions sont régies par les lois de la République Algérienne Démocratique et
                Populaire. Tout litige sera soumis à la compétence des tribunaux compétents d&apos;Alger.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">10. Modifications des conditions</h2>
              <p>
                ShopDZ peut mettre à jour les présentes conditions à tout moment. La poursuite de l&apos;utilisation
                de la Plateforme après la publication des modifications vaut acceptation des conditions mises à jour.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">11. Contact</h2>
              <p>
                Pour toute question relative aux présentes conditions :{' '}
                <a href="mailto:legal@shopdz.dz" className="text-indigo-600 hover:underline">
                  legal@shopdz.dz
                </a>
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
