import http from 'k6/http'
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'
import { sleep } from 'k6'
import { CONFIG, DEFAULT_HEADERS } from './config.js'

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
}

export default function () {
  const payload = JSON.stringify({
    fullName: 'Load Test Buyer',
    phone: CONFIG.testPhone,
    email: CONFIG.testEmail,
    wilaya: 'Alger',
    city: 'Alger Centre',
    address: '12 Rue Larbi Ben M\'hidi',
    paymentMethod: 'cash',
    idempotencyKey: uuidv4(),
    items: [
      {
        productId: '00000000-0000-0000-0000-000000000000', // Mock/seed product
        productName: 'Staging Test Product',
        quantity: 1,
        unitPrice: 1500,
      },
    ],
  })

  http.post(`${CONFIG.baseUrl}/api/orders`, payload, {
    headers: DEFAULT_HEADERS,
  })

  sleep(2)
}
