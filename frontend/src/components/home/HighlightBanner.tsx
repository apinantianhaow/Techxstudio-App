'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { motion } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';
import Link from 'next/link';
import 'swiper/css';
import 'swiper/css/pagination';

const FALLBACK_SLIDES = [
  { title: 'iPhone 16 Pro Max', subtitle: 'Powered by A18 Pro', desc: 'The most powerful Pro camera system' },
  { title: 'iPad Pro M4', subtitle: 'Impossibly Thin.', desc: 'Ultra Retina XDR display with M4 chip' },
  { title: 'Flash Sale', subtitle: 'Up to 15% Off', desc: '100% genuine Apple products at special prices' },
];

const THEMES = [
  { gradient: 'linear-gradient(160deg, #8b6fcf 0%, #7b5fc0 50%, #6a4fb8 100%)' },
  { gradient: 'linear-gradient(160deg, #5b4896 0%, #4a3a80 50%, #3a2e6a 100%)' },
  { gradient: 'linear-gradient(160deg, #7c5cbf 0%, #9b7dd4 50%, #5a3fa0 100%)' },
];

export default function HighlightBanner() {
  const { t } = useTranslation();
  const rawSlides = t('banner.slides');
  const slides = Array.isArray(rawSlides) && rawSlides.length > 0 ? rawSlides : FALLBACK_SLIDES;

  return (
    <div className="w-full">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop={slides.length > 1}
        style={{ width: '100%' }}
      >
        {slides.map((slide, i) => {
          const theme = THEMES[i % THEMES.length];
          return (
            <SwiperSlide key={i}>
              <div
                style={{
                  width: '100%',
                  minHeight: '400px',
                  background: theme.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '72px 24px',
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
                  style={{ textAlign: 'center', maxWidth: '640px' }}
                >
                  <h2 style={{
                    fontSize: 'clamp(36px, 5vw, 64px)',
                    fontWeight: 700,
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                    color: '#fff',
                    margin: 0,
                    textTransform: 'uppercase',
                  }}>
                    {slide.title}
                  </h2>

                  {slide.subtitle && (
                    <p style={{
                      marginTop: '12px',
                      fontSize: 'clamp(14px, 1.8vw, 20px)',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.7)',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                    }}>
                      {slide.subtitle}
                    </p>
                  )}

                  {slide.desc && (
                    <p style={{
                      marginTop: '8px',
                      fontSize: 'clamp(13px, 1.5vw, 16px)',
                      color: 'rgba(255,255,255,0.5)',
                    }}>
                      {slide.desc}
                    </p>
                  )}

                  <div style={{ marginTop: '28px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <Link href="/category/phone"
                      style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '10px 28px', fontSize: '14px', fontWeight: 600,
                        backgroundColor: '#fff', color: '#1e1b2e',
                        textDecoration: 'none',
                      }}>
                      Shop Now
                    </Link>
                    <Link href="/category/all"
                      style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '10px 28px', fontSize: '14px', fontWeight: 600,
                        border: '1px solid rgba(255,255,255,0.4)', color: '#fff',
                        textDecoration: 'none',
                      }}>
                      Browse
                    </Link>
                  </div>
                </motion.div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
