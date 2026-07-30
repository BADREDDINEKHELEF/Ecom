'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/store/langStore'
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

// ── Types ──────────────────────────────────────────────────────────────
interface NicheProduct {
  name: string
  price: string
  desc: string
  image: string
}

interface NicheDetail {
  label: string
  name: string
  color: string
  bgAccent: string
  tag: string
  products: NicheProduct[]
}

type NicheKey = 'traditional' | 'beauty' | 'electronics'

interface TranslationSchema {
  solution100algerian: string
  heroTitle: string
  heroTitleAccent: string
  heroSubtitle: string
  primaryBtn: string
  secondaryBtn: string
  statSellers: string
  statWilayas: string
  statCommission: string
  statApis: string
  statApisVal: string
  
  sandboxTitle: string
  sandboxSubtitle: string
  configTitle: string
  storeNameLabel: string
  themeColorLabel: string
  selectNicheLabel: string
  reservedLinkLabel: string
  copyLinkBtn: string
  copied: string
  mobileWelcome: string
  mobileCatalog: string
  waOrderBtn: string

  advantagesTagline: string
  advantagesTitle: string
  advantagesSubtitle: string
  
  antiReturnTitle: string
  antiReturnDesc: string
  
  shippingApiTitle: string
  shippingApiDesc: string
  
  multiStoreTitle: string
  multiStoreDesc: string
  
  zeroCommissionTitle: string
  zeroCommissionDesc: string
  
  ccpPaymentTitle: string
  ccpPaymentDesc: string
  
  mobileOptimizedTitle: string
  mobileOptimizedDesc: string

  crmTagline: string
  crmTitle: string
  crmDesc: string
  
  benefit1Title: string
  benefit1Desc: string
  benefit2Title: string
  benefit2Desc: string
  benefit3Title: string
  benefit3Desc: string
  
  dbStoreLabel: string
  karimSeller: string
  store1Tab: string
  store2Tab: string
  revenueMetric: string
  packagesMetric: string
  successRate: string
  crmHeader: string
  crmTag: string

  apisTagline: string
  apisTitle: string
  apisDesc: string
  delayLabel: string
  connectBtn: string

  whatsappTagline: string
  whatsappTitle: string
  whatsappDesc: string
  step1Label: string
  step2Label: string
  step3Label: string
  simTitle: string
  sim1Title: string
  sim1Desc: string
  sim2Title: string
  sim2Desc: string
  sim3ReadyMsg: string
  stepCount: string
  next: string
  restart: string

  pricingTitle: string
  pricingSubtitle: string
  trialBadge: string
  tryFree: string
  starterFeatures: string[]
  proFeatures: string[]
  businessFeatures: string[]

  faqTitle: string
  faqQ1: string
  faqA1: string
  faqQ2: string
  faqA2: string
  faqQ3: string
  faqA3: string
  faqQ4: string
  faqA4: string

  finalCtaTitle: string
  finalCtaSub: string
  finalCtaBtn: string
  footerCredit: string
  cgu: string
  privacy: string
}

