'use client';

import { useState, useEffect } from 'react';
import HighlightBanner from '@/components/home/HighlightBanner';
import FlashSaleTimer from '@/components/home/FlashSaleTimer';
import CategoryGrid from '@/components/home/CategoryGrid';
import ProductShelf from '@/components/product/ProductShelf';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { useTranslation } from '@/context/LanguageContext';
import { Shield, Truck, RotateCcw, CreditCard } from 'lucide-react';
import type { Product } from '@/types';

export default function HomePage() {
  const [flashSale, setFlashSale]     = useState<Product[]>([]);
  const [popular, setPopular]         = useState<Product[]>([]);
  const [accessories, setAccessories] = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchCurated(list: string): Promise<Product[]> {
      const res = await fetch(`/api/products/curated/${list}`);
      // A non-OK response may be plain text (e.g. the proxy can't reach the Go API).
      if (!res.ok) throw new Error(`GET /api/products/curated/${list} failed: ${res.status} ${res.statusText}`);
      const data = await res.json();
      return data.products || [];
    }

    async function fetchData() {
      try {
        const [fsProducts, popProducts, accProducts] = await Promise.all([
          fetchCurated('flash_sale'),
          fetchCurated('popular'),
          fetchCurated('accessories'),
        ]);
        setFlashSale(fsProducts);
        setPopular(popProducts);
        setAccessories(accProducts);
      } catch (err) {
        console.error('Home fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const features = [
    { Icon: Shield,     key: 'authentic',    color: 'text-[#0071e3]' },
    { Icon: Truck,      key: 'freeShipping', color: 'text-[#248a3d] dark:text-[#30d158]' },
    { Icon: RotateCcw,  key: 'returns',      color: 'text-[#bf4800] dark:text-[#f56300]' },
    { Icon: CreditCard, key: 'installment',  color: 'text-[#8e44ec] dark:text-[#bf5af2]' },
  ];

  return (
    <div>
      <HighlightBanner />

      {/* ── Store ── */}
      <div className="mt-3 bg-canvas-alt pt-14 pb-16 md:pt-20 md:pb-24">
        <ScrollReveal className="page-width">
          <h2 className="t-headline max-w-3xl">
            <span className="text-ink">{t('home.store')}</span>{' '}
            <span className="text-ink-2">{t('home.storeTagline')}</span>
          </h2>
        </ScrollReveal>

        <CategoryGrid />

        <ProductShelf
          id="flash-sale"
          title={t('home.flashSale')}
          tagline={t('home.flashSaleTagline')}
          products={flashSale}
          loading={loading}
          aside={<FlashSaleTimer />}
        />
        <ProductShelf
          title={t('home.popular')}
          tagline={t('home.popularTagline')}
          products={popular}
          loading={loading}
        />
        <ProductShelf
          title={t('home.accessories')}
          tagline={t('home.accessoriesTagline')}
          products={accessories}
          loading={loading}
        />

        {/* ── Why shop with us ── */}
        <section className="page-width pt-10 md:pt-14">
          <h2 className="t-title max-w-3xl">
            <span className="text-ink">{t('home.difference')}</span>{' '}
            <span className="text-ink-2">{t('home.differenceTagline')}</span>
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {features.map(({ Icon, key, color }, i) => {
              const feat = t<{ title: string; desc: string }>(`home.features.${key}`);
              return (
                <ScrollReveal key={key} delay={i * 0.06}>
                  <div className="card card-hover h-full p-5 md:p-7">
                    <Icon className={`h-8 w-8 md:h-9 md:w-9 ${color}`} strokeWidth={1.5} />
                    <p className="mt-4 text-[17px] font-semibold leading-tight text-ink md:mt-5 md:text-[21px]">{feat.title}</p>
                    <p className="mt-1.5 text-[14px] text-ink-2 md:mt-2 md:text-[15px]">{feat.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
