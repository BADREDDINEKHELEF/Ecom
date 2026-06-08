/**
 * Startup environment validator.
 * Call validateEnv() once at server start to catch misconfiguration early
 * rather than failing silently at runtime deep inside a request handler.
 *
 * Usage: import and call in src/instrumentation.ts (Next.js 15 hook).
 */

const REQUIRED_ENV = {
  // ── Supabase ──────────────────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: {
    minLength: 10,
    description: 'Supabase project URL — from Project Settings > API',
    isPublic: true,
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    minLength: 20,
    description: 'Supabase anon key — safe to expose to the browser',
    isPublic: true,
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    minLength: 20,
    description: 'Supabase service role key — NEVER expose to the client. Used only in server-side admin operations.',
    isPublic: false,
  },

  // ── JWT / Admin ───────────────────────────────────────────────────────
  ADMIN_JWT_SECRET: {
    minLength: 32,
    description: 'JWT signing secret for admin tokens — generate with: openssl rand -base64 32',
    isPublic: false,
  },
  ADMIN_SECRET: {
    minLength: 12,
    description: 'Admin panel password — use a strong random value',
    isPublic: false,
  },

  // ── Encryption ────────────────────────────────────────────────────────
  FIELD_ENCRYPTION_KEY: {
    minLength: 64,
    description: '64-char hex key for AES-256-GCM field encryption — generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    isPublic: false,
  },
} as const

const OPTIONAL_ENV = {
  // ── Payment ───────────────────────────────────────────────────────────
  SATIM_MERCHANT_ID:        'Satim CIB/Edahabia merchant ID',
  SATIM_TERMINAL_ID:        'Satim terminal ID',
  SATIM_MERCHANT_PASSWORD:  'Satim merchant password',
  SATIM_API_URL:            'Satim API base URL (e.g. https://satim.dz/payment/rest)',

  // ── Rate Limiting (Upstash Redis) ─────────────────────────────────────
  UPSTASH_REDIS_REST_URL:   'Upstash Redis REST URL — from upstash.com dashboard',
  UPSTASH_REDIS_REST_TOKEN: 'Upstash Redis REST token — from upstash.com dashboard',

  // ── WhatsApp ──────────────────────────────────────────────────────────
  WHATSAPP_PHONE_NUMBER_ID: 'WhatsApp Business Phone Number ID — from Meta Business Manager',
  WHATSAPP_ACCESS_TOKEN:    'WhatsApp permanent system user token — from Meta Business Manager',

  // ── App ───────────────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL:      'Your production URL (e.g. https://shopdz.dz) — used in payment callback URLs',
  ADMIN_IP_ALLOWLIST:       'Comma-separated IP addresses allowed to access /admin (optional hardening)',
  ADMIN_TOTP_SECRET:        '2FA TOTP secret — generate with the /admin/totp setup page',
}

const PLACEHOLDERS = ['your_', 'CHANGE_ME', 'placeholder', 'xxx', 'example', 'changeme']

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  if (typeof process === 'undefined') return { valid: true, errors: [], warnings: [] }

  const errors:   string[] = []
  const warnings: string[] = []

  for (const [key, config] of Object.entries(REQUIRED_ENV)) {
    const val = process.env[key]

    if (!val) {
      errors.push(`❌ Missing required env var: ${key}\n   → ${config.description}`)
      continue
    }

    if (val.length < config.minLength) {
      errors.push(`❌ ${key} is too short (${val.length} chars, min ${config.minLength})\n   → ${config.description}`)
    }

    if (PLACEHOLDERS.some((p) => val.toLowerCase().includes(p))) {
      errors.push(`❌ ${key} still contains a placeholder value — replace with a real value`)
    }

    if (!config.isPublic && (key.startsWith('NEXT_PUBLIC_') === false)) {
      // Good — server-only var, not exposed to client
    }
  }

  // Warn about optional but recommended vars
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    warnings.push('⚠️  UPSTASH_REDIS_REST_URL not set — rate limiting will use in-memory fallback (not safe on multi-instance deploys)')
  }
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
    warnings.push('⚠️  WHATSAPP_PHONE_NUMBER_ID not set — order WhatsApp notifications will be skipped')
  }
  if (!process.env.SATIM_API_URL) {
    warnings.push('⚠️  SATIM_API_URL not set — online card payments (CIB/Edahabia) will be unavailable')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Throws on startup if required env vars are missing.
 * Call from instrumentation.ts for fail-fast server startup.
 */
export function assertEnv(): void {
  const { valid, errors, warnings } = validateEnv()

  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('\n🟡 ShopDZ — Optional env vars not set:')
    warnings.forEach((w) => console.warn(w))
  }

  if (!valid) {
    console.error('\n🚨 ShopDZ STARTUP FAILED — Missing required environment variables:\n')
    errors.forEach((e) => console.error(e))
    console.error('\nSee .env.local.example for setup instructions.\n')
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}

// Re-export optional env list for documentation tooling
export { OPTIONAL_ENV }
