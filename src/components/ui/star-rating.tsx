import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating?: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({
  rating = 0,
  onRatingChange,
  readonly = false,
  size = 'md',
}: StarRatingProps) {
  const sizeClasses = {
    lg: 'w-6 h-6',
    md: 'w-5 h-5',
    sm: 'w-4 h-4',
  };

  const handleStarClick = (event: React.MouseEvent, starValue: number) => {
    if (readonly || !onRatingChange) return;
    event.preventDefault();
    event.stopPropagation();
    onRatingChange(starValue);
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((starValue) => (
        <button
          key={starValue}
          type="button"
          onClick={(e) => handleStarClick(e, starValue)}
          disabled={readonly}
          className={cn(
            'transition-colors',
            readonly
              ? 'cursor-default'
              : 'cursor-pointer hover:scale-110 transition-transform',
            !readonly && 'hover:text-yellow-400',
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              starValue <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-none text-gray-300',
            )}
          />
        </button>
      ))}
      {readonly && rating > 0 && (
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      )}
    </div>
  );
}
