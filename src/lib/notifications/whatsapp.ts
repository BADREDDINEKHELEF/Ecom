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
 * Use the "order_confirmation" template name (or update TEMPLATE_NAMES below).
 */

const API_BASE = 'https://graph.facebook.com/v18.0'

const TEMPLATE_NAMES = {
  orderConfirmed: 'order_confirmation',
  orderShipped:   'order_shipped',
  orderDelivered: 'order_delivered',
} as const

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
 * Algerian numbers: 05xxxxxxxx → +2130xxxxxxxx
 */
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('213')) return digits
  if (digits.startsWith('0'))   return `213${digits.slice(1)}`
  return `213${digits}`
}

async function sendTemplateMessage(
  to: string,
  templateName: string,
  components: unknown[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getConfig()
  if (!config) {
    console.warn('[WhatsApp] Not configured — skipping notification')
    return { success: false, error: 'not_configured' }
  }

  const body = {
    messaging_product: 'whatsapp',
    to:               toWhatsAppNumber(to),
    type:             'template',
    template: {
      name:     templateName,
      language: { code: 'fr' },
      components,
    },
  }

  try {
    const res = await fetch(
      `${API_BASE}/${config.phoneNumberId}/messages`,
      {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error('[WhatsApp] API error:', data)
      return { success: false, error: data?.error?.message ?? 'api_error' }
    }

    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (err) {
    console.error('[WhatsApp] Network error:', err)
    return { success: false, error: 'network_error' }
  }
}

// ── Notification Helpers ────────────────────────────────────────────────────

export interface OrderNotificationData {
  phone:       string
  fullName:    string
  orderId:     string
  total:       number
  wilaya:      string
  itemCount:   number
}

/**
 * Sends an order confirmation message to the customer.
 * Template variables: {{1}} = name, {{2}} = order ID (short), {{3}} = total
 */
export async function notifyOrderConfirmed(order: OrderNotificationData) {
  return sendTemplateMessage(order.phone, TEMPLATE_NAMES.orderConfirmed, [
    {
      type:       'body',
      parameters: [
        { type: 'text', text: order.fullName.split(' ')[0] },
        { type: 'text', text: order.orderId.slice(0, 8).toUpperCase() },
        { type: 'text', text: `${order.total.toLocaleString('fr-DZ')} DA` },
      ],
    },
  ])
}

/**
 * Sends a shipping notification with tracking info.
 * Template variables: {{1}} = name, {{2}} = tracking number, {{3}} = provider
 */
export async function notifyOrderShipped(
  phone: string,
  fullName: string,
  trackingNumber: string,
  provider: string
) {
  return sendTemplateMessage(phone, TEMPLATE_NAMES.orderShipped, [
    {
      type:       'body',
      parameters: [
        { type: 'text', text: fullName.split(' ')[0] },
        { type: 'text', text: trackingNumber },
        { type: 'text', text: provider },
      ],
    },
  ])
}

/**
 * Sends a delivery confirmation message.
 */
export async function notifyOrderDelivered(phone: string, fullName: string) {
  return sendTemplateMessage(phone, TEMPLATE_NAMES.orderDelivered, [
    {
      type:       'body',
      parameters: [
        { type: 'text', text: fullName.split(' ')[0] },
      ],
    },
  ])
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

  const body = {
    messaging_product: 'whatsapp',
    to:               toWhatsAppNumber(phone),
    type:             'text',
    text:             { body: text },
  }

  try {
    const res = await fetch(
      `${API_BASE}/${config.phoneNumberId}/messages`,
      {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )
    const data = await res.json()
    if (!res.ok) return { success: false, error: data?.error?.message }
    return { success: true }
  } catch {
    return { success: false, error: 'network_error' }
  }
}

export function isWhatsAppConfigured(): boolean {
  return getConfig() !== null
}
