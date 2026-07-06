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

export interface MarketingCopyResult {
  sms: MultilingualDescription
  instagram: MultilingualDescription
}

const DEFAULT_MODEL = 'gemini-2.5-flash'
const REQUEST_TIMEOUT_MS = 20_000

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null
}

function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
}

/**
 * Sanitize user-controlled text before it reaches the model.
 * - strips control characters
 * - trims whitespace
 * - caps length
 * This reduces (but does not fully eliminate) prompt-injection risk.
 */
function sanitize(text: string | undefined, maxLength: number): string {
  if (!text) return ''
  return text
    .replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, '') // control chars
    .trim()
    .slice(0, maxLength)
}

class GeminiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'GeminiError'
  }
}

async function callGemini({
  systemInstruction,
  userText,
  jsonMode = false,
}: {
  systemInstruction: string
  userText: string
  jsonMode?: boolean
}): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new GeminiError('GEMINI_API_KEY is not set')
  }

  const model = DEFAULT_MODEL
  // Send the API key in a header instead of the query string so it is not
  // captured in URLs by proxies, Sentry, or Vercel logs.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
  }
  if (jsonMode) {
    body.generationConfig = { responseMimeType: 'application/json' }
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    throw new GeminiError('Gemini API request failed', err)
  }

  if (!response.ok) {
    const errText = await response.text()
    throw new GeminiError(`Gemini API call failed: ${response.statusText} (${response.status}) - ${errText}`)
  }

  const result = await response.json()
  const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!candidateText) {
    throw new GeminiError('Gemini API returned an empty response')
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
    if (isDev()) {
      logger.warn('[AI] GEMINI_API_KEY is missing. Returning mock product description.')
      return getMockDescription(opts.name, opts.category)
    }
    throw new GeminiError('GEMINI_API_KEY is not set')
  }

  const name = sanitize(opts.name, 200)
  const category = sanitize(opts.category, 200)
  const nicheId = sanitize(opts.nicheId, 50)
  const features = sanitize(opts.features, 1000) || 'Good quality product'

  const systemInstruction = `You are a professional e-commerce copywriter.
Generate a compelling product description in French, Arabic, and English.
Format the output strictly as a JSON object with keys "fr", "ar", and "en".
The description should highlight the key benefits, be persuasive, and match the target market (Algeria). Use markdown list format where appropriate for key details. Do not output anything outside the JSON object.

Example JSON output structure:
{
  "fr": "Description en français...",
  "ar": "الوصف باللغة العربية...",
  "en": "Description in English..."
}`

  const userText = `Product Name: ${name}
Category: ${category} (Niche: ${nicheId})
User inputs / key features: ${features}`

  try {
    const rawJson = await callGemini({ systemInstruction, userText, jsonMode: true })
    const parsed = JSON.parse(rawJson) as MultilingualDescription
    if (parsed.fr && parsed.ar && parsed.en) {
      return {
        fr: sanitize(parsed.fr, 2000),
        ar: sanitize(parsed.ar, 2000),
        en: sanitize(parsed.en, 2000),
      }
    }
    throw new GeminiError('Incomplete keys in generated JSON')
  } catch (err) {
    if (err instanceof GeminiError) throw err
    throw new GeminiError('generateProductDescription failed', err)
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
    if (isDev()) {
      logger.warn('[AI] GEMINI_API_KEY is missing. Returning mock SEO metadata.')
      return getMockSEO(opts.name, opts.category)
    }
    throw new GeminiError('GEMINI_API_KEY is not set')
  }

  const name = sanitize(opts.name, 200)
  const category = sanitize(opts.category, 200)
  const description = sanitize(opts.description, 4000)

  const systemInstruction = `You are an SEO expert.
Generate optimized search metadata for a product.
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

  const userText = `Product Name: ${name}
Category: ${category}
Description: ${description}`

  try {
    const rawJson = await callGemini({ systemInstruction, userText, jsonMode: true })
    const parsed = JSON.parse(rawJson) as SEOMetadata
    if (parsed.metaTitle && parsed.metaDescription && Array.isArray(parsed.tags)) {
      return {
        metaTitle: sanitize(parsed.metaTitle, 60),
        metaDescription: sanitize(parsed.metaDescription, 160),
        tags: parsed.tags
          .map((t) => sanitize(t, 50))
          .filter(Boolean)
          .slice(0, 8),
      }
    }
    throw new GeminiError('Incomplete keys in generated SEO JSON')
  } catch (err) {
    if (err instanceof GeminiError) throw err
    throw new GeminiError('generateSEOMetadata failed', err)
  }
}

/**
 * Translates a given text to the target language (FR, AR, or EN) using Gemini.
 */
export async function translateText(text: string, targetLang: 'fr' | 'ar' | 'en'): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) {
    if (isDev()) {
      logger.warn('[AI] GEMINI_API_KEY is missing. Returning mock translation.')
      return getMockTranslation(text, targetLang)
    }
    throw new GeminiError('GEMINI_API_KEY is not set')
  }

  const cleanText = sanitize(text, 5000)
  const langNames = { fr: 'French', ar: 'Arabic', en: 'English' }

  const systemInstruction = `You are a professional translator.
Output ONLY the translated text. Do not add any introduction, explanations, or quotes. Keep formatting (like markdown lists or bold text) intact if present.`

  const userText = `Translate the following text to ${langNames[targetLang]}:
