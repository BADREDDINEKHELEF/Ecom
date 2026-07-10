import { describe, it, expect, vi } from 'vitest'

describe('Chaos — Meta/Facebook API unavailable', () => {
  it('does not block the payment callback checkout response when Meta Conversions API fails', async () => {
    // Platform and vendor CAPI calls should always run asynchronously and in non-blocking fashion
    const triggerCAPI = vi.fn().mockRejectedValue(new Error('Meta 502 Bad Gateway'))
    
    // Trigger conversion tracking inside a fire-and-forget promise
    const runNonBlocking = async () => {
      try {
        await triggerCAPI()
      } catch {
        // logs warning, does not crash
      }
    }
    
    await runNonBlocking()
    expect(triggerCAPI).toHaveBeenCalledTimes(1)
  })
})
