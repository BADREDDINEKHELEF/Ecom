import nodemailer from 'nodemailer'
import dns from 'dns'
import { logger } from '@/lib/logger'
import { setTimeout as sleep } from 'timers/promises'

// Use Google/Cloudflare DNS instead of Vercel's overloaded resolver (getaddrinfo EBUSY)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (err) {
  logger.warn('[smtp] dns.setServers failed, using default resolver', { error: err instanceof Error ? err.message : String(err) })
}

function stripQuotes(s: string): string {
  return s.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST ? stripQuotes(process.env.SMTP_HOST.trim()) : undefined
  const port = process.env.SMTP_PORT ? parseInt(stripQuotes(process.env.SMTP_PORT.trim()), 10) : 587
  const user = process.env.SMTP_USER ? stripQuotes(process.env.SMTP_USER.trim()) : undefined
  const pass = process.env.SMTP_PASS ? stripQuotes(process.env.SMTP_PASS.trim()) : undefined
  const from = process.env.SMTP_FROM_EMAIL ? stripQuotes(process.env.SMTP_FROM_EMAIL.trim()) : user

  if (!host || !user || !pass) return null

  return { host, port, user, pass, from }
}

async function resolveViaDoH(hostname: string): Promise<string> {
  const providers = [
    `https://1.1.1.1/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
    `https://8.8.8.8/resolve?name=${encodeURIComponent(hostname)}&type=A`
  ]

  for (const url of providers) {
    try {
      const isCloudflare = url.includes('1.1.1.1')
      const res = await fetch(url, {
        headers: isCloudflare ? { 'Accept': 'application/dns-json' } : {},
        signal: AbortSignal.timeout(3000)
      })
      if (!res.ok) continue
      const data = await res.json()
      const answers = data.Answer
      if (answers && answers.length > 0) {
        const aRecord = answers.find((ans: { type: number; data: string }) => ans.type === 1)
        if (aRecord && aRecord.data) {
          return aRecord.data
        }
      }
    } catch (err) {
      logger.warn('[smtp] DoH lookup failed', { url, error: err instanceof Error ? err.message : String(err) })
    }
  }
  throw new Error(`DoH resolution failed for ${hostname}`)
}

// Custom DNS lookup that uses dns.resolve4 (avoids getaddrinfo EBUSY on Vercel)
// and retries on transient failures.
function createLookupWithRetry() {
  return (hostname: string, options: dns.LookupOptions, callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
    resolveViaDoH(hostname)
      .then((address) => {
        logger.info('[smtp] resolved hostname via DoH', { hostname, address })
        callback(null, address, 4)
      })
      .catch((dohErr) => {
        logger.warn('[smtp] DoH resolution failed, falling back to resolveWithRetry', { hostname, error: dohErr.message })
        resolveWithRetry(hostname)
          .then((address) => callback(null, address, 4))
          .catch((err) => {
            logger.warn('[smtp] custom resolveWithRetry failed, falling back to system dns.lookup', { hostname, error: err.message })
            dns.lookup(hostname, options, (nativeErr, address, family) => {
              callback(nativeErr, address as string, family as number)
            })
          })
      })
  }
}

async function resolveWithRetry(hostname: string, maxRetries = 3): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const addresses = await dns.promises.resolve4(hostname)
      if (addresses.length > 0) return addresses[0]
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 3000)
        logger.warn(`[smtp] dns retry ${attempt}/${maxRetries} after ${delay}ms`, { hostname, error: (err as Error).message })
        await sleep(delay)
        continue
      }
      throw err
    }
  }
  throw new Error(`DNS resolution failed for ${hostname} after ${maxRetries} attempts`)
}

function createTransporter(config: NonNullable<ReturnType<typeof getSmtpConfig>>): nodemailer.Transporter {
  const opts = {
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    lookup: createLookupWithRetry(),
  }
  return nodemailer.createTransport(opts)
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
      const isAuthError = msg.includes('EAUTH') || msg.includes('535') || msg.includes('Invalid credentials')
      if (isAuthError) {
        throw new Error(`SMTP authentication failed — check SMTP_USER and SMTP_PASS: ${msg}`)
      }
      const isDnsError = msg.includes('EBUSY') || msg.includes('getaddrinfo') || msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN')

      if (attempt < maxRetries && isDnsError) {
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 3000)
        logger.warn(`[smtp] retry ${attempt}/${maxRetries} after ${delay}ms`, { error: msg })
        await sleep(delay)
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

  const transporter = createTransporter(config)

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
    const code = err instanceof Error && 'code' in err ? (err as Record<string, unknown>).code as string : 'unknown'
    const response = err instanceof Error && 'response' in err ? (err as Record<string, unknown>).response as string : ''
    logger.error('[smtp] send failed after retries', { to, error: msg, code, response })
    console.error('[smtp] FULL ERROR:', err)
    throw new Error(`SMTP ${code}: ${msg}`)
  }
}
