export default function AdminLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
            <div className="h-7 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-gray-50 last:border-0">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-3 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-200 rounded w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
