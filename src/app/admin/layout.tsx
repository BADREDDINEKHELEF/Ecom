export const dynamic = 'force-dynamic'

import AdminSidebarShell from '@/components/admin/AdminSidebarShell'
import AdminSessionRefresh from '@/components/admin/AdminSessionRefresh'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebarShell />

      {/* Main — offset on desktop, full-width on mobile with top padding for mobile bar */}
      <div className="lg:ml-64 min-h-screen pt-14 lg:pt-0">
        {children}
      </div>

      <AdminSessionRefresh />
    </div>
  )
}
