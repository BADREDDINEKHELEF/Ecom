import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — StoreDz',
  description: 'Comment StoreDz collecte, utilise et protège vos données personnelles conformément à la loi algérienne 18-07.',
}

const LAST_UPDATED = 'Juin 2025'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour à StoreDz
        </Link>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Politique de confidentialité</h1>
          <p className="text-sm text-gray-400 mb-8">Dernière mise à jour : {LAST_UPDATED}</p>

          <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed text-gray-700">

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">1. Données collectées</h2>
              <p>Lorsque vous passez une commande sur StoreDz, nous collectons les données personnelles suivantes :</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Votre nom complet et numéro de téléphone (nécessaires pour le traitement et la livraison de votre commande)</li>
                <li>Votre adresse de livraison : wilaya, commune et adresse précise</li>
                <li>Les détails de votre commande : noms des produits, quantités et montants</li>
              </ul>
              <p className="mt-2">
                Si vous créez un compte vendeur, nous collectons également votre adresse e-mail et les informations relatives à votre boutique.
              </p>
              <p className="mt-2">
                Nous ne collectons <strong>pas</strong> vos coordonnées bancaires directement. Les paiements en ligne sont
                traités par des prestataires tiers (Satim, BaridiMob) selon leurs propres politiques de confidentialité.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">2. Utilisation de vos données</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Traiter et livrer votre commande</li>
                <li>Vous contacter concernant l'état de votre commande (WhatsApp ou appel téléphonique)</li>
                <li>Résoudre les litiges et traiter les retours</li>
                <li>Améliorer nos services et détecter les tentatives de fraude</li>
                <li>Vous envoyer des communications commerciales <em>uniquement si vous y avez explicitement consenti</em></li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">3. Partage des données</h2>
              <p>Nous partageons vos données personnelles uniquement avec :</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  <strong>Partenaires de livraison</strong> (Yalidine, ZR Express, Procolis) —
                  uniquement les informations nécessaires à la livraison (nom, téléphone, adresse)
                </li>
                <li>
                  <strong>Vendeurs</strong> — le vendeur concerné reçoit votre nom, numéro de téléphone, wilaya
                  et le détail des articles commandés pour préparer et expédier votre commande
                </li>
                <li>
                  <strong>Prestataires de paiement</strong> — uniquement si vous choisissez un paiement en ligne
                </li>
              </ul>
              <p className="mt-2">Nous ne vendons pas vos données personnelles à des annonceurs ou à des courtiers en données.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">4. Durée de conservation</h2>
              <p>
                Les données de commande sont conservées pendant <strong>3 ans</strong> conformément aux obligations
                de tenue des registres commerciaux prévues par la législation algérienne. Les abonnements aux
                communications commerciales sont conservés jusqu'à votre désinscription. Vous pouvez demander
                la suppression de vos données en nous contactant.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">5. Sécurité</h2>
              <p>
                Vos données sont protégées par des mesures conformes aux standards du secteur : chiffrement HTTPS
                en transit, chiffrement AES-256-GCM pour les identifiants sensibles stockés, et sécurité au niveau
                des lignes (Row-Level Security) sur notre base de données — chaque vendeur n'accède qu'aux données
                de ses propres clients.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">6. Vos droits (Loi 18-07)</h2>
              <p>
                Conformément à la loi algérienne n° 18-07 relative à la protection des personnes physiques
                dans le traitement des données à caractère personnel, vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Accéder aux données personnelles que nous détenons vous concernant</li>
                <li>Rectifier des données inexactes</li>
                <li>Demander la suppression de vos données (sous réserve des obligations légales de conservation)</li>
                <li>Vous désinscrire des communications commerciales à tout moment</li>
                <li>Vous opposer au traitement de vos données à des fins de marketing</li>
              </ul>
              <p className="mt-2">
                Pour exercer ces droits, contactez-nous à{' '}
                <a href="mailto:privacy@storedz.dz" className="text-indigo-600 hover:underline">
                  privacy@storedz.dz
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">7. Cookies</h2>
              <p>
                StoreDz utilise uniquement des <strong>cookies fonctionnels</strong> — spécifiquement un cookie
                de session httpOnly pour l'authentification des vendeurs et administrateurs. Nous n'utilisons
                pas de cookies publicitaires ou de suivi comportemental.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">8. Contact</h2>
              <p>
                Pour toute question relative à la confidentialité ou pour exercer vos droits :{' '}
                <a href="mailto:privacy@storedz.dz" className="text-indigo-600 hover:underline">
                  privacy@storedz.dz
                </a>
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
