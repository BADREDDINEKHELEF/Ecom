import http from 'k6/http'
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'
import { sleep } from 'k6'
import { CONFIG, DEFAULT_HEADERS } from './config.js'

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
}

export default function () {
  const payload = JSON.stringify({
    payment_id: `pay-${uuidv4()}`,
    order_id: uuidv4(),
  })

  // POST webhooks to payment callback
  http.post(`${CONFIG.baseUrl}/api/payment/callback`, payload, {
    headers: {
      ...DEFAULT_HEADERS,
      'X-BaridiMob-Signature': 'mock-signature-here',
    },
  })

  sleep(1.5)
}
