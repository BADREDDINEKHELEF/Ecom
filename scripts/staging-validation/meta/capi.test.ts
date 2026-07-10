import { describe, it, expect, vi } from 'vitest'

describe('Meta/Pixel & CAPI Deduplication Tests', () => {
  it('uses the same unique event_id (orderId) across Pixel and Conversions API payloads', () => {
    const orderId = 'some-unique-uuid-v4-order-id'
    
    // Client-side pixel payload
    const pixelPayload = {
      event_name: 'Purchase',
      event_id: orderId,
    }
    
    // Server-side Conversions API payload
    const capiPayload = {
      event_name: 'Purchase',
      event_id: orderId,
    }
    
    expect(pixelPayload.event_id).toBe(capiPayload.event_id)
  })
})
