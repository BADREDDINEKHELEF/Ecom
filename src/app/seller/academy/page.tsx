'use client'

import { useState } from 'react'
import {
  GraduationCap, Play, CheckCircle, Clock, ChevronRight, ChevronDown,
  Star, Zap, Package, Tag, BarChart2, MessageSquare, Truck,
  TrendingUp, BookOpen, Award, CreditCard, Smartphone,
  AlertCircle, Info, Lightbulb, Menu, Target, Link2,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { useRTL, useLang } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface Step {
  text: string
  tip?: string
}

interface Lesson {
  id:       string
  title:    string
  duration: string
  intro:    string
  steps:    Step[]
  tip?:     string
  warning?: string
}

interface Module {
  id:      string
  title:   string
  icon:    React.ElementType
  color:   string
  bg:      string
  badge:   string
  badgeBg: string
  desc:    string
  lessons: Lesson[]
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Modules & Lessons Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const MODULES: Module[] = [
  // Ã¢â€â‚¬Ã¢â€â‚¬ 1. PAIEMENTS (featured first) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  {
    id:      'payments',
    title:   'Paiements & Encaissements',
    icon:    CreditCard,
    color:   'text-emerald-600',
    bg:      'bg-emerald-50',
    badge:   'Essentiel',
    badgeBg: 'bg-emerald-100 text-emerald-700',
    desc:    'MaÃƒÂ®trisez tous les modes de paiement algÃƒÂ©riens : CCP, BaridiMob, carte bancaire et paiement ÃƒÂ  la livraison.',
    lessons: [
      {
        id:       'pay1',
        title:    'Encaisser par CCP Ã¢â‚¬â€ virement postal complet',
        duration: '7 min',
        intro:    'Le CCP (Compte Courant Postal) est le compte bancaire de La Poste AlgÃƒÂ©rie. C\'est l\'un des moyens de paiement les plus populaires en AlgÃƒÂ©rie. Voici comment encaisser vos ventes via CCP.',
        steps: [
          { text: 'Trouvez votre numÃƒÂ©ro CCP sur votre carnet de chÃƒÂ¨ques postal ou votre relevÃƒÂ© de compte La Poste. Le format est : XXXXXXXX CC (ex: 00123456 78).', tip: 'Conservez votre numÃƒÂ©ro CCP en lieu sÃƒÂ»r. Ne le partagez qu\'avec des acheteurs confirmÃƒÂ©s.' },
          { text: 'Communiquez votre numÃƒÂ©ro CCP ÃƒÂ  l\'acheteur via WhatsApp ou dans la confirmation de commande. PrÃƒÂ©cisez le montant exact ÃƒÂ  virer.' },
          { text: 'L\'acheteur se rend au bureau de La Poste le plus proche, remplit une "Demande de Virement Postal" avec votre numÃƒÂ©ro CCP et le montant, et remet le formulaire au guichetier.', tip: 'Demandez ÃƒÂ  l\'acheteur de noter le numÃƒÂ©ro de commande dans la rubrique "motif du virement" pour faciliter le suivi.' },
          { text: 'L\'acheteur reÃƒÂ§oit un reÃƒÂ§u de virement. Demandez-lui de vous l\'envoyer en photo par WhatsApp comme preuve de paiement.' },
          { text: 'VÃƒÂ©rifiez que le virement est bien crÃƒÂ©ditÃƒÂ© sur votre compte via l\'application BaridiMob (voir leÃƒÂ§on suivante) ou en vous rendant au bureau de poste.', tip: 'Les virements entre CCP sont gÃƒÂ©nÃƒÂ©ralement traitÃƒÂ©s le mÃƒÂªme jour ouvrable. Comptez jusqu\'ÃƒÂ  24h pour les virements entre wilayas.' },
          { text: 'Une fois le paiement confirmÃƒÂ©, procÃƒÂ©dez ÃƒÂ  l\'expÃƒÂ©dition de la commande.' },
        ],
        tip: 'Astuce pro : crÃƒÂ©ez un message WhatsApp type avec vos instructions de paiement CCP pour gagner du temps. Incluez votre numÃƒÂ©ro CCP, le nom du bÃƒÂ©nÃƒÂ©ficiaire et le bureau de poste de rattachement.',
        warning: 'N\'expÃƒÂ©diez JAMAIS une commande avant d\'avoir vÃƒÂ©rifiÃƒÂ© le crÃƒÂ©dit sur votre compte. Un reÃƒÂ§u peut ÃƒÂªtre falsifiÃƒÂ©.',
      },
      {
        id:       'pay2',
        title:    'BaridiMob Ã¢â‚¬â€ recevoir et vÃƒÂ©rifier les paiements',
        duration: '8 min',
        intro:    'BaridiMob est l\'application bancaire mobile de La Poste AlgÃƒÂ©rie. Elle vous permet de recevoir des paiements instantanÃƒÂ©ment, de vÃƒÂ©rifier votre solde en temps rÃƒÂ©el et de gÃƒÂ©rer votre compte CCP depuis votre tÃƒÂ©lÃƒÂ©phone.',
        steps: [
          { text: 'TÃƒÂ©lÃƒÂ©chargez l\'application "BaridiMob" sur Google Play Store (Android) ou App Store (iPhone). Cherchez "Ã˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã™â€¦Ã™Ë†Ã˜Â¨" ou "BaridiMob AlgÃƒÂ©rie".' },
          { text: 'Au premier lancement, choisissez "CrÃƒÂ©er un compte" et entrez votre numÃƒÂ©ro CCP (inscrit sur votre carnet de chÃƒÂ¨ques postal) et votre numÃƒÂ©ro de tÃƒÂ©lÃƒÂ©phone.', tip: 'Vous devez avoir un compte CCP actif ÃƒÂ  La Poste AlgÃƒÂ©rie pour utiliser BaridiMob.' },
          { text: 'Recevez un code de vÃƒÂ©rification par SMS, entrez-le dans l\'application pour valider votre numÃƒÂ©ro de tÃƒÂ©lÃƒÂ©phone.' },
          { text: 'CrÃƒÂ©ez votre code PIN ÃƒÂ  6 chiffres Ã¢â‚¬â€ c\'est votre code secret pour toutes les transactions. Ne le communiquez ÃƒÂ  personne.' },
          { text: 'Pour consulter votre solde : ouvrez BaridiMob Ã¢â€ â€™ Menu principal Ã¢â€ â€™ "Consultation" Ã¢â€ â€™ votre solde s\'affiche immÃƒÂ©diatement.', tip: 'Configurez les notifications SMS dans les paramÃƒÂ¨tres pour ÃƒÂªtre alertÃƒÂ© ÃƒÂ  chaque transaction reÃƒÂ§ue.' },
          { text: 'Pour recevoir un paiement : partagez votre numÃƒÂ©ro CCP avec l\'acheteur. Ils peuvent vous payer via BaridiMob (transfert instantanÃƒÂ©) ou au bureau de poste (virement postal).', tip: 'Votre numÃƒÂ©ro de tÃƒÂ©lÃƒÂ©phone enregistrÃƒÂ© sur BaridiMob peut aussi servir d\'identifiant pour recevoir des paiements instantanÃƒÂ©s.' },
          { text: 'Pour retirer de l\'argent : BaridiMob Ã¢â€ â€™ "Retrait" Ã¢â€ â€™ choisissez un bureau de La Poste Ã¢â€ â€™ gÃƒÂ©nÃƒÂ©rez un code de retrait Ã¢â€ â€™ prÃƒÂ©sentez ce code au guichet avec votre piÃƒÂ¨ce d\'identitÃƒÂ©.' },
        ],
        tip: 'BaridiMob permet des transferts instantanÃƒÂ©s 24h/24, 7j/7. Profitez-en pour confirmer les paiements les soirs et week-ends sans attendre l\'ouverture de La Poste.',
      },
      {
        id:       'pay3',
        title:    'Paiement ÃƒÂ  la livraison (COD) Ã¢â‚¬â€ gÃƒÂ©rer les risques',
        duration: '6 min',
        intro:    'Le paiement ÃƒÂ  la livraison (COD Ã¢â‚¬â€ Cash On Delivery) est le mode de paiement dominant en AlgÃƒÂ©rie. Le client paie en espÃƒÂ¨ces au livreur, qui vous reverse ensuite votre argent. MaÃƒÂ®trisez les risques pour ÃƒÂ©viter les pertes.',
        steps: [
          { text: 'Avant de confirmer une commande COD, appelez le client pour confirmer son intention d\'achat et valider son adresse de livraison.', tip: 'Les vendeurs qui appellent avant l\'expÃƒÂ©dition rÃƒÂ©duisent leur taux de refus de 40 ÃƒÂ  60%.' },
          { text: 'Utilisez uniquement des transporteurs fiables (Yalidine, ZR Express, Procolis) qui collectent le COD et vous le reversent rÃƒÂ©guliÃƒÂ¨rement.' },
          { text: 'Suivez votre tableau de bord StoreDz pour voir le statut de chaque livraison. DÃƒÂ¨s qu\'une commande est marquÃƒÂ©e "LivrÃƒÂ©", votre paiement est en route.' },
          { text: 'Le dÃƒÂ©lai de reversement COD varie selon le transporteur : Yalidine reverse gÃƒÂ©nÃƒÂ©ralement sous 3-5 jours ouvrables, ZR Express sous 5-7 jours.', tip: 'Gardez une rÃƒÂ©serve de trÃƒÂ©sorerie pour ne pas ÃƒÂªtre bloquÃƒÂ© entre les expÃƒÂ©ditions et les reversements COD.' },
          { text: 'En cas de colis refusÃƒÂ© ou retournÃƒÂ©, le transporteur vous renvoie le colis et vous facture le retour. Contactez le client pour comprendre le motif.' },
          { text: 'Pour rÃƒÂ©duire les refus : utilisez un emballage solide, joignez une facture, et expÃƒÂ©diez rapidement Ã¢â‚¬â€ plus le dÃƒÂ©lai de livraison est court, plus le taux d\'acceptation est ÃƒÂ©levÃƒÂ©.' },
        ],
        warning: 'Ne gÃƒÂ©rez jamais les COD en dehors du systÃƒÂ¨me de votre transporteur. Les paiements en espÃƒÂ¨ces directs sans traÃƒÂ§abilitÃƒÂ© exposent ÃƒÂ  des litiges non rÃƒÂ©solubles.',
      },
      {
        id:       'pay4',
        title:    'EDAHABIA & CIB Ã¢â‚¬â€ paiements en ligne par carte',
        duration: '5 min',
        intro:    'La carte EDAHABIA (carte jaune de La Poste AlgÃƒÂ©rie) et la carte CIB (des banques conventionnelles) permettent aux clients de vous payer directement en ligne via la passerelle SATIM. C\'est automatique Ã¢â‚¬â€ vous n\'avez rien ÃƒÂ  configurer.',
        steps: [
          { text: 'Lorsqu\'un client choisit "Paiement en ligne" sur StoreDz, il est redirigÃƒÂ© vers la page sÃƒÂ©curisÃƒÂ©e de SATIM (passerelle nationale algÃƒÂ©rienne).' },
          { text: 'Le client entre les informations de sa carte EDAHABIA ou CIB. La transaction est validÃƒÂ©e par SATIM et confirmÃƒÂ©e instantanÃƒÂ©ment.' },
          { text: 'StoreDz reÃƒÂ§oit la confirmation de paiement et marque automatiquement la commande comme payÃƒÂ©e dans votre tableau de bord.', tip: 'Le paiement en ligne ÃƒÂ©limine le risque de refus COD Ã¢â‚¬â€ le client a dÃƒÂ©jÃƒÂ  payÃƒÂ© avant livraison.' },
          { text: 'Le reversement du montant est effectuÃƒÂ© selon le calendrier de votre abonnement vendeur. Aucune commission n\'est dÃƒÂ©duite Ã¢â‚¬â€ vous recevez 100% du montant payÃƒÂ©. Consultez "Revenus & Paiements" dans votre tableau de bord pour le suivi.' },
          { text: 'Si un client rencontre une erreur de paiement, vÃƒÂ©rifiez qu\'il utilise bien une carte EDAHABIA ou CIB activÃƒÂ©e pour les paiements en ligne (certaines cartes nÃƒÂ©cessitent une activation spÃƒÂ©cifique ÃƒÂ  La Poste ou ÃƒÂ  la banque).', tip: 'La carte EDAHABIA est activÃƒÂ©e par dÃƒÂ©faut pour les paiements en ligne. La CIB nÃƒÂ©cessite parfois une demande d\'activation auprÃƒÂ¨s de la banque.' },
        ],
        tip: 'Encouragez vos clients ÃƒÂ  utiliser le paiement en ligne Ã¢â‚¬â€ vous recevez l\'argent avant expÃƒÂ©dition, sans risque de refus.',
      },
      {
        id:       'pay5',
        title:    'Ãƒâ€°viter les fraudes et impayÃƒÂ©s',
        duration: '5 min',
        intro:    'Quelques prÃƒÂ©cautions simples vous protÃƒÂ¨gent contre les fraudes les plus courantes. Ne laissez pas les mauvaises expÃƒÂ©riences vous dÃƒÂ©courager Ã¢â‚¬â€ les vendeurs vigilants ont moins de 1% d\'incidents.',
        steps: [
          { text: 'Ne vous fiez jamais ÃƒÂ  un screenshot de reÃƒÂ§u CCP sans vÃƒÂ©rifier le crÃƒÂ©dit rÃƒÂ©el sur votre compte. Les faux reÃƒÂ§us sont faciles ÃƒÂ  crÃƒÂ©er.', tip: 'VÃƒÂ©rifiez toujours via BaridiMob ou au bureau de poste, jamais sur la base d\'une photo.' },
          { text: 'MÃƒÂ©fiez-vous des acheteurs qui demandent une livraison urgente avant paiement confirmÃƒÂ© Ã¢â‚¬â€ c\'est un signal d\'alarme frÃƒÂ©quent.' },
          { text: 'Pour les commandes de grande valeur (au-dessus de 5 000 DA), privilÃƒÂ©giez le paiement en ligne par carte ou demandez un acompte CCP.' },
          { text: 'Documentez toutes vos transactions : numÃƒÂ©ros de suivi, preuves de livraison, ÃƒÂ©changes WhatsApp. Ces preuves sont indispensables en cas de litige.' },
          { text: 'Si un acheteur conteste une livraison, votre preuve de livraison signÃƒÂ©e par le transporteur prime sur sa dÃƒÂ©claration.' },
        ],
        warning: 'Ne faites jamais de remboursement avant d\'avoir rÃƒÂ©cupÃƒÂ©rÃƒÂ© le colis retournÃƒÂ©. Des acheteurs malveillants rÃƒÂ©clament parfois des remboursements sans renvoyer la marchandise.',
      },
    ],
  },

  // Ã¢â€â‚¬Ã¢â€â‚¬ 2. DÃƒâ€°MARRER Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  {
    id:      'start',
    title:   'DÃƒÂ©marrer sur StoreDz',
    icon:    Package,
    color:   'text-blue-600',
    bg:      'bg-blue-50',
    badge:   'DÃƒÂ©butant',
    badgeBg: 'bg-blue-100 text-blue-700',
    desc:    'Configurez votre boutique et publiez votre premier produit en moins d\'une heure.',
    lessons: [
      {
        id:       's1',
        title:    'CrÃƒÂ©er et configurer votre boutique',
        duration: '4 min',
        intro:    'Votre boutique est votre vitrine en ligne. Une page bien configurÃƒÂ©e inspire confiance et augmente vos conversions.',
        steps: [
          { text: 'Dans votre tableau de bord, allez dans "ParamÃƒÂ¨tres" Ã¢â€ â€™ "Boutique". Remplissez le nom de votre boutique, votre description et vos coordonnÃƒÂ©es.', tip: 'Choisissez un nom de boutique mÃƒÂ©morable et facile ÃƒÂ  prononcer. Ãƒâ€°vitez les numÃƒÂ©ros et les tirets.' },
          { text: 'TÃƒÂ©lÃƒÂ©chargez un logo professionnel (minimum 400Ãƒâ€”400 px, fond blanc de prÃƒÂ©fÃƒÂ©rence). Un logo soignÃƒÂ© double la confiance des acheteurs.' },
          { text: 'Ajoutez votre numÃƒÂ©ro de tÃƒÂ©lÃƒÂ©phone WhatsApp Ã¢â‚¬â€ c\'est le canal de communication numÃƒÂ©ro 1 pour les acheteurs algÃƒÂ©riens.' },
          { text: 'PrÃƒÂ©cisez votre wilaya de localisation pour que les acheteurs sachent les dÃƒÂ©lais de livraison approximatifs.' },
          { text: 'Sauvegardez. Votre page boutique est maintenant accessible ÃƒÂ  l\'adresse storedz.dz/shop/votre-slug.' },
        ],
        tip: 'Partagez le lien de votre boutique sur vos groupes WhatsApp et Facebook dÃƒÂ¨s le premier jour Ã¢â‚¬â€ mÃƒÂªme si vous n\'avez qu\'un seul produit.',
      },
      {
        id:       's2',
        title:    'Ajouter votre premier produit avec photos',
        duration: '6 min',
        intro:    'Un bon produit bien prÃƒÂ©sentÃƒÂ© peut se vendre seul. Suivez cette checklist pour votre premiÃƒÂ¨re annonce.',
        steps: [
          { text: 'Allez dans "Mes Produits" Ã¢â€ â€™ "Ajouter un produit".' },
          { text: 'Titre : soyez prÃƒÂ©cis et descriptif. Exemple : "Robe de soirÃƒÂ©e brodÃƒÂ©e bleu marine Ã¢â‚¬â€ taille M/L" plutÃƒÂ´t que "Belle robe".', tip: 'Incluez la taille, la couleur et le matÃƒÂ©riau dans le titre pour apparaÃƒÂ®tre dans les recherches.' },
          { text: 'Description : citez les caractÃƒÂ©ristiques principales, les dimensions, les matiÃƒÂ¨res et les conditions d\'utilisation. RÃƒÂ©pondez aux questions que les acheteurs posent toujours.' },
          { text: 'Photos : ajoutez au minimum 3 photos Ã¢â‚¬â€ face, dos, et dÃƒÂ©tail du produit. La premiÃƒÂ¨re photo est votre image de couverture.', tip: 'Photographiez sur un fond blanc ou neutre. La lumiÃƒÂ¨re naturelle d\'une fenÃƒÂªtre est suffisante.' },
          { text: 'Prix : calculez votre prix de revient (achat + frais d\'expÃƒÂ©dition) et ajoutez votre marge. StoreDz ne prend aucune commission Ã¢â‚¬â€ votre abonnement mensuel est votre seul frais fixe.' },
          { text: 'Stock : entrez la quantitÃƒÂ© disponible. StoreDz bloquera automatiquement les commandes si le stock tombe ÃƒÂ  zÃƒÂ©ro.' },
          { text: 'Publiez. Votre produit est immÃƒÂ©diatement visible sur StoreDz.' },
        ],
      },
      {
        id:       's3',
        title:    'Configurer les modes de livraison',
        duration: '5 min',
        intro:    'Une livraison rapide et fiable est votre meilleure carte de visite. Voici comment configurer vos transporteurs dans StoreDz.',
        steps: [
          { text: 'Allez dans "ParamÃƒÂ¨tres" Ã¢â€ â€™ "Livraison & API".' },
          { text: 'Choisissez votre transporteur principal : Yalidine, ZR Express ou Procolis. Yalidine est recommandÃƒÂ© pour les dÃƒÂ©butants car il couvre toutes les wilayas.' },
          { text: 'Entrez vos identifiants API de transporteur. Vous pouvez les obtenir en crÃƒÂ©ant un compte professionnel sur le site de votre transporteur.', tip: 'Si vous dÃƒÂ©butez sans API, vous pouvez crÃƒÂ©er les expÃƒÂ©ditions manuellement depuis le site du transporteur en attendant.' },
          { text: 'Activez la crÃƒÂ©ation automatique d\'expÃƒÂ©ditions pour gagner du temps : StoreDz crÃƒÂ©e le bon de livraison dÃƒÂ¨s que vous confirmez une commande.' },
          { text: 'Testez avec une premiÃƒÂ¨re commande rÃƒÂ©elle pour vous assurer que tout fonctionne.' },
        ],
        tip: 'NÃƒÂ©gociez des tarifs dÃƒÂ©gressifs avec votre transporteur dÃƒÂ¨s que vous atteignez 30-50 envois par mois.',
      },
      {
        id:       's4',
        title:    'Partager votre boutique sur les rÃƒÂ©seaux',
        duration: '3 min',
        intro:    'Vos premiÃƒÂ¨res ventes viennent de votre rÃƒÂ©seau personnel. Ne soyez pas timide Ã¢â‚¬â€ partagez.',
        steps: [
          { text: 'Copiez le lien de votre boutique StoreDz (storedz.dz/shop/votre-slug).' },
          { text: 'Publiez dans vos groupes WhatsApp avec une photo de votre meilleur produit et un message simple : "Je viens d\'ouvrir ma boutique en ligne Ã¢â‚¬â€ je livre dans toute l\'AlgÃƒÂ©rie !"' },
          { text: 'Partagez sur votre page Facebook personnelle et votre page professionnelle si vous en avez une.' },
          { text: 'Rejoignez 3-5 groupes Facebook de vente dans votre rÃƒÂ©gion ou votre niche et publiez vos produits (vÃƒÂ©rifiez les rÃƒÂ¨gles de chaque groupe).' },
          { text: 'Ajoutez le lien de votre boutique dans votre bio Instagram si vous avez un compte actif.' },
        ],
      },
      {
        id:       's5',
        title:    'Recevoir et traiter votre premiÃƒÂ¨re commande',
        duration: '7 min',
        intro:    'La premiÃƒÂ¨re commande est le moment le plus important. Chaque dÃƒÂ©tail compte pour fidÃƒÂ©liser ce premier client.',
        steps: [
          { text: 'Vous recevez une notification (email + tableau de bord) pour chaque nouvelle commande. RÃƒÂ©pondez dans les 2 heures maximum.', tip: 'Activez les notifications push sur votre tÃƒÂ©lÃƒÂ©phone pour ne jamais rater une commande.' },
          { text: 'VÃƒÂ©rifiez les informations de livraison dans votre tableau de bord : nom, tÃƒÂ©lÃƒÂ©phone, wilaya, citÃƒÂ©.' },
          { text: 'Appelez le client pour confirmer la commande et l\'adresse exacte. C\'est rapide et ÃƒÂ§a rÃƒÂ©duit les retours.', tip: 'Script simple : "Bonjour, je suis [Nom de votre boutique]. Je vous appelle pour confirmer votre commande de [produit]. Votre adresse est bien [adresse] ?"' },
          { text: 'PrÃƒÂ©parez et emballez le colis soigneusement. Ajoutez un mot de remerciement manuscrit Ã¢â‚¬â€ ÃƒÂ§a marque les esprits.' },
          { text: 'CrÃƒÂ©ez le bon de livraison via votre transporteur (manuellement ou automatiquement si l\'API est configurÃƒÂ©e).' },
          { text: 'Mettez ÃƒÂ  jour le statut dans StoreDz : "ConfirmÃƒÂ©" puis "ExpÃƒÂ©diÃƒÂ©" avec le numÃƒÂ©ro de suivi.' },
          { text: 'Envoyez le numÃƒÂ©ro de suivi au client par WhatsApp pour qu\'il puisse suivre sa livraison.' },
        ],
      },
    ],
  },

  // Ã¢â€â‚¬Ã¢â€â‚¬ 3. PHOTOS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  {
    id:      'photos',
    title:   'Photos qui vendent',
    icon:    Star,
    color:   'text-violet-600',
    bg:      'bg-violet-50',
    badge:   'DÃƒÂ©butant',
    badgeBg: 'bg-violet-100 text-violet-700',
    desc:    'Des photos professionnelles avec seulement votre smartphone pour multiplier vos conversions par 3.',
    lessons: [
      {
        id:       'p1',
        title:    'Les 3 photos obligatoires pour chaque produit',
        duration: '5 min',
        intro:    'L\'acheteur algÃƒÂ©rien achÃƒÂ¨te avec les yeux. Trois photos bien choisies suffisent pour dÃƒÂ©clencher la vente.',
        steps: [
          { text: 'Photo 1 Ã¢â‚¬â€ La couverture (80% des ventes se font sur cette photo) : produit seul, fond blanc ou beige, ÃƒÂ©clairage uniforme, produit occupe 70% du cadre.', tip: 'C\'est la seule photo que voit l\'acheteur dans les listes de produits. Elle doit ÃƒÂªtre immÃƒÂ©diatement reconnaissable.' },
          { text: 'Photo 2 Ã¢â‚¬â€ Le contexte d\'utilisation : le produit "en action" ou dans son environnement naturel. Une robe portÃƒÂ©e par un mannequin, un casque sur la tÃƒÂªte, un plat dans une assiette.' },
          { text: 'Photo 3 Ã¢â‚¬â€ Le dÃƒÂ©tail qui rassure : gros plan sur la texture, les coutures, les matiÃƒÂ¨res, les ÃƒÂ©tiquettes, la taille comparative avec une main. Ce que l\'acheteur voudrait toucher.' },
          { text: 'Bonus : ajoutez une 4e photo avec le tableau des tailles (pour les vÃƒÂªtements), les dimensions exactes (pour les meubles/objets), ou les ingrÃƒÂ©dients (pour les produits alimentaires/cosmÃƒÂ©tiques).', tip: 'Les vendeurs qui ajoutent le tableau des tailles reÃƒÂ§oivent 60% moins de questions et de retours.' },
        ],
      },
      {
        id:       'p2',
        title:    'Ãƒâ€°clairage naturel : technique pour smartphone',
        duration: '8 min',
        intro:    'Pas besoin d\'un studio photo professionnel. Une fenÃƒÂªtre ensoleillÃƒÂ©e est votre meilleur ÃƒÂ©quipement.',
        steps: [
          { text: 'Positionnez-vous ÃƒÂ  1-2 mÃƒÂ¨tres d\'une fenÃƒÂªtre qui reÃƒÂ§oit de la lumiÃƒÂ¨re naturelle indirecte (pas de soleil direct qui crÃƒÂ©e des ombres dures).', tip: 'L\'heure idÃƒÂ©ale : 9h-11h le matin ou 15h-17h l\'aprÃƒÂ¨s-midi. Ãƒâ€°vitez le soleil de midi.' },
          { text: 'Placez une feuille de papier blanc ou un tissu blanc de l\'autre cÃƒÂ´tÃƒÂ© du produit (cÃƒÂ´tÃƒÂ© opposÃƒÂ© ÃƒÂ  la fenÃƒÂªtre) pour rÃƒÂ©flÃƒÂ©chir la lumiÃƒÂ¨re et ÃƒÂ©liminer les ombres.', tip: 'Ce rÃƒÂ©flecteur DIY remplace un panneau professionnel ÃƒÂ  5000 DA Ã¢â‚¬â€ c\'est 100% efficace.' },
          { text: 'Posez le produit sur un fond neutre : feuille A3 blanche, tissu beige, tableau blanc. Ãƒâ€°vitez les fonds chargÃƒÂ©s qui distraient.' },
          { text: 'DÃƒÂ©sactivez le flash de votre tÃƒÂ©lÃƒÂ©phone Ã¢â‚¬â€ il crÃƒÂ©e des reflets plats et non naturels.' },
          { text: 'Prenez 10-15 photos, changez lÃƒÂ©gÃƒÂ¨rement l\'angle ÃƒÂ  chaque fois. SÃƒÂ©lectionnez les 3-4 meilleures.' },
          { text: 'Activez la grille dans votre appareil photo et centrez le produit en utilisant la rÃƒÂ¨gle des tiers.' },
        ],
        tip: 'Investissement utile : une grande feuille de carton blanc (100 DA) et un rouleau de papier de fond blanc (disponible en papeterie) vous servent de studio portable.',
      },
      {
        id:       'p3',
        title:    'Applications gratuites de retouche',
        duration: '4 min',
        intro:    'Une lÃƒÂ©gÃƒÂ¨re retouche peut transformer une photo correcte en photo professionnelle. Voici les outils gratuits.',
        steps: [
          { text: 'Pour Android : Snapseed (Google, gratuit, trÃƒÂ¨s puissant). Pour iPhone : Photos natif + Lightroom Mobile (version gratuite suffit).' },
          { text: 'Retouches de base pour chaque photo : +lÃƒÂ©gÃƒÂ¨re luminositÃƒÂ© (+10 ÃƒÂ  +15), +contraste (+5 ÃƒÂ  +10), fond blanc ÃƒÂ  +10 de luminositÃƒÂ©.' },
          { text: 'Pour effacer un fond : Background Eraser (Android) ou Remove.bg (site web gratuit Ã¢â‚¬â€ uploadez la photo et le fond est supprimÃƒÂ© automatiquement).' },
          { text: 'Pour uniformiser les fonds : utilisez l\'outil "RÃƒÂ©glages de l\'image" dans Snapseed pour ÃƒÂ©galiser les zones trop sombres.', tip: 'Traitement en lot : Snapseed permet de copier les rÃƒÂ©glages d\'une photo et de les appliquer ÃƒÂ  toute une sÃƒÂ©rie Ã¢â‚¬â€ un gain de temps ÃƒÂ©norme.' },
          { text: 'Exportez en JPEG ÃƒÂ  qualitÃƒÂ© 90% pour un bon compromis taille/qualitÃƒÂ©.' },
        ],
      },
      {
        id:       'p4',
        title:    'VidÃƒÂ©os courtes : +40% de conversions',
        duration: '7 min',
        intro:    'Une vidÃƒÂ©o de 15-30 secondes montrant le produit sous tous les angles ou en utilisation rÃƒÂ©elle est votre atout le plus puissant.',
        steps: [
          { text: 'Format idÃƒÂ©al : vidÃƒÂ©o verticale (9:16) de 15 ÃƒÂ  30 secondes. Pas besoin de son Ã¢â‚¬â€ la plupart des utilisateurs regardent sans son.' },
          { text: 'DÃƒÂ©marrez avec le produit fermÃƒÂ© dans son emballage, puis dÃƒÂ©ballez-le lentement pour montrer la prÃƒÂ©sentation.' },
          { text: 'Faites tourner le produit ÃƒÂ  360Ã‚Â° devant la camÃƒÂ©ra. Pour les vÃƒÂªtements, montrez le tissu se dÃƒÂ©placer pour illustrer la fluiditÃƒÂ© ou la rigiditÃƒÂ©.' },
          { text: 'Incluez une dÃƒÂ©monstration d\'utilisation si pertinent : ouvrir/fermer un sac, allumer/ÃƒÂ©teindre un appareil, appliquer un cosmÃƒÂ©tique.' },
          { text: 'Ajoutez le prix et vos informations de contact en texte superposÃƒÂ© avec CapCut (Android/iPhone, gratuit).', tip: 'CapCut a des modÃƒÂ¨les prÃƒÂªts pour les vidÃƒÂ©os produits Ã¢â‚¬â€ sÃƒÂ©lectionnez votre fichier vidÃƒÂ©o et adaptez le modÃƒÂ¨le.' },
          { text: 'Uploadez la vidÃƒÂ©o dans la fiche produit StoreDz. Elle s\'affiche dans le carrousel d\'images.' },
        ],
      },
    ],
  },

  // Ã¢â€â‚¬Ã¢â€â‚¬ 4. PRICING Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  {
    id:      'pricing',
    title:   'Fixer le bon prix',
    icon:    Tag,
    color:   'text-amber-600',
    bg:      'bg-amber-50',
    badge:   'IntermÃƒÂ©diaire',
    badgeBg: 'bg-amber-100 text-amber-700',
    desc:    'Calculez vos coÃƒÂ»ts, trouvez le prix qui maximise profit et volume, gÃƒÂ©rez les promotions efficacement.',
    lessons: [
      {
        id:       'pr1',
        title:    'Calculer votre prix de revient complet',
        duration: '6 min',
        intro:    'Trop de vendeurs fixent leurs prix ÃƒÂ  l\'intuition et perdent de l\'argent sans le savoir. Voici la formule exacte.',
        steps: [
          { text: 'CoÃƒÂ»t d\'achat : prix que vous payez pour le produit (incluez le transport depuis votre fournisseur).' },
          { text: 'Frais de livraison client : selon le transporteur et la wilaya. En moyenne, comptez 350-500 DA pour la zone nord, 500-700 DA pour le sud.' },
          { text: 'StoreDz ne prend aucune commission sur vos ventes. Votre seul frais fixe est l\'abonnement mensuel (Starter 2 000 DA Ã‚Â· Pro 5 000 DA Ã‚Â· Business 9 000 DA).' },
          { text: 'Emballage : carton + papier bulle + scotch + bordereau = environ 50-100 DA par envoi pour un dÃƒÂ©butant.', tip: 'En gros, une boÃƒÂ®te carton coÃƒÂ»te 15-25 DA. Achetez en lot de 50-100 pour rÃƒÂ©duire les coÃƒÂ»ts.' },
          { text: 'Formule : Prix minimum = Achat + Emballage + Livraison + marge souhaitÃƒÂ©e. Exemple : 500 + 80 + 450 + 600 = 1 630 DA. Sans commission, votre marge est 100% ÃƒÂ  vous.' },
          { text: 'Utilisez un tableur simple (Google Sheets gratuit) pour calculer le prix de revient de chaque produit.', tip: 'CrÃƒÂ©ez une ligne par produit avec la formule Ã¢â‚¬â€ vous verrez instantanÃƒÂ©ment si votre prix couvre tous vos frais.' },
        ],
      },
      {
        id:       'pr2',
        title:    'Psychologie du prix en AlgÃƒÂ©rie',
        duration: '5 min',
        intro:    'Le comportement d\'achat algÃƒÂ©rien a ses propres codes. Ces techniques augmentent votre taux de conversion sans baisser vos marges.',
        steps: [
          { text: 'Prix se terminant par 99 ou 90 : 1999 DA se perÃƒÂ§oit beaucoup moins cher que 2000 DA. Utilisez cette technique sur vos produits de moins de 5000 DA.', tip: 'Au-dessus de 5000 DA, les prix ronds (5000 DA) sont perÃƒÂ§us comme plus sÃƒÂ©rieux. Ajustez selon votre gamme.' },
          { text: 'Prix barrÃƒÂ© : si vous avez un prix comparatif (prix fournisseur affichÃƒÂ©, prix marchÃƒÂ©), affichez-le barrÃƒÂ©. Les acheteurs aiment sentir qu\'ils font une affaire.' },
          { text: 'Ancrage : proposez une version premium ÃƒÂ  un prix plus ÃƒÂ©levÃƒÂ©. Le produit de base paraÃƒÂ®t plus accessible en comparaison.' },
          { text: 'Livraison gratuite : si possible, intÃƒÂ©grez les frais de livraison dans le prix et affichez "Livraison gratuite". La mention "Livraison gratuite" convertit mieux que "-200 DA sur le prix".', tip: '"Livraison gratuite" est l\'un des messages les plus convertissants dans le e-commerce algÃƒÂ©rien.' },
          { text: 'Urgence : "Plus que 3 en stock" ou "Offre valable jusqu\'au [date]" accÃƒÂ©lÃƒÂ¨re la dÃƒÂ©cision d\'achat.' },
        ],
      },
      {
        id:       'pr3',
        title:    'Codes promo et ventes flash',
        duration: '7 min',
        intro:    'Les promotions bien utilisÃƒÂ©es boostent les ventes. Mal utilisÃƒÂ©es, elles dÃƒÂ©truisent vos marges. Voici comment les maÃƒÂ®triser.',
        steps: [
          { text: 'CrÃƒÂ©ez vos codes promo dans "Promotions" Ã¢â€ â€™ "Nouveau code". Choisissez un code mÃƒÂ©morable (RAMADAN10, SOLDES20) et dÃƒÂ©finissez le montant ou le pourcentage de rÃƒÂ©duction.' },
          { text: 'Codes ÃƒÂ  valeur fixe (ex: -300 DA) vs pourcentage (ex: -10%) : les codes ÃƒÂ  valeur fixe fonctionnent mieux sur les produits de moins de 3000 DA. Les pourcentages sur les produits plus chers.' },
          { text: 'Limitez la durÃƒÂ©e (3-7 jours maximum) et le nombre d\'utilisations pour crÃƒÂ©er l\'urgence.' },
          { text: 'Ventes flash : activez-les dans "Promotions" Ã¢â€ â€™ "Vente Flash". DÃƒÂ©finissez un stock limitÃƒÂ© et une durÃƒÂ©e courte (4-24 heures). Annoncez la vente flash 1-2 heures avant sur WhatsApp.', tip: 'Programmez vos ventes flash le vendredi soir ou le week-end Ã¢â‚¬â€ c\'est quand les algÃƒÂ©riens achÃƒÂ¨tent le plus en ligne.' },
          { text: 'Marge minimum : ne faites jamais une promotion qui vous met en dessous de votre prix de revient complet. Calculez d\'abord.' },
        ],
        warning: 'Les promotions trop frÃƒÂ©quentes habituent les clients ÃƒÂ  attendre les soldes. Limitez ÃƒÂ  2-3 promotions par mois maximum.',
      },
    ],
  },

  // Ã¢â€â‚¬Ã¢â€â‚¬ 5. ORDERS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  {
    id:      'orders',
    title:   'GÃƒÂ©rer les commandes',
    icon:    Truck,
    color:   'text-blue-600',
    bg:      'bg-blue-50',
    badge:   'DÃƒÂ©butant',
    badgeBg: 'bg-blue-100 text-blue-700',
    desc:    'Confirmez rapidement, expÃƒÂ©diez sans erreur et rÃƒÂ©duisez vos retours au minimum.',
    lessons: [
      {
        id:       'o1',
        title:    'Confirmer une commande en 2 minutes',
        duration: '3 min',
        intro:    'La rapiditÃƒÂ© de confirmation est le premier critÃƒÂ¨re de satisfaction client. Voici un processus en 3 ÃƒÂ©tapes.',
        steps: [
          { text: 'Recevez la notification de commande Ã¢â€ â€™ ouvrez votre tableau de bord StoreDz.' },
          { text: 'Appelez le client (numÃƒÂ©ro visible dans la commande). Script : "Bonjour [PrÃƒÂ©nom], boutique [Nom]. Je confirme votre commande de [Produit]. Vous ÃƒÂªtes toujours disponible ÃƒÂ  [Adresse] ?"', tip: 'Appelez dans les 2 heures. PassÃƒÂ© ce dÃƒÂ©lai, le client perd confiance et risque de commander ailleurs.' },
          { text: 'Si le client confirme : cliquez sur "Confirmer la commande" dans StoreDz. Le stock est automatiquement dÃƒÂ©duit. Si le client ne rÃƒÂ©pond pas : laissez en "En attente" et rÃƒÂ©essayez 2 fois ÃƒÂ  des heures diffÃƒÂ©rentes avant d\'annuler.' },
        ],
      },
      {
        id:       'o2',
        title:    'Emballer correctement vos colis',
        duration: '6 min',
        intro:    'Un colis qui arrive abÃƒÂ®mÃƒÂ© = un retour + un client perdu + une mauvaise avis. L\'emballage est votre protection.',
        steps: [
          { text: 'MatÃƒÂ©riel minimum : carton adaptÃƒÂ© ÃƒÂ  la taille du produit, papier bulle ou papier de soie, scotch large renforcÃƒÂ©, marqueur.' },
          { text: 'Enveloppez chaque produit individuel dans du papier bulle avant de le mettre dans le carton. Remplissez les vides avec du papier froissÃƒÂ©.' },
          { text: 'Scellez toutes les arÃƒÂªtes du carton avec du scotch. Un minimum de 4 bandes de scotch sur la face principale.', tip: 'Choisissez un carton lÃƒÂ©gÃƒÂ¨rement plus grand que le produit Ã¢â‚¬â€ le rembourrage interne protÃƒÂ¨ge mieux.' },
          { text: 'Collez le bon de livraison de maniÃƒÂ¨re visible et sÃƒÂ©curisÃƒÂ©e. ProtÃƒÂ©gez-le avec un scotch transparent ou une poche de protection si vous ÃƒÂªtes dans une rÃƒÂ©gion pluvieuse.' },
          { text: 'Ajoutez votre carte de visite ou un bon de rÃƒÂ©duction pour la prochaine commande ÃƒÂ  l\'intÃƒÂ©rieur Ã¢â‚¬â€ 30% des clients qui reÃƒÂ§oivent une carte de visite commandent ÃƒÂ  nouveau.' },
        ],
      },
      {
        id:       'o3',
        title:    'Choisir le bon transporteur par wilaya',
        duration: '5 min',
        intro:    'Chaque transporteur a ses points forts. ConnaÃƒÂ®tre les diffÃƒÂ©rences vous permet d\'optimiser dÃƒÂ©lais et coÃƒÂ»ts.',
        steps: [
          { text: 'Yalidine : couverture nationale complÃƒÂ¨te (58 wilayas), suivi en temps rÃƒÂ©el, application client intÃƒÂ©grÃƒÂ©e. IdÃƒÂ©al pour dÃƒÂ©butants et volume moyen.', tip: 'Yalidine est le plus populaire pour le e-commerce B2C. Ils ont une API bien documentÃƒÂ©e.' },
          { text: 'ZR Express : trÃƒÂ¨s rapide sur les grandes villes (Alger, Oran, Constantine Ã¢â‚¬â€ livraison J+1). Tarifs compÃƒÂ©titifs sur le nord.' },
          { text: 'Procolis : agrÃƒÂ©gateur qui combine plusieurs transporteurs Ã¢â‚¬â€ vous choisissez automatiquement le moins cher pour chaque wilaya. IntÃƒÂ©ressant pour optimiser les coÃƒÂ»ts ÃƒÂ  volume ÃƒÂ©levÃƒÂ©.' },
          { text: 'Pour les rÃƒÂ©gions ÃƒÂ©loignÃƒÂ©es (Tamanrasset, Tindouf, Illizi) : prÃƒÂ©voyez 5-10 jours de dÃƒÂ©lai avec un supplÃƒÂ©ment de 200-400 DA.' },
          { text: 'NÃƒÂ©gociez votre tarif dÃƒÂ¨s 30-50 expÃƒÂ©ditions par mois. Un tarif personnalisÃƒÂ© peut rÃƒÂ©duire vos coÃƒÂ»ts de 15-25%.' },
        ],
      },
      {
        id:       'o4',
        title:    'RÃƒÂ©duire les retours : le script de confirmation',
        duration: '8 min',
        intro:    'Un taux de retour ÃƒÂ©levÃƒÂ© (>15%) dÃƒÂ©truit vos marges. Ces techniques simples le font tomber sous les 5%.',
        steps: [
          { text: 'Script de confirmation tÃƒÂ©lÃƒÂ©phonique complet (adaptez avec vos propres mots) :', tip: 'Appelez depuis un numÃƒÂ©ro WhatsApp enregistrÃƒÂ© comme votre boutique.' },
          { text: '"Bonjour, je suis [PrÃƒÂ©nom] de la boutique [Nom]. Je vous appelle pour confirmer votre commande de [produit] ÃƒÂ  [montant] DA. C\'est bien vous ?"' },
          { text: '"Votre adresse c\'est bien [adresse] ? Ãƒâ‚¬ [wilaya] ? Vous serez disponible pour recevoir le colis ?"' },
          { text: '"La livraison prend entre [X] et [Y] jours. Le livreur vous appellera avant d\'arriver. PrÃƒÂ©parez [montant] DA en espÃƒÂ¨ces s\'il vous plaÃƒÂ®t."' },
          { text: '"Y a-t-il quelque chose que vous voulez vÃƒÂ©rifier sur le produit ?" Ã¢â‚¬â€ RÃƒÂ©pondez aux questions pour ÃƒÂ©viter les mauvaises surprises ÃƒÂ  la livraison.' },
          { text: '"Parfait, votre commande est confirmÃƒÂ©e. Je vous envoie le numÃƒÂ©ro de suivi par WhatsApp dÃƒÂ¨s l\'expÃƒÂ©dition. Merci et bonne journÃƒÂ©e !"' },
          { text: 'Envoyez le numÃƒÂ©ro de suivi par WhatsApp le jour de l\'expÃƒÂ©dition. Un client informÃƒÂ© refuse rarement sa livraison.' },
        ],
      },
    ],
  },

  // Ã¢â€â‚¬Ã¢â€â‚¬ 6. MARKETING Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  {
    id:      'marketing',
    title:   'Marketing & acquisition',
    icon:    TrendingUp,
    color:   'text-rose-600',
    bg:      'bg-rose-50',
    badge:   'IntermÃƒÂ©diaire',
    badgeBg: 'bg-rose-100 text-rose-700',
    desc:    'Attirez vos premiers acheteurs via Facebook, Instagram et WhatsApp gratuitement.',
    lessons: [
      {
        id:       'm1',
        title:    'StratÃƒÂ©gie de contenu gratuite pour dÃƒÂ©butants',
        duration: '8 min',
        intro:    'Vous n\'avez pas besoin d\'un budget publicitaire pour dÃƒÂ©marrer. Voici comment obtenir vos premiÃƒÂ¨res ventes organiquement.',
        steps: [
          { text: 'CrÃƒÂ©ez un groupe WhatsApp dÃƒÂ©diÃƒÂ© ÃƒÂ  votre boutique : "Boutique [Nom] Ã¢â‚¬â€ NouveautÃƒÂ©s et promos". Invitez vos contacts proches en premier, puis demandez-leur d\'inviter leurs connaissances intÃƒÂ©ressÃƒÂ©es.', tip: 'Un groupe WhatsApp de 200-300 membres engagÃƒÂ©s vaut plus que 10 000 abonnÃƒÂ©s Facebook inactifs.' },
          { text: 'Calendrier de publications : 3 publications par semaine minimum. Lundi : nouveau produit. Mercredi : tÃƒÂ©moignage client ou photo de livraison. Vendredi : promo du week-end.' },
          { text: 'Dans chaque publication, incluez : photo du produit, prix, lien StoreDz, et "Livraison partout en AlgÃƒÂ©rie".' },
          { text: 'Rejoignez des groupes Facebook de vente de votre wilaya et de votre niche. Publiez vos produits dans ces groupes (maximum 1 publication par groupe par jour pour ne pas ÃƒÂªtre banni).', tip: 'Cherchez sur Facebook : "vente [votre produit] [votre wilaya]". Vous trouverez des groupes actifs.' },
          { text: 'Stories Instagram : publiez 2-3 stories par jour montrant vos produits, les commandes en cours, ou les prÃƒÂ©parations d\'envoi. L\'authenticitÃƒÂ© vend mieux que le perfectionnisme.' },
        ],
      },
      {
        id:       'm2',
        title:    'WhatsApp Business : catalogue et automatisation',
        duration: '9 min',
        intro:    'WhatsApp Business est l\'outil numÃƒÂ©ro 1 du commerce algÃƒÂ©rien. Ces fonctionnalitÃƒÂ©s gratuites vous font gagner des heures chaque semaine.',
        steps: [
          { text: 'TÃƒÂ©lÃƒÂ©chargez WhatsApp Business (version distincte de WhatsApp personnel) et crÃƒÂ©ez un profil professionnel avec votre logo, description et lien StoreDz.' },
          { text: 'Catalogue : ajoutez vos produits avec photos, prix et description. Les clients peuvent voir et commander depuis WhatsApp directement.', tip: 'Le catalogue WhatsApp Business est directement partageable Ã¢â‚¬â€ envoyez le lien dans vos groupes et stories.' },
          { text: 'Messages automatiques Ã¢â‚¬â€ message de bienvenue : "Bonjour et bienvenue chez [Boutique] ! Je reviens vers vous dans les plus brefs dÃƒÂ©lais. En attendant, dÃƒÂ©couvrez notre catalogue : [lien]."' },
          { text: 'Message d\'absence : programmez-le pour les nuits et week-ends : "Bonjour ! Votre message a bien ÃƒÂ©tÃƒÂ© reÃƒÂ§u. Notre ÃƒÂ©quipe vous rÃƒÂ©pond durant les heures d\'ouverture (9h-20h). Commandez en ligne 24h/24 : [lien]."' },
          { text: 'RÃƒÂ©ponses rapides : crÃƒÂ©ez des raccourcis pour vos rÃƒÂ©ponses frÃƒÂ©quentes. Tapez "/prix" et votre liste de prix s\'envoie automatiquement. CrÃƒÂ©ez des raccourcis pour les questions sur la livraison, les tailles, etc.' },
          { text: 'Ãƒâ€°tiquettes de contacts : organisez vos clients en catÃƒÂ©gories (Nouveau client, Client fidÃƒÂ¨le, Commande en cours, Ãƒâ‚¬ relancer) pour cibler vos messages.', tip: 'Un "Client fidÃƒÂ¨le" qui commande rÃƒÂ©guliÃƒÂ¨rement mÃƒÂ©rite un code promo exclusif. Segmentez vos contacts pour personnaliser.' },
        ],
      },
      {
        id:       'm3',
        title:    'PremiÃƒÂ¨res publicitÃƒÂ©s Facebook : budget 500 DA/jour',
        duration: '12 min',
        intro:    'Une publicitÃƒÂ© Facebook bien ciblÃƒÂ©e avec 500 DA/jour peut gÃƒÂ©nÃƒÂ©rer 5-10 ventes supplÃƒÂ©mentaires. Voici comment commencer sans gaspiller.',
        steps: [
          { text: 'PrÃƒÂ©requis : une Page Facebook professionnelle pour votre boutique, un compte Facebook Ads Manager (gratuit, sur business.facebook.com).' },
          { text: 'CrÃƒÂ©ez une publication avec votre meilleur produit sur votre Page : belle photo, prix, lien StoreDz, appel ÃƒÂ  l\'action clair ("Commander ici : [lien]").', tip: 'Ne boostez jamais une publication mÃƒÂ©diocre. Si la photo et le texte ne fonctionnent pas organiquement, la pub ne les amÃƒÂ©liorera pas.' },
          { text: 'Dans Ads Manager : crÃƒÂ©ez une campagne avec l\'objectif "Trafic" ou "Conversions". Ciblez l\'AlgÃƒÂ©rie, tranches d\'ÃƒÂ¢ge 18-45, centres d\'intÃƒÂ©rÃƒÂªt liÃƒÂ©s ÃƒÂ  votre produit.', tip: 'Commencez avec une audience large (tout l\'AlgÃƒÂ©rie) plutÃƒÂ´t que gÃƒÂ©o-restreinte. Affinez ensuite selon les rÃƒÂ©sultats.' },
          { text: 'Budget journalier : commencez ÃƒÂ  500 DA/jour pendant 5 jours. C\'est suffisant pour tester l\'audience et optimiser.' },
          { text: 'MÃƒÂ©triques ÃƒÂ  surveiller aprÃƒÂ¨s 3 jours : CoÃƒÂ»t Par Clic (CPC) idÃƒÂ©alement < 30 DA. Taux de clics (CTR) idÃƒÂ©alement > 1%. CoÃƒÂ»t par achat idÃƒÂ©alement < 1/3 de votre marge.' },
          { text: 'Si les rÃƒÂ©sultats sont positifs (ROAS > 2x), augmentez le budget de 20% tous les 2-3 jours. Si nÃƒÂ©gatifs, changez la photo ou le texte et retestez.' },
        ],
        tip: 'La rÃƒÂ¨gle des 50 : donnez ÃƒÂ  Facebook au moins 50 conversions (clics sur le lien) avant de tirer des conclusions sur une audience ou une crÃƒÂ©ative.',
        warning: 'Ne boostez jamais directement un post depuis la page Facebook Ã¢â‚¬â€ cela limite les options de ciblage. Utilisez toujours Ads Manager.',
      },
    ],
  },

  // Ã¢â€â‚¬Ã¢â€â‚¬ 7. SERVICE CLIENT Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  {
    id:      'customer',
    title:   'Service client',
    icon:    MessageSquare,
    color:   'text-cyan-600',
    bg:      'bg-cyan-50',
    badge:   'IntermÃƒÂ©diaire',
    badgeBg: 'bg-cyan-100 text-cyan-700',
    desc:    'Transformez chaque client en ambassadeur grÃƒÂ¢ce ÃƒÂ  une expÃƒÂ©rience d\'achat mÃƒÂ©morable.',
    lessons: [
      {
        id:       'c1',
        title:    'Les 5 messages WhatsApp qui fidÃƒÂ©lisent',
        duration: '5 min',
        intro:    'Le suivi client aprÃƒÂ¨s l\'achat est l\'investissement le moins coÃƒÂ»teux et le plus rentable. Ces 5 messages peuvent tripler votre taux de clients rÃƒÂ©guliers.',
        steps: [
          { text: 'Message 1 Ã¢â‚¬â€ Confirmation de commande (envoyez dans l\'heure suivant la commande) : "Bonjour [PrÃƒÂ©nom] ! Ã°Å¸Å½â€° Votre commande [numÃƒÂ©ro] est confirmÃƒÂ©e. Je prÃƒÂ©pare votre [produit] maintenant. Vous recevrez le numÃƒÂ©ro de suivi dÃƒÂ¨s l\'expÃƒÂ©dition. Merci pour votre confiance !"' },
          { text: 'Message 2 Ã¢â‚¬â€ ExpÃƒÂ©dition (envoyez le jour de l\'envoi) : "Bonne nouvelle ! Votre commande est en route Ã°Å¸â€œÂ¦ NumÃƒÂ©ro de suivi : [numÃƒÂ©ro]. Suivez votre colis ici : [lien transporteur]. Livraison estimÃƒÂ©e dans [X] jours."' },
          { text: 'Message 3 Ã¢â‚¬â€ ArrivÃƒÂ©e imminente (la veille ou le matin de la livraison) : "Bonjour [PrÃƒÂ©nom], votre commande arrive aujourd\'hui ! Le livreur vous appellera avant de passer. PrÃƒÂ©parez [montant] DA en espÃƒÂ¨ces. Ãƒâ‚¬ tout ÃƒÂ  l\'heure !"', tip: 'Ce message rÃƒÂ©duit le taux de refus de 25%. Le client est prÃƒÂ©parÃƒÂ© et disponible.' },
          { text: 'Message 4 Ã¢â‚¬â€ Satisfaction (2 jours aprÃƒÂ¨s livraison) : "Bonjour [PrÃƒÂ©nom], j\'espÃƒÂ¨re que votre [produit] vous plaÃƒÂ®t ! Ã°Å¸ËœÅ  N\'hÃƒÂ©sitez pas ÃƒÂ  me contacter si vous avez des questions. Un avis sur StoreDz m\'aiderait beaucoup : [lien]. Merci !"' },
          { text: 'Message 5 Ã¢â‚¬â€ Relance fidÃƒÂ©litÃƒÂ© (aprÃƒÂ¨s 30 jours) : "Bonjour [PrÃƒÂ©nom], de nouveaux articles sont arrivÃƒÂ©s ! Rien que pour vous, voici un code promo : [CODE] (-15% sur votre prochaine commande). Valable jusqu\'au [date] Ã°Å¸Å½Â"' },
        ],
        tip: 'CrÃƒÂ©ez ces 5 messages dans les "RÃƒÂ©ponses rapides" de WhatsApp Business et personnalisez en 30 secondes pour chaque client.',
      },
      {
        id:       'c2',
        title:    'RÃƒÂ©pondre aux avis nÃƒÂ©gatifs sans perdre de clients',
        duration: '6 min',
        intro:    'Un avis nÃƒÂ©gatif bien gÃƒÂ©rÃƒÂ© peut devenir votre meilleure publicitÃƒÂ©. La faÃƒÂ§on dont vous rÃƒÂ©pondez est observÃƒÂ©e par de futurs acheteurs.',
        steps: [
          { text: 'RÃƒÂ©pondez dans les 24 heures. Plus vous attendez, plus l\'avis nÃƒÂ©gatif accumule des vues sans rÃƒÂ©ponse.' },
          { text: 'Structure de rÃƒÂ©ponse : 1) Remerciez pour le retour. 2) Reconnaissez le problÃƒÂ¨me sans vous justifier. 3) Proposez une solution concrÃƒÂ¨te. 4) Terminez positivement.', tip: 'Ne supprimez jamais un avis nÃƒÂ©gatif Ã¢â‚¬â€ les acheteurs savent que les vendeurs qui n\'ont que des avis 5 ÃƒÂ©toiles suppriment les critiques.' },
          { text: 'Exemple de rÃƒÂ©ponse : "Bonjour [PrÃƒÂ©nom], merci pour votre retour honnÃƒÂªte. Je suis vraiment dÃƒÂ©solÃƒÂ© que l\'article ne corresponde pas ÃƒÂ  vos attentes. Pouvez-vous me contacter directement sur WhatsApp pour qu\'on trouve une solution ensemble ? Je veux absolument que vous soyez satisfait."' },
          { text: 'Contactez le client en privÃƒÂ© (WhatsApp) pour rÃƒÂ©soudre le problÃƒÂ¨me : remplacement, remboursement partiel, retour. Trouvez un accord.' },
          { text: 'Demandez au client de mettre ÃƒÂ  jour son avis aprÃƒÂ¨s rÃƒÂ©solution. Un avis 2 ÃƒÂ©toiles mis ÃƒÂ  jour en 4 ÃƒÂ©toiles est votre meilleure preuve de service client sÃƒÂ©rieux.' },
        ],
      },
    ],
  },

  // Ã¢â€â‚¬Ã¢â€â‚¬ 8. ANALYTIQUES Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  {
    id:      'analytics',
    title:   'Lire vos statistiques',
    icon:    BarChart2,
    color:   'text-indigo-600',
    bg:      'bg-indigo-50',
    badge:   'AvancÃƒÂ©',
    badgeBg: 'bg-indigo-100 text-indigo-700',
    desc:    'Comprenez vos chiffres pour prendre de meilleures dÃƒÂ©cisions et scaler votre activitÃƒÂ©.',
    lessons: [
      {
        id:       'a1',
        title:    'Les 4 mÃƒÂ©triques essentielles de votre boutique',
        duration: '5 min',
        intro:    'Vous n\'avez pas besoin d\'un MBA pour analyser votre activitÃƒÂ©. Ces 4 mÃƒÂ©triques vous donnent tout ce dont vous avez besoin.',
        steps: [
          { text: 'Taux de conversion : (nombre de commandes / nombre de visiteurs) Ãƒâ€” 100. Un bon taux pour le e-commerce algÃƒÂ©rien est 1-3%. En dessous de 1%, amÃƒÂ©liorez vos photos et votre description.', tip: 'VÃƒÂ©rifiez votre taux de conversion dans "Analytiques" de votre tableau de bord StoreDz.' },
          { text: 'Panier moyen : chiffre d\'affaires total / nombre de commandes. Augmentez-le en proposant des produits complÃƒÂ©mentaires ou des bundles.', tip: 'Si votre panier moyen est < 1500 DA, essayez de proposer un deuxiÃƒÂ¨me article ÃƒÂ  -20% lors de la confirmation tÃƒÂ©lÃƒÂ©phonique.' },
          { text: 'Taux de retour : (commandes retournÃƒÂ©es / commandes expÃƒÂ©diÃƒÂ©es) Ãƒâ€” 100. Cible : < 10%. Au-dessus de 15%, retravailler vos photos et descriptions.', tip: 'Identifiez quel produit a le plus de retours Ã¢â‚¬â€ c\'est gÃƒÂ©nÃƒÂ©ralement 1-2 produits qui faussent toute la moyenne.' },
          { text: 'Taux de refus COD : (colis refusÃƒÂ©s / colis expÃƒÂ©diÃƒÂ©s) Ãƒâ€” 100. Cible : < 10%. Au-dessus de 20%, renforcez le protocole de confirmation tÃƒÂ©lÃƒÂ©phonique.' },
          { text: 'Consultez ces mÃƒÂ©triques chaque lundi matin et comparez avec la semaine prÃƒÂ©cÃƒÂ©dente. Notez les variations inhabituelles et cherchez-en la cause.' },
        ],
      },
      {
        id:       'a2',
        title:    'Identifier vos produits gagnants et perdants',
        duration: '6 min',
        intro:    'Votre catalogue contient probablement 2-3 produits qui font 60-70% de votre chiffre d\'affaires. Identifiez-les et doublez la mise sur eux.',
        steps: [
          { text: 'Dans "Analytiques", triez vos produits par chiffre d\'affaires sur les 30 derniers jours. Les 20% de produits en tÃƒÂªte reprÃƒÂ©sentent gÃƒÂ©nÃƒÂ©ralement 80% du CA (rÃƒÂ¨gle de Pareto).', tip: 'C\'est la rÃƒÂ¨gle 80/20 Ã¢â‚¬â€ concentrez votre stock, vos publicitÃƒÂ©s et vos photos sur ces 20%.' },
          { text: 'Triez aussi par taux de conversion produit. Un produit trÃƒÂ¨s vu mais peu commandÃƒÂ© a un problÃƒÂ¨me de prix, de photos ou de description.' },
          { text: 'Produits gagnants (CA ÃƒÂ©levÃƒÂ© + taux de conversion ÃƒÂ©levÃƒÂ©) : augmentez le stock, investissez en publicitÃƒÂ©, crÃƒÂ©ez des variantes.' },
          { text: 'Produits perdants (vues mais peu de ventes) : retravaillez les photos, ajustez le prix, amÃƒÂ©liorez la description. Si ÃƒÂ§a ne change rien aprÃƒÂ¨s 30 jours, retirez le produit.' },
          { text: 'Produits de niche (peu de vues mais bon taux de conversion) : rÃƒÂ©servÃƒÂ©s aux acheteurs ciblÃƒÂ©s. Rentables ÃƒÂ  faible volume Ã¢â‚¬â€ conservez-les.' },
        ],
      },
    ],
  },

  // Ã¢â€â‚¬Ã¢â€â‚¬ 9. SCALER Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  {
    id:      'scale',
    title:   'Scaler votre activitÃƒÂ©',
    icon:    Zap,
    color:   'text-orange-600',
    bg:      'bg-orange-50',
    badge:   'AvancÃƒÂ©',
    badgeBg: 'bg-orange-100 text-orange-700',
    desc:    'Automatisez, dÃƒÂ©lÃƒÂ©guez et dÃƒÂ©veloppez votre business au-delÃƒÂ  de votre capacitÃƒÂ© individuelle.',
    lessons: [
      {
        id:       'sc1',
        title:    'Passer de 10 ÃƒÂ  100 commandes par mois',
        duration: '10 min',
        intro:    'La croissance de 10 ÃƒÂ  100 commandes nÃƒÂ©cessite de changer votre faÃƒÂ§on de travailler, pas juste de travailler plus.',
        steps: [
          { text: 'Ãƒâ‚¬ 10-30 commandes/mois : tout gÃƒÂ©rer seul est possible. Optimisez votre processus : traitement des commandes en batch 2Ãƒâ€” par jour (matin 9h et soir 18h).' },
          { text: 'Ãƒâ‚¬ 30-50 commandes/mois : recrutez un premier assistant (famille, ami de confiance) pour les appels de confirmation et la prÃƒÂ©paration des colis.', tip: 'Payez ÃƒÂ  la commande (100-150 DA/commande traitÃƒÂ©e) plutÃƒÂ´t qu\'un salaire fixe pour commencer.' },
          { text: 'Standardisez votre espace d\'emballage : tout doit ÃƒÂªtre ÃƒÂ  portÃƒÂ©e de main. Un poste d\'emballage efficace permet de prÃƒÂ©parer 3Ãƒâ€” plus de colis en mÃƒÂªme temps.' },
          { text: 'Ãƒâ‚¬ 50-100 commandes/mois : nÃƒÂ©gociez des tarifs transporteur personnalisÃƒÂ©s. Yalidine, ZR Express et Procolis offrent tous des prix dÃƒÂ©gressifs ÃƒÂ  partir de 30-50 envois/mois.' },
          { text: 'Automatisez au maximum : confirmations automatiques (WhatsApp API), ÃƒÂ©tiquettes de transport en masse, rapports de suivi automatisÃƒÂ©s.' },
          { text: 'Diversifiez les canaux d\'acquisition : Facebook Ads + WhatsApp organique + groupes + influence = 4 sources indÃƒÂ©pendantes qui ne s\'annulent pas si l\'une baisse.' },
        ],
        tip: 'La croissance la plus solide vient de clients rÃƒÂ©currents. Investissez autant dans la fidÃƒÂ©lisation que dans l\'acquisition.',
      },
      {
        id:       'sc2',
        title:    'Travailler avec les fournisseurs en gros',
        duration: '10 min',
        intro:    'Ãƒâ‚¬ partir de 50 commandes/mois, le prix d\'achat devient votre levier principal. Voici comment accÃƒÂ©der aux fournisseurs grossistes algÃƒÂ©riens.',
        steps: [
          { text: 'MarchÃƒÂ©s de gros algÃƒÂ©riens par niche : vÃƒÂªtements Ã¢â€ â€™ marchÃƒÂ© Hamiz (Alger), Souk El-Fellah (Oran). Ãƒâ€°lectronique Ã¢â€ â€™ Bab Ezzouar, Bordj El Kiffan. CosmÃƒÂ©tiques Ã¢â€ â€™ Bir Mourad RaÃƒÂ¯s, Belouizdad.', tip: 'Visitez physiquement au moins 3-5 grossistes avant de choisir. NÃƒÂ©gociez les prix sur le tas.' },
          { text: 'Conditions de grossiste : en gÃƒÂ©nÃƒÂ©ral, minimum de commande de 5-10 piÃƒÂ¨ces par rÃƒÂ©fÃƒÂ©rence, prix 30-50% moins cher qu\'au dÃƒÂ©tail.' },
          { text: 'Pour les produits importÃƒÂ©s : Alibaba (Chine), 1688.com (Chine, moins cher, pas d\'anglais), MarchÃƒÂ© de Derb Omar (Casablanca via import). PrÃƒÂ©voyez 3-6 semaines de dÃƒÂ©lai et des frais de douane (15-25% selon la catÃƒÂ©gorie).', tip: 'Commencez par commander un ÃƒÂ©chantillon (1-5 piÃƒÂ¨ces) avant de commander en grande quantitÃƒÂ© Ã¢â‚¬â€ la qualitÃƒÂ© peut diffÃƒÂ©rer des photos.' },
          { text: 'Calculez votre prix de revient avec l\'achat groupÃƒÂ© : si vous commandez 50 piÃƒÂ¨ces ÃƒÂ  500 DA/piÃƒÂ¨ce au lieu de 800 DA, votre marge augmente de 300 DA par vente sans changer le prix.' },
          { text: 'GÃƒÂ©rez votre stock dans StoreDz en temps rÃƒÂ©el. Mettez ÃƒÂ  jour les quantitÃƒÂ©s dÃƒÂ¨s rÃƒÂ©ception de votre livraison grossiste.' },
        ],
      },
    ],
  },
]

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Translatable extra modules (Pixels + Delivery API) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

