import { logger } from '@/lib/logger'
import { sendEmailViaSmtp } from './smtp'

const RESEND_API = 'https://api.resend.com/emails'

function esc(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function getFromAddress(): string {
  const raw = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  if (raw.includes('<') && raw.includes('>')) return raw
  const display = process.env.RESEND_FROM_NAME || 'StoreDz'
  return `${display} <${raw}>`
}

function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim()
  )
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  // Prefer SMTP (no domain required — works with Gmail App Passwords)
  if (isSmtpConfigured()) {
    await sendEmailViaSmtp(to, subject, html)
    return
  }

  // Fallback: Resend (requires verified domain in production)
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('No email provider configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS or RESEND_API_KEY.')

  const from = getFromAddress()
  const body = JSON.stringify({ from, to: [to], subject, html })

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body,
  })
  if (!res.ok) {
    let text = ''
    try { text = await res.text() } catch { /* ignore */ }
    let detail = text
    try { const j = JSON.parse(text); detail = j.message || j.error || text } catch { /* plain text */ }
    throw new Error(`Resend ${res.status}: ${detail}`)
  }
}

export async function sendPasswordResetEmail(opts: {
  to: string
  resetLink: string
}): Promise<void> {
  if (!opts.resetLink.startsWith('https://')) {
    logger.error('[email] sendPasswordResetEmail: resetLink must start with https://')
    throw new Error('resetLink must start with https://')
  }
  await sendEmail(
    opts.to,
    'Réinitialisation de votre mot de passe StoreDz',
    `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#fff">
      <div style="text-align:center;margin-bottom:32px">
        <div style="display:inline-block;background:#059669;border-radius:12px;padding:12px 20px">
          <span style="color:#fff;font-size:20px;font-weight:900">StoreDz</span>
        </div>
      </div>
      <h2 style="color:#111827;font-size:22px;margin:0 0 8px">Réinitialiser votre mot de passe</h2>
      <p style="color:#6b7280;margin:0 0 24px">Vous avez demandé à réinitialiser votre mot de passe vendeur. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${opts.resetLink}"
           style="display:inline-block;background:#059669;color:#ffffff;font-weight:700;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none">
          Réinitialiser mon mot de passe
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:24px 0 0">Ce lien expire dans 1 heure. Si vous n'avez pas demandé de réinitialisation, ignorez cet e-mail — votre compte est en sécurité.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="color:#d1d5db;font-size:11px;text-align:center;margin:0">StoreDz — La marketplace algérienne</p>
    </div>
    `,
  )
}

export async function sendOrderConfirmationEmail(opts: {
  to: string
  fullName: string
  orderId: string
  total: number
  wilaya: string
  itemCount: number
  isStopDesk?: boolean
  stopDeskCause?: string | null
}): Promise<void> {
  try {
    await sendEmail(
      opts.to,
      `Votre commande StoreDz #${opts.orderId.slice(0, 8).toUpperCase()} est confirmée`,
      `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
        <h2 style="color:#059669">Commande confirmée !</h2>
        <p>Bonjour <strong>${esc(opts.fullName)}</strong>,</p>
        <p>Votre commande de <strong>${opts.itemCount} article(s)</strong> a bien été reçue.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="color:#6b7280;padding:4px 0">Numéro de commande</td><td><strong>#${opts.orderId.slice(0, 8).toUpperCase()}</strong></td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">Wilaya</td><td><strong>${esc(opts.wilaya)}</strong></td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">Mode de livraison</td><td><strong>${opts.isStopDesk ? 'Point Relais (Stop Desk)' : 'Livraison à domicile'}</strong></td></tr>
          ${opts.isStopDesk && opts.stopDeskCause ? `<tr><td style="color:#6b7280;padding:4px 0">Motif</td><td><strong>${esc(opts.stopDeskCause)}</strong></td></tr>` : ''}
          <tr><td style="color:#6b7280;padding:4px 0">Total</td><td><strong>${opts.total.toLocaleString('fr-DZ')} DA</strong></td></tr>
        </table>
        <p>Vous recevrez une notification dès que votre commande est expédiée.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">StoreDz — La marketplace algérienne</p>
      </div>
      `,
    )
  } catch (err) {
    logger.error('[email] sendOrderConfirmationEmail failed', { error: err instanceof Error ? err.message : String(err) })
  }
}

