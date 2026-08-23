'use client';

import { Star } from 'lucide-react';

export default function StarRating({ rating = 0, reviews = 0, size = 'sm', showCount = true }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const starSize = sizeClasses[size] || sizeClasses.sm;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Star key={i} className={`${starSize} fill-amber-400 text-amber-400`} />
      );
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <div key={i} className="relative">
          <Star className={`${starSize} text-surface-300 dark:text-surface-600`} />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className={`${starSize} fill-amber-400 text-amber-400`} />
          </div>
        </div>
      );
    } else {
      stars.push(
        <Star key={i} className={`${starSize} text-surface-300 dark:text-surface-600`} />
      );
    }
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">{stars}</div>
      {showCount && (
        <span className="text-xs text-surface-500 dark:text-surface-400 ml-1">
          ({reviews.toLocaleString()})
        </span>
      )}
    </div>
  );
}
