import http from 'k6/http'
import { sleep } from 'k6'
import { CONFIG, DEFAULT_HEADERS } from './config.js'

export const options = {
  stages: [
    { duration: '1m', target: 30 },
    { duration: '5m', target: 30 }, // sustain load for 5 minutes (soak test)
    { duration: '1m', target: 0 },
  ],
}

export default function () {
  http.get(`${CONFIG.baseUrl}/api/products?limit=10`, {
    headers: DEFAULT_HEADERS,
  })
  sleep(1)
}
