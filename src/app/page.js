'use client';

import { useState, useEffect } from 'react';
import HighlightBanner from '@/components/home/HighlightBanner';
import FlashSaleTimer from '@/components/home/FlashSaleTimer';
import CategoryGrid from '@/components/home/CategoryGrid';
import ProductCard from '@/components/product/ProductCard';
import ProductQuickView from '@/components/product/ProductQuickView';
import ScrollReveal from '@/components/ui/ScrollReveal';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { Zap, TrendingUp, Headphones } from 'lucide-react';

export default function HomePage() {
  const [flashSale, setFlashSale] = useState([]);
  const [popular, setPopular] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

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

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-8 py-4">
      {/* Hero Banner */}
      <ScrollReveal>
        <HighlightBanner />
      </ScrollReveal>

      {/* Category Grid */}
      <ScrollReveal delay={0.1}>
        <CategoryGrid />
      </ScrollReveal>

      {/* Flash Sale Section */}
      <ScrollReveal delay={0.15}>
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-error fill-current" />
              <h2 className="font-bold text-lg section-title text-surface-800 dark:text-surface-200">
                Flash Sale
              </h2>
            </div>
            <FlashSaleTimer />
          </div>

          {loading ? (
            <LoadingSkeleton count={4} type="card" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {flashSale.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  onQuickView={setQuickViewProduct}
                />
              ))}
            </div>
          )}
        </section>
      </ScrollReveal>

      {/* Popular Section */}
      <ScrollReveal delay={0.2}>
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-lg section-title text-surface-800 dark:text-surface-200">
              สินค้ายอดนิยม
            </h2>
          </div>

          {loading ? (
            <LoadingSkeleton count={4} type="card" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {popular.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  onQuickView={setQuickViewProduct}
                />
              ))}
            </div>
          )}
        </section>
      </ScrollReveal>

      {/* Accessories Section */}
      <ScrollReveal delay={0.25}>
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-accent-600" />
            <h2 className="font-bold text-lg section-title text-surface-800 dark:text-surface-200">
              อุปกรณ์เสริม
            </h2>
          </div>

          {loading ? (
            <LoadingSkeleton count={4} type="card" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {accessories.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  onQuickView={setQuickViewProduct}
                />
              ))}
            </div>
          )}
        </section>
      </ScrollReveal>

      {/* Features */}
      <ScrollReveal delay={0.3}>
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
          {[
            { icon: '🛡️', label: 'ของแท้ 100%', desc: 'สินค้า Apple แท้ทุกชิ้น' },
            { icon: '🚚', label: 'จัดส่งฟรี', desc: 'เมื่อสั่งซื้อครบ ฿3,000' },
            { icon: '🔄', label: 'เปลี่ยนคืน 14 วัน', desc: 'ไม่พอใจ เปลี่ยนคืนได้' },
            { icon: '💳', label: 'ผ่อน 0%', desc: 'นานสูงสุด 10 เดือน' },
          ].map((feat) => (
            <div key={feat.label} className="glass-card p-4 text-center">
              <div className="text-2xl mb-2">{feat.icon}</div>
              <p className="text-xs font-bold text-surface-700 dark:text-surface-300">{feat.label}</p>
              <p className="text-[10px] text-surface-400 mt-0.5">{feat.desc}</p>
            </div>
          ))}
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
