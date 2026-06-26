import { logger } from '@/lib/logger'

export interface MultilingualDescription {
  fr: string
  ar: string
  en: string
}

export interface SEOMetadata {
  metaTitle: string
  metaDescription: string
  tags: string[]
}

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null
}

async function callGemini(prompt: string, jsonMode = false): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: jsonMode ? {
        responseMimeType: 'application/json'
      } : undefined
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API call failed: ${response.statusText} (${response.status}) - ${errText}`)
  }

  const result = await response.json()
  const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!candidateText) {
    throw new Error('Gemini API returned an empty response')
  }

  return candidateText.trim()
}

/**
 * Generates a multilingual product description (FR, AR, EN) based on name, category, and key features.
 */
export async function generateProductDescription(opts: {
  name: string
  category: string
  nicheId: string
  features?: string
}): Promise<MultilingualDescription> {
  const apiKey = getApiKey()
  if (!apiKey) {
    logger.warn('[AI] GEMINI_API_KEY is missing. Returning mock product description.')
    return getMockDescription(opts.name, opts.category)
  }

  const prompt = `You are a professional e-commerce copywriter.
Generate a compelling product description in French, Arabic, and English.
Product Name: "${opts.name}"
Category: "${opts.category}" (Niche: "${opts.nicheId}")
User inputs / key features: "${opts.features || 'Good quality product'}"

Format the output strictly as a JSON object with keys "fr", "ar", and "en".
The description should highlight the key benefits, be persuasive, and match the target market (Algeria). Use markdown list format where appropriate for key details. Do not output anything outside the JSON object.

Example JSON output structure:
{
  "fr": "Description en français...",
  "ar": "الوصف باللغة العربية...",
  "en": "Description in English..."
}`

  try {
    const rawJson = await callGemini(prompt, true)
    const parsed = JSON.parse(rawJson) as MultilingualDescription
    if (parsed.fr && parsed.ar && parsed.en) {
      return parsed
    }
    throw new Error('Incomplete keys in generated JSON')
  } catch (err) {
    logger.error('[AI] generateProductDescription failed, using fallback', { error: err instanceof Error ? err.message : String(err) })
    return getMockDescription(opts.name, opts.category)
  }
}

/**
 * Generates SEO title, description, and list of tags for a product.
 */
export async function generateSEOMetadata(opts: {
  name: string
  category: string
  description?: string
}): Promise<SEOMetadata> {
  const apiKey = getApiKey()
  if (!apiKey) {
    logger.warn('[AI] GEMINI_API_KEY is missing. Returning mock SEO metadata.')
    return getMockSEO(opts.name, opts.category)
  }

  const prompt = `You are an SEO expert.
Generate optimized search metadata for this product:
Product Name: "${opts.name}"
Category: "${opts.category}"
Description: "${opts.description || ''}"

Format the output strictly as a JSON object with keys:
- "metaTitle": a high-CTR SEO title (max 60 characters)
- "metaDescription": a compelling search description (max 160 characters)
- "tags": an array of 5-8 relevant SEO search tags (lowercase words or short phrases)

Do not output anything outside the JSON object.

Example JSON output structure:
{
  "metaTitle": "Title here",
  "metaDescription": "Description here",
  "tags": ["tag1", "tag2"]
}`

  try {
    const rawJson = await callGemini(prompt, true)
    const parsed = JSON.parse(rawJson) as SEOMetadata
    if (parsed.metaTitle && parsed.metaDescription && Array.isArray(parsed.tags)) {
      return parsed
    }
    throw new Error('Incomplete keys in generated SEO JSON')
  } catch (err) {
    logger.error('[AI] generateSEOMetadata failed, using fallback', { error: err instanceof Error ? err.message : String(err) })
    return getMockSEO(opts.name, opts.category)
  }
}

// ── Mock Fallbacks (Offline Mode) ──────────────────────────────────────────

function getMockDescription(name: string, category: string): MultilingualDescription {
  return {
    fr: `**${name}** de la catégorie *${category}*. Produit de qualité supérieure, idéal pour un usage quotidien. Robuste, durable et conçu avec des matériaux haut de gamme. Profitez de la livraison rapide sur toute l'Algérie.`,
    ar: `**${name}** من فئة *${category}*. منتج عالي الجودة ومثالي للاستخدام اليومي. متين ومصنوع من مواد ممتازة. متوفر مع خدمة التوصيل السريع إلى جميع الولايات.`,
    en: `**${name}** from the *${category}* category. Premium quality product, perfect for daily use. Robust, durable and made of high-quality materials. Fast delivery available across Algeria.`
  }
}

