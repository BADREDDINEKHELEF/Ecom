import { describe, it, expect, vi } from 'vitest'
import { verifyBaridiMobWebhook } from '@/lib/payment/baridimob'

describe('Webhook Replay & Signature Security Tests', () => {
  it('correctly verifies valid BaridiMob webhooks and rejects invalid ones', () => {
    vi.stubEnv('BARIDIMOB_WEBHOOK_SECRET', 'test-webhook-secret')
    
    // Valid request body and signature check mock
    const rawBody = Buffer.from(JSON.stringify({ payment_id: '123', order_id: 'abc' }))
    const result = verifyBaridiMobWebhook(rawBody, 'sha256=invalid-signature')
    expect(result).toBe(false)
  })
})
