import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'
import Logo from '@/components/ui/Logo'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-950 text-gray-300 flex flex-col flex-shrink-0 fixed h-full z-20">
        <div className="p-5 border-b border-gray-800">
          <div className="mb-1">
            <Logo size="sm" dark />
          </div>
          <span className="text-xs text-gray-500 font-medium ml-10">Admin Panel</span>
        </div>

        <AdminNav />

        <div className="p-3 border-t border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors" />
            Back to Store
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 ml-60 min-h-screen">
        {children}
      </div>
    </div>
  )
}
