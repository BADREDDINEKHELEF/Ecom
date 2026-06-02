'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  initialValue?: string
}

export default function SearchInput({ initialValue = '' }: SearchInputProps) {
  const [value, setValue] = useState(initialValue)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) router.push(`/search?q=${encodeURIComponent(value.trim())}`)
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search products, categories…"
        autoFocus
        className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-400 bg-white shadow-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => { setValue(''); router.push('/search') }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  )
}
