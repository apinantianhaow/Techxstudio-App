'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/product/ProductCard';
import ProductQuickView from '@/components/product/ProductQuickView';
import { useTranslation } from '@/context/LanguageContext';
import type { Product } from '@/types';

interface ProductRecommendationsProps {
  category?: string;
  currentProductId: string;
}

export default function ProductRecommendations({ category, currentProductId }: ProductRecommendationsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch(`/api/products?category=${category}`);
        const data = await res.json();
        setProducts(
          ((data.products || []) as Product[])
            .filter((p) => p.id !== currentProductId)
            .slice(0, 4)
        );
      } catch {}
    }
    if (category) fetchRecommendations();
  }, [category, currentProductId]);

  if (products.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg section-title text-surface-800 dark:text-surface-200">
        {t('product.youMayLike')}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
        ))}
      </div>
      <ProductQuickView product={quickViewProduct} isOpen={!!quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </div>
  );
}
