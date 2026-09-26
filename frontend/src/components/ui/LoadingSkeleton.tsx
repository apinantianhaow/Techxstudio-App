'use client';

export default function LoadingSkeleton({ count = 4, type = 'card' }) {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className=" overflow-hidden bg-white dark:bg-surface-800 shadow-card"
          >
            <div className="aspect-square animate-shimmer" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 rounded animate-shimmer" />
              <div className="h-3 w-1/2 rounded animate-shimmer" />
              <div className="h-5 w-2/3 rounded animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="aspect-square max-w-md mx-auto  animate-shimmer" />
        <div className="space-y-3">
          <div className="h-8 w-3/4 rounded animate-shimmer" />
          <div className="h-4 w-1/2 rounded animate-shimmer" />
          <div className="h-6 w-1/3 rounded animate-shimmer" />
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4  bg-white dark:bg-surface-800">
            <div className="w-20 h-20  animate-shimmer flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded animate-shimmer" />
              <div className="h-3 w-1/2 rounded animate-shimmer" />
              <div className="h-4 w-1/4 rounded animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
