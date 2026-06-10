import { Users, MapPin, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const CUSTOMERS = [
  { id: 1, name: 'Mohammed Amiri', email: 'mohammed@example.com', wilaya: 'Alger', orders: 8, spent: 76400, joined: '2024-08-12' },
  { id: 2, name: 'Samira Kaci', email: 'samira@example.com', wilaya: 'Oran', orders: 5, spent: 52100, joined: '2024-09-03' },
  { id: 3, name: 'Youcef Belkadi', email: 'youcef@example.com', wilaya: 'Constantine', orders: 12, spent: 114800, joined: '2024-07-20' },
  { id: 4, name: 'Fatima Zahra', email: 'fatima@example.com', wilaya: 'Sétif', orders: 3, spent: 28900, joined: '2024-11-01' },
  { id: 5, name: 'Karim Madjid', email: 'karim@example.com', wilaya: 'Annaba', orders: 7, spent: 63500, joined: '2024-10-15' },
  { id: 6, name: 'Amina Boudour', email: 'amina@example.com', wilaya: 'Béjaïa', orders: 4, spent: 41200, joined: '2024-09-28' },
  { id: 7, name: 'Djamel Haddad', email: 'djamel@example.com', wilaya: 'Blida', orders: 2, spent: 18900, joined: '2024-12-01' },
  { id: 8, name: 'Nadia Ferhat', email: 'nadia@example.com', wilaya: 'Tizi Ouzou', orders: 9, spent: 89300, joined: '2024-08-05' },
]

export default function CustomersPage() {
  const totalCustomers = CUSTOMERS.length
  const totalRevenue = CUSTOMERS.reduce((s, c) => s + c.spent, 0)
  const avgOrderValue = Math.round(CUSTOMERS.reduce((s, c) => s + (c.spent / c.orders), 0) / totalCustomers)

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Customers</h1>
        <p className="text-gray-500 text-sm mt-1">{totalCustomers} registered customers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total Customers', value: totalCustomers.toString(), icon: Users, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Total Revenue', value: formatPrice(totalRevenue), icon: ShoppingBag, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Avg. Order Value', value: formatPrice(avgOrderValue), icon: MapPin, color: 'text-violet-600 bg-violet-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xl font-black text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Customer', 'Email', 'Wilaya', 'Orders', 'Total Spent', 'Joined'].map((h) => (
                  <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {CUSTOMERS.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-700 font-bold text-sm">{c.name[0]}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{c.email}</td>
                  <td className="px-5 py-3.5 text-gray-700">{c.wilaya}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-gray-900">{c.orders}</span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-indigo-600">{formatPrice(c.spent)}</td>
                  <td className="px-5 py-3.5 text-gray-500">{c.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
