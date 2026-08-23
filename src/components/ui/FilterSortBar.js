'use client';

import { useState } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';

export default function FilterSortBar({ sortBy, priceRange, onSortChange, onPriceChange }) {
  const [showFilters, setShowFilters] = useState(false);
  const { t } = useTranslation();

  const SORT_OPTIONS = [
    { value: 'newest', label: t('filter.sortNewest') },
    { value: 'price-asc', label: t('filter.sortPriceAsc') },
    { value: 'price-desc', label: t('filter.sortPriceDesc') },
    { value: 'rating', label: t('filter.sortRating') },
    { value: 'popular', label: t('filter.sortPopular') },
  ];

  const PRICE_RANGES = [
    { value: 'all', label: t('filter.allPrices') },
    { value: '0-5000', label: t('filter.under5k') },
    { value: '5000-15000', label: t('filter.range5to15') },
    { value: '15000-35000', label: t('filter.range15to35') },
    { value: '35000-999999', label: t('filter.above35k') },
  ];

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card
            text-sm font-medium hover:shadow-md transition-all duration-300
            text-surface-700 dark:text-surface-300"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t('filter.filter')}
        </button>

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="appearance-none px-4 py-2.5 pr-8 rounded-xl glass-card
              text-sm font-medium cursor-pointer hover:shadow-md transition-all
              bg-transparent text-surface-700 dark:text-surface-300
              focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="glass-card p-4 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                {t('filter.priceRange')}
              </p>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => onPriceChange(range.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                      ${
                        priceRange === range.value
                          ? 'gradient-primary text-white shadow-md'
                          : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600'
                      }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
