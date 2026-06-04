export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
      <div className="bg-gray-200" style={{ aspectRatio: '4/3' }} />
      <div className="p-4 space-y-3">
        <div className="h-2.5 bg-gray-200 rounded-full w-16" />
        <div className="h-4 bg-gray-200 rounded-full w-3/4" />
        <div className="h-3 bg-gray-200 rounded-full w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-5 bg-gray-200 rounded-full w-20" />
          <div className="w-9 h-9 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
