export default function NicheLoading() {
  return (
    <div className="animate-pulse">
      {/* Banner */}
      <div className="h-48 bg-gray-300" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl p-5 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-24" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 bg-gray-100 rounded-lg" />
              ))}
            </div>
          </div>
          {/* Grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-5 bg-gray-200 rounded w-1/2 mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
