/**
 * WhatsApp order notification utility.
 *
 * Sends order notifications via the WhatsApp Business API (Meta Cloud API).
 * No third-party library required — uses plain fetch.
 *
 * Required env vars:
 *   WHATSAPP_PHONE_NUMBER_ID   — from Meta Business > WhatsApp > API Setup
 *   WHATSAPP_ACCESS_TOKEN      — permanent system user token
 *   NEXT_PUBLIC_STORE_NAME     — used in message templates
 *
 * Template messages must be pre-approved in Meta Business Manager.
 * Create two versions of each template: one with language code "fr", one with "ar".
 */

import { logger } from '@/lib/logger'

const API_BASE = 'https://graph.facebook.com/v18.0'

// Template names registered in Meta Business Manager.
// Each template must have both an "fr" and "ar" version approved.
const TEMPLATE_NAMES = {
  orderConfirmed: 'order_confirmation',
  orderShipped:   'order_shipped',
  orderDelivered: 'order_delivered',
} as const

export type Lang = 'fr' | 'ar'

const LANG_CODES: Record<Lang, string> = {
  fr: 'fr',
  ar: 'ar',
}

interface WhatsAppConfig {
  phoneNumberId: string
  accessToken:   string
}

function getConfig(): WhatsAppConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) return null
  return { phoneNumberId, accessToken }
}

/**
 * Formats an Algerian phone number to WhatsApp's E.164 international format.
 */
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('213')) return digits
  if (digits.startsWith('0'))   return `213${digits.slice(1)}`
  return `213${digits}`
}

/**
 * Sends one HTTP request to the WhatsApp Graph API.
 * Returns the raw Response — caller decides whether to retry.
 */
async function sendOnce(
  config: WhatsAppConfig,
  payload: unknown
): Promise<Response> {
  return fetch(
    `${API_BASE}/${config.phoneNumberId}/messages`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )
}

const MAX_ATTEMPTS   = 3
const BASE_DELAY_MS  = 1000 // 1 s → 2 s → 4 s

/**
 * Sends a WhatsApp template message with up to 3 attempts (exponential backoff).
 * Only retries on network errors or 5xx responses; stops immediately on 4xx.
 */
async function sendTemplateMessage(
  to:           string,
  templateName: string,
  components:   unknown[],
  lang:         Lang = 'fr'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getConfig()
  if (!config) {
    logger.warn('[WhatsApp] Not configured — skipping notification')
    return { success: false, error: 'not_configured' }
  }

  const payload = {
    messaging_product: 'whatsapp',
    to:               toWhatsAppNumber(to),
    type:             'template',
    template: {
      name:     templateName,
      language: { code: LANG_CODES[lang] },
      components,
    },
  }

  let lastError = 'unknown'

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res  = await sendOnce(config, payload)
      const data = await res.json()

      if (res.ok) {
        if (attempt > 1) {
          logger.info('[WhatsApp] Succeeded after retry', { attempt, template: templateName })
        }
        return { success: true, messageId: data.messages?.[0]?.id }
      }

      // 4xx = client error (bad template name, wrong number format, etc.) — don't retry
      if (res.status >= 400 && res.status < 500) {
        logger.error('[WhatsApp] API client error — not retrying', {
          status:   res.status,
          template: templateName,
          error:    data?.error?.message ?? 'api_error',
        })
        return { success: false, error: data?.error?.message ?? 'api_error' }
      }

      // 5xx — will retry
      lastError = data?.error?.message ?? `http_${res.status}`
      logger.warn('[WhatsApp] API server error — will retry', {
        attempt, template: templateName, status: res.status,
      })
    } catch (err) {
      // Network error — will retry
      lastError = err instanceof Error ? err.message : 'network_error'
      logger.warn('[WhatsApp] Network error — will retry', {
        attempt, template: templateName, error: lastError,
      })
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, BASE_DELAY_MS * 2 ** (attempt - 1)))
    }
  }

  logger.error('[WhatsApp] All retries exhausted', { template: templateName, error: lastError })
  return { success: false, error: lastError }
}

