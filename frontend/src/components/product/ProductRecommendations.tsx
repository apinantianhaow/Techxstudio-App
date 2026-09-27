'use client';

import { useState, useEffect } from 'react';
import ProductShelf from '@/components/product/ProductShelf';
import { useTranslation } from '@/context/LanguageContext';
import type { Product } from '@/types';

interface ProductRecommendationsProps {
  category?: string;
  currentProductId: string;
}

export default function ProductRecommendations({ category, currentProductId }: ProductRecommendationsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch(`/api/products?category=${category}`);
        const data = await res.json();
        setProducts(
          ((data.products || []) as Product[])
            .filter((p) => p.id !== currentProductId)
            .slice(0, 8)
        );
      } catch {}
    }
    if (category) fetchRecommendations();
  }, [category, currentProductId]);

  if (products.length === 0) return null;

  return (
    <div className="mt-20 bg-canvas-alt pb-6">
      <ProductShelf title={t('product.youMayLike')} products={products} />
    </div>
  );
}
