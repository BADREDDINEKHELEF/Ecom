import http from 'k6/http'
import { sleep } from 'k6'
import { CONFIG, DEFAULT_HEADERS } from './config.js'

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '10s', target: 200 }, // sudden spike
    { duration: '30s', target: 200 }, // sustain
    { duration: '10s', target: 10 },  // sudden drop
    { duration: '10s', target: 0 },
  ],
}

export default function () {
  http.get(`${CONFIG.baseUrl}/api/products?limit=10`, {
    headers: DEFAULT_HEADERS,
  })
  sleep(0.5)
}
