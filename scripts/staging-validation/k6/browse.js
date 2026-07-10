import http from 'k6/http'
import { sleep } from 'k6'
import { CONFIG, DEFAULT_HEADERS } from './config.js'

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // ramp up
    { duration: '1m', target: 50 },  // sustain
    { duration: '30s', target: 0 },  // cool down
  ],
}

export default function () {
  const res = http.get(`${CONFIG.baseUrl}/api/products?page=0&limit=20`, {
    headers: DEFAULT_HEADERS,
  })
  sleep(1)
}
