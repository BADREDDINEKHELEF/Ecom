import nodemailer from 'nodemailer'
import { logger } from '@/lib/logger'

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
  })
}

export async function sendEmailViaSmtp(to: string, subject: string, html: string): Promise<void> {
  const config = getSmtpConfig()
  if (!config) throw new Error('SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS')

  if (!transporter) {
    transporter = createTransporter(config)
  }

  await transporter.sendMail({
    from: `"StoreDz" <${config.from}>`,
    to,
    subject,
    html,
  })

  logger.info('[smtp] email sent', { to, subject })
}
