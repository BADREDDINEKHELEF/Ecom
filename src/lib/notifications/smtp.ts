import nodemailer from 'nodemailer'
import { logger } from '@/lib/logger'
import { setTimeout } from 'timers/promises'

let transporter: nodemailer.Transporter | null = null

function getSmtpConfig() {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM_EMAIL || user

  if (!host || !user || !pass) return null

  return { host, port, user, pass, from }
}

function createTransporter(config: NonNullable<ReturnType<typeof getSmtpConfig>>): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
}

async function sendWithRetry(
  transporter: nodemailer.Transporter,
  mailOptions: nodemailer.SendMailOptions,
  maxRetries = 3,
): Promise<void> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await transporter.sendMail(mailOptions)
      return
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const msg = lastError.message
      const isDnsError = msg.includes('EBUSY') || msg.includes('getaddrinfo') || msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN')

      if (attempt < maxRetries && isDnsError) {
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 3000)
        logger.warn(`[smtp] retry ${attempt}/${maxRetries} after ${delay}ms`, { error: msg })
        await setTimeout(delay)
        continue
      }
      throw lastError
    }
  }
  throw lastError || new Error('SMTP send failed after retries')
}

export async function sendEmailViaSmtp(to: string, subject: string, html: string): Promise<void> {
  const config = getSmtpConfig()
  if (!config) {
    const err = new Error('SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS')
    logger.error('[smtp] config missing', { error: err.message })
    throw err
  }

  if (!transporter) {
    transporter = createTransporter(config)
  }

  const mailOptions = {
    from: `"StoreDz" <${config.from}>`,
    to,
    subject,
    html,
  }

  try {
    await sendWithRetry(transporter, mailOptions)
    logger.info('[smtp] email sent', { to, subject })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const code = err instanceof Error && 'code' in err ? (err as any).code : 'unknown'
    const response = err instanceof Error && 'response' in err ? (err as any).response : ''
    logger.error('[smtp] send failed after retries', { to, error: msg, code, response })
    console.error('[smtp] FULL ERROR:', err)
    throw new Error(`SMTP ${code}: ${msg}`)
  }
}
