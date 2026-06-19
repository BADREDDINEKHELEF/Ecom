import { logger } from '@/lib/logger'

const RESEND_API = 'https://api.resend.com/emails'
const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) return // Degrade gracefully when key is not set

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${text}`)
  }
}

export async function sendPasswordResetEmail(opts: {
  to: string
  resetLink: string
}): Promise<void> {
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
}): Promise<void> {
  try {
    await sendEmail(
      opts.to,
      `Votre commande StoreDz #${opts.orderId.slice(0, 8).toUpperCase()} est confirmée`,
      `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
        <h2 style="color:#059669">Commande confirmée !</h2>
        <p>Bonjour <strong>${opts.fullName}</strong>,</p>
        <p>Votre commande de <strong>${opts.itemCount} article(s)</strong> a bien été reçue.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="color:#6b7280;padding:4px 0">Numéro de commande</td><td><strong>#${opts.orderId.slice(0, 8).toUpperCase()}</strong></td></tr>
          <tr><td style="color:#6b7280;padding:4px 0">Wilaya</td><td><strong>${opts.wilaya}</strong></td></tr>
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
        <p>Bonjour <strong>${opts.fullName}</strong>,</p>
        <p>Bonne nouvelle ! Votre commande <strong>#${opts.orderId.slice(0, 8).toUpperCase()}</strong> est en cours de livraison.</p>
        ${opts.trackingNumber ? `<p>Numéro de suivi : <strong>${opts.trackingNumber}</strong> (${opts.provider ?? ''})</p>` : ''}
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">StoreDz — La marketplace algérienne</p>
      </div>
      `,
    )
  } catch (err) {
    logger.error('[email] sendShippingUpdateEmail failed', { error: err instanceof Error ? err.message : String(err) })
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
        <p>Bonjour ${opts.name ? `<strong>${opts.name}</strong>` : ''},</p>
        <p>Vous avez laissé des articles dans votre panier pour un total de <strong>${opts.cartTotal.toLocaleString('fr-DZ')} DA</strong>.</p>
        <a href="https://storedz.dz/checkout" style="display:inline-block;margin-top:16px;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Finaliser ma commande</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">StoreDz — La marketplace algérienne</p>
      </div>
      `,
    )
  } catch (err) {
    logger.error('[email] sendAbandonedCartEmail failed', { error: err instanceof Error ? err.message : String(err) })
  }
}
