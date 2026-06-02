export default function ProductLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex gap-2 mb-8">
        {[80, 60, 100, 140].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-3 bg-gray-200 rounded w-${w === 80 ? 16 : w === 60 ? 12 : w === 100 ? 20 : 28}`} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image */}
        <div>
          <div className="aspect-square bg-gray-200 rounded-2xl" />
          <div className="flex gap-2 mt-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-20 h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
        {/* Info */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-200 rounded w-40" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
          <div className="h-14 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
