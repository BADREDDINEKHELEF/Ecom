import http from 'k6/http'
import { sleep } from 'k6'
import { CONFIG, DEFAULT_HEADERS } from './config.js'

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 }, // stress point
    { duration: '30s', target: 150 }, // max stress
    { duration: '1m', target: 150 },
    { duration: '30s', target: 0 },
  ],
}

export default function () {
  http.get(`${CONFIG.baseUrl}/api/products?limit=10`, {
    headers: DEFAULT_HEADERS,
  })
  sleep(1)
}
