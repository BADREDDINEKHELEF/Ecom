'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const SORT_OPTIONS = [
  { value: '', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'new', label: 'New Arrivals' },
]

export default function SortSelect() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('sort') || ''

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set('sort', value)
    else params.delete('sort')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 pr-8 focus:outline-none focus:border-indigo-400 cursor-pointer"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
