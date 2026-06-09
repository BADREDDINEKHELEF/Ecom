/**
 * Next.js 15 Instrumentation hook.
 * Runs once when the server starts — before any request is processed.
 * Initialises Sentry and validates required environment variables.
 */
export async function register() {
  // Sentry must be the first thing initialised so it catches startup errors
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
    const { assertEnv } = await import('./lib/config/env')
    assertEnv()
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

// Re-export Sentry's handler directly — it matches Next.js's onRequestError signature
export { captureRequestError as onRequestError } from '@sentry/nextjs'