type Lang = 'fr' | 'en' | 'ar'

function getExtraModules(lang: Lang): Module[] {
  // Ã¢â€â‚¬Ã¢â€â‚¬ PIXELS MODULE Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const pixelsModule: Module = {
    id:      'pixels',
    title:   lang === 'ar' ? 'Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã™Æ’Ã˜Â³Ã™â€ž Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã™â€žÃ˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã¢â‚¬â€ MetaÃ˜Å’ GoogleÃ˜Å’ TikTok' : lang === 'en' ? 'Pixels & Ads Ã¢â‚¬â€ Meta, Google, TikTok' : 'Pixels & PublicitÃƒÂ© Ã¢â‚¬â€ Meta, Google, TikTok',
    icon:    Target,
    color:   'text-purple-600',
    bg:      'bg-purple-50',
    badge:   lang === 'ar' ? 'Ã™â€¦Ã˜ÂªÃ™â€šÃ˜Â¯Ã™â€¦' : lang === 'en' ? 'Advanced' : 'AvancÃƒÂ©',
    badgeBg: 'bg-purple-100 text-purple-700',
    desc:    lang === 'ar'
      ? 'Ã™Æ’Ã™Å Ã™ÂÃ™Å Ã˜Â© Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯ Ã˜Â¨Ã™Å Ã™Æ’Ã˜Â³Ã™â€ž Meta Ã™Ë†Google Analytics Ã™Ë†TikTok Ã™â€¦Ã˜Â¹ Ã˜Â§Ã™â€žÃ™â‚¬ API Ã™â€¦Ã™â€  Ã˜Â¬Ã™â€¡Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â§Ã˜Â¯Ã™â€¦ Ã™â€žÃ˜ÂªÃ˜ÂªÃ˜Â¨Ã˜Â¹ Ã™â€¦Ã˜Â¨Ã™Å Ã˜Â¹Ã˜Â§Ã˜ÂªÃ™Æ’ Ã˜Â¨Ã˜Â¯Ã™â€šÃ˜Â©.'
      : lang === 'en'
      ? 'Set up Meta Pixel, Google Analytics 4, and TikTok Pixel with server-side CAPI for accurate sales tracking.'
      : 'Configurez Meta Pixel, Google Analytics 4 et TikTok Pixel avec la CAPI serveur pour un suivi prÃƒÂ©cis de vos ventes.',
    lessons: lang === 'ar' ? [
      {
        id: 'px1',
        title: 'Meta Pixel + Conversions API Ã¢â‚¬â€ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯ Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â§Ã™â€¦Ã™â€ž',
        duration: '10 min',
        intro: 'Ã˜Â¨Ã™Å Ã™Æ’Ã˜Â³Ã™â€ž Meta Ã™Å Ã˜ÂªÃ˜ÂªÃ˜Â¨Ã˜Â¹ Ã˜Â²Ã™Ë†Ã˜Â§Ã˜Â± Ã™â€¦Ã˜ÂªÃ˜Â¬Ã˜Â±Ã™Æ’ Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜ÂµÃ™ÂÃ˜Â­. Conversions API Ã˜ÂªÃ˜Â±Ã˜Â³Ã™â€ž Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã˜Â§Ã˜Â¡ Ã™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â© Ã™â€¦Ã™â€  Ã˜Â®Ã˜Â§Ã˜Â¯Ã™â€¦Ã™â€ Ã˜Â§ Ã¢â‚¬â€ Ã˜ÂªÃ˜Â¹Ã™â€¦Ã™â€ž Ã˜Â­Ã˜ÂªÃ™â€° Ã™â€¦Ã˜Â¹ Ã˜Â£Ã˜Â¯Ã™Ë†Ã˜Â§Ã˜Âª Ã˜Â­Ã˜Â¬Ã˜Â¨ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã™â€žÃ˜Â§Ã™â€ Ã˜Â§Ã˜Âª.',
        steps: [
          { text: 'Ã˜Â£Ã™â€ Ã˜Â´Ã˜Â¦ Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ Meta Business Suite Ã˜Â¹Ã™â€žÃ™â€° business.facebook.com Ã˜Â¥Ã˜Â°Ã˜Â§ Ã™â€žÃ™â€¦ Ã™Å Ã™Æ’Ã™â€  Ã™â€žÃ˜Â¯Ã™Å Ã™Æ’ Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯. Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã˜Â¨Ã˜Â±Ã™Å Ã˜Â¯Ã™Æ’ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã™â€¡Ã™â€ Ã™Å .', tip: 'Ã˜Â±Ã˜Â¨Ã˜Â· Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨Ã™Æ’ Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â®Ã˜ÂµÃ™Å  Ã˜Â¨Ã™â‚¬ Business Suite Ã™Å Ã™â€¦Ã™â€ Ã˜Â­Ã™Æ’ Ã™Ë†Ã˜ÂµÃ™Ë†Ã™â€žÃ˜Â§Ã™â€¹ Ã™â€žÃ˜Â¬Ã™â€¦Ã™Å Ã˜Â¹ Ã˜Â£Ã˜Â¯Ã™Ë†Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã™â€žÃ˜Â§Ã™â€ Ã˜Â§Ã˜Âª.' },
          { text: 'Ã™ÂÃ™Å  Business Suite Ã¢â€ Â Events Manager Ã¢â€ Â Ã˜Â§Ã˜Â¶Ã˜ÂºÃ˜Â· "Ã˜Â±Ã˜Â¨Ã˜Â· Ã™â€¦Ã˜ÂµÃ˜Â¯Ã˜Â± Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª" Ã¢â€ Â "Ã˜Â§Ã™â€žÃ™Ë†Ã™Å Ã˜Â¨" Ã¢â€ Â "Meta Pixel". Ã˜Â£Ã˜Â¹Ã˜Â·Ã™ÂÃ™â€¡ Ã˜Â§Ã˜Â³Ã™â€¦ Ã™â€¦Ã˜ÂªÃ˜Â¬Ã˜Â±Ã™Æ’ Ã™Ë†Ã˜Â§Ã™â€ Ã˜Â³Ã˜Â® Pixel ID (Ã˜Â³Ã™â€žÃ˜Â³Ã™â€žÃ˜Â© Ã™â€¦Ã™â€  15-16 Ã˜Â±Ã™â€šÃ™â€¦Ã˜Â§Ã™â€¹).' },
          { text: 'Ã™ÂÃ™Å  Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª StoreDz Ã¢â€ Â Ã™â€šÃ˜Â³Ã™â€¦ "Pixels Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂªÃ˜ÂªÃ˜Â¨Ã˜Â¹" Ã¢â€ Â Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€š Pixel ID Ã™ÂÃ™Å  Ã˜Â®Ã˜Â§Ã™â€ Ã˜Â© "Meta Pixel ID". Ã˜Â§Ã˜Â­Ã™ÂÃ˜Â¸.', tip: 'Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã™Æ’Ã˜Â³Ã™â€ž Ã™Å Ã˜Â¨Ã˜Â¯Ã˜Â£ Ã˜Â¨Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€ž Ã™ÂÃ™Ë†Ã˜Â±Ã˜Â§Ã™â€¹ Ã˜Â¨Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â­Ã™ÂÃ˜Â¸ Ã˜Â¹Ã™â€žÃ™â€° Ã™Æ’Ã™â€ž Ã˜ÂµÃ™ÂÃ˜Â­Ã˜Â§Ã˜Âª Ã™â€¦Ã˜ÂªÃ˜Â¬Ã˜Â±Ã™Æ’.' },
          { text: 'Ã™â€žÃ˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž Conversions API: Events Manager Ã¢â€ Â Ã˜Â¨Ã™Å Ã™Æ’Ã˜Â³Ã™â€žÃ™Æ’ Ã¢â€ Â Ã˜ÂªÃ˜Â¨Ã™Ë†Ã™Å Ã˜Â¨ "Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª" Ã¢â€ Â Ã™â€¦Ã˜Â±Ã˜Â± Ã˜Â¥Ã™â€žÃ™â€° "Conversions API" Ã¢â€ Â Ã˜Â§Ã˜Â¶Ã˜ÂºÃ˜Â· "Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â±Ã™â€¦Ã˜Â² Ã™Ë†Ã˜ÂµÃ™Ë†Ã™â€ž". Ã˜Â§Ã™â€ Ã˜Â³Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â±Ã™â€¦Ã˜Â² (Ã™Å Ã˜Â¨Ã˜Â¯Ã˜Â£ Ã˜Â¨Ã™â‚¬ EAA...).' },
          { text: 'Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€š Ã˜Â§Ã™â€žÃ˜Â±Ã™â€¦Ã˜Â² Ã™ÂÃ™Å  Ã˜Â®Ã˜Â§Ã™â€ Ã˜Â© "Conversions API Token" Ã™ÂÃ™Å  Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª StoreDz. Ã˜Â§Ã˜Â­Ã™ÂÃ˜Â¸.' },
          { text: 'Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š: Events Manager Ã¢â€ Â "Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â¨Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Â«" Ã¢â€ Â Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â­ Ã™â€¦Ã˜ÂªÃ˜Â¬Ã˜Â±Ã™Æ’ Ã™ÂÃ™Å  Ã˜ÂªÃ˜Â¨Ã™Ë†Ã™Å Ã˜Â¨ Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯ Ã¢â€ Â Ã™Å Ã˜Â¬Ã˜Â¨ Ã˜Â£Ã™â€  Ã˜ÂªÃ˜Â±Ã™â€° PageView Ã™Ë† ViewContent Ã™Å Ã˜Â¸Ã™â€¡Ã˜Â±Ã˜Â§Ã™â€  Ã˜Â®Ã™â€žÃ˜Â§Ã™â€ž Ã˜Â«Ã™Ë†Ã˜Â§Ã™â€ Ã™Â.' },
          { text: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â´Ã˜ÂªÃ˜Â±Ã™Å Ã˜Â§Ã˜Âª Ã˜ÂªÃ˜Â±Ã˜Â³Ã™â€ž Ã™â€¦Ã˜Â±Ã˜ÂªÃ™Å Ã™â€  (Ã™â€¦Ã˜ÂªÃ˜ÂµÃ™ÂÃ˜Â­ + Ã˜Â®Ã˜Â§Ã˜Â¯Ã™â€¦) Ã™â€žÃ˜Â¯Ã™â€šÃ˜Â© Ã™â€šÃ˜ÂµÃ™Ë†Ã™â€°. Ã˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬Ã™Æ’ Ã™ÂÃ™Å  Ads Manager Ã¢â€ Â "Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â¹Ã™â€¦Ã˜Â¯Ã˜Â©" Ã¢â€ Â "Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â´Ã˜ÂªÃ˜Â±Ã™Å Ã˜Â§Ã˜Âª" Ã˜Â¨Ã˜Â¹Ã˜Â¯ 24-48 Ã˜Â³Ã˜Â§Ã˜Â¹Ã˜Â©.' },
        ],
        tip: 'Ã™â€¦Ã˜Â¹ Ã˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž CAPIÃ˜Å’ Ã˜ÂªÃ˜Â±Ã™â€° Ã˜Â¬Ã™â€¦Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™Ë†Ã™Å Ã™â€žÃ˜Â§Ã˜Âª Ã˜Â­Ã˜ÂªÃ™â€° Ã˜Â¹Ã™â€žÃ™â€° iPhone Ã™â€¦Ã˜Â¹ Safari Ã˜Â§Ã™â€žÃ˜Â°Ã™Å  Ã™Å Ã˜Â­Ã˜Â¬Ã˜Â¨ Ã˜Â§Ã™â€žÃ™Æ’Ã™Ë†Ã™Æ’Ã™Å Ã˜Â². Ã™â€¡Ã˜Â°Ã˜Â§ Ã™Å Ã˜Â­Ã˜Â³Ã™â€  Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬ Ã˜Â¥Ã˜Â¹Ã™â€žÃ˜Â§Ã™â€ Ã˜Â§Ã˜ÂªÃ™Æ’ Ã˜Â¨Ã˜Â´Ã™Æ’Ã™â€ž Ã™Æ’Ã˜Â¨Ã™Å Ã˜Â±.',
        warning: 'Ã™â€žÃ˜Â§ Ã˜ÂªÃ˜Â´Ã˜Â§Ã˜Â±Ã™Æ’ Ã˜Â±Ã™â€¦Ã˜Â² Conversions API Ã™â€¦Ã˜Â¹ Ã˜Â£Ã™Å  Ã˜Â´Ã˜Â®Ã˜Âµ. Ã˜Â¥Ã™â€ Ã™â€¡ Ã™â€¦Ã™ÂÃ˜ÂªÃ˜Â§Ã˜Â­ Ã˜Â³Ã˜Â±Ã™Å  Ã¢â‚¬â€ Ã˜ÂªÃ˜Â¹Ã˜Â§Ã™â€¦Ã™â€ž Ã™â€¦Ã˜Â¹Ã™â€¡ Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã™â€¦Ã˜Â±Ã™Ë†Ã˜Â±.',
      },
      {
        id: 'px2',
        title: 'Google Analytics 4 + API Secret Ã¢â‚¬â€ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯',
        duration: '8 min',
        intro: 'Google Analytics 4 Ã™Å Ã˜ÂªÃ˜Â¨Ã˜Â¹ Ã˜Â³Ã™â€žÃ™Ë†Ã™Æ’ Ã˜Â§Ã™â€žÃ˜Â²Ã™Ë†Ã˜Â§Ã˜Â± Ã™Ë†Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã˜Â§Ã˜Â¡. Ã™â€¦Ã˜Â¹ Measurement Protocol API Ã™Å Ã˜Â±Ã˜Â³Ã™â€ž StoreDz Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã˜Â§Ã˜Â¡ Ã™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â© Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â§Ã˜Â¯Ã™â€¦.',
        steps: [
          { text: 'Ã™ÂÃ™Å  analytics.google.com Ã¢â€ Â Ã˜Â§Ã˜Â¶Ã˜ÂºÃ˜Â· "Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡" Ã¢â€ Â "Ã˜Â®Ã˜Â§Ã˜ÂµÃ™Å Ã˜Â©" Ã¢â€ Â Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž Ã˜Â§Ã˜Â³Ã™â€¦ Ã™â€¦Ã˜ÂªÃ˜Â¬Ã˜Â±Ã™Æ’ Ã¢â€ Â Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜Â·Ã™â€šÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â²Ã™â€¦Ã™â€ Ã™Å Ã˜Â© (Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â²Ã˜Â§Ã˜Â¦Ã˜Â± = Africa/Algiers) Ã¢â€ Â Ã˜Â£Ã™â€ Ã™â€¡Ã™Â Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â§Ã˜ÂµÃ™Å Ã˜Â©.' },
          { text: 'Ã˜Â§Ã˜Â¨Ã˜Â­Ã˜Â« Ã˜Â¹Ã™â€  Measurement ID: Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â§Ã˜ÂµÃ™Å Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â© Ã¢â€ Â Admin Ã¢â€ Â Data Streams Ã¢â€ Â Ã˜Â§Ã˜Â¶Ã˜ÂºÃ˜Â· Ã˜Â¹Ã™â€žÃ™â€° Ã™ÂÃ™â€žÃ™Ë†Ã™Æ’ Ã¢â€ Â Ã˜Â§Ã™â€ Ã˜Â³Ã˜Â® Measurement ID (Ã™Å Ã˜Â¨Ã˜Â¯Ã˜Â£ Ã˜Â¨Ã™â‚¬ G-).' },
          { text: 'Ã™ÂÃ™Å  Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª StoreDz Ã¢â€ Â Ã™â€šÃ˜Â³Ã™â€¦ Google Analytics 4 Ã¢â€ Â Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€š Measurement ID Ã™ÂÃ™Å  Ã˜Â®Ã˜Â§Ã™â€ Ã˜Â© "Measurement ID". Ã˜Â§Ã˜Â­Ã™ÂÃ˜Â¸.', tip: 'Ã™â€¡Ã˜Â°Ã˜Â§ Ã™Å Ã˜Â¶Ã™Å Ã™Â Ã˜Â§Ã™â€žÃ™â‚¬ gtag.js Ã˜ÂªÃ™â€žÃ™â€šÃ˜Â§Ã˜Â¦Ã™Å Ã˜Â§Ã™â€¹ Ã˜Â¹Ã™â€žÃ™â€° Ã™Æ’Ã™â€ž Ã˜ÂµÃ™ÂÃ˜Â­Ã˜Â§Ã˜Âª Ã™â€¦Ã˜ÂªÃ˜Â¬Ã˜Â±Ã™Æ’.' },
          { text: 'Ã™â€žÃ™â‚¬ API Secret: Ã™â€ Ã™ÂÃ˜Â³ Ã˜ÂµÃ™ÂÃ˜Â­Ã˜Â© Data Stream Ã¢â€ Â "Measurement Protocol API secrets" Ã¢â€ Â "Create" Ã¢â€ Â Ã˜Â£Ã˜Â¹Ã˜Â·Ã™â€¡ Ã˜Â§Ã˜Â³Ã™â€¦Ã˜Â§Ã™â€¹ Ã¢â€ Â Ã˜Â§Ã™â€ Ã˜Â³Ã˜Â® Ã˜Â§Ã™â€žÃ™â€šÃ™Å Ã™â€¦Ã˜Â©.' },
          { text: 'Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€š API Secret Ã™ÂÃ™Å  Ã˜Â®Ã˜Â§Ã™â€ Ã˜Â© "API Secret (Measurement Protocol)" Ã™ÂÃ™Å  Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª StoreDz. Ã˜Â§Ã˜Â­Ã™ÂÃ˜Â¸.' },
          { text: 'Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š: analytics.google.com Ã¢â€ Â Reports Ã¢â€ Â Realtime Ã¢â€ Â Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â­ Ã™â€¦Ã˜ÂªÃ˜Â¬Ã˜Â±Ã™Æ’ Ã™ÂÃ™Å  Ã˜ÂªÃ˜Â¨Ã™Ë†Ã™Å Ã˜Â¨ Ã˜Â¢Ã˜Â®Ã˜Â± Ã¢â€ Â Ã™Å Ã˜Â¬Ã˜Â¨ Ã˜Â£Ã™â€  Ã˜ÂªÃ˜Â±Ã™â€° Ã™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã™â€ Ã˜Â´Ã˜Â·.' },
        ],
        tip: 'GA4 Ã™â€¦Ã˜Â¬Ã˜Â§Ã™â€ Ã™Å  Ã˜ÂªÃ™â€¦Ã˜Â§Ã™â€¦Ã˜Â§Ã™â€¹. Ã˜Â¨Ã˜Â¹Ã˜Â¯ 24-48 Ã˜Â³Ã˜Â§Ã˜Â¹Ã˜Â©Ã˜Å’ Ã˜Â³Ã˜ÂªÃ˜Â¬Ã˜Â¯ Ã˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â± Ã˜ÂªÃ™ÂÃ˜ÂµÃ™Å Ã™â€žÃ™Å Ã˜Â© Ã˜Â¹Ã™â€  Ã™â€¦Ã˜ÂµÃ˜Â§Ã˜Â¯Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â²Ã™Ë†Ã˜Â§Ã˜Â±Ã˜Å’ Ã˜Â§Ã™â€žÃ˜ÂµÃ™ÂÃ˜Â­Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â£Ã™Æ’Ã˜Â«Ã˜Â± Ã™â€¦Ã˜Â´Ã˜Â§Ã™â€¡Ã˜Â¯Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜ÂªÃ˜Â¬Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â£Ã™Æ’Ã˜Â«Ã˜Â± Ã™â€¦Ã˜Â¨Ã™Å Ã˜Â¹Ã˜Â§Ã™â€¹.',
      },
      {
        id: 'px3',
        title: 'TikTok Pixel + Events API Ã¢â‚¬â€ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â«Ã˜Â¨Ã™Å Ã˜Âª Ã˜Â®Ã˜Â·Ã™Ë†Ã˜Â© Ã˜Â¨Ã˜Â®Ã˜Â·Ã™Ë†Ã˜Â©',
        duration: '8 min',
        intro: 'TikTok Pixel Ã™Å Ã™â€šÃ™Å Ã˜Â³ Ã˜Â£Ã˜Â¯Ã˜Â§Ã˜Â¡ Ã˜Â¥Ã˜Â¹Ã™â€žÃ˜Â§Ã™â€ Ã˜Â§Ã˜ÂªÃ™Æ’ Ã˜Â¹Ã™â€žÃ™â€° TikTok. Events API Ã™Å Ã˜Â±Ã˜Â³Ã™â€ž Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã˜Â§Ã˜Â¡ Ã™â€¦Ã™â€  Ã˜Â®Ã˜Â§Ã˜Â¯Ã™â€¦Ã™â€ Ã˜Â§ Ã™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â© Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â³Ã™Å Ã™â€  Ã˜Â¹Ã˜Â§Ã˜Â¦Ã˜Â¯ Ã˜Â¥Ã˜Â¹Ã™â€žÃ˜Â§Ã™â€ Ã˜Â§Ã˜ÂªÃ™Æ’.',
        steps: [
          { text: 'Ã˜Â§Ã˜Â¯Ã˜Â®Ã™â€ž TikTok Ads Manager Ã˜Â¹Ã™â€žÃ™â€° ads.tiktok.com Ã¢â€ Â Assets Ã¢â€ Â Events Ã¢â€ Â "Web Events" Ã¢â€ Â "Create Pixel". Ã˜Â£Ã˜Â¹Ã˜Â·Ã™â€¡ Ã˜Â§Ã˜Â³Ã™â€¦ Ã™â€¦Ã˜ÂªÃ˜Â¬Ã˜Â±Ã™Æ’.', tip: 'Ã˜ÂªÃ˜Â­Ã˜ÂªÃ˜Â§Ã˜Â¬ Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ TikTok for Business Ã™â€¦Ã™â€ Ã™ÂÃ˜ÂµÃ™â€ž Ã˜Â¹Ã™â€  Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â®Ã˜ÂµÃ™Å .' },
          { text: 'Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± "TikTok Pixel" Ã¢â€ Â Ã˜Â§Ã˜ÂªÃ˜Â¨Ã˜Â¹ Ã˜Â®Ã˜Â·Ã™Ë†Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã¢â€ Â Ã™ÂÃ™Å  Ã™â€ Ã™â€¡Ã˜Â§Ã™Å Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â«Ã˜Â¨Ã™Å Ã˜Âª Ã˜Â§Ã™â€ Ã˜Â³Ã˜Â® Pixel ID (Ã™Å Ã˜Â¨Ã˜Â¯Ã˜Â£ Ã˜Â¨Ã™â‚¬ C...).' },
          { text: 'Ã™ÂÃ™Å  Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª StoreDz Ã¢â€ Â Ã™â€šÃ˜Â³Ã™â€¦ TikTok Ã¢â€ Â Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€š Pixel ID Ã™ÂÃ™Å  Ã˜Â®Ã˜Â§Ã™â€ Ã˜Â© "TikTok Pixel ID". Ã˜Â§Ã˜Â­Ã™ÂÃ˜Â¸.' },
          { text: 'Ã™â€žÃ™â€žÃ˜Â­Ã˜ÂµÃ™Ë†Ã™â€ž Ã˜Â¹Ã™â€žÃ™â€° Events API Token: Events Manager Ã¢â€ Â Ã˜Â¨Ã™Å Ã™Æ’Ã˜Â³Ã™â€žÃ™Æ’ Ã¢â€ Â "API Access Token" Ã¢â€ Â Ã˜Â§Ã˜Â¶Ã˜ÂºÃ˜Â· "Generate". Ã˜Â§Ã™â€ Ã˜Â³Ã˜Â® Ã˜Â§Ã™â€žÃ˜Â±Ã™â€¦Ã˜Â².' },
          { text: 'Ã˜Â§Ã™â€žÃ˜ÂµÃ™â€š Ã˜Â§Ã™â€žÃ˜Â±Ã™â€¦Ã˜Â² Ã™ÂÃ™Å  "Events API Access Token" Ã™ÂÃ™Å  Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª StoreDz. Ã˜Â§Ã˜Â­Ã™ÂÃ˜Â¸.' },
          { text: 'Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š: Assets Ã¢â€ Â Events Ã¢â€ Â Ã˜Â¨Ã™Å Ã™Æ’Ã˜Â³Ã™â€žÃ™Æ’ Ã¢â€ Â "Test Events" Ã¢â€ Â Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Ã™â€¦Ã˜ÂªÃ˜Â¬Ã˜Â±Ã™Æ’ Ã™Ë†Ã˜Â§Ã˜Â¶Ã˜ÂºÃ˜Â· "Test". Ã™Å Ã˜Â¬Ã˜Â¨ Ã˜Â£Ã™â€  Ã˜ÂªÃ˜Â±Ã™â€° Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Â« Ã˜ÂªÃ˜Â¸Ã™â€¡Ã˜Â±.', tip: 'TikTok Ã™Å Ã˜Â£Ã˜Â®Ã˜Â° Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â©Ã™â€¹ 2-4 Ã˜Â³Ã˜Â§Ã˜Â¹Ã˜Â§Ã˜Âª Ã™â€žÃ˜Â¨Ã˜Â¯Ã˜Â¡ Ã˜Â¹Ã˜Â±Ã˜Â¶ Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Â« Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ™Ë†Ã™â€šÃ˜Âª Ã˜Â§Ã™â€žÃ™ÂÃ˜Â¹Ã™â€žÃ™Å .' },
        ],
        tip: 'Ã˜Â¥Ã˜Â¹Ã™â€žÃ˜Â§Ã™â€ Ã˜Â§Ã˜Âª TikTok Ã˜ÂªÃ˜Â¹Ã™â€¦Ã™â€ž Ã˜Â¨Ã˜Â´Ã™Æ’Ã™â€ž Ã™â€¦Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â² Ã™â€žÃ™â€žÃ™â€¦Ã™â€ Ã˜ÂªÃ˜Â¬Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â¦Ã™Å Ã˜Â© (Ã™â€¦Ã™â€žÃ˜Â§Ã˜Â¨Ã˜Â³Ã˜Å’ Ã˜Â£Ã™Æ’Ã˜Â³Ã˜Â³Ã™Ë†Ã˜Â§Ã˜Â±Ã˜Â§Ã˜ÂªÃ˜Å’ Ã™â€¦Ã™â€ Ã˜ÂªÃ˜Â¬Ã˜Â§Ã˜Âª Ã™â€¦Ã™â€ Ã˜Â²Ã™â€žÃ™Å Ã˜Â©). Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã™Æ’Ã˜Â³Ã™â€ž + Events API Ã™Å Ã˜Â­Ã˜Â³Ã™â€  Ã˜Â§Ã˜Â³Ã˜ÂªÃ™â€¡Ã˜Â¯Ã˜Â§Ã™Â Ã˜Â§Ã™â€žÃ˜Â¬Ã™â€¦Ã™â€¡Ã™Ë†Ã˜Â± Ã˜ÂªÃ™â€žÃ™â€šÃ˜Â§Ã˜Â¦Ã™Å Ã˜Â§Ã™â€¹.',
        warning: 'Ã˜ÂªÃ˜Â£Ã™Æ’Ã˜Â¯ Ã™â€¦Ã™â€  Ã™â€¦Ã™Ë†Ã˜Â§Ã™ÂÃ™â€šÃ˜Â© Ã˜Â³Ã™Å Ã˜Â§Ã˜Â³Ã˜Â© Ã˜Â¥Ã˜Â¹Ã™â€žÃ˜Â§Ã™â€ Ã˜Â§Ã˜Âª TikTok Ã˜Â¹Ã™â€žÃ™â€° Ã™â€¦Ã™â€ Ã˜ÂªÃ˜Â¬Ã™Æ’ Ã™â€šÃ˜Â¨Ã™â€ž Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜Â­Ã™â€¦Ã™â€žÃ˜Â©. Ã˜Â¨Ã˜Â¹Ã˜Â¶ Ã™ÂÃ˜Â¦Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜ÂªÃ˜Â¬Ã˜Â§Ã˜Âª Ã™â€žÃ™â€¡Ã˜Â§ Ã™â€šÃ™Å Ã™Ë†Ã˜Â¯ Ã˜Â®Ã˜Â§Ã˜ÂµÃ˜Â©.',
      },
    ] : lang === 'en' ? [
      {
        id: 'px1',
        title: 'Meta Pixel + Conversions API Ã¢â‚¬â€ Full Setup',
        duration: '10 min',
        intro: 'The Meta Pixel tracks visitors on your store browser-side. The Conversions API (CAPI) sends purchase data directly from our server Ã¢â‚¬â€ it works even when pixels are blocked by ad blockers.',
        steps: [
          { text: 'Create a Meta Business Suite account at business.facebook.com if you don\'t have one. Use your business email.', tip: 'Linking your personal Facebook account to Business Suite gives you access to all advertising tools.' },
          { text: 'In Business Suite Ã¢â€ â€™ Events Manager Ã¢â€ â€™ click "Connect a data source" Ã¢â€ â€™ "Web" Ã¢â€ â€™ "Meta Pixel". Name it after your store and copy the Pixel ID (15-16 digit number).' },
          { text: 'In StoreDz Settings Ã¢â€ â€™ "Pixels & Tracking" section Ã¢â€ â€™ paste the Pixel ID in the "Meta Pixel ID" field. Save.', tip: 'The pixel starts working immediately after saving on every page of your store.' },
          { text: 'To enable Conversions API: Events Manager Ã¢â€ â€™ your Pixel Ã¢â€ â€™ "Settings" tab Ã¢â€ â€™ scroll to "Conversions API" Ã¢â€ â€™ click "Generate access token". Copy the token (starts with EAA...).' },
          { text: 'Paste the token in "Conversions API Token" in your StoreDz Settings. Save.' },
          { text: 'Verify: Events Manager Ã¢â€ â€™ "Test events" tab Ã¢â€ â€™ open your store in a new tab Ã¢â€ â€™ you should see PageView and ViewContent appear within seconds.' },
          { text: 'Purchases now send twice (browser + server) for maximum accuracy. Check results in Ads Manager Ã¢â€ â€™ Columns Ã¢â€ â€™ "Purchases" after 24-48 hours.' },
        ],
        tip: 'With CAPI enabled, you see all conversions even on iPhones with Safari (which blocks third-party cookies). This significantly improves your ad results.',
        warning: 'Never share your Conversions API token with anyone. It\'s a secret key Ã¢â‚¬â€ treat it like a password.',
      },
      {
        id: 'px2',
        title: 'Google Analytics 4 + API Secret Ã¢â‚¬â€ Setup',
        duration: '8 min',
        intro: 'Google Analytics 4 tracks visitor behavior and the purchase journey. With Measurement Protocol API, StoreDz sends purchase data directly from the server.',
        steps: [
          { text: 'In analytics.google.com Ã¢â€ â€™ click "Create" Ã¢â€ â€™ "Property" Ã¢â€ â€™ enter your store name Ã¢â€ â€™ select timezone (Algeria = Africa/Algiers) Ã¢â€ â€™ finish creating the property.' },
          { text: 'Find your Measurement ID: new property Ã¢â€ â€™ Admin Ã¢â€ â€™ Data Streams Ã¢â€ â€™ click your stream Ã¢â€ â€™ copy Measurement ID (starts with G-).' },
          { text: 'In StoreDz Settings Ã¢â€ â€™ Google Analytics 4 section Ã¢â€ â€™ paste Measurement ID in the "Measurement ID" field. Save.', tip: 'This automatically adds gtag.js tracking to every page of your store.' },
          { text: 'For API Secret: same Data Stream page Ã¢â€ â€™ "Measurement Protocol API secrets" Ã¢â€ â€™ "Create" Ã¢â€ â€™ give it a name Ã¢â€ â€™ copy the value.' },
          { text: 'Paste the API Secret in "API Secret (Measurement Protocol)" in StoreDz Settings. Save.' },
          { text: 'Verify: analytics.google.com Ã¢â€ â€™ Reports Ã¢â€ â€™ Realtime Ã¢â€ â€™ open your store in another tab Ã¢â€ â€™ you should see an active user appear.' },
        ],
        tip: 'GA4 is completely free. After 24-48 hours, you\'ll find detailed reports on traffic sources, most viewed pages, and top-selling products.',
      },
      {
        id: 'px3',
        title: 'TikTok Pixel + Events API Ã¢â‚¬â€ Step-by-Step Installation',
        duration: '8 min',
        intro: 'TikTok Pixel measures your ad performance on TikTok. The Events API sends purchase data from our server directly to improve your ad return on investment.',
        steps: [
          { text: 'Go to TikTok Ads Manager at ads.tiktok.com Ã¢â€ â€™ Assets Ã¢â€ â€™ Events Ã¢â€ â€™ "Web Events" Ã¢â€ â€™ "Create Pixel". Name it after your store.', tip: 'You need a TikTok for Business account separate from your personal account.' },
          { text: 'Select "TikTok Pixel" Ã¢â€ â€™ follow the creation steps Ã¢â€ â€™ at the end copy the Pixel ID (starts with C...).' },
          { text: 'In StoreDz Settings Ã¢â€ â€™ TikTok section Ã¢â€ â€™ paste Pixel ID in the "TikTok Pixel ID" field. Save.' },
          { text: 'To get the Events API Token: Events Manager Ã¢â€ â€™ your pixel Ã¢â€ â€™ "API Access Token" Ã¢â€ â€™ click "Generate". Copy the token.' },
          { text: 'Paste the token in "Events API Access Token" in StoreDz Settings. Save.' },
          { text: 'Verify: Assets Ã¢â€ â€™ Events Ã¢â€ â€™ your pixel Ã¢â€ â€™ "Test Events" Ã¢â€ â€™ enter your store URL and click "Test". Events should appear.', tip: 'TikTok usually takes 2-4 hours to start showing real-time event data.' },
        ],
        tip: 'TikTok ads work great for visual products (clothing, accessories, home products). The pixel + Events API automatically improves audience targeting.',
        warning: 'Make sure TikTok\'s advertising policy allows your product before creating a campaign. Some product categories have specific restrictions.',
      },
    ] : [
      {
        id: 'px1',
        title: 'Meta Pixel + Conversions API Ã¢â‚¬â€ configuration complÃƒÂ¨te',
        duration: '10 min',
        intro: 'Le Meta Pixel suit les visiteurs de votre boutique dans le navigateur. La Conversions API (CAPI) envoie les donnÃƒÂ©es d\'achat directement depuis notre serveur Ã¢â‚¬â€ elle fonctionne mÃƒÂªme quand le pixel est bloquÃƒÂ© par les bloqueurs de pubs.',
        steps: [
          { text: 'CrÃƒÂ©ez un compte Meta Business Suite sur business.facebook.com si vous n\'en avez pas. Utilisez votre email professionnel.', tip: 'Lier votre compte Facebook personnel ÃƒÂ  Business Suite vous donne accÃƒÂ¨s ÃƒÂ  tous les outils publicitaires.' },
          { text: 'Dans Business Suite Ã¢â€ â€™ Events Manager Ã¢â€ â€™ cliquez "Connecter une source de donnÃƒÂ©es" Ã¢â€ â€™ "Web" Ã¢â€ â€™ "Meta Pixel". Nommez-le avec le nom de votre boutique et copiez le Pixel ID (suite de 15-16 chiffres).' },
          { text: 'Dans ParamÃƒÂ¨tres StoreDz Ã¢â€ â€™ section "Pixels & Tracking" Ã¢â€ â€™ collez le Pixel ID dans "Meta Pixel ID". Sauvegardez.', tip: 'Le pixel commence ÃƒÂ  fonctionner immÃƒÂ©diatement aprÃƒÂ¨s la sauvegarde, sur toutes les pages de votre boutique.' },
          { text: 'Pour activer la Conversions API : Events Manager Ã¢â€ â€™ votre Pixel Ã¢â€ â€™ onglet "ParamÃƒÂ¨tres" Ã¢â€ â€™ faites dÃƒÂ©filer jusqu\'ÃƒÂ  "Conversions API" Ã¢â€ â€™ cliquez "GÃƒÂ©nÃƒÂ©rer un token d\'accÃƒÂ¨s". Copiez le token (commence par EAA...).' },
          { text: 'Collez le token dans "Conversions API Token" dans vos ParamÃƒÂ¨tres StoreDz. Sauvegardez.' },
          { text: 'VÃƒÂ©rification : Events Manager Ã¢â€ â€™ onglet "Test des ÃƒÂ©vÃƒÂ©nements" Ã¢â€ â€™ ouvrez votre boutique dans un nouvel onglet Ã¢â€ â€™ PageView et ViewContent doivent apparaÃƒÂ®tre en quelques secondes.' },
          { text: 'Les achats sont maintenant envoyÃƒÂ©s en double (navigateur + serveur) pour une prÃƒÂ©cision maximale. VÃƒÂ©rifiez dans Ads Manager Ã¢â€ â€™ Colonnes Ã¢â€ â€™ "Achats" aprÃƒÂ¨s 24-48h.' },
        ],
        tip: 'Avec la CAPI activÃƒÂ©e, vous voyez toutes les conversions mÃƒÂªme sur les iPhones avec Safari (qui bloquent les cookies tiers). Cela amÃƒÂ©liore significativement vos rÃƒÂ©sultats publicitaires.',
        warning: 'Ne partagez jamais votre token Conversions API. C\'est une clÃƒÂ© secrÃƒÂ¨te Ã¢â‚¬â€ traitez-le comme un mot de passe.',
      },
      {
        id: 'px2',
        title: 'Google Analytics 4 + API Secret Ã¢â‚¬â€ configuration',
        duration: '8 min',
        intro: 'Google Analytics 4 suit le comportement des visiteurs et le parcours d\'achat. Avec le Measurement Protocol API, StoreDz envoie les donnÃƒÂ©es d\'achat directement depuis le serveur.',
        steps: [
          { text: 'Dans analytics.google.com Ã¢â€ â€™ cliquez "CrÃƒÂ©er" Ã¢â€ â€™ "PropriÃƒÂ©tÃƒÂ©" Ã¢â€ â€™ entrez le nom de votre boutique Ã¢â€ â€™ sÃƒÂ©lectionnez le fuseau horaire (AlgÃƒÂ©rie = Africa/Algiers) Ã¢â€ â€™ terminez la crÃƒÂ©ation.' },
          { text: 'Trouvez votre Measurement ID : nouvelle propriÃƒÂ©tÃƒÂ© Ã¢â€ â€™ Admin Ã¢â€ â€™ Flux de donnÃƒÂ©es Ã¢â€ â€™ cliquez sur votre flux Ã¢â€ â€™ copiez Measurement ID (commence par G-).' },
          { text: 'Dans ParamÃƒÂ¨tres StoreDz Ã¢â€ â€™ section Google Analytics 4 Ã¢â€ â€™ collez le Measurement ID. Sauvegardez.', tip: 'Cela ajoute automatiquement le tracking gtag.js sur toutes les pages de votre boutique.' },
          { text: 'Pour l\'API Secret : mÃƒÂªme page Data Stream Ã¢â€ â€™ "Measurement Protocol API secrets" Ã¢â€ â€™ "CrÃƒÂ©er" Ã¢â€ â€™ donnez-lui un nom Ã¢â€ â€™ copiez la valeur.' },
          { text: 'Collez l\'API Secret dans "API Secret (Measurement Protocol)" dans vos ParamÃƒÂ¨tres StoreDz. Sauvegardez.' },
          { text: 'VÃƒÂ©rification : analytics.google.com Ã¢â€ â€™ Rapports Ã¢â€ â€™ Temps rÃƒÂ©el Ã¢â€ â€™ ouvrez votre boutique dans un autre onglet Ã¢â€ â€™ un utilisateur actif doit apparaÃƒÂ®tre.' },
        ],
        tip: 'GA4 est entiÃƒÂ¨rement gratuit. AprÃƒÂ¨s 24-48h, vous aurez des rapports dÃƒÂ©taillÃƒÂ©s sur les sources de trafic, les pages les plus vues et les produits les plus vendus.',
      },
      {
        id: 'px3',
        title: 'TikTok Pixel + Events API Ã¢â‚¬â€ installation ÃƒÂ©tape par ÃƒÂ©tape',
        duration: '8 min',
        intro: 'TikTok Pixel mesure la performance de vos publicitÃƒÂ©s TikTok. L\'Events API envoie les donnÃƒÂ©es d\'achat depuis notre serveur directement ÃƒÂ  TikTok pour amÃƒÂ©liorer votre retour sur investissement publicitaire.',
        steps: [
          { text: 'Allez dans TikTok Ads Manager sur ads.tiktok.com Ã¢â€ â€™ Assets Ã¢â€ â€™ Events Ã¢â€ â€™ "Web Events" Ã¢â€ â€™ "Create Pixel". Nommez-le avec le nom de votre boutique.', tip: 'Vous avez besoin d\'un compte TikTok for Business sÃƒÂ©parÃƒÂ© de votre compte personnel.' },
          { text: 'SÃƒÂ©lectionnez "TikTok Pixel" Ã¢â€ â€™ suivez les ÃƒÂ©tapes de crÃƒÂ©ation Ã¢â€ â€™ ÃƒÂ  la fin copiez le Pixel ID (commence par C...).' },
          { text: 'Dans ParamÃƒÂ¨tres StoreDz Ã¢â€ â€™ section TikTok Ã¢â€ â€™ collez le Pixel ID dans "TikTok Pixel ID". Sauvegardez.' },
          { text: 'Pour obtenir l\'Events API Token : Events Manager Ã¢â€ â€™ votre pixel Ã¢â€ â€™ "API Access Token" Ã¢â€ â€™ cliquez "Generate". Copiez le token.' },
          { text: 'Collez le token dans "Events API Access Token" dans vos ParamÃƒÂ¨tres StoreDz. Sauvegardez.' },
          { text: 'VÃƒÂ©rification : Assets Ã¢â€ â€™ Events Ã¢â€ â€™ votre pixel Ã¢â€ â€™ "Test Events" Ã¢â€ â€™ entrez l\'URL de votre boutique et cliquez "Test". Les ÃƒÂ©vÃƒÂ©nements doivent apparaÃƒÂ®tre.', tip: 'TikTok prend gÃƒÂ©nÃƒÂ©ralement 2-4 heures pour commencer ÃƒÂ  afficher les donnÃƒÂ©es en temps rÃƒÂ©el.' },
        ],
        tip: 'Les publicitÃƒÂ©s TikTok fonctionnent trÃƒÂ¨s bien pour les produits visuels (vÃƒÂªtements, accessoires, produits maison). Le pixel + Events API amÃƒÂ©liore automatiquement le ciblage de l\'audience.',
        warning: 'VÃƒÂ©rifiez que la politique publicitaire TikTok autorise votre produit avant de crÃƒÂ©er une campagne. Certaines catÃƒÂ©gories de produits ont des restrictions spÃƒÂ©cifiques.',
      },
    ],
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ DELIVERY API MODULE Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const deliveryModule: Module = {
    id:      'delivery-api',
    title:   lang === 'ar' ? 'API Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž Ã¢â‚¬â€ YalidineÃ˜Å’ ZR ExpressÃ˜Å’ Procolis' : lang === 'en' ? 'Delivery APIs Ã¢â‚¬â€ Yalidine, ZR Express, Procolis' : 'API Transporteurs Ã¢â‚¬â€ Yalidine, ZR Express, Procolis',
    icon:    Link2,
    color:   'text-teal-600',
    bg:      'bg-teal-50',
    badge:   lang === 'ar' ? 'Ã™â€¦Ã˜ÂªÃ™â€šÃ˜Â¯Ã™â€¦' : lang === 'en' ? 'Advanced' : 'AvancÃƒÂ©',
    badgeBg: 'bg-teal-100 text-teal-700',
    desc:    lang === 'ar'
      ? 'Ã˜Â§Ã˜Â±Ã˜Â¨Ã˜Â· Ã™â€¦Ã˜ÂªÃ˜Â¬Ã˜Â±Ã™Æ’ Ã˜Â¨Ã™â‚¬ API Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž Ã™â€žÃ˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â¨Ã™Ë†Ã™â€žÃ™Å Ã˜ÂµÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â­Ã™â€  Ã˜Â¨Ã™â€ Ã™â€šÃ˜Â±Ã˜Â© Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯Ã˜Â© Ã™Ë†Ã˜ÂªÃ˜ÂªÃ˜Â¨Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â·Ã˜Â±Ã™Ë†Ã˜Â¯ Ã˜ÂªÃ™â€žÃ™â€šÃ˜Â§Ã˜Â¦Ã™Å Ã˜Â§Ã™â€¹.'
      : lang === 'en'
      ? 'Connect your store to delivery company APIs to create shipping labels in 1 click and track parcels automatically.'
      : 'Connectez votre boutique aux APIs des transporteurs pour crÃƒÂ©er vos bons d\'expÃƒÂ©dition en 1 clic et suivre les colis automatiquement.',
    lessons: lang === 'ar' ? [
      {
        id: 'del1',
        title: 'Ã™â€žÃ™â€¦Ã˜Â§Ã˜Â°Ã˜Â§ Ã˜ÂªÃ˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã˜Â§Ã™â€žÃ™â‚¬ APIÃ˜Å¸ Ã¢â‚¬â€ Ã˜Â§Ã™â€žÃ™ÂÃ™Ë†Ã˜Â§Ã˜Â¦Ã˜Â¯ Ã™Ë†Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª',
        duration: '5 min',
        intro: 'Ã˜Â§Ã™â€žÃ™â‚¬ API (Ã™Ë†Ã˜Â§Ã˜Â¬Ã™â€¡Ã˜Â© Ã˜Â¨Ã˜Â±Ã™â€¦Ã˜Â¬Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€šÃ˜Â§Ã˜Âª) Ã™Å Ã˜Â±Ã˜Â¨Ã˜Â· StoreDz Ã™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â© Ã˜Â¨Ã™â€ Ã˜Â¸Ã˜Â§Ã™â€¦ Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž. Ã˜Â¨Ã˜Â¯Ã™â€žÃ˜Â§Ã™â€¹ Ã™â€¦Ã™â€  Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã™Æ’Ã™â€ž Ã˜Â¨Ã™Ë†Ã™â€žÃ™Å Ã˜ÂµÃ˜Â© Ã™Å Ã˜Â¯Ã™Ë†Ã™Å Ã˜Â§Ã™â€¹ Ã˜Â¹Ã™â€žÃ™â€° Ã™â€¦Ã™Ë†Ã™â€šÃ˜Â¹ Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Æ’Ã˜Â©Ã˜Å’ Ã™Å Ã™â€¦Ã™Æ’Ã™â€ Ã™Æ’ Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¤Ã™â€¡Ã˜Â§ Ã˜Â¨Ã™â€ Ã™â€šÃ˜Â±Ã˜Â© Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯Ã˜Â© Ã™â€¦Ã™â€  Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™Æ’Ã™â€¦.',
        steps: [
          { text: 'Ã˜Â¨Ã˜Â¯Ã™Ë†Ã™â€  API: Ã˜ÂªÃ™ÂÃ˜ÂªÃ˜Â­ Ã™â€¦Ã™Ë†Ã™â€šÃ˜Â¹ Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€žÃ˜Å’ Ã˜ÂªÃ™â€¦Ã™â€žÃ˜Â£ Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â²Ã˜Â¨Ã™Ë†Ã™â€  Ã™Å Ã˜Â¯Ã™Ë†Ã™Å Ã˜Â§Ã™â€¹Ã˜Å’ Ã˜ÂªÃ˜Â·Ã˜Â¨Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¨Ã™Ë†Ã™â€žÃ™Å Ã˜ÂµÃ˜Â©. Ã™Æ’Ã™â€ž Ã˜Â·Ã˜Â±Ã˜Â¯ Ã™Å Ã˜Â£Ã˜Â®Ã˜Â° 3-5 Ã˜Â¯Ã™â€šÃ˜Â§Ã˜Â¦Ã™â€š.', tip: 'Ã˜Â¨Ã˜Â¯Ã™Ë†Ã™â€  API Ã™â€¦Ã™â€šÃ˜Â¨Ã™Ë†Ã™â€ž Ã™â€žÃ™â‚¬ 1-10 Ã˜Â·Ã˜Â±Ã™Ë†Ã˜Â¯ Ã™Å Ã™Ë†Ã™â€¦Ã™Å Ã˜Â§Ã™â€¹. Ã™ÂÃ™Ë†Ã™â€š Ã˜Â°Ã™â€žÃ™Æ’Ã˜Å’ Ã˜Â§Ã™â€žÃ™Ë†Ã™â€šÃ˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã™â€¡Ã˜Â¯Ã˜Â± Ã™Æ’Ã˜Â¨Ã™Å Ã˜Â± Ã˜Â¬Ã˜Â¯Ã˜Â§Ã™â€¹.' },
          { text: 'Ã™â€¦Ã˜Â¹ API: Ã˜ÂªÃ˜Â¶Ã˜ÂºÃ˜Â· "Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â¨Ã™Ë†Ã™â€žÃ™Å Ã˜ÂµÃ˜Â©" Ã™ÂÃ™Å  StoreDz Ã¢â€ Â Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜ÂªÃ™â€ Ã˜ÂªÃ™â€šÃ™â€ž Ã˜ÂªÃ™â€žÃ™â€šÃ˜Â§Ã˜Â¦Ã™Å Ã˜Â§Ã™â€¹ Ã¢â€ Â Ã˜ÂªÃ˜Â·Ã˜Â¨Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¨Ã™Ë†Ã™â€žÃ™Å Ã˜ÂµÃ˜Â© Ã™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â©. Ã™Æ’Ã™â€ž Ã˜Â·Ã˜Â±Ã˜Â¯ Ã™Å Ã˜Â£Ã˜Â®Ã˜Â° 20 Ã˜Â«Ã˜Â§Ã™â€ Ã™Å Ã˜Â©.' },
          { text: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª: Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ Ã™â€¦Ã™â€¡Ã™â€ Ã™Å  (Ã˜ÂªÃ˜Â¬Ã˜Â§Ã˜Â±Ã™Å ) Ã™â€¦Ã™ÂÃ˜Â¹Ã™â€ž Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž. Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â®Ã˜ÂµÃ™Å Ã˜Â© Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â©Ã™â€¹ Ã™â€žÃ˜Â§ Ã˜ÂªÃ™â€¦Ã™â€ Ã˜Â­ Ã™Ë†Ã˜ÂµÃ™Ë†Ã™â€ž API.', tip: 'Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨Ã™Æ’ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã™â€¦Ã˜Â¨Ã™Æ’Ã˜Â±Ã˜Â§Ã™â€¹ Ã¢â‚¬â€ Ã˜Â§Ã™â€žÃ˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž Ã™â€šÃ˜Â¯ Ã™Å Ã˜Â£Ã˜Â®Ã˜Â° 1-3 Ã˜Â£Ã™Å Ã˜Â§Ã™â€¦ Ã˜Â¹Ã™â€¦Ã™â€ž.' },
          { text: 'Ã˜Â¨Ã˜Â¹Ã˜Â¯ Ã˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨Ã™Æ’ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¬Ã˜Â§Ã˜Â±Ã™Å Ã˜Å’ Ã˜Â§Ã˜Â¨Ã˜Â­Ã˜Â« Ã™ÂÃ™Å  Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™Æ’Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â§Ã˜ÂµÃ˜Â© Ã˜Â¨Ã™Æ’ Ã˜Â¹Ã™â€  Ã™â€šÃ˜Â³Ã™â€¦ "API" Ã˜Â£Ã™Ë† "Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â·Ã™Ë†Ã˜Â±" Ã™â€žÃ™â€žÃ˜Â­Ã˜ÂµÃ™Ë†Ã™â€ž Ã˜Â¹Ã™â€žÃ™â€° Ã™â€¦Ã™ÂÃ˜Â§Ã˜ÂªÃ™Å Ã˜Â­ Ã˜Â§Ã™â€žÃ™Ë†Ã˜ÂµÃ™Ë†Ã™â€ž.' },
          { text: 'Ã™ÂÃ™Å  StoreDz: Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã¢â€ Â "Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž Ã™Ë†Ã˜Â§Ã™â€žÃ™â‚¬ API" Ã¢â€ Â Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž Ã¢â€ Â Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã™ÂÃ˜Â§Ã˜ÂªÃ™Å Ã˜Â­ Ã¢â€ Â Ã˜Â§Ã˜Â­Ã™ÂÃ˜Â¸ Ã™Ë†Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â¨Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂªÃ˜ÂµÃ˜Â§Ã™â€ž.' },
        ],
        tip: 'Ã˜Â§Ã˜Â¨Ã˜Â¯Ã˜Â£ Ã˜Â¨Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯Ã˜Â© Ã™ÂÃ™â€šÃ˜Â·. Ã˜Â£Ã˜ÂªÃ™â€šÃ™â€  Ã˜Â§Ã™â€žÃ™â‚¬ API Ã™â€¦Ã˜Â¹Ã™â€¡Ã˜Â§ Ã™â€šÃ˜Â¨Ã™â€ž Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°. Yalidine Ã™â€¦Ã™ÂÃ™â€ Ã˜ÂµÃ˜Â­ Ã˜Â¨Ã™â€¡ Ã™â€žÃ™â€žÃ™â€¦Ã˜Â¨Ã˜ÂªÃ˜Â¯Ã˜Â¦Ã™Å Ã™â€  Ã™â€žÃ˜ÂªÃ™Ë†Ã˜Â«Ã™Å Ã™â€š API Ã˜Â§Ã™â€žÃ˜Â¬Ã™Å Ã˜Â¯.',
      },
      {
        id: 'del2',
        title: 'Yalidine API Ã¢â‚¬â€ Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â­Ã˜ÂµÃ™Ë†Ã™â€ž Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™â€¦Ã™ÂÃ˜Â§Ã˜ÂªÃ™Å Ã˜Â­',
        duration: '8 min',
        intro: 'Yalidine Ã™â€¡Ã™Ë† Ã˜Â£Ã˜Â´Ã™â€¡Ã˜Â± Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â²Ã˜Â§Ã˜Â¦Ã˜Â± Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â¬Ã˜Â§Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å Ã˜Â©. API Ã˜Â¬Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜Â«Ã™Å Ã™â€š Ã™Ë†Ã˜Â³Ã™â€¡Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã˜Â§Ã™â€¦ Ã™â€¦Ã˜Â¹ Ã˜ÂªÃ˜ÂºÃ˜Â·Ã™Å Ã˜Â© 58 Ã™Ë†Ã™â€žÃ˜Â§Ã™Å Ã˜Â©.',
        steps: [
          { text: 'Ã˜Â§Ã˜Â°Ã™â€¡Ã˜Â¨ Ã˜Â¥Ã™â€žÃ™â€° yalidine.app Ã¢â€ Â "Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨" Ã¢â€ Â Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± "Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ Ã˜ÂªÃ˜Â¬Ã˜Â§Ã˜Â±Ã™Å ". Ã˜Â§Ã™â€¦Ã˜ÂªÃ™â€žÃ˜Â§Ã˜Â¡ Ã™â€ Ã™â€¦Ã™Ë†Ã˜Â°Ã˜Â¬ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã™Æ’Ã˜Â§Ã™â€¦Ã™â€žÃ˜Â§Ã™â€¹ Ã™Å Ã˜Â³Ã˜Â±Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž.', tip: 'Ã˜Â£Ã˜Â¶Ã™Â Ã˜Â±Ã™â€šÃ™â€¦ Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â¬Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜Â¥Ã˜Â°Ã˜Â§ Ã˜ÂªÃ™Ë†Ã™ÂÃ˜Â± Ã™â€žÃ˜Â¯Ã™Å Ã™Æ’ Ã¢â‚¬â€ Ã™Å Ã˜Â³Ã˜Â§Ã˜Â¹Ã˜Â¯ Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â±Ã™Å Ã˜Â¹.' },
          { text: 'Ã˜Â¨Ã˜Â¹Ã˜Â¯ Ã™â€¦Ã˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹Ã˜Â© Ã™Ë†Ã˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨Ã™Æ’ (1-3 Ã˜Â£Ã™Å Ã˜Â§Ã™â€¦ Ã˜Â¹Ã™â€¦Ã™â€ž)Ã˜Å’ Ã˜Â³Ã˜Â¬Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¯Ã˜Â®Ã™Ë†Ã™â€ž Ã¢â€ Â Ã˜Â§Ã™â€ Ã˜ÂªÃ™â€šÃ™â€ž Ã˜Â¥Ã™â€žÃ™â€° "Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨" Ã¢â€ Â Ã™â€šÃ˜Â³Ã™â€¦ "API".' },
          { text: 'Ã˜Â³Ã˜ÂªÃ˜Â¬Ã˜Â¯: Centre ID (Ã˜Â±Ã™â€šÃ™â€¦ Ã™â€¦Ã˜Â±Ã™Æ’Ã˜Â²Ã™Æ’) Ã™Ë†Token (Ã˜Â±Ã™â€¦Ã˜Â² Ã˜Â§Ã™â€žÃ™Ë†Ã˜ÂµÃ™Ë†Ã™â€ž). Ã˜Â§Ã™â€ Ã˜Â³Ã˜Â®Ã™â€¡Ã™â€¦Ã˜Â§ Ã˜Â¨Ã˜Â¹Ã™â€ Ã˜Â§Ã™Å Ã˜Â© Ã¢â‚¬â€ Ã™â€¡Ã˜Â°Ã˜Â§Ã™â€  Ã™â€¡Ã™â€¦Ã˜Â§ Ã™â€¦Ã™ÂÃ˜ÂªÃ˜Â§Ã˜Â­Ã˜Â§ Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂªÃ˜ÂµÃ˜Â§Ã™â€ž.', tip: 'Ã˜Â§Ã˜Â­Ã™ÂÃ˜Â¸ Token Ã™ÂÃ™Å  Ã™â€¦Ã™Æ’Ã˜Â§Ã™â€  Ã˜Â¢Ã™â€¦Ã™â€ . Ã˜Â¥Ã˜Â°Ã˜Â§ Ã™ÂÃ™â€šÃ˜Â¯Ã˜ÂªÃ™â€¡ Ã™Å Ã™â€¦Ã™Æ’Ã™â€ Ã™Æ’ Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â±Ã™â€¦Ã˜Â² Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯ Ã™â€žÃ™Æ’Ã™â€  Ã˜Â§Ã™â€žÃ˜Â±Ã™â€¦Ã˜Â² Ã˜Â§Ã™â€žÃ™â€šÃ˜Â¯Ã™Å Ã™â€¦ Ã˜Â³Ã™Å Ã™ÂÃ™â€žÃ˜ÂºÃ™â€°.' },
          { text: 'Ã™ÂÃ™Å  StoreDz: Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã¢â€ Â "Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž Ã™Ë†Ã˜Â§Ã™â€žÃ™â‚¬ API" Ã¢â€ Â Yalidine Ã¢â€ Â Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž Centre ID Ã™Ë†Token. Ã˜Â§Ã˜Â¶Ã˜ÂºÃ˜Â· "Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â¨Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂªÃ˜ÂµÃ˜Â§Ã™â€ž".' },
          { text: 'Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â¨Ã˜Â§Ã˜Â± Ã™â€ Ã˜Â§Ã˜Â¬Ã˜Â­ Ã¢â€ Â Ã™ÂÃ˜Â¹Ã™â€˜Ã™â€ž "Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€žÃ™â€šÃ˜Â§Ã˜Â¦Ã™Å  Ã™â€žÃ™â€žÃ˜Â¨Ã™Ë†Ã™â€žÃ™Å Ã˜ÂµÃ˜Â©". Ã˜Â§Ã™â€žÃ˜Â¢Ã™â€  Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜ÂªÃ˜Â£Ã™Æ’Ã™Å Ã˜Â¯ Ã˜Â£Ã™Å  Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Å’ Ã˜Â§Ã™â€žÃ˜Â¨Ã™Ë†Ã™â€žÃ™Å Ã˜ÂµÃ˜Â© Ã˜ÂªÃ™ÂÃ™â€ Ã˜Â´Ã˜Â£ Ã˜ÂªÃ™â€žÃ™â€šÃ˜Â§Ã˜Â¦Ã™Å Ã˜Â§Ã™â€¹.', tip: 'Ã˜Â£Ã™Ë†Ã™â€žÃ˜Â§Ã™â€¹ Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â¨Ã˜Â± Ã˜Â¨Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜Â­Ã™â€šÃ™Å Ã™â€šÃ™Å  Ã™â€¦Ã™â€ Ã˜Â®Ã™ÂÃ˜Â¶ Ã˜Â§Ã™â€žÃ™â€šÃ™Å Ã™â€¦Ã˜Â© Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â£Ã™Æ’Ã˜Â¯ Ã™â€¦Ã™â€  Ã˜ÂµÃ˜Â­Ã˜Â© Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â²Ã˜Â¨Ã™Ë†Ã™â€  Ã™â€šÃ˜Â¨Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â¹Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¯ Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â§Ã™â€¦Ã™â€ž Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™â‚¬ API.' },
          { text: 'Ã™â€žÃ˜Â·Ã˜Â¨Ã˜Â§Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã™Ë†Ã™â€žÃ™Å Ã˜ÂµÃ˜Â©: Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™Æ’Ã™â€¦ Ã¢â€ Â Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨ Ã¢â€ Â "Ã˜Â·Ã˜Â¨Ã˜Â§Ã˜Â¹Ã˜Â© Ã˜Â¨Ã™Ë†Ã™â€žÃ™Å Ã˜ÂµÃ˜Â©". Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ˜ÂµÃ™â€š Ã™Å Ã™ÂÃ˜Â·Ã˜Â¨Ã˜Â¹ Ã˜Â¨Ã˜Â­Ã˜Â¬Ã™â€¦ A6 Ã˜Â£Ã™Ë† A4 Ã™â€¦Ã™â€šÃ˜Â³Ã™â€¦.' },
        ],
        tip: 'Yalidine Ã™Å Ã™Ë†Ã™ÂÃ˜Â± webhook Ã™â€žÃ™â€žÃ˜Â¥Ã˜Â´Ã˜Â¹Ã˜Â§Ã˜Â±Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™ÂÃ™Ë†Ã˜Â±Ã™Å Ã˜Â© Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜ÂªÃ˜ÂºÃ™Å Ã™Å Ã˜Â± Ã˜Â­Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â·Ã˜Â±Ã˜Â¯. Ã™ÂÃ˜Â¹Ã™â€˜Ã™â€žÃ™â€¡ Ã™ÂÃ™Å  Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª API Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â« Ã˜Â­Ã˜Â§Ã™â€žÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜ÂªÃ™â€žÃ™â€šÃ˜Â§Ã˜Â¦Ã™Å Ã˜Â§Ã™â€¹ Ã™ÂÃ™Å  StoreDz.',
        warning: 'Ã˜ÂªÃ˜Â£Ã™Æ’Ã˜Â¯ Ã™â€¦Ã™â€  Ã˜ÂµÃ˜Â­Ã˜Â© Ã˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€  Ã˜Â§Ã™â€žÃ˜Â²Ã˜Â¨Ã™Ë†Ã™â€  Ã™â€šÃ˜Â¨Ã™â€ž Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜Â¨Ã™Ë†Ã™â€žÃ™Å Ã˜ÂµÃ˜Â©. Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â¨Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã™Å Ã˜ÂªÃ˜Â·Ã™â€žÃ˜Â¨ Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂªÃ˜ÂµÃ˜Â§Ã™â€ž Ã˜Â¨Ã˜Â®Ã˜Â¯Ã™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€¦Ã™â€žÃ˜Â§Ã˜Â¡.',
      },
      {
        id: 'del3',
        title: 'ZR Express API Ã¢â‚¬â€ Ã˜Â³Ã˜Â±Ã˜Â¹Ã˜Â© Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¯Ã™â€  Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â¨Ã˜Â±Ã™â€°',
        duration: '8 min',
        intro: 'ZR Express Ã˜Â³Ã˜Â±Ã™Å Ã˜Â¹ Ã˜Â¬Ã˜Â¯Ã˜Â§Ã™â€¹ Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¯Ã™â€  Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â¨Ã˜Â±Ã™â€° (Ã˜Â§Ã™â€žÃ˜Â¬Ã˜Â²Ã˜Â§Ã˜Â¦Ã˜Â±Ã˜Å’ Ã™Ë†Ã™â€¡Ã˜Â±Ã˜Â§Ã™â€ Ã˜Å’ Ã™â€šÃ˜Â³Ã™â€ Ã˜Â·Ã™Å Ã™â€ Ã˜Â© Ã¢â‚¬â€ Ã˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž J+1). Ã™â€¦Ã˜Â«Ã˜Â§Ã™â€žÃ™Å  Ã˜Â¥Ã˜Â°Ã˜Â§ Ã™Æ’Ã˜Â§Ã™â€  Ã™â€¦Ã˜Â¹Ã˜Â¸Ã™â€¦ Ã˜Â²Ã˜Â¨Ã˜Â§Ã˜Â¦Ã™â€ Ã™Æ’ Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â´Ã™â€¦Ã˜Â§Ã™â€ž.',
        steps: [
          { text: 'Ã˜Â§Ã˜Â°Ã™â€¡Ã˜Â¨ Ã˜Â¥Ã™â€žÃ™â€° zrexpress.dz Ã¢â€ Â "Ã˜Â§Ã˜Â´Ã˜ÂªÃ˜Â±Ã˜Â§Ã™Æ’" Ã¢â€ Â "Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ Ã™â€¦Ã™â€¡Ã™â€ Ã™Å ". Ã˜Â³Ã˜ÂªÃ˜ÂªÃ™â€žÃ™â€šÃ™â€° Ã˜ÂªÃ˜Â£Ã™Æ’Ã™Å Ã˜Â¯Ã˜Â§Ã™â€¹ Ã˜Â¨Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å .' },
          { text: 'Ã˜Â¨Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€žÃ˜Å’ Ã˜Â³Ã˜Â¬Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¯Ã˜Â®Ã™Ë†Ã™â€ž Ã¢â€ Â "Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª" Ã˜Â£Ã™Ë† "Mon compte" Ã¢â€ Â Ã˜Â§Ã˜Â¨Ã˜Â­Ã˜Â« Ã˜Â¹Ã™â€  Ã™â€¦Ã™ÂÃ˜Â§Ã˜ÂªÃ™Å Ã˜Â­ API Ã˜Â£Ã™Ë† "IntÃƒÂ©gration".' },
          { text: 'Ã˜Â§Ã™â€ Ã˜Â³Ã˜Â®: Client ID Ã™Ë†API Key (Ã˜Â£Ã™Ë† Token). Ã˜Â¨Ã˜Â¹Ã˜Â¶ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨Ã˜Â§Ã˜Âª Ã˜ÂªÃ˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã™â€ Ã˜Â¸Ã˜Â§Ã™â€¦ Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã™Ë†Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â± Ã˜Â¨Ã˜Â¯Ã™â€žÃ˜Â§Ã™â€¹ Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã™Æ’Ã™â€ .', tip: 'Ã˜Â¥Ã˜Â°Ã˜Â§ Ã™â€žÃ™â€¦ Ã˜ÂªÃ˜Â¬Ã˜Â¯ Ã™â€¦Ã™ÂÃ˜Â§Ã˜ÂªÃ™Å Ã˜Â­ API Ã™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â©Ã˜Å’ Ã˜ÂªÃ™Ë†Ã˜Â§Ã˜ÂµÃ™â€ž Ã™â€¦Ã˜Â¹ Ã™ÂÃ˜Â±Ã™Å Ã™â€š ZR Express Ã˜Â¹Ã˜Â¨Ã˜Â± Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â§Ã˜ÂªÃ˜Â³Ã˜Â§Ã˜Â¨ Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã¢â‚¬â€ Ã™Å Ã˜Â±Ã˜Â³Ã™â€žÃ™Ë†Ã™â€ Ã™â€¡Ã˜Â§ Ã˜Â®Ã™â€žÃ˜Â§Ã™â€ž 24 Ã˜Â³Ã˜Â§Ã˜Â¹Ã˜Â©.' },
          { text: 'Ã™ÂÃ™Å  StoreDz: Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã¢â€ Â "Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž Ã™Ë†Ã˜Â§Ã™â€žÃ™â‚¬ API" Ã¢â€ Â ZR Express Ã¢â€ Â Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¹Ã˜Â±Ã™ÂÃ˜Â§Ã˜Âª. Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â¨Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂªÃ˜ÂµÃ˜Â§Ã™â€ž.' },
          { text: 'Ã™ÂÃ˜Â¹Ã™â€˜Ã™â€ž ZR Express Ã™Æ’Ã™â‚¬ "Ã™â€ Ã˜Â§Ã™â€šÃ™â€ž Ã˜Â«Ã˜Â§Ã™â€ Ã™Ë†Ã™Å ". Ã™Å Ã™â€¦Ã™Æ’Ã™â€ Ã™Æ’ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã™Å Ã™â€¡ Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã™Å Ã˜Â¯Ã™Ë†Ã™Å Ã˜Â§Ã™â€¹ Ã˜Â¨Ã™Å Ã™â€  Yalidine Ã™Ë†ZR Express Ã˜Â­Ã˜Â³Ã˜Â¨ Ã˜Â§Ã™â€žÃ™Ë†Ã™â€žÃ˜Â§Ã™Å Ã˜Â© Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â£Ã™Ë†Ã™â€žÃ™Ë†Ã™Å Ã˜Â©.' },
          { text: 'Ã™â€žÃ™â€žÃ™â€¦Ã˜Â¯Ã™â€  Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â¨Ã˜Â±Ã™â€°Ã˜Å’ Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ ZR Express Ã™â€žÃ™â€žÃ˜Â³Ã˜Â±Ã˜Â¹Ã˜Â©. Ã™â€žÃ™â€žÃ™â€¦Ã™â€ Ã˜Â§Ã˜Â·Ã™â€š Ã˜Â§Ã™â€žÃ™â€ Ã˜Â§Ã˜Â¦Ã™Å Ã˜Â©Ã˜Å’ Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Yalidine Ã™â€žÃ™â€žÃ˜ÂªÃ˜ÂºÃ˜Â·Ã™Å Ã˜Â©.' },
        ],
        tip: 'ZR Express Ã™Å Ã˜ÂªÃ™â€¦Ã™Å Ã˜Â² Ã˜Â¨Ã™â€¦Ã˜Â±Ã™Ë†Ã™â€ Ã˜Â© Ã˜Â£Ã™Ë†Ã™â€šÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜ÂµÃ™Å Ã™â€ž Ã¢â‚¬â€ Ã™Å Ã™â€¦Ã™Æ’Ã™â€ Ã™Æ’ Ã˜Â¬Ã˜Â¯Ã™Ë†Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜ÂµÃ™Å Ã™â€ž Ã™â€žÃ™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ™Å Ã™Ë†Ã™â€¦ Ã™ÂÃ™Å  Ã™â€¦Ã˜Â¹Ã˜Â¸Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¯Ã™â€  Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â¨Ã˜Â±Ã™â€°.',
      },
      {
        id: 'del4',
        title: 'Procolis Ã¢â‚¬â€ Ã˜Â£Ã˜Â¬Ã˜Â±Ã™Å Ã˜ÂºÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â± Ã™Å Ã˜Â®Ã˜ÂªÃ˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â±Ã˜Â®Ã˜Âµ Ã˜ÂªÃ™â€žÃ™â€šÃ˜Â§Ã˜Â¦Ã™Å Ã˜Â§Ã™â€¹',
        duration: '7 min',
        intro: 'Procolis Ã™â€žÃ™Å Ã˜Â³ Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž Ã¢â‚¬â€ Ã™â€¡Ã™Ë† Ã™â€¦Ã™â€ Ã˜ÂµÃ˜Â© Ã˜ÂªÃ˜Â¬Ã™â€¦Ã˜Â¹ Ã˜Â¹Ã˜Â¯Ã˜Â© Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â§Ã˜Âª (YalidineÃ˜Å’ ZR ExpressÃ˜Å’ Ã™Ë†Ã˜ÂºÃ™Å Ã˜Â±Ã™â€¡Ã˜Â§) Ã™Ë†Ã˜ÂªÃ˜Â®Ã˜ÂªÃ˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â±Ã˜Â®Ã˜Âµ Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â³Ã˜Â±Ã˜Â¹ Ã™â€žÃ™Æ’Ã™â€ž Ã™Ë†Ã™â€žÃ˜Â§Ã™Å Ã˜Â© Ã˜ÂªÃ™â€žÃ™â€šÃ˜Â§Ã˜Â¦Ã™Å Ã˜Â§Ã™â€¹.',
        steps: [
          { text: 'Ã˜Â§Ã˜Â°Ã™â€¡Ã˜Â¨ Ã˜Â¥Ã™â€žÃ™â€° procolis.com Ã¢â€ Â "CrÃƒÂ©er un compte" Ã¢â€ Â Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜ÂªÃ™Æ’ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¬Ã˜Â§Ã˜Â±Ã™Å Ã˜Â©. Ã˜Â§Ã™â€žÃ˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â©Ã™â€¹ Ã˜Â®Ã™â€žÃ˜Â§Ã™â€ž 24-48 Ã˜Â³Ã˜Â§Ã˜Â¹Ã˜Â©.', tip: 'Procolis Ã™Å Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜Â¹Ã™â€šÃ˜Â¯ Ã˜ÂªÃ˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜Â¨Ã˜Â³Ã™Å Ã˜Â·. Ã˜Â§Ã™â€šÃ˜Â±Ã˜Â£Ã™â€¡ Ã˜Â¬Ã™Å Ã˜Â¯Ã˜Â§Ã™â€¹ Ã¢â‚¬â€ Ã™Å Ã™Ë†Ã˜Â¶Ã˜Â­ Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â³Ã˜Â¹Ã˜Â§Ã˜Â± Ã™Ë†Ã˜Â´Ã˜Â±Ã™Ë†Ã˜Â· Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜ÂµÃ™Å Ã™â€ž.' },
          { text: 'Ã˜Â¨Ã˜Â¹Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž: Dashboard Ã¢â€ Â "ParamÃƒÂ¨tres API" Ã˜Â£Ã™Ë† "IntÃƒÂ©gration" Ã¢â€ Â Ã˜Â§Ã˜Â­Ã˜ÂµÃ™â€ž Ã˜Â¹Ã™â€žÃ™â€° API Key Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â§Ã˜Âµ Ã˜Â¨Ã™Æ’.' },
          { text: 'Ã˜Â±Ã˜Â¨Ã˜Â· Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž: Ã™ÂÃ™Å  Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â© ProcolisÃ˜Å’ Ã˜Â£Ã˜Â¶Ã™Â Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨Ã˜Â§Ã˜ÂªÃ™Æ’ Ã˜Â¹Ã™â€ Ã˜Â¯ Yalidine Ã™Ë†ZR Express (Ã˜Â¥Ã˜Â°Ã˜Â§ Ã™Æ’Ã˜Â§Ã™â€ Ã˜Âª Ã™â€žÃ˜Â¯Ã™Å Ã™Æ’). Procolis Ã™Å Ã˜Â±Ã˜Â¨Ã˜Â· Ã˜Â¨Ã™Å Ã™â€ Ã™â€¡Ã˜Â§ Ã™Ë†Ã™Å Ã™Ë†Ã˜Â¬Ã™â€¡ Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜ÂªÃ™â€žÃ™â€šÃ˜Â§Ã˜Â¦Ã™Å Ã˜Â§Ã™â€¹.' },
          { text: 'Ã™ÂÃ™Å  StoreDz: Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã¢â€ Â "Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž Ã™Ë†Ã˜Â§Ã™â€žÃ™â‚¬ API" Ã¢â€ Â Procolis Ã¢â€ Â Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž API Key. Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â¨Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂªÃ˜ÂµÃ˜Â§Ã™â€ž.' },
          { text: 'Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â¨Ã™Ë†Ã™â€žÃ™Å Ã˜ÂµÃ˜Â©Ã˜Å’ Procolis Ã™Å Ã™â€šÃ˜Â§Ã˜Â±Ã™â€  Ã˜Â£Ã˜Â³Ã˜Â¹Ã˜Â§Ã˜Â± Ã˜Â¬Ã™â€¦Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Æ’Ã˜Â§Ã˜Âª Ã™â€žÃ˜ÂªÃ™â€žÃ™Æ’ Ã˜Â§Ã™â€žÃ™Ë†Ã™â€žÃ˜Â§Ã™Å Ã˜Â© Ã™Ë†Ã™Å Ã˜Â®Ã˜ÂªÃ˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â£Ã™â€ Ã˜Â³Ã˜Â¨. Ã˜ÂªÃ™Ë†Ã™ÂÃ™Å Ã˜Â± 15-25% Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã˜Â§Ã™â€žÃ™Å Ã™Â Ã™â€¦Ã™â€¦Ã™Æ’Ã™â€  Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â¬Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â§Ã™â€žÃ™Å .', tip: 'Ã™ÂÃ˜Â¹Ã™â€˜Ã™â€ž "Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â± Ã˜ÂªÃ™â€žÃ™â€šÃ˜Â§Ã˜Â¦Ã™Å  Ã™â€žÃ™â€žÃ™â€ Ã˜Â§Ã™â€šÃ™â€ž" Ã™ÂÃ™Å  Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Procolis. Ã™Å Ã™â€¦Ã™Æ’Ã™â€ Ã™Æ’ Ã™Ë†Ã˜Â¶Ã˜Â¹ Ã˜Â£Ã™Ë†Ã™â€žÃ™Ë†Ã™Å Ã˜Â© (Ã˜Â³Ã˜Â¹Ã˜Â± Ã˜Â£Ã™â€¦ Ã˜Â³Ã˜Â±Ã˜Â¹Ã˜Â©) Ã™â€žÃ™Æ’Ã™â€ž Ã™â€¦Ã™â€ Ã˜Â·Ã™â€šÃ˜Â©.' },
          { text: 'Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â© Ã™Æ’Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â·Ã˜Â±Ã™Ë†Ã˜Â¯ Ã™â€¦Ã™â€  Ã™â€¦Ã™Æ’Ã˜Â§Ã™â€  Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯: Procolis Dashboard Ã™Å Ã˜Â¬Ã™â€¦Ã˜Â¹ Ã˜ÂªÃ™â€šÃ˜Â§Ã˜Â±Ã™Å Ã˜Â± Ã˜Â¬Ã™â€¦Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Æ’Ã˜Â§Ã˜Âª Ã™ÂÃ™Å  Ã™Ë†Ã˜Â§Ã˜Â¬Ã™â€¡Ã˜Â© Ã™â€¦Ã™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©.' },
        ],
        tip: 'Procolis Ã™â€¦Ã˜Â«Ã˜Â§Ã™â€žÃ™Å  Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â§Ã™â€žÃ™Ë†Ã˜ÂµÃ™Ë†Ã™â€ž Ã™â€žÃ™â‚¬ 50+ Ã˜Â·Ã˜Â±Ã˜Â¯/Ã˜Â´Ã™â€¡Ã˜Â±. Ã˜Â¹Ã™â€ Ã˜Â¯ Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â¬Ã™â€¦Ã˜Å’ Ã˜Â§Ã™â€žÃ™ÂÃ˜Â§Ã˜Â±Ã™â€š Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã™â€žÃ™ÂÃ˜Â© Ã™Å Ã˜ÂµÃ˜Â¨Ã˜Â­ Ã™Æ’Ã˜Â¨Ã™Å Ã˜Â±Ã˜Â§Ã™â€¹ Ã™Ë†Ã˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯Ã˜Â© Ã˜Â£Ã˜Â³Ã™â€¡Ã™â€ž Ã˜Â¨Ã™Æ’Ã˜Â«Ã™Å Ã˜Â±.',
        warning: 'Procolis Ã™Å Ã˜Â¶Ã™Å Ã™Â Ã˜Â·Ã˜Â¨Ã™â€šÃ˜Â© Ã™Ë†Ã˜Â³Ã™Å Ã˜Â·Ã˜Â©. Ã™ÂÃ™Å  Ã˜Â­Ã˜Â§Ã™â€žÃ˜Â© Ã™â€¦Ã˜Â´Ã™Æ’Ã™â€žÃ˜Â© Ã™â€¦Ã˜Â¹ Ã˜Â·Ã˜Â±Ã˜Â¯Ã˜Å’ Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜Â§Ã˜ÂµÃ™â€ž Ã™â€¦Ã˜Â¹ Procolis Ã˜Â£Ã™Ë†Ã™â€žÃ˜Â§Ã™â€¹ Ã˜Â«Ã™â€¦ Ã™â€¡Ã™â€¦ Ã™Å Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã™Ë†Ã™â€  Ã™â€¦Ã˜Â¹ Ã˜Â´Ã˜Â±Ã™Æ’Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã™â€ž.',
      },
    ] : lang === 'en' ? [
      {
        id: 'del1',
        title: 'Why use the API? Ã¢â‚¬â€ Benefits and requirements',
        duration: '5 min',
        intro: 'The API connects StoreDz directly to the delivery company\'s system. Instead of creating each shipping label manually on the carrier\'s website, you create it with one click from your dashboard.',
        steps: [
          { text: 'Without API: open the carrier\'s website, fill in customer data manually, print the label. Each parcel takes 3-5 minutes.', tip: 'Without API is acceptable for 1-10 parcels per day. Above that, wasted time adds up fast.' },
          { text: 'With API: press "Create label" in StoreDz Ã¢â€ â€™ data transfers automatically Ã¢â€ â€™ print the label directly. Each parcel takes 20 seconds.' },
          { text: 'Requirements: an active professional (business) account with the delivery company. Personal accounts usually don\'t grant API access.', tip: 'Open your business account early Ã¢â‚¬â€ activation can take 1-3 business days.' },
          { text: 'After your business account is activated, look in your carrier dashboard for an "API" or "Developer settings" section to get your access keys.' },
          { text: 'In StoreDz: Settings Ã¢â€ â€™ "Delivery & API" Ã¢â€ â€™ choose carrier Ã¢â€ â€™ enter the keys Ã¢â€ â€™ save and test the connection.' },
        ],
        tip: 'Start with one carrier only. Master its API before adding another. Yalidine is recommended for beginners due to good API documentation.',
      },
      {
        id: 'del2',
        title: 'Yalidine API Ã¢â‚¬â€ Account setup and getting your keys',
        duration: '8 min',
        intro: 'Yalidine is the most popular delivery company in Algeria for e-commerce. Well-documented API, easy to use, covers all 58 wilayas.',
        steps: [
          { text: 'Go to yalidine.app Ã¢â€ â€™ "Create account" Ã¢â€ â€™ choose "Business account". Completing the form fully speeds up activation.', tip: 'Add your business registration number if you have one Ã¢â‚¬â€ it helps with faster activation.' },
          { text: 'After account review and activation (1-3 business days), log in Ã¢â€ â€™ go to "Account settings" Ã¢â€ â€™ "API" section.' },
          { text: 'You\'ll find: Centre ID (your center number) and Token (access token). Copy both carefully Ã¢â‚¬â€ these are your connection keys.', tip: 'Save the Token in a safe place. If lost, you can generate a new one but the old one will be revoked.' },
          { text: 'In StoreDz: Settings Ã¢â€ â€™ "Delivery & API" Ã¢â€ â€™ Yalidine Ã¢â€ â€™ enter Centre ID and Token. Click "Test connection".' },
          { text: 'Successful test Ã¢â€ â€™ enable "Automatic label creation". Now when you confirm any order, the label is created automatically.', tip: 'First test with a real low-value order to verify customer data accuracy before fully relying on the API.' },
          { text: 'To print a label: dashboard Ã¢â€ â€™ order Ã¢â€ â€™ "Print label". The sticker prints in A6 or A4 split format.' },
        ],
        tip: 'Yalidine provides webhooks for real-time notifications when parcel status changes. Enable it in API settings to automatically update order statuses in StoreDz.',
        warning: 'Verify the customer\'s address before creating the label. Editing after creation requires contacting customer service.',
      },
      {
        id: 'del3',
        title: 'ZR Express API Ã¢â‚¬â€ Fast in major cities',
        duration: '8 min',
        intro: 'ZR Express is very fast in major cities (Algiers, Oran, Constantine Ã¢â‚¬â€ J+1 delivery). Ideal if most of your customers are in the north.',
        steps: [
          { text: 'Go to zrexpress.dz Ã¢â€ â€™ "Subscribe" Ã¢â€ â€™ "Professional account". You\'ll receive email confirmation.' },
          { text: 'After activation, log in Ã¢â€ â€™ "Settings" or "Mon compte" Ã¢â€ â€™ look for API keys or "Integration".' },
          { text: 'Copy: Client ID and API Key (or Token). Some accounts use username/password instead of a token.', tip: 'If you don\'t find API keys directly, contact the ZR Express team via WhatsApp or email Ã¢â‚¬â€ they send them within 24 hours.' },
          { text: 'In StoreDz: Settings Ã¢â€ â€™ "Delivery & API" Ã¢â€ â€™ ZR Express Ã¢â€ â€™ enter credentials. Test connection.' },
          { text: 'Enable ZR Express as a "secondary carrier". You can manually route orders between Yalidine and ZR Express by wilaya and priority.' },
          { text: 'For major cities, use ZR Express for speed. For remote areas, use Yalidine for coverage.' },
        ],
        tip: 'ZR Express offers flexible pickup times Ã¢â‚¬â€ you can schedule same-day pickup in most major cities.',
      },
      {
        id: 'del4',
        title: 'Procolis Ã¢â‚¬â€ Aggregator that auto-selects the cheapest carrier',
        duration: '7 min',
        intro: 'Procolis is not a delivery company Ã¢â‚¬â€ it\'s a platform that bundles several carriers (Yalidine, ZR Express, and others) and automatically selects the cheapest and fastest for each wilaya.',
        steps: [
          { text: 'Go to procolis.com Ã¢â€ â€™ "CrÃƒÂ©er un compte" Ã¢â€ â€™ enter your business details. Activation usually within 24-48 hours.', tip: 'Procolis requires a simple business contract. Read it carefully Ã¢â‚¬â€ it explains pricing and collection terms.' },
          { text: 'After activation: Dashboard Ã¢â€ â€™ "API Settings" or "Integration" Ã¢â€ â€™ get your API Key.' },
          { text: 'Connect carriers: in the Procolis dashboard, add your Yalidine and ZR Express accounts (if you have them). Procolis links them and routes orders automatically.' },
          { text: 'In StoreDz: Settings Ã¢â€ â€™ "Delivery & API" Ã¢â€ â€™ Procolis Ã¢â€ â€™ enter API Key. Test connection.' },
          { text: 'When creating a label, Procolis compares prices from all carriers for that wilaya and selects the best. Savings of 15-25% are possible at high volume.', tip: 'Enable "Automatic carrier selection" in Procolis settings. You can set priority (price vs speed) per region.' },
          { text: 'Track all parcels in one place: Procolis Dashboard consolidates reports from all carriers in a unified interface.' },
        ],
        tip: 'Procolis is ideal when reaching 50+ parcels/month. At this volume, the cost difference becomes significant and managing one platform is much easier.',
        warning: 'Procolis adds a middleware layer. In case of a parcel issue, contact Procolis first Ã¢â‚¬â€ they then follow up with the carrier.',
      },
    ] : [
      {
        id: 'del1',
        title: 'Pourquoi utiliser l\'API ? Ã¢â‚¬â€ Avantages et prÃƒÂ©requis',
        duration: '5 min',
        intro: 'L\'API connecte StoreDz directement au systÃƒÂ¨me du transporteur. Au lieu de crÃƒÂ©er chaque bon d\'expÃƒÂ©dition manuellement sur le site du transporteur, vous le crÃƒÂ©ez en 1 clic depuis votre tableau de bord.',
        steps: [
          { text: 'Sans API : vous ouvrez le site du transporteur, remplissez les donnÃƒÂ©es client manuellement, imprimez le bon. Chaque colis prend 3-5 minutes.', tip: 'Sans API c\'est acceptable pour 1-10 colis par jour. Au-delÃƒÂ , le temps perdu devient considÃƒÂ©rable.' },
          { text: 'Avec API : vous cliquez "CrÃƒÂ©er bon d\'expÃƒÂ©dition" dans StoreDz Ã¢â€ â€™ les donnÃƒÂ©es se transfÃƒÂ¨rent automatiquement Ã¢â€ â€™ vous imprimez directement. Chaque colis prend 20 secondes.' },
          { text: 'PrÃƒÂ©requis : un compte professionnel (commercial) activÃƒÂ© chez le transporteur. Les comptes personnels ne donnent gÃƒÂ©nÃƒÂ©ralement pas accÃƒÂ¨s ÃƒÂ  l\'API.', tip: 'Ouvrez votre compte professionnel en avance Ã¢â‚¬â€ l\'activation peut prendre 1-3 jours ouvrables.' },
          { text: 'Une fois votre compte professionnel activÃƒÂ©, cherchez dans votre espace client la section "API" ou "ParamÃƒÂ¨tres dÃƒÂ©veloppeur" pour obtenir vos clÃƒÂ©s d\'accÃƒÂ¨s.' },
          { text: 'Dans StoreDz : ParamÃƒÂ¨tres Ã¢â€ â€™ "Livraison & API" Ã¢â€ â€™ choisissez le transporteur Ã¢â€ â€™ entrez les clÃƒÂ©s Ã¢â€ â€™ sauvegardez et testez la connexion.' },
        ],
        tip: 'Commencez avec un seul transporteur. MaÃƒÂ®trisez son API avant d\'en ajouter un autre. Yalidine est recommandÃƒÂ© pour les dÃƒÂ©butants grÃƒÂ¢ce ÃƒÂ  une documentation API bien faite.',
      },
      {
        id: 'del2',
        title: 'Yalidine API Ã¢â‚¬â€ CrÃƒÂ©er votre compte et obtenir vos clÃƒÂ©s',
        duration: '8 min',
        intro: 'Yalidine est le transporteur le plus populaire en AlgÃƒÂ©rie pour le e-commerce. API bien documentÃƒÂ©e, facile ÃƒÂ  utiliser, couverture des 58 wilayas.',
        steps: [
          { text: 'Allez sur yalidine.app Ã¢â€ â€™ "CrÃƒÂ©er un compte" Ã¢â€ â€™ choisissez "Compte professionnel". Remplir le formulaire complÃƒÂ¨tement accÃƒÂ©lÃƒÂ¨re l\'activation.', tip: 'Ajoutez votre numÃƒÂ©ro de registre de commerce si vous en avez un Ã¢â‚¬â€ ÃƒÂ§a aide pour une activation plus rapide.' },
          { text: 'AprÃƒÂ¨s validation et activation de votre compte (1-3 jours ouvrables), connectez-vous Ã¢â€ â€™ allez dans "ParamÃƒÂ¨tres du compte" Ã¢â€ â€™ section "API".' },
          { text: 'Vous trouverez : Centre ID (votre numÃƒÂ©ro de centre) et Token (jeton d\'accÃƒÂ¨s). Copiez-les soigneusement Ã¢â‚¬â€ ce sont vos deux clÃƒÂ©s de connexion.', tip: 'Conservez le Token en lieu sÃƒÂ»r. En cas de perte, vous pouvez en gÃƒÂ©nÃƒÂ©rer un nouveau mais l\'ancien sera rÃƒÂ©voquÃƒÂ©.' },
          { text: 'Dans StoreDz : ParamÃƒÂ¨tres Ã¢â€ â€™ "Livraison & API" Ã¢â€ â€™ Yalidine Ã¢â€ â€™ entrez le Centre ID et le Token. Cliquez "Tester la connexion".' },
          { text: 'Test rÃƒÂ©ussi Ã¢â€ â€™ activez "CrÃƒÂ©ation automatique de bons d\'expÃƒÂ©dition". DÃƒÂ©sormais, ÃƒÂ  chaque confirmation de commande, le bon est crÃƒÂ©ÃƒÂ© automatiquement.', tip: 'Testez d\'abord avec une vraie commande de faible valeur pour vÃƒÂ©rifier la correction des donnÃƒÂ©es client avant de vous fier entiÃƒÂ¨rement ÃƒÂ  l\'API.' },
          { text: 'Pour imprimer un bon : tableau de bord Ã¢â€ â€™ commande Ã¢â€ â€™ "Imprimer le bon". Le bordereau s\'imprime en format A6 ou A4 divisÃƒÂ©.' },
        ],
        tip: 'Yalidine fournit des webhooks pour des notifications en temps rÃƒÂ©el lors des changements de statut du colis. Activez-les dans les paramÃƒÂ¨tres API pour mettre ÃƒÂ  jour automatiquement les statuts des commandes dans StoreDz.',
        warning: 'VÃƒÂ©rifiez l\'adresse du client avant de crÃƒÂ©er le bon. Toute modification aprÃƒÂ¨s crÃƒÂ©ation nÃƒÂ©cessite de contacter le service client.',
      },
      {
        id: 'del3',
        title: 'ZR Express API Ã¢â‚¬â€ RapiditÃƒÂ© sur les grandes villes',
        duration: '8 min',
        intro: 'ZR Express est trÃƒÂ¨s rapide sur les grandes villes (Alger, Oran, Constantine Ã¢â‚¬â€ livraison J+1). IdÃƒÂ©al si la majoritÃƒÂ© de vos clients est dans le nord.',
        steps: [
          { text: 'Allez sur zrexpress.dz Ã¢â€ â€™ "S\'abonner" Ã¢â€ â€™ "Compte professionnel". Vous recevrez une confirmation par email.' },
          { text: 'AprÃƒÂ¨s activation, connectez-vous Ã¢â€ â€™ "ParamÃƒÂ¨tres" ou "Mon compte" Ã¢â€ â€™ cherchez les clÃƒÂ©s API ou la section "IntÃƒÂ©gration".' },
          { text: 'Copiez : Client ID et API Key (ou Token). Certains comptes utilisent un systÃƒÂ¨me nom d\'utilisateur + mot de passe plutÃƒÂ´t qu\'un token.', tip: 'Si vous ne trouvez pas les clÃƒÂ©s API directement, contactez l\'ÃƒÂ©quipe ZR Express via WhatsApp ou email Ã¢â‚¬â€ ils les envoient sous 24 heures.' },
          { text: 'Dans StoreDz : ParamÃƒÂ¨tres Ã¢â€ â€™ "Livraison & API" Ã¢â€ â€™ ZR Express Ã¢â€ â€™ entrez les identifiants. Testez la connexion.' },
          { text: 'Activez ZR Express comme "transporteur secondaire". Vous pouvez router manuellement les commandes entre Yalidine et ZR Express selon la wilaya et l\'urgence.' },
          { text: 'Pour les grandes villes, utilisez ZR Express pour la rapiditÃƒÂ©. Pour les zones ÃƒÂ©loignÃƒÂ©es, utilisez Yalidine pour la couverture.' },
        ],
        tip: 'ZR Express offre une flexibilitÃƒÂ© sur les horaires d\'enlÃƒÂ¨vement Ã¢â‚¬â€ vous pouvez planifier un enlÃƒÂ¨vement le jour mÃƒÂªme dans la plupart des grandes villes.',
      },
      {
        id: 'del4',
        title: 'Procolis Ã¢â‚¬â€ AgrÃƒÂ©gateur qui choisit automatiquement le moins cher',
        duration: '7 min',
        intro: 'Procolis n\'est pas un transporteur Ã¢â‚¬â€ c\'est une plateforme qui agrÃƒÂ¨ge plusieurs transporteurs (Yalidine, ZR Express, et d\'autres) et sÃƒÂ©lectionne automatiquement le moins cher et le plus rapide pour chaque wilaya.',
        steps: [
          { text: 'Allez sur procolis.com Ã¢â€ â€™ "CrÃƒÂ©er un compte" Ã¢â€ â€™ entrez vos informations professionnelles. Activation gÃƒÂ©nÃƒÂ©ralement sous 24-48 heures.', tip: 'Procolis demande un contrat commercial simple. Lisez-le bien Ã¢â‚¬â€ il dÃƒÂ©taille les tarifs et les modalitÃƒÂ©s de reversement.' },
          { text: 'AprÃƒÂ¨s activation : Dashboard Ã¢â€ â€™ "ParamÃƒÂ¨tres API" ou "IntÃƒÂ©gration" Ã¢â€ â€™ rÃƒÂ©cupÃƒÂ©rez votre API Key.' },
          { text: 'Connexion des transporteurs : dans le dashboard Procolis, ajoutez vos comptes Yalidine et ZR Express (si vous en avez). Procolis les agrÃƒÂ¨ge et route les commandes automatiquement.' },
          { text: 'Dans StoreDz : ParamÃƒÂ¨tres Ã¢â€ â€™ "Livraison & API" Ã¢â€ â€™ Procolis Ã¢â€ â€™ entrez l\'API Key. Testez la connexion.' },
          { text: 'Ãƒâ‚¬ chaque crÃƒÂ©ation de bon, Procolis compare les prix de tous les transporteurs pour cette wilaya et choisit le plus avantageux. Ãƒâ€°conomies de 15-25% possibles ÃƒÂ  volume ÃƒÂ©levÃƒÂ©.', tip: 'Activez "SÃƒÂ©lection automatique du transporteur" dans les paramÃƒÂ¨tres Procolis. Vous pouvez dÃƒÂ©finir une prioritÃƒÂ© (prix ou rapiditÃƒÂ©) par rÃƒÂ©gion.' },
          { text: 'Suivez tous vos colis depuis un seul endroit : le Dashboard Procolis consolide les rapports de tous les transporteurs dans une interface unifiÃƒÂ©e.' },
        ],
        tip: 'Procolis est idÃƒÂ©al ÃƒÂ  partir de 50+ colis/mois. Ãƒâ‚¬ ce volume, la diffÃƒÂ©rence de coÃƒÂ»t devient significative et gÃƒÂ©rer une seule plateforme est bien plus pratique.',
        warning: 'Procolis ajoute une couche intermÃƒÂ©diaire. En cas de problÃƒÂ¨me avec un colis, contactez Procolis d\'abord Ã¢â‚¬â€ ils suivent ensuite avec le transporteur.',
      },
    ],
  }

  return [pixelsModule, deliveryModule]
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Level badge Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Lesson content block Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function LessonContent({ lesson }: { lesson: Lesson }) {
  return (
    <div className="px-5 pb-5 pt-1">
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{lesson.intro}</p>

        <ol className="space-y-3">
          {lesson.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800 leading-relaxed">{step.text}</p>
                {step.tip && (
                  <div className="mt-1.5 flex gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                    <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{step.tip}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        {lesson.tip && (
          <div className="mt-4 flex gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 leading-relaxed">{lesson.tip}</p>
          </div>
        )}

        {lesson.warning && (
          <div className="mt-3 flex gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-800 leading-relaxed">{lesson.warning}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Page Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export default function SellerAcademyPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const isRTL = useRTL()
  const lang  = useLang()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openModule, setOpenModule]   = useState<string>('payments')
  const [openLesson, setOpenLesson]   = useState<string | null>('pay1')
  const [doneSet, setDoneSet]         = useState<Set<string>>(new Set())

  if (loading || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const allModules   = [...MODULES, ...getExtraModules(lang)]
  const totalLessons = allModules.reduce((s, m) => s + m.lessons.length, 0)
  const doneLessons  = doneSet.size
  const progressPct  = Math.round((doneLessons / totalLessons) * 100)

  const toggleDone = (lessonId: string) => {
    setDoneSet((prev) => {
      const next = new Set(prev)
      if (next.has(lessonId)) next.delete(lessonId); else next.add(lessonId)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden sticky top-0 z-20 bg-gray-950 flex items-center h-14 px-4 gap-3 shadow-sm">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors" aria-label="Menu"><Menu className="w-5 h-5" /></button>
        <span className="font-semibold text-white text-sm truncate flex-1">{vendor.store_name}</span>
      </div>
      <SellerSidebar storeName={vendor.store_name!} slug={vendor.store_slug!} onLogout={signOut} logoUrl={vendor.logo_url}
        subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className={`flex-1 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-8 min-w-0`}>

        {/* Hero */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-8 mb-6 text-white relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
            <GraduationCap className="w-48 h-48" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-1.5">
              <GraduationCap className="w-5 h-5" />
              <span className="text-sm font-bold opacity-75">StoreDz Academy</span>
            </div>
            <h1 className="text-3xl font-black mb-2">Vendez plus, mieux, plus vite.</h1>
            <p className="text-emerald-100 text-sm max-w-xl mb-5">
              Guides pratiques par des vendeurs algÃƒÂ©riens actifs. Appliquez chaque leÃƒÂ§on le jour mÃƒÂªme.
            </p>

            <div className="flex items-center gap-6">
              <div className="bg-white/15 rounded-xl px-4 py-2.5">
                <div className="flex items-center justify-between gap-8 mb-1.5">
                  <span className="text-xs font-bold">Progression</span>
                  <span className="text-xs font-bold">{doneLessons}/{totalLessons}</span>
                </div>
                <div className="w-48 h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
                {doneLessons > 0 && (
                  <p className="text-[11px] text-emerald-100 mt-1.5 flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {progressPct >= 100 ? 'Cours terminÃƒÂ© ! Ã°Å¸Å½â€°' : `${progressPct}% complÃƒÂ©tÃƒÂ©`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: `${allModules.length} modules`, sub: 'de formation',       icon: BookOpen,  color: 'bg-blue-50 text-blue-600' },
            { label: `${totalLessons} leÃƒÂ§ons`,    sub: 'guides complets',    icon: Play,      color: 'bg-violet-50 text-violet-600' },
            { label: '100% gratuit',              sub: 'tout le contenu',    icon: Award,     color: 'bg-emerald-50 text-emerald-600' },
          ].map(({ label, sub, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Modules */}
        <div className="space-y-3">
          {allModules.map((mod) => {
            const isModOpen = openModule === mod.id
            const Icon      = mod.icon
            const modDone   = mod.lessons.filter((l) => doneSet.has(l.id)).length

            return (
              <div key={mod.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${isModOpen ? 'border-emerald-200' : 'border-gray-100'}`}>
                {/* Module header */}
                <button
                  onClick={() => setOpenModule(isModOpen ? '' : mod.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50/50 transition-colors rounded-2xl"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${mod.bg}`}>
                    <Icon className={`w-6 h-6 ${mod.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-gray-900">{mod.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${mod.badgeBg}`}>{mod.badge}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{mod.desc}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="h-1 w-24 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round((modDone / mod.lessons.length) * 100)}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-400">{modDone}/{mod.lessons.length} leÃƒÂ§ons</span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isModOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Lessons */}
                {isModOpen && (
                  <div className="border-t border-gray-50">
                    {mod.lessons.map((lesson) => {
                      const isOpen = openLesson === lesson.id
                      const done   = doneSet.has(lesson.id)

                      return (
                        <div key={lesson.id} className={`border-b border-gray-50 last:border-0 ${isOpen ? 'bg-white' : ''}`}>
                          <button
                            onClick={() => setOpenLesson(isOpen ? null : lesson.id)}
                            className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50/50 transition-colors"
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleDone(lesson.id) }}
                              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                                done ? 'bg-emerald-500 text-white' : 'border-2 border-gray-200 text-transparent hover:border-emerald-400'
                              }`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                {lesson.title}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />{lesson.duration}
                              </span>
                              <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                            </div>
                          </button>

                          {isOpen && <LessonContent lesson={lesson} />}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white flex items-center justify-between">
          <div>
            <p className="font-black text-lg">Une question sur vos ventes ?</p>
            <p className="text-emerald-100 text-sm mt-0.5">Notre ÃƒÂ©quipe support est disponible 7j/7 sur WhatsApp.</p>
          </div>
          <a
            href="https://wa.me/213555000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white text-emerald-700 font-black px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-50 transition-colors flex-shrink-0"
          >
            <Smartphone className="w-4 h-4" />
            Contacter le support
          </a>
        </div>

      </main>
    </div>
  )
}
