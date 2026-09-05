'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Search, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice, calcDiscountedPrice } from '@/lib/utils';
import { useTranslation } from '@/context/LanguageContext';

export default function SearchOverlay({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  const searchProducts = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.products || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchProducts(value), 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[var(--z-overlay)] bg-black/40 backdrop-blur-sm"
          />

          {/* Search panel */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-[var(--z-modal)] glass-modal  p-4 max-h-[80vh] overflow-y-auto"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleChange}
                  placeholder={t('search.placeholder')}
                  className="w-full pl-10 pr-4 py-3  bg-surface-100 dark:bg-surface-800
                    border border-surface-200 dark:border-surface-700
                    focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
                    text-surface-900 dark:text-surface-100 placeholder:text-surface-400
                    transition-all"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500 animate-spin" />
                )}
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center 
                  bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((product) => {
                  const firstColor = product.product_colors?.[0];
                  const price = calcDiscountedPrice(product.original_price, product.sale_percent);

                  return (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      onClick={onClose}
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-3  hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                      >
                        <div className="w-14 h-14  bg-surface-100 dark:bg-surface-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {firstColor?.image_url ? (
                            <img src={firstColor.image_url} alt={product.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <div className="w-full h-full gradient-primary opacity-20 " />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-surface-800 dark:text-surface-200 truncate">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-bold gradient-text">
                              {formatPrice(price)}
                            </span>
                            {product.sale_percent > 0 && (
                              <span className="text-xs text-surface-400 line-through">
                                {formatPrice(product.original_price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {query.length >= 2 && !loading && results.length === 0 && (
              <p className="text-center text-surface-400 dark:text-surface-500 py-8">
                {t('search.noResults')}
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