function getMockSEO(name: string, category: string): SEOMetadata {
  const cleanName = name.replace(/["']/g, '')
  return {
    metaTitle: `${cleanName} au Meilleur Prix en Algérie | StoreDz`,
    metaDescription: `Achetez ${cleanName} de la catégorie ${category} en ligne. Livraison rapide 58 wilayas, paiement à la livraison. Commandez maintenant !`,
    tags: [
      category.toLowerCase(),
      cleanName.toLowerCase().replace(/\s+/g, '-'),
      'storedz',
      'achat-algerie',
      'livraison-58-wilayas'
    ]
  }
}

/**
 * Translates a given text to the target language (FR, AR, or EN) using Gemini.
 */
export async function translateText(text: string, targetLang: 'fr' | 'ar' | 'en'): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) {
    logger.warn('[AI] GEMINI_API_KEY is missing. Returning mock translation.')
    return getMockTranslation(text, targetLang)
  }

  const langNames = { fr: 'French', ar: 'Arabic', en: 'English' }
  const prompt = `You are a professional translator.
Translate the following text to ${langNames[targetLang]}.
Text to translate: "${text}"

Output ONLY the translated text. Do not add any introduction, explanations, or quotes. Keep formatting (like markdown lists or bold text) intact if present.`

  try {
    const translation = await callGemini(prompt, false)
    return translation
  } catch (err) {
    logger.error('[AI] translateText failed, using fallback', { error: err instanceof Error ? err.message : String(err) })
    return getMockTranslation(text, targetLang)
  }
}

function getMockTranslation(text: string, targetLang: 'fr' | 'ar' | 'en'): string {
  if (targetLang === 'fr') return `[Traduction FR] ${text}`
  if (targetLang === 'ar') return `[ترجمة AR] ${text}`
  return `[Translation EN] ${text}`
}

export interface MarketingCopyResult {
  sms: MultilingualDescription
  instagram: MultilingualDescription
}

/**
 * Generates compelling marketing copy (SMS and Instagram captions) in FR, AR, and EN.
 */
export async function generateMarketingCopy(opts: {
  name: string
  category: string
  description?: string
}): Promise<MarketingCopyResult> {
  const apiKey = getApiKey()
  if (!apiKey) {
    logger.warn('[AI] GEMINI_API_KEY is missing. Returning mock marketing copy.')
    return getMockMarketingCopy(opts.name, opts.category)
  }

  const prompt = `You are a social media manager and growth marketer.
Generate e-commerce marketing copies for this product:
Product Name: "${opts.name}"
Category: "${opts.category}"
Description: "${opts.description || ''}"

You need to return:
1. An SMS / WhatsApp template (short, engaging, includes call to action and placeholders like [ShopLink]).
2. An Instagram / Facebook caption (engaging, includes emojis, formatted neatly, and has 3-5 relevant hashtags).

Generate these in French, Arabic, and English.
Format the output strictly as a JSON object with this exact structure:
{
  "sms": {
    "fr": "SMS text in French",
    "ar": "SMS text in Arabic",
    "en": "SMS text in English"
  },
  "instagram": {
    "fr": "Instagram caption in French with hashtags",
    "ar": "Instagram caption in Arabic with hashtags",
    "en": "Instagram caption in English with hashtags"
  }
}

Do not output anything outside the JSON object.`

  try {
    const rawJson = await callGemini(prompt, true)
    const parsed = JSON.parse(rawJson) as MarketingCopyResult
    if (
      parsed.sms?.fr && parsed.sms?.ar && parsed.sms?.en &&
      parsed.instagram?.fr && parsed.instagram?.ar && parsed.instagram?.en
    ) {
      return parsed
    }
    throw new Error('Incomplete keys in generated marketing JSON')
  } catch (err) {
    logger.error('[AI] generateMarketingCopy failed, using fallback', { error: err instanceof Error ? err.message : String(err) })
    return getMockMarketingCopy(opts.name, opts.category)
  }
}

function getMockMarketingCopy(name: string, category: string): MarketingCopyResult {
  return {
    sms: {
      fr: `Flash Promo ! Découvrez notre nouveau produit : ${name} de la catégorie ${category}. Commandez vite ici : [Lien_Boutique] ! Paiement à la livraison.`,
      ar: `عرض خاص! اكتشف منتجنا الجديد: ${name} من فئة ${category}. اطلب الآن من هنا: [Lien_Boutique]! الدفع عند الاستلام.`,
      en: `Promo Alert! Discover our new product: ${name} in the ${category} category. Order yours today: [ShopLink]! Cash on delivery available.`
    },
    instagram: {
      fr: `✨ Nouveau produit disponible ! ✨\n\nDécouvrez le **${name}**, parfait pour rehausser votre quotidien. 🛍️\n\n✅ Haute qualité\n✅ Livraison rapide sur 58 wilayas\n✅ Paiement à la livraison\n\n👉 Commandez sur le lien dans notre bio !\n\n#storedz #dz #algeria #${category.toLowerCase().replace(/\s+/g, '')}`,
      ar: `✨ متوفر الآن! ✨\n\nاكتشف منتج **${name}** الجديد والمثالي لاستخدامكم اليومي. 🛍️\n\n✅ جودة عالية\n✅ التوصيل سريع إلى 58 ولاية\n✅ الدفع عند الاستلام\n\n👉 اطلب الآن عبر الرابط في البيو!\n\n#storedz #dz #algeria #${category.toLowerCase().replace(/\s+/g, '')}`,
      en: `✨ New arrival! ✨\n\nDiscover the **${name}**, designed to elevate your daily routine. 🛍️\n\n✅ Premium Quality\n✅ Fast delivery across 58 wilayas\n✅ Cash on delivery\n\n👉 Click the link in our bio to order now!\n\n#storedz #dz #algeria #${category.toLowerCase().replace(/\s+/g, '')}`
    }
  }
}
