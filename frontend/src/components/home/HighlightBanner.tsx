'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { DeviceArt } from '@/components/product/ProductVisual';
import FlashSaleTimer from '@/components/home/FlashSaleTimer';
import { useTranslation } from '@/context/LanguageContext';

interface Slide { title: string; subtitle: string; desc: string }

const FALLBACK_SLIDES: Slide[] = [
  { title: 'iPhone 16 Pro Max', subtitle: 'Powered by A18 Pro', desc: 'The most powerful Pro camera system' },
  { title: 'iPad Pro M4', subtitle: 'Impossibly Thin.', desc: 'Ultra Retina XDR display with M4 chip' },
  { title: 'Flash Sale', subtitle: 'Up to 15% Off', desc: '100% genuine Apple products at special prices' },
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.8, ease: [0.28, 0.11, 0.32, 1] as const },
};

/** Apple.com–style stacked hero sections followed by a two-up tile grid. */
export default function HighlightBanner() {
  const { t } = useTranslation();
  const rawSlides = t<Slide[]>('banner.slides');
  const slides = Array.isArray(rawSlides) && rawSlides.length >= 3 ? rawSlides : FALLBACK_SLIDES;
  const [phone, tablet, sale] = slides;

  return (
    <div className="space-y-3 bg-canvas">
      {/* ── iPhone ── */}
      <section className="overflow-hidden bg-canvas text-center">
        <motion.div {...reveal} className="page-width pt-12 md:pt-16">
          <h1 className="t-display text-ink">{phone.title}</h1>
          <p className="t-subhead mt-2 text-ink">{phone.subtitle}</p>
          <p className="mx-auto mt-2 max-w-xl text-[15px] text-ink-2 md:text-[17px]">{phone.desc}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3.5">
            <Link href="/category/phone" className="btn btn-primary">{t('hero.shop')}</Link>
            <Link href="/category/all" className="btn btn-secondary">{t('hero.browse')}</Link>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.15, ease: [0.28, 0.11, 0.32, 1] }}
          className="mt-10 flex h-[300px] items-start justify-center md:mt-12 md:h-[430px]"
        >
          <DeviceArt kind="phone" tint="#BFA48F"
            className="relative top-8 -mr-12 h-[340px] w-auto -rotate-[8deg] md:top-10 md:-mr-20 md:h-[500px]" />
          <DeviceArt kind="phone" tint="#D9D4CF" className="relative z-10 h-[360px] w-auto md:h-[520px]" />
        </motion.div>
      </section>

      {/* ── iPad ── */}
      <section className="overflow-hidden bg-canvas-alt text-center">
        <motion.div {...reveal} className="page-width pt-12 md:pt-16">
          <h2 className="t-display text-ink">{tablet.title}</h2>
          <p className="t-subhead mt-2 text-ink">{tablet.subtitle}</p>
          <p className="mx-auto mt-2 max-w-xl text-[15px] text-ink-2 md:text-[17px]">{tablet.desc}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3.5">
            <Link href="/category/tablet" className="btn btn-primary">{t('hero.shop')}</Link>
            <Link href="/category/all" className="btn btn-secondary">{t('hero.browse')}</Link>
          </div>
        </motion.div>
        <motion.div {...reveal}
          className="mt-10 flex h-[280px] items-start justify-center md:mt-12 md:h-[400px]">
          <DeviceArt kind="tablet" tint="#E3E3E3"
            className="relative top-10 -mr-24 h-[300px] w-auto md:top-14 md:-mr-36 md:h-[440px]" />
          <DeviceArt kind="tablet" tint="#2C2C2E" className="relative z-10 h-[330px] w-auto md:h-[480px]" />
        </motion.div>
      </section>

      {/* ── Two-up tiles ── */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Flash sale — always dark */}
        <motion.section {...reveal}
          className="flex min-h-[500px] flex-col items-center overflow-hidden bg-black px-6 pt-12 pb-10 text-center text-white md:min-h-[580px]">
          <h2 className="t-headline">{sale.title}</h2>
          <p className="t-subhead mt-1.5 text-white/85">{sale.subtitle}</p>
          <p className="mt-2 max-w-sm text-[15px] text-white/60">{sale.desc}</p>
          <div className="mt-6">
            <a href="#flash-sale" className="btn btn-primary">{t('hero.saleCta')}</a>
          </div>
          <p aria-hidden className="gradient-text mt-auto pt-8 text-[112px] font-semibold leading-none tracking-[-0.04em] md:text-[160px]">
            −15%
          </p>
          <div className="mt-6">
            <FlashSaleTimer tone="dark" />
          </div>
        </motion.section>

        {/* Accessories */}
        <motion.section {...reveal}
          className="flex min-h-[500px] flex-col items-center overflow-hidden bg-canvas-alt px-6 pt-12 text-center md:min-h-[580px]">
          <h2 className="t-headline text-ink">{t('hero.accessoriesTitle')}</h2>
          <p className="t-subhead mt-1.5 text-ink">{t('hero.accessoriesSubtitle')}</p>
          <div className="mt-5 flex items-center gap-6 text-[17px]">
            <Link href="/category/accessory" className="link inline-flex items-center">
              {t('hero.explore')} <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href="/category/accessory" className="link inline-flex items-center">
              {t('hero.shop')} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative mt-auto flex h-[280px] w-full items-end justify-center md:h-[320px]">
            <DeviceArt kind="headphones" tint="#EB7B3A" className="relative z-10 h-[230px] w-auto md:h-[270px]" />
            <DeviceArt kind="earbuds" tint="#F5F5F5" className="absolute bottom-8 left-[8%] h-[80px] w-auto md:left-[12%] md:h-[96px]" />
            <DeviceArt kind="watch" tint="#C4B9A8" className="absolute bottom-6 right-[8%] h-[130px] w-auto md:right-[12%] md:h-[150px]" />
          </div>
        </motion.section>
      </div>
    </div>
  );
}
