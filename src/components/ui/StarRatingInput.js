'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StarRatingInput({ value = 0, onChange, size = 'md' }) {
  const [hovered, setHovered] = useState(0);

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const starSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          whileTap={{ scale: 1.3 }}
          whileHover={{ scale: 1.15 }}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange?.(star)}
          className="focus:outline-none cursor-pointer"
          aria-label={`${star} stars`}
        >
          <Star
            className={`${starSize} transition-colors duration-150 ${
              star <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-surface-300 dark:text-surface-600'
            }`}
          />
        </motion.button>
      ))}
    </div>
  );
}
