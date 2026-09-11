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
    { Icon: Shield,    key: 'authentic' },
    { Icon: Truck,     key: 'freeShipping' },
    { Icon: RotateCcw, key: 'returns' },
    { Icon: CreditCard,key: 'installment' },
  ];

  return (
    <div className="pb-24 md:pb-10">

      {/* ── Hero Banner — full width ── */}
      <HighlightBanner />

      {/* ── Categories ── */}
      <ScrollReveal delay={0.05}>
        <section style={{ borderTop: '1px solid #e8e8ed' }}>
          <div className="w-full px-6 md:px-10 py-12 md:py-16">
            <h2 className="text-2xl md:text-3xl font-semibold text-surface-800 dark:text-surface-100
              tracking-tight text-center mb-8">
              {t('nav.categories') || 'Categories'}
            </h2>
            <CategoryGrid />
          </div>
        </section>
      </ScrollReveal>

      {/* ── Flash Sale ── */}
      <ScrollReveal delay={0.1}>
        <section style={{ borderTop: '1px solid #e8e8ed' }}>
          <div className="w-full px-6 md:px-10 py-12 md:py-16">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-error fill-current" />
                <h2 className="text-2xl md:text-3xl font-semibold text-surface-800 dark:text-surface-100 tracking-tight">
                  {t('home.flashSale')}
                </h2>
              </div>
              <FlashSaleTimer />
            </div>
            {loading ? (
              <LoadingSkeleton count={4} type="card" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
                {flashSale.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
                ))}
              </div>
            )}
          </div>
        </section>
      </ScrollReveal>

      {/* ── Trending ── */}
      <ScrollReveal delay={0.15}>
        <section style={{ borderTop: '1px solid #e8e8ed' }}>
          <div className="w-full px-6 md:px-10 py-12 md:py-16">
            <div className="flex items-center gap-2 mb-8">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              <h2 className="text-2xl md:text-3xl font-semibold text-surface-800 dark:text-surface-100 tracking-tight">
                {t('home.popular')}
              </h2>
            </div>
            {loading ? (
              <LoadingSkeleton count={4} type="card" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
                {popular.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
                ))}
              </div>
            )}
          </div>
        </section>
      </ScrollReveal>

      {/* ── Accessories ── */}
      <ScrollReveal delay={0.2}>
        <section style={{ borderTop: '1px solid #e8e8ed' }}>
          <div className="w-full px-6 md:px-10 py-12 md:py-16">
            <div className="flex items-center gap-2 mb-8">
              <Headphones className="w-5 h-5 text-surface-500" />
              <h2 className="text-2xl md:text-3xl font-semibold text-surface-800 dark:text-surface-100 tracking-tight">
                {t('home.accessories')}
              </h2>
            </div>
            {loading ? (
              <LoadingSkeleton count={4} type="card" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
                {accessories.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
                ))}
              </div>
            )}
          </div>
        </section>
      </ScrollReveal>

      {/* ── Trust Features ── */}
      <ScrollReveal delay={0.25}>
        <section style={{ borderTop: '1px solid #e8e8ed', backgroundColor: '#f5f5f7' }}>
          <div className="w-full px-6 md:px-10 py-14 md:py-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
              {features.map(({ Icon, key }) => {
                const feat = t(`home.features.${key}`);
                return (
                  <div key={key} className="text-center">
                    <Icon className="w-7 h-7 mx-auto mb-3 text-surface-400" strokeWidth={1.5} />
                    <p className="font-semibold text-sm text-surface-800">{feat.title}</p>
                    <p className="text-xs text-surface-400 mt-1.5 leading-relaxed">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ProductQuickView
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
}
