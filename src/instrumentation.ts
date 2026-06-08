/**
 * Next.js 15 Instrumentation hook.
 * Runs once when the server starts — before any request is processed.
 * Used to validate required environment variables at startup.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnv } = await import('./lib/config/env')
    assertEnv()
  }
}
