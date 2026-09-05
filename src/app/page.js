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
import { Zap, TrendingUp, Headphones, Shield, Truck, RotateCcw, CreditCard } from 'lucide-react';

/* ── Consistent wrapper for all sections ── */
const SectionWrapper = ({ children, className = '' }) => (
  <div className={`max-w-[1200px] mx-auto px-5 md:px-8 lg:px-10 ${className}`}>
    {children}
  </div>
);

export default function HomePage() {
  const [flashSale, setFlashSale]     = useState([]);
  const [popular, setPopular]         = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading]         = useState(true);
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
        setPopular(popData.products   || []);
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
    { Icon: Shield,    color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30', key: 'authentic' },
    { Icon: Truck,     color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/30',     key: 'freeShipping' },
    { Icon: RotateCcw, color: 'text-emerald-600',bg: 'bg-emerald-100 dark:bg-emerald-900/30',key: 'returns' },
    { Icon: CreditCard,color: 'text-amber-600',  bg: 'bg-amber-100 dark:bg-amber-900/30',   key: 'installment' },
  ];

  const renderSection = (title, icon, products, sectionLoading, rightEl) => (
    <section>
      <SectionWrapper>
        {/* Section heading — consistent alignment */}
        <div className="flex items-center justify-between mb-5 md:mb-6 border-b border-surface-200 dark:border-surface-700 pb-3">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="font-bold text-base md:text-lg text-surface-900 dark:text-surface-100 uppercase tracking-wide">
              {title}
            </h2>
          </div>
          {rightEl}
        </div>

        {/* Product grid */}
        {sectionLoading ? (
          <LoadingSkeleton count={4} type="card" />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-12 text-center">
            <p className="text-surface-400 text-sm">No products available</p>
          </div>
        )}
      </SectionWrapper>
    </section>
  );

  return (
    <div className="pb-24 md:pb-10">

      {/* ── Hero Banner ── */}
      <HighlightBanner />

      {/* ── Category Grid ── */}
      <ScrollReveal delay={0.05}>
        <SectionWrapper className="mt-6 md:mt-10">
          <CategoryGrid />
        </SectionWrapper>
      </ScrollReveal>

      {/* ── Flash Sale ── */}
      <ScrollReveal delay={0.1}>
        <div className="mt-10 md:mt-14">
          {renderSection(
            t('home.flashSale'),
            <Zap className="w-5 h-5 text-red-500 fill-current" />,
            flashSale,
            loading,
            <FlashSaleTimer />
          )}
        </div>
      </ScrollReveal>

      {/* ── Popular / Trending ── */}
      <ScrollReveal delay={0.15}>
        <div className="mt-10 md:mt-14">
          {renderSection(
            t('home.popular'),
            <TrendingUp className="w-5 h-5 text-violet-600" />,
            popular,
            loading
          )}
        </div>
      </ScrollReveal>

      {/* ── Accessories ── */}
      <ScrollReveal delay={0.2}>
        <div className="mt-10 md:mt-14">
          {renderSection(
            t('home.accessories'),
            <Headphones className="w-5 h-5 text-indigo-600" />,
            accessories,
            loading
          )}
        </div>
      </ScrollReveal>

      {/* ── Trust Features ── */}
      <ScrollReveal delay={0.25}>
        <SectionWrapper className="mt-12 md:mt-16 mb-4">
          <div className="glass-card">
            <div className="grid grid-cols-2 md:grid-cols-4 w-full">
              {features.map(({ Icon, color, bg, key }, i) => {
                const feat = t(`home.features.${key}`);
                return (
                  <div
                    key={key}
                    className={`flex flex-col items-center text-center p-6 md:p-8
                      ${i < features.length - 1 ? 'border-r border-surface-100 dark:border-surface-700' : ''}
                      ${i < 2 ? 'border-b md:border-b-0 border-surface-100 dark:border-surface-700' : ''}`}
                  >
                    <div className={`w-12 h-12 ${bg} flex items-center justify-center mb-3 ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-sm text-surface-800 dark:text-surface-200">{feat.title}</p>
                    <p className="text-xs text-surface-400 mt-1 leading-relaxed">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionWrapper>
      </ScrollReveal>

      <ProductQuickView
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
}
