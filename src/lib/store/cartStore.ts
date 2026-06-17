'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, Product } from '@/types'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (product: Product, quantity?: number, selectedColor?: string) => void
  removeItem: (productId: string, selectedColor?: string) => void
  updateQuantity: (productId: string, quantity: number, selectedColor?: string) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, quantity = 1, selectedColor) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.product.id === product.id && i.selectedColor === selectedColor
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id && i.selectedColor === selectedColor
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
              isOpen: true,
            }
          }
          return { items: [...state.items, { product, quantity, selectedColor }], isOpen: true }
        })
      },

      removeItem: (productId, selectedColor) =>
        set((state) => ({
          items: state.items.filter((i) =>
            !(i.product.id === productId && i.selectedColor === selectedColor)
          ),
        })),

      updateQuantity: (productId, quantity, selectedColor) => {
        if (quantity <= 0) {
          get().removeItem(productId, selectedColor)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId && i.selectedColor === selectedColor
              ? { ...i, quantity }
              : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      total: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'cart-storage' }
  )
)
