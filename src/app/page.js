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

  const featureIcons = [Shield, Truck, RotateCcw, CreditCard];
  const featureKeys = ['authentic', 'freeShipping', 'returns', 'installment'];
  const featureColors = ['text-purple-500', 'text-blue-500', 'text-emerald-500', 'text-amber-500'];

  const renderProductSection = (title, icon, products, sectionLoading, rightElement) => (
    <section>
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="font-bold text-xl md:text-2xl lg:text-[28px] tracking-tight text-surface-900 dark:text-surface-100">
              {title}
            </h2>
          </div>
          {rightElement}
        </div>

        {sectionLoading ? (
          <LoadingSkeleton count={4} type="card" />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
            ))}
          </div>
        ) : (
          <div className="glass-card !rounded-2xl p-14 md:p-20 text-center !items-center !justify-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
              {icon}
            </div>
            <p className="text-surface-400 text-sm md:text-base">No products available yet</p>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="pb-20 md:pb-28">
      {/* Hero Banner */}
      <ScrollReveal>
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-6 md:pt-10">
          <HighlightBanner />
        </div>
      </ScrollReveal>

      {/* Category Grid */}
      <ScrollReveal delay={0.1}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 mt-10 md:mt-14">
          <CategoryGrid />
        </div>
      </ScrollReveal>

      {/* Flash Sale */}
      <ScrollReveal delay={0.15}>
        <div className="mt-14 md:mt-20">
          {renderProductSection(
            t('home.flashSale'),
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-red-500 fill-current" />
            </div>,
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
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>,
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
            <div className="w-9 h-9 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-accent-600" />
            </div>,
            accessories,
            loading
          )}
        </div>
      </ScrollReveal>

      {/* Features — Apple Trust Section */}
      <ScrollReveal delay={0.3}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 mt-16 md:mt-24">
          <div className="gradient-mesh rounded-3xl p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {featureKeys.map((key, i) => {
                const Icon = featureIcons[i];
                const feat = t(`home.features.${key}`);
                return (
                  <div key={key} className="text-center">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/80 dark:bg-surface-800/80
                      backdrop-blur-sm flex items-center justify-center mx-auto mb-4 shadow-sm ${featureColors[i]}`}>
                      <Icon className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <p className="text-sm md:text-base font-semibold text-surface-800 dark:text-surface-200 tracking-tight">
                      {feat.title}
                    </p>
                    <p className="text-xs md:text-sm text-surface-400 dark:text-surface-500 mt-1.5 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollReveal>

      <ProductQuickView product={quickViewProduct} isOpen={!!quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </div>
  );
}
