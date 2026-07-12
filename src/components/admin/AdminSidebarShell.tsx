'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, ArrowLeft } from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'
import Logo from '@/components/ui/Logo'

export default function AdminSidebarShell() {
  const [open, setOpen] = useState(false)

  // Close sidebar on Escape for keyboard/mobile users.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* Mobile top bar — visible on small screens */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-gray-950 border-b border-gray-800 flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Logo size="sm" dark />
        <span className="text-xs text-gray-500 font-medium">Admin</span>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Admin navigation"
        className={[
          'w-64 bg-gray-950 text-gray-300 flex flex-col flex-shrink-0 fixed h-full z-40 transition-transform duration-300 ease-in-out left-0 overflow-y-auto',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div>
            <Logo size="sm" dark />
            <span className="text-xs text-gray-500 font-medium block mt-1 ml-10">Admin Panel</span>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AdminNav onNavClick={() => setOpen(false)} />

        <div className="p-3 border-t border-gray-800 flex-shrink-0">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors" />
            Back to Store
          </Link>
        </div>
      </aside>
    </>
  )
}
