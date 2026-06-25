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

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Modules & Lessons ─────────────────────────────────────────────────────────

const MODULES: Module[] = [
  // ── 1. PAIEMENTS (featured first) ───────────────────────────────────────────
  {
    id:      'payments',
    title:   'Paiements & Encaissements',
    icon:    CreditCard,
    color:   'text-emerald-600',
    bg:      'bg-emerald-50',
    badge:   'Essentiel',
    badgeBg: 'bg-emerald-100 text-emerald-700',
    desc:    'Maîtrisez tous les modes de paiement algériens : CCP, BaridiMob, carte bancaire et paiement à la livraison.',
    lessons: [
      {
        id:       'pay1',
        title:    'Encaisser par CCP — virement postal complet',
        duration: '7 min',
        intro:    'Le CCP (Compte Courant Postal) est le compte bancaire de La Poste Algérie. C\'est l\'un des moyens de paiement les plus populaires en Algérie. Voici comment encaisser vos ventes via CCP.',
        steps: [
          { text: 'Trouvez votre numéro CCP sur votre carnet de chèques postal ou votre relevé de compte La Poste. Le format est : XXXXXXXX CC (ex: 00123456 78).', tip: 'Conservez votre numéro CCP en lieu sûr. Ne le partagez qu\'avec des acheteurs confirmés.' },
          { text: 'Communiquez votre numéro CCP à l\'acheteur via WhatsApp ou dans la confirmation de commande. Précisez le montant exact à virer.' },
          { text: 'L\'acheteur se rend au bureau de La Poste le plus proche, remplit une "Demande de Virement Postal" avec votre numéro CCP et le montant, et remet le formulaire au guichetier.', tip: 'Demandez à l\'acheteur de noter le numéro de commande dans la rubrique "motif du virement" pour faciliter le suivi.' },
          { text: 'L\'acheteur reçoit un reçu de virement. Demandez-lui de vous l\'envoyer en photo par WhatsApp comme preuve de paiement.' },
          { text: 'Vérifiez que le virement est bien crédité sur votre compte via l\'application BaridiMob (voir leçon suivante) ou en vous rendant au bureau de poste.', tip: 'Les virements entre CCP sont généralement traités le même jour ouvrable. Comptez jusqu\'à 24h pour les virements entre wilayas.' },
          { text: 'Une fois le paiement confirmé, procédez à l\'expédition de la commande.' },
        ],
        tip: 'Astuce pro : créez un message WhatsApp type avec vos instructions de paiement CCP pour gagner du temps. Incluez votre numéro CCP, le nom du bénéficiaire et le bureau de poste de rattachement.',
        warning: 'N\'expédiez JAMAIS une commande avant d\'avoir vérifié le crédit sur votre compte. Un reçu peut être falsifié.',
      },
      {
        id:       'pay2',
        title:    'BaridiMob — recevoir et vérifier les paiements',
        duration: '8 min',
        intro:    'BaridiMob est l\'application bancaire mobile de La Poste Algérie. Elle vous permet de recevoir des paiements instantanément, de vérifier votre solde en temps réel et de gérer votre compte CCP depuis votre téléphone.',
        steps: [
          { text: 'Téléchargez l\'application "BaridiMob" sur Google Play Store (Android) ou App Store (iPhone). Cherchez "بريد موب" ou "BaridiMob Algérie".' },
          { text: 'Au premier lancement, choisissez "Créer un compte" et entrez votre numéro CCP (inscrit sur votre carnet de chèques postal) et votre numéro de téléphone.', tip: 'Vous devez avoir un compte CCP actif à La Poste Algérie pour utiliser BaridiMob.' },
          { text: 'Recevez un code de vérification par SMS, entrez-le dans l\'application pour valider votre numéro de téléphone.' },
          { text: 'Créez votre code PIN à 6 chiffres — c\'est votre code secret pour toutes les transactions. Ne le communiquez à personne.' },
          { text: 'Pour consulter votre solde : ouvrez BaridiMob → Menu principal → "Consultation" → votre solde s\'affiche immédiatement.', tip: 'Configurez les notifications SMS dans les paramètres pour être alerté à chaque transaction reçue.' },
          { text: 'Pour recevoir un paiement : partagez votre numéro CCP avec l\'acheteur. Ils peuvent vous payer via BaridiMob (transfert instantané) ou au bureau de poste (virement postal).', tip: 'Votre numéro de téléphone enregistré sur BaridiMob peut aussi servir d\'identifiant pour recevoir des paiements instantanés.' },
          { text: 'Pour retirer de l\'argent : BaridiMob → "Retrait" → choisissez un bureau de La Poste → générez un code de retrait → présentez ce code au guichet avec votre pièce d\'identité.' },
        ],
        tip: 'BaridiMob permet des transferts instantanés 24h/24, 7j/7. Profitez-en pour confirmer les paiements les soirs et week-ends sans attendre l\'ouverture de La Poste.',
      },
      {
        id:       'pay3',
        title:    'Paiement à la livraison (COD) — gérer les risques',
        duration: '6 min',
        intro:    'Le paiement à la livraison (COD — Cash On Delivery) est le mode de paiement dominant en Algérie. Le client paie en espèces au livreur, qui vous reverse ensuite votre argent. Maîtrisez les risques pour éviter les pertes.',
        steps: [
          { text: 'Avant de confirmer une commande COD, appelez le client pour confirmer son intention d\'achat et valider son adresse de livraison.', tip: 'Les vendeurs qui appellent avant l\'expédition réduisent leur taux de refus de 40 à 60%.' },
          { text: 'Utilisez uniquement des transporteurs fiables (Yalidine, ZR Express, Procolis) qui collectent le COD et vous le reversent régulièrement.' },
          { text: 'Suivez votre tableau de bord StoreDz pour voir le statut de chaque livraison. Dès qu\'une commande est marquée "Livré", votre paiement est en route.' },
          { text: 'Le délai de reversement COD varie selon le transporteur : Yalidine reverse généralement sous 3-5 jours ouvrables, ZR Express sous 5-7 jours.', tip: 'Gardez une réserve de trésorerie pour ne pas être bloqué entre les expéditions et les reversements COD.' },
          { text: 'En cas de colis refusé ou retourné, le transporteur vous renvoie le colis et vous facture le retour. Contactez le client pour comprendre le motif.' },
          { text: 'Pour réduire les refus : utilisez un emballage solide, joignez une facture, et expédiez rapidement — plus le délai de livraison est court, plus le taux d\'acceptation est élevé.' },
        ],
        warning: 'Ne gérez jamais les COD en dehors du système de votre transporteur. Les paiements en espèces directs sans traçabilité exposent à des litiges non résolubles.',
      },
      {
        id:       'pay4',
        title:    'EDAHABIA & CIB — paiements en ligne par carte',
        duration: '5 min',
        intro:    'La carte EDAHABIA (carte jaune de La Poste Algérie) et la carte CIB (des banques conventionnelles) permettent aux clients de vous payer directement en ligne via la passerelle SATIM. C\'est automatique — vous n\'avez rien à configurer.',
        steps: [
          { text: 'Lorsqu\'un client choisit "Paiement en ligne" sur StoreDz, il est redirigé vers la page sécurisée de SATIM (passerelle nationale algérienne).' },
          { text: 'Le client entre les informations de sa carte EDAHABIA ou CIB. La transaction est validée par SATIM et confirmée instantanément.' },
          { text: 'StoreDz reçoit la confirmation de paiement et marque automatiquement la commande comme payée dans votre tableau de bord.', tip: 'Le paiement en ligne élimine le risque de refus COD — le client a déjà payé avant livraison.' },
          { text: 'Le reversement du montant est effectué selon le calendrier de votre abonnement vendeur. Aucune commission n\'est déduite — vous recevez 100% du montant payé. Consultez "Revenus & Paiements" dans votre tableau de bord pour le suivi.' },
          { text: 'Si un client rencontre une erreur de paiement, vérifiez qu\'il utilise bien une carte EDAHABIA ou CIB activée pour les paiements en ligne (certaines cartes nécessitent une activation spécifique à La Poste ou à la banque).', tip: 'La carte EDAHABIA est activée par défaut pour les paiements en ligne. La CIB nécessite parfois une demande d\'activation auprès de la banque.' },
        ],
        tip: 'Encouragez vos clients à utiliser le paiement en ligne — vous recevez l\'argent avant expédition, sans risque de refus.',
      },
      {
        id:       'pay5',
        title:    'Éviter les fraudes et impayés',
        duration: '5 min',
        intro:    'Quelques précautions simples vous protègent contre les fraudes les plus courantes. Ne laissez pas les mauvaises expériences vous décourager — les vendeurs vigilants ont moins de 1% d\'incidents.',
        steps: [
          { text: 'Ne vous fiez jamais à un screenshot de reçu CCP sans vérifier le crédit réel sur votre compte. Les faux reçus sont faciles à créer.', tip: 'Vérifiez toujours via BaridiMob ou au bureau de poste, jamais sur la base d\'une photo.' },
          { text: 'Méfiez-vous des acheteurs qui demandent une livraison urgente avant paiement confirmé — c\'est un signal d\'alarme fréquent.' },
          { text: 'Pour les commandes de grande valeur (au-dessus de 5 000 DA), privilégiez le paiement en ligne par carte ou demandez un acompte CCP.' },
          { text: 'Documentez toutes vos transactions : numéros de suivi, preuves de livraison, échanges WhatsApp. Ces preuves sont indispensables en cas de litige.' },
          { text: 'Si un acheteur conteste une livraison, votre preuve de livraison signée par le transporteur prime sur sa déclaration.' },
        ],
        warning: 'Ne faites jamais de remboursement avant d\'avoir récupéré le colis retourné. Des acheteurs malveillants réclament parfois des remboursements sans renvoyer la marchandise.',
      },
    ],
  },

  // ── 2. DÉMARRER ─────────────────────────────────────────────────────────────
  {
    id:      'start',
    title:   'Démarrer sur StoreDz',
    icon:    Package,
    color:   'text-blue-600',
    bg:      'bg-blue-50',
    badge:   'Débutant',
    badgeBg: 'bg-blue-100 text-blue-700',
    desc:    'Configurez votre boutique et publiez votre premier produit en moins d\'une heure.',
    lessons: [
      {
        id:       's1',
        title:    'Créer et configurer votre boutique',
        duration: '4 min',
        intro:    'Votre boutique est votre vitrine en ligne. Une page bien configurée inspire confiance et augmente vos conversions.',
        steps: [
          { text: 'Dans votre tableau de bord, allez dans "Paramètres" → "Boutique". Remplissez le nom de votre boutique, votre description et vos coordonnées.', tip: 'Choisissez un nom de boutique mémorable et facile à prononcer. Évitez les numéros et les tirets.' },
          { text: 'Téléchargez un logo professionnel (minimum 400×400 px, fond blanc de préférence). Un logo soigné double la confiance des acheteurs.' },
          { text: 'Ajoutez votre numéro de téléphone WhatsApp — c\'est le canal de communication numéro 1 pour les acheteurs algériens.' },
          { text: 'Précisez votre wilaya de localisation pour que les acheteurs sachent les délais de livraison approximatifs.' },
          { text: 'Sauvegardez. Votre page boutique est maintenant accessible à l\'adresse storedz.dz/shop/votre-slug.' },
        ],
        tip: 'Partagez le lien de votre boutique sur vos groupes WhatsApp et Facebook dès le premier jour — même si vous n\'avez qu\'un seul produit.',
      },
      {
        id:       's2',
        title:    'Ajouter votre premier produit avec photos',
        duration: '6 min',
        intro:    'Un bon produit bien présenté peut se vendre seul. Suivez cette checklist pour votre première annonce.',
        steps: [
          { text: 'Allez dans "Mes Produits" → "Ajouter un produit".' },
          { text: 'Titre : soyez précis et descriptif. Exemple : "Robe de soirée brodée bleu marine — taille M/L" plutôt que "Belle robe".', tip: 'Incluez la taille, la couleur et le matériau dans le titre pour apparaître dans les recherches.' },
          { text: 'Description : citez les caractéristiques principales, les dimensions, les matières et les conditions d\'utilisation. Répondez aux questions que les acheteurs posent toujours.' },
          { text: 'Photos : ajoutez au minimum 3 photos — face, dos, et détail du produit. La première photo est votre image de couverture.', tip: 'Photographiez sur un fond blanc ou neutre. La lumière naturelle d\'une fenêtre est suffisante.' },
          { text: 'Prix : calculez votre prix de revient (achat + frais d\'expédition) et ajoutez votre marge. StoreDz ne prend aucune commission — votre abonnement mensuel est votre seul frais fixe.' },
          { text: 'Stock : entrez la quantité disponible. StoreDz bloquera automatiquement les commandes si le stock tombe à zéro.' },
          { text: 'Publiez. Votre produit est immédiatement visible sur StoreDz.' },
        ],
      },
      {
        id:       's3',
        title:    'Configurer les modes de livraison',
        duration: '5 min',
        intro:    'Une livraison rapide et fiable est votre meilleure carte de visite. Voici comment configurer vos transporteurs dans StoreDz.',
        steps: [
          { text: 'Allez dans "Paramètres" → "Livraison & API".' },
          { text: 'Choisissez votre transporteur principal : Yalidine, ZR Express ou Procolis. Yalidine est recommandé pour les débutants car il couvre toutes les wilayas.' },
          { text: 'Entrez vos identifiants API de transporteur. Vous pouvez les obtenir en créant un compte professionnel sur le site de votre transporteur.', tip: 'Si vous débutez sans API, vous pouvez créer les expéditions manuellement depuis le site du transporteur en attendant.' },
          { text: 'Activez la création automatique d\'expéditions pour gagner du temps : StoreDz crée le bon de livraison dès que vous confirmez une commande.' },
          { text: 'Testez avec une première commande réelle pour vous assurer que tout fonctionne.' },
        ],
        tip: 'Négociez des tarifs dégressifs avec votre transporteur dès que vous atteignez 30-50 envois par mois.',
      },
      {
        id:       's4',
        title:    'Partager votre boutique sur les réseaux',
        duration: '3 min',
        intro:    'Vos premières ventes viennent de votre réseau personnel. Ne soyez pas timide — partagez.',
        steps: [
          { text: 'Copiez le lien de votre boutique StoreDz (storedz.dz/shop/votre-slug).' },
          { text: 'Publiez dans vos groupes WhatsApp avec une photo de votre meilleur produit et un message simple : "Je viens d\'ouvrir ma boutique en ligne — je livre dans toute l\'Algérie !"' },
          { text: 'Partagez sur votre page Facebook personnelle et votre page professionnelle si vous en avez une.' },
          { text: 'Rejoignez 3-5 groupes Facebook de vente dans votre région ou votre niche et publiez vos produits (vérifiez les règles de chaque groupe).' },
          { text: 'Ajoutez le lien de votre boutique dans votre bio Instagram si vous avez un compte actif.' },
        ],
      },
      {
        id:       's5',
        title:    'Recevoir et traiter votre première commande',
        duration: '7 min',
        intro:    'La première commande est le moment le plus important. Chaque détail compte pour fidéliser ce premier client.',
        steps: [
          { text: 'Vous recevez une notification (email + tableau de bord) pour chaque nouvelle commande. Répondez dans les 2 heures maximum.', tip: 'Activez les notifications push sur votre téléphone pour ne jamais rater une commande.' },
          { text: 'Vérifiez les informations de livraison dans votre tableau de bord : nom, téléphone, wilaya, cité.' },
          { text: 'Appelez le client pour confirmer la commande et l\'adresse exacte. C\'est rapide et ça réduit les retours.', tip: 'Script simple : "Bonjour, je suis [Nom de votre boutique]. Je vous appelle pour confirmer votre commande de [produit]. Votre adresse est bien [adresse] ?"' },
          { text: 'Préparez et emballez le colis soigneusement. Ajoutez un mot de remerciement manuscrit — ça marque les esprits.' },
          { text: 'Créez le bon de livraison via votre transporteur (manuellement ou automatiquement si l\'API est configurée).' },
          { text: 'Mettez à jour le statut dans StoreDz : "Confirmé" puis "Expédié" avec le numéro de suivi.' },
          { text: 'Envoyez le numéro de suivi au client par WhatsApp pour qu\'il puisse suivre sa livraison.' },
        ],
      },
    ],
  },

  // ── 3. PHOTOS ───────────────────────────────────────────────────────────────
  {
    id:      'photos',
    title:   'Photos qui vendent',
    icon:    Star,
    color:   'text-violet-600',
    bg:      'bg-violet-50',
    badge:   'Débutant',
    badgeBg: 'bg-violet-100 text-violet-700',
    desc:    'Des photos professionnelles avec seulement votre smartphone pour multiplier vos conversions par 3.',
    lessons: [
      {
        id:       'p1',
        title:    'Les 3 photos obligatoires pour chaque produit',
        duration: '5 min',
        intro:    'L\'acheteur algérien achète avec les yeux. Trois photos bien choisies suffisent pour déclencher la vente.',
        steps: [
          { text: 'Photo 1 — La couverture (80% des ventes se font sur cette photo) : produit seul, fond blanc ou beige, éclairage uniforme, produit occupe 70% du cadre.', tip: 'C\'est la seule photo que voit l\'acheteur dans les listes de produits. Elle doit être immédiatement reconnaissable.' },
          { text: 'Photo 2 — Le contexte d\'utilisation : le produit "en action" ou dans son environnement naturel. Une robe portée par un mannequin, un casque sur la tête, un plat dans une assiette.' },
          { text: 'Photo 3 — Le détail qui rassure : gros plan sur la texture, les coutures, les matières, les étiquettes, la taille comparative avec une main. Ce que l\'acheteur voudrait toucher.' },
          { text: 'Bonus : ajoutez une 4e photo avec le tableau des tailles (pour les vêtements), les dimensions exactes (pour les meubles/objets), ou les ingrédients (pour les produits alimentaires/cosmétiques).', tip: 'Les vendeurs qui ajoutent le tableau des tailles reçoivent 60% moins de questions et de retours.' },
        ],
      },
      {
        id:       'p2',
        title:    'Éclairage naturel : technique pour smartphone',
        duration: '8 min',
        intro:    'Pas besoin d\'un studio photo professionnel. Une fenêtre ensoleillée est votre meilleur équipement.',
        steps: [
          { text: 'Positionnez-vous à 1-2 mètres d\'une fenêtre qui reçoit de la lumière naturelle indirecte (pas de soleil direct qui crée des ombres dures).', tip: 'L\'heure idéale : 9h-11h le matin ou 15h-17h l\'après-midi. Évitez le soleil de midi.' },
          { text: 'Placez une feuille de papier blanc ou un tissu blanc de l\'autre côté du produit (côté opposé à la fenêtre) pour réfléchir la lumière et éliminer les ombres.', tip: 'Ce réflecteur DIY remplace un panneau professionnel à 5000 DA — c\'est 100% efficace.' },
          { text: 'Posez le produit sur un fond neutre : feuille A3 blanche, tissu beige, tableau blanc. Évitez les fonds chargés qui distraient.' },
          { text: 'Désactivez le flash de votre téléphone — il crée des reflets plats et non naturels.' },
          { text: 'Prenez 10-15 photos, changez légèrement l\'angle à chaque fois. Sélectionnez les 3-4 meilleures.' },
          { text: 'Activez la grille dans votre appareil photo et centrez le produit en utilisant la règle des tiers.' },
        ],
        tip: 'Investissement utile : une grande feuille de carton blanc (100 DA) et un rouleau de papier de fond blanc (disponible en papeterie) vous servent de studio portable.',
      },
      {
        id:       'p3',
        title:    'Applications gratuites de retouche',
        duration: '4 min',
        intro:    'Une légère retouche peut transformer une photo correcte en photo professionnelle. Voici les outils gratuits.',
        steps: [
          { text: 'Pour Android : Snapseed (Google, gratuit, très puissant). Pour iPhone : Photos natif + Lightroom Mobile (version gratuite suffit).' },
          { text: 'Retouches de base pour chaque photo : +légère luminosité (+10 à +15), +contraste (+5 à +10), fond blanc à +10 de luminosité.' },
          { text: 'Pour effacer un fond : Background Eraser (Android) ou Remove.bg (site web gratuit — uploadez la photo et le fond est supprimé automatiquement).' },
          { text: 'Pour uniformiser les fonds : utilisez l\'outil "Réglages de l\'image" dans Snapseed pour égaliser les zones trop sombres.', tip: 'Traitement en lot : Snapseed permet de copier les réglages d\'une photo et de les appliquer à toute une série — un gain de temps énorme.' },
          { text: 'Exportez en JPEG à qualité 90% pour un bon compromis taille/qualité.' },
        ],
      },
      {
        id:       'p4',
        title:    'Vidéos courtes : +40% de conversions',
        duration: '7 min',
        intro:    'Une vidéo de 15-30 secondes montrant le produit sous tous les angles ou en utilisation réelle est votre atout le plus puissant.',
        steps: [
          { text: 'Format idéal : vidéo verticale (9:16) de 15 à 30 secondes. Pas besoin de son — la plupart des utilisateurs regardent sans son.' },
          { text: 'Démarrez avec le produit fermé dans son emballage, puis déballez-le lentement pour montrer la présentation.' },
          { text: 'Faites tourner le produit à 360° devant la caméra. Pour les vêtements, montrez le tissu se déplacer pour illustrer la fluidité ou la rigidité.' },
          { text: 'Incluez une démonstration d\'utilisation si pertinent : ouvrir/fermer un sac, allumer/éteindre un appareil, appliquer un cosmétique.' },
          { text: 'Ajoutez le prix et vos informations de contact en texte superposé avec CapCut (Android/iPhone, gratuit).', tip: 'CapCut a des modèles prêts pour les vidéos produits — sélectionnez votre fichier vidéo et adaptez le modèle.' },
          { text: 'Uploadez la vidéo dans la fiche produit StoreDz. Elle s\'affiche dans le carrousel d\'images.' },
        ],
      },
    ],
  },

  // ── 4. PRICING ──────────────────────────────────────────────────────────────
  {
    id:      'pricing',
    title:   'Fixer le bon prix',
    icon:    Tag,
    color:   'text-amber-600',
    bg:      'bg-amber-50',
    badge:   'Intermédiaire',
    badgeBg: 'bg-amber-100 text-amber-700',
    desc:    'Calculez vos coûts, trouvez le prix qui maximise profit et volume, gérez les promotions efficacement.',
    lessons: [
      {
        id:       'pr1',
        title:    'Calculer votre prix de revient complet',
        duration: '6 min',
        intro:    'Trop de vendeurs fixent leurs prix à l\'intuition et perdent de l\'argent sans le savoir. Voici la formule exacte.',
        steps: [
          { text: 'Coût d\'achat : prix que vous payez pour le produit (incluez le transport depuis votre fournisseur).' },
          { text: 'Frais de livraison client : selon le transporteur et la wilaya. En moyenne, comptez 350-500 DA pour la zone nord, 500-700 DA pour le sud.' },
          { text: 'StoreDz ne prend aucune commission sur vos ventes. Votre seul frais fixe est l\'abonnement mensuel (Starter 2 000 DA · Pro 5 000 DA · Business 9 000 DA).' },
          { text: 'Emballage : carton + papier bulle + scotch + bordereau = environ 50-100 DA par envoi pour un débutant.', tip: 'En gros, une boîte carton coûte 15-25 DA. Achetez en lot de 50-100 pour réduire les coûts.' },
          { text: 'Formule : Prix minimum = Achat + Emballage + Livraison + marge souhaitée. Exemple : 500 + 80 + 450 + 600 = 1 630 DA. Sans commission, votre marge est 100% à vous.' },
          { text: 'Utilisez un tableur simple (Google Sheets gratuit) pour calculer le prix de revient de chaque produit.', tip: 'Créez une ligne par produit avec la formule — vous verrez instantanément si votre prix couvre tous vos frais.' },
        ],
      },
      {
        id:       'pr2',
        title:    'Psychologie du prix en Algérie',
        duration: '5 min',
        intro:    'Le comportement d\'achat algérien a ses propres codes. Ces techniques augmentent votre taux de conversion sans baisser vos marges.',
        steps: [
          { text: 'Prix se terminant par 99 ou 90 : 1999 DA se perçoit beaucoup moins cher que 2000 DA. Utilisez cette technique sur vos produits de moins de 5000 DA.', tip: 'Au-dessus de 5000 DA, les prix ronds (5000 DA) sont perçus comme plus sérieux. Ajustez selon votre gamme.' },
          { text: 'Prix barré : si vous avez un prix comparatif (prix fournisseur affiché, prix marché), affichez-le barré. Les acheteurs aiment sentir qu\'ils font une affaire.' },
          { text: 'Ancrage : proposez une version premium à un prix plus élevé. Le produit de base paraît plus accessible en comparaison.' },
          { text: 'Livraison gratuite : si possible, intégrez les frais de livraison dans le prix et affichez "Livraison gratuite". La mention "Livraison gratuite" convertit mieux que "-200 DA sur le prix".', tip: '"Livraison gratuite" est l\'un des messages les plus convertissants dans le e-commerce algérien.' },
          { text: 'Urgence : "Plus que 3 en stock" ou "Offre valable jusqu\'au [date]" accélère la décision d\'achat.' },
        ],
      },
      {
        id:       'pr3',
        title:    'Codes promo et ventes flash',
        duration: '7 min',
        intro:    'Les promotions bien utilisées boostent les ventes. Mal utilisées, elles détruisent vos marges. Voici comment les maîtriser.',
        steps: [
          { text: 'Créez vos codes promo dans "Promotions" → "Nouveau code". Choisissez un code mémorable (RAMADAN10, SOLDES20) et définissez le montant ou le pourcentage de réduction.' },
          { text: 'Codes à valeur fixe (ex: -300 DA) vs pourcentage (ex: -10%) : les codes à valeur fixe fonctionnent mieux sur les produits de moins de 3000 DA. Les pourcentages sur les produits plus chers.' },
          { text: 'Limitez la durée (3-7 jours maximum) et le nombre d\'utilisations pour créer l\'urgence.' },
          { text: 'Ventes flash : activez-les dans "Promotions" → "Vente Flash". Définissez un stock limité et une durée courte (4-24 heures). Annoncez la vente flash 1-2 heures avant sur WhatsApp.', tip: 'Programmez vos ventes flash le vendredi soir ou le week-end — c\'est quand les algériens achètent le plus en ligne.' },
          { text: 'Marge minimum : ne faites jamais une promotion qui vous met en dessous de votre prix de revient complet. Calculez d\'abord.' },
        ],
        warning: 'Les promotions trop fréquentes habituent les clients à attendre les soldes. Limitez à 2-3 promotions par mois maximum.',
      },
    ],
  },

  // ── 5. ORDERS ───────────────────────────────────────────────────────────────
  {
    id:      'orders',
    title:   'Gérer les commandes',
    icon:    Truck,
    color:   'text-blue-600',
    bg:      'bg-blue-50',
    badge:   'Débutant',
    badgeBg: 'bg-blue-100 text-blue-700',
    desc:    'Confirmez rapidement, expédiez sans erreur et réduisez vos retours au minimum.',
    lessons: [
      {
        id:       'o1',
        title:    'Confirmer une commande en 2 minutes',
        duration: '3 min',
        intro:    'La rapidité de confirmation est le premier critère de satisfaction client. Voici un processus en 3 étapes.',
        steps: [
          { text: 'Recevez la notification de commande → ouvrez votre tableau de bord StoreDz.' },
          { text: 'Appelez le client (numéro visible dans la commande). Script : "Bonjour [Prénom], boutique [Nom]. Je confirme votre commande de [Produit]. Vous êtes toujours disponible à [Adresse] ?"', tip: 'Appelez dans les 2 heures. Passé ce délai, le client perd confiance et risque de commander ailleurs.' },
          { text: 'Si le client confirme : cliquez sur "Confirmer la commande" dans StoreDz. Le stock est automatiquement déduit. Si le client ne répond pas : laissez en "En attente" et réessayez 2 fois à des heures différentes avant d\'annuler.' },
        ],
      },
      {
        id:       'o2',
        title:    'Emballer correctement vos colis',
        duration: '6 min',
        intro:    'Un colis qui arrive abîmé = un retour + un client perdu + une mauvaise avis. L\'emballage est votre protection.',
        steps: [
          { text: 'Matériel minimum : carton adapté à la taille du produit, papier bulle ou papier de soie, scotch large renforcé, marqueur.' },
          { text: 'Enveloppez chaque produit individuel dans du papier bulle avant de le mettre dans le carton. Remplissez les vides avec du papier froissé.' },
          { text: 'Scellez toutes les arêtes du carton avec du scotch. Un minimum de 4 bandes de scotch sur la face principale.', tip: 'Choisissez un carton légèrement plus grand que le produit — le rembourrage interne protège mieux.' },
          { text: 'Collez le bon de livraison de manière visible et sécurisée. Protégez-le avec un scotch transparent ou une poche de protection si vous êtes dans une région pluvieuse.' },
          { text: 'Ajoutez votre carte de visite ou un bon de réduction pour la prochaine commande à l\'intérieur — 30% des clients qui reçoivent une carte de visite commandent à nouveau.' },
        ],
      },
      {
        id:       'o3',
        title:    'Choisir le bon transporteur par wilaya',
        duration: '5 min',
        intro:    'Chaque transporteur a ses points forts. Connaître les différences vous permet d\'optimiser délais et coûts.',
        steps: [
          { text: 'Yalidine : couverture nationale complète (58 wilayas), suivi en temps réel, application client intégrée. Idéal pour débutants et volume moyen.', tip: 'Yalidine est le plus populaire pour le e-commerce B2C. Ils ont une API bien documentée.' },
          { text: 'ZR Express : très rapide sur les grandes villes (Alger, Oran, Constantine — livraison J+1). Tarifs compétitifs sur le nord.' },
          { text: 'Procolis : agrégateur qui combine plusieurs transporteurs — vous choisissez automatiquement le moins cher pour chaque wilaya. Intéressant pour optimiser les coûts à volume élevé.' },
          { text: 'Pour les régions éloignées (Tamanrasset, Tindouf, Illizi) : prévoyez 5-10 jours de délai avec un supplément de 200-400 DA.' },
          { text: 'Négociez votre tarif dès 30-50 expéditions par mois. Un tarif personnalisé peut réduire vos coûts de 15-25%.' },
        ],
      },
      {
        id:       'o4',
        title:    'Réduire les retours : le script de confirmation',
        duration: '8 min',
        intro:    'Un taux de retour élevé (>15%) détruit vos marges. Ces techniques simples le font tomber sous les 5%.',
        steps: [
          { text: 'Script de confirmation téléphonique complet (adaptez avec vos propres mots) :', tip: 'Appelez depuis un numéro WhatsApp enregistré comme votre boutique.' },
          { text: '"Bonjour, je suis [Prénom] de la boutique [Nom]. Je vous appelle pour confirmer votre commande de [produit] à [montant] DA. C\'est bien vous ?"' },
          { text: '"Votre adresse c\'est bien [adresse] ? À [wilaya] ? Vous serez disponible pour recevoir le colis ?"' },
          { text: '"La livraison prend entre [X] et [Y] jours. Le livreur vous appellera avant d\'arriver. Préparez [montant] DA en espèces s\'il vous plaît."' },
          { text: '"Y a-t-il quelque chose que vous voulez vérifier sur le produit ?" — Répondez aux questions pour éviter les mauvaises surprises à la livraison.' },
          { text: '"Parfait, votre commande est confirmée. Je vous envoie le numéro de suivi par WhatsApp dès l\'expédition. Merci et bonne journée !"' },
          { text: 'Envoyez le numéro de suivi par WhatsApp le jour de l\'expédition. Un client informé refuse rarement sa livraison.' },
        ],
      },
    ],
  },

  // ── 6. MARKETING ────────────────────────────────────────────────────────────
  {
    id:      'marketing',
    title:   'Marketing & acquisition',
    icon:    TrendingUp,
    color:   'text-rose-600',
    bg:      'bg-rose-50',
    badge:   'Intermédiaire',
    badgeBg: 'bg-rose-100 text-rose-700',
    desc:    'Attirez vos premiers acheteurs via Facebook, Instagram et WhatsApp gratuitement.',
    lessons: [
      {
        id:       'm1',
        title:    'Stratégie de contenu gratuite pour débutants',
        duration: '8 min',
        intro:    'Vous n\'avez pas besoin d\'un budget publicitaire pour démarrer. Voici comment obtenir vos premières ventes organiquement.',
        steps: [
          { text: 'Créez un groupe WhatsApp dédié à votre boutique : "Boutique [Nom] — Nouveautés et promos". Invitez vos contacts proches en premier, puis demandez-leur d\'inviter leurs connaissances intéressées.', tip: 'Un groupe WhatsApp de 200-300 membres engagés vaut plus que 10 000 abonnés Facebook inactifs.' },
          { text: 'Calendrier de publications : 3 publications par semaine minimum. Lundi : nouveau produit. Mercredi : témoignage client ou photo de livraison. Vendredi : promo du week-end.' },
          { text: 'Dans chaque publication, incluez : photo du produit, prix, lien StoreDz, et "Livraison partout en Algérie".' },
          { text: 'Rejoignez des groupes Facebook de vente de votre wilaya et de votre niche. Publiez vos produits dans ces groupes (maximum 1 publication par groupe par jour pour ne pas être banni).', tip: 'Cherchez sur Facebook : "vente [votre produit] [votre wilaya]". Vous trouverez des groupes actifs.' },
          { text: 'Stories Instagram : publiez 2-3 stories par jour montrant vos produits, les commandes en cours, ou les préparations d\'envoi. L\'authenticité vend mieux que le perfectionnisme.' },
        ],
      },
      {
        id:       'm2',
        title:    'WhatsApp Business : catalogue et automatisation',
        duration: '9 min',
        intro:    'WhatsApp Business est l\'outil numéro 1 du commerce algérien. Ces fonctionnalités gratuites vous font gagner des heures chaque semaine.',
        steps: [
          { text: 'Téléchargez WhatsApp Business (version distincte de WhatsApp personnel) et créez un profil professionnel avec votre logo, description et lien StoreDz.' },
          { text: 'Catalogue : ajoutez vos produits avec photos, prix et description. Les clients peuvent voir et commander depuis WhatsApp directement.', tip: 'Le catalogue WhatsApp Business est directement partageable — envoyez le lien dans vos groupes et stories.' },
          { text: 'Messages automatiques — message de bienvenue : "Bonjour et bienvenue chez [Boutique] ! Je reviens vers vous dans les plus brefs délais. En attendant, découvrez notre catalogue : [lien]."' },
          { text: 'Message d\'absence : programmez-le pour les nuits et week-ends : "Bonjour ! Votre message a bien été reçu. Notre équipe vous répond durant les heures d\'ouverture (9h-20h). Commandez en ligne 24h/24 : [lien]."' },
          { text: 'Réponses rapides : créez des raccourcis pour vos réponses fréquentes. Tapez "/prix" et votre liste de prix s\'envoie automatiquement. Créez des raccourcis pour les questions sur la livraison, les tailles, etc.' },
          { text: 'Étiquettes de contacts : organisez vos clients en catégories (Nouveau client, Client fidèle, Commande en cours, À relancer) pour cibler vos messages.', tip: 'Un "Client fidèle" qui commande régulièrement mérite un code promo exclusif. Segmentez vos contacts pour personnaliser.' },
        ],
      },
      {
        id:       'm3',
        title:    'Premières publicités Facebook : budget 500 DA/jour',
        duration: '12 min',
        intro:    'Une publicité Facebook bien ciblée avec 500 DA/jour peut générer 5-10 ventes supplémentaires. Voici comment commencer sans gaspiller.',
        steps: [
          { text: 'Prérequis : une Page Facebook professionnelle pour votre boutique, un compte Facebook Ads Manager (gratuit, sur business.facebook.com).' },
          { text: 'Créez une publication avec votre meilleur produit sur votre Page : belle photo, prix, lien StoreDz, appel à l\'action clair ("Commander ici : [lien]").', tip: 'Ne boostez jamais une publication médiocre. Si la photo et le texte ne fonctionnent pas organiquement, la pub ne les améliorera pas.' },
          { text: 'Dans Ads Manager : créez une campagne avec l\'objectif "Trafic" ou "Conversions". Ciblez l\'Algérie, tranches d\'âge 18-45, centres d\'intérêt liés à votre produit.', tip: 'Commencez avec une audience large (tout l\'Algérie) plutôt que géo-restreinte. Affinez ensuite selon les résultats.' },
          { text: 'Budget journalier : commencez à 500 DA/jour pendant 5 jours. C\'est suffisant pour tester l\'audience et optimiser.' },
          { text: 'Métriques à surveiller après 3 jours : Coût Par Clic (CPC) idéalement < 30 DA. Taux de clics (CTR) idéalement > 1%. Coût par achat idéalement < 1/3 de votre marge.' },
          { text: 'Si les résultats sont positifs (ROAS > 2x), augmentez le budget de 20% tous les 2-3 jours. Si négatifs, changez la photo ou le texte et retestez.' },
        ],
        tip: 'La règle des 50 : donnez à Facebook au moins 50 conversions (clics sur le lien) avant de tirer des conclusions sur une audience ou une créative.',
        warning: 'Ne boostez jamais directement un post depuis la page Facebook — cela limite les options de ciblage. Utilisez toujours Ads Manager.',
      },
    ],
  },

  // ── 7. SERVICE CLIENT ────────────────────────────────────────────────────────
  {
    id:      'customer',
    title:   'Service client',
    icon:    MessageSquare,
    color:   'text-cyan-600',
    bg:      'bg-cyan-50',
    badge:   'Intermédiaire',
    badgeBg: 'bg-cyan-100 text-cyan-700',
    desc:    'Transformez chaque client en ambassadeur grâce à une expérience d\'achat mémorable.',
    lessons: [
      {
        id:       'c1',
        title:    'Les 5 messages WhatsApp qui fidélisent',
        duration: '5 min',
        intro:    'Le suivi client après l\'achat est l\'investissement le moins coûteux et le plus rentable. Ces 5 messages peuvent tripler votre taux de clients réguliers.',
        steps: [
          { text: 'Message 1 — Confirmation de commande (envoyez dans l\'heure suivant la commande) : "Bonjour [Prénom] ! 🎉 Votre commande [numéro] est confirmée. Je prépare votre [produit] maintenant. Vous recevrez le numéro de suivi dès l\'expédition. Merci pour votre confiance !"' },
          { text: 'Message 2 — Expédition (envoyez le jour de l\'envoi) : "Bonne nouvelle ! Votre commande est en route 📦 Numéro de suivi : [numéro]. Suivez votre colis ici : [lien transporteur]. Livraison estimée dans [X] jours."' },
          { text: 'Message 3 — Arrivée imminente (la veille ou le matin de la livraison) : "Bonjour [Prénom], votre commande arrive aujourd\'hui ! Le livreur vous appellera avant de passer. Préparez [montant] DA en espèces. À tout à l\'heure !"', tip: 'Ce message réduit le taux de refus de 25%. Le client est préparé et disponible.' },
          { text: 'Message 4 — Satisfaction (2 jours après livraison) : "Bonjour [Prénom], j\'espère que votre [produit] vous plaît ! 😊 N\'hésitez pas à me contacter si vous avez des questions. Un avis sur StoreDz m\'aiderait beaucoup : [lien]. Merci !"' },
          { text: 'Message 5 — Relance fidélité (après 30 jours) : "Bonjour [Prénom], de nouveaux articles sont arrivés ! Rien que pour vous, voici un code promo : [CODE] (-15% sur votre prochaine commande). Valable jusqu\'au [date] 🎁"' },
        ],
        tip: 'Créez ces 5 messages dans les "Réponses rapides" de WhatsApp Business et personnalisez en 30 secondes pour chaque client.',
      },
      {
        id:       'c2',
        title:    'Répondre aux avis négatifs sans perdre de clients',
        duration: '6 min',
        intro:    'Un avis négatif bien géré peut devenir votre meilleure publicité. La façon dont vous répondez est observée par de futurs acheteurs.',
        steps: [
          { text: 'Répondez dans les 24 heures. Plus vous attendez, plus l\'avis négatif accumule des vues sans réponse.' },
          { text: 'Structure de réponse : 1) Remerciez pour le retour. 2) Reconnaissez le problème sans vous justifier. 3) Proposez une solution concrète. 4) Terminez positivement.', tip: 'Ne supprimez jamais un avis négatif — les acheteurs savent que les vendeurs qui n\'ont que des avis 5 étoiles suppriment les critiques.' },
          { text: 'Exemple de réponse : "Bonjour [Prénom], merci pour votre retour honnête. Je suis vraiment désolé que l\'article ne corresponde pas à vos attentes. Pouvez-vous me contacter directement sur WhatsApp pour qu\'on trouve une solution ensemble ? Je veux absolument que vous soyez satisfait."' },
          { text: 'Contactez le client en privé (WhatsApp) pour résoudre le problème : remplacement, remboursement partiel, retour. Trouvez un accord.' },
          { text: 'Demandez au client de mettre à jour son avis après résolution. Un avis 2 étoiles mis à jour en 4 étoiles est votre meilleure preuve de service client sérieux.' },
        ],
      },
    ],
  },

  // ── 8. ANALYTIQUES ──────────────────────────────────────────────────────────
  {
    id:      'analytics',
    title:   'Lire vos statistiques',
    icon:    BarChart2,
    color:   'text-indigo-600',
    bg:      'bg-indigo-50',
    badge:   'Avancé',
    badgeBg: 'bg-indigo-100 text-indigo-700',
    desc:    'Comprenez vos chiffres pour prendre de meilleures décisions et scaler votre activité.',
    lessons: [
      {
        id:       'a1',
        title:    'Les 4 métriques essentielles de votre boutique',
        duration: '5 min',
        intro:    'Vous n\'avez pas besoin d\'un MBA pour analyser votre activité. Ces 4 métriques vous donnent tout ce dont vous avez besoin.',
        steps: [
          { text: 'Taux de conversion : (nombre de commandes / nombre de visiteurs) × 100. Un bon taux pour le e-commerce algérien est 1-3%. En dessous de 1%, améliorez vos photos et votre description.', tip: 'Vérifiez votre taux de conversion dans "Analytiques" de votre tableau de bord StoreDz.' },
          { text: 'Panier moyen : chiffre d\'affaires total / nombre de commandes. Augmentez-le en proposant des produits complémentaires ou des bundles.', tip: 'Si votre panier moyen est < 1500 DA, essayez de proposer un deuxième article à -20% lors de la confirmation téléphonique.' },
          { text: 'Taux de retour : (commandes retournées / commandes expédiées) × 100. Cible : < 10%. Au-dessus de 15%, retravailler vos photos et descriptions.', tip: 'Identifiez quel produit a le plus de retours — c\'est généralement 1-2 produits qui faussent toute la moyenne.' },
          { text: 'Taux de refus COD : (colis refusés / colis expédiés) × 100. Cible : < 10%. Au-dessus de 20%, renforcez le protocole de confirmation téléphonique.' },
          { text: 'Consultez ces métriques chaque lundi matin et comparez avec la semaine précédente. Notez les variations inhabituelles et cherchez-en la cause.' },
        ],
      },
      {
        id:       'a2',
        title:    'Identifier vos produits gagnants et perdants',
        duration: '6 min',
        intro:    'Votre catalogue contient probablement 2-3 produits qui font 60-70% de votre chiffre d\'affaires. Identifiez-les et doublez la mise sur eux.',
        steps: [
          { text: 'Dans "Analytiques", triez vos produits par chiffre d\'affaires sur les 30 derniers jours. Les 20% de produits en tête représentent généralement 80% du CA (règle de Pareto).', tip: 'C\'est la règle 80/20 — concentrez votre stock, vos publicités et vos photos sur ces 20%.' },
          { text: 'Triez aussi par taux de conversion produit. Un produit très vu mais peu commandé a un problème de prix, de photos ou de description.' },
          { text: 'Produits gagnants (CA élevé + taux de conversion élevé) : augmentez le stock, investissez en publicité, créez des variantes.' },
          { text: 'Produits perdants (vues mais peu de ventes) : retravaillez les photos, ajustez le prix, améliorez la description. Si ça ne change rien après 30 jours, retirez le produit.' },
          { text: 'Produits de niche (peu de vues mais bon taux de conversion) : réservés aux acheteurs ciblés. Rentables à faible volume — conservez-les.' },
        ],
      },
    ],
  },

  // ── 9. SCALER ───────────────────────────────────────────────────────────────
  {
    id:      'scale',
    title:   'Scaler votre activité',
    icon:    Zap,
    color:   'text-orange-600',
    bg:      'bg-orange-50',
    badge:   'Avancé',
    badgeBg: 'bg-orange-100 text-orange-700',
    desc:    'Automatisez, déléguez et développez votre business au-delà de votre capacité individuelle.',
    lessons: [
      {
        id:       'sc1',
        title:    'Passer de 10 à 100 commandes par mois',
        duration: '10 min',
        intro:    'La croissance de 10 à 100 commandes nécessite de changer votre façon de travailler, pas juste de travailler plus.',
        steps: [
          { text: 'À 10-30 commandes/mois : tout gérer seul est possible. Optimisez votre processus : traitement des commandes en batch 2× par jour (matin 9h et soir 18h).' },
          { text: 'À 30-50 commandes/mois : recrutez un premier assistant (famille, ami de confiance) pour les appels de confirmation et la préparation des colis.', tip: 'Payez à la commande (100-150 DA/commande traitée) plutôt qu\'un salaire fixe pour commencer.' },
          { text: 'Standardisez votre espace d\'emballage : tout doit être à portée de main. Un poste d\'emballage efficace permet de préparer 3× plus de colis en même temps.' },
          { text: 'À 50-100 commandes/mois : négociez des tarifs transporteur personnalisés. Yalidine, ZR Express et Procolis offrent tous des prix dégressifs à partir de 30-50 envois/mois.' },
          { text: 'Automatisez au maximum : confirmations automatiques (WhatsApp API), étiquettes de transport en masse, rapports de suivi automatisés.' },
          { text: 'Diversifiez les canaux d\'acquisition : Facebook Ads + WhatsApp organique + groupes + influence = 4 sources indépendantes qui ne s\'annulent pas si l\'une baisse.' },
        ],
        tip: 'La croissance la plus solide vient de clients récurrents. Investissez autant dans la fidélisation que dans l\'acquisition.',
      },
      {
        id:       'sc2',
        title:    'Travailler avec les fournisseurs en gros',
        duration: '10 min',
        intro:    'À partir de 50 commandes/mois, le prix d\'achat devient votre levier principal. Voici comment accéder aux fournisseurs grossistes algériens.',
        steps: [
          { text: 'Marchés de gros algériens par niche : vêtements → marché Hamiz (Alger), Souk El-Fellah (Oran). Électronique → Bab Ezzouar, Bordj El Kiffan. Cosmétiques → Bir Mourad Raïs, Belouizdad.', tip: 'Visitez physiquement au moins 3-5 grossistes avant de choisir. Négociez les prix sur le tas.' },
          { text: 'Conditions de grossiste : en général, minimum de commande de 5-10 pièces par référence, prix 30-50% moins cher qu\'au détail.' },
          { text: 'Pour les produits importés : Alibaba (Chine), 1688.com (Chine, moins cher, pas d\'anglais), Marché de Derb Omar (Casablanca via import). Prévoyez 3-6 semaines de délai et des frais de douane (15-25% selon la catégorie).', tip: 'Commencez par commander un échantillon (1-5 pièces) avant de commander en grande quantité — la qualité peut différer des photos.' },
          { text: 'Calculez votre prix de revient avec l\'achat groupé : si vous commandez 50 pièces à 500 DA/pièce au lieu de 800 DA, votre marge augmente de 300 DA par vente sans changer le prix.' },
          { text: 'Gérez votre stock dans StoreDz en temps réel. Mettez à jour les quantités dès réception de votre livraison grossiste.' },
        ],
      },
    ],
  },
]

