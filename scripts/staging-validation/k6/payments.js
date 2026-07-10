import http from 'k6/http'
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'
import { sleep } from 'k6'
import { CONFIG, DEFAULT_HEADERS } from './config.js'

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 15 },
    { duration: '30s', target: 0 },
  ],
}

export default function () {
  const orderId = uuidv4()
  const token = 'mock-hmac-token'
  
  // Simulate order checking / status polling
  http.get(`${CONFIG.baseUrl}/api/payment/check?orderId=${orderId}&token=${token}`, {
    headers: DEFAULT_HEADERS,
  })

  sleep(1)
}
