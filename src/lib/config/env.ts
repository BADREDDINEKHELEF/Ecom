/**
 * Startup environment validator.
 * Call validateEnv() once at server start to catch misconfiguration early
 * rather than failing silently at runtime deep inside a request handler.
 *
 * Usage: import and call in src/instrumentation.ts (Next.js 15 hook).
 */

// Core vars — app cannot function at all without these
const REQUIRED_ENV = {
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
    description: 'Supabase service role key — from Supabase Project Settings > API',
    isPublic: false,
  },
} as const

// Feature vars — missing values disable specific features but don't crash the app
const FEATURE_ENV = {
  ADMIN_JWT_SECRET: {
    minLength: 32,
    description: 'JWT signing secret for admin tokens — openssl rand -base64 32',
    feature: 'Admin panel login',
  },
  ADMIN_SECRET: {
    minLength: 12,
    description: 'Admin panel password',
    feature: 'Admin panel login',
  },
  FIELD_ENCRYPTION_KEY: {
    minLength: 64,
    description: '64-char hex key — node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    feature: 'Vendor delivery API token encryption',
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
  NEXT_PUBLIC_APP_URL:      'Your production URL (e.g. https://storedz.dz) — used in payment callback URLs',
  ADMIN_IP_ALLOWLIST:       'Comma-separated IP addresses allowed to access /admin (optional hardening)',
  ADMIN_TOTP_SECRET:        '2FA TOTP secret — generate with the /admin/totp setup page',
}

const PLACEHOLDERS = ['your_', 'CHANGE_ME', 'placeholder', 'xxx', 'example', 'changeme']

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  if (typeof process === 'undefined') return { valid: true, errors: [], warnings: [] }

  const errors:   string[] = []
  const warnings: string[] = []

  // Core vars — must be present for the app to work at all
  for (const [key, config] of Object.entries(REQUIRED_ENV)) {
    const val = process.env[key]
    if (!val) {
      errors.push(`❌ Missing: ${key} — ${config.description}`)
      continue
    }
    if (val.length < config.minLength) {
      errors.push(`❌ ${key} too short (${val.length} chars, need ${config.minLength})`)
    }
    if (PLACEHOLDERS.some((p) => val.toLowerCase().includes(p))) {
      errors.push(`❌ ${key} still has a placeholder value`)
    }
  }

  // Feature vars — log warnings when absent so the developer knows what's disabled
  for (const [key, config] of Object.entries(FEATURE_ENV)) {
    const val = process.env[key]
    if (!val || val.length < config.minLength) {
      warnings.push(`⚠️  ${key} not set — ${config.feature} will be unavailable`)
    } else if (PLACEHOLDERS.some((p) => val.toLowerCase().includes(p))) {
      warnings.push(`⚠️  ${key} looks like a placeholder — ${config.feature} may not work`)
    }
  }

  if (!process.env.UPSTASH_REDIS_REST_URL) {
    warnings.push('⚠️  UPSTASH_REDIS_REST_URL not set — rate limiting uses in-memory fallback')
  }
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
    warnings.push('⚠️  WHATSAPP_PHONE_NUMBER_ID not set — WhatsApp order notifications disabled')
  }
  if (!process.env.SATIM_API_URL) {
    warnings.push('⚠️  SATIM_API_URL not set — online card payments (CIB/Edahabia) disabled')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Logs env-var problems at startup. Never crashes the app — missing feature vars
 * disable specific features but should not bring down the server.
 */
export function assertEnv(): void {
  const { valid, errors, warnings } = validateEnv()

  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('\n🟡 StoreDz — Some features are disabled (env vars not set):')
    warnings.forEach((w) => console.warn('  ' + w))
    console.warn('')
  }

  if (!valid) {
    console.error('\n🚨 StoreDz — Critical env vars missing (app may not work correctly):')
    errors.forEach((e) => console.error('  ' + e))
    console.error('  → Add these in Vercel Dashboard > Settings > Environment Variables\n')
    // Never process.exit() — let the app start and fail gracefully per-request
    // so a single missing var doesn't take down the whole deployment.
  }
}

// Re-export optional env list for documentation tooling
export { OPTIONAL_ENV }
