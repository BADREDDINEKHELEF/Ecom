'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, Product } from '@/types'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  _hasHydrated: boolean
  /** slug of the store that owns the current cart contents */
  cartStoreSlug: string | null
  /** pending add that was blocked by a store conflict — resolved by caller */
  storeConflict: { product: Product; quantity: number; selectedColor?: string; storeSlug: string } | null
  setHasHydrated: (has: boolean) => void
  /**
   * Returns true on success.
   * Returns false when the item belongs to a different store — caller must
   * read `storeConflict` and ask the user whether to clear the cart.
   */
  addItem: (product: Product, quantity?: number, selectedColor?: string, storeSlug?: string) => boolean
  /** User confirmed clearing the old store's cart to add from a new store */
  confirmStoreSwitch: () => void
  /** User cancelled — discard the pending conflict */
  cancelStoreSwitch: () => void
  removeItem: (productId: string, selectedColor?: string) => void
  updateQuantity: (productId: string, quantity: number, selectedColor?: string) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  total: () => number
  savings: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      _hasHydrated: false,
      cartStoreSlug: null,
      storeConflict: null,
      setHasHydrated: (has) => set({ _hasHydrated: has }),

      addItem: (product, quantity = 1, selectedColor, storeSlug) => {
        const state = get()

        // Detect store conflict: cart has items from a different store
        if (
          storeSlug &&
          state.cartStoreSlug &&
          state.cartStoreSlug !== storeSlug &&
          state.items.length > 0
        ) {
          set({ storeConflict: { product, quantity, selectedColor: selectedColor ?? undefined, storeSlug } })
          return false
        }

        set((s) => {
          const existing = s.items.find(
            (i) => i.product.id === product.id && i.selectedColor === selectedColor
          )
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.product.id === product.id && i.selectedColor === selectedColor
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
              isOpen: true,
              cartStoreSlug: storeSlug ?? s.cartStoreSlug,
            }
          }
          return {
            items: [...s.items, { product, quantity, selectedColor, storeSlug }],
            isOpen: true,
            cartStoreSlug: storeSlug ?? s.cartStoreSlug,
          }
        })
        return true
      },

      confirmStoreSwitch: () => {
        const conflict = get().storeConflict
        if (!conflict) return
        set({
          items: [{ product: conflict.product, quantity: conflict.quantity, selectedColor: conflict.selectedColor, storeSlug: conflict.storeSlug }],
          isOpen: true,
          cartStoreSlug: conflict.storeSlug,
          storeConflict: null,
        })
      },

      cancelStoreSwitch: () => set({ storeConflict: null }),

      removeItem: (productId, selectedColor) =>
        set((s) => ({
          items: s.items.filter(
            (i) => !(i.product.id === productId && i.selectedColor === selectedColor)
          ),
        })),

      updateQuantity: (productId, quantity, selectedColor) => {
        if (quantity <= 0) {
          get().removeItem(productId, selectedColor)
          return
        }
        set((s) => {
          const item = s.items.find(i => i.product.id === productId && i.selectedColor === selectedColor)
          const maxQty = item?.product?.stock ?? quantity
          return {
            items: s.items.map((i) =>
              i.product.id === productId && i.selectedColor === selectedColor
                ? { ...i, quantity: Math.min(quantity, maxQty) }
                : i
            ),
          }
        })
      },

      clearCart: () => set({ items: [], cartStoreSlug: null, storeConflict: null }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      total: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

      savings: () =>
        get().items.reduce((sum, i) => {
          const cp = i.product.comparePrice
          if (cp && cp > i.product.price) return sum + (cp - i.product.price) * i.quantity
          return sum
        }, 0),

      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'cart-storage',
      version: 2,
      partialize: (state) => ({ items: state.items, cartStoreSlug: state.cartStoreSlug }),
      migrate: (old: unknown) => {
        const s = old as { items?: CartItem[]; cartStoreSlug?: string } | null
        return { items: Array.isArray(s?.items) ? s.items : [], cartStoreSlug: s?.cartStoreSlug ?? null }
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
