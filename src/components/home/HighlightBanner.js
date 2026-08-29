'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { motion } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';
import 'swiper/css';
import 'swiper/css/pagination';

const GRADIENTS = [
  'from-violet-600 via-purple-600 to-indigo-700',
  'from-blue-600 via-cyan-600 to-teal-600',
  'from-rose-600 via-pink-600 to-fuchsia-600',
];

const EMOJIS = ['📱', '💻', '🏷️'];

export default function HighlightBanner() {
  const { t } = useTranslation();
  const slides = t('banner.slides');

  return (
    <div className="relative overflow-hidden">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
      >
        {(Array.isArray(slides) ? slides : []).map((slide, i) => (
          <SwiperSlide key={i}>
            <div className={`relative bg-gradient-to-br ${GRADIENTS[i]} px-8 py-16 md:px-16 md:py-24 lg:px-24 lg:py-32 min-h-[260px] md:min-h-[400px] lg:min-h-[480px] flex items-center`}>
              {/* Abstract shapes */}
              <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-white/5 -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-1/2 w-48 h-48 md:w-72 md:h-72 bg-white/5 translate-y-1/3" />

              <div className="relative z-10 flex-1 max-w-2xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  <p className="text-white/70 text-xs md:text-sm font-medium uppercase tracking-[0.2em] mb-3 md:mb-4">{slide.subtitle}</p>
                  <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 tracking-tight leading-tight">{slide.title}</h2>
                  <p className="text-white/60 text-sm md:text-base lg:text-lg max-w-lg leading-relaxed">{slide.desc}</p>
                  <button className="mt-6 md:mt-8 px-8 py-3.5 bg-white text-surface-900 
                    text-sm md:text-base font-semibold hover:bg-white/90 transition-colors tracking-wide uppercase">
                    {t('common.viewMore')}
                  </button>
                </motion.div>
              </div>

              <div className="hidden lg:flex items-center justify-center text-[10rem] opacity-20 select-none">
                {EMOJIS[i]}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
