import { logger } from '../../src/lib/logger'

export async function runSmokeTest(targetUrl: string): Promise<boolean> {
  logger.info(`[SmokeTest] Starting post-deployment smoke validation on ${targetUrl}...`)

  try {
    // 1. Validate home page is reachable
    const homeRes = await fetch(targetUrl, { signal: AbortSignal.timeout(10_000) })
    if (homeRes.status !== 200) {
      logger.error(`[SmokeTest] Home page returned non-ok status: ${homeRes.status}`)
      return false
    }
    logger.info('[SmokeTest] Home page is reachable (HTTP 200)')

    // 2. Validate API routes and contract validation is responsive (should return 400 or similar on empty POST)
    const apiRes = await fetch(`${targetUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10_000),
    })

    // Expect 400 validation error or 429 rate limit (both indicate the endpoint is alive and validating)
    if (![400, 429].includes(apiRes.status)) {
      logger.error(`[SmokeTest] API Orders returned unexpected status code: ${apiRes.status}`)
      return false
    }
    logger.info(`[SmokeTest] API contract validation is responsive (HTTP ${apiRes.status})`)

    logger.info('[SmokeTest] Post-deployment smoke test successfully completed!')
    return true
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[SmokeTest] Smoke test failed with exception:', { error: msg })
    return false
  }
}
