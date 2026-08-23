'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import ProductCard from '@/components/product/ProductCard';
import ProductQuickView from '@/components/product/ProductQuickView';
import FilterSortBar from '@/components/ui/FilterSortBar';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { calcDiscountedPrice } from '@/lib/utils';

const CAT_LABELS = {
  all: 'ทั้งหมด',
  phone: 'iPhone',
  tablet: 'iPad',
  accessory: 'อุปกรณ์เสริม',
};

export default function CategoryPage({ params }) {
  const { slug } = use(params);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState('all');

  const label = CAT_LABELS[slug] || slug;

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?category=${slug}`);
        const data = await res.json();
        setProducts(data.products || []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [slug]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Price filter
    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      list = list.filter((p) => {
        const firstOpt = p.product_options?.[0];
        const price = calcDiscountedPrice(firstOpt?.price || p.original_price, p.sale_percent);
        return price >= min && price <= max;
      });
    }

    // Sort
    switch (sortBy) {
      case 'price-asc':
        list.sort((a, b) => (a.product_options?.[0]?.price || a.original_price) - (b.product_options?.[0]?.price || b.original_price));
        break;
      case 'price-desc':
        list.sort((a, b) => (b.product_options?.[0]?.price || b.original_price) - (a.product_options?.[0]?.price || a.original_price));
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        list.sort((a, b) => b.reviews_count - a.reviews_count);
        break;
      default:
        break;
    }

    return list;
  }, [products, sortBy, priceRange]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      <Breadcrumbs items={[{ label }]} />

      <h1 className="text-2xl font-bold section-title text-surface-800 dark:text-surface-200">
        {label}
      </h1>

      <FilterSortBar
        sortBy={sortBy}
        priceRange={priceRange}
        onSortChange={setSortBy}
        onPriceChange={setPriceRange}
      />

      {loading ? (
        <LoadingSkeleton count={6} type="card" />
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-surface-400 dark:text-surface-500">ไม่พบสินค้า</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
          ))}
        </div>
      )}

      <ProductQuickView
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
}
