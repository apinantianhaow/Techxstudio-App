'use client';

import { useState } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';

interface FilterSortBarProps {
  count?: number;
  sortBy: string;
  priceRange: string;
  onSortChange: (value: string) => void;
  onPriceChange: (value: string) => void;
}

export default function FilterSortBar({ count, sortBy, priceRange, onSortChange, onPriceChange }: FilterSortBarProps) {
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
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
        <p className="text-[14px] text-ink-2">
          {count !== undefined && `${count} ${t('common.items')}`}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-pressed={showFilters || priceRange !== 'all'}
            className="chip"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t('filter.filter')}
          </button>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort"
              className="chip cursor-pointer appearance-none pr-8 focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-2" />
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.28, 0.11, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <span className="mr-2 text-[14px] font-semibold text-ink">{t('filter.priceRange')}</span>
              {PRICE_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => onPriceChange(range.value)}
                  aria-pressed={priceRange === range.value}
                  className="chip"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
