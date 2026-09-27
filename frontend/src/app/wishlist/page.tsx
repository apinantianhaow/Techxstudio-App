'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ProductCard from '@/components/product/ProductCard';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import useWishlistStore from '@/stores/useWishlistStore';
import { useTranslation } from '@/context/LanguageContext';
import type { Product } from '@/types';

export default function WishlistPage() {
  const { favorites } = useWishlistStore();
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFavorites() {
      if (favorites.length === 0) { setLoading(false); return; }
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(((data.products || []) as Product[]).filter((p) => favorites.includes(p.id)));
      } catch { setProducts([]); }
      finally { setLoading(false); }
    }
    fetchFavorites();
  }, [favorites]);

  if (!loading && products.length === 0) {
    return (
      <div className="page-width py-24 text-center md:py-32">
        <Heart className="mx-auto h-14 w-14 text-ink-3" strokeWidth={1.25} />
        <h1 className="t-headline mt-6 text-ink">{t('wishlist.empty')}</h1>
        <p className="mt-3 text-[17px] text-ink-2">{t('wishlist.emptyDesc')}</p>
        <Link href="/" className="btn btn-primary mt-8">{t('cart.shopNow')}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-2.75rem)] bg-canvas-alt pb-20">
      <div className="page-width">
        <h1 className="t-headline pt-12 pb-8 md:pt-16">
          <span className="text-ink">{t('wishlist.title')}</span>{' '}
          <span className="text-ink-2">{favorites.length} {t('common.items')}</span>
        </h1>
        {loading ? (
          <LoadingSkeleton count={4} type="card" />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            <AnimatePresence>
              {products.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
