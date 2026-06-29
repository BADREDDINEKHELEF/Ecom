import { logger } from '@/lib/logger'

export interface DeliveryFetchOptions extends RequestInit {
  maxRetries?: number
  initialDelayMs?: number
  backoffFactor?: number
}

/**
 * Centrally managed fetch with support for timeouts and exponential backoff.
 * Retries transient errors (5xx, Network/Timeout errors) up to maxRetries times.
 */
export async function deliveryFetch(
  url: string,
  options: DeliveryFetchOptions = {},
  timeoutMs = 15000
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3
  const initialDelayMs = options.initialDelayMs ?? 1000
  const backoffFactor = options.backoffFactor ?? 2

  let attempt = 0
  let delay = initialDelayMs

  while (true) {
    attempt++
    const controller = new AbortController()

    // Always time out via our controller. If caller supplied a signal, forward
    // its abort into our controller so both sources of cancellation work.
    let externalAbortHandler: (() => void) | undefined
    if (options.signal) {
      externalAbortHandler = () => controller.abort()
      options.signal.addEventListener('abort', externalAbortHandler, { once: true })
    }
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      if (externalAbortHandler) options.signal!.removeEventListener('abort', externalAbortHandler)

      // If transient 5xx error, retry
      if (response.status >= 500 && attempt < maxRetries) {
        logger.warn(`[deliveryFetch] attempt ${attempt} failed with status ${response.status} for URL: ${url}. Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= backoffFactor
        continue
      }

      return response
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      if (externalAbortHandler) options.signal!.removeEventListener('abort', externalAbortHandler)

      const error = err instanceof Error ? err : new Error(String(err))
      const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('aborted')
      
      if (attempt < maxRetries) {
        logger.warn(`[deliveryFetch] attempt ${attempt} failed with error: ${error.message} for URL: ${url}. Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= backoffFactor
        continue
      }

      if (isTimeout) {
        logger.error(`[deliveryFetch] request timed out after ${timeoutMs}ms for URL: ${url}`)
        throw new Error(`Connection timeout after ${timeoutMs}ms`)
      }

      logger.error(`[deliveryFetch] request failed after ${attempt} attempts for URL: ${url}`, { error: error.message })
      throw err
    }
  }
}
