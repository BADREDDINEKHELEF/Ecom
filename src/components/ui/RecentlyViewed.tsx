'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'

const KEY = 'storedzRecentlyViewed'
const MAX = 8

export interface RecentItem {
  id: string
  nicheId: string
  name: string
  price: number
  image: string
}

export function trackRecentlyViewed(item: RecentItem) {
  if (typeof window === 'undefined') return
  try {
    const existing: RecentItem[] = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    const filtered = existing.filter((i) => i.id !== item.id)
    const updated = [item, ...filtered].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {}
}

export default function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    try {
      const stored: RecentItem[] = JSON.parse(localStorage.getItem(KEY) ?? '[]')
      setItems(excludeId ? stored.filter((i) => i.id !== excludeId) : stored)
    } catch {}
  }, [excludeId])

  if (items.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h2 className="text-lg font-black text-gray-900 mb-4">Récemment consultés</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/${item.nicheId}/${item.id}`}
            className="flex-shrink-0 w-36 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
          >
            <div className="relative w-full aspect-square bg-gray-100">
              <Image
                src={item.image || '/placeholder.svg'}
                alt={item.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="144px"
              />
            </div>
            <div className="p-2">
              <p className="text-xs text-gray-800 font-semibold line-clamp-2 leading-tight">{item.name}</p>
              <p className="text-xs font-bold text-indigo-600 mt-1">{formatPrice(item.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
