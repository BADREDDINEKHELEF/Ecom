import http from 'k6/http'
import { sleep } from 'k6'
import { CONFIG, DEFAULT_HEADERS } from './config.js'

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
}

export default function () {
  // Query delivery rates
  http.get(`${CONFIG.baseUrl}/api/delivery/rates?wilaya=Alger`, {
    headers: DEFAULT_HEADERS,
  })

  sleep(2)
}
