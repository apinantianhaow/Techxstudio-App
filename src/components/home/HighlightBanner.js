'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { motion } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';
import { ArrowRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';

const SLIDE_THEMES = [
  { from: '#8b6fcf', via: '#7b5fc0', to: '#6a4fb8' },
  { from: '#5b4896', via: '#4a3a80', to: '#3a2e6a' },
  { from: '#7c5cbf', via: '#9b7dd4', to: '#5a3fa0' },
];

export default function HighlightBanner() {
  const { t } = useTranslation();
  const slides = t('banner.slides');

  return (
    <div className="relative overflow-hidden">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
      >
        {(Array.isArray(slides) ? slides : []).map((slide, i) => {
          const theme = SLIDE_THEMES[i % SLIDE_THEMES.length];
          return (
            <SwiperSlide key={i}>
              <div
                className="relative flex flex-col items-center justify-center
                  px-6 py-12 md:py-16 lg:py-20
                  min-h-[200px] md:min-h-[300px] lg:min-h-[360px]"
                style={{
                  background: `linear-gradient(160deg, ${theme.from} 0%, ${theme.via} 50%, ${theme.to} 100%)`,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                  className="relative z-10 text-center max-w-2xl"
                >
                  {/* Brand name — formal sans-serif, clean uppercase */}
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-none tracking-tight uppercase mb-3">
                    TechXStudio
                  </h1>

                  {slide.subtitle && (
                    <p className="text-white/60 text-xs md:text-sm font-medium tracking-[0.2em] uppercase">
                      {slide.subtitle}
                    </p>
                  )}

                  {slide.title && (
                    <p className="text-white/80 text-sm md:text-base mt-4 font-light">
                      {slide.title}
                    </p>
                  )}

                  <button className="group mt-6 md:mt-8 inline-flex items-center gap-2
                    px-6 py-2.5 bg-white text-surface-900 text-sm font-semibold uppercase tracking-wider
                    hover:bg-white/90 transition-colors duration-200">
                    Shop Now
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </motion.div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
