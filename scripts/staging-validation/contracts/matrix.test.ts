import { describe, it, expect } from 'vitest'
import { PaymentCheckQuerySchema, BaridiMobWebhookSchema } from '@/lib/validation/apiSchemas'

describe('API Contract Validation Tests', () => {
  it('validates Satim payment check query schemas correctly', () => {
    const valid = PaymentCheckQuerySchema.safeParse({
      orderId: '11111111-1111-1111-1111-111111111111',
      token: 'some-hmac-token-secret-validation-code',
    })
    expect(valid.success).toBe(true)

    const invalid = PaymentCheckQuerySchema.safeParse({
      orderId: 'bad-uuid',
      token: '',
    })
    expect(invalid.success).toBe(false)
  })

  it('validates BaridiMob callback webhook payload contracts correctly', () => {
    const valid = BaridiMobWebhookSchema.safeParse({
      payment_id: 'pay-12345',
      order_id: '22222222-2222-2222-2222-222222222222',
    })
    expect(valid.success).toBe(true)
  })
})
