'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import FilterSortBar from '@/components/ui/FilterSortBar';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useTranslation } from '@/context/LanguageContext';
import { calcDiscountedPrice } from '@/lib/utils';
import type { Product } from '@/types';

const CATEGORY_TABS = ['all', 'phone', 'tablet', 'accessory'];

export default function CategoryPage({ params }: PageProps<'/category/[slug]'>) {
  const { slug } = use(params);
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState('all');

  const label = t(`category.${slug}`) || slug;

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?category=${slug}`);
        const data = await res.json();
        setProducts(data.products || []);
      } catch { setProducts([]); }
      finally { setLoading(false); }
    }
    fetchProducts();
  }, [slug]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      list = list.filter((p) => {
        const firstOpt = p.product_options?.[0];
        const price = calcDiscountedPrice(firstOpt?.price || p.original_price, p.sale_percent);
        return price >= min && price <= max;
      });
    }
    switch (sortBy) {
      case 'price-asc': list.sort((a, b) => (a.product_options?.[0]?.price || a.original_price) - (b.product_options?.[0]?.price || b.original_price)); break;
      case 'price-desc': list.sort((a, b) => (b.product_options?.[0]?.price || b.original_price) - (a.product_options?.[0]?.price || a.original_price)); break;
      case 'rating': list.sort((a, b) => b.rating - a.rating); break;
      case 'popular': list.sort((a, b) => (b.reviews_count ?? 0) - (a.reviews_count ?? 0)); break;
      default: break;
    }
    return list;
  }, [products, sortBy, priceRange]);

  return (
    <div className="min-h-[calc(100dvh-2.75rem)] bg-canvas-alt pb-20">
      <header className="page-width pt-10 md:pt-16">
        <h1 className="t-headline text-ink">{label}</h1>

        {/* Category tabs */}
        <nav aria-label={t('nav.categories')} className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {CATEGORY_TABS.map((c) => (
            <Link key={c} href={`/category/${c}`} className="chip"
              aria-current={c === slug ? 'page' : undefined}>
              {t(`category.${c}`)}
            </Link>
          ))}
        </nav>
      </header>

      <div className="page-width mt-6">
        <FilterSortBar
          count={loading ? undefined : filteredProducts.length}
          sortBy={sortBy}
          priceRange={priceRange}
          onSortChange={setSortBy}
          onPriceChange={setPriceRange}
        />

        <div className="mt-6">
          {loading ? (
            <LoadingSkeleton count={8} type="card" />
          ) : filteredProducts.length === 0 ? (
            <div className="py-24 text-center">
              <Search className="mx-auto mb-4 h-10 w-10 text-ink-3" strokeWidth={1.5} />
              <p className="text-[19px] font-semibold text-ink">{t('common.noResults')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {filteredProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
