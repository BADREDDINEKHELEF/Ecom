'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/types'

const MAX_COMPARE = 3

interface CompareStore {
  items: Product[]
  add: (product: Product) => void
  remove: (productId: string) => void
  toggle: (product: Product) => void
  has: (productId: string) => boolean
  clear: () => void
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (product) => {
        const { items } = get()
        if (items.length >= MAX_COMPARE || items.some((p) => p.id === product.id)) return
        set({ items: [...items, product] })
      },
      remove: (productId) =>
        set({ items: get().items.filter((p) => p.id !== productId) }),
      toggle: (product) => {
        const { items, add, remove } = get()
        if (items.some((p) => p.id === product.id)) remove(product.id)
        else add(product)
      },
      has: (productId) => get().items.some((p) => p.id === productId),
      clear: () => set({ items: [] }),
    }),
    { name: 'compare-storage' }
  )
)