// ── Local Translation Dictionary ──────────────────────────────────────────
const LOCAL_TRANSLATIONS: Record<'fr' | 'en' | 'ar', TranslationSchema> = {
  fr: {
    solution100algerian: "Solution E-commerce 100% Algérienne · 🇩🇿",
    heroTitle: "Vendez en Algérie",
    heroTitleAccent: "sans commission et sans intermédiaire",
    heroSubtitle: "Gérez plusieurs boutiques de niche, centralisez vos fiches clients dans un CRM unifié, et automatisez vos livraisons avec Yalidine, Procolis et Maystro en quelques clics.",
    primaryBtn: "Créer ma boutique maintenant",
    secondaryBtn: "Essayer la démo interactive",
    statSellers: "Boutiques actives en Algérie",
    statWilayas: "Wilayas couvertes (COD)",
    statCommission: "Commission sur vos ventes",
    statApis: "Intégrations Transporteurs",
    statApisVal: "API Direct",
    
    sandboxTitle: "Créez virtuellement votre boutique",
    sandboxSubtitle: "Saisissez le nom de votre marque, choisissez un thème et une niche pour voir comment votre boutique s'affiche sur mobile.",
    configTitle: "Configuration de base",
    storeNameLabel: "Nom de votre commerce",
    themeColorLabel: "Couleur thématique du site",
    selectNicheLabel: "Sélectionnez une Niche Locale",
    reservedLinkLabel: "Votre lien unique réservé",
    copyLinkBtn: "Copier le lien",
    copied: "Copié !",
    mobileWelcome: "Bienvenue dans notre boutique e-commerce. Paiement à la livraison sur 58 wilayas.",
    mobileCatalog: "Produits du Catalogue",
    waOrderBtn: "Commander via WhatsApp",

    advantagesTagline: "Avantages Concurrentiels Réels",
    advantagesTitle: "Pourquoi les meilleurs vendeurs algériens choisissent StoreDz ?",
    advantagesSubtitle: "Des outils construits pour les réalités du marché algérien. Pas de fonctions inutiles, juste du concret pour votre e-commerce.",
    
    antiReturnTitle: "Lutte contre les colis non récupérés",
    antiReturnDesc: "Le premier fléau de l'e-commerce en Algérie. Notre base de données client consolidée analyse l'historique d'achat du client. S'il a déjà refusé plusieurs colis sur d'autres boutiques de la plateforme, vous êtes alerté avant d'expédier pour économiser vos frais de retour.",
    
    shippingApiTitle: "Intégrations APIs Logistiques locales",
    shippingApiDesc: "Connectez vos comptes de transporteurs en 1 clic (Yalidine, ZR Express, Procolis, Maystro). Exportez vos commandes instantanément, imprimez vos bordereaux d'expédition en masse et synchronisez le statut du colis en temps réel sans aucune saisie manuelle.",
    
    multiStoreTitle: "Multi-Boutique sous un seul compte",
    multiStoreDesc: "Gérez plusieurs marques ou catalogues de niches différents sans payer plusieurs abonnements distincts. Vous passez d'un magasin à un autre depuis la même interface et centralisez l'ensemble de vos clients au même endroit.",
    
    zeroCommissionTitle: "0% de commission sur vos ventes",
    zeroCommissionDesc: "Contrairement à d'autres plateformes, StoreDz ne prend aucun pourcentage sur votre chiffre d'affaires. Vous payez un abonnement mensuel fixe et transparent. Vos gains sont 100% les vôtres.",
    
    ccpPaymentTitle: "Abonnement payable en DZD (CCP / BaridiMob)",
    ccpPaymentDesc: "Pas besoin de carte bancaire internationale (Wise, Redotpay, Pyypl) pour payer votre outil. Réglez votre abonnement e-commerce en Dinars Algériens par virement BaridiMob, versement CCP, ou par carte Edahabia/CIB locale.",
    
    mobileOptimizedTitle: "Optimisé pour les connexions 3G / 4G",
    mobileOptimizedDesc: "Les boutiques StoreDz sont ultra-légères et s'ouvrent instantanément, même dans les wilayas à faible couverture réseau. Moins de temps de chargement signifie moins d'abandons de paniers par vos clients.",

    crmTagline: "CRM Vendeur Unifié",
    crmTitle: "Fichier client consolidé et multi-boutique d'un seul coup",
    crmDesc: "Évitez d'éparpiller les informations de vos acheteurs. Notre système regroupe vos clients sous une fiche unique. Même si vous gérez des magasins de vêtements et de tech distincts, l'historique d'achat et la fiabilité de vos acheteurs sont croisés au même endroit.",
    
    benefit1Title: "Fiche client unifiée",
    benefit1Desc: "Savoir exactement quel client a commandé sur quelle boutique et le montant de ses dépenses globales.",
    benefit2Title: "Filtrage automatique des wilayas",
    benefit2Desc: "Classez et filtrez vos expéditions par wilaya pour négocier des tarifs préférentiels avec Yalidine ou ZR.",
    benefit3Title: "Sécurité renforcée de vos données",
    benefit3Desc: "Vos fichiers clients sont cryptés et strictement confidentiels. Aucun autre vendeur n'y a accès.",
    
    dbStoreLabel: "Dashboard Compte Vendeur",
    karimSeller: "Karim e-Commerce",
    store1Tab: "Boutique Dattes",
    store2Tab: "Boutique Tissage",
    revenueMetric: "Chiffre d'Affaires",
    packagesMetric: "Colis Expédiés",
    successRate: "Livraisons Réussies",
    crmHeader: "Aperçu Client Unique (CRM)",
    crmTag: "Consolidé",

    apisTagline: "Logistique Connectée",
    apisTitle: "Envoyez vos commandes par API en 1-clic",
    apisDesc: "StoreDz s'interface directement avec les leaders de la livraison en Algérie pour automatiser vos expéditions.",
    delayLabel: "Délai moyen:",
    connectBtn: "Connecter mes accès API",

    whatsappTagline: "WhatsApp Commande",
    whatsappTitle: "Laissez vos acheteurs commander sur WhatsApp",
    whatsappDesc: "Pas de formulaire long à remplir. Le panier génère un récapitulatif propre et lance directement WhatsApp avec le message prêt à envoyer vers votre numéro.",
    step1Label: "1. Choix du produit",
    step2Label: "2. Clic Bouton",
    step3Label: "3. Envoi sur WhatsApp",
    simTitle: "SIMULATEUR DE FLUX",
    sim1Title: "Le client choisit son produit",
    sim1Desc: "Le client navigue sur votre boutique mobile et clique sur le produit de son choix.",
    sim2Title: "Clic sur commander",
    sim2Desc: "Sans formulaire compliqué, il clique sur le bouton WhatsApp pour valider.",
    sim3ReadyMsg: "Message WhatsApp prêt à envoyer...",
    stepCount: "Étape {n} sur 3",
    next: "Suivant",
    restart: "Recommencer",

    pricingTitle: "Des tarifs simples pour tous",
    pricingSubtitle: "10 jours d'essai gratuits. Pas d'engagement. Pas de carte bancaire.",
    trialBadge: "✓ 10 jours d'essai gratuit",
    tryFree: "Essayer gratuitement",
    starterFeatures: ['Jusqu\'à 10 produits', 'Lien ecom-dz.net/store/votre-nom', 'Commandes WhatsApp', 'Gestion des commandes standard', 'Variantes de tailles & couleurs'],
    proFeatures: ['Produits illimités', 'Analytics avancés (ventes, wilayas, paniers)', 'Intégration APIs livraison (Yalidine, Maystro, ZR)', 'Codes promo & ventes flash', 'Pixels Meta, TikTok & Google Analytics', 'Support WhatsApp prioritaires'],
    businessFeatures: ['Gérez jusqu\'à 3 boutiques', 'Tout le plan Pro inclus', 'Retrait complet du logo StoreDz', 'Fiches clients CRM avancées & export', 'Badge Boutique vérifiée algérienne', 'Manager de compte dédié + support 24/7'],

    faqTitle: "Foire aux questions",
    faqQ1: "Comment les clients commandent-ils sur ma boutique ?",
    faqA1: "Le client visite votre boutique, choisit un produit, et clique sur le bouton WhatsApp. Une discussion s'ouvre directement sur votre numéro avec un message automatique pré-rempli (nom, produit, quantité, total). Vous n'avez qu'à valider avec lui.",
    faqQ2: "Puis-je utiliser mon propre service de livraison ?",
    faqA2: "Oui. StoreDz intègre directement les APIs de Yalidine Express, Maystro, ZR Express et Procolis. Vous pouvez connecter vos comptes de transporteurs pour générer vos fiches d'expédition automatiquement.",
    faqQ3: "Comment se passe la gestion de plusieurs boutiques ?",
    faqA3: "Le plan Business vous permet de créer et administrer jusqu'à 3 boutiques distinctes sous un seul tableau de bord de gestion. Vos clients et historiques de ventes y sont consolidés pour vous offrir une vue d'ensemble de votre e-commerce.",
    faqQ4: "Prenez-vous des commissions sur mes ventes ?",
    faqA4: "Non. StoreDz ne prélève aucune commission sur vos transactions. Vous payez un abonnement fixe mensuel et conservez 100% de vos bénéfices.",

    finalCtaTitle: "Prêt à propulser votre commerce ?",
    finalCtaSub: "Rejoignez les meilleurs vendeurs algériens et ouvrez votre boutique en ligne aujourd'hui.",
    finalCtaBtn: "Créer ma boutique gratuitement",
    footerCredit: "StoreDz. Plateforme E-commerce optimisée pour l'Algérie.",
    cgu: "CGU",
    privacy: "Confidentialité"
  },
  en: {
    solution100algerian: "100% Algerian E-commerce Solution · 🇩🇿",
    heroTitle: "Sell in Algeria",
    heroTitleAccent: "without commission or intermediaries",
    heroSubtitle: "Manage multiple niche stores, centralize customer profiles in a unified CRM, and automate your shipping with Yalidine, Procolis, and Maystro in a few clicks.",
    primaryBtn: "Create my store now",
    secondaryBtn: "Try interactive demo",
    statSellers: "Active shops in Algeria",
    statWilayas: "Wilayas covered (COD)",
    statCommission: "Commission on sales",
    statApis: "Carrier integrations",
    statApisVal: "Direct API",
    
    sandboxTitle: "Create your virtual store",
    sandboxSubtitle: "Enter your brand name, select a theme and a niche to see how your store renders on mobile.",
    configTitle: "Basic Configuration",
    storeNameLabel: "Your Store Name",
    themeColorLabel: "Store Theme Color",
    selectNicheLabel: "Select a Local Niche",
    reservedLinkLabel: "Your reserved unique link",
    copyLinkBtn: "Copy link",
    copied: "Copied!",
    mobileWelcome: "Welcome to our store. Cash on delivery across all 58 states.",
    mobileCatalog: "Catalog Products",
    waOrderBtn: "Order via WhatsApp",

    advantagesTagline: "Real Competitive Advantages",
    advantagesTitle: "Why do top Algerian sellers choose StoreDz?",
    advantagesSubtitle: "Tools built for the realities of the Algerian market. No useless features, just pure value for your e-commerce.",
    
    antiReturnTitle: "Fight against uncollected packages",
    antiReturnDesc: "The biggest plague of e-commerce in Algeria. Our consolidated customer database analyzes buyer purchase history. If a buyer has refused packages on other stores on the platform, you get alerted before shipping, saving your return delivery fees.",
    
    shippingApiTitle: "Local Logistics API Integrations",
    shippingApiDesc: "Connect your carrier accounts in 1 click (Yalidine, ZR Express, Procolis, Maystro). Export orders instantly, print shipping labels in bulk, and sync package delivery status in real-time without manual work.",
    
    multiStoreTitle: "Multi-Store under one account",
    multiStoreDesc: "Manage multiple brands or niche catalogs without paying multiple separate subscriptions. Toggle between stores from the same dashboard and centralize all your customer data in one place.",
    
    zeroCommissionTitle: "0% commission on your sales",
    zeroCommissionDesc: "Unlike other platforms, StoreDz takes zero percentage of your revenue. You pay a fixed, transparent monthly subscription. Your earnings are 100% yours.",
    
    ccpPaymentTitle: "Subscription payable in DZD (CCP / BaridiMob)",
    ccpPaymentDesc: "No international credit card (Wise, Redotpay, Pyypl) required. Pay your e-commerce subscription in Algerian Dinars via BaridiMob transfer, CCP slip, or local Edahabia/CIB cards.",
    
    mobileOptimizedTitle: "Optimized for 3G / 4G connections",
    mobileOptimizedDesc: "StoreDz stores are ultra-lightweight and load instantly, even in states with poor network coverage. Faster loading speeds mean fewer abandoned carts by your customers.",

    crmTagline: "Unified Seller CRM",
    crmTitle: "Consolidated customer file and multi-store in one go",
    crmDesc: "Avoid scattering buyer info. Our system groups customers under a single file. Even if you manage separate clothing and tech stores, their purchase history and reliability are cross-referenced in one place.",
    
    benefit1Title: "Unified customer file",
    benefit1Desc: "Know exactly which customer ordered on which store and their total global spending.",
    benefit2Title: "Automatic state filtering",
    benefit2Desc: "Classify and filter your shipments by state to negotiate preferential rates with carriers like Yalidine or ZR.",
    benefit3Title: "Enhanced data security",
    benefit3Desc: "Your customer files are encrypted and strictly confidential. No other seller can access them.",
    
    dbStoreLabel: "Seller Account Dashboard",
    karimSeller: "Karim e-Commerce",
    store1Tab: "Dates Store",
    store2Tab: "Weaving Store",
    revenueMetric: "Total Revenue",
    packagesMetric: "Shipped Packages",
    successRate: "Successful Deliveries",
    crmHeader: "Unified Customer Overview (CRM)",
    crmTag: "Consolidated",

    apisTagline: "Connected Logistics",
    apisTitle: "Send your orders via API in 1 click",
    apisDesc: "StoreDz interfaces directly with shipping leaders in Algeria to automate your deliveries.",
    delayLabel: "Average delay:",
    connectBtn: "Connect my API credentials",

    whatsappTagline: "WhatsApp Ordering",
    whatsappTitle: "Let your buyers order on WhatsApp",
    whatsappDesc: "No long forms to fill out. The cart generates a clean summary and directly launches WhatsApp with a message ready to send to your number.",
    step1Label: "1. Choose product",
    step2Label: "2. Click Button",
    step3Label: "3. Send on WhatsApp",
    simTitle: "FLOW SIMULATOR",
    sim1Title: "Client chooses product",
    sim1Desc: "The client browses your mobile store and clicks on their product.",
    sim2Title: "Click on order",
    sim2Desc: "Without complex forms, they click the WhatsApp button to confirm.",
    sim3ReadyMsg: "WhatsApp message ready to send...",
    stepCount: "Step {n} of 3",
    next: "Next",
    restart: "Restart",

    pricingTitle: "Simple pricing for everyone",
    pricingSubtitle: "10-day free trial. No commitment. No credit card required.",
    trialBadge: "✓ 10-day free trial",
    tryFree: "Try for free",
    starterFeatures: ['Up to 10 products', 'Link ecom-dz.net/store/your-name', 'WhatsApp orders', 'Standard order management', 'Size & color variants'],
    proFeatures: ['Unlimited products', 'Advanced analytics (sales, states, carts)', 'Logistics APIs integration (Yalidine, Maystro, ZR)', 'Promo codes & flash sales', 'Meta, TikTok & Google Analytics Pixels', 'Priority WhatsApp support'],
    businessFeatures: ['Manage up to 3 stores', 'All Pro features included', 'Complete removal of StoreDz branding', 'Advanced CRM client database & export', 'Verified Algerian Store badge', 'Dedicated manager + 24/7 support'],

    faqTitle: "Frequently Asked Questions",
    faqQ1: "How do customers order on my shop?",
    faqA1: "The customer visits your shop, selects a product, and clicks the WhatsApp button. A chat opens directly on your number with a pre-filled automated message (name, product, quantity, total). You just confirm it with them.",
    faqQ2: "Can I use my own delivery service?",
    faqA2: "Yes. StoreDz integrates directly with the APIs of Yalidine Express, Maystro, ZR Express, and Procolis. You can connect your carrier accounts to generate shipping labels automatically.",
    faqQ3: "How does multi-store management work?",
    faqA3: "The Business plan allows you to create and manage up to 3 separate stores under a single dashboard. Your clients and sales history are consolidated for an overview of your e-commerce.",
    faqQ4: "Do you take commissions on my sales?",
    faqA4: "No. StoreDz does not charge any commission on your transactions. You pay a fixed monthly subscription and keep 100% of your profits.",

    finalCtaTitle: "Ready to boost your business?",
    finalCtaSub: "Join the best Algerian sellers and open your online store today.",
    finalCtaBtn: "Create my store for free",
    footerCredit: "StoreDz. E-commerce platform optimized for Algeria.",
    cgu: "Terms",
    privacy: "Privacy"
  },
  ar: {
    solution100algerian: "حل تجارة إلكترونية جزائري 100% · 🇩🇿",
    heroTitle: "بيع في الجزائر",
    heroTitleAccent: "بدون عمولة وبدون وسيط",
    heroSubtitle: "أدر متاجر متعددة، وحّد بيانات زبائنك في نظام إدارة علاقات زبائن (CRM) واحد، وأتمت عمليات الشحن مع ياليدين، بروكوليس ومايسترو ببضع نقرات.",
    primaryBtn: "أنشئ متجري الآن",
    secondaryBtn: "جرب العرض التفاعلي",
    statSellers: "المتاجر النشطة في الجزائر",
    statWilayas: "الولايات المغطاة (الدفع عند الاستلام)",
    statCommission: "العمولة على المبيعات",
    statApis: "ربط شركات الشحن",
    statApisVal: "ربط مباشر",
    
    sandboxTitle: "أنشئ متجرك الافتراضي",
    sandboxSubtitle: "أدخل اسم علامتك التجارية، اختر لونًا ومجالًا لرؤية كيف يظهر متجرك على الهاتف.",
    configTitle: "الإعدادات الأساسية",
    storeNameLabel: "اسم متجرك",
    themeColorLabel: "لون المظهر للموقع",
    selectNicheLabel: "اختر التخصص المحلي",
    reservedLinkLabel: "رابطك الفريد المحجوز",
    copyLinkBtn: "نسخ الرابط",
    copied: "تم النسخ!",
    mobileWelcome: "مرحباً بكم في متجرنا. الدفع عند الاستلام عبر 58 ولاية.",
    mobileCatalog: "منتجات الكتالوج",
    waOrderBtn: "طلب عبر الواتساب",

    advantagesTagline: "مزايا تنافسية حقيقية",
    advantagesTitle: "لماذا يختار كبار البائعين الجزائريين StoreDz؟",
    advantagesSubtitle: "أدوات مصممة لواقع السوق الجزائري. لا توجد ميزات غير مجدية، فقط ما يخدم تجارتك الإلكترونية.",
    
    antiReturnTitle: "محاربة الطرود غير المستلمة",
    antiReturnDesc: "العقبة الأولى للتجارة الإلكترونية في الجزائر. تحلل قاعدة بياناتنا الموحدة سجل الشراء للمشتري. إذا سبق له رفض طرود في متاجر أخرى على المنصة، فسيتم تنبيهك قبل الشحن لتوفير تكاليف الإرجاع.",
    
    shippingApiTitle: "ربط شركات الشحن المحلية",
    shippingApiDesc: "اربط حسابات الشحن الخاصة بك بنقرة واحدة (ياليدين، زد آر، بروكوليس، مايسترو). صَدِّر الطلبات فورًا، واطبع ملصقات الشحن جماعيًا، وحدّث حالة الطرود مباشرة دون إدخال يدوي.",
    
    multiStoreTitle: "متاجر متعددة بحساب واحد",
    multiStoreDesc: "أدر علامات تجارية أو كتالوجات تخصصية متعددة دون دفع اشتراكات منفصلة. تنقل بين المتاجر من لوحة تحكم واحدة ووحّد بيانات جميع زبائنك في مكان واحد.",
    
    zeroCommissionTitle: "0% عمولة على مبيعاتك",
    zeroCommissionDesc: "على عكس المنصات الأخرى، لا تأخذ StoreDz أي نسبة من أرباحك. تدفع اشتراكاً شهرياً ثابتاً وواضحاً. أرباحك لك بنسبة 100%.",
    
    ccpPaymentTitle: "اشتراك مدفوع بالدينار (بريدي موب / CCP)",
    ccpPaymentDesc: "لا تحتاج إلى بطاقة بنكية دولية (Wise, Redotpay) لدفع ثمن أداتك. سدد اشتراكك بالدينار الجزائري عبر تحويل بريدي موب، أو دفع CCP، أو بطاقات الذهبية/CIB المحلية.",
    
    mobileOptimizedTitle: "مُحسّن لشبكات الجيل الثالث والرابع",
    mobileOptimizedDesc: "متاجر StoreDz خفيفة للغاية وتفتح فوراً، حتى في الولايات ذات التغطية الضعيفة. سرعة التحميل تعني تخلياً أقل عن سلة المشتريات من قبل زبائنك.",

    crmTagline: "نظام زبائن موحد للبائع",
    crmTitle: "ملف زبائن موحد ومتاجر متعددة دفعة واحدة",
    crmDesc: "تجنب تشتيت معلومات زبائنك. يجمع نظامنا المشترين في ملف موحد. حتى لو كنت تدير متجراً للملابس وآخر للتقنية، يتم تقاطع سجل الشراء ومصداقية الزبائن في نفس المكان.",
    
    benefit1Title: "ملف زبون موحد",
    benefit1Desc: "معرفة الزبون الذي طلب ومن أي متجر بدقة، مع إجمالي نفقاته.",
    benefit2Title: "تصنيف تلقائي للولايات",
    benefit2Desc: "صنف طلباتك وحللها حسب الولايات للتفاوض على أسعار أفضل مع ياليدين أو ZR.",
    benefit3Title: "حماية متقدمة للبيانات",
    benefit3Desc: "ملفات زبائنك مشفرة وسرية تماماً. لا يمكن لأي بائع آخر الاطلاع عليها.",
    
    dbStoreLabel: "لوحة تحكم حساب البائع",
    karimSeller: "كريم للتجارة الإلكترونية",
    store1Tab: "متجر التمور",
    store2Tab: "متجر المنسوجات",
    revenueMetric: "رقم الأعمال",
    packagesMetric: "الطرود المشحونة",
    successRate: "التسليمات الناجحة",
    crmHeader: "نظرة عامة على ملف الزبون الموحد",
    crmTag: "مدمج",

    apisTagline: "خدمات شحن متصلة",
    apisTitle: "أرسل طلبياتك عبر الـ API بنقرة واحدة",
    apisDesc: "تتكامل StoreDz مباشرة مع كبرى شركات التوصيل في الجزائر لأتمتة شحناتك.",
    delayLabel: "متوسط المدة:",
    connectBtn: "ربط مفاتيح الـ API الخاصة بي",

    whatsappTagline: "الطلب عبر الواتساب",
    whatsappTitle: "اترك زبائنك يطلبون عبر الواتساب",
    whatsappDesc: "لا توجد استمارات طويلة. تولد السلة ملخصاً نظيفاً وتفتح الواتساب مباشرة برسالة جاهزة للإرسال إلى رقمك.",
    step1Label: "1. اختيار المنتج",
    step2Label: "2. النقر على الزر",
    step3Label: "3. الإرسال على واتساب",
    simTitle: "محاكي التدفق",
    sim1Title: "الزبون يختار المنتج",
    sim1Desc: "يتصفح الزبون متجرك الهاتفي وينقر على المنتج المختار.",
    sim2Title: "النقر على الطلب",
    sim2Desc: "بدون استمارات معقدة، ينقر على زر الواتساب للتأكيد.",
    sim3ReadyMsg: "رسالة واتساب جاهزة للإرسال...",
    stepCount: "الخطوة {n} من 3",
    next: "التالي",
    restart: "إعادة تشغيل",

    pricingTitle: "أسعار بسيطة للجميع",
    pricingSubtitle: "10 أيام تجربة مجانية. بدون التزام. بدون بطاقة بنكية.",
    trialBadge: "✓ 10 أيام تجربة مجانية",
    tryFree: "تجربة مجانية",
    starterFeatures: ['حتى 10 منتجات', 'رابط ecom-dz.net/store/اسمك', 'الطلبات عبر الواتساب', 'إدارة الطلبات القياسية', 'خيارات الألوان والمقاسات'],
    proFeatures: ['منتجات غير محدودة', 'إحصائيات متقدمة (المبيعات، الولايات، السلات)', 'ربط APIs الشحن (ياليدين، مايسترو، ZR)', 'أكواد الخصم والعروض الخاطفة', 'بكسل ميتا، تيك توك وإحصائيات جوجل', 'دعم واتساب ذو أولوية'],
    businessFeatures: ['أدر حتى 3 متاجر', 'تشمل جميع ميزات باقة Pro', 'إزالة شعار StoreDz تماماً', 'ملفات زبائن متقدمة وتصدير البيانات', 'شارة متجر جزائري موثق', 'مدير حساب مخصص + دعم 24/7'],

    faqTitle: "الأسئلة الشائعة",
    faqQ1: "مستقبل الطلبات على متجري؟",
    faqA1: "يزور الزبون متجرك، ويختار المنتج، وينقر على زر واتساب. تفتح محادثة مباشرة على رقمك برسالة مسبقة التعبئة (الاسم، المنتج، الكمية، الإجمالي). ما عليك سوى تأكيد الطلب معه.",
    faqQ2: "هل يمكنني استخدام خدمة الشحن الخاصة بي؟",
    faqA2: "نعم. تتكامل StoreDz مباشرة مع واجهات برمجة تطبيقات Yalidine Express و Maystro و ZR Express و Procolis. يمكنك ربط حسابات الشحن الخاصة بك لإنشاء ملصقات الشحن تلقائياً.",
    faqQ3: "كيف تعمل إدارة المتاجر المتعددة؟",
    faqA3: "تتيح لك باقة Business إنشاء وإدارة ما يصل إلى 3 متاجر منفصلة تحت لوحة تحكم واحدة. يتم دمج زبائنك وسجل مبيعاتك للحصول على نظرة عامة شاملة لتجارتك.",
    faqQ4: "هل تأخذون عمولات على مبيعاتي؟",
    faqA4: "لا. لا تفرض StoreDz أي عمولة على معاملاتك. تدفع اشتراكاً شهرياً ثابتاً وتحتفظ بنسبة 100% من أرباحك.",

    finalCtaTitle: "جاهز لتطوير تجارتك؟",
    finalCtaSub: "انضم إلى أفضل البائعين الجزائريين وافتح متجرك الإلكتروني اليوم.",
    finalCtaBtn: "أنشئ متجري مجاناً",
    footerCredit: "StoreDz. منصة تجارة إلكترونية محسنة للجزائر.",
    cgu: "شروط الاستخدام",
    privacy: "سياسة الخصوصية"
  }
}

