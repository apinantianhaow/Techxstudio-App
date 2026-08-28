'use client';

import { useState, useEffect } from 'react';
import HighlightBanner from '@/components/home/HighlightBanner';
import FlashSaleTimer from '@/components/home/FlashSaleTimer';
import CategoryGrid from '@/components/home/CategoryGrid';
import ProductCard from '@/components/product/ProductCard';
import ProductQuickView from '@/components/product/ProductQuickView';
import ScrollReveal from '@/components/ui/ScrollReveal';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { useTranslation } from '@/context/LanguageContext';
import { Zap, TrendingUp, Headphones } from 'lucide-react';

export default function HomePage() {
  const [flashSale, setFlashSale] = useState([]);
  const [popular, setPopular] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchData() {
      try {
        const [fsRes, popRes, accRes] = await Promise.all([
          fetch('/api/products/curated/flash_sale'),
          fetch('/api/products/curated/popular'),
          fetch('/api/products/curated/accessories'),
        ]);
        const [fsData, popData, accData] = await Promise.all([
          fsRes.json(), popRes.json(), accRes.json(),
        ]);
        setFlashSale(fsData.products || []);
        setPopular(popData.products || []);
        setAccessories(accData.products || []);
      } catch (err) {
        console.error('Home fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const features = [
    { icon: '🛡️', ...t('home.features.authentic') },
    { icon: '🚚', ...t('home.features.freeShipping') },
    { icon: '🔄', ...t('home.features.returns') },
    { icon: '💳', ...t('home.features.installment') },
  ];

  return (
    <div className="space-y-8 md:space-y-12">
      {/* Hero Banner — Full Width */}
      <ScrollReveal>
        <div className="px-4 md:px-8 lg:px-12">
          <HighlightBanner />
        </div>
      </ScrollReveal>

      {/* Category Grid — Full Width */}
      <ScrollReveal delay={0.1}>
        <div className="px-4 md:px-8 lg:px-12">
          <CategoryGrid />
        </div>
      </ScrollReveal>

      {/* Flash Sale Section */}
      <ScrollReveal delay={0.15}>
        <section className="px-4 md:px-8 lg:px-12 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-error fill-current" />
              <h2 className="font-bold text-lg md:text-xl section-title text-surface-800 dark:text-surface-200">
                {t('home.flashSale')}
              </h2>
            </div>
            <FlashSaleTimer />
          </div>

          {loading ? (
            <LoadingSkeleton count={4} type="card" />
          ) : flashSale.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
              {flashSale.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 md:p-12 text-center">
              <p className="text-surface-400 text-sm">No flash sale products available</p>
            </div>
          )}
        </section>
      </ScrollReveal>

      {/* Popular Section */}
      <ScrollReveal delay={0.2}>
        <section className="px-4 md:px-8 lg:px-12 space-y-5">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
            <h2 className="font-bold text-lg md:text-xl section-title text-surface-800 dark:text-surface-200">
              {t('home.popular')}
            </h2>
          </div>

          {loading ? (
            <LoadingSkeleton count={4} type="card" />
          ) : popular.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
              {popular.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 md:p-12 text-center">
              <p className="text-surface-400 text-sm">No trending products available</p>
            </div>
          )}
        </section>
      </ScrollReveal>

      {/* Accessories Section */}
      <ScrollReveal delay={0.25}>
        <section className="px-4 md:px-8 lg:px-12 space-y-5">
          <div className="flex items-center gap-2.5">
            <Headphones className="w-5 h-5 md:w-6 md:h-6 text-accent-600" />
            <h2 className="font-bold text-lg md:text-xl section-title text-surface-800 dark:text-surface-200">
              {t('home.accessories')}
            </h2>
          </div>

          {loading ? (
            <LoadingSkeleton count={4} type="card" />
          ) : accessories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
              {accessories.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 md:p-12 text-center">
              <p className="text-surface-400 text-sm">No accessories available</p>
            </div>
          )}
        </section>
      </ScrollReveal>

      {/* Features */}
      <ScrollReveal delay={0.3}>
        <section className="px-4 md:px-8 lg:px-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 py-4 md:py-8">
          {features.map((feat) => (
            <div key={feat.title} className="glass-card p-5 md:p-6 text-center hover:shadow-card-hover transition-shadow duration-300">
              <div className="text-2xl md:text-3xl mb-2.5">{feat.icon}</div>
              <p className="text-xs md:text-sm font-bold text-surface-700 dark:text-surface-300">{feat.title}</p>
              <p className="text-[10px] md:text-xs text-surface-400 mt-1">{feat.desc}</p>
            </div>
          ))}
        </section>
      </ScrollReveal>

      <ProductQuickView product={quickViewProduct} isOpen={!!quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </div>
  );
}
