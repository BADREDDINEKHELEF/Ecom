'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product } from '@/types'

interface WishlistStore {
  items: Product[]
  toggle: (product: Product) => void
  has: (productId: string) => boolean
  clear: () => void
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (product) =>
        set((state) =>
          state.items.some((i) => i.id === product.id)
            ? { items: state.items.filter((i) => i.id !== product.id) }
            : { items: [...state.items, product] }
        ),
      has: (productId) => get().items.some((i) => i.id === productId),
      clear: () => set({ items: [] }),
    }),
    { name: 'wishlist-storage' }
  )
)