// ── Notification Helpers ────────────────────────────────────────────────────

export interface OrderNotificationData {
  phone:       string
  fullName:    string
  orderId:     string
  total:       number
  wilaya:      string
  itemCount:   number
  lang?:       Lang
}

/**
 * Sends an order confirmation message to the customer.
 * Template variables: {{1}} = name, {{2}} = order ID (short), {{3}} = total
 *
 * French template example:
 *   "Bonjour {{1}}, votre commande #{{2}} est confirmée. Total : {{3}}. Merci !"
 *
 * Arabic template example:
 *   "مرحباً {{1}}، تم تأكيد طلبك رقم #{{2}}. المجموع: {{3}}. شكراً!"
 */
export async function notifyOrderConfirmed(order: OrderNotificationData) {
  return sendTemplateMessage(
    order.phone,
    TEMPLATE_NAMES.orderConfirmed,
    [
      {
        type:       'body',
        parameters: [
          { type: 'text', text: order.fullName.split(' ')[0] },
          { type: 'text', text: order.orderId.slice(0, 8).toUpperCase() },
          { type: 'text', text: `${order.total.toLocaleString('fr-DZ')} DA` },
        ],
      },
    ],
    order.lang ?? 'fr'
  )
}

/**
 * Sends a shipping notification with tracking info.
 * Template variables: {{1}} = name, {{2}} = tracking number, {{3}} = provider
 *
 * French: "Bonjour {{1}}, votre commande est en route ! Tracking : {{2}} via {{3}}."
 * Arabic: "مرحباً {{1}}، طلبك في الطريق إليك! رقم التتبع: {{2}} عبر {{3}}."
 */
export async function notifyOrderShipped(
  phone:          string,
  fullName:       string,
  trackingNumber: string,
  provider:       string,
  lang:           Lang = 'fr'
) {
  return sendTemplateMessage(
    phone,
    TEMPLATE_NAMES.orderShipped,
    [
      {
        type:       'body',
        parameters: [
          { type: 'text', text: fullName.split(' ')[0] },
          { type: 'text', text: trackingNumber },
          { type: 'text', text: provider },
        ],
      },
    ],
    lang
  )
}

/**
 * Sends a delivery confirmation message.
 *
 * French: "Bonjour {{1}}, votre commande a bien été livrée. Bonne journée !"
 * Arabic: "مرحباً {{1}}، تم تسليم طلبك بنجاح. نتمنى لك يوماً سعيداً!"
 */
export async function notifyOrderDelivered(
  phone:    string,
  fullName: string,
  lang:     Lang = 'fr'
) {
  return sendTemplateMessage(
    phone,
    TEMPLATE_NAMES.orderDelivered,
    [
      {
        type:       'body',
        parameters: [
          { type: 'text', text: fullName.split(' ')[0] },
        ],
      },
    ],
    lang
  )
}

/**
 * Sends a free-form text message (for admin use — not for customer-facing flows).
 * Requires an active conversation (24-hour window) with the recipient.
 */
export async function sendFreeTextMessage(
  phone: string,
  text:  string
): Promise<{ success: boolean; error?: string }> {
  const config = getConfig()
  if (!config) return { success: false, error: 'not_configured' }

  const payload = {
    messaging_product: 'whatsapp',
    to:               toWhatsAppNumber(phone),
    type:             'text',
    text:             { body: text },
  }

  try {
    const res  = await sendOnce(config, payload)
    const data = await res.json()
    if (!res.ok) return { success: false, error: data?.error?.message }
    return { success: true }
  } catch (err) {
    logger.error('[WhatsApp] sendFreeTextMessage failed', { error: err instanceof Error ? err.message : String(err) })
    return { success: false, error: 'network_error' }
  }
}

export function isWhatsAppConfigured(): boolean {
  return getConfig() !== null
}
