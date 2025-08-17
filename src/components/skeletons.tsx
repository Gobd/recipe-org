import { Card, CardContent } from '@/components/ui/card';

// Base skeleton component
function Skeleton({ className = '', ...props }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      {...props}
    />
  );
}

// Recipe form skeleton
export function RecipeFormSkeleton() {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Recipe name input */}
          <div>
            <Skeleton className="h-5 w-24 mb-1" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Location/Page input */}
          <div>
            <Skeleton className="h-5 w-16 mb-1" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Tags input */}
          <div>
            <Skeleton className="h-5 w-12 mb-1" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Dewey selector */}
          <div className="w-full space-y-4">
            {/* Dewey selector label and breadcrumb area */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-5 w-56" />
              </div>

              {/* Breadcrumb navigation */}
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-6 w-12 rounded" />
              </div>
            </div>

            {/* Scrollable category container - matches max-h-80 */}
            <div className="border rounded-lg max-h-80 overflow-y-auto bg-white">
              <div className="divide-y">
                {/* 6 category items to match real content */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex-1 flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-24 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3">
                  <div className="flex-1 flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-20 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3">
                  <div className="flex-1 flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-5 w-28 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3">
                  <div className="flex-1 flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-32 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3">
                  <div className="flex-1 flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-24 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3">
                  <div className="flex-1 flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-20 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checkbox section */}
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-48" />
          </div>

          {/* Button section */}
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Search bar skeleton
export function SearchBarSkeleton() {
  return (
    <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
      <div>
        <Skeleton className="h-5 w-28 mb-2" />
        <Skeleton className="h-10 w-full" />
      </div>

      <div>
        <Skeleton className="h-5 w-24 mb-2" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

// Recipe count and random button skeleton
export function RecipeHeaderSkeleton() {
  return (
    <div className="flex justify-between items-center mb-6">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-10 w-36" />
    </div>
  );
}

// Individual recipe card skeleton
export function RecipeCardSkeleton() {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {/* Recipe name */}
            <Skeleton className="h-6 w-48 mb-2" />

            {/* Recipe page */}
            <Skeleton className="h-4 w-32 mb-2" />

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-12 rounded-md" />
            </div>

            {/* Star rating */}
            <div className="flex gap-1 mb-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>

            {/* Created date */}
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Delete button */}
          <Skeleton className="h-8 w-16 ml-4" />
        </div>
      </CardContent>
    </Card>
  );
}

// Recipe list skeleton (multiple cards)
export function RecipeListSkeleton({ count = 3 }: { count?: number }) {
  // Generate stable keys that don't rely on index
  const skeletonKeys = Array.from(
    { length: count },
    (_, i) => `skeleton-${Date.now()}-${i}`,
  );

  return (
    <div className="space-y-4">
      {skeletonKeys.map((key) => (
        <RecipeCardSkeleton key={key} />
      ))}
    </div>
  );
}

// Download button skeleton
export function DownloadButtonSkeleton() {
  return (
    <div className="mt-8 text-center">
      <Skeleton className="h-10 w-56 mx-auto" />
      <Skeleton className="h-4 w-40 mx-auto mt-4" />
    </div>
  );
}
