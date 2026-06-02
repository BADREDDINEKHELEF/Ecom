'use client'

import Link from 'next/link'
import { User, Package, Heart, MapPin, Lock, ChevronRight, LogOut, Edit3 } from 'lucide-react'

const MOCK_USER = {
  name: 'Mohammed Amiri',
  email: 'mohammed@example.com',
  phone: '0555 001 234',
  wilaya: 'Alger',
  joinDate: 'December 2024',
  ordersCount: 5,
  wishlistCount: 8,
}

const QUICK_LINKS = [
  { href: '/orders', icon: Package, label: 'My Orders', desc: `${MOCK_USER.ordersCount} orders placed`, color: 'text-indigo-600 bg-indigo-50' },
  { href: '/wishlist', icon: Heart, label: 'Wishlist', desc: `${MOCK_USER.wishlistCount} saved items`, color: 'text-red-500 bg-red-50' },
  { href: '#', icon: MapPin, label: 'Saved Addresses', desc: '1 address saved', color: 'text-emerald-600 bg-emerald-50' },
  { href: '#', icon: Lock, label: 'Security', desc: 'Password & 2FA', color: 'text-amber-600 bg-amber-50' },
]

export default function ProfilePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black">
            {MOCK_USER.name[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black">{MOCK_USER.name}</h1>
            <p className="text-indigo-200 text-sm">{MOCK_USER.email}</p>
            <p className="text-indigo-300 text-xs mt-0.5">Member since {MOCK_USER.joinDate}</p>
          </div>
          <button className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors">
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" /> Personal Information
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Full Name', value: MOCK_USER.name },
            { label: 'Email', value: MOCK_USER.email },
            { label: 'Phone', value: MOCK_USER.phone },
            { label: 'Wilaya', value: MOCK_USER.wilaya },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-semibold text-gray-900">{value}</span>
            </div>
          ))}
        </div>
        <button className="mt-4 w-full text-center text-sm text-indigo-600 font-semibold py-2.5 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors">
          Edit Profile
        </button>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <h2 className="font-bold text-gray-900 px-5 pt-5 pb-3">Account</h2>
        {QUICK_LINKS.map(({ href, icon: Icon, label, desc, color }, i) => (
          <Link
            key={href + i}
            href={href}
            className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors border-t border-gray-50 first:border-0"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Orders', value: MOCK_USER.ordersCount },
          { label: 'Wishlist', value: MOCK_USER.wishlistCount },
          { label: 'Reviews', value: 3 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Sign Out */}
      <Link
        href="/auth"
        className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border border-red-200 text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-colors shadow-sm"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </Link>
    </div>
  )
}
