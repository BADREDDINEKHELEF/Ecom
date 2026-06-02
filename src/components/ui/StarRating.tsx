import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  reviewCount?: number
  size?: 'sm' | 'md'
  className?: string
}

export default function StarRating({ rating, reviewCount, size = 'sm', className }: StarRatingProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'fill-current',
              size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4',
              star <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'
            )}
          />
        ))}
      </div>
      {reviewCount !== undefined && (
        <span className={cn('text-gray-500', size === 'sm' ? 'text-xs' : 'text-sm')}>
          ({reviewCount})
        </span>
      )}
    </div>
  )
}
