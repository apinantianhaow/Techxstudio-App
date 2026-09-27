'use client';

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductVisual from '@/components/product/ProductVisual';
import { formatPrice, calcDiscountedPrice } from '@/lib/utils';
import { useTranslation } from '@/context/LanguageContext';
import type { Product } from '@/types';

const QUICK_LINKS = [
  { href: '/category/phone', key: 'category.phone' },
  { href: '/category/tablet', key: 'category.tablet' },
  { href: '/category/accessory', key: 'category.accessory' },
  { href: '/category/all', key: 'category.all' },
];

export default function SearchOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    setQuery('');
    setResults([]);
  }, [isOpen, onClose]);

  const searchProducts = useCallback(async (q: string) => {
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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchProducts(value), 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[var(--z-overlay)] bg-black/30 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.28, 0.11, 0.32, 1] }}
            className="fixed inset-x-0 top-0 z-[var(--z-modal)] max-h-[85vh] overflow-y-auto bg-canvas shadow-float"
          >
            <div className="mx-auto max-w-[680px] px-6 pt-12 pb-12 md:pt-16">
              <div className="flex items-center gap-3">
                <Search className="h-6 w-6 flex-shrink-0 text-ink-3" strokeWidth={1.75} />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={handleChange}
                  placeholder={t('search.placeholder')}
                  className="w-full bg-transparent text-[24px] font-semibold tracking-tight text-ink
                    placeholder:text-ink-3 focus:outline-none focus-visible:shadow-none"
                />
                {loading && <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-ink-3" />}
                <button onClick={onClose} className="icon-btn flex-shrink-0" aria-label={t('common.close')}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              {query.length < 2 && (
                <div className="mt-8">
                  <p className="text-[12px] text-ink-2">{t('search.quickLinks')}</p>
                  <ul className="mt-3 space-y-1">
                    {QUICK_LINKS.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} onClick={onClose}
                          className="flex items-center gap-2.5 rounded-lg py-1.5 text-[15px] font-semibold text-ink hover:text-link">
                          <ArrowRight className="h-4 w-4 text-ink-3" />
                          {t(l.key)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.length > 0 && (
                <ul className="mt-6 divide-y divide-hairline">
                  {results.map((product) => {
                    const price = calcDiscountedPrice(product.original_price, product.sale_percent);
                    return (
                      <li key={product.id}>
                        <Link href={`/product/${product.id}`} onClick={onClose}
                          className="flex items-center gap-4 py-3 transition-opacity hover:opacity-70">
                          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-canvas-alt p-2">
                            <ProductVisual product={product} className="h-full w-full" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-semibold text-ink">{product.name}</span>
                            <span className="mt-0.5 block text-[13px] text-ink-2">
                              {formatPrice(price)}
                              {product.sale_percent > 0 && (
                                <span className="ml-2 text-ink-3 line-through">{formatPrice(product.original_price)}</span>
                              )}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              {query.length >= 2 && !loading && results.length === 0 && (
                <p className="py-10 text-center text-ink-2">{t('search.noResults')}</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