${cleanText}`

  try {
    const translation = await callGemini({ systemInstruction, userText })
    return sanitize(translation, 8000)
  } catch (err) {
    if (err instanceof GeminiError) throw err
    throw new GeminiError('translateText failed', err)
  }
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
    if (isDev()) {
      logger.warn('[AI] GEMINI_API_KEY is missing. Returning mock marketing copy.')
      return getMockMarketingCopy(opts.name, opts.category)
    }
    throw new GeminiError('GEMINI_API_KEY is not set')
  }

  const name = sanitize(opts.name, 200)
  const category = sanitize(opts.category, 200)
  const description = sanitize(opts.description, 5000)

  const systemInstruction = `You are a social media manager and growth marketer.
Generate e-commerce marketing copies for a product.
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

  const userText = `Product Name: ${name}
Category: ${category}
Description: ${description}`

  try {
    const rawJson = await callGemini({ systemInstruction, userText, jsonMode: true })
    const parsed = JSON.parse(rawJson) as MarketingCopyResult
    if (
      parsed.sms?.fr && parsed.sms?.ar && parsed.sms?.en &&
      parsed.instagram?.fr && parsed.instagram?.ar && parsed.instagram?.en
    ) {
      return {
        sms: {
          fr: sanitize(parsed.sms.fr, 1000),
          ar: sanitize(parsed.sms.ar, 1000),
          en: sanitize(parsed.sms.en, 1000),
        },
        instagram: {
          fr: sanitize(parsed.instagram.fr, 2200),
          ar: sanitize(parsed.instagram.ar, 2200),
          en: sanitize(parsed.instagram.en, 2200),
        },
      }
    }
    throw new GeminiError('Incomplete keys in generated marketing JSON')
  } catch (err) {
    if (err instanceof GeminiError) throw err
    throw new GeminiError('generateMarketingCopy failed', err)
  }
}

// ── Mock Fallbacks (Offline / Dev-Test Mode Only) ───────────────────────────

function getMockDescription(name: string, category: string): MultilingualDescription {
  const safeName = sanitize(name, 200)
  const safeCategory = sanitize(category, 200)
  return {
    fr: `**${safeName}** de la catégorie *${safeCategory}*. Produit de qualité supérieure, idéal pour un usage quotidien. Robuste, durable et conçu avec des matériaux haut de gamme. Profitez de la livraison rapide sur toute l'Algérie.`,
    ar: `**${safeName}** من فئة *${safeCategory}*. منتج عالي الجودة ومثالي للاستخدام اليومي. متين ومصنوع من مواد ممتازة. متوفر مع خدمة التوصيل السريع إلى جميع الولايات.`,
    en: `**${safeName}** from the *${safeCategory}* category. Premium quality product, perfect for daily use. Robust, durable and made of high-quality materials. Fast delivery available across Algeria.`,
  }
}

function getMockSEO(name: string, category: string): SEOMetadata {
  const cleanName = sanitize(name, 200).replace(/["']/g, '')
  const cleanCategory = sanitize(category, 200)
  return {
    metaTitle: `${cleanName} au Meilleur Prix en Algérie | StoreDz`,
    metaDescription: `Achetez ${cleanName} de la catégorie ${cleanCategory} en ligne. Livraison rapide 58 wilayas, paiement à la livraison. Commandez maintenant !`,
    tags: [
      cleanCategory.toLowerCase(),
      cleanName.toLowerCase().replace(/\s+/g, '-'),
      'storedz',
      'achat-algerie',
      'livraison-58-wilayas',
    ],
  }
}

function getMockTranslation(text: string, targetLang: 'fr' | 'ar' | 'en'): string {
  const safeText = sanitize(text, 5000)
  if (targetLang === 'fr') return `[Traduction FR] ${safeText}`
  if (targetLang === 'ar') return `[ترجمة AR] ${safeText}`
  return `[Translation EN] ${safeText}`
}

function getMockMarketingCopy(name: string, category: string): MarketingCopyResult {
  const safeName = sanitize(name, 200)
  const safeCategory = sanitize(category, 200)
  const catTag = safeCategory.toLowerCase().replace(/\s+/g, '')
  return {
    sms: {
      fr: `Flash Promo ! Découvrez notre nouveau produit : ${safeName} de la catégorie ${safeCategory}. Commandez vite ici : [Lien_Boutique] ! Paiement à la livraison.`,
      ar: `عرض خاص! اكتشف منتجنا الجديد: ${safeName} من فئة ${safeCategory}. اطلب الآن من هنا: [Lien_Boutique]! الدفع عند الاستلام.`,
      en: `Promo Alert! Discover our new product: ${safeName} in the ${safeCategory} category. Order yours today: [ShopLink]! Cash on delivery available.`,
    },
    instagram: {
      fr: `✨ Nouveau produit disponible ! ✨\n\nDécouvrez le **${safeName}**, parfait pour rehausser votre quotidien. 🛍️\n\n✅ Haute qualité\n✅ Livraison rapide sur 58 wilayas\n✅ Paiement à la livraison\n\n👉 Commandez sur le lien dans notre bio !\n\n#storedz #dz #algeria #${catTag}`,
      ar: `✨ متوفر الآن! ✨\n\nاكتشف منتج **${safeName}** الجديد والمثالي لاستخدامكم اليومي. 🛍️\n\n✅ جودة عالية\n✅ التوصيل سريع إلى 58 ولاية\n✅ الدفع عند الاستلام\n\n👉 اطلب الآن عبر الرابط في البيو!\n\n#storedz #dz #algeria #${catTag}`,
      en: `✨ New arrival! ✨\n\nDiscover the **${safeName}**, designed to elevate your daily routine. 🛍️\n\n✅ Premium Quality\n✅ Fast delivery across 58 wilayas\n✅ Cash on delivery\n\n👉 Click the link in our bio to order now!\n\n#storedz #dz #algeria #${catTag}`,
    },
  }
}
