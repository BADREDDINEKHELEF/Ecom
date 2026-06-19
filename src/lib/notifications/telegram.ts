import { logger } from '@/lib/logger'

type AlertSeverity = 'critical' | 'high' | 'medium'

const EMOJI: Record<AlertSeverity, string> = {
  critical: '🔴',
  high:     '🟡',
  medium:   '🟢',
}

/**
 * Sends a plain-text alert to a Telegram Bot.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID env vars.
 * Gracefully no-ops if either is unset.
 */
export async function sendTelegramAlert(
  message: string,
  severity: AlertSeverity = 'medium'
): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (!token || !chatId) return

  const now = new Date().toLocaleString('fr-DZ', { timeZone: 'Africa/Algiers' })
  const text = `${EMOJI[severity]} <b>StoreDz Alert</b>\n\n${message}\n\n<i>${now}</i>`

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    chatId,
        text,
        parse_mode: 'HTML',
      }),
    })
    if (!res.ok) {
      logger.error('[telegram] sendMessage failed', { status: res.status })
    }
  } catch (err) {
    logger.error('[telegram] fetch error', { error: err instanceof Error ? err.message : String(err) })
  }
}
