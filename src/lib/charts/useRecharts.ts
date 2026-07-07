'use client'

import { use } from 'react'

const rechartsPromise = import('./recharts')

export function useRecharts() {
  return use(rechartsPromise) as typeof import('recharts')
}
