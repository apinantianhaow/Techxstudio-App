'use client';

import Link from 'next/link';
import { Smartphone, Tablet, Headphones, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';

const CATEGORIES = [
  {
    slug: 'phone',
    key: 'category.phone',
    icon: Smartphone,
    gradient: 'from-violet-500 via-purple-500 to-indigo-600',
    glow: 'rgba(124, 58, 237, 0.15)',
  },
  {
    slug: 'tablet',
    key: 'category.tablet',
    icon: Tablet,
    gradient: 'from-blue-500 via-indigo-500 to-purple-600',
    glow: 'rgba(99, 102, 241, 0.15)',
  },
  {
    slug: 'accessory',
    key: 'category.accessory',
    icon: Headphones,
    gradient: 'from-pink-500 via-rose-500 to-orange-500',
    glow: 'rgba(244, 63, 94, 0.15)',
  },
];

export default function CategoryGrid() {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-3 gap-4 md:gap-6">
      {CATEGORIES.map((cat, i) => {
        const Icon = cat.icon;
        return (
          <motion.div
            key={cat.slug}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Link href={`/category/${cat.slug}`}>
              <div className="glass-card group cursor-pointer p-6 md:p-10 lg:p-12 text-center relative overflow-hidden">
                {/* Subtle glow behind icon on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${cat.glow} 0%, transparent 70%)`,
                  }}
                />

                <div className={`relative z-10 w-14 h-14 md:w-18 md:h-18 lg:w-20 lg:h-20 mx-auto rounded-2xl bg-gradient-to-br ${cat.gradient}
                  flex items-center justify-center mb-4 md:mb-5 shadow-lg
                  group-hover:scale-110 group-hover:shadow-xl transition-all duration-500`}>
                  <Icon className="w-7 h-7 md:w-9 md:h-9 lg:w-10 lg:h-10 text-white" />
                </div>

                <p className="relative z-10 text-sm md:text-base lg:text-lg font-semibold text-surface-700 dark:text-surface-300 tracking-tight">
                  {t(cat.key)}
                </p>

                <div className="relative z-10 flex items-center justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-xs text-primary-500 font-medium">Browse</span>
                  <ChevronRight className="w-3 h-3 text-primary-500" />
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
