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

  const renderProductSection = (title, icon, products, sectionLoading, rightElement) => (
    <section>
      <div className="px-6 md:px-12 lg:px-20 xl:px-28">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="font-bold text-xl md:text-2xl lg:text-3xl tracking-tight text-surface-900 dark:text-surface-100">
              {title}
            </h2>
          </div>
          {rightElement}
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-20 xl:px-28">
        {sectionLoading ? (
          <LoadingSkeleton count={4} type="card" />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
            ))}
          </div>
        ) : (
          <div className="border border-surface-200 dark:border-surface-800 p-12 md:p-16 text-center">
            <p className="text-surface-400 text-sm md:text-base tracking-wide">No products available</p>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="pb-16 md:pb-24">
      {/* Hero Banner */}
      <ScrollReveal>
        <div className="pt-8 md:pt-12">
          <HighlightBanner />
        </div>
      </ScrollReveal>

      {/* Category Grid */}
      <ScrollReveal delay={0.1}>
        <div className="px-6 md:px-12 lg:px-20 xl:px-28 mt-12 md:mt-16">
          <CategoryGrid />
        </div>
      </ScrollReveal>

      {/* Flash Sale */}
      <ScrollReveal delay={0.15}>
        <div className="mt-14 md:mt-20">
          {renderProductSection(
            t('home.flashSale'),
            <Zap className="w-6 h-6 md:w-7 md:h-7 text-error fill-current" />,
            flashSale,
            loading,
            <FlashSaleTimer />
          )}
        </div>
      </ScrollReveal>

      {/* Popular */}
      <ScrollReveal delay={0.2}>
        <div className="mt-14 md:mt-20">
          {renderProductSection(
            t('home.popular'),
            <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-primary-600" />,
            popular,
            loading
          )}
        </div>
      </ScrollReveal>

      {/* Accessories */}
      <ScrollReveal delay={0.25}>
        <div className="mt-14 md:mt-20">
          {renderProductSection(
            t('home.accessories'),
            <Headphones className="w-6 h-6 md:w-7 md:h-7 text-accent-600" />,
            accessories,
            loading
          )}
        </div>
      </ScrollReveal>

      {/* Features */}
      <ScrollReveal delay={0.3}>
        <div className="px-6 md:px-12 lg:px-20 xl:px-28 mt-16 md:mt-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-surface-200 dark:bg-surface-800 border border-surface-200 dark:border-surface-800">
            {features.map((feat) => (
              <div key={feat.title} className="bg-white dark:bg-surface-950 p-8 md:p-10 text-center">
                <div className="text-3xl md:text-4xl mb-4">{feat.icon}</div>
                <p className="text-sm md:text-base font-semibold text-surface-800 dark:text-surface-200 tracking-tight">{feat.title}</p>
                <p className="text-xs md:text-sm text-surface-400 mt-2 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      <ProductQuickView product={quickViewProduct} isOpen={!!quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </div>
  );
}