// ── Mock niches for interactive customizer with support for translation ──
const getMockNiches = (lang: 'fr' | 'ar' | 'en'): Record<NicheKey, NicheDetail> => {
  const isAr = lang === 'ar';
  return {
    traditional: {
      label: isAr ? 'أشغال يدوية وتراث' : lang === 'en' ? 'Crafts & Tradition' : 'Artisanat & Tradition',
      name: isAr ? 'دكان الجزائر' : lang === 'en' ? 'Boutique El Djazaïr' : 'Boutique El Djazaïr',
      color: '#047857', // Emerald
      bgAccent: 'from-emerald-500/20 to-teal-500/5',
      tag: isAr ? '🇩🇿 100% جزائري' : '🇩🇿 100% Algérien',
      products: [
        { 
          name: isAr ? 'جبة قبائلية تقليدية' : lang === 'en' ? 'Traditional Kabyle Dress' : 'Robe Kabyle Traditionnelle', 
          price: '4,500 DA', 
          desc: isAr ? 'فستان حفلات مطرز يدوياً بياقة عاصمية.' : lang === 'en' ? 'Hand-embroidered festive dress with Algiers collar.' : 'Robe de fête brodée main, col en V algérois.', 
          image: '👗' 
        },
        { 
          name: isAr ? 'برنوس صوف أصيل' : lang === 'en' ? 'Pure Wool Burnous' : 'Burnous en Laine pure', 
          price: '12,500 DA', 
          desc: isAr ? 'برنوس تقليدي مغزول باليد.' : lang === 'en' ? 'Authentic hand-woven pure wool burnous.' : 'Authentique burnous tissé à la main.', 
          image: '🧥' 
        }
      ]
    },
    beauty: {
      label: isAr ? 'مستحضرات تجميل وزيوت' : lang === 'en' ? 'Cosmetics & Oils' : 'Cosmétique & Huiles',
      name: isAr ? 'نقاء الصحراء' : lang === 'en' ? 'Sahara Pure' : 'Sahara Pure',
      color: '#d97706', // Amber
      bgAccent: 'from-amber-500/20 to-orange-500/5',
      tag: isAr ? '🌿 طبيعي ومحلي' : '🌿 Naturel & local',
      products: [
        { 
          name: isAr ? 'زيت التين الشوكي' : lang === 'en' ? 'Prickly Pear Seed Oil' : 'Huile de Figue de Barbarie', 
          price: '2,900 DA', 
          desc: isAr ? 'طبيعي 100% معصور على البارد في منطقة القبائل.' : lang === 'en' ? '100% pure cold-pressed seed oil from Kabylie.' : '100% pure et pressée à froid en Kabylie.', 
          image: '🧪' 
        },
        { 
          name: isAr ? 'صابون تمر وعسل يدوي' : lang === 'en' ? 'Date & Honey Soap' : 'Savon Artisanal Datte & Miel', 
          price: '750 DA', 
          desc: isAr ? 'صابون مصنوع يدوياً من تمور الجنوب.' : lang === 'en' ? 'Handcrafted cold-saponified soap with Southern dates.' : 'Saponifié à froid avec des dattes du Sud.', 
          image: '🧼' 
        }
      ]
    },
    electronics: {
      label: isAr ? 'هواتف وتقنية' : lang === 'en' ? 'Phones & Tech' : 'Téléphonie & Tech',
      name: isAr ? 'إيكوم ديزيد تقنية' : lang === 'en' ? 'Ecom-Dz Tech' : 'Ecom-Dz Tech',
      color: '#3b82f6', // Blue
      bgAccent: 'from-blue-500/20 to-sky-500/5',
      tag: isAr ? '⚡ شحن خلال 24 ساعة' : '⚡ Expédié sous 24h',
      products: [
        { 
          name: isAr ? 'شاحن سريع 65 واط' : lang === 'en' ? '65W Fast Charger' : 'Chargeur Rapide 65W', 
          price: '3,100 DA', 
          desc: isAr ? 'متوافق مع جميع الهواتف الذكية الحديثة.' : lang === 'en' ? 'Fast charger compatible with all recent smartphones.' : 'Compatible avec tous les smartphones récents.', 
          image: '🔌' 
        },
        { 
          name: isAr ? 'سماعات بلوتوث برو' : lang === 'en' ? 'Bluetooth Earbuds Pro' : 'Écouteurs Bluetooth Pro', 
          price: '4,800 DA', 
          desc: isAr ? 'عزل صوتي نشط وجودة صوت عالية.' : lang === 'en' ? 'Active noise cancelling, high-fidelity sound.' : 'Réduction de bruit active, son de qualité.', 
          image: '🎧' 
        }
      ]
    }
  }
}

