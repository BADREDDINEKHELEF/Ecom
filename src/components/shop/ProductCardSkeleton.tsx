export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse" aria-hidden="true">
      <div className="bg-gray-200" style={{ aspectRatio: '4/3' }} />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-3.5 bg-gray-200 rounded-sm" />
          <div className="w-3.5 h-3.5 bg-gray-200 rounded-sm" />
          <div className="w-3.5 h-3.5 bg-gray-200 rounded-sm" />
          <div className="w-3.5 h-3.5 bg-gray-200 rounded-sm" />
          <div className="w-3.5 h-3.5 bg-gray-200 rounded-sm" />
          <div className="h-3 bg-gray-200 rounded w-8 ml-1" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-[90%]" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-5 bg-gray-200 rounded w-20" />
          <div className="w-9 h-9 bg-gray-200 rounded-xl" />
        </div>
        <div className="h-10 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}