// ─── Translatable extra modules (Pixels + Delivery API) ───────────────────────

type Lang = 'fr' | 'en' | 'ar'

function getExtraModules(lang: Lang): Module[] {
  // ── PIXELS MODULE ────────────────────────────────────────────────────────────
  const pixelsModule: Module = {
    id:      'pixels',
    title:   lang === 'ar' ? 'البيكسل والإعلانات — Meta، Google، TikTok' : lang === 'en' ? 'Pixels & Ads — Meta, Google, TikTok' : 'Pixels & Publicité — Meta, Google, TikTok',
    icon:    Target,
    color:   'text-purple-600',
    bg:      'bg-purple-50',
    badge:   lang === 'ar' ? 'متقدم' : lang === 'en' ? 'Advanced' : 'Avancé',
    badgeBg: 'bg-purple-100 text-purple-700',
    desc:    lang === 'ar'
      ? 'كيفية إعداد بيكسل Meta وGoogle Analytics وTikTok مع الـ API من جهة الخادم لتتبع مبيعاتك بدقة.'
      : lang === 'en'
      ? 'Set up Meta Pixel, Google Analytics 4, and TikTok Pixel with server-side CAPI for accurate sales tracking.'
      : 'Configurez Meta Pixel, Google Analytics 4 et TikTok Pixel avec la CAPI serveur pour un suivi précis de vos ventes.',
    lessons: lang === 'ar' ? [
      {
        id: 'px1',
        title: 'Meta Pixel + Conversions API — الإعداد الكامل',
        duration: '10 min',
        intro: 'بيكسل Meta يتتبع زوار متجرك في المتصفح. Conversions API ترسل بيانات الشراء مباشرة من خادمنا — تعمل حتى مع أدوات حجب الإعلانات.',
        steps: [
          { text: 'أنشئ حساب Meta Business Suite على business.facebook.com إذا لم يكن لديك واحد. استخدم بريدك الإلكتروني المهني.', tip: 'ربط حسابك الشخصي بـ Business Suite يمنحك وصولاً لجميع أدوات الإعلانات.' },
          { text: 'في Business Suite ← Events Manager ← اضغط "ربط مصدر بيانات" ← "الويب" ← "Meta Pixel". أعطِه اسم متجرك وانسخ Pixel ID (سلسلة من 15-16 رقماً).' },
          { text: 'في إعدادات StoreDz ← قسم "Pixels والتتبع" ← الصق Pixel ID في خانة "Meta Pixel ID". احفظ.', tip: 'البيكسل يبدأ بالعمل فوراً بعد الحفظ على كل صفحات متجرك.' },
          { text: 'لتفعيل Conversions API: Events Manager ← بيكسلك ← تبويب "الإعدادات" ← مرر إلى "Conversions API" ← اضغط "إنشاء رمز وصول". انسخ الرمز (يبدأ بـ EAA...).' },
          { text: 'الصق الرمز في خانة "Conversions API Token" في إعدادات StoreDz. احفظ.' },
          { text: 'للتحقق: Events Manager ← "اختبار الأحداث" ← افتح متجرك في تبويب جديد ← يجب أن ترى PageView و ViewContent يظهران خلال ثوانٍ.' },
          { text: 'المشتريات ترسل مرتين (متصفح + خادم) لدقة قصوى. تحقق من نتائجك في Ads Manager ← "الأعمدة" ← "المشتريات" بعد 24-48 ساعة.' },
        ],
        tip: 'مع تفعيل CAPI، ترى جميع التحويلات حتى على iPhone مع Safari الذي يحجب الكوكيز. هذا يحسن نتائج إعلاناتك بشكل كبير.',
        warning: 'لا تشارك رمز Conversions API مع أي شخص. إنه مفتاح سري — تعامل معه كلمة مرور.',
      },
      {
        id: 'px2',
        title: 'Google Analytics 4 + API Secret — الإعداد',
        duration: '8 min',
        intro: 'Google Analytics 4 يتبع سلوك الزوار ومسار الشراء. مع Measurement Protocol API يرسل StoreDz بيانات الشراء مباشرة من الخادم.',
        steps: [
          { text: 'في analytics.google.com ← اضغط "إنشاء" ← "خاصية" ← أدخل اسم متجرك ← اختر المنطقة الزمنية (الجزائر = Africa/Algiers) ← أنهِ إنشاء الخاصية.' },
          { text: 'ابحث عن Measurement ID: الخاصية الجديدة ← Admin ← Data Streams ← اضغط على فلوك ← انسخ Measurement ID (يبدأ بـ G-).' },
          { text: 'في إعدادات StoreDz ← قسم Google Analytics 4 ← الصق Measurement ID في خانة "Measurement ID". احفظ.', tip: 'هذا يضيف الـ gtag.js تلقائياً على كل صفحات متجرك.' },
          { text: 'لـ API Secret: نفس صفحة Data Stream ← "Measurement Protocol API secrets" ← "Create" ← أعطه اسماً ← انسخ القيمة.' },
          { text: 'الصق API Secret في خانة "API Secret (Measurement Protocol)" في إعدادات StoreDz. احفظ.' },
          { text: 'للتحقق: analytics.google.com ← Reports ← Realtime ← افتح متجرك في تبويب آخر ← يجب أن ترى مستخدم نشط.' },
        ],
        tip: 'GA4 مجاني تماماً. بعد 24-48 ساعة، ستجد تقارير تفصيلية عن مصادر الزوار، الصفحات الأكثر مشاهدة والمنتجات الأكثر مبيعاً.',
      },
      {
        id: 'px3',
        title: 'TikTok Pixel + Events API — التثبيت خطوة بخطوة',
        duration: '8 min',
        intro: 'TikTok Pixel يقيس أداء إعلاناتك على TikTok. Events API يرسل بيانات الشراء من خادمنا مباشرة لتحسين عائد إعلاناتك.',
        steps: [
          { text: 'ادخل TikTok Ads Manager على ads.tiktok.com ← Assets ← Events ← "Web Events" ← "Create Pixel". أعطه اسم متجرك.', tip: 'تحتاج حساب TikTok for Business منفصل عن الحساب الشخصي.' },
          { text: 'اختر "TikTok Pixel" ← اتبع خطوات الإنشاء ← في نهاية التثبيت انسخ Pixel ID (يبدأ بـ C...).' },
          { text: 'في إعدادات StoreDz ← قسم TikTok ← الصق Pixel ID في خانة "TikTok Pixel ID". احفظ.' },
          { text: 'للحصول على Events API Token: Events Manager ← بيكسلك ← "API Access Token" ← اضغط "Generate". انسخ الرمز.' },
          { text: 'الصق الرمز في "Events API Access Token" في إعدادات StoreDz. احفظ.' },
          { text: 'للتحقق: Assets ← Events ← بيكسلك ← "Test Events" ← أدخل رابط متجرك واضغط "Test". يجب أن ترى الأحداث تظهر.', tip: 'TikTok يأخذ عادةً 2-4 ساعات لبدء عرض بيانات الأحداث في الوقت الفعلي.' },
        ],
        tip: 'إعلانات TikTok تعمل بشكل ممتاز للمنتجات المرئية (ملابس، أكسسوارات، منتجات منزلية). البيكسل + Events API يحسن استهداف الجمهور تلقائياً.',
        warning: 'تأكد من موافقة سياسة إعلانات TikTok على منتجك قبل إنشاء الحملة. بعض فئات المنتجات لها قيود خاصة.',
      },
    ] : lang === 'en' ? [
      {
        id: 'px1',
        title: 'Meta Pixel + Conversions API — Full Setup',
        duration: '10 min',
        intro: 'The Meta Pixel tracks visitors on your store browser-side. The Conversions API (CAPI) sends purchase data directly from our server — it works even when pixels are blocked by ad blockers.',
        steps: [
          { text: 'Create a Meta Business Suite account at business.facebook.com if you don\'t have one. Use your business email.', tip: 'Linking your personal Facebook account to Business Suite gives you access to all advertising tools.' },
          { text: 'In Business Suite → Events Manager → click "Connect a data source" → "Web" → "Meta Pixel". Name it after your store and copy the Pixel ID (15-16 digit number).' },
          { text: 'In StoreDz Settings → "Pixels & Tracking" section → paste the Pixel ID in the "Meta Pixel ID" field. Save.', tip: 'The pixel starts working immediately after saving on every page of your store.' },
          { text: 'To enable Conversions API: Events Manager → your Pixel → "Settings" tab → scroll to "Conversions API" → click "Generate access token". Copy the token (starts with EAA...).' },
          { text: 'Paste the token in "Conversions API Token" in your StoreDz Settings. Save.' },
          { text: 'Verify: Events Manager → "Test events" tab → open your store in a new tab → you should see PageView and ViewContent appear within seconds.' },
          { text: 'Purchases now send twice (browser + server) for maximum accuracy. Check results in Ads Manager → Columns → "Purchases" after 24-48 hours.' },
        ],
        tip: 'With CAPI enabled, you see all conversions even on iPhones with Safari (which blocks third-party cookies). This significantly improves your ad results.',
        warning: 'Never share your Conversions API token with anyone. It\'s a secret key — treat it like a password.',
      },
      {
        id: 'px2',
        title: 'Google Analytics 4 + API Secret — Setup',
        duration: '8 min',
        intro: 'Google Analytics 4 tracks visitor behavior and the purchase journey. With Measurement Protocol API, StoreDz sends purchase data directly from the server.',
        steps: [
          { text: 'In analytics.google.com → click "Create" → "Property" → enter your store name → select timezone (Algeria = Africa/Algiers) → finish creating the property.' },
          { text: 'Find your Measurement ID: new property → Admin → Data Streams → click your stream → copy Measurement ID (starts with G-).' },
          { text: 'In StoreDz Settings → Google Analytics 4 section → paste Measurement ID in the "Measurement ID" field. Save.', tip: 'This automatically adds gtag.js tracking to every page of your store.' },
          { text: 'For API Secret: same Data Stream page → "Measurement Protocol API secrets" → "Create" → give it a name → copy the value.' },
          { text: 'Paste the API Secret in "API Secret (Measurement Protocol)" in StoreDz Settings. Save.' },
          { text: 'Verify: analytics.google.com → Reports → Realtime → open your store in another tab → you should see an active user appear.' },
        ],
        tip: 'GA4 is completely free. After 24-48 hours, you\'ll find detailed reports on traffic sources, most viewed pages, and top-selling products.',
      },
      {
        id: 'px3',
        title: 'TikTok Pixel + Events API — Step-by-Step Installation',
        duration: '8 min',
        intro: 'TikTok Pixel measures your ad performance on TikTok. The Events API sends purchase data from our server directly to improve your ad return on investment.',
        steps: [
          { text: 'Go to TikTok Ads Manager at ads.tiktok.com → Assets → Events → "Web Events" → "Create Pixel". Name it after your store.', tip: 'You need a TikTok for Business account separate from your personal account.' },
          { text: 'Select "TikTok Pixel" → follow the creation steps → at the end copy the Pixel ID (starts with C...).' },
          { text: 'In StoreDz Settings → TikTok section → paste Pixel ID in the "TikTok Pixel ID" field. Save.' },
          { text: 'To get the Events API Token: Events Manager → your pixel → "API Access Token" → click "Generate". Copy the token.' },
          { text: 'Paste the token in "Events API Access Token" in StoreDz Settings. Save.' },
          { text: 'Verify: Assets → Events → your pixel → "Test Events" → enter your store URL and click "Test". Events should appear.', tip: 'TikTok usually takes 2-4 hours to start showing real-time event data.' },
        ],
        tip: 'TikTok ads work great for visual products (clothing, accessories, home products). The pixel + Events API automatically improves audience targeting.',
        warning: 'Make sure TikTok\'s advertising policy allows your product before creating a campaign. Some product categories have specific restrictions.',
      },
    ] : [
      {
        id: 'px1',
        title: 'Meta Pixel + Conversions API — configuration complète',
        duration: '10 min',
        intro: 'Le Meta Pixel suit les visiteurs de votre boutique dans le navigateur. La Conversions API (CAPI) envoie les données d\'achat directement depuis notre serveur — elle fonctionne même quand le pixel est bloqué par les bloqueurs de pubs.',
        steps: [
          { text: 'Créez un compte Meta Business Suite sur business.facebook.com si vous n\'en avez pas. Utilisez votre email professionnel.', tip: 'Lier votre compte Facebook personnel à Business Suite vous donne accès à tous les outils publicitaires.' },
          { text: 'Dans Business Suite → Events Manager → cliquez "Connecter une source de données" → "Web" → "Meta Pixel". Nommez-le avec le nom de votre boutique et copiez le Pixel ID (suite de 15-16 chiffres).' },
          { text: 'Dans Paramètres StoreDz → section "Pixels & Tracking" → collez le Pixel ID dans "Meta Pixel ID". Sauvegardez.', tip: 'Le pixel commence à fonctionner immédiatement après la sauvegarde, sur toutes les pages de votre boutique.' },
          { text: 'Pour activer la Conversions API : Events Manager → votre Pixel → onglet "Paramètres" → faites défiler jusqu\'à "Conversions API" → cliquez "Générer un token d\'accès". Copiez le token (commence par EAA...).' },
          { text: 'Collez le token dans "Conversions API Token" dans vos Paramètres StoreDz. Sauvegardez.' },
          { text: 'Vérification : Events Manager → onglet "Test des événements" → ouvrez votre boutique dans un nouvel onglet → PageView et ViewContent doivent apparaître en quelques secondes.' },
          { text: 'Les achats sont maintenant envoyés en double (navigateur + serveur) pour une précision maximale. Vérifiez dans Ads Manager → Colonnes → "Achats" après 24-48h.' },
        ],
        tip: 'Avec la CAPI activée, vous voyez toutes les conversions même sur les iPhones avec Safari (qui bloquent les cookies tiers). Cela améliore significativement vos résultats publicitaires.',
        warning: 'Ne partagez jamais votre token Conversions API. C\'est une clé secrète — traitez-le comme un mot de passe.',
      },
      {
        id: 'px2',
        title: 'Google Analytics 4 + API Secret — configuration',
        duration: '8 min',
        intro: 'Google Analytics 4 suit le comportement des visiteurs et le parcours d\'achat. Avec le Measurement Protocol API, StoreDz envoie les données d\'achat directement depuis le serveur.',
        steps: [
          { text: 'Dans analytics.google.com → cliquez "Créer" → "Propriété" → entrez le nom de votre boutique → sélectionnez le fuseau horaire (Algérie = Africa/Algiers) → terminez la création.' },
          { text: 'Trouvez votre Measurement ID : nouvelle propriété → Admin → Flux de données → cliquez sur votre flux → copiez Measurement ID (commence par G-).' },
          { text: 'Dans Paramètres StoreDz → section Google Analytics 4 → collez le Measurement ID. Sauvegardez.', tip: 'Cela ajoute automatiquement le tracking gtag.js sur toutes les pages de votre boutique.' },
          { text: 'Pour l\'API Secret : même page Data Stream → "Measurement Protocol API secrets" → "Créer" → donnez-lui un nom → copiez la valeur.' },
          { text: 'Collez l\'API Secret dans "API Secret (Measurement Protocol)" dans vos Paramètres StoreDz. Sauvegardez.' },
          { text: 'Vérification : analytics.google.com → Rapports → Temps réel → ouvrez votre boutique dans un autre onglet → un utilisateur actif doit apparaître.' },
        ],
        tip: 'GA4 est entièrement gratuit. Après 24-48h, vous aurez des rapports détaillés sur les sources de trafic, les pages les plus vues et les produits les plus vendus.',
      },
      {
        id: 'px3',
        title: 'TikTok Pixel + Events API — installation étape par étape',
        duration: '8 min',
        intro: 'TikTok Pixel mesure la performance de vos publicités TikTok. L\'Events API envoie les données d\'achat depuis notre serveur directement à TikTok pour améliorer votre retour sur investissement publicitaire.',
        steps: [
          { text: 'Allez dans TikTok Ads Manager sur ads.tiktok.com → Assets → Events → "Web Events" → "Create Pixel". Nommez-le avec le nom de votre boutique.', tip: 'Vous avez besoin d\'un compte TikTok for Business séparé de votre compte personnel.' },
          { text: 'Sélectionnez "TikTok Pixel" → suivez les étapes de création → à la fin copiez le Pixel ID (commence par C...).' },
          { text: 'Dans Paramètres StoreDz → section TikTok → collez le Pixel ID dans "TikTok Pixel ID". Sauvegardez.' },
          { text: 'Pour obtenir l\'Events API Token : Events Manager → votre pixel → "API Access Token" → cliquez "Generate". Copiez le token.' },
          { text: 'Collez le token dans "Events API Access Token" dans vos Paramètres StoreDz. Sauvegardez.' },
          { text: 'Vérification : Assets → Events → votre pixel → "Test Events" → entrez l\'URL de votre boutique et cliquez "Test". Les événements doivent apparaître.', tip: 'TikTok prend généralement 2-4 heures pour commencer à afficher les données en temps réel.' },
        ],
        tip: 'Les publicités TikTok fonctionnent très bien pour les produits visuels (vêtements, accessoires, produits maison). Le pixel + Events API améliore automatiquement le ciblage de l\'audience.',
        warning: 'Vérifiez que la politique publicitaire TikTok autorise votre produit avant de créer une campagne. Certaines catégories de produits ont des restrictions spécifiques.',
      },
    ],
  }

  // ── DELIVERY API MODULE ──────────────────────────────────────────────────────
  const deliveryModule: Module = {
    id:      'delivery-api',
    title:   lang === 'ar' ? 'API شركات التوصيل — Yalidine، ZR Express، Procolis' : lang === 'en' ? 'Delivery APIs — Yalidine, ZR Express, Procolis' : 'API Transporteurs — Yalidine, ZR Express, Procolis',
    icon:    Link2,
    color:   'text-teal-600',
    bg:      'bg-teal-50',
    badge:   lang === 'ar' ? 'متقدم' : lang === 'en' ? 'Advanced' : 'Avancé',
    badgeBg: 'bg-teal-100 text-teal-700',
    desc:    lang === 'ar'
      ? 'اربط متجرك بـ API شركات التوصيل لإنشاء بوليصات الشحن بنقرة واحدة وتتبع الطرود تلقائياً.'
      : lang === 'en'
      ? 'Connect your store to delivery company APIs to create shipping labels in 1 click and track parcels automatically.'
      : 'Connectez votre boutique aux APIs des transporteurs pour créer vos bons d\'expédition en 1 clic et suivre les colis automatiquement.',
    lessons: lang === 'ar' ? [
      {
        id: 'del1',
        title: 'لماذا تستخدم الـ API؟ — الفوائد والمتطلبات',
        duration: '5 min',
        intro: 'الـ API (واجهة برمجة التطبيقات) يربط StoreDz مباشرة بنظام شركة التوصيل. بدلاً من إنشاء كل بوليصة يدوياً على موقع الشركة، يمكنك إنشاؤها بنقرة واحدة من لوحة التحكم.',
        steps: [
          { text: 'بدون API: تفتح موقع شركة التوصيل، تملأ بيانات الزبون يدوياً، تطبع البوليصة. كل طرد يأخذ 3-5 دقائق.', tip: 'بدون API مقبول لـ 1-10 طرود يومياً. فوق ذلك، الوقت المهدر كبير جداً.' },
          { text: 'مع API: تضغط "إنشاء بوليصة" في StoreDz ← البيانات تنتقل تلقائياً ← تطبع البوليصة مباشرة. كل طرد يأخذ 20 ثانية.' },
          { text: 'المتطلبات: حساب مهني (تجاري) مفعل عند شركة التوصيل. الحسابات الشخصية عادةً لا تمنح وصول API.', tip: 'افتح حسابك التجاري مبكراً — التفعيل قد يأخذ 1-3 أيام عمل.' },
          { text: 'بعد تفعيل حسابك التجاري، ابحث في لوحة التحكم الخاصة بك عن قسم "API" أو "إعدادات المطور" للحصول على مفاتيح الوصول.' },
          { text: 'في StoreDz: إعدادات ← "التوصيل والـ API" ← اختر شركة التوصيل ← أدخل المفاتيح ← احفظ واختبر الاتصال.' },
        ],
        tip: 'ابدأ بشركة توصيل واحدة فقط. أتقن الـ API معها قبل إضافة أخرى. Yalidine مُنصح به للمبتدئين لتوثيق API الجيد.',
      },
      {
        id: 'del2',
        title: 'Yalidine API — إنشاء الحساب والحصول على المفاتيح',
        duration: '8 min',
        intro: 'Yalidine هو أشهر شركة توصيل في الجزائر للتجارة الإلكترونية. API جيد التوثيق وسهل الاستخدام مع تغطية 58 ولاية.',
        steps: [
          { text: 'اذهب إلى yalidine.app ← "إنشاء حساب" ← اختر "حساب تجاري". امتلاء نموذج التسجيل كاملاً يسرع التفعيل.', tip: 'أضف رقم السجل التجاري إذا توفر لديك — يساعد في التفعيل السريع.' },
          { text: 'بعد مراجعة وتفعيل حسابك (1-3 أيام عمل)، سجل الدخول ← انتقل إلى "إعدادات الحساب" ← قسم "API".' },
          { text: 'ستجد: Centre ID (رقم مركزك) وToken (رمز الوصول). انسخهما بعناية — هذان هما مفتاحا الاتصال.', tip: 'احفظ Token في مكان آمن. إذا فقدته يمكنك إنشاء رمز جديد لكن الرمز القديم سيُلغى.' },
          { text: 'في StoreDz: إعدادات ← "التوصيل والـ API" ← Yalidine ← أدخل Centre ID وToken. اضغط "اختبار الاتصال".' },
          { text: 'اختبار ناجح ← فعّل "الإنشاء التلقائي للبوليصة". الآن عند تأكيد أي طلب، البوليصة تُنشأ تلقائياً.', tip: 'أولاً اختبر بطلب حقيقي منخفض القيمة للتأكد من صحة بيانات الزبون قبل الاعتماد الكامل على الـ API.' },
          { text: 'لطباعة البوليصة: لوحة التحكم ← الطلب ← "طباعة بوليصة". الملصق يُطبع بحجم A6 أو A4 مقسم.' },
        ],
        tip: 'Yalidine يوفر webhook للإشعارات الفورية عند تغيير حالة الطرد. فعّله في إعدادات API لتحديث حالات الطلبات تلقائياً في StoreDz.',
        warning: 'تأكد من صحة عنوان الزبون قبل إنشاء البوليصة. التعديل بعد الإنشاء يتطلب الاتصال بخدمة العملاء.',
      },
      {
        id: 'del3',
        title: 'ZR Express API — سرعة في المدن الكبرى',
        duration: '8 min',
        intro: 'ZR Express سريع جداً في المدن الكبرى (الجزائر، وهران، قسنطينة — توصيل J+1). مثالي إذا كان معظم زبائنك في الشمال.',
        steps: [
          { text: 'اذهب إلى zrexpress.dz ← "اشتراك" ← "حساب مهني". ستتلقى تأكيداً بالبريد الإلكتروني.' },
          { text: 'بعد التفعيل، سجل الدخول ← "إعدادات" أو "Mon compte" ← ابحث عن مفاتيح API أو "Intégration".' },
          { text: 'انسخ: Client ID وAPI Key (أو Token). بعض الحسابات تستخدم نظام اسم المستخدم وكلمة المرور بدلاً من التوكن.', tip: 'إذا لم تجد مفاتيح API مباشرة، تواصل مع فريق ZR Express عبر الواتساب أو البريد — يرسلونها خلال 24 ساعة.' },
          { text: 'في StoreDz: إعدادات ← "التوصيل والـ API" ← ZR Express ← أدخل المعرفات. اختبر الاتصال.' },
          { text: 'فعّل ZR Express كـ "ناقل ثانوي". يمكنك توجيه الطلبات يدوياً بين Yalidine وZR Express حسب الولاية والأولوية.' },
          { text: 'للمدن الكبرى، استخدم ZR Express للسرعة. للمناطق النائية، استخدم Yalidine للتغطية.' },
        ],
        tip: 'ZR Express يتميز بمرونة أوقات التحصيل — يمكنك جدولة التحصيل لنفس اليوم في معظم المدن الكبرى.',
      },
      {
        id: 'del4',
        title: 'Procolis — أجريغاتور يختار الأرخص تلقائياً',
        duration: '7 min',
        intro: 'Procolis ليس شركة توصيل — هو منصة تجمع عدة شركات (Yalidine، ZR Express، وغيرها) وتختار الأرخص والأسرع لكل ولاية تلقائياً.',
        steps: [
          { text: 'اذهب إلى procolis.com ← "Créer un compte" ← أدخل بياناتك التجارية. التفعيل عادةً خلال 24-48 ساعة.', tip: 'Procolis يطلب عقد تجاري بسيط. اقرأه جيداً — يوضح الأسعار وشروط التحصيل.' },
          { text: 'بعد التفعيل: Dashboard ← "Paramètres API" أو "Intégration" ← احصل على API Key الخاص بك.' },
          { text: 'ربط شركات التوصيل: في لوحة Procolis، أضف حساباتك عند Yalidine وZR Express (إذا كانت لديك). Procolis يربط بينها ويوجه الطلبات تلقائياً.' },
          { text: 'في StoreDz: إعدادات ← "التوصيل والـ API" ← Procolis ← أدخل API Key. اختبر الاتصال.' },
          { text: 'عند إنشاء بوليصة، Procolis يقارن أسعار جميع الشركات لتلك الولاية ويختار الأنسب. توفير 15-25% في التكاليف ممكن عند الحجم العالي.', tip: 'فعّل "اختيار تلقائي للناقل" في إعدادات Procolis. يمكنك وضع أولوية (سعر أم سرعة) لكل منطقة.' },
          { text: 'متابعة كل الطرود من مكان واحد: Procolis Dashboard يجمع تقارير جميع الشركات في واجهة موحدة.' },
        ],
        tip: 'Procolis مثالي عند الوصول لـ 50+ طرد/شهر. عند هذا الحجم، الفارق في التكلفة يصبح كبيراً وإدارة شركة واحدة أسهل بكثير.',
        warning: 'Procolis يضيف طبقة وسيطة. في حالة مشكلة مع طرد، التواصل مع Procolis أولاً ثم هم يتابعون مع شركة التوصيل.',
      },
    ] : lang === 'en' ? [
      {
        id: 'del1',
        title: 'Why use the API? — Benefits and requirements',
        duration: '5 min',
        intro: 'The API connects StoreDz directly to the delivery company\'s system. Instead of creating each shipping label manually on the carrier\'s website, you create it with one click from your dashboard.',
        steps: [
          { text: 'Without API: open the carrier\'s website, fill in customer data manually, print the label. Each parcel takes 3-5 minutes.', tip: 'Without API is acceptable for 1-10 parcels per day. Above that, wasted time adds up fast.' },
          { text: 'With API: press "Create label" in StoreDz → data transfers automatically → print the label directly. Each parcel takes 20 seconds.' },
          { text: 'Requirements: an active professional (business) account with the delivery company. Personal accounts usually don\'t grant API access.', tip: 'Open your business account early — activation can take 1-3 business days.' },
          { text: 'After your business account is activated, look in your carrier dashboard for an "API" or "Developer settings" section to get your access keys.' },
          { text: 'In StoreDz: Settings → "Delivery & API" → choose carrier → enter the keys → save and test the connection.' },
        ],
        tip: 'Start with one carrier only. Master its API before adding another. Yalidine is recommended for beginners due to good API documentation.',
      },
      {
        id: 'del2',
        title: 'Yalidine API — Account setup and getting your keys',
        duration: '8 min',
        intro: 'Yalidine is the most popular delivery company in Algeria for e-commerce. Well-documented API, easy to use, covers all 58 wilayas.',
        steps: [
          { text: 'Go to yalidine.app → "Create account" → choose "Business account". Completing the form fully speeds up activation.', tip: 'Add your business registration number if you have one — it helps with faster activation.' },
          { text: 'After account review and activation (1-3 business days), log in → go to "Account settings" → "API" section.' },
          { text: 'You\'ll find: Centre ID (your center number) and Token (access token). Copy both carefully — these are your connection keys.', tip: 'Save the Token in a safe place. If lost, you can generate a new one but the old one will be revoked.' },
          { text: 'In StoreDz: Settings → "Delivery & API" → Yalidine → enter Centre ID and Token. Click "Test connection".' },
          { text: 'Successful test → enable "Automatic label creation". Now when you confirm any order, the label is created automatically.', tip: 'First test with a real low-value order to verify customer data accuracy before fully relying on the API.' },
          { text: 'To print a label: dashboard → order → "Print label". The sticker prints in A6 or A4 split format.' },
        ],
        tip: 'Yalidine provides webhooks for real-time notifications when parcel status changes. Enable it in API settings to automatically update order statuses in StoreDz.',
        warning: 'Verify the customer\'s address before creating the label. Editing after creation requires contacting customer service.',
      },
      {
        id: 'del3',
        title: 'ZR Express API — Fast in major cities',
        duration: '8 min',
        intro: 'ZR Express is very fast in major cities (Algiers, Oran, Constantine — J+1 delivery). Ideal if most of your customers are in the north.',
        steps: [
          { text: 'Go to zrexpress.dz → "Subscribe" → "Professional account". You\'ll receive email confirmation.' },
          { text: 'After activation, log in → "Settings" or "Mon compte" → look for API keys or "Integration".' },
          { text: 'Copy: Client ID and API Key (or Token). Some accounts use username/password instead of a token.', tip: 'If you don\'t find API keys directly, contact the ZR Express team via WhatsApp or email — they send them within 24 hours.' },
          { text: 'In StoreDz: Settings → "Delivery & API" → ZR Express → enter credentials. Test connection.' },
          { text: 'Enable ZR Express as a "secondary carrier". You can manually route orders between Yalidine and ZR Express by wilaya and priority.' },
          { text: 'For major cities, use ZR Express for speed. For remote areas, use Yalidine for coverage.' },
        ],
        tip: 'ZR Express offers flexible pickup times — you can schedule same-day pickup in most major cities.',
      },
      {
        id: 'del4',
        title: 'Procolis — Aggregator that auto-selects the cheapest carrier',
        duration: '7 min',
        intro: 'Procolis is not a delivery company — it\'s a platform that bundles several carriers (Yalidine, ZR Express, and others) and automatically selects the cheapest and fastest for each wilaya.',
        steps: [
          { text: 'Go to procolis.com → "Créer un compte" → enter your business details. Activation usually within 24-48 hours.', tip: 'Procolis requires a simple business contract. Read it carefully — it explains pricing and collection terms.' },
          { text: 'After activation: Dashboard → "API Settings" or "Integration" → get your API Key.' },
          { text: 'Connect carriers: in the Procolis dashboard, add your Yalidine and ZR Express accounts (if you have them). Procolis links them and routes orders automatically.' },
          { text: 'In StoreDz: Settings → "Delivery & API" → Procolis → enter API Key. Test connection.' },
          { text: 'When creating a label, Procolis compares prices from all carriers for that wilaya and selects the best. Savings of 15-25% are possible at high volume.', tip: 'Enable "Automatic carrier selection" in Procolis settings. You can set priority (price vs speed) per region.' },
          { text: 'Track all parcels in one place: Procolis Dashboard consolidates reports from all carriers in a unified interface.' },
        ],
        tip: 'Procolis is ideal when reaching 50+ parcels/month. At this volume, the cost difference becomes significant and managing one platform is much easier.',
        warning: 'Procolis adds a middleware layer. In case of a parcel issue, contact Procolis first — they then follow up with the carrier.',
      },
    ] : [
      {
        id: 'del1',
        title: 'Pourquoi utiliser l\'API ? — Avantages et prérequis',
        duration: '5 min',
        intro: 'L\'API connecte StoreDz directement au système du transporteur. Au lieu de créer chaque bon d\'expédition manuellement sur le site du transporteur, vous le créez en 1 clic depuis votre tableau de bord.',
        steps: [
          { text: 'Sans API : vous ouvrez le site du transporteur, remplissez les données client manuellement, imprimez le bon. Chaque colis prend 3-5 minutes.', tip: 'Sans API c\'est acceptable pour 1-10 colis par jour. Au-delà, le temps perdu devient considérable.' },
          { text: 'Avec API : vous cliquez "Créer bon d\'expédition" dans StoreDz → les données se transfèrent automatiquement → vous imprimez directement. Chaque colis prend 20 secondes.' },
          { text: 'Prérequis : un compte professionnel (commercial) activé chez le transporteur. Les comptes personnels ne donnent généralement pas accès à l\'API.', tip: 'Ouvrez votre compte professionnel en avance — l\'activation peut prendre 1-3 jours ouvrables.' },
          { text: 'Une fois votre compte professionnel activé, cherchez dans votre espace client la section "API" ou "Paramètres développeur" pour obtenir vos clés d\'accès.' },
          { text: 'Dans StoreDz : Paramètres → "Livraison & API" → choisissez le transporteur → entrez les clés → sauvegardez et testez la connexion.' },
        ],
        tip: 'Commencez avec un seul transporteur. Maîtrisez son API avant d\'en ajouter un autre. Yalidine est recommandé pour les débutants grâce à une documentation API bien faite.',
      },
      {
        id: 'del2',
        title: 'Yalidine API — Créer votre compte et obtenir vos clés',
        duration: '8 min',
        intro: 'Yalidine est le transporteur le plus populaire en Algérie pour le e-commerce. API bien documentée, facile à utiliser, couverture des 58 wilayas.',
        steps: [
          { text: 'Allez sur yalidine.app → "Créer un compte" → choisissez "Compte professionnel". Remplir le formulaire complètement accélère l\'activation.', tip: 'Ajoutez votre numéro de registre de commerce si vous en avez un — ça aide pour une activation plus rapide.' },
          { text: 'Après validation et activation de votre compte (1-3 jours ouvrables), connectez-vous → allez dans "Paramètres du compte" → section "API".' },
          { text: 'Vous trouverez : Centre ID (votre numéro de centre) et Token (jeton d\'accès). Copiez-les soigneusement — ce sont vos deux clés de connexion.', tip: 'Conservez le Token en lieu sûr. En cas de perte, vous pouvez en générer un nouveau mais l\'ancien sera révoqué.' },
          { text: 'Dans StoreDz : Paramètres → "Livraison & API" → Yalidine → entrez le Centre ID et le Token. Cliquez "Tester la connexion".' },
          { text: 'Test réussi → activez "Création automatique de bons d\'expédition". Désormais, à chaque confirmation de commande, le bon est créé automatiquement.', tip: 'Testez d\'abord avec une vraie commande de faible valeur pour vérifier la correction des données client avant de vous fier entièrement à l\'API.' },
          { text: 'Pour imprimer un bon : tableau de bord → commande → "Imprimer le bon". Le bordereau s\'imprime en format A6 ou A4 divisé.' },
        ],
        tip: 'Yalidine fournit des webhooks pour des notifications en temps réel lors des changements de statut du colis. Activez-les dans les paramètres API pour mettre à jour automatiquement les statuts des commandes dans StoreDz.',
        warning: 'Vérifiez l\'adresse du client avant de créer le bon. Toute modification après création nécessite de contacter le service client.',
      },
      {
        id: 'del3',
        title: 'ZR Express API — Rapidité sur les grandes villes',
        duration: '8 min',
        intro: 'ZR Express est très rapide sur les grandes villes (Alger, Oran, Constantine — livraison J+1). Idéal si la majorité de vos clients est dans le nord.',
        steps: [
          { text: 'Allez sur zrexpress.dz → "S\'abonner" → "Compte professionnel". Vous recevrez une confirmation par email.' },
          { text: 'Après activation, connectez-vous → "Paramètres" ou "Mon compte" → cherchez les clés API ou la section "Intégration".' },
          { text: 'Copiez : Client ID et API Key (ou Token). Certains comptes utilisent un système nom d\'utilisateur + mot de passe plutôt qu\'un token.', tip: 'Si vous ne trouvez pas les clés API directement, contactez l\'équipe ZR Express via WhatsApp ou email — ils les envoient sous 24 heures.' },
          { text: 'Dans StoreDz : Paramètres → "Livraison & API" → ZR Express → entrez les identifiants. Testez la connexion.' },
          { text: 'Activez ZR Express comme "transporteur secondaire". Vous pouvez router manuellement les commandes entre Yalidine et ZR Express selon la wilaya et l\'urgence.' },
          { text: 'Pour les grandes villes, utilisez ZR Express pour la rapidité. Pour les zones éloignées, utilisez Yalidine pour la couverture.' },
        ],
        tip: 'ZR Express offre une flexibilité sur les horaires d\'enlèvement — vous pouvez planifier un enlèvement le jour même dans la plupart des grandes villes.',
      },
      {
        id: 'del4',
        title: 'Procolis — Agrégateur qui choisit automatiquement le moins cher',
        duration: '7 min',
        intro: 'Procolis n\'est pas un transporteur — c\'est une plateforme qui agrège plusieurs transporteurs (Yalidine, ZR Express, et d\'autres) et sélectionne automatiquement le moins cher et le plus rapide pour chaque wilaya.',
        steps: [
          { text: 'Allez sur procolis.com → "Créer un compte" → entrez vos informations professionnelles. Activation généralement sous 24-48 heures.', tip: 'Procolis demande un contrat commercial simple. Lisez-le bien — il détaille les tarifs et les modalités de reversement.' },
          { text: 'Après activation : Dashboard → "Paramètres API" ou "Intégration" → récupérez votre API Key.' },
          { text: 'Connexion des transporteurs : dans le dashboard Procolis, ajoutez vos comptes Yalidine et ZR Express (si vous en avez). Procolis les agrège et route les commandes automatiquement.' },
          { text: 'Dans StoreDz : Paramètres → "Livraison & API" → Procolis → entrez l\'API Key. Testez la connexion.' },
          { text: 'À chaque création de bon, Procolis compare les prix de tous les transporteurs pour cette wilaya et choisit le plus avantageux. Économies de 15-25% possibles à volume élevé.', tip: 'Activez "Sélection automatique du transporteur" dans les paramètres Procolis. Vous pouvez définir une priorité (prix ou rapidité) par région.' },
          { text: 'Suivez tous vos colis depuis un seul endroit : le Dashboard Procolis consolide les rapports de tous les transporteurs dans une interface unifiée.' },
        ],
        tip: 'Procolis est idéal à partir de 50+ colis/mois. À ce volume, la différence de coût devient significative et gérer une seule plateforme est bien plus pratique.',
        warning: 'Procolis ajoute une couche intermédiaire. En cas de problème avec un colis, contactez Procolis d\'abord — ils suivent ensuite avec le transporteur.',
      },
    ],
  }

  return [pixelsModule, deliveryModule]
}

// ─── Level badge ───────────────────────────────────────────────────────────────

// ─── Lesson content block ──────────────────────────────────────────────────────

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

// ─── Page ──────────────────────────────────────────────────────────────────────

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
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} logoUrl={vendor.logo_url}
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
              Guides pratiques par des vendeurs algériens actifs. Appliquez chaque leçon le jour même.
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
                    {progressPct >= 100 ? 'Cours terminé ! 🎉' : `${progressPct}% complété`}
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
            { label: `${totalLessons} leçons`,    sub: 'guides complets',    icon: Play,      color: 'bg-violet-50 text-violet-600' },
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
                      <span className="text-[11px] text-gray-400">{modDone}/{mod.lessons.length} leçons</span>
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
            <p className="text-emerald-100 text-sm mt-0.5">Notre équipe support est disponible 7j/7 sur WhatsApp.</p>
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