export async function sendShippingUpdateEmail(opts: {
  to: string
  fullName: string
  orderId: string
  trackingNumber?: string
  provider?: string
}): Promise<void> {
  try {
    await sendEmail(
      opts.to,
      `Votre commande StoreDz #${opts.orderId.slice(0, 8).toUpperCase()} est en route`,
      `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
        <h2 style="color:#4f46e5">Votre commande est expédiée !</h2>
        <p>Bonjour <strong>${esc(opts.fullName)}</strong>,</p>
        <p>Bonne nouvelle ! Votre commande <strong>#${opts.orderId.slice(0, 8).toUpperCase()}</strong> est en cours de livraison.</p>
        ${opts.trackingNumber ? `<p>Numéro de suivi : <strong>${esc(opts.trackingNumber)}</strong> (${esc(opts.provider ?? '')})</p>` : ''}
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">StoreDz — La marketplace algérienne</p>
      </div>
      `,
    )
  } catch (err) {
    logger.error('[email] sendShippingUpdateEmail failed', { error: err instanceof Error ? err.message : String(err) })
  }
}

export async function sendOrderPendingPaymentEmail(opts: {
  to: string
  fullName: string
  orderId: string
  total: number
  wilaya: string
  itemCount: number
  isStopDesk?: boolean
}): Promise<void> {
  try {
    await sendEmail(
      opts.to,
      `StoreDz — Commande #${opts.orderId.slice(0, 8).toUpperCase()} reçue, en attente de paiement`,
      `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
        <h2 style="color:#f59e0b">Commande reçue — en attente de paiement</h2>
        <p>Bonjour <strong>${esc(opts.fullName)}</strong>,</p>
        <p>Votre commande de <strong>${opts.itemCount} article(s)</strong> a bien été enregistrée et est en attente de validation du paiement.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="color:#6b7280;padding:4px 0">Numéro de commande</td><td><strong>#${opts.orderId.slice(0, 8).toUpperCase()}</strong></td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">Wilaya</td><td><strong>${esc(opts.wilaya)}</strong></td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">Mode de livraison</td><td><strong>${opts.isStopDesk ? 'Point Relais (Stop Desk)' : 'Livraison à domicile'}</strong></td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">Montant</td><td><strong>${opts.total.toLocaleString('fr-DZ')} DA</strong></td></tr>
        </table>
        <p style="color:#6b7280">Votre commande sera confirmée dès que le paiement aura été validé. Si le paiement n'aboutit pas, votre commande sera automatiquement annulée.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">StoreDz — La marketplace algérienne</p>
      </div>
      `,
    )
  } catch (err) {
    logger.error('[email] sendOrderPendingPaymentEmail failed', { error: err instanceof Error ? err.message : String(err) })
  }
}

export async function sendAbandonedCartEmail(opts: {
  to: string
  name: string
  cartTotal: number
}): Promise<void> {
  try {
    await sendEmail(
      opts.to,
      'Vous avez oublié quelque chose sur StoreDz',
      `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
        <h2 style="color:#f59e0b">Votre panier vous attend !</h2>
        <p>Bonjour ${opts.name ? `<strong>${esc(opts.name)}</strong>` : ''},</p>
        <p>Vous avez laissé des articles dans votre panier pour un total de <strong>${opts.cartTotal.toLocaleString('fr-DZ')} DA</strong>.</p>
        <a href="${esc(process.env.NEXT_PUBLIC_APP_URL ?? 'https://storedz.dz')}/checkout" style="display:inline-block;margin-top:16px;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Finaliser ma commande</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">StoreDz — La marketplace algérienne</p>
      </div>
      `,
    )
  } catch (err) {
    logger.error('[email] sendAbandonedCartEmail failed', { error: err instanceof Error ? err.message : String(err) })
  }
}