export default function HomePage() {
  const lang = useLang() as 'fr' | 'ar' | 'en'
  const t = LOCAL_TRANSLATIONS[lang] ?? LOCAL_TRANSLATIONS.fr
  const isAr = lang === 'ar'

  // ── States ───────────────────────────────────────────────────────────
  const [storeName, setStoreName] = useState(isAr ? 'دكان القبائل' : 'Boutique Kabylie')
  const [activeNicheKey, setActiveNicheKey] = useState<NicheKey>('traditional')
  const [storeColor, setStoreColor] = useState('#047857')
  const [isCopied, setIsCopied] = useState(false)

  // Multi-Store States
  const [selectedDashboardStore, setSelectedDashboardStore] = useState('store1')

  // WhatsApp simulation states
  const [simStep, setSimStep] = useState(1)

  // FAQ Accordion states
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const niches = getMockNiches(lang)
  const activeNiche = niches[activeNicheKey]

  // Sync color changes when switching niches
  useEffect(() => {
    setStoreColor(niches[activeNicheKey].color)
  }, [activeNicheKey, lang])

  // Sync store name when switching languages
  useEffect(() => {
    setStoreName(isAr ? 'دكان القبائل' : 'Boutique Kabylie')
  }, [lang, isAr])

  const copyStoreLink = () => {
    navigator.clipboard.writeText(`ecom-dz.net/store/${storeName.toLowerCase().replace(/\s+/g, '-')}`)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <main className="min-h-screen bg-slate-955 text-slate-100 selection:bg-indigo-500 selection:text-white overflow-hidden animate-fade-in">
      
      {/* ── BACKGROUND GLOWS ───────────────────────────────────────────────── */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-1/3 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[130px] pointer-events-none" />

      {/* ── HERO SECTION ───────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-12 sm:pt-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4.5 py-1.5 rounded-full text-xs font-extrabold text-indigo-300 mb-8 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          {t.solution100algerian}
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.1] mb-6 tracking-tight text-white">
          {t.heroTitle}<br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
            {t.heroTitleAccent}
          </span>
        </h1>

        <p className="text-slate-450 text-base sm:text-xl mb-10 leading-relaxed max-w-3xl mx-auto">
          {t.heroSubtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link
            href="/become-seller"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black px-8 py-4.5 rounded-2xl shadow-xl shadow-indigo-600/35 hover:scale-[1.02] active:scale-[0.98] transition-all text-base"
          >
            <Store className="w-5 h-5" />
            {t.primaryBtn}
            <ArrowRight className={`w-5 h-5 text-white ${isAr ? 'rotate-180' : ''}`} />
          </Link>
          <a
            href="#customizer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900/60 hover:bg-slate-900 text-slate-300 font-semibold px-8 py-4.5 rounded-2xl hover:text-white transition-colors text-base border border-slate-800/80"
          >
            <Sliders className="w-4 h-4 text-indigo-400" /> {t.secondaryBtn}
          </a>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-900/40 border border-slate-900 rounded-3xl backdrop-blur-md">
          {[
            { label: t.statSellers, value: '250+' },
            { label: t.statWilayas, value: '58' },
            { label: t.statCommission, value: '0%' },
            { label: t.statApis, value: t.statApisVal }
          ].map(({ label, value }) => (
            <div key={label} className="p-3 text-center">
              <p className="text-2xl sm:text-3xl font-black text-white">{value}</p>
              <p className="text-xs text-slate-505 mt-1 uppercase tracking-wider font-bold">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── INTERACTIVE SANDBOX CUSTOMIZER ─────────────────────────────────── */}
      <section id="customizer" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{t.sandboxTitle}</h2>
          <p className="text-slate-450 max-w-2xl mx-auto">{t.sandboxSubtitle}</p>
        </div>

        <div className="grid lg:grid-cols-[45%_55%] gap-8 items-center bg-slate-900/30 border border-slate-900 p-6 sm:p-10 rounded-[32px] backdrop-blur-xl">
          {/* Controls Panel */}
          <div className="space-y-6">
            <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">{t.configTitle}</span>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">{t.storeNameLabel}</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value || 'Ma Boutique')}
                  maxLength={25}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">{t.themeColorLabel}</label>
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
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">{t.selectNicheLabel}</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(Object.keys(niches) as Array<NicheKey>).map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveNicheKey(key)}
                    className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border text-center ${activeNicheKey === key ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'}`}
                  >
                    {niches[key].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Live Link preview */}
            <div className="p-4.5 bg-indigo-950/10 border border-indigo-900/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">{t.reservedLinkLabel}</p>
                <p className="text-sm font-bold font-mono text-white truncate" dir="ltr">
                  ecom-dz.net/store/<span className="text-indigo-400">{storeName.toLowerCase().replace(/\s+/g, '-')}</span>
                </p>
              </div>
              <button
                onClick={copyStoreLink}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 text-xs font-bold text-white px-4 py-2.5 rounded-xl border border-slate-800 transition-colors"
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                {isCopied ? t.copied : t.copyLinkBtn}
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
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-normal">{t.mobileWelcome}</p>
              </div>

              {/* Shop Products Listing Grid */}
              <div className="p-4 flex-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t.mobileCatalog}</p>
                <div className="grid grid-cols-2 gap-3">
                  {activeNiche.products.map((prod: NicheProduct) => (
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
                  {WA_SVG} {t.waOrderBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WINNING POINTS / ADVANTAGES SECTION ── */}
      <section id="advantages" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-900/60">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold text-indigo-400 mb-4">
            <Award className="w-4 h-4" /> {t.advantagesTagline}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">{t.advantagesTitle}</h2>
          <p className="text-slate-450 mt-2 max-w-2xl mx-auto">{t.advantagesSubtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Point 1: Anti-Retour Client */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">{t.antiReturnTitle}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.antiReturnDesc}</p>
          </div>

          {/* Point 2: APIs Transporteurs */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">{t.shippingApiTitle}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.shippingApiDesc}</p>
          </div>

          {/* Point 3: Gestion Multi-Boutique */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">{t.multiStoreTitle}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.multiStoreDesc}</p>
          </div>

          {/* Point 4: Zéro commission */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">{t.zeroCommissionTitle}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.zeroCommissionDesc}</p>
          </div>

          {/* Point 5: CCP & BaridiMob */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Landmark className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">{t.ccpPaymentTitle}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.ccpPaymentDesc}</p>
          </div>

          {/* Point 6: Mobile optimized */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">{t.mobileOptimizedTitle}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.mobileOptimizedDesc}</p>
          </div>

        </div>
      </section>

      {/* ── MULTI-STORE & CRM DETAIL ───────────────────────────────────────── */}
      <section id="multistore" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-900/60">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold text-indigo-400">
              <Building className="w-4 h-4" /> {t.crmTagline}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {t.crmTitle}
            </h2>
            <p className="text-slate-400 leading-relaxed">
              {t.crmDesc}
            </p>

            <div className="space-y-3.5">
              {[
                { title: t.benefit1Title, desc: t.benefit1Desc },
                { title: t.benefit2Title, desc: t.benefit2Desc },
                { title: t.benefit3Title, desc: t.benefit3Desc }
              ].map(({ title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{title}</h4>
                    <p className="text-xs text-slate-505 mt-0.5 leading-relaxed">{desc}</p>
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
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t.dbStoreLabel}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-sm font-black text-white">{t.karimSeller}</span>
                </div>
              </div>
              
              {/* Store Switcher Tab */}
              <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-850">
                <button
                  onClick={() => setSelectedDashboardStore('store1')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDashboardStore === 'store1' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t.store1Tab}
                </button>
                <button
                  onClick={() => setSelectedDashboardStore('store2')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDashboardStore === 'store2' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t.store2Tab}
                </button>
              </div>
            </div>

            {/* Dashboard metrics preview */}
            <div className="grid grid-cols-3 gap-3.5 mb-6">
              <div className="bg-slate-955 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-505 font-bold block uppercase">{t.revenueMetric}</span>
                <span className="text-base sm:text-lg font-black text-white mt-1 block">
                  {selectedDashboardStore === 'store1' ? '450 000 DA' : '230 000 DA'}
                </span>
              </div>
              <div className="bg-slate-955 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-505 font-bold block uppercase">{t.packagesMetric}</span>
                <span className="text-base sm:text-lg font-black text-white mt-1 block">
                  {selectedDashboardStore === 'store1' ? '92 exp' : '48 exp'}
                </span>
              </div>
              <div className="bg-slate-955 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] text-slate-505 font-bold block uppercase">{t.successRate}</span>
                <span className="text-base sm:text-lg font-black text-emerald-400 mt-1 block">
                  {selectedDashboardStore === 'store1' ? '94.2 %' : '91.5 %'}
                </span>
              </div>
            </div>

            {/* Customer Consolidation list mockup */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.crmHeader}</span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-bold">{t.crmTag}</span>
              </div>

              <div className="space-y-2.5">
                {[
                  { name: 'Mohamed Lakhdar', wilaya: 'Alger (16)', orders: 4, revenue: '18,500 DA', tag: isAr ? 'زبون وفي' : 'Client Fidèle', tagColor: 'bg-emerald-500/10 text-emerald-400' },
                  { name: 'Amine B.', wilaya: 'Oran (31)', orders: 3, revenue: '12,200 DA', tag: isAr ? 'توصيل تلقائي' : 'Livraison Auto', tagColor: 'bg-indigo-500/10 text-indigo-400' },
                  { name: 'Yacine K.', wilaya: 'Constantine (25)', orders: 1, revenue: '4,500 DA', tag: isAr ? 'جديد' : 'Nouveau', tagColor: 'bg-slate-500/10 text-slate-400' }
                ].map((c) => (
                  <div key={c.name} className="bg-slate-955 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-white">{c.name}</p>
                      <p className="text-[10px] text-slate-505 mt-0.5">Wilaya: {c.wilaya}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white">{c.revenue}</p>
                      <p className="text-[10px] text-slate-505 mt-0.5">{c.orders} {isAr ? 'طلبيات' : 'commandes'}</p>
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
            <Truck className="w-4 h-4" /> {t.apisTagline}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">{t.apisTitle}</h2>
          <p className="text-slate-450 max-w-2xl mx-auto mt-3">{t.apisDesc}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { name: 'Yalidine Express', badge: 'Auto-Sync', logo: '📦', delay: '24h - 48h', desc: isAr ? 'طباعة بوليصات الشحن وتتبع مباشر للطرود.' : lang === 'en' ? 'Bulk print shipping slips and track packages directly.' : 'Impression en masse de bordereaux et suivi direct de livraison.' },
            { name: 'Maystro Delivery', badge: 'Auto-Sync', logo: '🚚', delay: '24h - 48h', desc: isAr ? 'إدارة التوصيل مع إرجاع معلومات المشترين.' : lang === 'en' ? 'Manage deliveries with buyer data loopback.' : 'Gestion des livraisons avec retour gratuit de l\'information client.' },
            { name: 'Procolis Express', badge: 'Intégré', logo: '🛵', delay: '48h', desc: isAr ? 'إرسال بوليصات الشحن مباشرة بنقرة واحدة.' : lang === 'en' ? 'Direct export of shipping slips in 1 click.' : 'Envoi direct des bordereaux d\'expédition en 1 clic.' },
            { name: 'ZR Express', badge: 'Intégré', logo: '🚛', delay: '24h', desc: isAr ? 'جدولة استلام الطرود آلياً.' : lang === 'en' ? 'Automatic parcel pick-up scheduling.' : 'Planification automatique des ramassages de colis.' },
            { name: 'Colivraison', badge: 'Intégré', logo: '📦', delay: '48h', desc: isAr ? 'تحديث وتتبع مباشر للمبيعات في نظام الـ CRM.' : lang === 'en' ? 'Live delivery tracking synced to your CRM.' : 'Suivi de livraison direct synchronisé dans votre CRM.' }
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
                <p className="text-[10px] text-slate-500 mt-0.5">{t.delayLabel} {api.delay}</p>
                <p className="text-xs text-slate-450 mt-3 leading-normal">{api.desc}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-900 flex items-center justify-between text-[10px] font-black text-indigo-400">
                <span>{t.connectBtn}</span>
                <ChevronRight className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
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
              {WA_SVG} {t.whatsappTagline}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              {t.whatsappTitle}
            </h2>
            <p className="text-slate-400 leading-relaxed">
              {t.whatsappDesc}
            </p>

            {/* Sim step controllers */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
              {[
                { step: 1, label: t.step1Label },
                { step: 2, label: t.step2Label },
                { step: 3, label: t.step3Label }
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
            <div className="absolute top-4 right-4 text-[10px] text-slate-500 font-bold">{t.simTitle}</div>

            {simStep === 1 && (
              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-6 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl">👗</div>
                <div>
                  <h3 className="font-bold text-white text-base">{t.sim1Title}</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">{t.sim1Desc}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-xs flex items-center justify-between w-64">
                  <span className="font-bold text-white">{isAr ? 'فستان قبائلي تراثي' : lang === 'en' ? 'Traditional Kabyle Dress' : 'Robe Kabyle tradition'}</span>
                  <span className="font-black text-indigo-400" dir="ltr">4,500 DA</span>
                </div>
              </div>
            )}

            {simStep === 2 && (
              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-6 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-3xl">📱</div>
                <div>
                  <h3 className="font-bold text-white text-base">{t.sim2Title}</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">{t.sim2Desc}</p>
                </div>
                <button className="w-64 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-green-600/10">
                  {WA_SVG} {t.waOrderBtn}
                </button>
              </div>
            )}

            {simStep === 3 && (
              <div className="flex-1 flex flex-col justify-between pt-4 animate-fade-in">
                <div className="bg-[#075e54] rounded-t-2xl px-4 py-2.5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm">🛍️</div>
                  <div>
                    <p className="text-white font-bold text-xs">{isAr ? 'دكان الجزائر' : 'Boutique El Djazaïr'}</p>
                    <p className="text-white/60 text-[9px]">{isAr ? 'متصل الآن' : 'En ligne'}</p>
                  </div>
                </div>
                
                {/* Whatsapp chat message bubble */}
                <div className="bg-[#e5ddd5] p-4 flex-1 flex items-center justify-center min-h-[160px]">
                  <div className="bg-white rounded-xl p-3 shadow-md max-w-[90%] text-[10px] leading-relaxed text-slate-800 font-mono" dir="ltr">
                    <p className="font-bold text-green-700">🛍️ *COMMANDE — Boutique El Djazaïr*</p>
                    <p className="text-slate-350">━━━━━━━━━━━━━━━━━━</p>
                    <p>📦 *Produit:* Robe Kabyle tradition</p>
                    <p>🔢 *Quantité:* 1</p>
                    <p>💰 *Total:* 4,500 DA</p>
                    <p className="text-slate-350">━━━━━━━━━━━━━━━━━━</p>
                    <p>💵 Paiement à la livraison (COD)</p>
                    <p className="text-slate-400 text-right mt-1">12:35 ✓✓</p>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-b-2xl flex items-center gap-2 border-t border-slate-800/40">
                  <input
                    disabled
                    type="text"
                    placeholder={t.sim3ReadyMsg}
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
              <span className="text-slate-500 font-bold">{t.stepCount.replace('{n}', simStep.toString())}</span>
              <button
                onClick={() => setSimStep((prev) => (prev < 3 ? prev + 1 : 1))}
                className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                {simStep === 3 ? t.restart : t.next} <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ── PRICING SECTION ────────────────────────────────────────────────── */}
      <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-900/60">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-white">{t.pricingTitle}</h2>
          <p className="text-slate-455 mt-2 max-w-2xl mx-auto">{t.pricingSubtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-stretch mb-10">
          {/* Starter Plan */}
          <div className="bg-slate-900/30 border border-slate-900 hover:border-slate-850 p-7 rounded-[24px] flex flex-col justify-between backdrop-blur-sm transition-all duration-300">
            <div>
              <p className="text-xs text-slate-505 font-extrabold uppercase tracking-wider mb-2">Starter</p>
              <div className="flex items-baseline gap-1 text-white" dir="ltr">
                <span className="text-4xl font-black">2,000</span>
                <span className="text-xl font-bold">DA / {isAr ? 'شهر' : 'mois'}</span>
              </div>
              <span className="inline-block mt-3 text-[10px] font-black px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                {t.trialBadge}
              </span>
              <ul className="space-y-3 text-xs text-slate-400 mt-6">
                {t.starterFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
            <Link
              href="/become-seller"
              className="w-full text-center bg-slate-900 hover:bg-slate-850 text-white font-bold py-3.5 rounded-xl text-xs border border-slate-800 transition-colors mt-8"
            >
              {t.tryFree}
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-slate-900 border-2 border-indigo-500 p-7 rounded-[24px] flex flex-col justify-between relative shadow-2xl shadow-indigo-600/10 transition-all duration-300">
            <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              {isAr ? 'الأكثر شيوعاً' : 'Le plus populaire'}
            </div>
            <div>
              <p className="text-xs text-indigo-400 font-extrabold uppercase tracking-wider mb-2">Pro</p>
              <div className="flex items-baseline gap-1 text-white" dir="ltr">
                <span className="text-4xl font-black">4,000</span>
                <span className="text-xl font-bold">DA / {isAr ? 'شهر' : 'mois'}</span>
              </div>
              <span className="inline-block mt-3 text-[10px] font-black px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                {t.trialBadge}
              </span>
              <ul className="space-y-3 text-xs text-slate-355 mt-6">
                {t.proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
            <Link
              href="/become-seller"
              className="w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition-all mt-8"
            >
              {t.tryFree}
            </Link>
          </div>

          {/* Business Plan */}
          <div className="bg-slate-900/30 border border-slate-900 hover:border-slate-850 p-7 rounded-[24px] flex flex-col justify-between backdrop-blur-sm transition-all duration-300">
            <div>
              <p className="text-xs text-slate-505 font-extrabold uppercase tracking-wider mb-2">Business</p>
              <div className="flex items-baseline gap-1 text-white" dir="ltr">
                <span className="text-4xl font-black">6,000</span>
                <span className="text-xl font-bold">DA / {isAr ? 'شهر' : 'mois'}</span>
              </div>
              <span className="inline-block mt-3 text-[10px] font-black px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/15">
                {t.trialBadge}
              </span>
              <ul className="space-y-3 text-xs text-slate-400 mt-6">
                {t.businessFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
            <Link
              href="/become-seller"
              className="w-full text-center bg-slate-900 hover:bg-slate-850 text-white font-bold py-3.5 rounded-xl text-xs border border-slate-800 transition-colors mt-8"
            >
              {t.tryFree}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION SECTION ──────────────────────────────────────────── */}
      <section className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-900/60">
        <h2 className="text-3xl font-black text-white text-center mb-10">{t.faqTitle}</h2>
        <div className="space-y-3">
          {[
            { q: t.faqQ1, a: t.faqA1 },
            { q: t.faqQ2, a: t.faqA2 },
            { q: t.faqQ3, a: t.faqA3 },
            { q: t.faqQ4, a: t.faqA4 }
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
        <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">{t.finalCtaTitle}</h2>
        <p className="text-slate-350 max-w-xl mx-auto text-sm sm:text-base mb-8">{t.finalCtaSub}</p>
        <Link
          href="/become-seller"
          className="inline-flex items-center justify-center gap-2 bg-white text-indigo-955 font-black px-10 py-4.5 rounded-2xl hover:bg-slate-100 transition-all shadow-2xl hover:scale-[1.03] active:scale-[0.97]"
        >
          <Store className="w-5 h-5 text-indigo-955" /> {t.finalCtaBtn}
          <ArrowRight className={`w-5 h-5 text-indigo-955 ${isAr ? 'rotate-180' : ''}`} />
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
          <p>© {new Date().getFullYear()} {t.footerCredit}</p>
          <div className="flex gap-4">
            <a href="/terms" className="hover:text-slate-400 transition-colors">{t.cgu}</a>
            <a href="/privacy" className="hover:text-slate-400 transition-colors">{t.privacy}</a>
          </div>
        </div>
      </footer>

    </main>
  )
}
