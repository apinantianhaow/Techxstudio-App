'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { motion } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';
import { ArrowRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';

const SLIDE_THEMES = [
  {
    bg: 'bg-gradient-to-br from-violet-700 via-purple-600 to-indigo-800',
    accent: 'from-violet-400/20 to-transparent',
    orb1: 'bg-violet-400/20',
    orb2: 'bg-indigo-500/15',
  },
  {
    bg: 'bg-gradient-to-br from-blue-700 via-indigo-600 to-cyan-700',
    accent: 'from-blue-400/20 to-transparent',
    orb1: 'bg-blue-400/20',
    orb2: 'bg-cyan-500/15',
  },
  {
    bg: 'bg-gradient-to-br from-purple-800 via-fuchsia-600 to-pink-700',
    accent: 'from-fuchsia-400/20 to-transparent',
    orb1: 'bg-fuchsia-400/20',
    orb2: 'bg-pink-500/15',
  },
];

const EMOJIS = ['📱', '💻', '🏷️'];

export default function HighlightBanner() {
  const { t } = useTranslation();
  const slides = t('banner.slides');

  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-lg">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
        className="rounded-2xl md:rounded-3xl"
      >
        {(Array.isArray(slides) ? slides : []).map((slide, i) => {
          const theme = SLIDE_THEMES[i] || SLIDE_THEMES[0];
          return (
            <SwiperSlide key={i}>
              <div className={`relative ${theme.bg} px-8 py-14 md:px-16 md:py-20 lg:px-20 lg:py-28 min-h-[240px] md:min-h-[360px] lg:min-h-[440px] flex items-center overflow-hidden`}>
                {/* Decorative orbs — Samsung-style ambient lighting */}
                <div className={`absolute -top-20 -right-20 w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full ${theme.orb1} blur-3xl`} />
                <div className={`absolute -bottom-16 -left-16 w-[250px] h-[250px] md:w-[400px] md:h-[400px] rounded-full ${theme.orb2} blur-3xl`} />
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial ${theme.accent} blur-3xl opacity-50`} />

                <div className="relative z-10 flex-1 max-w-xl">
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}>
                    <p className="text-white/60 text-xs md:text-sm font-medium tracking-[0.15em] uppercase mb-3 md:mb-4">
                      {slide.subtitle}
                    </p>
                    <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-4 md:mb-6">
                      {slide.title}
                    </h2>
                    <p className="text-white/50 text-sm md:text-base lg:text-lg leading-relaxed max-w-md">
                      {slide.desc}
                    </p>
                    <button className="group mt-6 md:mt-8 inline-flex items-center gap-2 px-7 py-3 md:px-8 md:py-3.5
                      bg-white/15 backdrop-blur-md text-white rounded-full
                      text-sm font-medium hover:bg-white/25 transition-all duration-300
                      border border-white/20">
                      {t('common.viewMore')}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </motion.div>
                </div>

                {/* Large decorative emoji */}
                <div className="hidden lg:flex items-center justify-center">
                  <span className="text-[120px] xl:text-[160px] opacity-15 select-none filter drop-shadow-2xl">
                    {EMOJIS[i]}
                  </span>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
