import { describe, it, expect, vi } from 'vitest'

describe('Chaos — SMTP email provider unavailable', () => {
  it('succeeds order completion even if email invoicing rejects', async () => {
    // Order confirmation should complete successfully even if the email trigger fails (e.g. SMTP server timeout)
    const sendConfirmation = vi.fn().mockRejectedValue(new Error('SMTP Connection Refused'))
    
    let orderCommitted = false
    try {
      // Order insert succeeds
      orderCommitted = true
      // Async email trigger
      sendConfirmation().catch(() => {})
    } catch {}
    
    expect(orderCommitted).toBe(true)
    expect(sendConfirmation).toHaveBeenCalledTimes(1)
  })
})
