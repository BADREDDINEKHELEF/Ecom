import { Niche } from '@/types'

export const niches: Niche[] = [
  {
    id: 'cars',
    name: 'Auto & Cars',
    description: 'Everything your vehicle needs — parts, accessories & care',
    emoji: '🚗',
    gradient: 'from-slate-900 via-slate-800 to-zinc-800',
    accentColor: 'bg-orange-500',
    textAccent: 'text-orange-400',
    banner: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&q=80',
    categories: ['Accessories', 'Spare Parts', 'Car Care', 'Electronics', 'Tires & Wheels'],
  },
  {
    id: 'animals',
    name: 'Pets & Animals',
    description: 'Spoil your furry, feathered & finned companions',
    emoji: '🐾',
    gradient: 'from-emerald-950 via-emerald-900 to-teal-900',
    accentColor: 'bg-amber-400',
    textAccent: 'text-amber-400',
    banner: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1400&q=80',
    categories: ['Dog Supplies', 'Cat Supplies', 'Bird Supplies', 'Fish & Aquarium', 'Pet Food'],
  },
  {
    id: 'kids',
    name: 'Kids & Baby',
    description: 'Safe, fun & educational products for little ones',
    emoji: '🧸',
    gradient: 'from-purple-950 via-violet-900 to-purple-800',
    accentColor: 'bg-pink-400',
    textAccent: 'text-pink-400',
    banner: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=1400&q=80',
    categories: ['Toys & Games', 'Baby Clothing', 'Educational', 'Baby Care', 'Nursery'],
  },
  {
    id: 'deco',
    name: 'Home Decor',
    description: 'Transform your home with trending furniture & accessories',
    emoji: '🛋️',
    gradient: 'from-stone-900 via-amber-950 to-stone-800',
    accentColor: 'bg-amber-600',
    textAccent: 'text-amber-500',
    banner: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1400&q=80',
    categories: ['Meubles', 'Décoration Murale', 'Éclairage', 'Textiles', 'Rangement'],
  },
]

export const getNiche = (id: string) => niches.find((n) => n.id === id)
export const isValidNiche = (id: string) => niches.some((n) => n.id === id)
