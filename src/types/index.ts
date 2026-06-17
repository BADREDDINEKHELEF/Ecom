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

export interface ColorVariant {
  name: string
  hex: string
  images: string[]
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
  imageColors?: string[]
  stock: number
  rating: number
  reviewCount: number
  tags: string[]
  isNew?: boolean
  isFeatured?: boolean
  condition?: 'new' | 'used' | 'refurbished'
  metaTitle?: string
  metaDescription?: string
  isPreOrder?: boolean
  preOrderDate?: string
  minOrderQuantity?: number
  isBundle?: boolean
  colorVariants?: ColorVariant[]
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
