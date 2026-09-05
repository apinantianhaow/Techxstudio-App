'use client';

import Link from 'next/link';
import { Smartphone, Tablet, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';

const CATEGORIES = [
  {
    slug: 'phone',
    key: 'category.phone',
    icon: Smartphone,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-900/40',
  },
  {
    slug: 'tablet',
    key: 'category.tablet',
    icon: Tablet,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-900/40',
  },
  {
    slug: 'accessory',
    key: 'category.accessory',
    icon: Headphones,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/40',
  },
];

export default function CategoryGrid() {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-3 gap-4 md:gap-5">
      {CATEGORIES.map((cat, i) => {
        const Icon = cat.icon;
        return (
          <motion.div
            key={cat.slug}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Link href={`/category/${cat.slug}`}>
              <div className="glass-card group cursor-pointer flex flex-col items-center
                py-6 md:py-8 px-3 text-center hover:shadow-[0_8px_32px_rgba(124,58,237,0.1)]
                transition-shadow duration-300">
                <div className={`${cat.bg} w-12 h-12 md:w-14 md:h-14
                  flex items-center justify-center mb-3
                  group-hover:scale-105 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 md:w-7 md:h-7 ${cat.color}`} />
                </div>
                <p className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wide">
                  {t(cat.key)}
                </p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
