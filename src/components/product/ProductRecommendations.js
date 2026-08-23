'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/product/ProductCard';
import ProductQuickView from '@/components/product/ProductQuickView';

export default function ProductRecommendations({ category, currentProductId }) {
  const [products, setProducts] = useState([]);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch(`/api/products?category=${category}`);
        const data = await res.json();
        setProducts(
          (data.products || [])
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
        คุณอาจชอบ
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            index={i}
            onQuickView={setQuickViewProduct}
          />
        ))}
      </div>

      <ProductQuickView
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
}
