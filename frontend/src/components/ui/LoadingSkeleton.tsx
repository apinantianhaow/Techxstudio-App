'use client';

export default function LoadingSkeleton({ count = 4, type = 'card' }) {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card p-5 md:p-6">
            <div className="aspect-square rounded-control animate-shimmer" />
            <div className="mt-5 h-3 w-1/4 rounded-full animate-shimmer" />
            <div className="mt-3 h-5 w-3/4 rounded-full animate-shimmer" />
            <div className="mt-6 h-4 w-1/3 rounded-full animate-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className="page-width grid gap-10 py-10 md:grid-cols-[1.15fr_1fr] md:py-16">
        <div className="aspect-square rounded-card animate-shimmer" />
        <div className="space-y-4">
          <div className="h-3 w-16 rounded-full animate-shimmer" />
          <div className="h-10 w-3/4 rounded-full animate-shimmer" />
          <div className="h-5 w-1/3 rounded-full animate-shimmer" />
          <div className="h-24 rounded-control animate-shimmer" />
          <div className="h-14 rounded-control animate-shimmer" />
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card flex gap-4 p-4">
            <div className="h-20 w-20 flex-shrink-0 rounded-control animate-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded-full animate-shimmer" />
              <div className="h-3 w-1/2 rounded-full animate-shimmer" />
              <div className="h-4 w-1/4 rounded-full animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
