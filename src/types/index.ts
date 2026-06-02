export interface Niche {
  id: string
  name: string
  description: string
  emoji: string
  gradient: string
  accentColor: string
  textAccent: string
  categories: string[]
  banner: string
}

export interface Product {
  id: string
  nicheId: string
  category: string
  name: string
  description: string
  price: number
  comparePrice?: number
  images: string[]
  stock: number
  rating: number
  reviewCount: number
  tags: string[]
  isNew?: boolean
  isFeatured?: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Address {
  fullName: string
  phone: string
  address: string
  city: string
  wilaya: string
}

export interface Order {
  id: string
  items: CartItem[]
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  total: number
  shippingAddress: Address
  paymentMethod: 'cash' | 'card'
  createdAt: string
}
